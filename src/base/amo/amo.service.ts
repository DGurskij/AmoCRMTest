import { readFileSync, writeFileSync } from 'fs';

import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '../config/config.service';
import axios, { Axios } from 'axios';
import { CustomerFindDto } from 'src/customer/dto/customer.find.dto';

const TOKEN_URLS = ['oauth2/access_token'];

@Injectable()
export class AmoService {
  private readonly clientSecret: string;
  private readonly clienId: string;

  private api: Axios;
  private token: IRefreshToken;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly config: ConfigService,
  ) {
    this.clientSecret = this.config.get('CRM_AMO_SECRET');
    this.clienId = this.config.get('CRM_AMO_ID');

    this.api = axios.create({
      baseURL: this.config.get('CRM_AMO_API'),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use(async cfg => {
      // Ignore Auth for oauth2 requests
      if (!TOKEN_URLS.includes(cfg.url)) {
        const token = await this.getAuthToken();
        cfg.headers.Authorization = `Bearer ${token}`;
      }

      return cfg;
    });
  }

  async onModuleInit() {
    // await this.auth();
    const token = this.readToken();
    await this.refreshToken(token.refresh_token);
  }

  // Amo contacts methods

  async findContact(customer: CustomerFindDto) {
    const contact = await this.getContact(customer);

    if (contact) {
      const phone = this.getCustomFieldValue(contact, 'PHONE');

      if (customer.phone !== phone) {
        await this.updateContact(contact.id, customer);
      }
    } else {
      await this.createContact(customer);
    }
  }

  async getContact({ email }: CustomerFindDto) {
    try {
      const { data } = await this.api.get<IResponseContacts>(`api/v4/contacts?query=${email}`);
      return data ? data._embedded.contacts[0] : undefined;
    } catch (e) {
      console.log(e.response.data);
    }
  }

  async createContact(customer: CustomerFindDto) {
    try {
      await this.api.post('api/v4/contacts', [
        {
          name: customer.name,
          custom_fields_values: [this.genCustomFieldObject('PHONE', customer.phone), this.genCustomFieldObject('EMAIL', customer.email)],
        },
      ]);
    } catch (e) {
      console.log(e.response.data);
    }
  }

  async updateContact(id: number, customer: CustomerFindDto) {
    try {
      console.log('update contact');
      await this.api.patch(`api/v4/contacts`, [
        {
          id,
          name: customer.name,
          custom_fields_values: [this.genCustomFieldObject('PHONE', customer.phone), this.genCustomFieldObject('EMAIL', customer.email)],
        },
      ]);
    } catch (e) {
      console.log(e.response.data);
    }
  }

  private genCustomFieldObject(fieldCode: string, value: unknown) {
    return { field_code: fieldCode, values: [{ value }] };
  }

  private getCustomFieldValue(contact: IContact, fieldCode: string) {
    const customField = contact.custom_fields_values.find(field => field.field_code === fieldCode);
    return customField?.values[0].value;
  }

  // Authorization part

  async auth() {
    try {
      const response = await this.api.post('oauth2/access_token', {
        client_id: this.clienId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        code: 'def502002d781cf293cac1e20567e27202319e4a05187077d77f5a7736e8bf7d203646e7ae0325893d7763dd4ac91559daa3d595ce91a2e699d9be4cca45623382b44c21c532d18e20d93f9c902fee7ada279366b5afed6c95b5b01dcd6afe9695fcd94a87abb11f1d79ff309f27c5b880b6b3d403b47277805162bd3d7889e1c67c974b5ef5d656d98f6a48460e046c563a0bdca85b6a1f86cfdc595676e9a0771c59447ecdf0b1b81c8bffe4c3d611695f7004d28e3a2a7b410f8eb5e998b221cf92d1d7ef3209aea2a77f0f146fb6c6da28b2836038d4c188e031d755e03aa07b62bdc515c5a586e5e8ff5a84e615584d4d0320cfaa91559a06c5a5333dae47d8253566da35d39e5b28ecea741f47d31149d6504fabd0d3135129df025f7f2e3e0ff6cf071a7df283313bbb13e3fca9087fb50d3ea0c4bfb64b8f401de40165ab674bc6be6ea053ca3282002290e9e001a3cf53266fd8a6772b1a2e68f410eb79c2c8602cc055d6f3443c9b41a8dcdb2d125d3807202c2eb089bcd3ae10654600eece7df1f73046f8be4db3a53a7c0dafd441b5c6800a3eef0298c5fb09a7f769eb0db424ce54b0b1118aa86e0f6fb82dbe158531c878533934f2a3434b74f7e6f7e848ddcdba38e8ec6b024a4bde0c069befd30aa234e93fd4fd79235fbb3eb638770d9007e8daf1b7544d461c98ded6ee3c98f9',
        redirect_uri: 'https://e8a7-178-121-155-194.ngrok.io',
      });

      await this.saveToken(response.data);
    } catch (e) {
      if (e.response) {
        console.log(e.response.data);
      }
      throw new Error('Error when get access token');
    }
  }

  async getAuthToken() {
    const accessToken = await this.cache.get<string>('amo-token');

    if (accessToken) {
      return accessToken;
    }

    await this.refreshToken(this.token.refresh_token);

    return this.token.access_token;
  }

  private async refreshToken(refresh_token: string) {
    try {
      const response = await this.api.post('oauth2/access_token', {
        client_id: this.clienId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token,
      });

      const data = response.data as IRefreshToken;

      await this.saveToken(data);
    } catch (e) {
      if (e.response) {
        console.log(e.response.data);
      }
      throw new Error('Error when refresh access token');
    }
  }

  /**
   * Refresh token must be saved between different server launches
   * Temp save in JSON file
   */

  /**
   * TODO: better store in DB
   */
  private async saveToken(data: IRefreshToken) {
    await this.cache.set('amo-token', data.access_token, data.expires_in * 1000 - 1000);
    this.token = data;
    writeFileSync('token.json', JSON.stringify(data), { encoding: 'utf-8' });
  }

  private readToken() {
    const jsonToken = readFileSync('token.json', 'utf-8');

    return JSON.parse(jsonToken) as IRefreshToken;
  }
}

// INTERNAL SERVICE INTERFACES

interface IRefreshToken {
  token_type: string;
  /**
   * expires in seconds
   */
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

interface IContact {
  id: number;
  name: string;
  custom_fields_values: {
    field_code: 'PHONE' | 'EMAIL';
    values: { value: string }[];
  }[];
}

interface IResponseContacts {
  _embedded: {
    contacts: IContact[];
  };
}
