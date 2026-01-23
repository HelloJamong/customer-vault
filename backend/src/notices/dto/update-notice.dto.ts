import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateNoticeDto {
  @ApiProperty({
    example: '시스템 점검 안내 (수정)',
    description: '공지사항 제목',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @ApiProperty({
    example: '<p>수정된 내용</p>',
    description: '공지사항 내용 (HTML)',
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;
}
