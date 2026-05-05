#!/bin/bash
set -e

echo "=== Deploying internal management ==="
cd /var/www/goroomz
rm -rf internal-management/build
mkdir -p internal-management/build
tar -xzf internal-deploy.tar.gz -C internal-management/build/
echo "Build extracted"

echo "=== Updating backend route ==="
cp /var/www/goroomz/properties.js /var/www/goroomz/backend/routes/internal/properties.js
echo "Route updated"

echo "=== Restarting services ==="
pm2 restart goroomz-api goroomz-internal
sleep 3
pm2 status

echo "=== Done ==="
