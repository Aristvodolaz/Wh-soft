# WEB UI Guidelines — WMS Platform

---

## Design Tokens

### Colors

```css
/* Primary */
primary-500: #3B82F6  /* CTA buttons, links, active state */
primary-600: #2563EB  /* Hover */
primary-50:  #EFF6FF  /* Active row background */
primary-100: #DBEAFE  /* Selected row background */

/* Semantic */
success-500: #22C55E  /* Completed, in stock */
warning-500: #F59E0B  /* Low stock, pending */
danger-500:  #EF4444  /* Error, cancelled, critical */
info-500:    #06B6D4  /* Info messages */

/* Neutral */
neutral-50:  #F8FAFC  /* Page background */
neutral-100: #F1F5F9  /* Table even rows */
neutral-200: #E2E8F0  /* Borders, dividers */
neutral-500: #64748B  /* Muted text */
neutral-700: #334155  /* Body text */
neutral-900: #0F172A  /* Headings */
```

### Typography

- **Font:** `DM Sans` (UI) + `IBM Plex Mono` (SKU, codes, barcodes)
- Apply `font-mono-sku` class to all SKU and barcode fields

| Class | Size | Weight | Use |
|-------|------|--------|-----|
| `text-xs` | 11px | 400 | Labels, captions |
| `text-sm` | 13px | 400 | Secondary text, table cells |
| `text-base` | 14px | 400 | Body text |
| `text-lg` | 17px | 600 | Card titles |
| `text-xl` | 20px | 600 | Page headers |
| `text-2xl` | 24px | 700 | H2 |
| `text-3xl` | 30px | 700 | H1, KPI values |
| `text-4xl` | 36px | 700 | Dashboard hero metrics |

### Spacing

8px base grid: `space-1=4px`, `space-2=8px`, `space-4=16px`, `space-6=24px`

---

## Component Usage

### Button

```tsx
// Primary CTA
<Button>Создать</Button>

// Danger action
<Button variant="danger">Удалить</Button>

// Loading state
<Button loading={isPending}>Сохранить</Button>

// Icon only
<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>

// Sizes: xs, sm, md (default), lg, xl, icon, icon-sm
```

### Badge (Status)

```tsx
<Badge variant="active">В наличии</Badge>
<Badge variant="pending">Ожидает</Badge>
<Badge variant="in-progress">В работе</Badge>
<Badge variant="completed">Выполнено</Badge>
<Badge variant="cancelled">Отменено</Badge>
<Badge variant="draft">Черновик</Badge>
```

### Card

```tsx
<Card accent="primary">          // Blue top border (3px)
  <CardHeader>Title</CardHeader>
  <CardContent>Body</CardContent>
  <CardFooter>Actions</CardFooter>
</Card>
```

### Table

```tsx
<Table
  columns={[
    { key: 'name', header: 'Название', sortable: true },
    { key: 'status', header: 'Статус', render: (row) => <Badge>...</Badge> },
  ]}
  data={items}
  keyExtractor={(item) => item.id}
  onRowClick={(item) => setSelected(item)}
/>
```

### Modal / Drawer

```tsx
// Confirmation dialog (centered)
<Modal open={open} onClose={() => setOpen(false)} title="Удалить?">
  <div className="p-6">...</div>
</Modal>

// Detail panel (right side, 480px)
<Drawer open={open} onClose={() => setOpen(false)} title="Детали">
  <div className="p-6">...</div>
</Drawer>
```

### Skeleton

```tsx
// Inline
<Skeleton className="h-4 w-32 rounded" />

// Table loading state
<TableSkeleton rows={5} cols={4} />
```

---

## Patterns

### Page header

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold text-neutral-900">Page Title</h1>
    <p className="text-sm text-neutral-500 mt-0.5">Subtitle</p>
  </div>
  <Button><Plus className="h-4 w-4" />Add Item</Button>
</div>
```

### Empty states

Always use `<EmptyState>` instead of plain text for empty lists.

### Loading states

Use skeleton loaders (not spinners) for initial data load inside tables and cards.
Use spinner only for full-page loading or mutation pending state.

### Toast notifications

```typescript
toast.success('Склад создан')    // ✓ green
toast.error('Ошибка сервера')   // ✗ red
```
