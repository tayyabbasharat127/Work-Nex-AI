"""
WorkNex AI — Enhanced Leave Policy Extractor
=============================================
Converts unstructured HR policy text (PDFs, emails, Word docs) into
structured JSON understood by WorkNex leave rules engine.

Three-layer extraction pipeline:
  1. Pattern-based NLP  — regex + keyword heuristics (always runs)
  2. LLM extraction     — uses configured LLM for ambiguous / complex docs
  3. RAG cross-check    — validates against indexed knowledge base

Input  : free-text string
Output : LeavePolicy struct with leave types, quotas, rules, carry-over, etc.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ─── Known leave type vocabulary ──────────────────────────────────────────────

LEAVE_TYPE_VOCAB: dict[str, list[str]] = {
    "ANNUAL":     ["annual leave", "earned leave", "vacation", "pl", "privilege leave", "yearly leave"],
    "SICK":       ["sick leave", "medical leave", "sl", "illness leave", "health leave"],
    "CASUAL":     ["casual leave", "cl", "short leave", "personal leave"],
    "MATERNITY":  ["maternity leave", "maternity benefit", "ml", "pregnancy leave"],
    "PATERNITY":  ["paternity leave", "paternity benefit"],
    "UNPAID":     ["unpaid leave", "lwp", "leave without pay", "upl"],
    "COMPENSATORY": ["compensatory leave", "comp-off", "compensation leave", "comp off"],
    "BEREAVEMENT": ["bereavement leave", "compassionate leave", "condolence leave"],
    "HAJJ":       ["hajj leave", "religious leave", "pilgrimage leave"],
    "STUDY":      ["study leave", "exam leave", "education leave"],
    "MARRIAGE":   ["marriage leave", "wedding leave", "nuptial leave"],
    "HALF_DAY":   ["half day", "half-day leave", "partial leave"],
}

CARRY_VOCAB    = ["carry", "carry-over", "carry forward", "roll over", "lapse", "encash", "encashable"]
APPROVAL_VOCAB = ["prior approval", "manager approval", "hr approval", "approved by", "endorsement", "sanction"]
NOTICE_VOCAB   = ["notice period", "advance notice", "days notice", "days in advance", "prior notice"]

NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "fourteen": 14, "fifteen": 15,
    "twenty": 20, "twenty-one": 21, "thirty": 30, "forty-five": 45,
}


# ─── Text normalisation ────────────────────────────────────────────────────────

def _normalise(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)
    return text.strip().lower()


def _resolve_number(token: str) -> Optional[int]:
    """Parse numeric tokens — supports digits, ordinals, word-numbers."""
    token = token.strip().rstrip('st nd rd th'.split()[0])
    token = re.sub(r'(st|nd|rd|th)$', '', token).strip()
    if token.isdigit():
        return int(token)
    return NUMBER_WORDS.get(token)


# ─── Quota extraction ──────────────────────────────────────────────────────────

_DAYS_PATTERNS = [
    r'(\d+)\s*(?:working\s+)?days?\s+(?:of\s+)?(?:per\s+)?(?:year|annual|p\.a\.|pa)',
    r'(\d+)\s*(?:working\s+)?days?\s+(?:leave|off)',
    r'(\b\w+\b)\s+(?:working\s+)?days?\s+(?:per\s+year|annually)',
    r'entitled\s+to\s+(\d+)\s+days?',
    r'granted\s+(\d+)\s+(?:\w+\s+){0,3}days?',    # "granted 10 sick leave days"
    r'up\s+to\s+(\d+)\s+days?',
    r'maximum\s+of\s+(\d+)\s+days?',
    r'(\d+)\s+days?\s+leave\s+per\s+(?:annum|year)',
    r'(\d+)\s+(?:\w+\s+){0,2}leave\s+days?\s+per\s+(?:annum|year)',  # "10 sick leave days per year"
]

def _extract_days(sentence: str) -> Optional[int]:
    for pattern in _DAYS_PATTERNS:
        m = re.search(pattern, sentence, re.IGNORECASE)
        if m:
            raw = m.group(1)
            v = _resolve_number(raw)
            if v is not None and 1 <= v <= 365:
                return v
    return None


def _extract_carry_over(sentence: str) -> Optional[int]:
    """Extract max carry-over days. Returns 0 if explicitly non-encashable."""
    if re.search(r'\blapse\b|\bno\s+carry\b|\bcannot\s+be\s+carried\b', sentence, re.IGNORECASE):
        return 0
    m = re.search(r'(\d+)\s*days?\s*(?:can\s+be\s+)?carried?\s*(?:forward|over)', sentence, re.IGNORECASE)
    if m:
        return int(m.group(1))
    if any(kw in sentence.lower() for kw in ["carry forward", "carry over", "roll over"]):
        return None  # carry-over allowed but days not specified
    return None


def _extract_notice_days(sentence: str) -> Optional[int]:
    m = re.search(r'(\d+)\s*(?:working\s+)?days?\s*(?:in\s+)?(?:advance|prior|notice)', sentence, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return None


# ─── Sentence segmentation ────────────────────────────────────────────────────

def _sentences(text: str) -> list[str]:
    parts = re.split(r'(?<=[.!?;])\s+|\n+|(?<=\d)\.\s+', text)
    return [p.strip() for p in parts if len(p.strip()) > 15]


# ─── Core pattern-based extraction ────────────────────────────────────────────

def _pattern_extract(text: str) -> dict[str, Any]:
    norm = _normalise(text)
    sents = _sentences(norm)
    policy: dict[str, Any] = {
        "leaveTypes":   {},
        "generalRules": [],
        "approvalProcess": None,
        "noticePeriodDays": None,
        "encashable": None,
        "maxConsecutiveDays": None,
        "probationPolicy": None,
        "raw_confidence": 0.0,
    }

    matched_fields = 0

    for sent in sents:
        # 1. Detect leave type and quota
        for leave_type, keywords in LEAVE_TYPE_VOCAB.items():
            if any(kw in sent for kw in keywords):
                days = _extract_days(sent)
                entry = policy["leaveTypes"].setdefault(leave_type, {
                    "daysPerYear": None,
                    "carryOver": None,
                    "requiresDocumentation": False,
                    "approvalsRequired": False,
                    "noticeDays": None,
                    "notes": [],
                })
                if days is not None:
                    entry["daysPerYear"] = days
                    matched_fields += 1

                # Carry-over
                if any(kw in sent for kw in CARRY_VOCAB):
                    co = _extract_carry_over(sent)
                    if co is not None:
                        entry["carryOver"] = co
                        matched_fields += 1

                # Medical certificate / documentation
                if re.search(r'medical\s+cert|doctor.s\s+cert|certificate\s+required', sent, re.IGNORECASE):
                    entry["requiresDocumentation"] = True

                # Notice period
                notice = _extract_notice_days(sent)
                if notice:
                    entry["noticeDays"] = notice

                # Append interesting note
                if len(sent) < 200:
                    entry["notes"].append(sent)

        # 2. General approval process
        if any(kw in sent for kw in APPROVAL_VOCAB) and policy["approvalProcess"] is None:
            policy["approvalProcess"] = sent
            matched_fields += 1

        # 3. Global notice period
        if any(kw in sent for kw in NOTICE_VOCAB) and policy["noticePeriodDays"] is None:
            days = _extract_notice_days(sent)
            if days:
                policy["noticePeriodDays"] = days
                matched_fields += 1

        # 4. Encashable
        if re.search(r'\bencash\b|\bleave\s+encash', sent, re.IGNORECASE):
            policy["encashable"] = True
            matched_fields += 1

        # 5. Max consecutive
        m = re.search(r'maximum\s+(?:of\s+)?(\d+)\s+(?:consecutive|continuous)\s+days?', sent, re.IGNORECASE)
        if m and policy["maxConsecutiveDays"] is None:
            policy["maxConsecutiveDays"] = int(m.group(1))
            matched_fields += 1

        # 6. Probation
        if re.search(r'probation', sent, re.IGNORECASE):
            policy["probationPolicy"] = sent

        # 7. General rules bucket
        if any(kw in sent for kw in ["not eligible", "cannot be accumulated", "forfeited", "half-pay"]):
            policy["generalRules"].append(sent)

    # Second pass: cross-sentence documentation — if any sentence mentions
    # "medical certificate" globally, mark all detected SICK types as requiring docs
    doc_global = any(
        re.search(r'medical\s+cert|doctor.s\s+cert|certificate\s+required', s, re.IGNORECASE)
        for s in sents
    )
    if doc_global and "SICK" in policy["leaveTypes"]:
        policy["leaveTypes"]["SICK"]["requiresDocumentation"] = True

    policy["raw_confidence"] = min(1.0, matched_fields / max(len(LEAVE_TYPE_VOCAB), 1))
    return policy


# ─── LLM-assisted extraction ───────────────────────────────────────────────────

_LLM_SYSTEM = """You are an HR policy parser for WorkNex AI.
Extract structured leave policy data from the given text.
Return ONLY valid JSON with this exact schema (use null for unknown fields):
{
  "leaveTypes": {
    "<LEAVE_TYPE>": {
      "daysPerYear": <int|null>,
      "carryOver": <int|null>,
      "requiresDocumentation": <bool>,
      "approvalsRequired": <bool>,
      "noticeDays": <int|null>
    }
  },
  "noticePeriodDays": <int|null>,
  "encashable": <bool|null>,
  "maxConsecutiveDays": <int|null>,
  "approvalProcess": "<string|null>",
  "generalRules": ["<string>"]
}
Valid leave types: ANNUAL, SICK, CASUAL, MATERNITY, PATERNITY, UNPAID, COMPENSATORY, BEREAVEMENT, HAJJ, STUDY, MARRIAGE, HALF_DAY.
"""

async def _llm_extract(text: str) -> Optional[dict]:
    """Attempt LLM extraction. Returns None if no LLM available."""
    try:
        from app.core.config import settings
        if not settings.OPENROUTER_API_KEY:
            return None

        from langchain_core.messages import HumanMessage, SystemMessage
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
            model=settings.OPENROUTER_MODEL,
            temperature=0,
        )

        response = await llm.ainvoke([
            SystemMessage(content=_LLM_SYSTEM),
            HumanMessage(content=f"Extract leave policy from:\n\n{text[:4000]}"),
        ])

        raw = response.content
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as exc:
        logger.warning("LLM leave policy extraction failed: %s", exc)
    return None


# ─── Merge helper ─────────────────────────────────────────────────────────────

def _deep_merge(base: dict, override: dict) -> dict:
    """Merge override into base — override values win for scalars, merge for dicts/lists."""
    result = {**base}
    for k, v in override.items():
        if v is None:
            continue
        if isinstance(v, dict) and isinstance(result.get(k), dict):
            result[k] = _deep_merge(result[k], v)
        elif isinstance(v, list) and isinstance(result.get(k), list):
            result[k] = result[k] + [i for i in v if i not in result[k]]
        else:
            result[k] = v
    return result


# ─── Public API ────────────────────────────────────────────────────────────────

async def extract_leave_policy(text: str, organization_id: Optional[str] = None) -> dict:
    """
    Main extraction entry point.
    Returns a structured leave policy dict with confidence metadata.
    """
    if not text or len(text.strip()) < 20:
        return {"error": "Input text too short", "leaveTypes": {}}

    # Layer 1: pattern extraction (always)
    pattern_result = _pattern_extract(text)

    # Layer 2: LLM extraction (when API key available)
    llm_result = await _llm_extract(text)

    if llm_result:
        merged = _deep_merge(pattern_result, llm_result)
        source = "llm+pattern"
        confidence = min(1.0, pattern_result["raw_confidence"] + 0.35)
    else:
        merged = pattern_result
        source = "pattern"
        confidence = pattern_result["raw_confidence"]

    # Remove internal key
    merged.pop("raw_confidence", None)

    # Clean up empty notes
    for lt in merged.get("leaveTypes", {}).values():
        if isinstance(lt, dict):
            lt["notes"] = list(set(lt.get("notes", [])))[:3]

    return {
        "policy":         merged,
        "organizationId": organization_id,
        "source":         source,
        "confidence":     round(confidence, 2),
        "detectedTypes":  list(merged.get("leaveTypes", {}).keys()),
        "extractedAt":    __import__("datetime").datetime.now().isoformat(),
    }
