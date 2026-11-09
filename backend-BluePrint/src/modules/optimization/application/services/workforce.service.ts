import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  CalibratedNorm,
  DayForecast,
  Employee,
  OpenTask,
  PersonalCoefficient,
  TaskObservation,
  calibrateNorms,
  forecastWorkload,
  personalCoefficients,
} from '../../domain/workforce/workload';
import { WorkloadQueryDto } from '../dto/optimization.dto';

export interface WorkloadForecast {
  warehouseId: string;
  generatedAt: string;
  norms: Record<string, CalibratedNorm>;
  coefficients: PersonalCoefficient[];
  days: DayForecast[];
}

@Injectable()
export class WorkforceService {
  constructor(private readonly dataSource: DataSource) {}

  async forecast(tenantId: string, warehouseId: string, q: WorkloadQueryDto = {}): Promise<WorkloadForecast> {
    // History: completed tasks of the last 90 days (calibration + personal coefficients)
    const history: Array<{ assigned_to: string; type: string; quantity: number | null; minutes: string; shift: string }> =
      await this.dataSource.query(
        `
        SELECT assigned_to, type::text AS type, quantity,
               EXTRACT(EPOCH FROM (completed_at - COALESCE(started_at, assigned_at))) / 60.0 AS minutes,
               to_char(completed_at::date, 'YYYY-MM-DD') AS shift
        FROM tasks
        WHERE tenant_id = $1 AND warehouse_id = $2 AND status = 'COMPLETED'
          AND assigned_to IS NOT NULL AND completed_at IS NOT NULL
          AND COALESCE(started_at, assigned_at) IS NOT NULL
          AND completed_at >= NOW() - INTERVAL '90 days'
        `,
        [tenantId, warehouseId],
      );
    const observations: TaskObservation[] = history.map((h) => ({
      userId: h.assigned_to,
      type: h.type,
      quantity: h.quantity,
      durationMin: Number(h.minutes),
      shiftKey: h.shift,
    }));

    const norms = calibrateNorms(observations);
    const coefs = personalCoefficients(observations, norms);

    const open: Array<{ id: string; type: string; quantity: number | null; assigned_to: string | null; due_day: string | null }> =
      await this.dataSource.query(
        `
        SELECT id, type::text AS type, quantity, assigned_to,
               to_char(due_at::date, 'YYYY-MM-DD') AS due_day
        FROM tasks
        WHERE tenant_id = $1 AND warehouse_id = $2 AND status IN ('PENDING','ASSIGNED','IN_PROGRESS')
        `,
        [tenantId, warehouseId],
      );
    const openTasks: OpenTask[] = open.map((o) => ({
      id: o.id, type: o.type, quantity: o.quantity, assignedTo: o.assigned_to, dueDay: o.due_day,
    }));

    const staff: Array<{ id: string; first_name: string; last_name: string }> = await this.dataSource.query(
      `SELECT id, first_name, last_name FROM users
       WHERE tenant_id = $1 AND is_active = true AND role = 'WORKER'`,
      [tenantId],
    );
    const employees: Employee[] = staff.map((s) => ({ userId: s.id, name: `${s.first_name} ${s.last_name}` }));

    const [{ today }] = await this.dataSource.query(`SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS today`);

    return {
      warehouseId,
      generatedAt: new Date().toISOString(),
      norms,
      coefficients: [...coefs.values()],
      days: forecastWorkload({
        tasks: openTasks,
        employees,
        norms,
        coefficients: coefs,
        today,
        params: Object.fromEntries(
          Object.entries({
            shiftMinutes: q.shiftMinutes,
            breakMinutes: q.breakMinutes,
            utilization: q.utilization,
          }).filter(([, v]) => v !== undefined),
        ),
      }),
    };
  }
}
