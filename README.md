# VoiceLab — Аналитика диалогов операторов

## Быстрый старт

Нужны два терминала:

**Терминал 1 — Backend:**
```bash
./start_backend.sh
```
Сервер будет доступен на http://localhost:8000

**Терминал 2 — Frontend:**
```bash
./start_frontend.sh
```
Интерфейс будет доступен на http://localhost:5173

## Настройка

Скопируйте пример конфига и заполните своими данными:

```bash
cp backend/.env.example backend/.env
```

Отредактируйте `backend/.env`:

```env
DB_HOST=...
DB_PORT=...
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
DB_SCHEMA=apteki

SECRET_KEY=<случайная строка, минимум 32 символа>

# Пользователи системы: логин:пароль через запятую
USERS=admin:your_password,analyst:your_password
```

## Структура проекта

```
voicelab/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI приложение
│   │   ├── config.py        # Настройки из .env
│   │   ├── database.py      # Подключение к PostgreSQL
│   │   ├── auth.py          # JWT авторизация
│   │   └── routers/
│   │       ├── auth.py      # POST /api/auth/login
│   │       ├── stats.py     # GET /api/stats/*
│   │       ├── dialogs.py   # GET /api/dialogs/*
│   │       └── filters.py   # GET /api/filters/*
│   ├── .env.example         # Шаблон конфига (без паролей)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.tsx    # Дашборд с KPI и графиками
        │   ├── Analytics.tsx    # Рейтинг операторов
        │   ├── Dialogs.tsx      # Список диалогов
        │   └── DialogDetail.tsx # Карточка диалога
        └── components/
```

## API

| Метод | Путь | Описание |
|-------|------|----------|
| POST | /api/auth/login | Авторизация |
| GET | /api/stats/overview | Главные KPI |
| GET | /api/stats/by-date | Динамика по дням |
| GET | /api/stats/by-operator | Статистика операторов |
| GET | /api/stats/by-channel | Статистика по каналам |
| GET | /api/stats/criteria | Средние баллы критериев |
| GET | /api/stats/errors | Топ критических ошибок |
| GET | /api/dialogs | Список диалогов |
| GET | /api/dialogs/{session_id} | Карточка диалога |
| PUT | /api/dialogs/{session_id}/dispute | Оспорить оценку |

Swagger UI: http://localhost:8000/docs
