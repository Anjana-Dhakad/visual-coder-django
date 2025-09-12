#!/bin/bash

# Vercel ke server par zaroori build tools install karein
apt-get update
apt-get install -y build-essential

# Ab requirements.txt se packages install karein
pip install -r requirements.txt

# Static files ko collect karein (Django ke liye)
python3.9 manage.py collectstatic --noinput