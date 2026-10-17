# Project rules

Claude Code reads this file automatically at the start of every session.
It applies to every project created from this template.

## Step 0 — Ask before building (mandatory)

At the very start of a new task, before writing any code, ask the user exactly one question:

> "Do you want me to challenge this idea first? (yes / no)"

- **no** → build the best version you can, quickly. Make reasonable decisions on your
  own, log them in `DECISIONS.md`, and don't ask further questions unless you are truly blocked.
- **yes** → call the `idea-challenger` agent, share its analysis with the user in a short,
  readable form, then discuss and refine the idea together before writing any code.
  Once the user is happy, summarize the agreed scope in `DECISIONS.md` and start building.

Shortcuts (skip the question):
- A prompt starting with `quick:` means **no**.
- A prompt starting with `challenge:` means **yes**.
- Follow-up tasks on an existing feature (bug fixes, small changes) don't need the question.

The user often writes or dictates in French. Reply to them in French,
but write all code, comments, commit messages and documentation in English.

## Philosophy

- **Vanilla first**: native HTML, CSS and JavaScript (ES modules, `import`/`export`).
- **No heavy frameworks** (React, Vue, Angular, Next…) and no jQuery.
- **No build step** when possible: the project must run by serving `index.html`
  with a plain static server (`npx serve` or `python3 -m http.server`).
- **Dependencies**: zero by default. A dependency is only acceptable when rewriting it
  would be unreasonable (e.g. cryptography, 3D rendering with three.js). In that case:
  justify it in `DECISIONS.md`, pin an exact version, and prefer small, maintained
  libraries with no sub-dependencies.
- **Simplicity**: readable code beats clever code.

## Default structure

```
index.html
css/style.css
js/main.js          # entry point
js/modules/…        # one file per responsibility
tests/…             # tests using Node's built-in runner (node --test)
README.md           # what the app does and how to run it
DECISIONS.md        # important technical and product decisions, with reasons
```

## Code conventions

- Modern JavaScript (ES2022+), `const` by default, never `var`.
- Short functions, explicit names, comments only where they add value.
- No global variables; everything goes through modules.
- CSS: custom properties on `:root`, mobile first, dark mode support
  (`prefers-color-scheme`).
- Accessibility: semantic HTML, `alt` text, sufficient contrast, keyboard navigation.

## Security (non-negotiable)

- **No secrets in the repo**: no API keys, passwords or tokens. Use environment
  variables and a `.env` file listed in `.gitignore`. Provide `.env.example` with
  placeholder values when configuration is needed.
- Never insert user-controlled data with `innerHTML`: use `textContent`
  or build elements with `createElement`.
- No `eval`, `new Function`, or `setTimeout` with a string.
- Validate every input (forms, URL parameters, fetched data, `localStorage`).
- Add a strict Content-Security-Policy to `index.html` whenever possible.

## Tests

- Use Node's built-in test runner (`node --test`): no dependency needed.
- At minimum, test the business logic (pure functions in `js/modules/`).
- All tests must pass before the work is considered done.

## Workflow for every task

0. **Ask** the challenge question (see Step 0).
1. **Understand**: restate the request in a few lines.
2. **Plan**: list the files to create or change.
3. **Build** in small steps, running tests along the way.
4. **Security review**: call the `security-reviewer` agent and fix every
   critical or high severity finding.
5. **Quality review**: call the `quality-reviewer` agent and apply the relevant fixes.
6. **Verify**: tests pass, the app loads with no console errors.
7. **Deliver**: work on a branch (`feature/short-name`), write clear commits
   (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`), then open a Pull Request to `main`
   with a summary: what was done, decisions made, things the user should check.
   **Never push directly to `main`.**

## Never

- Add a dependency without justifying it in `DECISIONS.md`.
- Delete or disable tests to make them pass.
- Commit generated files, `node_modules`, or secrets.
- Deploy to a server unless explicitly asked.
