# TODO

Open items to pick up in a later session.

- [ ] **Typeface.** Pick a monospace typeface for the terminal look. Today the site uses the OS's own
      monospace through the CSS stack in `src/style.css` (`--mono`: `ui-monospace`, then Menlo on macOS,
      Consolas on Windows, DejaVu/Liberation on Linux), so it differs per OS and nothing is downloaded.
      Browsers don't ship fonts of their own; a consistent look means self-hosting a font file in this
      repo (no third-party font CDNs), which was deferred.
- [ ] **GitHub repo.** Create it, add the remote, push, enable Pages (Settings → Pages → Source: GitHub
      Actions), then replace the "Source on GitHub [coming soon]" placeholder in every page footer.
- [ ] **About page.** Real profile text instead of lorem ipsum (the photo is in:
      `public/images/cowglow-portrait.jpg`).
- [ ] **Home intro.** "strudel studio & gallery" is the only text on the home page; decide whether it
      needs more.
