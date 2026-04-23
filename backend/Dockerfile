FROM php:8.2-apache

RUN apt-get update && apt-get install -y \
    libicu-dev libonig-dev libxml2-dev unzip git \
    && docker-php-ext-install intl mbstring mysqli pdo pdo_mysql \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install --no-dev --optimize-autoloader

RUN sed -i 's|/var/www/html|/var/www/html/public|g' \
    /etc/apache2/sites-available/000-default.conf \
    && echo '<Directory /var/www/html/public>\n    AllowOverride All\n</Directory>' \
    >> /etc/apache2/sites-available/000-default.conf

RUN chown -R www-data:www-data /var/www/html/writable

EXPOSE 80
