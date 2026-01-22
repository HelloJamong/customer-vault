import { Module } from '@nestjs/common';
import { InspectionReportsService } from './inspection-reports.service';
import { InspectionReportsController } from './inspection-reports.controller';

@Module({
  controllers: [InspectionReportsController],
  providers: [InspectionReportsService],
  exports: [InspectionReportsService],
})
export class InspectionReportsModule {}
