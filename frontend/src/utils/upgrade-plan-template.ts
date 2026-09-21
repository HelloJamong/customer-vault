export type UpgradePlanCommonCategory = '클라이언트' | '관리서버';

export interface UpgradePlanConsiderationTemplate {
  category: UpgradePlanCommonCategory;
  feature: string;
  description: string;
}

export const UPGRADE_PLAN_DEFAULT_CONSIDERATIONS: UpgradePlanConsiderationTemplate[] = [
  {
    category: '클라이언트',
    feature: '초기 패스워드',
    description: 'v4.2 버전과 v6.1 버전 초기 패스워드 정책 차이 안내',
  },
  {
    category: '클라이언트',
    feature: '가상PC 이미지',
    description: 'v4.2 버전에서 사용했던 가상데스크탑 이미지를 유지하는지',
  },
  {
    category: '클라이언트',
    feature: '가상PC IP주소 할당',
    description: 'v4.2 버전에서 사용했던 가상PC IP주소를 유지하는지',
  },
  {
    category: '클라이언트',
    feature: '화면 캡쳐 방지/원격 예외처리',
    description: 'v4.2 버전에서 사용했던 환경과 v6.1 버전에서 변경되는 화면 캡쳐 방지/원격 예외처리 차이 안내',
  },
  {
    category: '클라이언트',
    feature: '가상PC 네트워크 접속',
    description: 'v4.2 버전에서 접속 환경과 v6.1 버전에서도 접속 환경 문제가 없는지',
  },
  {
    category: '클라이언트',
    feature: '클라이언트 로그인',
    description: 'v4.2 버전에서 로그인 했던 방식과 v6.1 버전에서 로그인하는 방식이 동일한지 체크',
  },
  {
    category: '클라이언트',
    feature: '정책템플릿 기능',
    description: 'v4.2 버전에서 적용했던 가상PC 정책이 v6.1 버전에서 문제없이 적용되는지 체크',
  },
  {
    category: '관리서버',
    feature: '패스워드 복잡성',
    description: 'v4.2에서 사용 중인 패스워드 복잡성을 v6.1 환경에서도 동일한지',
  },
  {
    category: '관리서버',
    feature: 'IP 할당 정책',
    description: 'v4.2 버전에서 사용했던 IP할당 정책을 v6.1 버전에서 적용 가능한지',
  },
  {
    category: '관리서버',
    feature: '계정연동',
    description: 'v4.2 버전에서 인사연동 진행 중일 경우, v6.1 버전에서 인사연동 적용 체크',
  },
  {
    category: '관리서버',
    feature: '로그인 인증 방식',
    description: 'v4.2 버전과 v6.1 버전 간에 로그인 인증 방식 동일 설정 체크',
  },
  {
    category: '관리서버',
    feature: '화면 캡처 방지 정책',
    description: 'v4.2 버전에서 화면 캡쳐 방지 Logic을 v6.1 버전에서 화면 캡쳐 방지 Logic 정책 할당 방식 체크',
  },
  {
    category: '관리서버',
    feature: '원격 예외처리',
    description: 'v4.2 버전과 v6.1 버전 간에 화면 캡쳐 방지 Logic 변경에 따른 정책 할당 방식 체크',
  },
  {
    category: '관리서버',
    feature: '관리웹 접근 IP 제어',
    description: 'v4.2 버전에서 등록된 관리자 지정 IP를 v6.1 환경에서도 동일하게 등록 가능해야 함',
  },
  {
    category: '관리서버',
    feature: '라이선스',
    description: 'v4.2에 등록된 사용 가능한 라이선스 수의 총 수량이 v6.1에서 동일하게 반영되어야 함',
  },
  {
    category: '관리서버',
    feature: '계정연동 라이선스 할당 여부',
    description: 'v4.2 버전과 v6.1 버전 간 라이선스 카운팅 Logic 차이로 계정연동 시 할당 여부 체크',
  },
];
