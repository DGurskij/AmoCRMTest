import { readFileSync } from 'fs';

import { Injectable } from '@nestjs/common';
import { parse } from 'dotenv';
import { Tenv } from './config.module';
import { EnvProperties } from './env.properties.';

export type EnvProperty = keyof EnvProperties;

@Injectable()
export class ConfigService {
  public readonly env: Tenv;
  protected readonly envConfig: { [key: string]: string };

  constructor(env: Tenv) {
    this.env = env;
    this.envConfig = parse(readFileSync('./config/' + `.${env}.env`));
  }

  get(key: EnvProperty, defaultValue?: string): string {
    return this.envConfig[key] || defaultValue;
  }

  getEnv() {
    return this.env || 'local';
  }

  getBoolean(key: EnvProperty): boolean {
    return this.envConfig[key] === 'true';
  }

  getNumber(key: EnvProperty, defaultValue?: number): number {
    const val = this.get(key);
    return val ? parseInt(val, 10) : defaultValue;
  }
}
