import { Injectable } from '@nestjs/common';
import { AmoService } from 'src/base/amo/amo.service';
import { CustomerFindDto } from './dto/customer.find.dto';

@Injectable()
export class CustomerService {
  constructor(private readonly amoService: AmoService) {}

  async findCustomer(customer: CustomerFindDto) {
    await this.amoService.findContact(customer);
  }
}
