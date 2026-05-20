from fastapi import APIRouter, Depends
from ..database import fetchall, fetchone
from ..auth import get_current_user

router = APIRouter(prefix="/api/filters", tags=["filters"])


CALL_CLASS_LABELS = {
    "target_call": "Целевой звонок",
    "unsuitable_candidate": "Неподходящий кандидат",
    "candidate_refused": "Кандидат отказался",
    "no_contact_or_disconnected": "Нет контакта / прерван",
    "wrong_number": "Не тот номер",
    "other": "Прочее",
}

KPI_LEVEL_LABELS = {
    "high": "Высокий",
    "normal": "Средний",
    "low": "Низкий",
}


@router.get("/call-classes")
def get_call_classes(_user=Depends(get_current_user)):
    rows = fetchall(
        """
        SELECT call_class, COUNT(*) AS count
        FROM ai_analysis_results
        WHERE call_class IS NOT NULL
        GROUP BY call_class
        ORDER BY count DESC
        """
    )
    return [
        {
            "value": r["call_class"],
            "label": CALL_CLASS_LABELS.get(r["call_class"], r["call_class"]),
            "count": r["count"],
        }
        for r in rows
    ]


@router.get("/kpi-levels")
def get_kpi_levels(_user=Depends(get_current_user)):
    rows = fetchall(
        """
        SELECT kpi_level, COUNT(*) AS count
        FROM ai_analysis_results
        WHERE kpi_level IS NOT NULL
        GROUP BY kpi_level
        """
    )
    ordered = sorted(rows, key=lambda r: {"high": 1, "normal": 2, "low": 3}.get(r["kpi_level"], 9))
    return [
        {
            "value": r["kpi_level"],
            "label": KPI_LEVEL_LABELS.get(r["kpi_level"], r["kpi_level"]),
            "count": r["count"],
        }
        for r in ordered
    ]


@router.get("/date-range")
def get_date_range(_user=Depends(get_current_user)):
    return fetchone(
        """
        SELECT
            MIN(call_date)::text AS min_date,
            MAX(call_date)::text AS max_date
        FROM call_transcriptions
        """
    )
