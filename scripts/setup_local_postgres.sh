#!/bin/bash
# Exit on error
set -e

echo "========================================="
echo "Setting up local PostgreSQL database..."
echo "========================================="

DB_NAME="biamanhbeo"
DB_USER="biamanhbeo_user"
DB_PASS="BiaManhBeo_SecurePass_2026"

# Check if PostgreSQL service is running
echo "Checking PostgreSQL service status..."
if ! systemctl is-active --quiet postgresql; then
    echo "PostgreSQL service is not running. Starting it..."
    systemctl start postgresql
fi

# Create database if not exists
echo "Creating database '$DB_NAME' if not exists..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"

# Create user if not exists
echo "Creating user '$DB_USER' if not exists..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

# Grant privileges
echo "Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Grant schema privileges (crucial for Postgres 15+)
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

echo "========================================="
echo "Local PostgreSQL database setup completed!"
echo "DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?sslmode=disable"
echo "========================================="
