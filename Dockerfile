# Stage 1: Rust build environment
FROM rust:1.93-slim as rust-builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install cross for cross-compilation (optional, uncomment if needed)
# RUN cargo install cross --git https://github.com/cross-rs/cross

# Set working directory
WORKDIR /build

# Copy Rust project files
COPY Cargo.toml Cargo.lock ./
COPY src/ ./src/

# Build the Rust binary in release mode
RUN cargo build --release

# Stage 2: PHP/Laravel runtime
FROM php:8.4.8-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libzip-dev \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy Rust binary from Stage 1
COPY --from=rust-builder /build/target/release/intellix /usr/local/bin/intellix
RUN chmod +x /usr/local/bin/intellix

# Set working directory
WORKDIR /var/www/html

# Copy Laravel application files
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
COPY .env.example ./.env

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# Expose port
EXPOSE 9000

# Entrypoint script - convert line endings and set permissions
COPY docker-entrypoint.sh /tmp/docker-entrypoint.sh
RUN tr -d '\r' < /tmp/docker-entrypoint.sh > /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh && \
    rm /tmp/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["php-fpm"]
