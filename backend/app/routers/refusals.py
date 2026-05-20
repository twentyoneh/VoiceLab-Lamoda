"""
Аналитика отказов.

Под «отказами» понимаются звонки с call_class IN ('candidate_refused', 'unsuitable_candidate').
Через query-параметр refusal_type можно сузить выборку до одного класса.
"""

from fastapi import APIRouter, Query, Depends
from typing import Optional
from ..database import fetchall, fetchone
from ..auth import get_current_user

router = APIRouter(prefix="/api/refusals", tags=["refusals"])

REFUSAL_CLASSES = ("candidate_refused", "unsuitable_candidate")


def _refusal_filters(
    from_date: Optional[str],
    to_date: Optional[str],
    refusal_type: Optional[str],
    kpi_level: Optional[str],
) -> tuple[list, list]:
    clauses, params = [], []
    if refusal_type and refusal_type in REFUSAL_CLASSES:
        clauses.append("r.call_class = %s")
        params.append(refusal_type)
    else:
        clauses.append("r.call_class IN %s")
        params.append(REFUSAL_CLASSES)
    if from_date:
        clauses.append("t.call_date >= %s")
        params.append(from_date)
    if to_date:
        clauses.append("t.call_date <= %s")
        params.append(to_date)
    if kpi_level:
        clauses.append("r.kpi_level = %s")
        params.append(kpi_level)
    return clauses, params


@router.get("/overview")
def overview(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    refusal_type: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    """KPI по отказам: количество, доля, отработка возражений, упущенные возможности."""
    clauses, params = _refusal_filters(from_date, to_date, refusal_type, kpi_level)
    where_ref = "WHERE " + " AND ".join(clauses)

    # Общая база звонков для расчёта доли отказов (фильтруется только по дате)
    base_clauses, base_params = [], []
    if from_date:
        base_clauses.append("t.call_date >= %s")
        base_params.append(from_date)
    if to_date:
        base_clauses.append("t.call_date <= %s")
        base_params.append(to_date)
    base_where = ("WHERE " + " AND ".join(base_clauses)) if base_clauses else ""

    row = fetchone(
        f"""
        WITH refusals AS (
            SELECT
                t.id AS t_id,
                r.id AS r_id,
                r.call_class,
                r.base_score,
                r.bonus_score,
                r.kpi_level,
                (r.meta->'extra_bonus'->'objection_handling'->>'score')::numeric AS obj_score,
                (r.meta->'extra_bonus'->'objection_handling'->>'max_score')::numeric AS obj_max
            FROM call_transcriptions t
            JOIN ai_analysis_results r ON t.call_id = r.call_id
            {where_ref}
        ),
        totals AS (
            SELECT COUNT(DISTINCT r.id) AS analyzed_total
            FROM call_transcriptions t
            LEFT JOIN ai_analysis_results r ON t.call_id = r.call_id
            {base_where}
        )
        SELECT
            (SELECT COUNT(*) FROM refusals) AS refusals_count,
            (SELECT COUNT(*) FROM refusals WHERE call_class = 'candidate_refused') AS candidate_refused_count,
            (SELECT COUNT(*) FROM refusals WHERE call_class = 'unsuitable_candidate') AS unsuitable_candidate_count,
            (SELECT analyzed_total FROM totals) AS analyzed_total,
            CASE
                WHEN (SELECT analyzed_total FROM totals) > 0
                THEN ROUND(
                    100.0 * (SELECT COUNT(*) FROM refusals)::numeric
                    / (SELECT analyzed_total FROM totals), 1)
                ELSE NULL
            END AS refusal_rate_pct,
            ROUND((SELECT AVG(base_score) FROM refusals)::numeric, 1) AS avg_base_score,
            ROUND((SELECT AVG(obj_score) FROM refusals WHERE obj_score IS NOT NULL)::numeric, 1) AS avg_objection_handling,
            (SELECT COUNT(*) FROM refusals
                WHERE obj_score IS NOT NULL AND obj_max > 0 AND obj_score < obj_max * 0.5
            ) AS missed_objection_count,
            (SELECT COUNT(*) FROM refusals WHERE kpi_level = 'low') AS low_kpi_refusals
        """,
        tuple(params) + tuple(base_params),
    )
    return row


@router.get("/by-date")
def by_date(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    refusal_type: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    """Динамика отказов по дням + средняя отработка возражений."""
    clauses, params = _refusal_filters(from_date, to_date, refusal_type, kpi_level)
    where = "WHERE " + " AND ".join(clauses)

    return fetchall(
        f"""
        SELECT
            t.call_date::date::text AS date,
            COUNT(*) AS count,
            ROUND(AVG(
                (r.meta->'extra_bonus'->'objection_handling'->>'score')::numeric
            )::numeric, 1) AS avg_objection_handling,
            ROUND(AVG(r.base_score)::numeric, 1) AS avg_base_score
        FROM call_transcriptions t
        JOIN ai_analysis_results r ON t.call_id = r.call_id
        {where}
        GROUP BY t.call_date::date
        ORDER BY t.call_date::date
        """,
        tuple(params),
    )


@router.get("/by-type")
def by_type(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    """Разбивка отказов: candidate_refused vs unsuitable_candidate."""
    clauses, params = _refusal_filters(from_date, to_date, None, kpi_level)
    where = "WHERE " + " AND ".join(clauses)

    return fetchall(
        f"""
        SELECT
            r.call_class AS refusal_type,
            COUNT(*) AS count,
            ROUND(AVG(r.base_score)::numeric, 1) AS avg_base_score,
            ROUND(AVG(
                (r.meta->'extra_bonus'->'objection_handling'->>'score')::numeric
            )::numeric, 1) AS avg_objection_handling
        FROM call_transcriptions t
        JOIN ai_analysis_results r ON t.call_id = r.call_id
        {where}
        GROUP BY r.call_class
        ORDER BY count DESC
        """,
        tuple(params),
    )


@router.get("/by-kpi-level")
def by_kpi_level(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    refusal_type: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    """Распределение отказов по уровню KPI рекрутера."""
    clauses, params = _refusal_filters(from_date, to_date, refusal_type, None)
    where = "WHERE " + " AND ".join(clauses)

    return fetchall(
        f"""
        SELECT
            COALESCE(r.kpi_level, 'unknown') AS kpi_level,
            COUNT(*) AS count
        FROM call_transcriptions t
        JOIN ai_analysis_results r ON t.call_id = r.call_id
        {where}
        GROUP BY r.kpi_level
        ORDER BY
            CASE COALESCE(r.kpi_level, 'unknown')
                WHEN 'high' THEN 1
                WHEN 'normal' THEN 2
                WHEN 'low' THEN 3
                ELSE 4
            END
        """,
        tuple(params),
    )


@router.get("/objection-handling-distribution")
def objection_handling_distribution(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    refusal_type: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    """
    Распределение оценок отработки возражений на звонках с отказами.
    Бакеты: 0 (не отработал), 1-5 (слабо), 6-10 (средне), 11-15 (хорошо), 16-20 (отлично).
    """
    clauses, params = _refusal_filters(from_date, to_date, refusal_type, kpi_level)
    where = "WHERE " + " AND ".join(clauses)

    return fetchall(
        f"""
        WITH scored AS (
            SELECT
                COALESCE(
                    (r.meta->'extra_bonus'->'objection_handling'->>'score')::numeric,
                    0
                ) AS s
            FROM call_transcriptions t
            JOIN ai_analysis_results r ON t.call_id = r.call_id
            {where}
        )
        SELECT
            CASE
                WHEN s = 0 THEN '0 (не отработал)'
                WHEN s <= 5 THEN '1-5'
                WHEN s <= 10 THEN '6-10'
                WHEN s <= 15 THEN '11-15'
                ELSE '16-20'
            END AS bucket,
            COUNT(*) AS count
        FROM scored
        GROUP BY bucket
        ORDER BY MIN(s)
        """,
        tuple(params),
    )


@router.get("/problems")
def problems(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    refusal_type: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    """Топ проблем (main_problems) на звонках с отказами."""
    clauses, params = _refusal_filters(from_date, to_date, refusal_type, kpi_level)
    where = "WHERE " + " AND ".join(clauses)

    return fetchall(
        f"""
        SELECT problem, COUNT(*) AS count
        FROM call_transcriptions t
        JOIN ai_analysis_results r ON t.call_id = r.call_id,
             jsonb_array_elements_text(r.meta->'main_problems') AS problem
        {where}
        GROUP BY problem
        ORDER BY count DESC
        LIMIT 20
        """,
        tuple(params),
    )


@router.get("/recommendations")
def recommendations(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    refusal_type: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    """Топ рекомендаций для отказных звонков."""
    clauses, params = _refusal_filters(from_date, to_date, refusal_type, kpi_level)
    where = "WHERE " + " AND ".join(clauses)

    return fetchall(
        f"""
        SELECT recommendation, COUNT(*) AS count
        FROM call_transcriptions t
        JOIN ai_analysis_results r ON t.call_id = r.call_id,
             jsonb_array_elements_text(r.meta->'recommendations') AS recommendation
        {where}
        GROUP BY recommendation
        ORDER BY count DESC
        LIMIT 20
        """,
        tuple(params),
    )


@router.get("/criteria-compare")
def criteria_compare(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    """
    Сравнение средних оценок по 8 базовым критериям:
    отказные звонки vs целевые звонки. Помогает увидеть, где проседает рекрутер
    именно на отказных звонках.
    """
    clauses, params = [], []
    if from_date:
        clauses.append("t.call_date >= %s")
        params.append(from_date)
    if to_date:
        clauses.append("t.call_date <= %s")
        params.append(to_date)
    extra = (" AND " + " AND ".join(clauses)) if clauses else ""

    return fetchall(
        f"""
        SELECT
            key AS criteria,
            ROUND(AVG(CASE WHEN r.call_class IN ('candidate_refused','unsuitable_candidate')
                THEN (value->>'score')::numeric END), 2) AS refusals_avg,
            ROUND(AVG(CASE WHEN r.call_class = 'target_call'
                THEN (value->>'score')::numeric END), 2) AS target_avg,
            MAX((value->>'max_score')::numeric) AS max_possible
        FROM call_transcriptions t
        JOIN ai_analysis_results r ON t.call_id = r.call_id,
             jsonb_each(r.meta->'criteria')
        WHERE r.call_class IN ('candidate_refused','unsuitable_candidate','target_call')
        {extra}
        GROUP BY key
        ORDER BY (
            COALESCE(MAX((value->>'max_score')::numeric), 0)
            - COALESCE(AVG(CASE WHEN r.call_class IN ('candidate_refused','unsuitable_candidate')
                THEN (value->>'score')::numeric END), 0)
        ) DESC
        """,
        tuple(params),
    )
