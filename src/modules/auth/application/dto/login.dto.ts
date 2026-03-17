import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@acme-warehouses.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.toLowerCase()?.trim())
  email: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'acme-warehouses',
    description: 'Tenant slug — identifies which organisation to authenticate against',
  })
  @IsString()
  @IsNotEmpty()
  tenantSlug: string;
}
