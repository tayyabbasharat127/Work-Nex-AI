"""RAG service — ChromaDB semantic search with BM25 fallback."""
from __future__ import annotations

import json
import logging
import math
import re
from collections import Counter
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE_DIR = ROOT / "knowledge"
CHROMA_DIR = ROOT / "vector_store" / "chroma"
JSON_INDEX = ROOT / "vector_store" / "knowledge_index.json"

COLLECTION_NAME = "worknex_knowledge"

RETRIEVAL_STOP_WORDS = {
    "about", "answer", "completely", "could", "does", "have", "policy",
    "please", "related", "rule", "should", "tell", "that", "their",
    "there", "these", "this", "unrelated", "what", "when", "where",
    "which", "with", "would", "your",
}


# ---------------------------------------------------------------------------
# ChromaDB semantic search (primary)
# ---------------------------------------------------------------------------

def _get_chroma_collection():
    try:
        import chromadb
        client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        return collection
    except Exception as exc:
        logger.warning("ChromaDB unavailable: %s", exc)
        return None


def _index_knowledge_base(collection) -> None:
    """Index all knowledge markdown files into ChromaDB (skips if already indexed)."""
    if not KNOWLEDGE_DIR.exists():
        return
    existing_ids: set[str] = set()
    try:
        result = collection.get(include=[])
        existing_ids = set(result.get("ids", []))
    except Exception:
        pass

    docs, metadatas, ids = [], [], []
    for path in sorted(KNOWLEDGE_DIR.glob("*.md")):
        text = re.sub(r"\s+", " ", path.read_text(encoding="utf-8")).strip()
        # Chunk into ~600-char segments for better retrieval granularity
        chunks = [text[i : i + 600] for i in range(0, len(text), 500)]
        for idx, chunk in enumerate(chunks):
            doc_id = f"{path.stem}_{idx}"
            if doc_id not in existing_ids and chunk:
                docs.append(chunk)
                metadatas.append({"source": path.name, "chunk": idx})
                ids.append(doc_id)

    if docs:
        collection.add(documents=docs, metadatas=metadatas, ids=ids)
        logger.info("Indexed %d chunks into ChromaDB", len(docs))


def _chroma_retrieve(query: str, limit: int = 4) -> list[dict[str, Any]]:
    collection = _get_chroma_collection()
    if collection is None:
        return []
    try:
        _index_knowledge_base(collection)
        results = collection.query(
            query_texts=[query],
            n_results=min(limit, max(1, collection.count())),
            include=["documents", "metadatas", "distances"],
        )
        chunks = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            chunks.append({
                "text": doc,
                "source": meta.get("source", "unknown"),
                "score": round(1.0 - float(dist), 4),
            })
        return sorted(chunks, key=lambda c: c["score"], reverse=True)
    except Exception as exc:
        logger.warning("ChromaDB query failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# BM25-style TF-IDF fallback
# ---------------------------------------------------------------------------

def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _load_json_chunks() -> list[dict[str, str]]:
    if JSON_INDEX.exists():
        try:
            return json.loads(JSON_INDEX.read_text(encoding="utf-8"))
        except Exception:
            pass
    chunks: list[dict[str, str]] = []
    for path in sorted(KNOWLEDGE_DIR.glob("*.md")):
        text = re.sub(r"\s+", " ", path.read_text(encoding="utf-8")).strip()
        if text:
            chunks.append({"id": path.name, "source": path.name, "text": text[:1400]})
    return chunks


def _bm25_score(query: str, chunk: str) -> float:
    q = Counter(_tokens(query))
    c = Counter(_tokens(chunk))
    if not q or not c:
        return 0.0
    overlap = sum(min(q[t], c[t]) for t in q)
    return overlap / math.sqrt(sum(q.values()) * sum(c.values()))


def _has_lexical_anchor(query: str, chunk: str) -> bool:
    query_terms = {
        token for token in _tokens(query)
        if len(token) >= 4 and token not in RETRIEVAL_STOP_WORDS
    }
    return bool(query_terms.intersection(_tokens(chunk)))


def _bm25_retrieve(query: str, limit: int = 3) -> list[dict[str, Any]]:
    ranked = []
    for chunk in _load_json_chunks():
        score = _bm25_score(query, chunk["text"])
        if score > 0 and _has_lexical_anchor(query, chunk["text"]):
            ranked.append({**chunk, "score": score})
    return sorted(ranked, key=lambda x: x["score"], reverse=True)[:limit]


# ---------------------------------------------------------------------------
# Unified retrieve — ChromaDB first, BM25 fallback
# ---------------------------------------------------------------------------

def retrieve(query: str, limit: int = 4) -> list[dict[str, Any]]:
    # Require at least one lexical anchor in addition to semantic proximity.
    # This prevents a vector store from returning an unrelated nearest
    # neighbour merely because every query must have a nearest vector.
    results = [
        chunk for chunk in _chroma_retrieve(query, limit)
        if _has_lexical_anchor(query, chunk["text"])
    ]
    if results:
        return results
    logger.debug("ChromaDB returned no results; falling back to BM25")
    return _bm25_retrieve(query, limit)


# ---------------------------------------------------------------------------
# Intent-based quick actions
# ---------------------------------------------------------------------------

def _intent_actions(message: str, role: str) -> list[dict[str, str]]:
    text = message.lower()
    actions: list[dict[str, str]] = []
    if "leave balance" in text:
        actions.append({"type": "navigate", "label": "Open leave balances", "path": "/dashboard/employee/leaves"})
    if "attendance" in text:
        path = "/dashboard/manager/attendance" if role == "MANAGER" else "/dashboard/employee/attendance"
        actions.append({"type": "navigate", "label": "Open attendance", "path": path})
    if "performance" in text:
        actions.append({"type": "navigate", "label": "Open performance", "path": "/dashboard/employee/performance"})
    if "forecast" in text and role in ("ADMIN", "SUPER_ADMIN"):
        actions.append({"type": "navigate", "label": "Open forecast", "path": "/dashboard/admin/forecast"})
    return actions


# ---------------------------------------------------------------------------
# Public answer function
# ---------------------------------------------------------------------------

async def answer(message: str, role: str = "EMPLOYEE", user_context: dict | None = None) -> dict[str, Any]:
    # Query text is untrusted data. This service performs retrieval/extractive
    # selection only and never interprets query or document text as commands.
    message = message[:1000]
    chunks = retrieve(message)
    actions = _intent_actions(message, role)

    if not chunks:
        return {
            "answer": (
                "I don't have enough policy context to answer that safely. "
                "Try asking about leave policy, attendance rules, role permissions, "
                "or system dashboards."
            ),
            "message": "Insufficient context.",
            "sources": [],
            "confidence": 0.25,
            "actions": actions,
            "fallback": True,
        }

    # Build answer from top matching chunks
    context = " ".join(c["text"] for c in chunks)
    sentences = re.split(r"(?<=[.!?])\s+", context)
    query_tokens = set(_tokens(message))
    selected = [s for s in sentences if query_tokens.intersection(_tokens(s))][:5]
    if not selected:
        selected = sentences[:3]
    answer_text = " ".join(selected).strip()

    if role == "EMPLOYEE" and any(w in message.lower() for w in ["team", "all employees", "organization"]):
        answer_text += " (Employee access is self-scoped — team/org-wide data requires manager or admin access.)"

    sources = sorted({c["source"] for c in chunks})
    top_score = chunks[0]["score"] if chunks else 0
    confidence = min(0.90, 0.50 + top_score * 0.5)

    return {
        "answer": answer_text,
        "message": answer_text,
        "sources": sources,
        "confidence": round(confidence, 2),
        "actions": actions,
        "fallback": False,
    }
