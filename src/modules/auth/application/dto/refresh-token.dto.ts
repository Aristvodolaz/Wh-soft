import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token obtained from /auth/login or /auth/mobile-pin',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
