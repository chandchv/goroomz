#!/bin/bash
set -e

echo "=== Applying Google Places data to properties ==="
sudo -u postgres psql -d goroomz -f /var/www/goroomz/property-google-updates.sql 2>&1 | grep -c "UPDATE"
echo "updates applied"

echo "=== Verifying ==="
sudo -u postgres psql -d goroomz -c "SELECT count(*) as with_coords FROM properties WHERE location->'coordinates'->>'latitude' IS NOT NULL;"
sudo -u postgres psql -d goroomz -c "SELECT count(*) as with_google_id FROM properties WHERE metadata->>'googlePlaceId' IS NOT NULL;"

echo "=== Deploying website ==="
cd /var/www/goroomz
rm -rf website/*
tar -xzf website-deploy.tar.gz -C website/

echo "=== Restarting backend ==="
pm2 restart goroomz-api
sleep 2

echo "=== Done ==="
