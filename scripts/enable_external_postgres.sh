#!/bin/bash
# Exit on error
set -e

echo "========================================="
echo "Enabling external access for PostgreSQL 17..."
echo "========================================="

# 1. Update postgresql.conf to listen on all interfaces
PG_CONF="/etc/postgresql/17/main/postgresql.conf"
if [ -f "$PG_CONF" ]; then
    if grep -q "#listen_addresses = 'localhost'" "$PG_CONF"; then
        echo "Updating listen_addresses to '*' in postgresql.conf..."
        sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF"
    elif grep -q "listen_addresses = 'localhost'" "$PG_CONF"; then
        echo "Updating listen_addresses to '*' in postgresql.conf..."
        sudo sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF"
    else
        echo "listen_addresses already modified or not found in default comment format."
    fi
else
    echo "❌ Error: postgresql.conf not found at $PG_CONF"
    exit 1
fi

# 2. Update pg_hba.conf to allow connections from all IPs
PG_HBA="/etc/postgresql/17/main/pg_hba.conf"
RULE="host all all 0.0.0.0/0 scram-sha-256"
if [ -f "$PG_HBA" ]; then
    if ! grep -q "0.0.0.0/0" "$PG_HBA"; then
        echo "Adding host rule to allow external connections in pg_hba.conf..."
        echo "$RULE" | sudo tee -a "$PG_HBA" > /dev/null
    else
        echo "A rule for 0.0.0.0/0 already exists in pg_hba.conf"
    fi
else
    echo "❌ Error: pg_hba.conf not found at $PG_HBA"
    exit 1
fi

# 3. Restart PostgreSQL service
echo "Restarting PostgreSQL service to apply changes..."
sudo systemctl restart postgresql

echo "========================================="
echo "PostgreSQL external access enabled successfully!"
echo "You can now connect to this database from outside."
echo "========================================="
