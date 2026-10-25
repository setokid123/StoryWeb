# StoryWeb workspace rule

This repository is shared with Codex and Claude Code. Read `AGENTS.md` (the shared rules, in Vietnamese), `README.md` and `docs/DESIGN_SYSTEM.md` before modifying files.

The site, Trạm Truyện 2D, is a self-hosted WordPress site deployed on Railway: pushing `main` deploys the live site. The theme `wp-content/themes/thu-cac` is presentation only (PHP templates, CSS, plain JS). The plugin `wp-content/plugins/storyweb-core` owns all logic: stories and chapters, URLs, server-side chapter locking, link unlock, stats and Facebook posting.

By default your responsibility is the theme: layout, CSS, responsive behaviour, accessibility and the liquid-glass design system, including the seasonal looks (plain, Halloween, Christmas). The user may assign other work. Never decide reading access in the theme: a locked chapter's body must never reach the browser (HTML, REST, RSS, embed, sitemap, search) without server-side permission, and changing the theme must not expose it. Escape every printed value with `esc_*`.

Use Vietnamese copy. Support 320 px screens, keyboard navigation and `prefers-reduced-motion`. Keep the reader page calm: no background decoration and no scroll effects there. Label external links clearly and never auto-open a popup or auto-redirect readers. When you change theme CSS or JS, bump `Version` in `style.css` and `THU_CAC_VERSION` in `functions.php`.

Work on an `antigravity/*` branch (a separate worktree when another agent is working at the same time). Do not delete or overwrite another agent's uncommitted changes. Keep temporary files in `.scratch/` (ignored by git), never at the repo root. Before handing off, run `npm test` and the Playground checks in `scripts/wp/README.md` (at least `check-browser.mjs` and `check-content.mjs`). Hand off with a screenshot or a short walkthrough, the files you changed and the checks you ran.

Shared MCP tools (see `docs/MCP_TOOLS.md`): when you take on a task, run Memory `search_nodes` for its area (for example `season`, `reader-preferences`, `css-tokens`). Before using a library or WordPress API, query Context7 for the version in use. At handoff, record decisions, gotchas and open issues in Memory and say so in the handoff (`Memory: đã cập nhật <entity>`). Never store secrets, cookies, reader data or chapter text. The repo is the source of truth: if Memory disagrees, follow the repo and correct Memory. Before editing in a new worktree, confirm that `context7` and `memory` are enabled in the Antigravity project settings.
