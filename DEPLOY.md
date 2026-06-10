# Sambid — VPS Deployment Guide

## 1. Server Setup (Ubuntu 22.04 recommended)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx nodejs npm git
sudo npm install -g pm2
```

## 2. Upload Code

```bash
# On VPS
sudo mkdir -p /var/www/sambid
sudo chown $USER:$USER /var/www/sambid
cd /var/www/sambid
git clone <your-repo-url> .
# OR use scp / rsync / FileZilla to upload
```

## 3. Backend Setup

```bash
cd /var/www/sambid/backend
npm install --production
mkdir -p logs

# Create .env file
cp .env.example .env
nano .env   # fill in all values
```

**Required .env variables:**
```
NODE_ENV=production
PORT=8000
MONGO_URI=mongodb+srv://...
JWT_SECRET=<strong-random-string>
FRONTEND_URL=https://yourdomain.com
STRIPE_SECRET_KEY=sk_live_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
GEMINI_API_KEY=...
EMAIL_USER=...
EMAIL_PASS=...
```

## 4. Frontend Build

```bash
cd /var/www/sambid/frontend

# Update .env for production
echo "VITE_API_URL=https://yourdomain.com/api" > .env.production
echo "VITE_SOCKET_URL=https://yourdomain.com" >> .env.production
# Add VITE_STRIPE_PUBLISHABLE_KEY, VITE_PAYPAL_CLIENT_ID, etc.

npm install
npm run build
# Creates: /var/www/sambid/frontend/dist/
```

## 5. Nginx Setup

```bash
# Replace yourdomain.com with your actual domain in nginx.conf first
sudo cp /var/www/sambid/nginx.conf /etc/nginx/sites-available/sambid
sudo ln -s /etc/nginx/sites-available/sambid /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 6. SSL Certificate (Let's Encrypt — FREE)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Auto-renewal is set up automatically
```

## 7. Start Backend with PM2

```bash
cd /var/www/sambid
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

## 8. Replace `yourdomain.com` Placeholders

Before going live, replace `yourdomain.com` in:
- `nginx.conf` — server_name, SSL paths, CSP connect-src, websocket wss://
- `frontend/public/robots.txt` — Sitemap URL
- `frontend/public/sitemap.xml` — all `<loc>` URLs
- `frontend/index.html` — og:url, og:image, canonical
- `backend/.env` — FRONTEND_URL

## 9. Verify

```bash
# Backend health check
curl https://yourdomain.com/health

# Check PM2 status
pm2 status

# Check nginx logs if anything is wrong
sudo tail -f /var/log/nginx/error.log
pm2 logs sambid-api
```

## 10. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Updates / Redeployment

```bash
cd /var/www/sambid
git pull

# Rebuild frontend
cd frontend && npm run build && cd ..

# Reload backend (zero downtime)
pm2 reload ecosystem.config.cjs
```
