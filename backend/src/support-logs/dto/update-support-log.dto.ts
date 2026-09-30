import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateSupportLogDto } from './create-support-log.dto';

// actionContent(기존 기록)는 읽기 전용, 지원 내역은 /entries API로만 추가
export class UpdateSupportLogDto extends PartialType(
  OmitType(CreateSupportLogDto, ['actionContent', 'entryContent'] as const),
) {}
