#!/bin/bash
set -e
cd "$(dirname "$0")/backend"

if [ ! -d ".venv" ]; then
  echo "Создаю виртуальное окружение..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

echo "Запускаю backend на http://localhost:8000"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
