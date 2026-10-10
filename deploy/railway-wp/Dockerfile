# WordPress for Railway, with the Thư Các theme and StoryWeb Core plugin baked in.
# Build context = repo root (so COPY can reach wp-content/); railway.json at the root points Railway here.
# The whole site (/var/www/html) lives on a Railway Volume, see README.md.
FROM wordpress:php8.3-apache

# Our code goes into the image's WordPress source. On the first boot the base entrypoint copies
# /usr/src/wordpress into the empty volume; on later boots entrypoint.sh refreshes these two folders.
COPY wp-content/themes/thu-cac        /usr/src/wordpress/wp-content/themes/thu-cac
COPY wp-content/plugins/storyweb-core /usr/src/wordpress/wp-content/plugins/storyweb-core
RUN chown -R www-data:www-data /usr/src/wordpress/wp-content/themes/thu-cac /usr/src/wordpress/wp-content/plugins/storyweb-core

COPY deploy/railway-wp/php.ini               /usr/local/etc/php/conf.d/railway-wp.ini
COPY deploy/railway-wp/wp-config-railway.php /usr/local/share/railway-wp/wp-config-railway.php
COPY deploy/railway-wp/entrypoint.sh         /usr/local/bin/railway-entrypoint.sh
RUN chmod +x /usr/local/bin/railway-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/railway-entrypoint.sh"]
CMD ["apache2-foreground"]
