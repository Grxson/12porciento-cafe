#!/bin/sh
set -e

API_URL="${API_URL:-http://localhost:3001}"

export API_URL
envsubst '$API_URL' < /etc/nginx/nginx.conf > /etc/nginx/nginx.conf.tmp
mv /etc/nginx/nginx.conf.tmp /etc/nginx/nginx.conf

exec nginx -g "daemon off;"
