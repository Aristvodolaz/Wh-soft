import { Injectable } from '@nestjs/common';

type Labels = Record<string, string>;

interface CounterEntry {
  kind: 'counter';
  help: string;
  values: Map<string, number>;
}

interface GaugeEntry {
  kind: 'gauge';
  help: string;
  values: Map<string, number>;
}

type MetricEntry = CounterEntry | GaugeEntry;

/**
 * Lightweight in-process Prometheus-compatible metrics registry.
 *
 * Does NOT require any external library.  Produces standard Prometheus
 * text-format output for scraping by a Prometheus/VictoriaMetrics agent.
 *
 * Usage:
 *   metricsService.increment('http_requests_total', { method: 'GET', status: '200' });
 *   metricsService.set('active_connections', {}, 42);
 */
@Injectable()
export class MetricsService {
  private readonly registry = new Map<string, MetricEntry>();

  // ── Registration ──────────────────────────────────────────────────────────────

  registerCounter(name: string, help: string): void {
    if (!this.registry.has(name)) {
      this.registry.set(name, { kind: 'counter', help, values: new Map() });
    }
  }

  registerGauge(name: string, help: string): void {
    if (!this.registry.has(name)) {
      this.registry.set(name, { kind: 'gauge', help, values: new Map() });
    }
  }

  // ── Mutation ──────────────────────────────────────────────────────────────────

  increment(name: string, labels: Labels = {}, amount = 1): void {
    const entry = this.getOrCreate(name, 'counter');
    const key = this.labelKey(labels);
    entry.values.set(key, (entry.values.get(key) ?? 0) + amount);
  }

  set(name: string, labels: Labels = {}, value: number): void {
    const entry = this.getOrCreate(name, 'gauge');
    entry.values.set(this.labelKey(labels), value);
  }

  decrement(name: string, labels: Labels = {}, amount = 1): void {
    const entry = this.getOrCreate(name, 'gauge');
    const key = this.labelKey(labels);
    entry.values.set(key, (entry.values.get(key) ?? 0) - amount);
  }

  // ── Serialisation ─────────────────────────────────────────────────────────────

  /** Render Prometheus text exposition format */
  renderText(): string {
    const lines: string[] = [];

    for (const [name, entry] of this.registry.entries()) {
      lines.push(`# HELP ${name} ${entry.help}`);
      lines.push(`# TYPE ${name} ${entry.kind}`);

      for (const [labelKey, value] of entry.values.entries()) {
        const labelStr = labelKey ? `{${labelKey}}` : '';
        lines.push(`${name}${labelStr} ${value}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private getOrCreate(name: string, kind: 'counter' | 'gauge'): MetricEntry {
    if (!this.registry.has(name)) {
      this.registry.set(name, { kind, help: name, values: new Map() });
    }
    return this.registry.get(name)!;
  }

  private labelKey(labels: Labels): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }
}
