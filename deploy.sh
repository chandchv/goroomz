#!/bin/bash

# GoRoomz Deployment Script
# This script automates the deployment process

set -e  # Exit on error

echo "🚀 Starting GoRoomz Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/goroomz"
BACKEND_DIR="$APP_DIR/backend"

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

# Navigate to app directory
cd $APP_DIR || { echo -e "${RED}App directory not found: $APP_DIR${NC}"; exit 1; }

echo -e "${GREEN}✓${NC} Found app directory"

# Install/update frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
npm install --production=false

# Install/update backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd $BACKEND_DIR
npm install --production
cd $APP_DIR

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
npm run build

# Check if .env files exist
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${RED}⚠️  Backend .env file not found!${NC}"
    echo -e "${YELLOW}Please create $BACKEND_DIR/.env from env.example${NC}"
    exit 1
fi

if [ ! -f "$APP_DIR/.env.production" ]; then
    echo -e "${YELLOW}⚠️  Frontend .env.production not found, using defaults${NC}"
fi

# Restart PM2 process
echo -e "${YELLOW}Restarting backend with PM2...${NC}"
pm2 restart goroomz-backend || pm2 start ecosystem.config.js

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to start...${NC}"
sleep 3

# Check if backend is running
if pm2 list | grep -q "goroomz-backend.*online"; then
    echo -e "${GREEN}✓${NC} Backend is running"
else
    echo -e "${RED}✗${NC} Backend failed to start. Check logs: pm2 logs goroomz-backend"
    exit 1
fi

# Test backend health
echo -e "${YELLOW}Testing backend health...${NC}"
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend health check passed"
else
    echo -e "${RED}✗${NC} Backend health check failed"
    exit 1
fi

# Reload Nginx (if config changed)
echo -e "${YELLOW}Reloading Nginx...${NC}"
if sudo nginx -t > /dev/null 2>&1; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✓${NC} Nginx reloaded"
else
    echo -e "${RED}✗${NC} Nginx configuration error. Run: sudo nginx -t"
fi

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "Useful commands:"
echo "  - View logs: pm2 logs goroomz-backend"
echo "  - Restart: pm2 restart goroomz-backend"
echo "  - Status: pm2 status"
echo "  - Nginx logs: sudo tail -f /var/log/nginx/error.log"

