---
name: check
description: Run linting and typechecking
---

# Code Quality Checks

Run all quality checks and fix ALL errors/warnings:

## Step 1: Type Check

```bash
npm run typecheck
```

Fix all type errors before continuing.

## Step 2: Lint

```bash
npm run lint
```

Fix all linting errors/warnings before continuing.

## Step 3: Format Check

```bash
npm run format:check
```

If format issues found, run:
```bash
npm run format
```

## Step 4: Build (if needed)

If you made API/schema changes, verify build:

```bash
npm run build
```

Fix all build errors before continuing.

---

**Zero Tolerance**: All checks must pass with ZERO errors/warnings.
