import { Module } from '@nestjs/common';
import { BaseModule } from './base/base.module';
import { CustomerModule } from './customer/customer.module';

@Module({
  imports: [BaseModule, CustomerModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
