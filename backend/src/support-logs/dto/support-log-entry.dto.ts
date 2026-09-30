import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SupportLogEntryDto {
  @IsDateString({ strict: true })
  entryDate: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
