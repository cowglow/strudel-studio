# COWGLOW's strudel studio & gallery

Strudel compositions, rendered to audio locally and published as a static gallery on GitHub Pages.
Pages: home, Gallery, About; the Studio exists only on the dev server.

## Workflow

1. `npm run dev` and open http://localhost:5173/studio/ (also linked in the header, in dev only).
   - **New…** creates `compositions/<slug>.js` from a template; the dropdown opens existing ones.
   - **Rename…** renames a composition and everything rendered from it. There is no delete, on purpose.
   - **Status**: *Backlog* (work in progress, kept off the site) or *Complete* (in the gallery).
   - **Play** / **Stop** (`Ctrl+Enter` / `Ctrl+.`) to listen, **Save** (`Ctrl+S` / `⌘S`) writes the file.
   - **Render** saves, renders and previews the MP3. Then check the gallery and commit.
2. Every composition starts with a header:
   ```js
   // @title Jungle 01
   // @by COWGLOW
   // @origin COWGLOW's strudel studio & gallery
   // @bars 24
   // @status complete
   ```
   `@title` and `@by` are strudel.cc's own metadata tags, so the credit travels with downloads and
   "Open in Strudel" links; new compositions get them from `AUTHOR`/`ORIGIN` in `scripts/compositions.ts`.
   One bar = one cycle, so set the tempo with `setcpm(bpm / 4)`. No samples are preloaded, so load them with
   `await samples(...)`. Files must stay pasteable into https://strudel.cc, which remains a fallback editor.
   Anything but `@status complete` counts as backlog.
3. A render produces `<slug>.mp3`, `<slug>.txt` (the exact code rendered) and `<slug>.json` (bars, bpm,
   length). Complete compositions keep them in `public/tracks/` (published, committed), backlog ones in
   `renders/` (git-ignored, with the `.wav` master). Changing the status moves them; `src/tracks.json`, the
   gallery data, is rewritten from the published set. The gallery offers the `.txt` as a download and as an
   "Open in Strudel" link.

   From the terminal: `npm run render` renders compositions whose code changed since their last render,
   `npm run render -- <slug>` one, `npm run render -- --force` all.
4. Commit and push; `.github/workflows/deploy.yml` publishes `dist/`.

Open items: [TODO.md](TODO.md). First-time setup: `npm install && npx playwright install chromium`.

Strudel is AGPL-3.0-or-later.
