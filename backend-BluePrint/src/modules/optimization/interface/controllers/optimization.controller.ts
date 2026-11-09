import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../../shared/guards/roles.guard';
import { Role } from '../../../../shared/types/role.enum';
import {
  ApplySlottingDto,
  LoadingPlanDto,
  ReplenishmentQueryDto,
  SlottingQueryDto,
  ValidatePlacementDto,
  WorkloadQueryDto,
} from '../../application/dto/optimization.dto';
import { LoadingService } from '../../application/services/loading.service';
import { ReplenishmentService } from '../../application/services/replenishment.service';
import { SlottingService } from '../../application/services/slotting.service';
import { WorkforceService } from '../../application/services/workforce.service';

const READ = [Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST] as const;
const WRITE = [Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER] as const;

@ApiTags('optimization')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('optimization')
export class OptimizationController {
  constructor(
    private readonly replenishment: ReplenishmentService,
    private readonly slotting: SlottingService,
    private readonly workforce: WorkforceService,
    private readonly loading: LoadingService,
  ) {}

  // ── 1. Predictive replenishment ───────────────────────────────────────────────

  @Get('warehouses/:warehouseId/replenishment/forecast')
  @Roles(...READ)
  @ApiOperation({
    summary: 'Прогноз времени до обнуления остатка',
    description:
      'Экспоненциальное сглаживание с α (и γ), подбираемыми под каждый SKU минимизацией MSE на окне 90 дней, ' +
      'плюс мультипликативная недельная сезонность (если она статистически оправдана).',
  })
  replenishmentForecast(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Query() q: ReplenishmentQueryDto,
  ) {
    return this.replenishment.forecast(user.tenantId, warehouseId, q);
  }

  @Post('warehouses/:warehouseId/replenishment/tasks')
  @Roles(...WRITE)
  @HttpCode(201)
  @ApiOperation({ summary: 'Создать задания REPLENISH до обнуления (идемпотентно по SKU)' })
  generateReplenishment(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Query() q: ReplenishmentQueryDto,
  ) {
    return this.replenishment.generateTasks(user.tenantId, warehouseId, q);
  }

  // ── 2. Dynamic slotting ───────────────────────────────────────────────────────

  @Get('warehouses/:warehouseId/slotting/plan')
  @Roles(...READ)
  @ApiOperation({
    summary: 'ABC/XYZ-матрица и план размещения, минимизирующий пробег персонала',
    description: 'Жёсткие ограничения (вес/объём ячейки) блокируют назначение, мягкие (эргономика) дают предупреждения.',
  })
  slottingPlan(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Query() q: SlottingQueryDto,
  ) {
    return this.slotting.plan(user.tenantId, warehouseId, q);
  }

  @Post('warehouses/:warehouseId/slotting/validate')
  @Roles(...READ)
  @HttpCode(200)
  @ApiOperation({ summary: 'Двухуровневая проверка назначения «товар → ячейка»' })
  validatePlacement(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Body() dto: ValidatePlacementDto,
  ) {
    return this.slotting.validate(user.tenantId, warehouseId, dto.productId, dto.cellId);
  }

  @Post('warehouses/:warehouseId/slotting/apply')
  @Roles(...WRITE)
  @HttpCode(201)
  @ApiOperation({ summary: 'Создать задания TRANSFER по лучшим перемещениям плана' })
  applySlotting(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Body() dto: ApplySlottingDto,
  ) {
    return this.slotting.apply(user.tenantId, warehouseId, dto);
  }

  // ── 3. Workforce load ─────────────────────────────────────────────────────────

  @Get('warehouses/:warehouseId/workforce/forecast')
  @Roles(...READ)
  @ApiOperation({
    summary: 'Прогноз загрузки персонала',
    description:
      'Нормы времени по типам задач калибруются регрессией на данных склада; персональный коэффициент = факт/норматив за 30 смен.',
  })
  @ApiQuery({ name: 'shiftMinutes', required: false })
  workforceForecast(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Query() q: WorkloadQueryDto,
  ) {
    return this.workforce.forecast(user.tenantId, warehouseId, q);
  }

  // ── 4. 3D vehicle loading ─────────────────────────────────────────────────────

  @Post('loading/plan')
  @Roles(...WRITE)
  @HttpCode(200)
  @ApiOperation({
    summary: '3D-загрузка транспорта',
    description:
      'Гильотинная эвристика, 6 ориентаций, «тяжёлое под лёгким», контроль центра тяжести и осей, LIFO по маршруту. ' +
      'Груз — явным списком `cargo` и/или строками заказов `orders` (позиция заказа в маршруте = номер остановки).',
  })
  loadingPlan(@CurrentUser() user: JwtPayload, @Body() dto: LoadingPlanDto) {
    return this.loading.plan(user.tenantId, dto);
  }
}
