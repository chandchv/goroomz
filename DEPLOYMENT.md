# GoRoomz — AWS Deployment Guide

## Architecture

```
AWS Server
├── Backend API        (Node.js, port 5000)
├── Website            (Vite static build, served by Nginx)
└── Internal Management (React Router build, served by Nginx or Node)
```

## Prerequisites on AWS Server

- Node.js 18+ (`curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs`)
- PostgreSQL 14+ (`sudo apt install postgresql postgresql-contrib`)
- Nginx (`sudo apt install nginx`)
- PM2 for process management (`sudo npm install -g pm2`)

---

## Step 1: Database Setup

```bash
sudo -u postgres psql
CREATE DATABASE goroomz;
CREATE USER goroomz_user WITH ENCRYPTED PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE goroomz TO goroomz_user;
\q
```

---

## Step 2: Backend Deployment

```bash
cd /var/www/goroomz/backend
npm install --production

# Copy .env.production to .env and edit with real values
cp .env.production .env
nano .env   # Update DB_PASSWORD, JWT_SECRET, FRONTEND_URL, etc.

# Start with PM2
pm2 start server.js --name goroomz-api
pm2 save
pm2 startup   # Follow the printed command to enable auto-start
```

**Critical .env values to change:**
- `DB_PASSWORD` — your PostgreSQL password
- `JWT_SECRET` — generate with `openssl rand -hex 64`
- `FRONTEND_URL` / `FRONTEND_URLS` — your domain or server IP
- `NODE_ENV=production`

---

## Step 3: Website Build & Deploy

On your local machine (or on the server):

```bash
cd /var/www/goroomz/website

# Copy production env and edit
cp .env.production .env.production.local
nano .env.production.local   # Set VITE_API_URL to your backend URL

# Build
npm install
npm run build   # Output goes to dist/
```

The `dist/` folder contains static files. Serve with Nginx.

---

## Step 4: Internal Management Build & Deploy

```bash
cd /var/www/goroomz/internal-management

# Copy production env and edit
cp .env.production .env.production.local
nano .env.production.local   # Set VITE_API_URL

# Build
npm install
npm run build   # Output goes to build/
```

---

## Step 5: Nginx Configuration

```nginx
# /etc/nginx/sites-available/goroomz

# Main website
server {
    listen 80;
    server_name goroomz.in www.goroomz.in;

    root /var/www/goroomz/website/dist;
    index index.html;

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve uploaded files
    location /uploads/ {
        alias /var/www/goroomz/backend/uploads/;
    }
}

# Internal management app
server {
    listen 80;
    server_name admin.goroomz.in;

    root /var/www/goroomz/internal-management/build/client;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/goroomz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 6: SSL with Let's Encrypt (recommended)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d goroomz.in -d www.goroomz.in -d admin.goroomz.in
```

After SSL, update:
- Backend `.env`: Change `FRONTEND_URL` to `https://goroomz.in`
- Restart backend: `pm2 restart goroomz-api`

---

## If Using IP Instead of Domain

Replace domain references with your AWS public IP:
- Backend `FRONTEND_URLS`: `http://YOUR_IP:3000,http://YOUR_IP:4000`
- Website `VITE_API_URL`: `http://YOUR_IP:5000/api`
- Internal `VITE_API_URL`: `http://YOUR_IP:5000/api`
- Nginx: Use `server_name YOUR_IP;` and different ports (3000, 4000)

---

## Quick Checklist Before Deploy

- [ ] Backend `.env`: `NODE_ENV=production`
- [ ] Backend `.env`: Strong `JWT_SECRET` (not the dev one)
- [ ] Backend `.env`: Real `DB_PASSWORD`
- [ ] Backend `.env`: `FRONTEND_URL` / `FRONTEND_URLS` match your domain/IP
- [ ] Website `.env.production`: `VITE_API_URL` points to backend
- [ ] Website `.env.production`: `VITE_DEV_MODE=false`
- [ ] Internal `.env.production`: `VITE_API_URL` points to backend
- [ ] Database created and accessible
- [ ] Run `node scripts/seedData.js` and `node scripts/seedProperties.js` after DB setup
- [ ] Nginx configured with SPA fallback
- [ ] PM2 running backend
- [ ] SSL certificate installed (if using domain)
