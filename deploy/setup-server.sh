#!/bin/bash
set -e

# ===========================================
# Himchistka VDS Setup Script
# Ubuntu 22.04
# ===========================================

echo "=== 1. System Update ==="
apt update && apt upgrade -y

echo "=== 2. Install Docker ==="
apt install -y ca-certificates curl gnupg lsb-release

mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "=== 3. Install Nginx ==="
apt install -y nginx

echo "=== 4. Configure Firewall (UFW) ==="
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "=== 5. Install Certbot ==="
apt install -y certbot python3-certbot-nginx

echo "=== 6. Create App Directory ==="
mkdir -p /opt/himchistka
mkdir -p /var/www/certbot

echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Clone repository to /opt/himchistka"
echo "2. Copy .env.example to .env and configure"
echo "3. Run: ./deploy/deploy.sh"
