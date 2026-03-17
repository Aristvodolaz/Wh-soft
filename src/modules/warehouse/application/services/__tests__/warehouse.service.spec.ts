import { Test, TestingModule } from '@nestjs/testing';
import { AppException } from '../../../../../shared/exceptions/app.exception';
import { Cell } from '../../../domain/entities/cell.entity';
import { Warehouse } from '../../../domain/entities/warehouse.entity';
import { Zone, ZoneType } from '../../../domain/entities/zone.entity';
import { CellRepository } from '../../../infrastructure/repositories/cell.repository';
import { WarehouseRepository } from '../../../infrastructure/repositories/warehouse.repository';
import { ZoneRepository } from '../../../infrastructure/repositories/zone.repository';
import { BulkCreateCellsDto } from '../../dto/bulk-create-cells.dto';
import { CreateWarehouseDto } from '../../dto/create-warehouse.dto';
import { WarehouseService } from '../warehouse.service';

// ── helpers ───────────────────────────────────────────────────────────────────

const TENANT = 'tenant-uuid';
const WH_ID = 'warehouse-uuid';
const ZONE_ID = 'zone-uuid';

const makeWarehouse = (overrides: Partial<Warehouse> = {}): Warehouse =>
  Object.assign(new Warehouse(), {
    id: WH_ID,
    tenantId: TENANT,
    name: 'Main DC',
    code: 'WH-001',
    address: null,
    city: null,
    country: null,
    timezone: 'UTC',
    isActive: true,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

const makeZone = (overrides: Partial<Zone> = {}): Zone =>
  Object.assign(new Zone(), {
    id: ZONE_ID,
    tenantId: TENANT,
    warehouseId: WH_ID,
    name: 'Receiving A',
    code: 'RCV-A',
    type: ZoneType.RECEIVING,
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

// ── suite ─────────────────────────────────────────────────────────────────────

describe('WarehouseService', () => {
  let service: WarehouseService;
  let warehouseRepository: jest.Mocked<WarehouseRepository>;
  let zoneRepository: jest.Mocked<ZoneRepository>;
  let cellRepository: jest.Mocked<CellRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseService,
        {
          provide: WarehouseRepository,
          useValue: {
            findAllByTenant: jest.fn(),
            findById: jest.fn(),
            existsByCode: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ZoneRepository,
          useValue: {
            findAllByWarehouse: jest.fn(),
            findByIdAndWarehouse: jest.fn(),
            existsByCode: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: CellRepository,
          useValue: {
            bulkInsert: jest.fn(),
            findAllByZone: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WarehouseService>(WarehouseService);
    warehouseRepository = module.get(WarehouseRepository);
    zoneRepository = module.get(ZoneRepository);
    cellRepository = module.get(CellRepository);
  });

  // ── listWarehouses ─────────────────────────────────────────────────────────

  describe('listWarehouses', () => {
    it('returns mapped warehouse DTOs', async () => {
      warehouseRepository.findAllByTenant.mockResolvedValueOnce([makeWarehouse()]);
      const result = await service.listWarehouses(TENANT);
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('WH-001');
    });
  });

  // ── createWarehouse ────────────────────────────────────────────────────────

  describe('createWarehouse', () => {
    const dto: CreateWarehouseDto = { name: 'New DC', code: 'WH-002' };

    it('creates and returns the warehouse', async () => {
      warehouseRepository.existsByCode.mockResolvedValueOnce(false);
      warehouseRepository.save.mockResolvedValueOnce(makeWarehouse({ code: 'WH-002' }));

      const result = await service.createWarehouse(TENANT, dto);

      expect(warehouseRepository.existsByCode).toHaveBeenCalledWith('WH-002', TENANT);
      expect(result.code).toBe('WH-002');
    });

    it('throws 409 when code is already taken', async () => {
      warehouseRepository.existsByCode.mockResolvedValueOnce(true);
      await expect(service.createWarehouse(TENANT, dto)).rejects.toThrow(AppException);
    });

    it('uppercases the code before saving', async () => {
      warehouseRepository.existsByCode.mockResolvedValueOnce(false);
      warehouseRepository.save.mockResolvedValueOnce(makeWarehouse({ code: 'WH-003' }));

      await service.createWarehouse(TENANT, { name: 'DC', code: 'wh-003' });

      expect(warehouseRepository.existsByCode).toHaveBeenCalledWith('WH-003', TENANT);
    });
  });

  // ── getWarehouse ───────────────────────────────────────────────────────────

  describe('getWarehouse', () => {
    it('returns the warehouse when found', async () => {
      warehouseRepository.findById.mockResolvedValueOnce(makeWarehouse());
      const result = await service.getWarehouse(TENANT, WH_ID);
      expect(result.id).toBe(WH_ID);
    });

    it('throws 404 when not found', async () => {
      warehouseRepository.findById.mockResolvedValueOnce(null);
      await expect(service.getWarehouse(TENANT, 'ghost-id')).rejects.toThrow(AppException);
    });
  });

  // ── bulkCreateCells ────────────────────────────────────────────────────────

  describe('bulkCreateCells', () => {
    const dto: BulkCreateCellsDto = {
      zoneId: ZONE_ID,
      cells: [
        { code: 'A-01-01', aisle: 'A', bay: '01', level: '01' },
        { code: 'A-01-02', aisle: 'A', bay: '01', level: '02' },
      ],
    };

    it('creates cells and returns count', async () => {
      warehouseRepository.findById.mockResolvedValueOnce(makeWarehouse());
      zoneRepository.findByIdAndWarehouse.mockResolvedValueOnce(makeZone());
      const mockCells = dto.cells.map((c) =>
        Object.assign(new Cell(), { id: 'cell-uuid', code: c.code, tenantId: TENANT }),
      );
      cellRepository.bulkInsert.mockResolvedValueOnce(mockCells);

      const result = await service.bulkCreateCells(TENANT, WH_ID, dto);

      expect(result.created).toBe(2);
      expect(result.cells).toHaveLength(2);
    });

    it('throws 404 when warehouse is not found', async () => {
      warehouseRepository.findById.mockResolvedValueOnce(null);
      await expect(service.bulkCreateCells(TENANT, 'ghost', dto)).rejects.toThrow(AppException);
    });

    it('throws 404 when zone does not belong to the warehouse', async () => {
      warehouseRepository.findById.mockResolvedValueOnce(makeWarehouse());
      zoneRepository.findByIdAndWarehouse.mockResolvedValueOnce(null);
      await expect(service.bulkCreateCells(TENANT, WH_ID, dto)).rejects.toThrow(AppException);
    });

    it('throws 422 on duplicate codes in the request payload', async () => {
      warehouseRepository.findById.mockResolvedValueOnce(makeWarehouse());
      zoneRepository.findByIdAndWarehouse.mockResolvedValueOnce(makeZone());

      const duplicateDto: BulkCreateCellsDto = {
        zoneId: ZONE_ID,
        cells: [{ code: 'A-01-01' }, { code: 'A-01-01' }],
      };

      await expect(service.bulkCreateCells(TENANT, WH_ID, duplicateDto)).rejects.toThrow(
        AppException,
      );
    });
  });
});
