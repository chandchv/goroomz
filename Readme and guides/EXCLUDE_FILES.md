# 🚫 Files to EXCLUDE When Copying to Ubuntu Server

## ⚠️ Critical: DO NOT Copy These

### 1. Environment Files (Create New on Server)
```
.env
.env.local
.env.development
.env.production
backend/.env
backend/.env.local
backend/.env.development
backend/.env.production
env copy
env copy.development
backend/envcopy
```

### 2. Dependencies (Install Fresh on Server)
```
node_modules/
backend/node_modules/
```

### 3. Build Outputs (Rebuild on Server)
```
dist/
build/
```

### 4. Git Repository (Unless Using Git Deployment)
```
.git/
.gitignore (optional - can keep it)
```

### 5. Log Files
```
*.log
logs/
backend/*.log
```

### 6. IDE/Editor Files
```
.vscode/
.idea/
*.swp
*.swo
*~
```

### 7. OS Files
```
.DS_Store
Thumbs.db
desktop.ini
```

### 8. Temporary/Cache Files
```
*.tmp
*.temp
.cache/
.npm/
.yarn/
```

### 9. Database Files
```
*.sql
*.db
*.sqlite
backups/
```

### 10. SSL Certificates (Generate on Server)
```
*.pem
*.key
*.crt
*.p12
*.pfx
```

### 11. PM2 Files (Will be Created on Server)
```
.pm2/
ecosystem.config.js.bak
```

### 12. User Uploads (If Any)
```
backend/uploads/
uploads/
```

### 13. Export/Data Files (Optional - Only if Needed)
```
backend/*.csv
backend/*.json
backend/scripts/*.csv
backend/scripts/*.json
```

### 14. Backup Files
```
*.bak
*.backup
*~
```

---

## ✅ Safe to Copy

- All source code (`src/`, `backend/`)
- Configuration files (`package.json`, `vite.config.js`, `tailwind.config.js`, etc.)
- Documentation (`README.md`, `DEPLOYMENT.md`, etc.)
- Scripts (`deploy.sh`, `ecosystem.config.js`)
- Example files (`env.example`, `env.production.example`)

---

## 📋 Quick Exclusion List for SCP/rsync

### For SCP (Windows PowerShell):
```powershell
# Exclude patterns (use --exclude for each)
--exclude="node_modules"
--exclude=".env*"
--exclude="dist"
--exclude=".git"
--exclude="*.log"
--exclude=".vscode"
--exclude=".idea"
--exclude="*.csv"
--exclude="*.json"
--exclude="uploads"
--exclude=".DS_Store"
--exclude="Thumbs.db"
```

### For rsync (Linux/Mac):
```bash
rsync -avz \
  --exclude='node_modules' \
  --exclude='.env*' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='.vscode' \
  --exclude='.idea' \
  --exclude='*.csv' \
  --exclude='*.json' \
  --exclude='uploads' \
  --exclude='.DS_Store' \
  --exclude='Thumbs.db' \
  /path/to/local/ ubuntu@server:/var/www/goroomz/
```

---

## 🎯 Minimal Exclusion List (Most Important)

If you want just the essentials to exclude:

1. **node_modules/** - Install fresh
2. **.env** - Create new on server
3. **dist/** - Rebuild on server
4. **.git/** - Optional
5. ***.log** - Not needed

---

## 📝 After Copying, Create These on Server:

1. `backend/.env` - Copy from `backend/env.example` and fill production values
2. `.env.production` - Copy from `env.production.example` and fill production values
3. Run `npm install` in root directory
4. Run `npm install --production` in `backend/` directory
5. Run `npm run build` to create `dist/` folder

