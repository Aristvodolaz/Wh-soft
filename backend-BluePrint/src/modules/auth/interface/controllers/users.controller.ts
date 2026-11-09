import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../../shared/guards/roles.guard';
import { Role } from '../../../../shared/types/role.enum';
import { UserResponseDto } from '../../application/dto/user-response.dto';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly userRepository: UserRepository) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Список пользователей организации' })
  @ApiOkResponse({ type: [UserResponseDto] })
  async listUsers(@CurrentUser() user: JwtPayload): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAllByTenant(user.tenantId);
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));
  }
}
