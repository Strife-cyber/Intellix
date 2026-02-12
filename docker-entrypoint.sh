#!/bin/bash
set -e

# Wait for PostgreSQL to be ready (if using docker-compose)
if [ -n "$DB_HOST" ]; then
    echo "Waiting for PostgreSQL database..."
    until PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USERNAME}" -d "${DB_DATABASE}" -c '\q' 2>/dev/null; do
        echo "PostgreSQL is unavailable - sleeping"
        sleep 2
    done
    echo "PostgreSQL is up!"
fi

# Run migrations
php artisan migrate --force || echo "Warning: Migrations may have failed"

# Clear and cache config
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Execute the main command
exec "$@"
