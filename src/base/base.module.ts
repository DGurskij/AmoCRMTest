import { Global, Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { CacheModule } from '@nestjs/cache-manager';
import { AmoService } from './amo/amo.service';

@Global()
@Module({
  imports: [CacheModule.register(), ConfigModule],
  providers: [AmoService],
  exports: [CacheModule.register(), AmoService],
})
export class BaseModule {}
