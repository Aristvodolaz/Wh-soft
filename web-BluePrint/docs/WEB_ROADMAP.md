# WEB Roadmap — WMS Platform Frontend

---

## Stage 1 — Setup + Architecture + Base Pages ✅

**Goal:** Fully bootstrapped project, all routes navigable, API layer connected

- [x] Next.js 14 App Router setup
- [x] TypeScript strict config
- [x] Tailwind with design tokens (DM Sans, IBM Plex Mono, 8px grid, custom colors)
- [x] Shared UI library (Button, Input, Select, Table, Badge, Card, Modal, Drawer, Skeleton, Pagination)
- [x] Entity types mirroring backend DTOs
- [x] Axios API client with JWT interceptors + refresh flow
- [x] Zustand auth store (persisted, JWT decode)
- [x] Login page with form validation
- [x] Route guard for authenticated routes
- [x] App layout: Sidebar (collapsible) + Topbar
- [x] TanStack Query hooks for all 6 modules
- [x] Pages: Dashboard, Warehouses, Products, Inventory, Orders, Tasks, Analytics

---

## Stage 2 — Full Backend Integration

**Goal:** All CRUD operations fully wired, real-time data

- [ ] Warehouse → zone management UI (add/edit zones)
- [ ] Warehouse → cell management (bulk create cells, visual grid)
- [ ] Inventory → barcode scan integration
- [ ] Inventory → stock movement dialog (TRANSFER/RECEIVE/DISPATCH)
- [ ] Orders → add/remove items inline
- [ ] Tasks → assign worker from employee list
- [ ] Tasks → auto-assign feature
- [ ] Real-time WebSocket (task.completed events)
- [ ] Dashboard → auto-refresh with WebSocket fallback
- [ ] Employees module (list, KPI, shifts)
- [ ] Pagination + server-side filtering where supported

---

## Stage 3 — Business Logic + Advanced UX

**Goal:** Complete warehouse operations coverage

- [ ] Receiving flow (mobile-style wizard on desktop)
- [ ] Picking flow (route optimization display)
- [ ] Shipping flow (packing + label print)
- [ ] Inventory audit interface
- [ ] Barcode scanner input field (hardware scanner support)
- [ ] Integrations page (WB/Ozon/1С webhook config)
- [ ] Bulk import (Excel → products)
- [ ] QR code generation for cells
- [ ] Print layouts (waybill, cell labels)

---

## Stage 4 — UX + Analytics Polish

**Goal:** Production-quality experience

- [ ] Warehouse heat-map visualization (SVG/D3)
- [ ] Advanced analytics (time-series charts, ABC analysis)
- [ ] Employee KPI dashboard
- [ ] Dark mode
- [ ] Toast notifications for real-time events
- [ ] Offline indicator
- [ ] Keyboard shortcuts (⌘K global search)
- [ ] Responsive breakpoints for tablet
- [ ] E2E tests (Playwright)
