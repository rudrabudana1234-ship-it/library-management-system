#!/usr/bin/env bash
set -o errexit

# Install Python dependencies.
pip install -r requirements.txt

# Collect Django admin and application static files.
python manage.py collectstatic --no-input

# Apply database schema migrations.
python manage.py migrate
