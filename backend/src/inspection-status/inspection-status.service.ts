import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

interface MissingInspectionTarget {
  targetId: number;
  targetType: string;
  customName: string | null;
  productName: string | null;
  lastInspectionDate: string | null;
  missingPeriod: string; // "1월", "2월", "1분기" 등
  expectedLabel: string;
}

interface CustomerMissingInspection {
  id: number;
  name: string;
  lastInspectionDate: string | null;
  missingCount: number;
  engineer: { name: string } | null;
  engineerSub: { name: string } | null;
  missingTargets: MissingInspectionTarget[];
}

@Injectable()
export class InspectionStatusService {
  constructor(private prisma: PrismaService) {}

  async getMissingInspections(year?: number): Promise<{
    customers: CustomerMissingInspection[];
  }> {
    const targetYear = year || new Date().getFullYear();

    const customers = await this.prisma.customer.findMany({
      where: {
        contractType: { notIn: ['만료', '미계약'] },
        inspectionCycleType: { notIn: ['협력사진행', '무상기간'] },
      },
      include: {
        engineer: { select: { name: true } },
        engineerSub: { select: { name: true } },
        inspectionTargets: {
          orderBy: { displayOrder: 'asc' },
        },
        documents: {
          select: {
            inspectionDate: true,
            inspectionTargetId: true,
          },
          orderBy: { inspectionDate: 'desc' },
        },
      },
    });

    const result: CustomerMissingInspection[] = customers
      .map((customer) => {
        const { missingTargets, lastInspectionDate } = this.calculateMissingTargets(
          customer,
          targetYear,
        );
        if (missingTargets.length === 0) return null;

        return {
          id: customer.id,
          name: customer.name,
          lastInspectionDate,
          missingCount: missingTargets.length,
          engineer: customer.engineer,
          engineerSub: customer.engineerSub,
          missingTargets,
        };
      })
      .filter((item): item is CustomerMissingInspection => item !== null);

    return { customers: result };
  }

  private calculateMissingTargets(
    customer: any,
    targetYear: number,
  ): {
    missingTargets: MissingInspectionTarget[];
    lastInspectionDate: string | null;
  } {
    const { inspectionTargets, documents, inspectionCycleType, inspectionCycleMonth } = customer;

    if (!inspectionTargets || inspectionTargets.length === 0) {
      return { missingTargets: [], lastInspectionDate: null };
    }

    const missingTargets: MissingInspectionTarget[] = [];
    let customerLastInspectionDate: Date | null = null;

    for (const target of inspectionTargets) {
      const targetDocuments = documents.filter(
        (doc: any) => doc.inspectionTargetId === target.id,
      );

      // 점검 이력에서 점검 날짜 추출 및 정렬
      const inspectionDates = targetDocuments
        .map((doc: any) => new Date(doc.inspectionDate))
        .filter((date: Date) => !isNaN(date.getTime()))
        .sort((a: Date, b: Date) => b.getTime() - a.getTime());

      let lastInspectionDate: Date | null = null;
      if (inspectionDates.length > 0) {
        lastInspectionDate = inspectionDates[0];

        if (
          !customerLastInspectionDate ||
          lastInspectionDate > customerLastInspectionDate
        ) {
          customerLastInspectionDate = lastInspectionDate;
        }
      }

      // 고객사 설정 및 과거 점검 패턴 분석하여 예상 점검 월 계산
      const expectedMonths = this.analyzeInspectionPattern(
        inspectionDates,
        inspectionCycleType,
        inspectionCycleMonth,
      );

      // 누락된 월 확인
      const missingMonths = this.findMissingMonths(
        inspectionDates,
        expectedMonths,
        targetYear,
      );

      // 누락된 월이 있으면 추가
      for (const missingMonth of missingMonths) {
        missingTargets.push({
          targetId: target.id,
          targetType: target.targetType || '',
          customName: target.customName,
          productName: target.productName,
          lastInspectionDate: lastInspectionDate
            ? lastInspectionDate.toISOString()
            : null,
          missingPeriod: this.formatMissingPeriod(
            missingMonth,
            inspectionCycleType,
          ),
          expectedLabel: this.generateExpectedLabelForMonth(
            target,
            missingMonth,
          ),
        });
      }
    }

    return {
      missingTargets,
      lastInspectionDate: customerLastInspectionDate
        ? customerLastInspectionDate.toISOString()
        : null,
    };
  }

  /**
   * 과거 점검 이력을 분석하여 예상 점검 월을 계산
   */
  private analyzeInspectionPattern(
    inspectionDates: Date[],
    cycleType: string,
    cycleMonth?: number | null,
  ): number[] {
    // 1. 매월 점검은 모든 월
    if (cycleType === '매월') {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }

    // 2. 고객사에 설정된 점검 주기 월이 있으면 우선 사용
    if (cycleMonth) {
      return this.generatePatternFromCycleMonth(cycleMonth, cycleType);
    }

    // 3. 점검 이력이 있으면 이력 기반으로 패턴 파악
    if (inspectionDates.length > 0) {
      // 과거 점검 이력에서 월 추출 (중복 제거)
      const inspectedMonths = [
        ...new Set(inspectionDates.map((date) => date.getMonth() + 1)),
      ].sort((a, b) => a - b);

      // 점검 이력이 충분하면 (2개 이상) 패턴 분석
      if (inspectedMonths.length >= 2) {
        switch (cycleType) {
          case '분기':
            return this.findQuarterlyPattern(inspectedMonths);
          case '반기':
            return this.findHalfYearlyPattern(inspectedMonths);
          case '연1회':
            return this.findYearlyPattern(inspectedMonths);
          default:
            return [];
        }
      }

      // 점검 이력이 1개만 있으면 해당 월을 기준으로 패턴 생성
      if (inspectedMonths.length === 1) {
        return this.generatePatternFromMonth(inspectedMonths[0], cycleType);
      }
    }

    // 4. 점검 이력이 없으면 기본 패턴 사용
    return this.getDefaultInspectionMonths(cycleType);
  }

  /**
   * 고객사에 설정된 점검 주기 월로부터 패턴 생성
   * inspectionCycleMonth가 비트마스크 형태인 경우를 고려
   * 예: 분기 점검의 경우 1,4,7,10 → 비트마스크 또는 단일 월 저장
   */
  private generatePatternFromCycleMonth(
    cycleMonth: number,
    cycleType: string,
  ): number[] {
    // cycleMonth가 1-12 사이의 단일 월인 경우
    if (cycleMonth >= 1 && cycleMonth <= 12) {
      switch (cycleType) {
        case '분기':
          // 해당 월을 첫 점검 월로 하는 분기 패턴 생성
          return this.generateQuarterlyFromStartMonth(cycleMonth);
        case '반기':
          // 해당 월을 첫 점검 월로 하는 반기 패턴 생성
          return this.generateHalfYearlyFromStartMonth(cycleMonth);
        case '연1회':
          return [cycleMonth];
        default:
          return [];
      }
    }

    // 그 외의 경우 기본 패턴
    return this.getDefaultInspectionMonths(cycleType);
  }

  /**
   * 시작 월을 기준으로 분기 패턴 생성
   */
  private generateQuarterlyFromStartMonth(startMonth: number): number[] {
    const pattern: number[] = [];
    for (let i = 0; i < 4; i++) {
      const month = ((startMonth - 1 + i * 3) % 12) + 1;
      pattern.push(month);
    }
    return pattern.sort((a, b) => a - b);
  }

  /**
   * 시작 월을 기준으로 반기 패턴 생성
   */
  private generateHalfYearlyFromStartMonth(startMonth: number): number[] {
    const secondMonth = ((startMonth - 1 + 6) % 12) + 1;
    return [startMonth, secondMonth].sort((a, b) => a - b);
  }

  /**
   * 단일 월에서 점검 패턴 생성
   */
  private generatePatternFromMonth(month: number, cycleType: string): number[] {
    switch (cycleType) {
      case '분기':
        // 해당 월을 포함하는 분기 패턴 생성
        if ([1, 2, 3].includes(month)) return [1, 4, 7, 10];
        if ([4, 5, 6].includes(month)) return [2, 5, 8, 11];
        if ([7, 8, 9].includes(month)) return [3, 6, 9, 12];
        if ([10, 11, 12].includes(month)) return [1, 4, 7, 10];
        return [3, 6, 9, 12];
      
      case '반기':
        // 해당 월을 포함하는 반기 패턴 생성
        if ([1, 2, 6, 7, 8, 12].includes(month)) return [6, 12];
        if ([3, 4, 9, 10].includes(month)) return [3, 9];
        if ([5, 11].includes(month)) return [5, 11];
        return [6, 12];
      
      case '연1회':
        return [month];
      
      default:
        return [];
    }
  }

  /**
   * 기본 점검 월 반환 (점검 이력이 없을 때)
   */
  private getDefaultInspectionMonths(cycleType: string): number[] {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    switch (cycleType) {
      case '매월':
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      case '분기':
        // 현재 월 기준으로 직전 분기 월 반환
        if (currentMonth >= 1 && currentMonth <= 3) {
          return [10]; // 4분기 10월 (작년)
        } else if (currentMonth >= 4 && currentMonth <= 6) {
          return [1]; // 1분기 1월
        } else if (currentMonth >= 7 && currentMonth <= 9) {
          return [4]; // 2분기 4월
        } else {
          return [7]; // 3분기 7월
        }
      case '반기':
        // 현재 월 기준으로 직전 반기 월 반환
        if (currentMonth >= 1 && currentMonth <= 6) {
          return [12]; // 하반기 12월 (작년)
        } else {
          return [6]; // 상반기 6월
        }
      case '연1회':
        return [12]; // 기본 연말 (작년)
      default:
        return [];
    }
  }

  /**
   * 분기 점검 패턴 찾기
   */
  private findQuarterlyPattern(inspectedMonths: number[]): number[] {
    // 가능한 분기 패턴
    const patterns = [
      [1, 4, 7, 10],
      [2, 5, 8, 11],
      [3, 6, 9, 12],
    ];

    // 각 패턴과 매칭되는 월 개수 계산
    const matches = patterns.map((pattern) => {
      const matchCount = pattern.filter((month) =>
        inspectedMonths.includes(month),
      ).length;
      return { pattern, matchCount };
    });

    // 가장 많이 매칭되는 패턴 반환
    const bestMatch = matches.reduce((prev, curr) =>
      curr.matchCount > prev.matchCount ? curr : prev,
    );

    return bestMatch.matchCount > 0
      ? bestMatch.pattern
      : [3, 6, 9, 12]; // 매칭 안되면 기본 패턴
  }

  /**
   * 반기 점검 패턴 찾기
   */
  private findHalfYearlyPattern(inspectedMonths: number[]): number[] {
    // 가능한 반기 패턴
    const patterns = [
      [6, 12],
      [3, 9],
      [4, 10],
      [5, 11],
    ];

    // 각 패턴과 매칭되는 월 개수 계산
    const matches = patterns.map((pattern) => {
      const matchCount = pattern.filter((month) =>
        inspectedMonths.includes(month),
      ).length;
      return { pattern, matchCount };
    });

    // 가장 많이 매칭되는 패턴 반환
    const bestMatch = matches.reduce((prev, curr) =>
      curr.matchCount > prev.matchCount ? curr : prev,
    );

    return bestMatch.matchCount > 0 ? bestMatch.pattern : [6, 12];
  }

  /**
   * 연1회 점검 패턴 찾기
   */
  private findYearlyPattern(inspectedMonths: number[]): number[] {
    if (inspectedMonths.length === 0) {
      return [12]; // 기본 12월
    }

    // 가장 많이 나타난 월 찾기
    const monthCounts = new Map<number, number>();
    inspectedMonths.forEach((month) => {
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    });

    const mostFrequentMonth = Array.from(monthCounts.entries()).reduce(
      (prev, curr) => (curr[1] > prev[1] ? curr : prev),
    )[0];

    return [mostFrequentMonth];
  }

  /**
   * 누락된 월 찾기
   */
  private findMissingMonths(
    inspectionDates: Date[],
    expectedMonths: number[],
    targetYear: number,
  ): number[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 해당 연도의 점검 이력만 필터링
    const inspectedMonthsInYear = inspectionDates
      .filter((date) => date.getFullYear() === targetYear)
      .map((date) => date.getMonth() + 1);

    const missingMonths: number[] = [];

    for (const expectedMonth of expectedMonths) {
      // 해당 월에 점검 이력이 있는지 확인
      const hasInspection = inspectedMonthsInYear.includes(expectedMonth);

      if (!hasInspection) {
        // 현재 월과 미래 월은 제외 (아직 점검할 시기가 아님)
        if (targetYear === currentYear && expectedMonth >= currentMonth) {
          continue;
        }

        // 과거 연도인 경우 모두 누락으로 간주
        // 현재 연도인 경우 지난 달까지만 누락으로 간주
        missingMonths.push(expectedMonth);
      }
    }

    return missingMonths;
  }

  /**
   * 누락 기간 포맷팅
   */
  private formatMissingPeriod(month: number, cycleType: string): string {
    if (cycleType === '매월') {
      return `${month}월`;
    }

    if (cycleType === '분기') {
      const quarter = Math.ceil(month / 3);
      return `${quarter}분기 (${month}월)`;
    }

    if (cycleType === '반기') {
      const half = month <= 6 ? '상반기' : '하반기';
      return `${half} (${month}월)`;
    }

    if (cycleType === '연1회') {
      return `${month}월`;
    }

    return `${month}월`;
  }

  /**
   * 특정 월에 대한 예상 점검서명 생성
   */
  private generateExpectedLabelForMonth(target: any, month: number): string {
    const productName =
      target.productName || target.customName || target.targetType;

    return `${month}월_${productName}_점검서`;
  }
}
