import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cell } from '../../domain/entities/cell.entity';

@Injectable()
export class CellRepository {
  constructor(
    @InjectRepository(Cell)
    private readonly repo: Repository<Cell>,
    private readonly dataSource: DataSource,
  ) {}

  async findAllByZone(zoneId: string, tenantId: string): Promise<Cell[]> {
    return this.repo.find({
      where: { zoneId, tenantId },
      order: { aisle: 'ASC', bay: 'ASC', level: 'ASC', code: 'ASC' },
    });
  }

  async findAllByWarehouse(warehouseId: string, tenantId: string): Promise<Cell[]> {
    return this.repo.find({ where: { warehouseId, tenantId } });
  }

  async findById(id: string, tenantId: string): Promise<Cell | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async findByBarcode(barcode: string, tenantId: string): Promise<Cell | null> {
    return this.repo.findOne({ where: { barcode, tenantId } });
  }

  async findByCode(code: string, zoneId: string, tenantId: string): Promise<Cell | null> {
    return this.repo.findOne({ where: { code, zoneId, tenantId } });
  }

  async findAvailable(warehouseId: string, tenantId: string): Promise<Cell[]> {
    return this.repo.find({
      where: { warehouseId, tenantId, isOccupied: false, isActive: true },
      order: { aisle: 'ASC', bay: 'ASC', level: 'ASC' },
    });
  }

  async save(cell: Cell): Promise<Cell> {
    return this.repo.save(cell);
  }

  /**
   * Bulk insert cells in a single transaction.
   * Returns the created cells. Rolls back entirely on any conflict.
   */
  async bulkInsert(cells: Partial<Cell>[]): Promise<Cell[]> {
    const result = await this.dataSource.transaction(async (manager) => {
      const inserted = manager.create(Cell, cells);
      return manager.save(Cell, inserted);
    });
    return result;
  }

  async countByWarehouse(warehouseId: string, tenantId: string): Promise<number> {
    return this.repo.count({ where: { warehouseId, tenantId } });
  }

  async countByZone(zoneId: string, tenantId: string): Promise<number> {
    return this.repo.count({ where: { zoneId, tenantId } });
  }
}
