import { Module } from '@nestjs/common';
import { InspectionTargetsService } from './inspection-targets.service';
import { InspectionTargetsController } from './inspection-targets.controller';

@Module({
  controllers: [InspectionTargetsController],
  providers: [InspectionTargetsService],
  exports: [InspectionTargetsService],
})
export class InspectionTargetsModule {}
