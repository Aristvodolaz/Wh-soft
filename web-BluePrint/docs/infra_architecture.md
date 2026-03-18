# Infrastructure Architecture — WMS Platform
**Document:** infra_architecture.md  
**Version:** 1.0  
**Audience:** DevOps, SRE Engineers

---

## 1. Обзор Инфраструктуры

```
Internet
    ↓
Cloudflare (CDN + DDoS Protection + WAF)
    ↓
Load Balancer (AWS ALB / GCP Load Balancer)
    ↓
Kubernetes Cluster (EKS / GKE)
    ↓
┌─────────────────────────────────────────────┐
│  NAMESPACE: wms-prod                        │
│                                             │
│  [API Gateway]  [Frontend]  [WS Gateway]   │
│       ↓               ↓           ↓         │
│  [wms-api ×3]  [next-app ×2] [ws-srv ×2]  │
│  [wms-worker ×2]                            │
│                                             │
│  StatefulSets:                              │
│  [PostgreSQL Primary + Replica]            │
│  [Redis Cluster 3 nodes]                   │
│  [Kafka 3 brokers]                         │
│  [Elasticsearch 3 nodes]                   │
│  [ClickHouse 2 nodes]                      │
└─────────────────────────────────────────────┘
    ↓
Object Storage (S3 / GCS) — media, backups
```

---

## 2. Kubernetes Конфигурация

### 2.1 Namespace структура

```yaml
namespaces:
  wms-prod:       # Production workloads
  wms-staging:    # Staging
  wms-monitoring: # Prometheus, Grafana, Jaeger
  wms-kafka:      # Kafka cluster
  wms-data:       # PostgreSQL, Redis, Elasticsearch, ClickHouse
  cert-manager:   # SSL certificates
  ingress-nginx:  # Ingress controller
```

### 2.2 API Deployment

```yaml
# k8s/base/deployments/wms-api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wms-api
  namespace: wms-prod
spec:
  replicas: 3
  selector:
    matchLabels: { app: wms-api }
  template:
    metadata:
      labels: { app: wms-api }
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
    spec:
      containers:
        - name: wms-api
          image: registry.io/wms-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef: { name: wms-secrets, key: DATABASE_URL }
            - name: REDIS_URL
              valueFrom:
                secretKeyRef: { name: wms-secrets, key: REDIS_URL }
          resources:
            requests: { cpu: "250m", memory: "256Mi" }
            limits:   { cpu: "1000m", memory: "1Gi" }
          livenessProbe:
            httpGet: { path: /health, port: 3000 }
            initialDelaySeconds: 30
          readinessProbe:
            httpGet: { path: /health/ready, port: 3000 }
            initialDelaySeconds: 5
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: wms-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: wms-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
    - type: Resource
      resource:
        name: memory
        target: { type: Utilization, averageUtilization: 80 }
```

### 2.3 PostgreSQL (CloudNativePG)

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: wms-postgres
  namespace: wms-data
spec:
  instances: 2                     # Primary + 1 Replica
  primaryUpdateStrategy: unsupervised
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
      effective_cache_size: "1GB"
      maintenance_work_mem: "128MB"
      checkpoint_completion_target: "0.9"
      wal_buffers: "16MB"
      default_statistics_target: "100"
  storage:
    size: 100Gi
    storageClass: gp3
  backup:
    retentionPolicy: "30d"
    barmanObjectStore:
      destinationPath: s3://wms-backups/postgres
```

---

## 3. CI/CD Pipeline

### 3.1 GitHub Actions

```yaml
# .github/workflows/backend-ci.yml
name: Backend CI

on:
  push:
    branches: [main, develop]
    paths: ['backend/**']
  pull_request:
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_DB: wms_test, POSTGRES_PASSWORD: test }
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
        working-directory: backend
      - run: npm run lint
        working-directory: backend
      - run: npm run type-check
        working-directory: backend
      - run: npm run test:cov
        working-directory: backend
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/wms_test
          REDIS_URL: redis://localhost:6379
      - uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: backend
          push: ${{ github.ref == 'refs/heads/main' }}
          tags: ghcr.io/wmsplatform/api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - run: |
          # Update image tag in kustomize
          cd infra/k8s/overlays/staging
          kustomize edit set image api=ghcr.io/wmsplatform/api:${{ github.sha }}
          git config --global user.email "ci@wmsplatform.io"
          git add . && git commit -m "Deploy api ${{ github.sha }} to staging"
          git push
          # ArgoCD picks up the change automatically

  smoke-test:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - run: |
          sleep 60  # wait for rollout
          curl -f https://staging-api.wmsplatform.io/health || exit 1

  deploy-production:
    needs: smoke-test
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://api.wmsplatform.io
    steps:
      - run: |
          # Manual approval required (GitHub Environment protection rules)
          cd infra/k8s/overlays/production
          kustomize edit set image api=ghcr.io/wmsplatform/api:${{ github.sha }}
          git add . && git commit -m "Deploy api ${{ github.sha }} to production"
          git push
```

### 3.2 ArgoCD Applications

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: wms-api-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/wmsplatform/infra
    targetRevision: main
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: wms-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

---

## 4. Monitoring Stack

### 4.1 Prometheus + Grafana

```yaml
# Метрики которые собираем
metrics:
  api:
    - http_request_duration_seconds (histogram)
    - http_requests_total (counter by status, method, route)
    - active_connections (gauge)
    - error_rate (derived)

  business:
    - wms_orders_created_total
    - wms_inventory_movements_total
    - wms_tasks_completed_total
    - wms_warehouse_occupancy_pct

  infrastructure:
    - pg_connections_total
    - pg_query_duration_seconds
    - redis_commands_total
    - kafka_consumer_lag
```

### 4.2 Grafana Dashboards

| Dashboard | Содержимое |
|-----------|------------|
| API Overview | RPS, Latency p50/p95/p99, Error Rate, 4xx/5xx |
| Business KPIs | Заказы/час, Движения инвентаря, Активные задачи |
| PostgreSQL | Connections, Query Duration, Cache Hit Ratio |
| Kafka | Consumer Lag, Messages/sec, Partition Leaders |
| Node Resources | CPU, Memory, Network, Disk по нодам |

### 4.3 Alerting Rules

```yaml
# alerts.yaml
groups:
  - name: api
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
        for: 2m
        labels: { severity: critical }
        annotations:
          summary: "API error rate > 1% for 2 minutes"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels: { severity: warning }

      - alert: DatabaseConnectionsHigh
        expr: pg_connections_total > 180
        for: 5m
        labels: { severity: warning }

      - alert: KafkaConsumerLagHigh
        expr: kafka_consumer_group_lag > 10000
        for: 5m
        labels: { severity: critical }
```

---

## 5. Logging (ELK Stack)

### 5.1 Структурированные логи

```typescript
// Все логи в JSON формате
logger.info('Inventory moved', {
  event: 'inventory.moved',
  traceId: req.traceId,
  tenantId: req.tenantId,
  userId: req.user.id,
  sku: cmd.sku,
  quantity: cmd.quantity,
  sourceCellId: cmd.sourceCellId,
  targetCellId: cmd.targetCellId,
  durationMs: Date.now() - startTime,
});
```

### 5.2 Log Levels

| Level | Когда |
|-------|-------|
| ERROR | Неожиданные ошибки, 5xx, exception |
| WARN | Бизнес-ошибки, 4xx, retry |
| INFO | Ключевые операции (движения, заказы) |
| DEBUG | Детали запросов (только dev/staging) |

---

## 6. Security

### 6.1 Network Policies

```yaml
# Запрещаем прямой доступ к БД кроме API
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgres-network-policy
  namespace: wms-data
spec:
  podSelector:
    matchLabels: { app: postgres }
  ingress:
    - from:
        - namespaceSelector:
            matchLabels: { name: wms-prod }
        - podSelector:
            matchLabels: { app: wms-api }
      ports:
        - protocol: TCP
          port: 5432
```

### 6.2 Secrets Management

```bash
# HashiCorp Vault для секретов
# Secrets injected as env vars via vault-agent
vault kv put secret/wms-prod/api \
  DATABASE_URL="postgresql://..." \
  JWT_SECRET="..." \
  KAFKA_SASL_PASSWORD="..."
```

### 6.3 SSL/TLS

- Cloudflare обрабатывает внешний TLS
- Внутри кластера — Istio mTLS между сервисами
- cert-manager для Let's Encrypt сертификатов

---

## 7. Disaster Recovery

### 7.1 Backup стратегия

| Компонент | Backup | Retention | RTO | RPO |
|-----------|--------|-----------|-----|-----|
| PostgreSQL | Continuous WAL + daily snapshot | 30 дней | 1 час | 5 минут |
| Redis | RDB snapshot + AOF | 7 дней | 30 минут | 1 минута |
| Kafka | Replication factor 3 | N/A | Авто | 0 |
| Object Storage | Versioning | 90 дней | Мгновенно | 0 |

### 7.2 Runbook: DB Failover

```bash
# PostgreSQL failover (CloudNativePG)
kubectl cnpg promote wms-postgres/wms-postgres-2 -n wms-data
# Cluster автоматически переключается на реплику
# Connection pooler (PgBouncer) обновляет target автоматически
```

---

## 8. Environments

| Среда | URL | Назначение | Auto-deploy |
|-------|-----|------------|-------------|
| Development | localhost | Разработчики, docker-compose | Нет |
| Staging | staging.wmsplatform.io | QA, демо клиентам | main ветка |
| Production | wmsplatform.io | Прод | Manual approval |

### 8.1 docker-compose.yml (Local Dev)

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: wms_dev
      POSTGRES_PASSWORD: devpassword
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    ports: ["9092:9092"]

  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      discovery.type: single-node
      xpack.security.enabled: "false"
    ports: ["9200:9200"]

  api:
    build: ./backend
    ports: ["3000:3000"]
    depends_on: [postgres, redis, kafka]
    environment:
      DATABASE_URL: postgresql://postgres:devpassword@postgres:5432/wms_dev
      REDIS_URL: redis://redis:6379
      KAFKA_BROKERS: kafka:9092
    volumes: [./backend/src:/app/src]  # hot reload

  frontend:
    build: ./frontend
    ports: ["3001:3000"]
    depends_on: [api]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000

volumes:
  postgres_data:
```

---

*Документ: infra_architecture.md | WMS Platform Infrastructure v1.0*
