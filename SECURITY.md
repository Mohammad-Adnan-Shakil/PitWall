# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in PitWall, please report it privately by emailing **muhammedadnanshakil456@gmail.com**.

Please do **not** open a public GitHub issue for security vulnerabilities.

## What to Include

- A description of the vulnerability
- Steps to reproduce it
- Potential impact
- Any suggested fixes (if known)

## Response Timeline

- **Acknowledgment:** Within 48 hours of report
- **Investigation & fix:** Typically within 7–14 days
- **Disclosure:** Once a fix is deployed, we will publish an advisory

## Scope

The following components are in scope:
- `main.py` — FastAPI service layer
- `agent.py` — LangGraph agent pipeline
- `retrieval.py` — SQL and vector retrieval
- `frontend/` — React UI

Out of scope (sibling projects):
- `FakeOut-AI/` (wav2vec2 deep model — disabled)

## Responsible Disclosure

We ask that you:
- Give us reasonable time to fix the issue before public disclosure
- Do not exploit the vulnerability beyond what is necessary to demonstrate it
- Act in good faith to help improve project security

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < latest| :x:                |
