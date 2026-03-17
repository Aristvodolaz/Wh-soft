# PROJECT CONTEXT — WMS Platform

## Архитектура
- Backend: NestJS (backend-BluePrint)
- Web: Next.js (web-BluePrint)
- Mobile: Android (android-BluePrint)

## ВАЖНО ДЛЯ AI

### Backend
Все API, DTO, бизнес-логика находятся в:
→ /backend-BluePrint

Основные файлы:
- src/modules/*
- src/domain/*
- src/infrastructure/*
- src/config

### Web
Фронтенд находится:
→ /web-BluePrint

Использует:
- REST API backend
- JWT auth
- pagination

## Правила
- ВСЕГДА сначала смотри backend перед написанием frontend
- НЕ придумывай API — используй существующие
- DTO = источник истины

## API base
http://localhost:3030/api