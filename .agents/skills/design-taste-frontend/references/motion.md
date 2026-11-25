# Motion

Read this before adding any animation. The static page must already be finished and passing
`inspect.mjs`; motion is the last pass, never a way to rescue a weak layout.

## Contents

1. The budget
2. Four questions before any animation
3. Tokens
4. Recipes (copy, then adapt)
5. Signature moves
6. Reduced motion and performance
7. What gives generated motion away

## 1. The budget

A page that does not move reads as a mock-up; the inspector counts what moves while the page loads and
scrolls, and fails it under eight elements. The motion layer has four parts:

- **One signature moment:** the thing a visitor would describe an hour later: the headline that rises
  out of a mask, the image that opens like a shutter, the wordmark that scales with the scroll. The
  direction sheet from `draw.mjs` names one. Build that one well; it is the only move allowed to be
  loud.
- **Section entrances, choreographed per section:** the parts of each section arrive in reading order
  (heading, text, picture, details), staggered 60–90ms, rising 16–32px with opacity, once. Vary the
  manner with the content instead of stamping one preset everywhere: a list arrives row by row, a
  picture opens from a mask or settles from a slight scale, a figure counts up once, a statement rises
  line by line.
- **Feedback under the hand:** buttons that give on press, links that answer the pointer, cards and
  pictures that respond on hover, a menu that opens from where it was clicked.
- **One moving picture:** a found clip as a muted loop with a poster frame, a slow drift or scale on
  a large photograph, or a scroll-linked move on the hero picture.

What is still banned: the same fade-and-slide-up with the same timing on every block, which is the most
cited motion tell of generated pages; motion that hides content until a script runs, with no fallback;
bounce and elastic easing; anything that animates layout properties. Uniform motion says nobody decided
anything; choreographed motion with one protected moment says somebody did.

## 2. Four questions before any animation

1. **How often will someone see it?** Once per visit (hero load, a section reveal): it can take its
   time. Many times per visit (hover, menu, accordion): fast and small. Hundreds of times (keyboard
   actions, typing): no animation.
2. **What is it for?** Valid answers: it shows where something came from, it confirms an action, it
   keeps a change from being jarring, it explains how the product works, it is the signature moment.
   "It looks nice" is only valid for the signature moment.
3. **Which easing?** Entering or leaving: ease-out, so movement starts the instant the eye arrives.
   Moving between two places on screen: ease-in-out. Colour and opacity on hover: `ease`. Constant
   travel (marquee, progress): `linear`. `ease-in` makes interfaces feel slow because the first frames
   barely move; do not use it. The CSS keyword curves are weak, so use the tokens below.
4. **How long?** Press feedback 100–160ms. Hover 150–200ms. Menus and popovers 150–250ms. Dialogs and
   drawers 250–450ms. Section and hero reveals 500–900ms. Leaving is quicker than arriving (about 70%).

## 3. Tokens

```css
:root {
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);      /* enters, exits, reveals */
  --ease-in-out: cubic-bezier(0.76, 0, 0.24, 1);   /* things that travel while visible */
  --ease-soft: cubic-bezier(0.33, 1, 0.68, 1);     /* long quiet reveals, image scale */
  --t-press: 140ms;
  --t-hover: 180ms;
  --t-ui: 240ms;
  --t-reveal: 800ms;
}
```

Name the properties you animate. `transition: all` animates things you did not intend (and costs
layout); write `transition: transform var(--t-press) var(--ease-out)`.

## 4. Recipes

All recipes keep content visible when JavaScript is off or slow: the hidden state only applies under
`html.js`, which a one-line inline script sets.

```html
<script>document.documentElement.classList.add('js')</script>
```

### Hero load sequence (CSS only)

Stagger at most four things. With a headline of two lines this is short and reads as one gesture.

```css
@media (prefers-reduced-motion: no-preference) {
  .js [data-rise] {
    opacity: 0;
    transform: translateY(18px);
    animation: rise var(--t-reveal) var(--ease-out) forwards;
    animation-delay: calc(var(--i, 0) * 90ms + 120ms);
  }
}
@keyframes rise { to { opacity: 1; transform: none; } }
```

```html
<h1 data-rise style="--i:0">…</h1>
<p data-rise style="--i:1">…</p>
<a data-rise style="--i:2" class="button">…</a>
```

### Masked line reveal (the classic gallery headline)

Each line slides up from behind its own baseline. Because headlines are capped at two lines, you set
the line breaks yourself and wrap each line.

```html
<h1 class="lines">
  <span class="line"><span data-line style="--i:0">Stools for</span></span>
  <span class="line"><span data-line style="--i:1">small kitchens</span></span>
</h1>
```

```css
.lines .line { display: block; overflow: hidden; padding-bottom: 0.08em; margin-bottom: -0.08em; }
.lines [data-line] { display: block; }
@media (prefers-reduced-motion: no-preference) {
  .js .lines [data-line] {
    transform: translateY(105%);
    animation: line-up 900ms var(--ease-out) forwards;
    animation-delay: calc(var(--i) * 110ms + 150ms);
  }
}
@keyframes line-up { to { transform: none; } }
```

The `padding-bottom` / negative margin pair stops descenders (g, y, p) being clipped by the mask.
On a narrow phone the two authored lines may each wrap; check the mobile screenshot, and if they do,
author a shorter mobile break with a `<br class="only-wide">` pattern or reduce the size.

### Reveal on scroll (once)

For the two or three sections that deserve it, not for every block.

```css
@media (prefers-reduced-motion: no-preference) {
  .js [data-reveal] { opacity: 0; transform: translateY(24px); transition: opacity 700ms var(--ease-out), transform 900ms var(--ease-out); }
  .js [data-reveal].is-in { opacity: 1; transform: none; }
}
```

```js
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
```

Never attach reveals with a scroll listener, never replay them when the element re-enters, and never
leave anything at `opacity: 0` if the observer fails to fire (the `html.js` gate handles no-JS; the
`unobserve` handles replays).

### Image shutter

An image opens from one edge while scaling down slightly inside its frame. Gallery staple; use it for
the one hero or showcase image.

```css
.shutter { overflow: hidden; }
@media (prefers-reduced-motion: no-preference) {
  .js .shutter { clip-path: inset(0 0 100% 0); transition: clip-path 1100ms var(--ease-in-out); }
  .js .shutter img { transform: scale(1.12); transition: transform 1500ms var(--ease-soft); }
  .js .shutter.is-in { clip-path: inset(0); }
  .js .shutter.is-in img { transform: none; }
}
```

### Press and hover

```css
.button { transition: transform var(--t-press) var(--ease-out), background-color var(--t-hover) ease, color var(--t-hover) ease; }
.button:active { transform: scale(0.97); }
.link { text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 0.2em; text-decoration-thickness: 0.07em; transition: text-decoration-color var(--t-hover) ease; }
@media (hover: hover) and (pointer: fine) {
  .button:hover { background-color: var(--accent-strong); }
  .link:hover { text-decoration-color: currentColor; }
}
```

Hover styles go behind `(hover: hover)` because touch devices fire hover on tap and leave it stuck.
Hover should raise contrast, never lower it. Do not change font weight on hover (the text reflows).
Do not lift or scale every card on hover; one consistent, small response is enough.

### Scroll-linked progress without JavaScript

For a wordmark that scales as the hero leaves, an image that drifts a few percent, or a progress bar.
Wrap in `@supports` so browsers without scroll timelines get the static state.

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .drift { animation: drift linear both; animation-timeline: view(); animation-range: entry 0% exit 100%; }
    @keyframes drift { from { transform: translateY(-4%); } to { transform: translateY(4%); } }
  }
}
```

Keep the travel small (under 8% of the element). Large parallax makes text hard to read and looks
dated.

### Pinned story

A section whose heading stays put while items pass. Use `position: sticky`; do not hijack scrolling.

```css
.story { display: grid; grid-template-columns: 5fr 7fr; gap: var(--gutter); align-items: start; }
.story__title { position: sticky; top: 18vh; }
@media (max-width: 800px) { .story { grid-template-columns: 1fr; } .story__title { position: static; } }
```

### List with image preview (work index, menu, team)

Rows of large text; hovering a row shows its image in a fixed frame beside or behind the list.

```css
.index { position: relative; }
.index__row { display: flex; justify-content: space-between; align-items: baseline; padding-block: 0.35em; font-size: var(--step-4); }
.index__frame { position: absolute; inset-block: 0; right: 0; width: 34%; pointer-events: none; }
.index__frame img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity var(--t-ui) ease; }
.index__frame img.is-on { opacity: 1; }
@media (hover: hover) and (pointer: fine) { .index:hover .index__row:not(:hover) { opacity: 0.35; } .index__row { transition: opacity var(--t-hover) ease; } }
```

On touch there is no hover, so each row shows its image inline above the title instead.

### Accordion

```css
.acc__panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 320ms var(--ease-out); }
.acc__panel > div { overflow: hidden; }
.acc[open] .acc__panel, .acc__item.is-open .acc__panel { grid-template-rows: 1fr; }
```

Animating `grid-template-rows` from `0fr` to `1fr` opens to the content's real height without measuring
it in JavaScript.

### Menu or dialog

```css
.menu { transform-origin: top right; transition: opacity var(--t-ui) var(--ease-out), transform var(--t-ui) var(--ease-out); }
.menu[hidden], .menu.is-closed { opacity: 0; transform: scale(0.97) translateY(-6px); pointer-events: none; }
```

Things open from where they were triggered (`transform-origin` at the trigger). Nothing enters from
`scale(0)`; start at 0.95–0.98. A centred dialog is the one case that scales from its centre.

## 5. Signature moves

The direction sheet names one. Each of these was seen repeatedly on the studied gallery sites.

| Move | What happens | Build with |
| --- | --- | --- |
| Masked headline | Lines rise from behind their baselines on load | Masked line reveal recipe |
| Shutter image | Hero or showcase image opens from an edge, settling from 1.12 scale | Image shutter recipe |
| Scaling wordmark | A giant wordmark shrinks or grows a few percent as the hero scrolls out | Scroll-linked recipe on `scale` |
| Pinned story | A heading holds while its items scroll past | Sticky recipe |
| Index with preview | Text rows; the hovered row shows its image | List with image preview recipe |
| Curtain footer | The last section is revealed from under the page as you reach the end | `position: sticky; bottom: 0` footer under a main with a background and `z-index` |
| Slow crossfade | Hero image crossfades through 3–4 photographs, 5–6s each | Stacked images, opacity keyframes, pause when the tab is hidden |
| Edge-to-edge marquee | One line of very large type travels sideways, slowly | Duplicate the content, `translateX(-50%)` linear loop, pause on hover and under reduced motion |
| Drag row | A horizontally scrollable row of large images with scroll snapping | `overflow-x: auto; scroll-snap-type: x mandatory`, no library |
| Colour by chapter | Each chapter is its own full-bleed colour field, so the ground changes at section edges; a fixed header takes the ink of the chapter beneath | Section backgrounds in CSS; `base.js` sets `--header-ink` from `data-ink`. Never recolour the whole page from an observer |

Pick by subject. A portfolio wants the index with preview; a restaurant wants the slow crossfade; a
product wants the shutter on its hero object. If the move says nothing about the subject, it is
decoration and the page is better without it.

## 6. Reduced motion and performance

- `prefers-reduced-motion: reduce` means fewer and gentler, not none: keep opacity and colour changes,
  drop travel, scale, parallax and autoplay. All recipes above are written inside
  `no-preference` blocks so the reduced state is simply the finished state.
- Animate `transform`, `opacity` and `clip-path`. Animating `width`, `height`, `top`, `left`, `margin`
  or `padding` forces layout on every frame. `grid-template-rows` for accordions is the accepted
  exception because it is short and rare.
- Do not drive many children from one changing CSS variable on a parent; set the transform on the
  element that moves.
- `will-change` only on an element that is about to animate, removed afterwards.
- Pause loops when off screen or when the tab is hidden.
- No scroll hijacking, no smooth-scroll library by default, no custom cursor. They cost usability,
  which is 30% of an Awwwards score and the line most winners score lowest on.

## 7. What gives generated motion away

- The same fade-up on every block.
- A dozen staggered entrances in the hero.
- Hover lift or zoom on every card and image.
- Bounce or elastic easing on interface elements.
- Infinite loops that mean nothing: pulsing dots, floating shapes, shimmering text, rotating badges.
- A reveal that never fires and leaves a blank band in the page. Run `inspect.mjs` after the motion
  pass and look at every screenshot for missing content.
