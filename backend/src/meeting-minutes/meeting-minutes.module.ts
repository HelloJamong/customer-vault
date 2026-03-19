import { Module } from '@nestjs/common';
import { MeetingMinutesService } from './meeting-minutes.service';
import { MeetingMinutesController } from './meeting-minutes.controller';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [LogsModule],
  controllers: [MeetingMinutesController],
  providers: [MeetingMinutesService],
})
export class MeetingMinutesModule {}
