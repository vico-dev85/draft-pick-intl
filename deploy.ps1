# Deploy PickNKick to server
# Usage: powershell -ExecutionPolicy Bypass -File deploy.ps1
#
# Pattern copied from adultrandomchat / mychatdate.
# Same server (111.90.141.72:55011), same dir scheme (/var/www/<user>/data/www/<domain>/).
#
# If the upload fails with "no such file or directory" the server-side path
# below is wrong — verify the exact picknkick user dir on the server and edit
# the line that starts with `scp -P 55011`.

Set-Location $PSScriptRoot

Write-Host "Running tests..." -ForegroundColor Green
npm test
if ($LASTEXITCODE -ne 0) { Write-Host "Tests failed — aborting deploy." -ForegroundColor Red; exit 1 }

Write-Host "Building site..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed — aborting deploy." -ForegroundColor Red; exit 1 }

Write-Host "Uploading to server..." -ForegroundColor Green
scp -P 55011 -r dist/* root@111.90.141.72:/var/www/picknkick_co_usr/data/www/picknkick.com/

Write-Host "Done! Site deployed to https://picknkick.com" -ForegroundColor Green
