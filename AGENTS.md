# Repository agent guide

This file governs the whole `dsh-skill-manage` repository.

## Identity

- Package: `dsh-skill-manage`
- Display name: `Skill 管理` (local `pnpm run build:local` compiles `小鱼的技能`)
- DSH rows: `dsh-skill-manage` (host) and `preset-dsh-skill-manage` (conversation preset), inserted by `cordis.patch.yml`.
- RPC channel: `/skill-manage`
- Data directory: `$DSH_HOME/dsh-skill-manage/`
- Config file: `$DSH_HOME/dsh-skill-manage/config.json` (absolute skill paths)
- Framework: `dsh-plugin-product-framework` framework pack v1; `.framework.json` records variables/layers, mapping in `docs/FRAMEWORK-LAYERS.md`.
- Bundled guide: `docs/FRAMEWORK-EXTRACTION-GUIDE.md`, served by the `guide/read` RPC and opened from the Add Skill dialog.

## Boundaries

- `src/core/` is pure logic shared by host, browser and tests. No `node:*`, DOM, `fetch`, `process`, or `eval`.
- `src/host/` owns IO and orchestration: `store` (atomic config writes), `audit` (Python + JS fallback), `files` (path containment), `features/skills` (live `skills`/`commands` registrations).
- `src/agent.js` is a thin read-only tool layer over `src/host/runtime.js`; it never reads/writes the store directly.
- `src/ui/` talks to the host only through `src/ui/api.js`.
- `src/client.jsx` registers `sidebar.panellist` (order 30) and `main`.
- Generated `lib/` is produced by `pnpm run build`; do not hand-edit it.

## Live registrations

- Adding a skill calls `skills.register(...)` and `commands.register(...)`; both return disposers kept per skill id.
- Removing a skill, disabling its menu entry, or reloading `SKILL.md` disposes the old registrations before creating new ones.
- Editing `SKILL.md` through the page refreshes the runtime skill and the slash command.
- Never register a skill without a parsed `name`/`description`; never register a command that collides with another managed skill.

## Security

- Skill folders are untrusted. Every read/write resolves `realpath` and must stay inside the skill root; symlinks are not followed.
- Only conservative text extensions are editable; files over 1 MB and binary/UTF-8 failures are refused.
- User text never becomes a file path inside the data directory; ids use the `skm_` prefix.
- Delete refuses drive roots, the user home, `~/.dsh`, `~/.dsh/skills`, Desktop, and any folder containing them.
- No `eval`/`new Function`, no `dangerouslySetInnerHTML`, no network calls, no secrets.

## Commands

```bash
pnpm install
pnpm test
pnpm run build
pnpm run build:local
pnpm run check
```

## Validation

- `pnpm test` covers core parsing/config, the RPC envelope, file containment and the packaging contract.
- A new browser endpoint must exist in the host route table in `src/index.js`.
- Verify UI changes in a running DSH with a scratch `DSH_HOME` and a `link:` install when possible. Do not test in the user's daily profile.
- After a host change, fully quit and reopen DSH; refreshing the page is not enough.
