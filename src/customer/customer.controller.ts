import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { CustomerFindDto } from './dto/customer.find.dto';
import { CustomerService } from './customer.service';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get('find')
  async findCustomer(@Query(new ValidationPipe({ transform: true })) customer: CustomerFindDto) {
    await this.customerService.findCustomer(customer);
  }
}
