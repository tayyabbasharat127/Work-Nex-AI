"""Ingest markdown knowledge into JSON first, then optional ChromaDB."""
from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE_DIR = ROOT / "knowledge"
VECTOR_DIR = ROOT / "vector_store"
JSON_INDEX = VECTOR_DIR / "knowledge_index.json"


def chunk_text(text: str, size: int = 700, overlap: int = 120) -> list[str]:
    clean = re.sub(r"\s+", " ", text).strip()
    if not clean:
        return []
    chunks = []
    start = 0
    while start < len(clean):
        chunks.append(clean[start:start + size])
        start += max(1, size - overlap)
    return chunks


def read_documents() -> list[dict]:
    docs = []
    for path in sorted(KNOWLEDGE_DIR.glob("*.md")):
        for index, chunk in enumerate(chunk_text(path.read_text(encoding="utf-8"))):
            docs.append({
                "id": hashlib.sha1(f"{path.name}:{index}:{chunk}".encode("utf-8")).hexdigest(),
                "source": path.name,
                "text": chunk,
            })
    return docs


def ingest_json(docs: list[dict]) -> None:
    VECTOR_DIR.mkdir(parents=True, exist_ok=True)
    JSON_INDEX.write_text(json.dumps(docs, indent=2), encoding="utf-8")
    print(f"wrote JSON vector fallback index: {JSON_INDEX}")


def ingest_chroma(docs: list[dict]) -> bool:
    vector_backend = os.getenv("RAG_VECTOR_BACKEND", "").strip().lower()
    use_chroma = os.getenv("USE_CHROMA", "").strip().lower()
    if vector_backend == "json" or use_chroma in {"0", "false", "no", "off"}:
        print("ChromaDB disabled; using JSON fallback index only")
        return False

    try:
        import chromadb

        client = chromadb.PersistentClient(path=str(VECTOR_DIR / "chroma"))
        collection = client.get_or_create_collection("worknex_knowledge")
        if docs:
            collection.upsert(
                ids=[doc["id"] for doc in docs],
                documents=[doc["text"] for doc in docs],
                metadatas=[{"source": doc["source"]} for doc in docs],
            )
        print(f"upserted {len(docs)} chunks into ChromaDB")
        return True
    except Exception as exc:
        print(f"WARNING ChromaDB ingestion skipped; JSON fallback remains available: {exc}")
        return False


def main() -> None:
    docs = read_documents()
    if not docs:
        raise SystemExit("No markdown knowledge documents found")
    ingest_json(docs)
    used_chroma = ingest_chroma(docs)
    print(f"knowledge chunks={len(docs)} chroma={used_chroma}")


if __name__ == "__main__":
    main()
