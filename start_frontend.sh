#!/bin/bash
set -e
cd "$(dirname "$0")/frontend"

if [ ! -d "node_modules" ]; then
  echo "Устанавливаю зависимости..."
  npm install
fi

echo "Запускаю frontend на http://localhost:5173"
npm run dev
