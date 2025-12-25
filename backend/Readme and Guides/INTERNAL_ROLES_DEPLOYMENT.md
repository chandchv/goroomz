# Internal User Roles System - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Internal User Roles Management System to production.

## Prerequisites

- Node.js 16+ installed
- PostgreSQL 12+ installed and running
- PM2 installed globally (`npm install -g pm2`)
- Access to production server
- Email service configured (SMTP)
- File storage configured (local or AWS S3)

## Pre-Deployment Checklist

- [ ] Database backup completed
- [ ] Environment variables configured
- [ ] Email service tested
- [ ] File storage tested
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Monitoring tools set up

## Step 1: Environment Configuration

### 1.1 Copy Environment File

```bash
cd /var/www/goroomz/backend
cp env.example .env
```

### 1.2 Configure Environment Variables

Edit `.env` file with production values:

```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=goroomz_production
DB_USER=goroomz_user
DB_PASSWORD=your-secure-password
DATABASE_URL=postgresql://goroomz_user:your-secure-password@your-production-db-host:5432/goroomz_production

# JWT Configuration
JWT_SECRET=your-production-jwt-secret-min-32-chars
JWT_EXPIRE=7d

# Email Configuration
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_USER=noreply@goroomz.com
EMAIL_PASS=your-email-password
SYSTEM_EMAIL_FROM=noreply@goroomz.com
SYSTEM_EMAIL_NAME=GoRoomz Platform

# File Storage
FILE_STORAGE_TYPE=s3  # or 'local'
FILE_MAX_SIZE=10485760

# AWS S3 (if using S3)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=goroomz-production-documents

# Scheduler Configuration
ENABLE_ALERT_SCHEDULER=true
ENABLE_REMINDER_SCHEDULER=true

# Alert Thresholds
ZERO_OCCUPANCY_DAYS=7
PAYMENT_FAILURE_THRESHOLD=3
UNCONTACTED_LEAD_HOURS=24
PENDING_APPROVAL_HOURS=48

# Commission Configuration
DEFAULT_COMMISSION_RATE=5.0
PREMIUM_COMMISSION_RATE=7.5

# Frontend URLs
FRONTEND_URL=https://goroomz.com
INTERNAL_FRONTEND_URL=https://internal.goroomz.com
```

### 1.3 Secure Environment File

```bash
chmod 600 .env
chown www-data:www-data .env
```

## Step 2: Database Migration

### 2.1 Backup Current Database

```bash
pg_dump -U goroomz_user -h localhost goroomz_production > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2.2 Run Migration

```bash
cd /var/www/goroomz/backend
npx sequelize-cli db:migrate
```

### 2.3 Verify Migration

```bash
npx sequelize-cli db:migrate:status
```

All migrations should show "up" status.

### 2.4 Seed Default Roles (Optional - Development Only)

**WARNING**: Only run this in development/staging environments!

```bash
# DO NOT RUN IN PRODUCTION
npx sequelize-cli db:seed --seed 20251120000000-internal-roles-seed-data.js
```

For production, create users manually through the superuser interface.

## Step 3: File Storage Setup

### Option A: Local File Storage

```bash
# Create upload directory
mkdir -p /var/www/goroomz/backend/uploads/documents
chmod 755 /var/www/goroomz/backend/uploads/documents
chown -R www-data:www-data /var/www/goroomz/backend/uploads
```

### Option B: AWS S3 Storage

1. Create S3 bucket: `goroomz-production-documents`
2. Configure bucket policy for private access
3. Create IAM user with S3 access
4. Add credentials to `.env` file
5. Test upload/download functionality

## Step 4: Email Service Configuration

### 4.1 Test Email Service

```bash
cd /var/www/goroomz/backend
node scripts/testEmailService.js
```

### 4.2 Configure Email Templates

Email templates are located in `backend/email-templates/`:
- `welcome-internal-user.html` - New internal user credentials
- `property-owner-credentials.html` - New property owner credentials
- `lead-approved.html` - Lead approval notification
- `lead-rejected.html` - Lead rejection notification

Customize templates with your branding.

## Step 5: Install Dependencies

```bash
cd /var/www/goroomz/backend
npm install --production

# Install cron for schedulers
npm install node-cron
```

## Step 6: Deploy with PM2

### 6.1 Stop Existing Processes

```bash
pm2 stop all
```

### 6.2 Start New Processes

```bash
cd /var/www/goroomz
pm2 start ecosystem.config.js
```

This will start:
- `goroomz-backend` (2 instances, cluster mode)
- `goroomz-alert-scheduler` (1 instance)
- `goroomz-reminder-scheduler` (1 instance)

### 6.3 Save PM2 Configuration

```bash
pm2 save
pm2 startup
```

Follow the instructions to enable PM2 on system boot.

### 6.4 Verify Processes

```bash
pm2 list
pm2 logs
```

All processes should show "online" status.

## Step 7: Frontend Deployment

### 7.1 Build Frontend

```bash
cd /var/www/goroomz/internal-management
npm install
npm run build
```

### 7.2 Configure Web Server

#### Nginx Configuration

```nginx
# Internal Management Application
server {
    listen 80;
    server_name internal.goroomz.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name internal.goroomz.com;

    ssl_certificate /etc/letsencrypt/live/internal.goroomz.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/internal.goroomz.com/privkey.pem;

    root /var/www/goroomz/internal-management/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.3 Reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 8: Create Superuser

### 8.1 Run Superuser Creation Script

```bash
cd /var/www/goroomz/backend
node scripts/createSuperuser.js
```

Follow the prompts to create the first superuser account.

### 8.2 Test Superuser Login

1. Navigate to `https://internal.goroomz.com`
2. Login with superuser credentials
3. Verify dashboard loads correctly

## Step 9: Post-Deployment Verification

### 9.1 Health Checks

```bash
# Check backend health
curl https://internal.goroomz.com/api/health

# Check database connection
curl https://internal.goroomz.com/api/health/database

# Check file storage
curl https://internal.goroomz.com/api/health/storage
```

### 9.2 Test Core Functionality

1. **User Management**:
   - Create a test agent
   - Verify email delivery
   - Test login with new user

2. **Lead Management**:
   - Create a test lead
   - Upload documents
   - Submit for approval
   - Approve lead

3. **Commission Tracking**:
   - Verify commission created on approval
   - Check commission dashboard

4. **Alerts**:
   - Verify alert scheduler is running
   - Check alert generation

5. **Reminders**:
   - Verify reminder scheduler is running
   - Check reminder notifications

### 9.3 Monitor Logs

```bash
# Backend logs
pm2 logs goroomz-backend

# Alert scheduler logs
pm2 logs goroomz-alert-scheduler

# Reminder scheduler logs
pm2 logs goroomz-reminder-scheduler

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Step 10: Monitoring Setup

### 10.1 PM2 Monitoring

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 10.2 Database Monitoring

Set up monitoring for:
- Connection pool usage
- Query performance
- Table sizes
- Index usage

### 10.3 Application Monitoring

Consider setting up:
- Error tracking (Sentry, Rollbar)
- Performance monitoring (New Relic, DataDog)
- Uptime monitoring (Pingdom, UptimeRobot)

## Step 11: Backup Configuration

### 11.1 Database Backups

Create cron job for daily backups:

```bash
crontab -e
```

Add:
```
0 2 * * * /usr/bin/pg_dump -U goroomz_user goroomz_production > /backups/goroomz_$(date +\%Y\%m\%d).sql
```

### 11.2 File Storage Backups

If using local storage:
```bash
0 3 * * * rsync -av /var/www/goroomz/backend/uploads/ /backups/uploads/
```

If using S3, enable versioning on the bucket.

### 11.3 Configuration Backups

```bash
0 4 * * * tar -czf /backups/config_$(date +\%Y\%m\%d).tar.gz /var/www/goroomz/backend/.env /var/www/goroomz/ecosystem.config.js
```

## Troubleshooting

### Migration Fails

```bash
# Rollback last migration
npx sequelize-cli db:migrate:undo

# Check migration status
npx sequelize-cli db:migrate:status

# Re-run migration
npx sequelize-cli db:migrate
```

### PM2 Process Crashes

```bash
# Check logs
pm2 logs goroomz-backend --lines 100

# Restart process
pm2 restart goroomz-backend

# Check process details
pm2 show goroomz-backend
```

### Email Not Sending

1. Verify SMTP credentials
2. Check firewall allows outbound port 587
3. Test with script: `node scripts/testEmailService.js`
4. Check email service logs

### File Upload Fails

1. Check directory permissions
2. Verify disk space
3. Check file size limits
4. Test S3 credentials (if using S3)

### Scheduler Not Running

```bash
# Check scheduler logs
pm2 logs goroomz-alert-scheduler
pm2 logs goroomz-reminder-scheduler

# Restart schedulers
pm2 restart goroomz-alert-scheduler
pm2 restart goroomz-reminder-scheduler
```

## Rollback Procedure

If deployment fails:

1. **Stop new processes**:
   ```bash
   pm2 stop all
   ```

2. **Restore database**:
   ```bash
   psql -U goroomz_user -d goroomz_production < backup_YYYYMMDD_HHMMSS.sql
   ```

3. **Revert code**:
   ```bash
   git checkout previous-stable-tag
   npm install --production
   ```

4. **Restart old version**:
   ```bash
   pm2 start ecosystem.config.js
   ```

## Security Checklist

- [ ] All environment variables secured
- [ ] Database credentials rotated
- [ ] JWT secret is strong and unique
- [ ] SSL certificates installed and valid
- [ ] Firewall rules configured
- [ ] File upload directory permissions set correctly
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] Audit logging enabled
- [ ] Backup encryption enabled

## Performance Optimization

1. **Database**:
   - Create indexes on frequently queried columns
   - Enable connection pooling
   - Configure query timeout

2. **Application**:
   - Enable gzip compression
   - Configure caching headers
   - Use CDN for static assets

3. **Monitoring**:
   - Set up APM (Application Performance Monitoring)
   - Configure alerts for high CPU/memory usage
   - Monitor API response times

## Support

For deployment issues:
- Email: devops@goroomz.com
- Documentation: https://docs.goroomz.com/deployment
- Emergency: [Emergency Contact Number]

---

**Last Updated**: November 2025
**Version**: 1.0
