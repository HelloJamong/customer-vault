import { Module } from '@nestjs/common';
import { InspectionStatusController } from './inspection-status.controller';
import { InspectionStatusService } from './inspection-status.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InspectionStatusController],
  providers: [InspectionStatusService],
})
export class InspectionStatusModule {}
