# AagamiSEQ site

Static single-page site. No build step: Vercel serves these files as they are. Open `index.html` locally, or run `python3 -m http.server` in this folder.

`main` is still the React / Three.js production app. This branch is only the new static site.

## Fonts

Loaded from Google Fonts. The page needs a network connection for them.

- **Instrument Serif** — headlines
- **Space Grotesk** — navigation, body, buttons, and numbers
- **IBM Plex Mono** — glyphs on the hero canvas only

## Brand

- Aagami is `#123B70`
- SEQ is pink (`#e84c91`)
- The wordmark is the `.wordmark` class: `Aagami` in blue, `SEQ` in pink
- Logo file: `aagamaseq-logo-mark.png`
- Light theme only

## Still placeholder

- Dr. Anumol Dominic’s founder bio is lorem ipsum. Replace it before treating the page as final.
- The nanopore diagram is an illustration of the principle, not a measured trace.
- Applications are research directions, not clinical claims.

## Contact form

The form posts in the browser to FormSubmit at `imaadbinirshad@gmail.com`. The first submission from a new domain can ask for a one-time activation click. FormSubmit adds its own “submitted from this site” line; that line cannot be removed from this form.
