# Layout

How the page is put together: margins, the grid, where text sits, how sections differ, navigation,
endings and the phone. The direction sheet gives the specific compositions; this file gives the habits
behind them, taken from the panel's notes on the 114 studied sites that scored 7.3 or higher (counts
below are hand tallies from those notes, so read them as "about").

## Contents

1. What strong pages do
2. Margins and the grid
3. Where text sits
4. Empty space
5. Sections: carry the idea, vary the arrangement
6. Navigation
7. Endings
8. The phone is a second composition
9. How pages fail

## 1. What strong pages do

- **Tight margins, content to the edges.** About 45 of 114 use outer margins of 32px or less; only
  about 8 use 80px or more. The centred 1100–1300px container is the minority among strong sites and
  the usual frame of the ones the panel called stock.
- **Text hangs from an off-centre line.** About 22 anchor text to one fixed line that is neither the
  centre nor the margin: a third across, 42%, the midpoint.
- **Two or three type sizes with nothing between** (about 30): one very large with one small, or
  everything small with the scale given to the image.
- **One thing per screen** (about 20): one statement, one object, one project.
- **Sections told apart by their ground.** About 20 change the whole background colour at each
  section; about 12 alternate light and dark; about 10 never change and separate by space alone.
- **Sections recomposed, not repeated.** About 14 rearrange every section; about 12 alternate a
  full-bleed image screen with a near-empty type screen.
- **The system broken once, on purpose** (about 14): one centred line on a split page, one paper card
  on a dark page, colour held back until the last screen.
- **Often no navigation bar** (about 45), and endings that are a designed scene rather than link
  columns.
- **Few words.** Median 575 on the whole study; some of the best carry under 200.

## 2. Margins and the grid

```css
:root {
  --margin: clamp(1rem, 2.2vw, 2rem);   /* 16–32px: tight, so content reaches the edges */
  --gutter: clamp(0.75rem, 1.4vw, 1.5rem);
}
.wrap { padding-inline: var(--margin); }
.grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); column-gap: var(--gutter); }
```

- One pair of margins and one grid for the whole page. Every left edge is a column line.
- Do not wrap the page in a `max-width: 1200px; margin: auto` container by reflex. Let large things
  (type, images, colour fields) run the full width, and constrain only the measure of running text
  (`max-width` in `ch` on the paragraph, not on the page).
- On very wide screens cap the layout at about 1760–1920px, or let type sized in `vw` stop growing with
  a `clamp()`.
- Directions that call for wide margins (uneven photographs, the quiet instrument) say so on the
  sheet; follow the sheet.
- Never draw the grid. Column lines, crosshairs and guides are banned ornaments here even though they
  are fashionable; the grid is felt through alignment.

## 3. Where text sits

- **Pick the anchor line and reuse it.** If the hero headline starts at column 5, the section
  headings, the pricing figure and the footer links start there too. Two or three anchor lines on a
  whole page; six means nothing was decided.
- **Off-centre beats centred.** A heading in the left third with its paragraph in the far-right
  column on the same baseline and nothing between; a headline in the bottom third under a deliberate
  void; text docked in corners with the middle given to the picture.
- **Opposite ends.** Two short texts at opposite ends of one baseline (name left, one-line description
  right) is the commonest alternative to the centred stack.
- **Centred is a decision.** When a strong page centres, it uses one axis with wide empty flanks and a
  single element per screen, not a centred stack of heading, paragraph and two buttons.
- **Rows for long copy:** heading in the left third, body in the right two-thirds, the same split for
  every row on the page.
- Stagger sparingly: a second line indented by a third so a two-line headline steps across the screen.

## 4. Empty space

Empty space is placed, not left over: an empty left half, a blank right third, 300px of nothing above
the work.

- Decide where the void is and keep it clean: no stray caption, no decorative shape, no faint
  watermark.
- The gap between sections is clearly larger than any gap inside one (120–220px on desktop,
  72–112px on a phone).
- Related things sit close; unrelated things sit far. If a heading is equidistant from the paragraph
  above and the one below, fix it: at least twice as much space above as below.
- When a section looks empty, the answer is almost never "add something". Make the main element
  bigger, or cut the section.

## 5. Sections: carry the idea, vary the arrangement

The most common failure in every score band is a distinctive first screen followed by stock blocks:
icon cards, a three-up row, an accordion, a link-column footer. About 25 of the studied sites lose
points this way, including several above 7.5.

- **The idea survives to the last pixel.** Ask of each section, pricing and FAQ included: what does
  the page's idea do here? If the page is a menu, the prices are menu lines. If the name is a
  monument, the footer is the name again. If the object's shape is the motif, the button and the image
  masks carry it.
- **No two neighbours share a layout.** Use the shape of each dealt blueprint (list, split, statement,
  full-bleed, mosaic, table, strip, pinned …). Count them in the screenshot; a shape used three times
  is the template showing.
- **Alternate dense and empty, image and type, light and dark** so the scroll has rhythm.
- **A repeated module is for archives only** (a work index, a menu, a schedule). Anywhere else,
  repetition reads as a kit.
- **Break the system once.** After the page has established its rule, one planned exception (a single
  centred line, one inverted section, one image at a different scale) is what makes the rule visible.
- **Short pages are fine.** A quarter of the studied sites are one or two screens. Do not add sections
  to seem complete; each one must carry a claim (see `copy.md` §1).

## 6. Navigation

- The plain form: the wordmark at one end, three to five text links, one action, all at text size on
  the page ground with no bar, border or background. Median link count in the study is 3.
- It is also normal to have less: small links in the corners, a single action, or the navigation
  folded into the content (a list of section titles that is itself the index).
- If it stays fixed, it must never sit on top of content: check every scroll position in the
  screenshots, especially on the phone. Floating pill bars are where the panel most often recorded a
  nav covering text.
- On a phone: wordmark and one action in view; the links go in a simple full-screen sheet opened by a
  text button ("Menu"), or move to the footer when there are only three.
- Navigation is small furniture, however it is drawn. On desktop it takes no more than about a tenth
  of the first screen; on a phone it is one row. A blueprint that builds the navigation as a column of
  colour blocks or a stack of tabs gets that treatment on desktop only, and collapses to one row on
  the phone so the headline, the supporting sentence and the action stay in the first screen. In
  blind tests a nav that ate the hero cost a whole point of usability.

## 7. Endings

- The page should end on a designed scene. In the study: the name at full width (about 18 of 114), the
  hero repeated in inverted colours (about 12), a closing scene of its own such as the one contact
  fact set as a headline (about 14), or simply one quiet line (about 22). Link-column footers appear
  in the panel's notes only as criticism.
- The full-width name is strong but already a studio habit; use it when the direction is name-led,
  otherwise prefer the blueprint dealt for the footer.
- Put the practical facts (address, hours, email, legal line) in the text face at a readable size, on
  the same anchor lines as the rest of the page.

## 8. The phone is a second composition

Design the 390px screen as its own page, not the desktop page squeezed. Strong sites that neglect this
lose usability points; weak ones are often just broken.

- Each blueprint on the sheet has its own phone paragraph. Build it.
- Keep one dominant thing on the first screen. A wordmark that was 20vw wide on desktop might stack on
  two lines at 26vw on the phone and be even stronger.
- Re-author line breaks; re-crop images to portrait (`object-position` per breakpoint, or a different
  crop size in the image URL); keep unevenness with alternating widths rather than making everything
  full width.
- Margins 16–20px. Body text 16–18px. Touch targets at least 44px high.
- Check 390px in the inspector's screenshots for every round: sideways scroll and three-line headlines
  usually appear here first.

## 9. How pages fail

From the panel's notes on the 54 sites scoring under 6.8 (counts out of 54):

- The whole page is the category's stock template; swap the logo and it could be any competitor
  (about 20).
- Centred headline, pill badge, two buttons, screenshot or tile grid below (about 9).
- A distinctive hero, then stock modules in the usual order (about 8, and about 17 more in the middle
  band).
- A default typeface with no character (about 13).
- Text too small or too low in contrast (about 13); legibility lost over busy photographs (about 9).
- An undersized headline and no focal point (about 9).
- The page never says what the thing is, or shows no work (about 12 and 7).
- Thin content stretched over many screens, or a single gag (about 11).
- Gates, preloaders and entry pop-ups before any content (about 9).
- A phone layout that is the desktop shrunk, or broken (about 8).
- Fixed elements sitting on content; careless details such as colliding lines (about 7 and 5).

And the faults of the best sites, which are not to be copied: body text at 9–13px (about 24 of the 90
sites at 7.5 or more), information hidden behind the concept (about 20), the idea running out
mid-page (about 15), text over footage with no scrim (about 12), gates and blank first paints (about
12), floating elements colliding with content (about 11), and a first screen with no statement of what
this is and no action (about 9). Say what the thing is, and offer the action, on the first screen.
