import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CreateMeetingMinutesDto } from './dto/create-meeting-minutes.dto';
import { UpdateMeetingMinutesDto } from './dto/update-meeting-minutes.dto';

@Injectable()
export class MeetingMinutesService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {}

  async findAllByCustomer(customerId: number) {
    return this.prisma.meetingMinutes.findMany({
      where: { customerId },
      orderBy: { meetingDate: 'desc' },
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const minutes = await this.prisma.meetingMinutes.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
      },
    });
    if (!minutes) throw new NotFoundException('회의록을 찾을 수 없습니다.');
    return minutes;
  }

  async create(customerId: number, dto: CreateMeetingMinutesDto, userId: number, ipAddress: string) {
    const minutes = await this.prisma.meetingMinutes.create({
      data: {
        customerId,
        meetingDate: new Date(dto.meetingDate),
        attendees: dto.attendees,
        location: dto.location,
        subject: dto.subject,
        content: dto.content,
        decisions: dto.decisions,
        remarks: dto.remarks,
        createdBy: userId,
      },
      include: {
        creator: { select: { id: true, name: true, username: true } },
      },
    });

    await this.logsService.createServiceLog({
      userId,
      logType: '정보',
      action: '회의록 작성',
      description: `"${minutes.subject}" 회의록 작성 (고객사 ID: ${customerId})`,
      afterValue: JSON.stringify({ id: minutes.id, subject: minutes.subject }),
      ipAddress,
    });

    return minutes;
  }

  async update(id: number, dto: UpdateMeetingMinutesDto, userId: number, ipAddress: string) {
    const existing = await this.findOne(id);

    const updated = await this.prisma.meetingMinutes.update({
      where: { id },
      data: {
        ...(dto.meetingDate && { meetingDate: new Date(dto.meetingDate) }),
        ...(dto.attendees !== undefined && { attendees: dto.attendees }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.decisions !== undefined && { decisions: dto.decisions }),
        ...(dto.remarks !== undefined && { remarks: dto.remarks }),
      },
      include: {
        creator: { select: { id: true, name: true, username: true } },
      },
    });

    await this.logsService.createServiceLog({
      userId,
      logType: '정보',
      action: '회의록 수정',
      description: `"${updated.subject}" 회의록 수정`,
      beforeValue: JSON.stringify({ subject: existing.subject }),
      afterValue: JSON.stringify({ subject: updated.subject }),
      ipAddress,
    });

    return updated;
  }

  async remove(id: number, userId: number, ipAddress: string) {
    const minutes = await this.findOne(id);

    await this.prisma.meetingMinutes.delete({ where: { id } });

    await this.logsService.createServiceLog({
      userId,
      logType: '경고',
      action: '회의록 삭제',
      description: `"${minutes.subject}" 회의록 삭제`,
      beforeValue: JSON.stringify({ id: minutes.id, subject: minutes.subject }),
      ipAddress,
    });

    return { message: '회의록이 삭제되었습니다.' };
  }
}
