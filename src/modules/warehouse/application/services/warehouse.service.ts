import { Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../../../shared/exceptions/app.exception';
import { Cell } from '../../domain/entities/cell.entity';
import { Warehouse } from '../../domain/entities/warehouse.entity';
import { Zone, ZoneType } from '../../domain/entities/zone.entity';
import { CellRepository } from '../../infrastructure/repositories/cell.repository';
import { WarehouseRepository } from '../../infrastructure/repositories/warehouse.repository';
import { ZoneRepository } from '../../infrastructure/repositories/zone.repository';
import { BulkCreateCellsDto } from '../dto/bulk-create-cells.dto';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { CreateZoneDto } from '../dto/create-zone.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import {
  BulkCreateCellsResponseDto,
  CellResponseDto,
  WarehouseResponseDto,
  ZoneResponseDto,
} from '../dto/warehouse-response.dto';

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly zoneRepository: ZoneRepository,
    private readonly cellRepository: CellRepository,
  ) {}

  // ── Warehouse CRUD ──────────────────────────────────────────────────────────

  async listWarehouses(tenantId: string): Promise<WarehouseResponseDto[]> {
    const warehouses = await this.warehouseRepository.findAllByTenant(tenantId);
    return warehouses.map(this.toWarehouseResponse);
  }

  async createWarehouse(tenantId: string, dto: CreateWarehouseDto): Promise<WarehouseResponseDto> {
    const code = dto.code.toUpperCase();

    const exists = await this.warehouseRepository.existsByCode(code, tenantId);
    if (exists) {
      throw AppException.conflict(`Warehouse with code "${code}" already exists`);
    }

    const warehouse = Object.assign(new Warehouse(), {
      tenantId,
      name: dto.name,
      code,
      address: dto.address ?? null,
      city: dto.city ?? null,
      country: dto.country ?? null,
      timezone: dto.timezone ?? 'UTC',
      isActive: true,
      settings: dto.settings ?? {},
    });

    const saved = await this.warehouseRepository.save(warehouse);
    this.logger.log(`Warehouse "${saved.code}" created for tenant ${tenantId}`);
    return this.toWarehouseResponse(saved);
  }

  async getWarehouse(tenantId: string, warehouseId: string): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseRepository.findById(warehouseId, tenantId);
    if (!warehouse) throw AppException.notFound('Warehouse', warehouseId);
    return this.toWarehouseResponse(warehouse);
  }

  async updateWarehouse(
    tenantId: string,
    warehouseId: string,
    dto: UpdateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseRepository.findById(warehouseId, tenantId);
    if (!warehouse) throw AppException.notFound('Warehouse', warehouseId);

    if (dto.code) {
      const code = dto.code.toUpperCase();
      const conflict = await this.warehouseRepository.existsByCode(code, tenantId, warehouseId);
      if (conflict) throw AppException.conflict(`Warehouse code "${code}" is already taken`);
      warehouse.code = code;
    }

    if (dto.name !== undefined) warehouse.name = dto.name;
    if (dto.address !== undefined) warehouse.address = dto.address ?? null;
    if (dto.city !== undefined) warehouse.city = dto.city ?? null;
    if (dto.country !== undefined) warehouse.country = dto.country ?? null;
    if (dto.timezone !== undefined) warehouse.timezone = dto.timezone;
    if (dto.isActive !== undefined) warehouse.isActive = dto.isActive;
    if (dto.settings !== undefined) warehouse.settings = dto.settings;

    const saved = await this.warehouseRepository.save(warehouse);
    return this.toWarehouseResponse(saved);
  }

  // ── Zone CRUD ───────────────────────────────────────────────────────────────

  async listZones(tenantId: string, warehouseId: string): Promise<ZoneResponseDto[]> {
    await this.requireWarehouse(tenantId, warehouseId);
    const zones = await this.zoneRepository.findAllByWarehouse(warehouseId, tenantId);
    return zones.map(this.toZoneResponse);
  }

  async createZone(
    tenantId: string,
    warehouseId: string,
    dto: CreateZoneDto,
  ): Promise<ZoneResponseDto> {
    await this.requireWarehouse(tenantId, warehouseId);

    const code = dto.code.toUpperCase();
    const exists = await this.zoneRepository.existsByCode(code, warehouseId, tenantId);
    if (exists)
      throw AppException.conflict(`Zone with code "${code}" already exists in this warehouse`);

    const zone = Object.assign(new Zone(), {
      tenantId,
      warehouseId,
      name: dto.name,
      code,
      type: dto.type ?? ZoneType.STORAGE,
      description: dto.description ?? null,
      isActive: true,
    });

    const saved = await this.zoneRepository.save(zone);
    this.logger.log(`Zone "${saved.code}" created in warehouse ${warehouseId}`);
    return this.toZoneResponse(saved);
  }

  // ── Bulk cell creation ──────────────────────────────────────────────────────

  async bulkCreateCells(
    tenantId: string,
    warehouseId: string,
    dto: BulkCreateCellsDto,
  ): Promise<BulkCreateCellsResponseDto> {
    // Verify warehouse ownership
    await this.requireWarehouse(tenantId, warehouseId);

    // Verify zone belongs to this warehouse
    const zone = await this.zoneRepository.findByIdAndWarehouse(dto.zoneId, warehouseId, tenantId);
    if (!zone) throw AppException.notFound('Zone', dto.zoneId);

    // Check for duplicate codes within the request payload
    const requestCodes = dto.cells.map((c) => c.code);
    const uniqueRequestCodes = new Set(requestCodes);
    if (uniqueRequestCodes.size !== requestCodes.length) {
      throw AppException.unprocessable('Duplicate cell codes found in the request payload');
    }

    // Check for duplicate barcodes within the request payload
    const requestBarcodes = dto.cells.map((c) => c.barcode).filter(Boolean) as string[];
    const uniqueBarcodes = new Set(requestBarcodes);
    if (uniqueBarcodes.size !== requestBarcodes.length) {
      throw AppException.unprocessable('Duplicate barcodes found in the request payload');
    }

    const cellDefs: Partial<Cell>[] = dto.cells.map((spec) => ({
      tenantId,
      warehouseId,
      zoneId: dto.zoneId,
      code: spec.code,
      barcode: spec.barcode ?? null,
      aisle: spec.aisle ?? null,
      bay: spec.bay ?? null,
      level: spec.level ?? null,
      position: spec.position ?? null,
      maxWeight: spec.maxWeight ?? null,
      maxVolume: spec.maxVolume ?? null,
      isActive: true,
      isOccupied: false,
    }));

    const created = await this.cellRepository.bulkInsert(cellDefs);

    this.logger.log(
      `Bulk created ${created.length} cells in zone ${dto.zoneId} (warehouse ${warehouseId})`,
    );

    return {
      created: created.length,
      cells: created.map(this.toCellResponse),
    };
  }

  // ── Cell queries ────────────────────────────────────────────────────────────

  async listCellsByZone(
    tenantId: string,
    warehouseId: string,
    zoneId: string,
  ): Promise<CellResponseDto[]> {
    await this.requireWarehouse(tenantId, warehouseId);
    const zone = await this.zoneRepository.findByIdAndWarehouse(zoneId, warehouseId, tenantId);
    if (!zone) throw AppException.notFound('Zone', zoneId);
    const cells = await this.cellRepository.findAllByZone(zoneId, tenantId);
    return cells.map(this.toCellResponse);
  }

  // ── Shared helpers ──────────────────────────────────────────────────────────

  private async requireWarehouse(tenantId: string, warehouseId: string): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findById(warehouseId, tenantId);
    if (!warehouse) throw AppException.notFound('Warehouse', warehouseId);
    return warehouse;
  }

  // ── Mappers ─────────────────────────────────────────────────────────────────

  private toWarehouseResponse(w: Warehouse): WarehouseResponseDto {
    return {
      id: w.id,
      tenantId: w.tenantId,
      name: w.name,
      code: w.code,
      address: w.address,
      city: w.city,
      country: w.country,
      timezone: w.timezone,
      isActive: w.isActive,
      settings: w.settings,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    };
  }

  private toZoneResponse(z: Zone): ZoneResponseDto {
    return {
      id: z.id,
      tenantId: z.tenantId,
      warehouseId: z.warehouseId,
      name: z.name,
      code: z.code,
      type: z.type,
      description: z.description,
      isActive: z.isActive,
      createdAt: z.createdAt,
      updatedAt: z.updatedAt,
    };
  }

  private toCellResponse(c: Cell): CellResponseDto {
    return {
      id: c.id,
      tenantId: c.tenantId,
      warehouseId: c.warehouseId,
      zoneId: c.zoneId,
      code: c.code,
      barcode: c.barcode,
      aisle: c.aisle,
      bay: c.bay,
      level: c.level,
      position: c.position,
      maxWeight: c.maxWeight,
      maxVolume: c.maxVolume,
      isActive: c.isActive,
      isOccupied: c.isOccupied,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
