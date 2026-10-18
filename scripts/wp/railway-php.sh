#!/usr/bin/env bash
# Runs a local PHP file on the Railway WordPress container, as the web server user (www-data), then deletes it there.
# The file is copied to /tmp under a unique name, run with WordPress loadable from /var/www/html, and removed even if
# it fails. Output comes back to your terminal. See docs/VAN_HANH_RAILWAY.md.
#
#   RAILWAY_SSH=thu-cac-wp scripts/wp/railway-php.sh scripts/wp/server-script-template.php --dry
#
# RAILWAY_SSH: a host from your ~/.ssh/config (railway ssh config -s wordpress --alias thu-cac-wp) or
# <instance>@ssh.railway.com. RAILWAY_SSH_KEY: private key (default ~/.ssh/id_ed25519; ignored for a config alias
# that already names one). Extra arguments are passed to the PHP script (no spaces inside an argument).
set -euo pipefail

: "${RAILWAY_SSH:?Set RAILWAY_SSH (see docs/VAN_HANH_RAILWAY.md, section 3).}"
if [ "$#" -lt 1 ] || [ ! -f "$1" ]; then
  echo "Usage: RAILWAY_SSH=<host> $0 <local-file.php> [args...]" >&2
  exit 2
fi

file="$1"
shift
key="${RAILWAY_SSH_KEY:-$HOME/.ssh/id_ed25519}"
ssh_opts=(-o BatchMode=yes)
if [ -f "$key" ]; then
  ssh_opts+=(-i "$key")
fi
remote="/tmp/sw-$(date +%s)-$$-$(basename "$file")"

ssh "${ssh_opts[@]}" "$RAILWAY_SSH" "cat > '$remote' && chmod 644 '$remote'" < "$file"
# shellcheck disable=SC2029 -- the arguments are meant to expand here, on the local side.
ssh "${ssh_opts[@]}" "$RAILWAY_SSH" "su -s /bin/sh -c 'php -d memory_limit=512M $remote $*' www-data; code=\$?; rm -f '$remote'; exit \$code"
