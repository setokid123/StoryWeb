#!/usr/bin/env bash
# Railway runtime prep, then hand off to the official WordPress entrypoint.
set -euo pipefail

# Railway injects $PORT and routes HTTPS to it; Apache in the base image listens on 80.
port="${PORT:-80}"
sed -ri "s/^Listen 80\$/Listen ${port}/" /etc/apache2/ports.conf
sed -ri "s/:80>/:${port}>/" /etc/apache2/sites-available/000-default.conf

# The uploads volume mounts here; make sure it exists and the web user can write to it.
mkdir -p /var/www/html/wp-content/uploads
chown www-data:www-data /var/www/html/wp-content/uploads 2>/dev/null || true

# docker-entrypoint.sh writes wp-config.php from WORDPRESS_* env vars, then runs CMD (apache2-foreground).
exec docker-entrypoint.sh "$@"
