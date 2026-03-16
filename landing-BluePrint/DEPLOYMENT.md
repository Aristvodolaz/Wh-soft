# Deployment Guide — Склад-Софт Landing

Пошаговое руководство по деплою на Ubuntu-сервер с Nginx + PM2 + SSL.

---

## Требования к серверу

| Параметр | Минимум | Рекомендуется |
|---|---|---|
| OS | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| CPU | 1 vCPU | 2+ vCPU |
| RAM | 512 MB | 1 GB+ |
| Диск | 5 GB | 20 GB SSD |
| Node.js | 18+ | 20 LTS |

---

## 1. Подготовка сервера

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверить версии
node -v    # → v20.x.x
npm -v     # → 10.x.x

# Установить PM2 глобально
sudo npm install -g pm2

# Установить Nginx
sudo apt install -y nginx

# Установить Certbot (Let's Encrypt SSL)
sudo apt install -y certbot python3-certbot-nginx

# Установить Git
sudo apt install -y git
```

---

## 2. Клонирование проекта

```bash
# Создать директорию
sudo mkdir -p /var/www/sklad-soft-landing
sudo chown $USER:$USER /var/www/sklad-soft-landing

# Клонировать репозиторий
cd /var/www/sklad-soft-landing
git clone https://github.com/YOUR_ORG/sklad-soft-landing.git .

# Или загрузить через scp/rsync:
# rsync -avz --exclude node_modules --exclude .next \
#   ./sklad-soft-landing/ user@SERVER_IP:/var/www/sklad-soft-landing/
```

---

## 3. Настройка переменных окружения

```bash
cd /var/www/sklad-soft-landing

# Скопировать шаблон
cp .env.example .env.local

# Отредактировать
nano .env.local
```

Минимальная конфигурация `.env.local`:
```env
NODE_ENV=production
PORT=3000
ADMIN_TOKEN=замените_на_случайную_строку_32_символа
```

Генерация безопасного токена:
```bash
openssl rand -hex 32
```

---

## 4. Сборка и запуск

```bash
cd /var/www/sklad-soft-landing

# Установить зависимости
npm ci

# Создать папку для логов
mkdir -p logs

# Production сборка
npm run build

# Запустить через PM2
pm2 start ecosystem.config.js --env production

# Сохранить конфиг PM2 (автозапуск)
pm2 save

# Настроить автозапуск при перезагрузке сервера
pm2 startup
# → скопировать и выполнить команду, которую выдаст PM2
```

Проверить что работает:
```bash
pm2 status
pm2 logs sklad-soft-landing --lines 50
curl http://localhost:3000
```

---

## 5. Настройка Nginx

```bash
# Создать конфиг сайта
sudo nano /etc/nginx/sites-available/sklad-soft-landing
```

Вставить конфигурацию:
```nginx
server {
    listen 80;
    server_name sklad-soft.ru www.sklad-soft.ru;

    # Логи
    access_log /var/log/nginx/sklad-soft-landing.access.log;
    error_log  /var/log/nginx/sklad-soft-landing.error.log;

    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Проксирование на Next.js
    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Статические файлы Next.js (кэш 1 год)
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Favicon, robots.txt и т.д.
    location ~* \.(ico|txt|xml)$ {
        proxy_pass http://localhost:3000;
        expires 7d;
    }

    client_max_body_size 10M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;
}
```

```bash
# Включить сайт
sudo ln -s /etc/nginx/sites-available/sklad-soft-landing /etc/nginx/sites-enabled/

# Удалить дефолтный сайт (если нужно)
sudo rm -f /etc/nginx/sites-enabled/default

# Проверить конфиг
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 6. SSL — Let's Encrypt

```bash
# Получить сертификат (замените домен)
sudo certbot --nginx -d sklad-soft.ru -d www.sklad-soft.ru

# Certbot автоматически обновит конфиг Nginx под HTTPS

# Проверить автообновление
sudo certbot renew --dry-run

# Добавить задачу cron для автообновления (если не добавлена)
sudo crontab -e
# Добавить строку:
# 0 3 * * * certbot renew --quiet && systemctl reload nginx
```

---

## 7. Управление PM2

```bash
# Статус всех процессов
pm2 status

# Логи в реальном времени
pm2 logs sklad-soft-landing

# Последние 100 строк логов
pm2 logs sklad-soft-landing --lines 100

# Мониторинг CPU/RAM в реальном времени
pm2 monit

# Перезапуск (hard restart)
pm2 restart sklad-soft-landing

# Перезагрузка без даунтайма (zero-downtime reload)
pm2 reload sklad-soft-landing

# Остановить
pm2 stop sklad-soft-landing

# Удалить из PM2
pm2 delete sklad-soft-landing

# Посмотреть детали
pm2 show sklad-soft-landing
```

---

## 8. Обновление кода

### Ручное обновление

```bash
cd /var/www/sklad-soft-landing

# Получить изменения
git pull origin main

# Установить новые зависимости (если появились)
npm ci

# Пересобрать
npm run build

# Перезапустить без даунтайма
pm2 reload ecosystem.config.js --env production

# Сохранить конфиг
pm2 save
```

### Автоматический деплой через PM2 deploy

```bash
# На локальной машине (после настройки ecosystem.config.js)

# Первичная настройка сервера
pm2 deploy ecosystem.config.js production setup

# Деплой
pm2 deploy ecosystem.config.js production

# Деплой конкретного коммита
pm2 deploy ecosystem.config.js production --commit abc1234
```

---

## 9. Просмотр собранных лидов

### JSON через API
```bash
# На сервере
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3000/api/subscribe

# Через домен
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://sklad-soft.ru/api/subscribe
```

### Экспорт в CSV
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  "https://sklad-soft.ru/api/subscribe?format=csv" \
  -o leads-$(date +%Y-%m-%d).csv
```

### Прямой доступ к файлу (на сервере)
```bash
# Просмотр
cat /var/www/sklad-soft-landing/data/emails.json | python3 -m json.tool

# Количество лидов
cat /var/www/sklad-soft-landing/data/emails.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Всего лидов: {len(d)}')"

# Резервная копия
cp /var/www/sklad-soft-landing/data/emails.json ~/emails-backup-$(date +%Y%m%d).json
```

---

## 10. Файрвол

```bash
# Разрешить SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Запретить прямой доступ к Node.js порту извне
sudo ufw deny 3000/tcp

# Включить файрвол
sudo ufw enable
sudo ufw status
```

---

## 11. Мониторинг и алерты

### Встроенный PM2 мониторинг
```bash
pm2 plus   # PM2+ (облачный дашборд, платный)
```

### Простой healthcheck cron
```bash
crontab -e
# Каждые 5 минут проверять доступность
*/5 * * * * curl -sf https://sklad-soft.ru > /dev/null || pm2 restart sklad-soft-landing
```

### Ротация логов PM2
```bash
# Установить pm2-logrotate
pm2 install pm2-logrotate

# Настроить (хранить 30 дней, ротировать ежедневно)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD
pm2 set pm2-logrotate:compress true
```

---

## Переменные экосистемы

В `ecosystem.config.js` → `env_production` задать:

| Переменная | Описание |
|---|---|
| `PORT` | Порт Next.js (по умолч. 3000) |
| `ADMIN_TOKEN` | Токен для API `/api/subscribe` |
| `NODE_ENV` | `production` |

---

## Чеклист перед запуском

- [ ] `ADMIN_TOKEN` задан и не равен `change_me_...`
- [ ] `npm run build` проходит без ошибок
- [ ] `pm2 status` показывает `online`
- [ ] Nginx проксирует на `localhost:3000`
- [ ] SSL-сертификат выпущен
- [ ] `https://sklad-soft.ru` открывается в браузере
- [ ] Форма заявки отправляет данные
- [ ] `GET /api/subscribe` защищён токеном
- [ ] `data/emails.json` создаётся автоматически
- [ ] Файрвол настроен, порт 3000 закрыт снаружи
- [ ] Автозапуск PM2 при перезагрузке (`pm2 startup && pm2 save`)
