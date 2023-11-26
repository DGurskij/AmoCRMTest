import { IsString, IsEmail } from 'class-validator';

export class CustomerFindDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;
}
