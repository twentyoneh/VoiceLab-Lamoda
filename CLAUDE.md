# CLAUDE.md — VoiceLab Lamoda: HR-аналитика звонков

## Что это за проект

Web-платформа для анализа качества HR-звонков рекрутеров.
ИИ-агенты оценивают записи разговоров с кандидатами и складывают результаты в PostgreSQL.
Эта система читает данные из БД и строит аналитику: KPI-дашборды, разбор по
типам звонков, слабые места по критериям, ТОП проблем и рекомендаций.

---

## Архитектура

### Стек

```
Browser → nginx → FastAPI :8000 (uvicorn) → PostgreSQL (внешний)
            ↓
       /dist/ (статика React)
```

| Слой | Технология | Версия |
|---|---|---|
| Backend | Python FastAPI + uvicorn | 3.11 / 0.111 |
| Frontend | React + TypeScript + Vite | 18.3 / 5.3 |
| Charts | Recharts | 2.12 |
| DB driver | psycopg2 (sync) | 2.9 |
| Auth | JWT (python-jose) | — |
| Web server | nginx | 1.18+ |

### База данных — схема `lamoda`

```
call_transcriptions       ← транскрипт звонка
  id, call_id (uniq), call_date, dialog_json (JSONB),
  turns_text, source_file, created_at
  dialog_json: {"turns": [{"role": "1-ый_Участник", "text": "..."}, ...]}

ai_analysis_results       ← результат ИИ-анализа
  id, call_id (FK), meta (JSONB), call_class, confidence,
  base_score, bonus_score, total_score, kpi_level,
  summary, prompt_version, model_name, created_at,
  main_problems, recommendations, criteria, extra_bonus
  meta: {
    summary, criteria {8 ключей}, extra_bonus {3 ключа},
    main_problems[], recommendations[],
    base_score, bonus_score, total_score,
    call_class, confidence, kpi_level,
    dispute?: {score, comment, username, created_at}
  }
```

### Оценки

- **base_score**: 0–100 — основная шкала (сумма 8 критериев)
- **bonus_score**: 0–60 — дополнительные баллы (3 бонусных критерия)
- **total_score**: 0–160 — `base + bonus`
- **kpi_level**: `high` / `normal` / `low`
- **call_class**: `target_call`, `unsuitable_candidate`, `candidate_refused`,
  `no_contact_or_disconnected`, `wrong_number`, `other`

### 8 базовых критериев + 3 бонусных

База (макс. 100):
- greeting (10), needs_discovery (15), vacancy_presentation (10),
  candidate_profile_assessment (10), invitation_or_correct_refusal (10),
  dialog_closing (10), speech_quality (15), dialog_management (20)

Бонус (макс. 60):
- objection_handling (20), helpfulness_and_alternatives (20), friend_contacts (20)

### Структура файлов

```
/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI, CORS, роутеры
│   │   ├── config.py         # Settings из .env
│   │   ├── database.py       # psycopg2 sync
│   │   ├── auth.py           # JWT
│   │   └── routers/
│   │       ├── auth.py       # POST /api/auth/login
│   │       ├── stats.py      # GET /api/stats/*
│   │       ├── dialogs.py    # GET|PUT|DELETE /api/dialogs/*
│   │       └── filters.py    # GET /api/filters/*
│   ├── .env                  # ТОЛЬКО на сервере, не в git
│   ├── .env.example
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── App.tsx
        ├── pages/
        │   ├── Login.tsx
        │   ├── Dashboard.tsx     # KPI + графики
        │   ├── Dialogs.tsx       # таблица + фильтры + Excel
        │   └── DialogDetail.tsx  # транскрипт + анализ + оспаривание
        ├── components/
        │   ├── Layout.tsx
        │   ├── AudioPlayer.tsx   # заглушка (нет источника записей)
        │   ├── FilterBar.tsx
        │   ├── KpiCard.tsx
        │   └── ScoreBadge.tsx
        ├── hooks/
        │   ├── useAuth.ts
        │   └── useTheme.ts
        ├── api/
        │   ├── client.ts
        │   └── index.ts
        └── types/index.ts
```

---

## API эндпоинты

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/auth/login` | `{username, password}` → JWT |
| GET | `/api/stats/overview` | total_calls, avg_base_score, high_kpi_count, target_call_count |
| GET | `/api/stats/by-date` | Динамика по дням |
| GET | `/api/stats/by-call-class` | Разбивка по типу звонка |
| GET | `/api/stats/by-kpi-level` | По уровню KPI |
| GET | `/api/stats/criteria` | Средние баллы 8 базовых критериев |
| GET | `/api/stats/bonus-criteria` | Средние по 3 бонусным |
| GET | `/api/stats/problems` | ТОП проблем из main_problems |
| GET | `/api/stats/recommendations` | ТОП рекомендаций |
| GET | `/api/stats/score-distribution` | Гистограмма по диапазонам base_score |
| GET | `/api/dialogs` | Список с фильтрами и пагинацией |
| GET | `/api/dialogs/{call_id}` | Карточка: сессия + транскрипт + анализ |
| PUT | `/api/dialogs/{call_id}/dispute` | Оспорить: `{score, comment}` → в meta JSONB |
| DELETE | `/api/dialogs/{call_id}/dispute` | Снять оспаривание |
| GET | `/api/filters/call-classes` | Справочник типов звонков |
| GET | `/api/filters/kpi-levels` | Справочник уровней KPI |
| GET | `/api/filters/date-range` | min/max call_date |

---

## Аутентификация

- JWT (HS256), срок 480 минут
- Пользователи хранятся в `.env` как `USERS=login:pass,login2:pass2`
- Нет таблицы пользователей в БД — намеренно, для простоты
- Ролей нет — все видят всё

---

## Известные особенности

1. **psycopg2 синхронный** — при большой нагрузке (>100 RPS) нужно asyncpg
2. **Оспаривание в meta JSONB** — нет истории, только последнее оспаривание
3. **Excel-выгрузка диалогов до 2000 строк** — лимит в `getDialogs(page=1, size=2000)`
4. **Нет кэширования** — каждый запрос к `/api/stats/*` идёт в БД
5. **Роли в `dialog_json` не разделены** — все турны помечены одним лейблом
   `1-ый_Участник`, поэтому транскрипт показывается как нумерованный
   список реплик без подписи «рекрутер/кандидат»
6. **Прослушивание звонков не подключено** — БД хранит только имя `source_file`;
   `AudioPlayer.tsx` оставлен как UI-заглушка до подключения хранилища MP3

---

## Возможные следующие шаги

### Высокий приоритет
- **Подключить хранилище аудио** — стриминг MP3 по `source_file`
- **Справочник рекрутеров** — таблица `lamoda.operators (code, fio)`, маппинг
  по коду из `_in_NNN_` в `source_file` → вернуть страницу рейтинга
- **Роли пользователей** — руководитель / аналитик / рекрутер

### Средний
- **История оспариваний** — отдельная таблица вместо JSONB
- **Полнотекстовый поиск** по `turns_text` через `to_tsvector` PostgreSQL
- **Экспорт PDF-отчёта** по периоду
- **Реальное разделение ролей в транскрипте** — диаризация на стороне ASR

### Низкий
- **Материализованные представления** для агрегатных статистик
- **SSO / LDAP** авторизация
- **Адаптивная мобильная версия**

---

## Разработка локально

```bash
# Backend
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # заполнить реальными данными
uvicorn app.main:app --reload --port 8000

# Frontend (другой терминал)
cd frontend
npm install
npm run dev   # → http://localhost:5173 (прокси /api/ → localhost:8000)
```

Swagger UI: http://localhost:8000/docs
