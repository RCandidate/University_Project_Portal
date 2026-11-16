# Sochi University — Project Portal

A single-page showcase for five digital resources of Sochi State University.
Static HTML + CSS + a pinch of vanilla JS. No build step, no database, no `node_modules`
the size of a small moon. Just files, served fast.

> **TL;DR:** it's a website in a box. The box is nginx. The website is HTML.

## What's inside

```
Project-Portal/
├── docker-compose.yml     # one service, one port, zero drama
├── Dockerfile             # nginx + static files
├── nginx.conf             # gzip, caching, security headers
├── donors.txt             # source descriptions for the five resources (not shipped)
└── site/                  # everything the browser actually sees
    ├── index.html
    ├── robots.txt
    ├── sitemap.xml
    └── assets/
        ├── css/style.css
        ├── js/app.js
        ├── fonts/         # Cormorant Garamond + Inter (Cyrillic), self-hosted
        ├── img/           # mascot, university crest, favicon, og.jpg
        └── vendor/lenis.min.js
```

## How it works

- **Background** — a WebGL shader (fbm noise, blue "aurora") painted onto a canvas.
  No WebGL? A CSS gradient quietly takes over. Pixel density is capped, lower on mobile.
- **Entrances** — IntersectionObserver + CSS transitions; headings are split into
  characters and slide out from under a mask.
- **Scrolling** — Lenis (smooth scroll) plus a custom rAF loop: progress bar, parallax,
  ghost project numbers, a marquee that skews with scroll velocity.
- **Project sections** — a `position: sticky` visual column: the graphic holds still
  while the text scrolls past. Yes, it's intentional. No, it's not a bug.
- **Accessibility** — `prefers-reduced-motion` disables animations and pinned sections.
  Your vestibular system is respected.

### Debug modes

- `?static=1` — disables Lenis and mouse parallax (handy for screenshots).
- `?shot=N` — scrolls to N pixels with animations snapped to their final state.

## Deploy

```bash
cd Project-Portal
docker compose up -d --build
docker compose logs -f --tail=50
```

**Rebuild after every edit.** Site files are copied into the image
(`COPY site/ /usr/share/nginx/html/` in the Dockerfile), so `restart` won't pick up changes —
only `up -d --build` will (2–5 seconds with cache).

Prefer editing without rebuilds? Switch the service to a bind-mount: drop the `COPY site/ …`
line from the Dockerfile and add this to `docker-compose.yml`:

```yaml
    volumes:
      - ./site:/usr/share/nginx/html:ro
```

Then `docker compose restart` is enough (nginx serves static files from disk anyway).

Sanity check:

```bash
curl -I http://127.0.0.1:3003/
```

## Editing content

Texts, links and captions live directly in `site/index.html`
(five `article.project` blocks with ids `p1`…`p5`).
Styles are in `site/assets/css/style.css`; animations and the shader are in `site/assets/js/app.js`.

Three resources (03, 04, 05) don't have public URLs yet — their markup uses an inactive
`.project__cta--soon` badge instead of a link. When a URL appears, swap the `<span>` for an
`<a href="…">` with the same classes and add `target="_blank" rel="noopener"`.

## A note on the name

"Portal" here means "a nice page that links to things," not "a 2005-era web application
with a login screen and a mysterious Java applet." We're keeping it simple on purpose.