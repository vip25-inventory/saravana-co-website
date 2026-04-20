#!/bin/bash
# Vercel Build Script — runs from REPO ROOT (d:/spl equivalent on Vercel)
# Set Vercel "Build Command" to: sh django_backend/build.sh

set -e  # Exit on any error

echo "📦 Installing Dependencies..."
pip install -r django_backend/requirements.txt

echo "🗄️  Running Migrations..."
cd django_backend && python manage.py migrate --noinput

echo "🎨 Collecting Static Files..."
python manage.py collectstatic --noinput

echo "✅ Build Complete!"
