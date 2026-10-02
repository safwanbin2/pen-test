# AI usage log

A running log that becomes the README's "How I used AI" section. Add 1–3 lines per phase.

**Tools:** Claude Code (Claude Opus) in VS Code.

**How I worked:** I researched the domain and wrote the plan first, then asked for one phase at a time. Business rules were written as pure functions with tests, so AI output could be checked mechanically. I reviewed every diff before committing.

| Phase | What AI did | What I changed / caught |
|---|---|---|
| Planning | Researched PEN Group's context (franchised UK higher education, multi-campus, Student Finance-funded students) and turned the brief into a prioritised feature list, phased plan and decisions log. | Cut scope to the four workflows; chose the edge cases worth building. |
| 0 — Scaffold | Scaffolded Next.js 16 + Tailwind 4 + shadcn/ui, Prisma 7 (driver adapter `@prisma/adapter-pg`, `prisma.config.ts`), Docker Postgres, Vitest, npm scripts. | npm's `latest` tag for Prisma was an **8.0 release candidate**, so I pinned stable 7.10.0. Scaffold's `.gitignore` (`.env*`) would have hidden `.env.example`, so I added an exception. `prisma init` dropped AI-agent skill files for three editors into the repo, so I removed them. Vitest 5 needed `@types/node` 22 to match the Node 22 runtime. |
| 0 — No-Docker path | I pushed back on Docker being required. AI tested Prisma's embedded Postgres (`prisma dev`) against our real client: parallel queries, transactions and `migrate dev` all worked, so it became a documented zero-install option alongside Docker and "bring your own Postgres". | Prisma 7 refuses `migrate reset` when run by an AI agent without the user's explicit consent. AI didn't bypass the guard; it deleted its own throwaway test server instead. |
| Design — tokens | Claude Design produced the theme tokens from a structured brief ([DESIGN_BRIEF.md](DESIGN_BRIEF.md), [DESIGN_PROMPTS.md](DESIGN_PROMPTS.md)): teal primary, neutral zinc base, semantic status tokens (overdue / late / withheld / info / warning / success) with AA foreground pairs, light + dark. | Dropping its `globals.css` in as-is would have broken the installed shadcn "Nova" components: it removed `shadcn/tailwind.css` (the `data-open`/`data-closed` variants that dialogs and dropdowns animate with), `--font-heading`, and the `rounded-xl`/`rounded-4xl` radius steps. I merged instead: design colours and base styles, Nova plumbing kept. Original kept unmodified in `design/registry-globals.css`. |
