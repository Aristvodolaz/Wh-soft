import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../../shared/guards/roles.guard';
import { Role } from '../../../../shared/types/role.enum';
import { WarehouseService } from '../../application/services/warehouse.service';
import { BulkCreateCellsDto } from '../../application/dto/bulk-create-cells.dto';
import { CreateWarehouseDto } from '../../application/dto/create-warehouse.dto';
import { CreateZoneDto } from '../../application/dto/create-zone.dto';
import { UpdateWarehouseDto } from '../../application/dto/update-warehouse.dto';
import {
  BulkCreateCellsResponseDto,
  CellResponseDto,
  WarehouseResponseDto,
  ZoneResponseDto,
} from '../../application/dto/warehouse-response.dto';

@ApiTags('warehouses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  // ── Warehouses ──────────────────────────────────────────────────────────────

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Список всех складов организации' })
  @ApiOkResponse({ type: [WarehouseResponseDto] })
  listWarehouses(@CurrentUser() user: JwtPayload): Promise<WarehouseResponseDto[]> {
    return this.warehouseService.listWarehouses(user.tenantId);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN)
  @ApiOperation({ summary: 'Создать новый склад' })
  @ApiCreatedResponse({ type: WarehouseResponseDto })
  createWarehouse(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    return this.warehouseService.createWarehouse(user.tenantId, dto);
  }

  @Get(':warehouseId')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Получить данные склада по ID' })
  @ApiParam({ name: 'warehouseId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: WarehouseResponseDto })
  getWarehouse(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
  ): Promise<WarehouseResponseDto> {
    return this.warehouseService.getWarehouse(user.tenantId, warehouseId);
  }

  @Patch(':warehouseId')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN)
  @ApiOperation({ summary: 'Обновить данные склада' })
  @ApiParam({ name: 'warehouseId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: WarehouseResponseDto })
  updateWarehouse(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Body() dto: UpdateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    return this.warehouseService.updateWarehouse(user.tenantId, warehouseId, dto);
  }

  // ── Zones ───────────────────────────────────────────────────────────────────

  @Get(':warehouseId/zones')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST, Role.WORKER)
  @ApiOperation({ summary: 'Список всех зон на складе' })
  @ApiParam({ name: 'warehouseId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: [ZoneResponseDto] })
  listZones(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
  ): Promise<ZoneResponseDto[]> {
    return this.warehouseService.listZones(user.tenantId, warehouseId);
  }

  @Post(':warehouseId/zones')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN)
  @ApiOperation({ summary: 'Создать зону на складе' })
  @ApiParam({ name: 'warehouseId', type: String, format: 'uuid' })
  @ApiCreatedResponse({ type: ZoneResponseDto })
  createZone(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Body() dto: CreateZoneDto,
  ): Promise<ZoneResponseDto> {
    return this.warehouseService.createZone(user.tenantId, warehouseId, dto);
  }

  // ── Cells (bulk) ─────────────────────────────────────────────────────────────

  @Post(':warehouseId/cells/bulk')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN)
  @ApiOperation({
    summary: 'Массовое создание ячеек в зоне',
    description:
      'Создает до 1000 ячеек за одну транзакцию. ' +
      'Откатывает изменения целиком, если любая ячейка нарушает уникальность (код или штрихкод).',
  })
  @ApiParam({ name: 'warehouseId', type: String, format: 'uuid' })
  @ApiCreatedResponse({ type: BulkCreateCellsResponseDto })
  bulkCreateCells(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Body() dto: BulkCreateCellsDto,
  ): Promise<BulkCreateCellsResponseDto> {
    return this.warehouseService.bulkCreateCells(user.tenantId, warehouseId, dto);
  }

  // ── Cells by zone ───────────────────────────────────────────────────────────

  @Get(':warehouseId/zones/:zoneId/cells')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST, Role.WORKER)
  @ApiOperation({ summary: 'Список всех ячеек в зоне' })
  @ApiParam({ name: 'warehouseId', type: String, format: 'uuid' })
  @ApiParam({ name: 'zoneId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: [CellResponseDto] })
  listCells(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
  ): Promise<CellResponseDto[]> {
    return this.warehouseService.listCellsByZone(user.tenantId, warehouseId, zoneId);
  }
}
