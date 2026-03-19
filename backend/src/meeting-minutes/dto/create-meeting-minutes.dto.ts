import { IsString, IsDateString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMeetingMinutesDto {
  @ApiProperty({ description: '회의 날짜' })
  @IsDateString()
  meetingDate: string;

  @ApiProperty({ description: '참석자', required: false })
  @IsOptional()
  @IsString()
  attendees?: string;

  @ApiProperty({ description: '위치', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: '회의 주제' })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ description: '회의 내용 (HTML)', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: '회의 결정 사항 (HTML)', required: false })
  @IsOptional()
  @IsString()
  decisions?: string;

  @ApiProperty({ description: '비고', required: false })
  @IsOptional()
  @IsString()
  remarks?: string;
}
