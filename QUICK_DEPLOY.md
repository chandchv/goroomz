# ⚡ Quick Deployment Guide

## 🚨 Important: What NOT to Copy

**DO NOT copy these to production:**
- `node_modules/` folders (install fresh on server)
- `.env` files (create new ones with production values)
- `.git/` folder (unless using Git deployment)
- `*.log` files
- Development files

## 📦 Quick Copy Method (Windows to Ubuntu)

### Step 1: Prepare Files Locally

Create a temporary folder with only necessary files:

```powershell
# On Windows, create a deployment package
# Exclude node_modules, .env, .git, logs
```

### Step 2: Copy to Server

**Option A: Using SCP (from Windows PowerShell)**

```powershell
# Install OpenSSH client if not available
# Then use:
scp -i "C:\Coding\AWS-Project-Rx\goroomz\GoRoomz-ap-south-1.ppk" `
  -r `
  --exclude="node_modules" `
  --exclude=".git" `
  --exclude="*.log" `
  --exclude=".env" `
  "C:\Coding\goroomz\goroomz\*" `
  ubuntu@13.202.196.225:/var/www/goroomz/
```

**Option B: Using WinSCP or FileZilla**
1. Connect via SFTP using your .ppk key
2. Navigate to `/var/www/goroomz`
3. Upload files (excluding node_modules, .env, .git)

**Option C: Using Git (Recommended)**
```bash
# On server
cd /var/www/goroomz
git clone <your-repo-url> .
```

## 🔧 Server Setup (One-Time)

```bash
# Connect to server
ssh -i "C:\Coding\AWS-Project-Rx\goroomz\GoRoomz-ap-south-1.ppk" ubuntu@13.202.196.225

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL (if not installed)
sudo apt install postgresql postgresql-contrib -y

# Install Nginx (if not installed)
sudo apt install nginx -y

# Create app directory
sudo mkdir -p /var/www/goroomz
sudo chown -R $USER:$USER /var/www/goroomz
```

## 📝 Configuration Steps

### 1. Copy Files to Server
(Use one of the methods above)

### 2. Install Dependencies

```bash
cd /var/www/goroomz

# Frontend
npm install

# Backend
cd backend
npm install --production
cd ..
```

### 3. Create Environment Files

```bash
# Backend
cd backend
cp env.example .env
nano .env  # Edit with production values
cd ..

# Frontend
cp env.production.example .env.production
nano .env.production  # Edit with production API URL
```

### 4. Build Frontend

```bash
npm run build
```

### 5. Setup Database

```bash
cd backend
npm run setup
npm run seed  # Optional
cd ..
```

### 6. Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions
```

### 7. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/goroomz
# Paste configuration from DEPLOYMENT.md

sudo ln -s /etc/nginx/sites-available/goroomz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔄 Update Deployment

After making changes:

```bash
# On server
cd /var/www/goroomz

# Pull changes (if using Git)
git pull

# OR copy new files

# Rebuild
npm install
npm run build
cd backend && npm install --production && cd ..

# Restart
pm2 restart goroomz-backend
```

Or use the automated script:

```bash
./deploy.sh
```

## ✅ Verification

```bash
# Check PM2
pm2 status

# Check backend
curl http://localhost:5000/api/health

# Check Nginx
sudo systemctl status nginx

# View logs
pm2 logs goroomz-backend
```

## 🆘 Common Issues

**Port 5000 already in use:**
```bash
pm2 delete goroomz-backend
pm2 start ecosystem.config.js
```

**Permission denied:**
```bash
sudo chown -R $USER:$USER /var/www/goroomz
```

**Database connection failed:**
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify credentials in `backend/.env`
- Test connection: `psql -U goroomz_user -d goroomz`

---

For detailed instructions, see `DEPLOYMENT.md`

