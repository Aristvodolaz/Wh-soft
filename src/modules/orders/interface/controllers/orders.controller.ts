import {
  Body,
  Controller,
  Delete,
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
  ApiNoContentResponse,
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
import { OrderStatus, OrderType } from '../../domain/entities/order.entity';
import { OrdersService } from '../../application/services/orders.service';
import { AddOrderItemDto } from '../../application/dto/add-order-item.dto';
import { CreateOrderDto } from '../../application/dto/create-order.dto';
import { UpdateOrderDto } from '../../application/dto/update-order.dto';
import { OrderItemResponseDto, OrderResponseDto } from '../../application/dto/order-response.dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── List / Get ───────────────────────────────────────────────────────────────

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'List all orders for the tenant' })
  @ApiQuery({ name: 'warehouseId', type: String, required: false })
  @ApiQuery({ name: 'type', enum: OrderType, required: false })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiOkResponse({ type: [OrderResponseDto] })
  listOrders(
    @CurrentUser() user: JwtPayload,
    @Query('warehouseId') warehouseId?: string,
    @Query('type') type?: OrderType,
    @Query('status') status?: OrderStatus,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.listOrders(user.tenantId, { warehouseId, type, status });
  }

  @Get(':orderId')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST, Role.WORKER)
  @ApiOperation({ summary: 'Get a single order by ID (includes items)' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiOkResponse({ type: OrderResponseDto })
  getOrder(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrder(user.tenantId, orderId);
  }

  // ── Create / Update ──────────────────────────────────────────────────────────

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  createOrder(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.createOrder(user.tenantId, user.sub, dto);
  }

  @Patch(':orderId')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update order header fields (DRAFT only)' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiOkResponse({ type: OrderResponseDto })
  updateOrder(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateOrder(user.tenantId, orderId, dto);
  }

  // ── Order Items ──────────────────────────────────────────────────────────────

  @Post(':orderId/items')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Add a line item to a DRAFT order' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiCreatedResponse({ type: OrderItemResponseDto })
  addItem(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AddOrderItemDto,
  ): Promise<OrderItemResponseDto> {
    return this.ordersService.addItem(user.tenantId, orderId, dto);
  }

  @Delete(':orderId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Remove a line item from a DRAFT order' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiParam({ name: 'itemId', type: String })
  @ApiNoContentResponse()
  removeItem(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    return this.ordersService.removeItem(user.tenantId, orderId, itemId);
  }

  // ── Status Transitions ───────────────────────────────────────────────────────

  @Post(':orderId/confirm')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Confirm order: DRAFT → CONFIRMED' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiOkResponse({ type: OrderResponseDto })
  confirm(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.transitionStatus(
      user.tenantId,
      orderId,
      OrderStatus.CONFIRMED,
      user.sub,
    );
  }

  @Post(':orderId/start-picking')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.WORKER)
  @ApiOperation({ summary: 'Start picking: CONFIRMED → IN_PICKING' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiOkResponse({ type: OrderResponseDto })
  startPicking(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.transitionStatus(
      user.tenantId,
      orderId,
      OrderStatus.IN_PICKING,
      user.sub,
    );
  }

  @Post(':orderId/mark-picked')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.WORKER)
  @ApiOperation({ summary: 'Mark as picked: IN_PICKING → PICKED' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiOkResponse({ type: OrderResponseDto })
  markPicked(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.transitionStatus(
      user.tenantId,
      orderId,
      OrderStatus.PICKED,
      user.sub,
    );
  }

  @Post(':orderId/start-packing')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.WORKER)
  @ApiOperation({ summary: 'Start packing: PICKED → IN_PACKING' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiOkResponse({ type: OrderResponseDto })
  startPacking(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.transitionStatus(
      user.tenantId,
      orderId,
      OrderStatus.IN_PACKING,
      user.sub,
    );
  }

  @Post(':orderId/mark-packed')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.WORKER)
  @ApiOperation({ summary: 'Mark as packed: IN_PACKING → PACKED' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiOkResponse({ type: OrderResponseDto })
  markPacked(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.transitionStatus(
      user.tenantId,
      orderId,
      OrderStatus.PACKED,
      user.sub,
    );
  }

  @Post(':orderId/ship')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Ship order: PACKED → SHIPPED' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiOkResponse({ type: OrderResponseDto })
  ship(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.transitionStatus(
      user.tenantId,
      orderId,
      OrderStatus.SHIPPED,
      user.sub,
    );
  }

  @Post(':orderId/deliver')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Mark as delivered: SHIPPED → DELIVERED' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiOkResponse({ type: OrderResponseDto })
  deliver(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.transitionStatus(
      user.tenantId,
      orderId,
      OrderStatus.DELIVERED,
      user.sub,
    );
  }

  @Post(':orderId/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Cancel order',
    description: 'Allowed from any non-terminal status (DRAFT through PACKED).',
  })
  @ApiParam({ name: 'orderId', type: String })
  @ApiOkResponse({ type: OrderResponseDto })
  cancel(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.transitionStatus(
      user.tenantId,
      orderId,
      OrderStatus.CANCELLED,
      user.sub,
    );
  }
}
