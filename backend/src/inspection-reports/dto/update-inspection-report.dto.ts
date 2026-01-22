import { PartialType } from '@nestjs/swagger';
import { CreateInspectionReportDto } from './create-inspection-report.dto';

export class UpdateInspectionReportDto extends PartialType(
  CreateInspectionReportDto,
) {}
