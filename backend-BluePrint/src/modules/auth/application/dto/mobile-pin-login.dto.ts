import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class MobilePinLoginDto {
  @ApiProperty({ example: 'worker001@acme-warehouses.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.toLowerCase()?.trim())
  email: string;

  @ApiProperty({
    example: '123456',
    minLength: 4,
    maxLength: 8,
    description: 'Numeric PIN (4–8 digits). Used by WORKER role on mobile scanners.',
  })
  @IsString()
  @MinLength(4, { message: 'PIN must be at least 4 digits' })
  @MaxLength(8, { message: 'PIN must not exceed 8 digits' })
  @Matches(/^\d+$/, { message: 'PIN must contain digits only' })
  pin: string;

  @ApiProperty({ example: 'acme-warehouses' })
  @IsString()
  @IsNotEmpty()
  tenantSlug: string;
}
