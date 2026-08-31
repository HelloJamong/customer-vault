import { IsIn, IsString, MaxLength } from 'class-validator';

// 클라이언트에서 발생하는 엑셀 내보내기(브라우저 내 생성)를 감사 로그로 남기기 위한 DTO.
// action은 화이트리스트로 고정해 임의 감사 로그 위조를 막는다.
export const EXPORT_ACTIONS = [
  '형상 관리 정보 엑셀 내보내기',
  '지원 목록 엑셀 내보내기',
  '고객사 세부사항 엑셀 내보내기',
  '고객사 전체정보 엑셀 내보내기',
] as const;

export class LogExcelExportDto {
  @IsIn(EXPORT_ACTIONS)
  action: string;

  @IsString()
  @MaxLength(300)
  description: string;
}
