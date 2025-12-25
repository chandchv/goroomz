# 🚀 GoRoomz Production Deployment Guide

This guide will help you deploy GoRoomz to your Ubuntu production server.

## 📋 Prerequisites

- Ubuntu 20.04+ server with SSH access
- Node.js 18+ installed
- PostgreSQL 13+ installed
- Nginx installed
- PM2 installed globally (`npm install -g pm2`)
- Domain name pointing to your server IP (optional but recommended)

## 🔐 Server Setup

### 1. Connect to Your Server

```bash
ssh -i "C:\Coding\AWS-Project-Rx\goroomz\GoRoomz-ap-south-1.ppk" -L 5433:localhost:5432 ubuntu@13.202.196.225
```

### 2. Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx
sudo apt install nginx -y

# Install PM2 globally
sudo npm install -g pm2

# Install Git (if not already installed)
sudo apt install git -y
```

### 3. Setup PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE goroomz;
CREATE USER goroomz_user WITH PASSWORD 'your_secure_password_here';
ALTER ROLE goroomz_user SET client_encoding TO 'utf8';
ALTER ROLE goroomz_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE goroomz_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE goroomz TO goroomz_user;
\q
```

## 📦 Project Deployment

### Option 1: Deploy via Git (Recommended)

```bash
# Create application directory
sudo mkdir -p /var/www/goroomz
sudo chown -R $USER:$USER /var/www/goroomz
cd /var/www/goroomz

# Clone your repository (if using Git)
git clone <your-repo-url> .

# OR if you already have the code, copy it via SCP from your local machine
```

### Option 2: Copy Files via SCP

**From your Windows machine:**

```powershell
# Copy entire project (excluding node_modules)
scp -i "C:\Coding\AWS-Project-Rx\goroomz\GoRoomz-ap-south-1.ppk" -r ^
  --exclude="node_modules" ^
  --exclude=".git" ^
  --exclude="*.log" ^
  "C:\Coding\goroomz\goroomz\*" ^
  ubuntu@13.202.196.225:/var/www/goroomz/
```

**Or use rsync (if available on Windows):**

```bash
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '*.log' \
  -e "ssh -i C:\Coding\AWS-Project-Rx\goroomz\GoRoomz-ap-south-1.ppk" \
  C:\Coding\goroomz\goroomz\ ubuntu@13.202.196.225:/var/www/goroomz/
```

### 4. Install Dependencies

```bash
cd /var/www/goroomz

# Install frontend dependencies
npm install --production=false

# Install backend dependencies
cd backend
npm install --production
cd ..
```

### 5. Configure Environment Variables

```bash
# Backend environment
cd /var/www/goroomz/backend
cp env.example .env
nano .env  # Edit with your production values
```

**Backend `.env` file:**
```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=goroomz
DB_USER=goroomz_user
DB_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://goroomz_user:your_secure_password_here@localhost:5432/goroomz

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Cloudinary Configuration (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL (your domain)
FRONTEND_URL=https://goroomz.in
FRONTEND_URLS=https://goroomz.in,https://www.goroomz.in

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Firebase Admin (if using Firebase)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
```

```bash
# Frontend environment
cd /var/www/goroomz
cp .env.production.example .env.production
nano .env.production  # Edit with your production API URL
```

**Frontend `.env.production` file:**
```env
VITE_API_URL=https://api.goroomz.in/api
# OR if using same domain:
# VITE_API_URL=https://goroomz.in/api

VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

### 6. Build Frontend

```bash
cd /var/www/goroomz
npm run build
```

This creates a `dist` folder with production-ready static files.

### 7. Initialize Database

```bash
cd /var/www/goroomz/backend
npm run setup
npm run seed  # Optional: seed initial data
```

### 8. Setup PM2 Process Manager

```bash
cd /var/www/goroomz
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the instructions to enable PM2 on system boot
```

## 🌐 Nginx Configuration

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/goroomz
```

**Configuration for same domain (goroomz.in):**
```nginx
# Upstream backend
upstream goroomz_backend {
    server localhost:5000;
    keepalive 64;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name goroomz.in www.goroomz.in;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name goroomz.in www.goroomz.in;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/goroomz.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/goroomz.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend static files
    root /var/www/goroomz/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # API proxy
    location /api {
        proxy_pass http://goroomz_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Frontend routes (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Configuration for separate API subdomain (api.goroomz.in):**
```nginx
# API server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.goroomz.in;

    ssl_certificate /etc/letsencrypt/live/api.goroomz.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.goroomz.in/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name goroomz.in www.goroomz.in;

    ssl_certificate /etc/letsencrypt/live/goroomz.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/goroomz.in/privkey.pem;

    root /var/www/goroomz/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 2. Enable Site and Test

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/goroomz /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 3. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d goroomz.in -d www.goroomz.in

# Auto-renewal (already set up by certbot)
sudo certbot renew --dry-run
```

## 🔄 Deployment Workflow

### Initial Deployment

1. Copy files to server
2. Install dependencies
3. Configure environment variables
4. Build frontend
5. Initialize database
6. Start PM2
7. Configure Nginx
8. Setup SSL

### Updates/Re-deployment

```bash
cd /var/www/goroomz

# Pull latest changes (if using Git)
git pull origin main

# OR copy new files via SCP

# Install/update dependencies
npm install
cd backend && npm install && cd ..

# Rebuild frontend
npm run build

# Restart backend
pm2 restart goroomz-backend

# Reload Nginx (if config changed)
sudo nginx -t && sudo systemctl reload nginx
```

## 📊 Monitoring & Maintenance

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs goroomz-backend

# Restart
pm2 restart goroomz-backend

# Stop
pm2 stop goroomz-backend

# Monitor
pm2 monit
```

### Database Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-goroomz.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/goroomz"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U goroomz_user goroomz > $BACKUP_DIR/goroomz_$DATE.sql
# Keep only last 7 days
find $BACKUP_DIR -name "goroomz_*.sql" -mtime +7 -delete
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-goroomz.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-goroomz.sh
```

## 🚨 Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET
- [ ] Enable firewall (UFW)
- [ ] Setup SSL certificates
- [ ] Configure database user with limited privileges
- [ ] Set proper file permissions
- [ ] Enable rate limiting
- [ ] Regular security updates
- [ ] Database backups configured
- [ ] Monitor logs regularly

### Firewall Setup

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

## 🐛 Troubleshooting

### Backend not starting
```bash
# Check logs
pm2 logs goroomz-backend
tail -f /var/log/nginx/error.log

# Check database connection
cd /var/www/goroomz/backend
node -e "require('./config/database').testConnection()"
```

### Frontend not loading
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify dist folder exists
ls -la /var/www/goroomz/dist

# Check file permissions
sudo chown -R www-data:www-data /var/www/goroomz/dist
```

### Database connection issues
```bash
# Test PostgreSQL connection
sudo -u postgres psql -d goroomz -U goroomz_user

# Check PostgreSQL is running
sudo systemctl status postgresql
```

## 📝 Important Notes

1. **Never commit `.env` files** - They contain sensitive information
2. **Always backup database** before major updates
3. **Test in staging** before production deployment
4. **Monitor PM2 logs** regularly for errors
5. **Keep dependencies updated** for security patches

## 🔗 Useful Commands Reference

```bash
# View all running processes
pm2 list

# View backend logs
pm2 logs goroomz-backend --lines 100

# Restart everything
pm2 restart all

# Nginx status
sudo systemctl status nginx

# PostgreSQL status
sudo systemctl status postgresql

# Check disk space
df -h

# Check memory usage
free -h
```

---

**Need Help?** Check the logs first, then review this guide. For persistent issues, check the troubleshooting section or create an issue in the repository.

