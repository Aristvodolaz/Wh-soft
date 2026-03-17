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
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../../shared/guards/roles.guard';
import { Role } from '../../../../shared/types/role.enum';
import { InventoryService } from '../../application/services/inventory.service';
import { CreateProductDto } from '../../application/dto/create-product.dto';
import { MoveInventoryDto } from '../../application/dto/move-inventory.dto';
import { UpdateProductDto } from '../../application/dto/update-product.dto';
import {
  InventoryItemResponseDto,
  MovementResponseDto,
  ProductResponseDto,
  ScanResultDto,
} from '../../application/dto/inventory-response.dto';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ── Products ────────────────────────────────────────────────────────────────

  @Get('products')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Список всех товаров в каталоге организации' })
  @ApiOkResponse({ type: [ProductResponseDto] })
  listProducts(@CurrentUser() user: JwtPayload): Promise<ProductResponseDto[]> {
    return this.inventoryService.listProducts(user.tenantId);
  }

  @Post('products')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Создать новый товар в каталоге организации' })
  @ApiCreatedResponse({ type: ProductResponseDto })
  createProduct(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return this.inventoryService.createProduct(user.tenantId, dto);
  }

  @Get('products/:productId')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST, Role.WORKER)
  @ApiOperation({ summary: 'Получить данные о товаре по ID' })
  @ApiParam({ name: 'productId', type: String })
  @ApiOkResponse({ type: ProductResponseDto })
  getProduct(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<ProductResponseDto> {
    return this.inventoryService.getProduct(user.tenantId, productId);
  }

  @Patch('products/:productId')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Обновить данные товара' })
  @ApiParam({ name: 'productId', type: String })
  @ApiOkResponse({ type: ProductResponseDto })
  updateProduct(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.inventoryService.updateProduct(user.tenantId, productId, dto);
  }

  // ── Inventory items ─────────────────────────────────────────────────────────

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Список остатков (inventory items) для склада' })
  @ApiQuery({ name: 'warehouseId', type: String, required: true })
  @ApiOkResponse({ type: [InventoryItemResponseDto] })
  listInventory(
    @CurrentUser() user: JwtPayload,
    @Query('warehouseId', ParseUUIDPipe) warehouseId: string,
  ): Promise<InventoryItemResponseDto[]> {
    return this.inventoryService.listInventory(user.tenantId, warehouseId);
  }

  // ── Scan ─────────────────────────────────────────────────────────────────────

  @Get('scan')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST, Role.WORKER)
  @ApiOperation({
    summary: 'Сканирование штрихкода',
    description:
      'Распознает сканированный штрихкод как товар (EAN/UPC) или как ячейку. ' +
      'Возвращает информацию о текущих остатках для найденного объекта.',
  })
  @ApiQuery({ name: 'barcode', type: String, required: true, example: '5901234123457' })
  @ApiQuery({ name: 'warehouseId', type: String, required: true })
  @ApiOkResponse({ type: ScanResultDto })
  scan(
    @CurrentUser() user: JwtPayload,
    @Query('barcode') barcode: string,
    @Query('warehouseId', ParseUUIDPipe) warehouseId: string,
  ): Promise<ScanResultDto> {
    return this.inventoryService.scan(user.tenantId, barcode, warehouseId);
  }

  // ── Move ──────────────────────────────────────────────────────────────────────

  @Post('move')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.WORKER)
  @ApiOperation({
    summary: 'Перемещение остатков между ячейками',
    description:
      'Атомарно переводит сток из одной ячейки в другую. ' +
      'Регистрирует завершенное перемещение и создает событие `inventory.moved`. ' +
      'Запрос отклоняется, если на источнике недостаточно доступного остатка.',
  })
  @ApiOkResponse({ type: MovementResponseDto })
  move(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MoveInventoryDto,
  ): Promise<MovementResponseDto> {
    return this.inventoryService.move(user.tenantId, user.sub, dto);
  }
}
