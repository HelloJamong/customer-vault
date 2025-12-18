import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as os from 'os';
import * as fs from 'fs';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: number, userRole: string) {
    if (userRole === 'user') {
      return this.getUserStats(userId);
    }

    return this.getAdminStats();
  }

  private async getAdminStats() {
    // 사용자 통계
    const [totalUsers, adminUsers, regularUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: { in: ['super_admin', 'admin'] } } }),
      this.prisma.user.count({ where: { role: 'user' } }),
    ]);

    // 고객사 통계
    const totalCustomers = await this.prisma.customer.count();

    // 이번 달 점검 통계
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 모든 고객사 조회
    const allCustomers = await this.prisma.customer.findMany({
      include: {
        inspectionTargets: { select: { id: true } },
        documents: {
          select: {
            id: true,
            inspectionDate: true,
            inspectionTargetId: true,
          },
        },
      },
    });

    // 이번 달 점검 대상 고객사 필터링
    const inspectionTargets = allCustomers.filter((customer) =>
      this.isInspectionNeededThisMonth(customer)
    );

    // 점검 완료/미완료 계산
    let completedInspections = 0;
    inspectionTargets.forEach((customer) => {
      const targetIds = customer.inspectionTargets?.map((t) => t.id) || [];
      if (targetIds.length === 0) return; // 점검 대상 항목이 없으면 미완료

      const completedTargetIds = new Set(
        customer.documents
          ?.filter((doc) => {
            const inspectionDate = new Date(doc.inspectionDate);
            return (
              doc.inspectionTargetId &&
              inspectionDate >= startOfMonth &&
              inspectionDate <= endOfMonth
            );
          })
          .map((doc) => doc.inspectionTargetId) || []
      );

      // 모든 점검 대상이 완료되었는지 확인
      const allCompleted = targetIds.every((id) => completedTargetIds.has(id));

      // 디버깅 로그
      console.log(`[DashboardService] Customer: ${customer.name} (ID: ${customer.id})`);
      console.log(`[DashboardService] - Target IDs: ${JSON.stringify(targetIds)}`);
      console.log(`[DashboardService] - Completed Target IDs: ${JSON.stringify([...completedTargetIds])}`);
      console.log(`[DashboardService] - Total Documents: ${customer.documents?.length || 0}`);
      console.log(`[DashboardService] - This Month Documents: ${customer.documents?.filter((doc) => {
        const inspectionDate = new Date(doc.inspectionDate);
        return inspectionDate >= startOfMonth && inspectionDate <= endOfMonth;
      }).length || 0}`);
      console.log(`[DashboardService] - All Completed: ${allCompleted}`);

      if (allCompleted) {
        completedInspections++;
      }
    });

    const totalInspectionCustomers = inspectionTargets.length;
    const incompleteInspections = totalInspectionCustomers - completedInspections;

    // 시스템 리소스 모니터링
    const systemResources = this.getSystemResources();

    const contractStatus = await this.prisma.customer.groupBy({
      by: ['contractType'],
      _count: true,
    });

    const recentUploads = await this.prisma.document.findMany({
      take: 10,
      orderBy: { uploadedAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        uploader: { select: { name: true } },
      },
    });

    return {
      // 사용자 통계
      totalUsers,
      adminUsers,
      regularUsers,
      totalCustomers,

      // 이번 달 점검 통계
      inspection: {
        currentMonth: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`,
        totalCustomers: totalInspectionCustomers,
        completed: completedInspections,
        incomplete: incompleteInspections,
        completionRate: totalInspectionCustomers > 0
          ? Math.round((completedInspections / totalInspectionCustomers) * 100)
          : 0,
      },

      // 시스템 리소스
      systemResources,

      contractStatus: contractStatus.reduce((acc, item) => {
        acc[item.contractType] = item._count;
        return acc;
      }, {}),
      recentUploads: recentUploads.map((doc) => ({
        id: doc.id,
        title: doc.title,
        customerName: doc.customer.name,
        uploaderName: doc.uploader.name,
        uploadedAt: doc.uploadedAt,
      })),
    };
  }

  private getSystemResources() {
    // CPU 사용률 계산
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const cpuUsage = 100 - Math.floor((totalIdle / totalTick) * 100);

    // 메모리 사용률 계산
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);

    // 스토리지 사용량 계산 (루트 디렉토리 기준)
    let storageUsed = 0;
    let storageTotal = 0;
    let storageUsagePercent = 0;

    try {
      // Linux/Mac에서만 작동
      if (process.platform !== 'win32') {
        const stats = fs.statfsSync('/');
        storageTotal = (stats.blocks * stats.bsize) / (1024 * 1024 * 1024); // GB
        const storageFree = (stats.bfree * stats.bsize) / (1024 * 1024 * 1024); // GB
        storageUsed = storageTotal - storageFree;
        storageUsagePercent = Math.round((storageUsed / storageTotal) * 100);
      } else {
        // Windows에서는 임시 값 사용
        storageTotal = 500;
        storageUsed = 325;
        storageUsagePercent = 65;
      }
    } catch (error) {
      // 기본값 설정
      storageTotal = 500;
      storageUsed = 325;
      storageUsagePercent = 65;
    }

    return {
      storage: {
        used: parseFloat(storageUsed.toFixed(2)),
        total: parseFloat(storageTotal.toFixed(2)),
        usagePercent: storageUsagePercent,
        unit: 'GB',
      },
      memory: {
        used: parseFloat((usedMemory / (1024 * 1024 * 1024)).toFixed(2)),
        total: parseFloat((totalMemory / (1024 * 1024 * 1024)).toFixed(2)),
        usagePercent: memoryUsagePercent,
        unit: 'GB',
      },
      cpu: {
        usagePercent: cpuUsage,
        cores: cpus.length,
      },
    };
  }

  private async getUserStats(userId: number) {
    const assignedCustomers = await this.prisma.userCustomer.count({
      where: { userId },
    });

    const customers = await this.prisma.customer.findMany({
      where: {
        assignedUsers: {
          some: { userId },
        },
      },
      select: {
        id: true,
        name: true,
        contractType: true,
        lastInspectionDate: true,
      },
    });

    const myRecentUploads = await this.prisma.document.findMany({
      where: { uploadedBy: userId },
      take: 10,
      orderBy: { uploadedAt: 'desc' },
      include: {
        customer: { select: { name: true } },
      },
    });

    return {
      assignedCustomersCount: assignedCustomers,
      myCustomers: customers,
      myRecentUploads: myRecentUploads.map((doc) => ({
        id: doc.id,
        title: doc.title,
        customerName: doc.customer.name,
        uploadedAt: doc.uploadedAt,
      })),
    };
  }

  // 이번 달 점검 대상 여부 확인
  private isInspectionNeededThisMonth(customer: any): boolean {
    // 계약 상태가 만료 또는 미계약인 경우
    if (['만료', '미계약'].includes(customer.contractType)) {
      return false;
    }

    // 점검 주기가 협력사진행 또는 무상기간인 경우
    if (['협력사진행', '무상기간'].includes(customer.inspectionCycleType)) {
      return false;
    }

    // 계약 상태가 유상이거나, 무상이지만 점검 주기가 설정된 경우
    const isValidContract = customer.contractType === '유상' ||
      (customer.contractType === '무상' && customer.inspectionCycleType &&
       !['협력사진행', '무상기간'].includes(customer.inspectionCycleType));

    if (!isValidContract) {
      return false;
    }

    const currentMonth = new Date().getMonth() + 1;

    if (customer.inspectionCycleType === '매월') {
      return true;
    }

    if (!customer.inspectionCycleMonth) {
      return false;
    }

    if (customer.inspectionCycleType === '분기') {
      const quarterMonths: { [key: number]: number[] } = {
        1: [1, 4, 7, 10],
        2: [2, 5, 8, 11],
        3: [3, 6, 9, 12],
      };
      return quarterMonths[customer.inspectionCycleMonth]?.includes(currentMonth) || false;
    }

    if (customer.inspectionCycleType === '반기') {
      const halfYearMonths: { [key: number]: number[] } = {
        1: [1, 7],
        2: [2, 8],
        3: [3, 9],
        4: [4, 10],
        5: [5, 11],
        6: [6, 12],
      };
      return halfYearMonths[customer.inspectionCycleMonth]?.includes(currentMonth) || false;
    }

    if (customer.inspectionCycleType === '연1회') {
      return currentMonth === customer.inspectionCycleMonth;
    }

    return false;
  }
}
