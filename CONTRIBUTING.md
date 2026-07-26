# Contributing to PitWall

Thank you for your interest in contributing! This is a portfolio project, but issues, suggestions, and improvements are welcome.

## How to Contribute

### 1. Report Issues

Open a GitHub issue at https://github.com/Mohammad-Adnan-Shakil/pitwall/issues

Include:
- A clear title and description
- Steps to reproduce (if bug)
- Expected vs actual behavior
- Screenshots or logs (if applicable)

### 2. Suggest Features

Open a feature request issue with:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives considered

### 3. Submit Code Changes

#### a. Fork the repo
```
git clone https://github.com/YOUR_USERNAME/pitwall.git
cd pitwall
```

#### b. Create a branch
```
git checkout -b feat/your-feature-name
```

#### c. Set up the environment
```
pip install -r requirements.txt
```

Set required environment variables:
- `PITWALL_DB_URL` — Neon Postgres with pgvector extension
- `OPENROUTER_API_KEY` — OpenRouter API key

#### d. Make your changes

Follow existing code style:
- Python: type hints, descriptive names, no unused imports
- JavaScript/React: functional components, hooks, Tailwind classes

#### e. Test your changes
```
uvicorn main:app --host 0.0.0.0 --port 8000
```

For frontend changes:
```
cd frontend
npm install
npm run dev
```

#### f. Commit and push
```
git add .
git commit -m "Description of your change"
git push origin feat/your-feature-name
```

#### g. Open a pull request

Go to https://github.com/Mohammad-Adnan-Shakil/pitwall and open a PR against `main`.

## Code of Conduct

- Be respectful and constructive
- Focus on the code, not the person
- Assume good faith

## Questions?

Email: muhammedadnanshakil456@gmail.com
