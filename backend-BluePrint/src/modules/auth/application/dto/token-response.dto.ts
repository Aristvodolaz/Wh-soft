import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../../shared/types/role.enum';

export class TokenResponseDto {
  @ApiProperty({ description: 'Short-lived JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'Long-lived refresh token for token rotation' })
  refreshToken: string;

  @ApiProperty({ enum: Role, description: 'Authenticated user role' })
  role: Role;

  @ApiProperty({ description: 'Access token TTL in seconds', example: 3600 })
  expiresIn: number;
}
