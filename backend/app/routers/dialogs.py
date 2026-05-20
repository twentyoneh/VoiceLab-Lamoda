import json
from datetime import datetime, timezone
from fastapi import APIRouter, Query, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from ..database import fetchall, fetchone, execute
from ..auth import get_current_user

router = APIRouter(prefix="/api/dialogs", tags=["dialogs"])


@router.get("")
def list_dialogs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    call_class: Optional[str] = Query(None),
    kpi_level: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None),
    max_score: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("call_date"),
    sort_dir: str = Query("desc"),
    _user=Depends(get_current_user),
):
    allowed_sort = {"call_date", "base_score", "total_score", "kpi_level", "call_class"}
    if sort_by not in allowed_sort:
        sort_by = "call_date"
    sort_dir = "DESC" if sort_dir.lower() == "desc" else "ASC"

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
    if min_score is not None:
        clauses.append("r.base_score >= %s")
        params.append(min_score)
    if max_score is not None:
        clauses.append("r.base_score <= %s")
        params.append(max_score)
    if search:
        clauses.append("(t.call_id ILIKE %s OR r.summary ILIKE %s OR t.source_file ILIKE %s)")
        params.append(f"%{search}%")
        params.append(f"%{search}%")
        params.append(f"%{search}%")

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    order_col = f"r.{sort_by}" if sort_by in {"base_score", "total_score", "kpi_level", "call_class"} else f"t.{sort_by}"

    offset = (page - 1) * size

    count_row = fetchone(
        f"""
        SELECT COUNT(*) AS total
        FROM call_transcriptions t
        LEFT JOIN ai_analysis_results r ON t.call_id = r.call_id
        {where}
        """,
        tuple(params),
    )
    total = count_row["total"] if count_row else 0

    rows = fetchall(
        f"""
        SELECT
            t.call_id,
            t.call_date::text AS call_date,
            t.source_file,
            r.call_class,
            r.kpi_level,
            r.base_score,
            r.bonus_score,
            r.total_score,
            r.confidence,
            r.summary,
            CASE
                WHEN r.meta->'main_problems' IS NOT NULL
                     AND jsonb_array_length(r.meta->'main_problems') > 0
                THEN jsonb_array_length(r.meta->'main_problems')
                ELSE 0
            END AS problems_count
        FROM call_transcriptions t
        LEFT JOIN ai_analysis_results r ON t.call_id = r.call_id
        {where}
        ORDER BY {order_col} {sort_dir} NULLS LAST
        LIMIT %s OFFSET %s
        """,
        tuple(params) + (size, offset),
    )

    return {
        "items": rows,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if total else 0,
    }


# ── Detail ───────────────────────────────────────────────────────────────────

def _extract_turns(raw_turns: list) -> list:
    """Roles in source data are not reliably separated, return turns as-is text."""
    out = []
    for t in raw_turns:
        text = t.get("text", "") if isinstance(t, dict) else ""
        if text:
            out.append({"text": text})
    return out


@router.get("/{call_id}")
def get_dialog(call_id: str, _user=Depends(get_current_user)):
    session = fetchone(
        """
        SELECT
            t.call_id,
            t.call_date::text AS call_date,
            t.source_file,
            t.created_at::text AS created_at
        FROM call_transcriptions t
        WHERE t.call_id = %s
        """,
        (call_id,),
    )
    if not session:
        raise HTTPException(status_code=404, detail="Диалог не найден")

    transcript_row = fetchone(
        "SELECT dialog_json FROM call_transcriptions WHERE call_id = %s",
        (call_id,),
    )

    turns = []
    if transcript_row and transcript_row.get("dialog_json"):
        dj = transcript_row["dialog_json"]
        if isinstance(dj, str):
            try:
                dj = json.loads(dj)
            except Exception:
                dj = {}
        raw_turns = dj.get("turns", []) if isinstance(dj, dict) else []
        turns = _extract_turns(raw_turns)

    analysis_row = fetchone(
        """
        SELECT
            meta,
            call_class,
            confidence,
            base_score,
            bonus_score,
            total_score,
            kpi_level,
            summary,
            model_name,
            prompt_version,
            created_at
        FROM ai_analysis_results
        WHERE call_id = %s
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (call_id,),
    )

    analysis = None
    if analysis_row and analysis_row.get("meta"):
        meta = analysis_row["meta"]
        if isinstance(meta, str):
            meta = json.loads(meta)

        criteria_obj = meta.get("criteria", {}) or {}
        base_criteria = []
        for name, data in criteria_obj.items():
            base_criteria.append({
                "name": name,
                "score": data.get("score"),
                "max_score": data.get("max_score"),
                "comment": data.get("comment", ""),
                "evidence": data.get("evidence", ""),
            })
        base_criteria.sort(key=lambda x: (x["score"] or 0))

        bonus_obj = meta.get("extra_bonus", {}) or {}
        bonus_criteria = []
        for name, data in bonus_obj.items():
            bonus_criteria.append({
                "name": name,
                "score": data.get("score"),
                "max_score": data.get("max_score"),
                "comment": data.get("comment", ""),
                "evidence": data.get("evidence", ""),
            })
        bonus_criteria.sort(key=lambda x: (x["score"] or 0))

        analysis = {
            "call_class": analysis_row.get("call_class"),
            "confidence": float(analysis_row["confidence"]) if analysis_row.get("confidence") is not None else None,
            "base_score": analysis_row.get("base_score"),
            "bonus_score": analysis_row.get("bonus_score"),
            "total_score": analysis_row.get("total_score"),
            "kpi_level": analysis_row.get("kpi_level"),
            "summary": analysis_row.get("summary"),
            "main_problems": meta.get("main_problems", []) or [],
            "recommendations": meta.get("recommendations", []) or [],
            "criteria": base_criteria,
            "bonus_criteria": bonus_criteria,
            "model_name": analysis_row.get("model_name"),
            "prompt_version": analysis_row.get("prompt_version"),
            "analyzed_at": (
                analysis_row["created_at"].isoformat()
                if analysis_row.get("created_at")
                else None
            ),
            "dispute": meta.get("dispute"),
        }

    return {
        "session": session,
        "transcript": turns,
        "analysis": analysis,
    }


# ── Dispute ──────────────────────────────────────────────────────────────────

class DisputeBody(BaseModel):
    score: float = Field(..., ge=0, le=100)
    comment: str = Field("", max_length=2000)


@router.put("/{call_id}/dispute")
def add_dispute(
    call_id: str,
    body: DisputeBody,
    user: dict = Depends(get_current_user),
):
    if not fetchone("SELECT 1 FROM call_transcriptions WHERE call_id = %s", (call_id,)):
        raise HTTPException(status_code=404, detail="Диалог не найден")

    row = fetchone(
        "SELECT id FROM ai_analysis_results WHERE call_id = %s ORDER BY created_at DESC LIMIT 1",
        (call_id,),
    )
    if not row:
        raise HTTPException(status_code=422, detail="ИИ-анализ для этого диалога отсутствует")

    dispute = {
        "score": body.score,
        "comment": body.comment,
        "username": user["username"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    affected = execute(
        """
        UPDATE ai_analysis_results
        SET meta = jsonb_set(meta, '{dispute}', %s::jsonb, true)
        WHERE id = %s
        """,
        (json.dumps(dispute), row["id"]),
    )

    if affected == 0:
        raise HTTPException(status_code=500, detail="Не удалось сохранить оспаривание")

    return {"ok": True, "dispute": dispute}


@router.delete("/{call_id}/dispute")
def remove_dispute(call_id: str, user: dict = Depends(get_current_user)):
    execute(
        """
        UPDATE ai_analysis_results
        SET meta = meta - 'dispute'
        WHERE call_id = %s
        """,
        (call_id,),
    )
    return {"ok": True}
