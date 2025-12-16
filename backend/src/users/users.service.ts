import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(role?: string, isActive?: boolean, department?: string) {
    const where: any = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (department) where.department = department;

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        isLocked: true,
        lockedUntil: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 사용자 상태 계산
    return users.map((user) => ({
      ...user,
      status: this.getUserStatus(user),
    }));
  }

  // 사용자 상태 판별
  private getUserStatus(user: any): string {
    // 잠김 상태 확인
    if (user.isLocked && user.lockedUntil && new Date() < user.lockedUntil) {
      return '잠김';
    }

    // 비활성 상태 확인
    if (!user.isActive) {
      return '비활성';
    }

    return '정상';
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        assignedCustomers: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async create(createUserDto: CreateUserDto) {
    const { customerIds, ...userData } = createUserDto;

    // 슈퍼 관리자 생성 시 최대 3명 제한 확인
    if (userData.role === 'super_admin') {
      const superAdminCount = await this.prisma.user.count({
        where: { role: 'super_admin' },
      });

      if (superAdminCount >= 3) {
        throw new BadRequestException('슈퍼 관리자는 최대 3명까지만 생성할 수 있습니다.');
      }
    }

    // 기본 비밀번호 가져오기
    const settings = await this.getSystemSettings();
    const passwordHash = await bcrypt.hash(settings.defaultPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
        isFirstLogin: true,
      },
    });

    // 담당 고객사 연결
    if (customerIds && customerIds.length > 0) {
      await this.prisma.userCustomer.createMany({
        data: customerIds.map((customerId) => ({
          userId: user.id,
          customerId,
        })),
      });
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      defaultPassword: settings.defaultPassword,
      message: '사용자가 생성되었습니다. 최초 로그인 시 비밀번호 변경이 필요합니다.',
    };
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const { customerIds, ...userData } = updateUserDto;

    const user = await this.prisma.user.update({
      where: { id },
      data: userData,
    });

    // 담당 고객사 업데이트
    if (customerIds !== undefined) {
      // 기존 연결 삭제
      await this.prisma.userCustomer.deleteMany({
        where: { userId: id },
      });

      // 새 연결 생성
      if (customerIds.length > 0) {
        await this.prisma.userCustomer.createMany({
          data: customerIds.map((customerId) => ({
            userId: id,
            customerId,
          })),
        });
      }
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      message: '사용자 정보가 수정되었습니다.',
    };
  }

  async toggleActive(id: number, currentUserId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 본인 계정 비활성화 방지
    if (id === currentUserId && user.isActive) {
      throw new ForbiddenException('본인 계정은 비활성화할 수 없습니다.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    return {
      id: updated.id,
      isActive: updated.isActive,
      message: updated.isActive ? '사용자가 활성화되었습니다.' : '사용자가 비활성화되었습니다.',
    };
  }

  async resetPassword(id: number) {
    const settings = await this.getSystemSettings();
    const passwordHash = await bcrypt.hash(settings.defaultPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        isFirstLogin: true,
        passwordChangedAt: new Date(),
      },
    });

    return {
      message: '비밀번호가 초기화되었습니다.',
      defaultPassword: settings.defaultPassword,
    };
  }

  async remove(id: number, currentUserId: number) {
    // 본인 계정 삭제 방지
    if (id === currentUserId) {
      throw new ForbiddenException('본인 계정은 삭제할 수 없습니다.');
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: '사용자가 삭제되었습니다.' };
  }

  private async getSystemSettings() {
    let settings = await this.prisma.systemSettings.findFirst();

    if (!settings) {
      settings = await this.prisma.systemSettings.create({ data: {} });
    }

    return settings;
  }
}
