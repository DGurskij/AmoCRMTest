import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

export type Tenv = 'local' | 'dev' | 'prod';

export const ENV = (process.env.ENV as Tenv) || 'local';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: new ConfigService(ENV),
    },
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
