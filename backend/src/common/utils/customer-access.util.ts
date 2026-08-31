import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type RequestUser = { id: number; role: string };

function isAdmin(role: string): boolean {
  const r = String(role ?? '').trim().toLowerCase();
  return r === 'super_admin' || r === 'admin';
}

/**
 * 편집 권한 검사.
 * - 관리자(admin, super_admin): 제한 없음
 * - 일반 사용자(user): 본인이 담당(정/부 엔지니어, 영업)인 고객사만
 *
 * 조회는 이 앱에서 로그인한 모든 내부 사용자에게 열려 있다. 편집/삭제/외부 전송에만 사용할 것.
 */
export async function assertCustomerEditable(
  prisma: PrismaService,
  customerId: number,
  user: RequestUser,
  message = '담당하는 고객사의 정보만 수정할 수 있습니다.',
): Promise<void> {
  if (isAdmin(user?.role)) return;

  const assigned = await prisma.customer.findFirst({
    where: {
      id: customerId,
      OR: [
        { engineerId: user.id },
        { engineerSubId: user.id },
        { salesId: user.id },
      ],
    },
    select: { id: true },
  });

  if (!assigned) {
    throw new ForbiddenException(message);
  }
}

export function isAdminRole(role: string): boolean {
  return isAdmin(role);
}
