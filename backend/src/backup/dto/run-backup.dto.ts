import { IsOptional } from 'class-validator';

export class RunBackupDto {
  @IsOptional()
  note?: string;
}
