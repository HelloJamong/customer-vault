import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { LogsModule } from '../logs/logs.module';
import { CryptoModule } from '../common/crypto/crypto.module';

@Module({
  imports: [LogsModule, CryptoModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
