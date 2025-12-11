import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

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
    const [totalCustomers, totalUsers, totalDocuments] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.user.count(),
      this.prisma.document.count(),
    ]);

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
      totalCustomers,
      totalUsers,
      totalDocuments,
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
}
