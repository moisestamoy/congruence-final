#!/bin/bash
# Script to fix deployment by pushing to GitHub

# 1. Configure Git (Local only, does not affect global settings)
git config user.name "Moises Tamoy"
git config user.email "moises@example.com" 

# 2. Initialize Git
git init
git add .
git commit -m "Fix: Add vercel.json and build config"

# 3. Rename branch to main
git branch -M main

# 4. Link to your GitHub repo
git remote remove origin 2>/dev/null
git remote add origin https://github.com/moisestamoy/congruence.git

# 5. Push (force overwrite to sync local state)
echo "---------------------------------------------------"
echo "Attempting to push to GitHub..."
echo "If asked for a password, use a Personal Access Token."
echo "---------------------------------------------------"
git push -u origin main --force
