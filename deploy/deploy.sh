#!/bin/bash
set -e

# ===========================================
# Himchistka Deploy Script
# ===========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOMAIN="xn--80ahdblodqf4k.xn--p1ai"

cd "$PROJECT_DIR"

echo "=== 1. Pull Latest Code ==="
git pull origin main

echo "=== 2. Build and Start Containers ==="
docker compose down --remove-orphans || true
docker compose build --no-cache
docker compose up -d

echo "=== 3. Wait for API to be ready ==="
echo "Waiting for API health check..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "API is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

echo "=== 4. Run Database Migrations ==="
docker compose exec -T api npx prisma migrate deploy

echo "=== 5. Seed Database (if empty) ==="
docker compose exec -T api npx prisma db seed || echo "Seed skipped or already done"

echo "=== 6. Configure Nginx ==="
cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/sites-available/himchistka
ln -sf /etc/nginx/sites-available/himchistka /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

echo "=== 7. Setup SSL (if not exists) ==="
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "Obtaining SSL certificate..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@example.com
else
    echo "SSL certificate already exists"
fi

echo "=== 8. Set Telegram Webhook ==="
source .env
WEBHOOK_URL="https://$DOMAIN/bot/webhook"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}"
echo ""

echo "=== Deploy Complete ==="
echo ""
echo "Services:"
echo "  - Web:  https://$DOMAIN"
echo "  - API:  https://$DOMAIN/api"
echo "  - Bot:  Webhook mode"
echo ""
echo "Check status: docker compose ps"
echo "Check logs:   docker compose logs -f"
