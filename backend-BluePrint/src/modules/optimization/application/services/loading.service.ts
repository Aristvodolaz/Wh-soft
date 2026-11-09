import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppException } from '../../../../shared/exceptions/app.exception';
import { CargoItem, PackResult, packVehicle, verifyPlan } from '../../domain/loading/guillotine-packer';
import { LoadingPlanDto } from '../dto/optimization.dto';

const MAX_UNITS = 500;

export interface LoadingPlan extends PackResult {
  /** Order of unloading — what the driver sees along the route. */
  unloadSequence: Array<{ stop: number; boxes: number; weightKg: number }>;
  verification: string[];
}

@Injectable()
export class LoadingService {
  constructor(private readonly dataSource: DataSource) {}

  async plan(tenantId: string, dto: LoadingPlanDto): Promise<LoadingPlan> {
    let cargo: CargoItem[] = (dto.cargo ?? []).map((c) => ({ ...c }));
    if (dto.orders?.length) cargo = cargo.concat(await this.cargoFromOrders(tenantId, dto.orders));
    if (!cargo.length) throw AppException.unprocessable('Provide `cargo` or `orders` with at least one item');
    if (cargo.length > MAX_UNITS) throw AppException.unprocessable(`Too many boxes (${cargo.length} > ${MAX_UNITS})`);

    const res = packVehicle(cargo, dto.vehicle, { timeLimitMs: Math.min(dto.timeLimitMs ?? 5000, 5000) });

    const seq = new Map<number, { boxes: number; weightKg: number }>();
    for (const p of res.placements) {
      const s = seq.get(p.stop) ?? { boxes: 0, weightKg: 0 };
      s.boxes++;
      s.weightKg += p.weightKg;
      seq.set(p.stop, s);
    }
    return {
      ...res,
      unloadSequence: [...seq.entries()].sort((a, b) => a[0] - b[0]).map(([stop, v]) => ({ stop, ...v })),
      verification: verifyPlan(cargo, dto.vehicle, res.placements),
    };
  }

  /** Expand order lines into individual boxes; the route position becomes the delivery stop. */
  private async cargoFromOrders(
    tenantId: string,
    orders: Array<{ orderId: string; stop: number }>,
  ): Promise<CargoItem[]> {
    const ids = orders.map((o) => o.orderId);
    const stopByOrder = new Map(orders.map((o) => [o.orderId, o.stop]));

    const rows: Array<{
      order_id: string;
      order_number: string;
      sku: string;
      qty: number;
      weight: string | null;
      volume: string | null;
      attributes: Record<string, unknown> | null;
    }> = await this.dataSource.query(
      `
      SELECT oi.order_id, o.order_number, p.sku, oi.requested_quantity AS qty,
             p.weight, p.volume, p.attributes
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE oi.tenant_id = $1 AND oi.order_id = ANY($2::uuid[])
      `,
      [tenantId, ids],
    );
    if (!rows.length) throw AppException.notFound('Order items for the given orders');

    const missing: string[] = [];
    const items: CargoItem[] = [];
    for (const r of rows) {
      const dims = this.dimensionsOf(r.attributes, r.volume);
      if (!dims || r.weight == null) {
        missing.push(r.sku);
        continue;
      }
      for (let i = 0; i < r.qty; i++) {
        items.push({
          id: `${r.order_number}:${r.sku}:${i + 1}`,
          label: `${r.sku} (${r.order_number})`,
          ...dims,
          weightKg: Number(r.weight),
          stop: stopByOrder.get(r.order_id)!,
          fragile: r.attributes?.fragile === true,
          thisSideUp: r.attributes?.thisSideUp === true,
        });
        if (items.length > MAX_UNITS) throw AppException.unprocessable(`Too many boxes (> ${MAX_UNITS})`);
      }
    }
    if (missing.length) {
      throw AppException.unprocessable(
        'Products without weight or dimensions cannot be loaded',
        { skus: [...new Set(missing)] },
      );
    }
    return items;
  }

  /** attributes.dimensions {length,width,height} in cm; else a cube derived from volume (m³). */
  private dimensionsOf(
    attributes: Record<string, unknown> | null,
    volume: string | null,
  ): { l: number; w: number; h: number } | null {
    const d = attributes?.dimensions as { length?: number; width?: number; height?: number } | undefined;
    if (d?.length && d.width && d.height) return { l: Number(d.length), w: Number(d.width), h: Number(d.height) };
    if (volume != null && Number(volume) > 0) {
      const side = Math.cbrt(Number(volume) * 1e6);
      return { l: side, w: side, h: side };
    }
    return null;
  }
}
