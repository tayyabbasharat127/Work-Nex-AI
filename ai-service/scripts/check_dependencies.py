"""Check required Python packages for the WorkNex AI service."""
from __future__ import annotations

import importlib.util
import sys


REQUIRED = {
    "fastapi": "fastapi",
    "uvicorn": "uvicorn",
    "python-dotenv": "dotenv",
    "requests": "requests",
    "joblib": "joblib",
}

OPTIONAL = {
    "scikit-learn": "sklearn",
    "chromadb": "chromadb",
}


def is_available(module_name: str) -> bool:
    return importlib.util.find_spec(module_name) is not None


def main() -> int:
    missing_required = []
    missing_optional = []

    for package, module in REQUIRED.items():
        if not is_available(module):
            missing_required.append(package)

    for package, module in OPTIONAL.items():
        if not is_available(module):
            missing_optional.append(package)

    if missing_required:
        print("FAIL AI_DEPENDENCIES")
        print("Missing required packages: " + ", ".join(missing_required))
        print("Install with: python -m pip install -r requirements.txt")
        if missing_optional:
            print("Missing optional packages: " + ", ".join(missing_optional))
        return 1

    print("PASS AI_DEPENDENCIES")
    if missing_optional:
        print("WARN Missing optional packages: " + ", ".join(missing_optional))
        print("Fallback artifacts can still be generated without optional packages.")
        print("ChromaDB is optional; set RAG_VECTOR_BACKEND=json or USE_CHROMA=false for JSON-only RAG indexing.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
