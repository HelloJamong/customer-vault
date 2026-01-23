import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';

@Injectable()
export class NoticesService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {}

  async findAll() {
    return this.prisma.notice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const notice = await this.prisma.notice.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!notice) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다.');
    }

    return notice;
  }

  async create(
    createDto: CreateNoticeDto,
    userId: number,
    ipAddress: string,
  ) {
    const notice = await this.prisma.notice.create({
      data: {
        title: createDto.title,
        content: createDto.content,
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    // 서비스 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '정보',
      action: '공지사항 작성',
      description: `"${notice.title}" 공지사항 작성`,
      afterValue: JSON.stringify({ id: notice.id, title: notice.title }),
      ipAddress,
    });

    return notice;
  }

  async update(
    id: number,
    updateDto: UpdateNoticeDto,
    userId: number,
    ipAddress: string,
  ) {
    // 기존 공지사항 조회
    const existingNotice = await this.findOne(id);

    const updatedNotice = await this.prisma.notice.update({
      where: { id },
      data: updateDto,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    // 서비스 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '정보',
      action: '공지사항 수정',
      description: `"${updatedNotice.title}" 공지사항 수정`,
      beforeValue: JSON.stringify({
        title: existingNotice.title,
        content: existingNotice.content,
      }),
      afterValue: JSON.stringify({
        title: updatedNotice.title,
        content: updatedNotice.content,
      }),
      ipAddress,
    });

    return updatedNotice;
  }

  async remove(id: number, userId: number, ipAddress: string) {
    const notice = await this.findOne(id);

    await this.prisma.notice.delete({
      where: { id },
    });

    // 서비스 로그 기록
    await this.logsService.createServiceLog({
      userId,
      logType: '경고',
      action: '공지사항 삭제',
      description: `"${notice.title}" 공지사항 삭제`,
      beforeValue: JSON.stringify({ id: notice.id, title: notice.title }),
      ipAddress,
    });

    return { message: '공지사항이 삭제되었습니다.' };
  }
}
