---
name: commit
description: Run checks, commit with AI message, and push
---

# Commit with Quality Checks

## Step 1: Run Quality Checks

Run all checks and fix ALL errors:

```bash
npm run typecheck && npm run lint && npm run format:check
```

If format check fails, run `npm run format` and re-check.

## Step 2: Check Git Status

```bash
git status
git diff
git log -3 --oneline
```

Review changes to understand what was modified.

## Step 3: Stage Changes

```bash
git add .
```

## Step 4: Create Commit

Generate a concise commit message that:
- Summarizes the "why" (not just the "what")
- Follows the repository's commit style
- Is 1-2 sentences maximum

```bash
git commit -m "Your commit message here"
```

## Step 5: Push to Remote

```bash
git push
```

If push fails due to diverged branches, review the situation and ask the user how to proceed.

---

**Important**: Only commit when explicitly asked by the user.
