#!/usr/bin/env bash
# Instala o robô na máquina do Google Cloud (Ubuntu 24.04, e2-micro). Rode na pasta deste arquivo: ./instalar.sh
# Pede o token do túnel da Cloudflare; gera a chave da Evolution e a senha do banco.
set -euo pipefail
cd "$(dirname "$0")"

# 2 GB de memória extra no disco: a máquina grátis só tem 1 GB
if [ ! -f /swapfile ]; then
  echo "Criando a memória extra (swap)..."
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-robo.conf >/dev/null && sudo sysctl -p /etc/sysctl.d/99-robo.conf >/dev/null
fi

if ! command -v docker >/dev/null; then
  echo "Instalando o Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

# Docker com IPv6 (a máquina não tem IPv4 público)
if [ ! -f /etc/docker/daemon.json ]; then
  echo '{ "ipv6": true, "ip6tables": true, "fixed-cidr-v6": "fd00:ac:0::/64" }' | sudo tee /etc/docker/daemon.json >/dev/null
  sudo systemctl restart docker
fi

if [ ! -f .env ]; then
  read -rp "Cole o token do túnel da Cloudflare: " TOKEN
  CHAVE=$(openssl rand -hex 32)
  SENHA=$(openssl rand -hex 24)
  cat > .env <<ENV
# gerado por instalar.sh em $(date +%F). Não vai para o GitHub.
TUNNEL_TOKEN=$TOKEN
POSTGRES_PASSWORD=$SENHA
SERVER_URL=https://robo.nossoprojeto3d.com.br
SERVER_PORT=8080
AUTHENTICATION_API_KEY=$CHAVE
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=false
DEL_INSTANCE=false
LOG_LEVEL=ERROR,WARN
LANGUAGE=pt-BR
# sem IPv4 público: tenta IPv6 primeiro
NODE_OPTIONS=--dns-result-order=ipv6first
CONFIG_SESSION_PHONE_CLIENT=Nossos Achadinhos
CONFIG_SESSION_PHONE_NAME=Chrome
QRCODE_LIMIT=30
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:$SENHA@postgres:5432/evolution?schema=evolution_api
DATABASE_CONNECTION_CLIENT_NAME=achadinhos
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=false
DATABASE_SAVE_MESSAGE_UPDATE=false
DATABASE_SAVE_DATA_CONTACTS=false
DATABASE_SAVE_DATA_CHATS=false
DATABASE_SAVE_DATA_LABELS=false
DATABASE_SAVE_DATA_HISTORIC=false
CACHE_REDIS_ENABLED=false
CACHE_LOCAL_ENABLED=true
ENV
  chmod 600 .env
fi

sudo docker compose up -d
echo
echo "Pronto. Guarde a chave abaixo para o Worker (npx wrangler secret put EVO_KEY):"
grep '^AUTHENTICATION_API_KEY=' .env | cut -d= -f2
