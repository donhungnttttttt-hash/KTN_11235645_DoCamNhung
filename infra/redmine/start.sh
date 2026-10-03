#!/bin/sh
set -eu
cp /opt/tms-seed/database.yml /usr/src/redmine/config/database.yml
exec /docker-entrypoint.sh "$@"
