Place font files here (either is fine):

  - PressStart2P-Regular.woff2  (preferred)
  - PressStart2P-Regular.ttf     (fallback)
  - Dalmoori-Regular.woff2       (preferred for Hangul)
  - Dalmoori-Regular.ttf         (fallback for Hangul)

How to get it:
- Download from Google Fonts (Press Start 2P) or your licensed source.
- You can use only the TTF; the app will fall back to it.
- Optionally convert TTF to WOFF2 (smaller) via fonttools or online converter.

The app references these paths:
- ./assets/fonts/PressStart2P-Regular.woff2
- ./assets/fonts/PressStart2P-Regular.ttf
- ./assets/fonts/Dalmoori-Regular.woff2
- ./assets/fonts/Dalmoori-Regular.ttf

In CSS, a unified family 'GameFont' maps Latin to Press Start 2P and Hangul to Dalmoori via unicode-range.
