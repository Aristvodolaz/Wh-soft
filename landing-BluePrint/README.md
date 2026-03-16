# Склад-Софт — Landing Page

Продающий лендинг для облачной системы управления складом **Склад-Софт**.
Собирает заявки на демо и сохраняет контакты в локальный JSON-файл.

## Стек

| Слой | Технология |
|---|---|
| Framework | Next.js 14 (App Router) |
| Стили | Tailwind CSS 3 |
| Иконки | Lucide React |
| Шрифты | Exo 2 + Manrope (Google Fonts, Cyrillic) |
| Deploy | PM2 cluster mode |
| Хранение лидов | `data/emails.json` (файловая система) |

---

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Скопировать переменные окружения
cp .env.example .env.local
# Отредактировать .env.local — задать ADMIN_TOKEN

# 3. Режим разработки
npm run dev
# → http://localhost:3000

# 4. Production сборка
npm run build
npm start
```

---

## Структура проекта

```
sklad-soft-landing/
├── app/
│   ├── layout.tsx              ← SEO-мета, шрифты, <html>
│   ├── page.tsx                ← Весь лендинг (13 секций)
│   ├── globals.css             ← Анимации, glassmorphism, утилиты
│   └── api/
│       └── subscribe/
│           └── route.ts        ← POST /api/subscribe (сбор лидов)
│                                  GET  /api/subscribe (просмотр, защищён)
├── data/
│   └── emails.json             ← База лидов (создаётся автоматически)
├── logs/                       ← PM2 логи (создаётся автоматически)
├── .env.example                ← Шаблон переменных окружения
├── .env.local                  ← Ваши переменные (не в git)
├── ecosystem.config.js         ← PM2 конфиг
├── tailwind.config.ts
├── next.config.mjs
└── tsconfig.json
```

---

## Секции лендинга

| # | Секция | Описание |
|---|---|---|
| 1 | **Navbar** | Sticky, blur-backdrop, мобильное меню |
| 2 | **Hero** | Живой dashboard-мокап, анимации, 2 CTA |
| 3 | **Problem** | 3 pain-карточки + анимированные счётчики |
| 4 | **Features** | 6 glassmorphism-карточек функций |
| 5 | **How it Works** | 4 шага с timeline-коннектором |
| 6 | **Innovation** | AI-блок с 6 картами и 5 innovation-pills |
| 7 | **Use Cases** | 4 сценария использования |
| 8 | **Integrations** | 8 логотипов маркетплейсов и ERP |
| 9 | **Pricing** | 4 тарифа, Growth — "Популярный" |
| 10 | **Testimonials** | 3 отзыва клиентов |
| 11 | **FAQ** | 6 аккордеон-вопросов |
| 12 | **CTA** | Форма захвата лидов (4 поля) |
| 13 | **Footer** | 4 колонки + legal |

---

## API сбора лидов

### POST `/api/subscribe`

Сохраняет заявку на демо в `data/emails.json`.

**Request body:**
```json
{
  "email": "ivan@company.ru",     // обязательно
  "name": "Иван Петров",          // опционально
  "phone": "+7 999 123-45-67",    // опционально
  "company": "ООО Склад+",        // опционально
  "source": "cta"                  // опционально
}
```

**Responses:**
```
201  { message: "Заявка принята!", total: 42 }
200  { message: "...", duplicate: true }       ← email уже есть
400  { error: "Некорректный email адрес" }
500  { error: "Внутренняя ошибка сервера" }
```

---

### GET `/api/subscribe` (защищённый)

Просмотр и экспорт собранных лидов.

**Headers:** `Authorization: Bearer <ADMIN_TOKEN>`

```bash
# Просмотр JSON
curl -H "Authorization: Bearer your_token" https://yourdomain.ru/api/subscribe

# Экспорт CSV
curl -H "Authorization: Bearer your_token" \
  "https://yourdomain.ru/api/subscribe?format=csv" \
  -o leads.csv
```

**CSV-формат:**
```
id,email,name,phone,company,source,date,ip
```

---

## Переменные окружения

| Переменная | Обязательна | Описание |
|---|---|---|
| `ADMIN_TOKEN` | **Да** | Токен для доступа к GET /api/subscribe |
| `PORT` | Нет | Порт сервера (по умолчанию 3000) |

Создать `.env.local`:
```bash
cp .env.example .env.local
```

---

## PM2 Deploy

Подробная инструкция — см. [DEPLOYMENT.md](./DEPLOYMENT.md).

```bash
# Запуск в production
npm run build
pm2 start ecosystem.config.js --env production

# Обновление без даунтайма
pm2 reload ecosystem.config.js --env production

# Мониторинг
pm2 monit

# Логи
pm2 logs sklad-soft-landing
```

---

## SEO

Мета-теги настроены в `app/layout.tsx`:
- `title`, `description`, `keywords`
- Open Graph (`og:title`, `og:description`, `og:type`)
- `robots: index, follow`

Для улучшения SEO добавьте в `layout.tsx`:
```tsx
metadataBase: new URL("https://sklad-soft.ru"),
```

---

## Лицензия

Проприетарный код. Все права защищены © 2025 Склад-Софт.
