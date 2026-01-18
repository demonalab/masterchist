# Production Deploy Guide

## Требования

- Ubuntu 22.04 LTS
- VDS минимум 2GB RAM, 2 CPU
- Домен мастерчист.рф (xn--80ahdblodqf4k.xn--p1ai) направлен на IP сервера

## 1. Подготовка сервера

```bash
# Подключение к серверу
ssh root@YOUR_SERVER_IP

# Скачать и запустить setup скрипт
curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/main/deploy/setup-server.sh | bash
```

Или вручную:

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Docker
apt install -y ca-certificates curl gnupg lsb-release
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Установка Nginx
apt install -y nginx

# Настройка Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Установка Certbot
apt install -y certbot python3-certbot-nginx
```

## 2. Клонирование репозитория

```bash
cd /opt
git clone https://github.com/YOUR_REPO/himchistka.git
cd himchistka
```

## 3. Настройка переменных окружения

```bash
cp .env.example .env
nano .env
```

Заполнить:
- `POSTGRES_PASSWORD` — безопасный пароль для БД
- `BOT_TOKEN` — токен Telegram бота от @BotFather
- `ADMIN_TELEGRAM_ID` — ваш Telegram ID
- `WEBHOOK_DOMAIN=xn--80ahdblodqf4k.xn--p1ai`

## 4. Получение SSL сертификата

```bash
# Временный nginx конфиг для certbot
cat > /etc/nginx/sites-available/himchistka << 'EOF'
server {
    listen 80;
    server_name xn--80ahdblodqf4k.xn--p1ai;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 'OK';
    }
}
EOF

ln -sf /etc/nginx/sites-available/himchistka /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
mkdir -p /var/www/certbot
nginx -t && systemctl reload nginx

# Получение сертификата
certbot certonly --webroot -w /var/www/certbot -d xn--80ahdblodqf4k.xn--p1ai --non-interactive --agree-tos -m your@email.com
```

## 5. Деплой приложения

```bash
cd /opt/himchistka

# Сборка и запуск контейнеров
docker compose build
docker compose up -d

# Проверка статуса
docker compose ps

# Миграции БД
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

## 6. Настройка Nginx (production)

```bash
cp deploy/nginx.conf /etc/nginx/sites-available/himchistka
nginx -t && systemctl reload nginx
```

## 7. Настройка Telegram Webhook

```bash
source .env
curl "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=https://xn--80ahdblodqf4k.xn--p1ai/bot/webhook"

# Проверка
curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
```

## 8. Настройка Mini App в BotFather

1. Открыть @BotFather
2. `/mybots` → выбрать бота → Bot Settings → Menu Button
3. Configure menu button → URL: `https://xn--80ahdblodqf4k.xn--p1ai`
4. Или через /setmenubutton

## Полезные команды

```bash
# Логи
docker compose logs -f
docker compose logs -f api
docker compose logs -f bot
docker compose logs -f web

# Перезапуск
docker compose restart

# Остановка
docker compose down

# Обновление
git pull
docker compose build --no-cache
docker compose up -d

# Очистка
docker system prune -af
```

## Автообновление SSL

Certbot автоматически настраивает cron для обновления. Проверить:

```bash
certbot renew --dry-run
```

## Мониторинг

```bash
# Проверка health
curl https://xn--80ahdblodqf4k.xn--p1ai/health
curl https://xn--80ahdblodqf4k.xn--p1ai/health/ready

# Статус контейнеров
docker compose ps

# Использование ресурсов
docker stats
```
