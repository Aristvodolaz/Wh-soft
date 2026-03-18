# 🏭 WMS Platform — BluePrint
**Next-Generation SaaS Warehouse Management System**

[![NestJS](https://img.shields.io/badge/Backend-NestJS%2010-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Web-Next.js%2014-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Android](https://img.shields.io/badge/Mobile-Android%20Kotlin-3DDC84?logo=android&logoColor=white)](https://developer.android.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Cache-Redis-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/DevOps-Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

---

## 🚀 Обзор проекта / Project Overview

**BluePrint WMS** — это высокопроизводительная SaaS-платформа для управления складской логистикой в реальном времени. Система разработана для обеспечения максимальной масштабируемости, надежности и удобства работы как менеджеров, так и складских рабочих.

### Основные компоненты:
*   **🌐 [Web-BluePrint](./web-BluePrint)** — Панель управления (Admin Dashboard) для глубокой аналитики и управления стоками.
*   **🛬 [Landing-BluePrint](./landing-BluePrint)** — Современный маркетинговый сайт для привлечения клиентов.
*   **⚙️ [Backend-BluePrint](./backend-BluePrint)** — Мощное API на NestJS с поддержкой мультитенантности и высокой нагрузки.
*   **📱 [Android-BluePrint](./android-BluePrint)** — Мобильное приложение для ТСД (терминалов сбора данных) и смартфонов.

---

## 🏗 Архитектура системы / System Architecture

Проект организован как монорепозиторий (Monorepo), объединяющий все уровни приложения:

```text
D:\BluePrint\
├── ⚙️ backend-BluePrint/    # NestJS API, PostgreSQL, Redis, K8s
├── 🌐 web-BluePrint/        # Next.js App (Admin Panel)
├── 🛬 landing-BluePrint/    # Next.js Landing Page
├── 📱 android-BluePrint/    # Kotlin / Jetpack Compose App
└── 📜 README.md             # Этот файл
```

### Технологический стек:
| Слой | Технологии |
| :--- | :--- |
| **Backend** | NestJS, TypeORM, PostgreSQL, Redis, JWT, Swagger |
| **Frontend** | Next.js 14, Tailwind CSS, TypeScript |
| **Mobile** | Kotlin, Jetpack Compose, Retrofit |
| **Infrastructure** | Docker, Kubernetes, GitHub Actions |

---

## ⚙️ Быстрый запуск / Quick Start

### 1. Подготовка окружения
Убедитесь, что у вас установлены **Node.js 20+** и **Docker**.

### 2. Запуск Backend
```bash
cd backend-BluePrint
cp .env.example .env  # Настройте переменные окружения
docker-compose up -d  # Запуск БД и Redis
npm install
npm run start:dev
```
📖 **Swagger API Docs:** [http://localhost:3030/docs](http://localhost:3030/docs) (с описанием на русском языке!)

### 3. Запуск Landing / Web
```bash
cd landing-BluePrint # или web-BluePrint
npm install
npm run dev
```

---

## ✨ Ключевые возможности / Key Features

-   **Multi-tenancy:** Полная изоляция данных организаций на уровне БД.
-   **Real-time Analytics:** Дашборды с KPI по заказам, остаткам и эффективности сотрудников.
-   **Advanced Inventory:** Поддержка зон, ячеек, партионного учета и серийных номеров.
-   **Mobile Ready:** Оптимизированный интерфейс для сканеров штрихкодов.
-   **Security:** Ролевая модель доступа (RBAC), защита от перегрузок (Rate Limiting).

---

## 🛠 Последние исправления / Recent Updates
-   ✅ Исправлена кольцевая зависимость (Circular Dependency) в модуле Redis.
-   ✅ Добавлена полная локализация Swagger UI (описания методов на русском языке).
-   ✅ Исправлена инициализация зависимостей EventBus в модулях склада и заказов.

---

## 📄 Лицензия / License
Данный проект распространяется под лицензией [MIT](./LICENSE).
