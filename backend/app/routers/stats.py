from fastapi import APIRouter, Query, Depends
from typing import Optional
from ..database import fetchall, fetchone
from ..auth import get_current_user

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _common_filters(
    from_date: Optional[str],
    to_date: Optional[str],
    call_class: Optional[str],
    kpi_level: Optional[str],
) -> tuple[list, list]:
    clauses, params = [], []
    if from_date:
        clauses.append("t.call_date >= %s")
        params.append(from_date)
    if to_date:
        clauses.append("t.call_date <= %s")
        params.append(to_date)
    if call_class:
        clauses.append("r.call_class = %s")
        params.append(call_class)
    if kpi_level:
        clauses.append("r.kpi_level = %s")
        params.append(kpi_level)
    return clauses, params


@router.get("/overview")
def overview(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    call_class: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    clauses, params = _common_filters(from_date, to_date, call_class, kpi_level)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    row = fetchone(
        f"""
        SELECT
            COUNT(DISTINCT t.id) AS total_calls,
            COUNT(DISTINCT r.id) AS analyzed_calls,
            ROUND(AVG(r.base_score)::numeric, 1) AS avg_base_score,
            ROUND(AVG(r.bonus_score)::numeric, 1) AS avg_bonus_score,
            ROUND(AVG(r.total_score)::numeric, 1) AS avg_total_score,
            COUNT(DISTINCT CASE WHEN r.kpi_level = 'high' THEN t.id END) AS high_kpi_count,
            COUNT(DISTINCT CASE WHEN r.kpi_level = 'low' THEN t.id END) AS low_kpi_count,
            COUNT(DISTINCT CASE WHEN r.call_class = 'target_call' THEN t.id END) AS target_call_count
        FROM call_transcriptions t
        LEFT JOIN ai_analysis_results r ON t.call_id = r.call_id
        {where}
        """,
        tuple(params),
    )
    return row


@router.get("/by-date")
def by_date(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    call_class: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    clauses, params = _common_filters(from_date, to_date, call_class, kpi_level)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    return fetchall(
        f"""
        SELECT
            t.call_date::date::text AS date,
            COUNT(DISTINCT t.id) AS count,
            ROUND(AVG(r.base_score)::numeric, 1) AS avg_score
        FROM call_transcriptions t
        LEFT JOIN ai_analysis_results r ON t.call_id = r.call_id
        {where}
        GROUP BY t.call_date::date
        ORDER BY t.call_date::date
        """,
        tuple(params),
    )


@router.get("/by-call-class")
def by_call_class(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    clauses, params = _common_filters(from_date, to_date, None, kpi_level)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    return fetchall(
        f"""
        SELECT
            COALESCE(r.call_class, 'unknown') AS call_class,
            COUNT(DISTINCT t.id) AS count,
            ROUND(AVG(r.base_score)::numeric, 1) AS avg_score
        FROM call_transcriptions t
        LEFT JOIN ai_analysis_results r ON t.call_id = r.call_id
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
    call_class: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    clauses, params = _common_filters(from_date, to_date, call_class, None)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    return fetchall(
        f"""
        SELECT
            COALESCE(r.kpi_level, 'unknown') AS kpi_level,
            COUNT(DISTINCT t.id) AS count,
            ROUND(AVG(r.base_score)::numeric, 1) AS avg_score
        FROM call_transcriptions t
        LEFT JOIN ai_analysis_results r ON t.call_id = r.call_id
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


@router.get("/criteria")
def criteria(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    call_class: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    clauses, params = _common_filters(from_date, to_date, call_class, kpi_level)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    return fetchall(
        f"""
        SELECT
            key AS criteria,
            ROUND(AVG((value->>'score')::numeric), 2) AS avg_score,
            MAX((value->>'max_score')::numeric) AS max_possible,
            COUNT(*) AS sample_count
        FROM call_transcriptions t
        JOIN ai_analysis_results r ON t.call_id = r.call_id,
             jsonb_each(r.meta->'criteria')
        {where}
        GROUP BY key
        ORDER BY avg_score ASC
        """,
        tuple(params),
    )


@router.get("/bonus-criteria")
def bonus_criteria(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    call_class: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    clauses, params = _common_filters(from_date, to_date, call_class, kpi_level)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    return fetchall(
        f"""
        SELECT
            key AS criteria,
            ROUND(AVG((value->>'score')::numeric), 2) AS avg_score,
            MAX((value->>'max_score')::numeric) AS max_possible,
            COUNT(*) AS sample_count
        FROM call_transcriptions t
        JOIN ai_analysis_results r ON t.call_id = r.call_id,
             jsonb_each(r.meta->'extra_bonus')
        {where}
        GROUP BY key
        ORDER BY avg_score ASC
        """,
        tuple(params),
    )


@router.get("/problems")
def problems(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    call_class: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    """Top problems aggregated from meta.main_problems arrays."""
    clauses, params = _common_filters(from_date, to_date, call_class, kpi_level)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    return fetchall(
        f"""
        SELECT
            problem,
            COUNT(*) AS count
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
    call_class: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    clauses, params = _common_filters(from_date, to_date, call_class, kpi_level)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    return fetchall(
        f"""
        SELECT
            recommendation,
            COUNT(*) AS count
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


@router.get("/score-distribution")
def score_distribution(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    call_class: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    _user=Depends(get_current_user),
):
    """Distribution of base_score (0..100) in 20-point buckets."""
    clauses, params = _common_filters(from_date, to_date, call_class, kpi_level)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    return fetchall(
        f"""
        SELECT
            CASE
                WHEN r.base_score < 20 THEN '0-19'
                WHEN r.base_score < 40 THEN '20-39'
                WHEN r.base_score < 60 THEN '40-59'
                WHEN r.base_score < 80 THEN '60-79'
                ELSE '80-100'
            END AS range,
            COUNT(*) AS count
        FROM call_transcriptions t
        JOIN ai_analysis_results r ON t.call_id = r.call_id
        {where}
        GROUP BY range
        ORDER BY MIN(r.base_score)
        """,
        tuple(params),
    )
