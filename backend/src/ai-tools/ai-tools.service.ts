import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { UnresolvedSupportLogsDto } from './dto/unresolved-support-logs.dto';

const UNRESOLVED_STATUSES = ['진행 중', '진행 불가', '보류'];

function redactSupportText(value: string | null): string | null {
  if (!value) return value;

  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[이메일 제거]')
    .replace(/\b(?:\+?82[-\s.]?)?(?:0\d{1,2})[-\s.]?\d{3,4}[-\s.]?\d{4}\b/g, '[전화번호 제거]')
    .replace(/\b(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\b/g, '[IP 주소 제거]')
    .replace(/((?:password|passwd|pwd|비밀번호|패스워드|token|api[_ -]?key|secret|access[_ -]?key|비밀키)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1[비밀정보 제거]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [비밀정보 제거]')
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_.-]{10,}\b/g, '[토큰 제거]');
}

@Injectable()
export class AiToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  async searchCustomers(name: string, ipAddress: string) {
    const customers = await this.prisma.customer.findMany({
      where: { name: { contains: name } },
      select: {
        id: true,
        name: true,
        contactName: true,
        contactPosition: true,
        contactDepartment: true,
        contactNameSub1: true,
        contactPositionSub1: true,
        contactDepartmentSub1: true,
        contactNameSub2: true,
        contactPositionSub2: true,
        contactDepartmentSub2: true,
        contactNameSub3: true,
        contactPositionSub3: true,
        contactDepartmentSub3: true,
        engineer: { select: { name: true } },
        engineerSub: { select: { name: true } },
        sales: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
      take: 10,
    });

    const result = {
      items: customers.map((customer) => ({
        customerId: customer.id,
        customerName: customer.name,
        customerContacts: [
          { name: customer.contactName, position: customer.contactPosition, department: customer.contactDepartment },
          { name: customer.contactNameSub1, position: customer.contactPositionSub1, department: customer.contactDepartmentSub1 },
          { name: customer.contactNameSub2, position: customer.contactPositionSub2, department: customer.contactDepartmentSub2 },
          { name: customer.contactNameSub3, position: customer.contactPositionSub3, department: customer.contactDepartmentSub3 },
        ].filter((contact) => contact.name),
        accountManagers: {
          engineer: customer.engineer?.name || null,
          engineerSub: customer.engineerSub?.name || null,
          sales: customer.sales?.name || null,
        },
      })),
    };

    await this.logsService.createServiceLog({
      logType: '정보',
      action: 'AI 연동 고객 담당자 조회',
      description: 'AI Tool API를 통한 고객 담당자 조회',
      ipAddress,
    });

    return result;
  }

  async findUnresolvedSupportLogs(filters: UnresolvedSupportLogsDto, ipAddress: string) {
    const supportLogs = await this.prisma.supportLog.findMany({
      where: {
        actionStatus: { in: UNRESOLVED_STATUSES },
        // supportDate is a database DATE field, so UTC midnight represents the inclusive date boundary.
        ...(filters.supportDateTo && { supportDate: { lte: new Date(`${filters.supportDateTo}T00:00:00.000Z`) } }),
        ...(filters.customerName && { customer: { name: { contains: filters.customerName } } }),
      },
      select: {
        id: true,
        supportDate: true,
        category: true,
        title: true,
        actionStatus: true,
        inquiryContent: true,
        actionContent: true,
        entries: {
          select: { entryDate: true, content: true },
          orderBy: [{ entryDate: 'asc' }, { id: 'asc' }],
        },
        jiraTicket: true,
        customer: { select: { name: true } },
      },
      orderBy: [{ supportDate: 'desc' }, { updatedAt: 'desc' }],
      take: filters.limit || 50,
    });

    const result = {
      items: supportLogs.map((supportLog) => ({
        id: supportLog.id,
        customerName: supportLog.customer.name,
        supportDate: supportLog.supportDate.toISOString().slice(0, 10),
        category: supportLog.category,
        title: supportLog.title,
        actionStatus: supportLog.actionStatus,
        inquiryContent: redactSupportText(supportLog.inquiryContent),
        // 기존 진척 사항 + 지원 내역을 한 텍스트로 합쳐 응답 형식을 유지
        actionContent: redactSupportText([
          supportLog.actionContent,
          ...supportLog.entries.map((entry) => `[${entry.entryDate.toISOString().slice(0, 10)}] ${entry.content}`),
        ].filter(Boolean).join('\n') || null),
        jiraTicket: supportLog.jiraTicket,
      })),
    };

    await this.logsService.createServiceLog({
      logType: '정보',
      action: 'AI 연동 미조치 지원 이슈 조회',
      description: 'AI Tool API를 통한 미조치 지원 이슈 조회',
      ipAddress,
    });

    return result;
  }
}
