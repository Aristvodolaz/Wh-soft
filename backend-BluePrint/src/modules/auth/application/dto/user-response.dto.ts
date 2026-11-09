import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../../shared/types/role.enum';

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() email: string | null;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ enum: Role }) role: Role;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() lastLoginAt: Date | null;
  @ApiProperty() createdAt: Date;
}
