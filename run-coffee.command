#!/bin/bash
# Double-click this file in Finder to launch Coffee locally
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📦 Installing dependencies if needed..."
npm install

echo ""
echo "☕ Starting Coffee dev server..."
echo "➜  Open http://localhost:5173 in your browser"
echo ""
npm run dev
