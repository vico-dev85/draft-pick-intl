#!/usr/bin/env bash
# Deploy PickNKick to server
# Usage: ./deploy.sh
#
# If the upload fails with "no such file or directory" the server-side path
# below is wrong — verify the picknkick user dir on the server and edit it.

set -e
cd "$(dirname "$0")"

echo "Building site..."
npm run build

echo "Uploading to server..."
scp -P 55011 -r dist/* root@111.90.141.72:/var/www/picknkick_co_usr/data/www/picknkick.com/

echo "Done! Site deployed to https://picknkick.com"
