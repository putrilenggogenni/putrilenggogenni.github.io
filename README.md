# putrilenggogenni.github.io

Personal portfolio website showcasing my data engineering projects, technical skills, and journey into Data Engineering.

Built with plain HTML, CSS, and JavaScript (no frameworks, no build step), hosted on GitHub Pages.

## Structure

```
.
├── index.html        # page content and the case-study templates
├── style.css         # design tokens (colors, fonts) and all styles
├── script.js         # nav, scroll animations, case-study panel, lightbox
├── lenggo.jpg        # profile photo
└── assets/img/       # project images (WebP)
```

## Run locally

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Edit

- **Colors and fonts:** the `:root` block at the top of `style.css`.
- **Add a project:** add a card in the `#projects` section linking to `#p-<id>`, add a `<template id="tpl-<id>">` with its case study, and register it in `PROJECTS` at the top of `script.js`.
- **Project links:** each case study has a "Code" link in its header; update the GitHub URLs there.

Each project opens as a case study at its own URL (for example `/#p-lakehouse`), so it can be shared directly.
