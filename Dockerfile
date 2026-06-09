# ------------------------
# PHP + Node build (single stage for Laravel + Vite)
# ------------------------
FROM php:8.4.8-fpm

# System deps for PHP, Laravel, Node, Vite
RUN apt-get update && apt-get install -y \
    git curl zip unzip libzip-dev libpng-dev libonig-dev libxml2-dev \
    libpq-dev postgresql-client ca-certificates libssl3 libgomp1 \
    nodejs npm pkg-config libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

# PHP extensions
RUN docker-php-ext-install mbstring xml bcmath curl gd pdo_pgsql pgsql zip exif pcntl
RUN pecl install redis && docker-php-ext-enable redis

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Laravel workdir
WORKDIR /var/www/html

# Copy full Laravel app
COPY composer.json composer.lock ./
COPY app/ ./app/
COPY bootstrap/ ./bootstrap/
COPY config/ ./config/
COPY database/ ./database/
COPY public/ ./public/
COPY resources/ ./resources/
COPY routes/ ./routes/
COPY storage/ ./storage/
COPY artisan ./

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Copy Node files
COPY package.json package-lock.json ./
COPY vite.config.ts ./

# Build Vite assets (Laravel fully available)
RUN npm ci --legacy-peer-deps && npm run build

# Permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# Create SQLite file so build-time config:cache works (overridden by .env at runtime)
RUN touch database/database.sqlite \
    && php artisan config:clear \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

# Entrypoint
COPY docker-entrypoint.sh /tmp/docker-entrypoint.sh
RUN tr -d '\r' < /tmp/docker-entrypoint.sh > /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh && \
    rm /tmp/docker-entrypoint.sh

EXPOSE 9000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["php-fpm"]
