# FAQ

## Can the chatbot submit leave automatically?

No. The chatbot can draft a leave request and explain the required fields, but submission requires user confirmation through the leave workflow.

## Why does Power BI show a setup message?

Power BI embedding requires backend credentials and report configuration. If those are missing, the frontend shows a setup message instead of a fake report.

## What happens without an LLM key?

The RAG chatbot uses deterministic grounded fallback. It retrieves relevant local knowledge chunks and answers from those chunks with source names.

## What happens without the AI service?

The Node backend returns deterministic fallback responses and marks them with `fallback: true`.
