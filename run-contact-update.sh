#!/bin/bash
echo "=== Running contact updates ==="
sudo -u postgres psql -d goroomz -f /var/www/goroomz/contact-updates.sql 2>&1 | grep -c "UPDATE"
echo "=== Verifying ==="
sudo -u postgres psql -d goroomz -c "SELECT count(*) as properties_with_phone FROM properties WHERE contact_info->>'phone' IS NOT NULL;"
echo "=== Done ==="
