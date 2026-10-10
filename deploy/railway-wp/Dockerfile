# WordPress for Railway, with the Thư Các theme and StoryWeb Core plugin baked in (git-based, survive redeploys).
# Build context = repo root (so COPY can reach wp-content/). In the Railway service, set:
#   Root Directory  = (repo root, leave empty)
#   Dockerfile Path = deploy/railway-wp/Dockerfile
# Uploaded media lives on a Railway Volume mounted at /var/www/html/wp-content/uploads (see README.md).
FROM wordpress:php8.3-apache

# Our code. Plugins/themes added later must go in this Dockerfile too (the volume only holds uploads),
# because installing them through wp-admin would be lost on the next deploy.
COPY wp-content/themes/thu-cac           /var/www/html/wp-content/themes/thu-cac
COPY wp-content/plugins/storyweb-core    /var/www/html/wp-content/plugins/storyweb-core
RUN chown -R www-data:www-data /var/www/html/wp-content/themes /var/www/html/wp-content/plugins

# Apache must listen on Railway's $PORT; also prepare the uploads dir on the mounted volume.
COPY deploy/railway-wp/entrypoint.sh /usr/local/bin/railway-entrypoint.sh
RUN chmod +x /usr/local/bin/railway-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/railway-entrypoint.sh"]
CMD ["apache2-foreground"]
