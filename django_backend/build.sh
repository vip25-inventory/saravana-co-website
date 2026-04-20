#!/bin/bash
# Vercel Build Command Script
# Set your Vercel Project "Build Command" to: sh build.sh

echo "📦 Installing Dependencies..."
python3.11 -m pip install -r requirements.txt

echo "🎨 Collecting Static Files..."
python3.11 manage.py collectstatic --noinput

echo "✅ Build Complete!"
