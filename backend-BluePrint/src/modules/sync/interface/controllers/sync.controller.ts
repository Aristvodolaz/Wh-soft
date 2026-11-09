import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../../shared/guards/roles.guard';
import { Role } from '../../../../shared/types/role.enum';
import { PullQueryDto, PushDto, PushResponseDto } from '../../application/dto/sync.dto';
import { SyncService } from '../../application/services/sync.service';

@ApiTags('sync')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('push')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.WORKER)
  @ApiOperation({
    summary: 'Идемпотентная выгрузка очереди (outbox) с терминала',
    description:
      'Каждая операция несёт клиентский UUID `opId`. Повторная доставка того же `opId` не применяется заново — ' +
      'возвращается сохранённый результат (outcome = DUPLICATE). Реальное время действия сохраняется в `occurredAt`.',
  })
  @ApiOkResponse({ type: PushResponseDto })
  push(@CurrentUser() user: JwtPayload, @Body() dto: PushDto): Promise<PushResponseDto> {
    return this.sync.push(user, dto);
  }

  @Get('pull')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.WORKER)
  @ApiOperation({ summary: 'Дельта-загрузка в локальную БД терминала: мои задачи + каталог для сканирования' })
  pull(@CurrentUser() user: JwtPayload, @Query() q: PullQueryDto): Promise<Record<string, unknown>> {
    return this.sync.pull(user, q);
  }
}
