#!/bin/bash
set -e

# ── If this is the dedicated worker container, skip DB-dependent setup ──
if [ "${APP_IS_WORKER}" = "true" ]; then
    echo "Worker container detected — skipping DB setup, starting queue directly."

    # The worker container already has config cached from the build step.
    # Just start the queue worker immediately.
    exec php artisan queue:work --sleep=3 --tries=3 --timeout=300
fi

# ── App container: full bootstrap ──

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

# Clear stale caches, then regenerate
php artisan optimize:clear || true
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Restart OPcache so PHP doesn't serve stale compiled files
kill -USR2 1 2>/dev/null || true

# Execute the main command
exec "$@"
