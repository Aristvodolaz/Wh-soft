import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Product } from '../../domain/entities/product.entity';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  async findAllByTenant(tenantId: string, includeInactive = false): Promise<Product[]> {
    const where = includeInactive ? { tenantId } : { tenantId, isActive: true };
    return this.repo.find({ where, order: { name: 'ASC' } });
  }

  async findById(id: string, tenantId: string): Promise<Product | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async findBySku(sku: string, tenantId: string): Promise<Product | null> {
    return this.repo.findOne({ where: { sku: sku.toUpperCase(), tenantId } });
  }

  async findByBarcode(barcode: string, tenantId: string): Promise<Product | null> {
    return this.repo.findOne({ where: { barcode, tenantId, isActive: true } });
  }

  async search(tenantId: string, term: string): Promise<Product[]> {
    return this.repo.find({
      where: [
        { tenantId, name: ILike(`%${term}%`), isActive: true },
        { tenantId, sku: ILike(`%${term}%`), isActive: true },
      ],
      order: { name: 'ASC' },
      take: 50,
    });
  }

  async save(product: Product): Promise<Product> {
    return this.repo.save(product);
  }

  async existsBySku(sku: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const qb = this.repo.createQueryBuilder('p').where('p.sku = :sku AND p.tenant_id = :tenantId', {
      sku: sku.toUpperCase(),
      tenantId,
    });
    if (excludeId) qb.andWhere('p.id != :excludeId', { excludeId });
    return (await qb.getCount()) > 0;
  }
}
