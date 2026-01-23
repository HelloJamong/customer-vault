import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateNoticeDto {
  @ApiProperty({ example: '시스템 점검 안내', description: '공지사항 제목' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: '<p>시스템 점검이 예정되어 있습니다.</p>',
    description: '공지사항 내용 (HTML)',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
