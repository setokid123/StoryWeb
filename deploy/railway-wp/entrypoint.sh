#!/usr/bin/env bash
# Railway runtime prep, then hand off to the official WordPress entrypoint.
set -euo pipefail

# On Railway, Apache in php-apache images can start with more than one MPM enabled and refuse to run
# ("AH00534: More than one MPM loaded"). mod_php needs prefork only; fix it here, at start time.
a2dismod -q mpm_event mpm_worker >/dev/null 2>&1 || true
a2enmod -q mpm_prefork >/dev/null

# Railway routes the public domain to $PORT; Apache in the base image listens on 80.
port="${PORT:-80}"
sed -ri "s/^Listen 80\$/Listen ${port}/" /etc/apache2/ports.conf
sed -ri "s/:80>/:${port}>/" /etc/apache2/sites-available/000-default.conf

# wp-config.php evals WORDPRESS_CONFIG_EXTRA on every request; by default it loads our Railway
# settings (HTTPS behind the proxy, site address, file access). Set the variable in Railway to override.
export WORDPRESS_CONFIG_EXTRA="${WORDPRESS_CONFIG_EXTRA:-require '/usr/local/share/railway-wp/wp-config-railway.php';}"

# The volume holds the whole site. Once WordPress is in it, docker-entrypoint.sh copies nothing more,
# so replace our theme and plugin with this image's copy to ship each deploy's code.
if [ -e /var/www/html/wp-includes/version.php ]; then
	for dir in themes/thu-cac plugins/storyweb-core; do
		rm -rf "/var/www/html/wp-content/${dir}"
		cp -a "/usr/src/wordpress/wp-content/${dir}" "/var/www/html/wp-content/${dir}"
	done
fi

# WP-Cron without visitors: WordPress only runs its scheduled jobs when someone loads a page, so Facebook comments
# and automatic posting could wait for a visit. Call wp-cron.php through Apache once a minute, for as long as the
# container runs. Visits still trigger it as well; WordPress's own lock keeps two runs from overlapping.
if [ "${1:-}" = "apache2-foreground" ]; then
	(
		sleep 60
		while true; do
			curl -fsS -o /dev/null --max-time 300 \
				-H "Host: ${SITE_DOMAIN:-${RAILWAY_PUBLIC_DOMAIN:-localhost}}" -H "X-Forwarded-Proto: https" \
				"http://127.0.0.1:${port}/wp-cron.php" || true
			sleep 60
		done
	) &
fi

# docker-entrypoint.sh copies WordPress into an empty volume and writes wp-config.php from the
# WORDPRESS_* variables (first boot only, both persist on the volume), then runs apache2-foreground.
exec docker-entrypoint.sh "$@"
