# Imagery

Pictures are where generated pages most obviously give up: a grey box, an icon in a square, a fake
dashboard, an abstract blob. This file is how to decide what the pictures are, where to find real ones,
how to crop and place them, and what to do when there are none.

## Contents

1. What the study measured
2. Decide what imagery exists
3. Real pictures from the open collections
4. The dealt photographs
5. Cropping and placing
6. Treatment
7. Showing software
8. Drawing the subject
9. Type and colour alone
10. Markup and credits
11. Video

## 1. What the study measured

- On 60% of the studied sites one piece of media covers at least half of the first screen; on half of
  them it covers nearly all of it. Top-scored sites: 68% and 56%. Weak sites: 48% and 39%.
- Only 15% of heroes have no media at all, and those are deliberate typographic statements.
- Media has square corners on 73% of sites. Where corners are rounded the usual radius is about 12px,
  applied to every image alike.
- Top-scored pages carry far more imagery (a median of 37 images against 5 on weak pages): the strong
  sites show, the weak ones tell.
- What the imagery is, by the panel's classification: a mix of kinds 32%, photography 14%, generative
  or WebGL scenes 13%, real product interface 12%, 3D renders 11%, illustration 9%, video 6%, type only
  3%.
- Among the 54 sites the panel scored under 6.8, legibility (text lost over a busy image, or too
  little contrast) was named as a weakness in 13.

## 2. Decide what imagery exists

In order of preference:

1. **The project's own images.** Product shots, the place, the people, the work. Even ordinary
   photographs of the real thing beat beautiful photographs of something else. Ask what exists; look in
   the repository.
2. **Images you can generate** with an image tool in this session. Write prompts as a photographer's
   brief: subject, angle, light, background, crop ratio, and "no text". Generate the hero first and
   make the rest match its light.
3. **Real pictures of the subject's world from the open collections** (section 3). Archives,
   museums and photographers have published millions of pictures anyone may use with a credit: the
   client's city and street in old postcards, maps of its neighbourhood, its materials, its trade in
   engravings, museum objects of its kind. Whenever an honest one exists, it beats a drawing of the
   same thing: it is real, it has detail no drawing in a page's budget reaches, and it carries history.
   Honest means nobody could take it for the client's own product, room, dish, person or team.
4. **Pictures you draw in code from the subject itself** (section 8), for what no honest picture
   exists of: the product's own objects as flat shapes, the place's tiles and windows, a map of its
   streets, the document a tool produces, the interface of a piece of software. In testing, pages that
   drew their subject with care beat pages that borrowed unrelated photographs every time, and beat
   pages that showed nothing.
5. **The photographs dealt on the direction sheet.** Real photographs of places, light, texture and
   weather. Use them only where an honestly generic picture fits (the open sea for a house on the sea,
   fog for a quiet retreat). They cannot stand in for a specific product, dish, room, person or
   screen: a foggy motorway on a restaurant page reads as stock at once, and jurors notice.
6. **Type and colour alone,** done on purpose (section 9).

Tell `draw.mjs` the truth with `--have`. If you have no product photographs and no image tool, do not
pass `product-photo`; the draw will avoid the directions that depend on showing the object. Pictures
found in the open collections are not the project's own: do not pass `photography` for them.

## 3. Real pictures from the open collections

`scripts/assets.mjs` searches four open sources without keys and prints, for each find, a direct image
URL, the page it comes from, its size, its creator, its licence and a credit line:

- **Openverse**: one index over Flickr, Wikimedia Commons, museums and libraries.
- **Wikimedia Commons**: archival photographs, old maps, scans of prints and books, places as they
  look now.
- **The Art Institute of Chicago** and **The Metropolitan Museum of Art**: public-domain paintings,
  prints, drawings, photographs, textiles and objects, in large scans.

```bash
node <skill>/scripts/assets.mjs "ghent postcard"
node <skill>/scripts/assets.mjs "fig" --source museums --orientation portrait
node <skill>/scripts/assets.mjs "basalt texture" --min-width 2400 --source openverse,commons
node <skill>/scripts/assets.mjs --get commons:36649959,met:707892     # download, record the credits
node <skill>/scripts/assets.mjs --credits                             # footer line and report list
```

By default it keeps only licences that allow commercial use (CC0, public domain, CC BY, CC BY-SA) and
pictures at least 1000 pixels wide, and checks that every image it prints actually loads.
`--license pd` keeps only pictures that need no credit; `--orientation`, `--min-width` and `--limit`
narrow the list; `--source` picks the sources; `--json` gives the raw results. Each result has a ref
(`commons:36649959`) that `--get` takes.

**What to search for.** The inventory (SKILL.md step 1), not the category: "bakery" finds other
people's bakeries. The subject's world is specific:

- **Its place:** the city, the street, the harbour, the valley, in old postcards and photographs
  ("ghent postcard", "rotterdam harbour 1920") and as it looks today ("gent korenmarkt").
- **Its maps:** the street plan, the chart of its bay, the geology of its valley ("ghent old map",
  "nautical chart lisbon").
- **Its materials,** close enough to read as a surface: the stone of its quay, the grain of its oak,
  its glaze, its tiles ("azulejo tiles", "basalt cobblestones", "oak grain").
- **Its trade's history:** the old tools, the craft in engravings and trade catalogues, patent
  drawings ("bread oven engraving", "potter's wheel", "bicycle patent drawing").
- **Museum objects of its kind,** with `--source museums`: a coffee set from about 1810 for a studio
  that makes coffee sets, a woodblock print of a wave for a surf school, a porcelain plate painted
  with figs for a fig orchard.
- **Scientific imagery:** botanical and zoological plates ("botanical engraving fig"), star charts,
  microscope photographs, satellite views of its coast, geological sections.

Search in the place's own words (azulejo, not "blue tile"; Korenmarkt, not "market square"), add a
medium (postcard, engraving, old map, lithograph, aerial photograph) or a decade, and try two or three
queries per idea. The museum sources match best on one or two words ("fig", "harbour", "teapot").

**What makes a good find.**

- It belongs to this subject's world and would not fit the nearest competitor's page.
- It still reads at the crop the slot needs. Look at it before deciding: `--get` downloads it, then
  open the file. A title is not a picture.
- It is large enough: twice the width it is shown at for anything full-bleed (the script prints the
  largest size available). A 1024-pixel Flickr photograph is a half-width picture at most.
- It belongs to one family with the others on the page: all engravings, or all photographs from one
  era, or all close surfaces in one light. A 1900 postcard beside a modern stock photograph beside a
  botanical plate reads as a scrapbook.
- No watermark, no burned-in text or logo, no frame or scanner edge you cannot crop away, and no
  recognisable living person who could be taken for the client's staff or customers.

**Use it creatively.** Found pictures are material, not decoration:

- **One archival photograph as the hero,** full-bleed: the street as it was a century ago, behind the
  name of the business that stands in it today, with the year in the caption.
- **A museum engraving enlarged until its line becomes texture,** cropped tight and returning at
  different scales as the page's one motif (the whole fig plate in the hero, a single leaf of it
  beside the menu).
- **An engraving or a map on white paper set with `mix-blend-mode: multiply` on the page's colour
  field,** so the ink sits on the ground (section 6).
- **The real map of the street as the contact section,** the door marked, the north and the scale
  taken from the original.
- **A material close-up as a whole field:** the quay's stone behind the opening hours.
- **A run of old postcards or plates as the gallery,** one size, one treatment.

Treatments stay within section 6: untouched, greyscale for the whole set, or multiply on a field.

**Stay honest.**

- **A found picture is never the client's own.** It may show the client's city, its materials, its
  history, the kind of thing it makes; it may never stand in for the client's product, room, dish,
  person, team or customers. If a visitor could take it for the client's own (a bakery counter, a
  plate of pasta, a smiling barista, a guest room), do not use it.
- **Caption from the source** when a caption helps: what it is and when, as the archive describes it
  ("Gand, unloading a steamer, 1905"). Never write a caption that ties it to the client.
- **Record and credit every picture.** `--get` writes the source, creator, licence and page of each
  download to `assets/credits.json`. CC BY and CC BY-SA require a credit with the title, the creator,
  a link to the source and a link to the licence; `--credits` prints them as one line of HTML for
  the footer (section 10). Public-domain pictures need no credit; give one anyway.
- **Respect the licence.** CC BY-SA: an altered version (recoloured, combined with other pictures)
  must be shared under the same licence. Non-commercial (NC) and no-derivatives (ND) licences are out
  for a client's site, which is why the script leaves them out unless asked. Read the `note` lines:
  some pictures carry personality rights or a trademark, are public domain only in the United States,
  or come with an archive's statement instead of a licence.
- **Download, do not hotlink.** Save what you use into the project: `--get` puts it in `assets/` at
  1920 pixels wide (pass `--width 1280` for a picture shown at half the screen, `--width 3840` for a
  very large hero where the source has it). The page then works offline, does not break when an
  archive moves a file, and does not load from someone else's server. Every licence the script
  allows by default permits copying.
- **List them in the report:** file, title, creator, licence, source page, and where the credit sits.
  `--credits` prints that list too.

If two or three honest queries per idea find nothing that fits, draw (section 8). A drawing made for
the subject is better than a found picture that is merely nearby. If the script cannot reach any
source (no network), draw, and say so in the report. For moving pictures, the same script searches
real footage with `--video` (section 11).

## 4. The dealt photographs

- The sheet lists eight from one set so they share a subject and a light. Use three to six.
- Each line says where the calm area is. Put text there or keep text off the image.
- More from the same or another set: `node scripts/draw.mjs --photos list`, `--photos <set>`, or
  `--photos "fog coast"` to search descriptions.
- URLs have the form `https://picsum.photos/id/<id>/<width>/<height>`. Request the exact pixel size you
  render at twice the CSS size for sharpness, capped around 2400 wide. Add `?grayscale` for
  black-and-white.
- These are photographs from Unsplash served by Lorem Picsum under the Unsplash licence. List the ids
  you used in your report; they are meant to be replaced by the project's own pictures.

## 5. Cropping and placing

- **Choose a small set of ratios and stick to them:** for example 4:5 for portraits, 16:10 for
  landscapes and 1:1 for details. Random ratios look like a stock dump.
- **Go large.** A photograph at full width, or at half the screen and full height, has presence. Six
  small ones in a grid have none. If the image is good, give it the room; if it is not, cut it.
- **Crop with intent.** Use `object-fit: cover` with an `object-position` chosen per image so the
  subject sits where the composition needs it (off-centre, on a third, against the text side).
- **Let images touch edges.** Full-bleed, or bleeding off one side, reads as designed. An image
  floating with equal margins on all sides reads as placed by default.
- **Overlap sparingly and on purpose:** a headline whose last line runs over the top edge of the
  picture, a small image overlapping a large one by a fixed 40–80px. One overlap per screen at most.
- **Square corners** unless the direction or the one-motif shape says otherwise. If rounded, one radius
  for every image on the page.
- **No frames:** no borders, no shadows, no device mock-ups, no browser chrome around pictures.
- **Captions** are one short line in the small size and soft ink under the image, left-aligned to its
  edge. Most images need none.

## 6. Treatment

One treatment for the whole page:

- **Untouched.** The default. Pick images whose light already agrees.
- **Greyscale.** `filter: grayscale(1) contrast(1.05)`, or `?grayscale` on the URL. Unifies a mixed
  set instantly and suits editorial and typographic directions. Apply to every image or none.
- **Multiply on a field.** On a light flat ground, `mix-blend-mode: multiply` makes a white studio
  background vanish so a product sits directly on the colour.
- **Darkened for a dark page.** `filter: brightness(0.85) contrast(1.05)` so the image edges sink into
  the ground.

Not treatments: colour washes over photographs, duotone overlays, blur, grain overlays, vignettes,
tilted "polaroid" frames with shadows.

For text on a photograph, a neutral scrim covering only the text area: a solid block at 40–55% black,
or a fade from 55% black to transparent over the lower third. Never a coloured overlay.

## 7. Showing software

- Build a real fragment of the interface in HTML at its true size, with believable content, instead of
  a shrunken screenshot or a decorative mock-up. Crop to the part that makes the point: one control,
  one row, one panel.
- Believable means real labels, real numbers that add up, one item hovered or selected, proper
  alignment. Grey bars standing in for text are worse than no image.
- Put the fragment directly on the page or on one flat stage colour. No laptop, no phone frame unless
  the product is a phone app and the frame is a plain rounded rectangle.
- Inside a fragment the product's own interface conventions apply (its small radii, its 1px control
  borders, a shadow on its open menu). Put the attribute `data-ui` on the fragment's root element: the
  inspector and the linter then leave what is inside alone, and hold the page around it to the house
  rules. `data-ui` is for cropped fragments only; wrapping a heading or a whole section in it fails.
  Write the fragment's CSS under a `[data-ui]` selector (`[data-ui] .row { … }`) so the linter can
  tell it apart from page styles.
- If the user supplies real screenshots, show them large and uncropped at least once.

## 8. Drawing the subject

When nothing real can be photographed and the open collections hold no honest picture of it, draw it,
and draw it well. Inline SVG and CSS are enough. Drawings and found pictures can share a page: the
found ones show the world around the client, the drawings show the client's own things.

- **Draw the subject's own things,** not decoration: the stool's three legs and the grain of its seat,
  the enamel sign over the bakery door, the hut's two windows and its stove pipe, the street plan, the
  invoice the tool produces, the festival's stage. If you cannot name what a drawing depicts in the subject's world, it is decoration.
- **One graphic language for the whole page:** flat filled shapes, no outlines or one consistent
  stroke weight, the same corner and curve vocabulary everywhere, drawn in the palette's real colours
  (fields and accent at full strength, not greys). A set of drawings that obviously belong together
  reads as an identity; a mix of styles reads as clip art.
- **Colour is the material.** A product sold on its finish is drawn in that finish's colours; a sea house in the
  sea's blues and the sand; never a page of grey placeholders.
- **Draw with three levels of detail.** Jurors called simple drawings "basic" every time. Give each
  drawing big shapes that read at a glance, middle shapes that describe the thing (the handle, the
  window frame, the step), and small details that reward a second look (the maker's mark, the house
  number, the chipped tile, the hinge, a bird on the roof). Make light with flat tone steps (a lit face
  and a shaded face of each volume), not gradients. A drawing that would pass as a placeholder icon at
  full size is not finished.
- **Draw large and let it work:** the drawing is the hero's dominant element, a full-width band, a set
  of tiles, the footer mark. Small doodles scattered around read as filler.
- **Let it carry the idea through the page,** the way a motif does: the same drawn object returns at
  different scales, the tile grid becomes the opening hours, the map becomes the booking section.
- **Honesty:** say plainly, in small text near the first drawing or in the footer, that the pictures
  are drawn until photographs exist, if the client might otherwise be taken to be showing real
  products. In your report, list which drawings are placeholders for photography.
- **Not this:** gradient-shaded 3D-looking blobs, isometric clip art, generic line illustrations of
  people at laptops, abstract floating shapes, icons in squares. Those are the generated look.

## 9. Type and colour alone

This is a legitimate design, not a gap to disguise. Only 7 of the studied sites use no imagery at all,
and they hold their own: a median panel score of 7.5 against 7.2 for the whole set.

- Make the typography the image: one statement at 10–14vw, a list set at 5vw, numerals at display size.
- Use colour at scale: a full field, an inverted section, a two-field split.
- Use the subject's own shape as one flat motif if the direction calls for it (a circle, an arc, a
  notch), drawn in CSS, cropped by the viewport.
- Do not add: icons in squares, abstract gradients, dot grids, wave dividers, floating shapes, emoji,
  generic line illustrations, or an empty box where a picture "will go".

## 10. Markup and credits

A found picture, downloaded into the project with `--get`, used as the hero:

```html
<img src="assets/fig-engraving.jpg" width="1920" height="2807" fetchpriority="high" decoding="async"
     alt="Hand-coloured engraving of a fig cut open, with its flowers and seeds, in black, pink and green">
```

A dealt photograph further down the page:

```html
<img src="https://picsum.photos/id/626/2400/1500" width="2400" height="1500"
     alt="Red and white lighthouse in a turquoise sea below a chalk cliff" loading="lazy" decoding="async">
```

The credits, as `--credits` prints them, in the footer:

```html
<p class="credits">Pictures: <a href="https://commons.wikimedia.org/wiki/File:Fig_(Ficus_carica_L.);_57_segments_of_flowers_and_fruits_at_Wellcome_V0043000.jpg">“Fig (Ficus carica L.): 57 segments of flowers and fruits”</a>, <a href="https://creativecommons.org/publicdomain/mark/1.0/">public domain</a>, via Wikimedia Commons.</p>
```

- Always `width` and `height` (or `aspect-ratio` in CSS) so nothing jumps while loading.
- `loading="lazy"` on everything except the hero image, which gets `fetchpriority="high"`.
- `alt` describes the picture in plain words. Decorative repeats get `alt=""`. The script's suggested
  alt is the archive's title; rewrite it to say what the picture shows.
- A coloured `background-color` on the image container (the ground or surface tone) so the layout is
  whole before the image arrives.
- The credit line is part of the footer's design, at full contrast, with its links. Set it at the body
  size; one step smaller only on a page with plenty of running text, because a long credit line in
  small type can become the page's most common text size and fail the inspector's body-size check.
  One line for all pictures; no credit captions laid over the pictures themselves. Credit only the
  pictures the page still uses.
- A broken image fails the inspector. Check every picture in the screenshots.

## 11. Video

A moving picture of the subject's world can carry a section the way a photograph does: the river at
the end of the street, the roaster's drum turning, a timber frame going up. `assets.mjs --video`
searches real footage without keys: Wikimedia Commons (every video there comes with web-sized
transcodes; the best source for short clips), the Internet Archive's Prelinger Archives (industrial,
educational, city and home films from the 1920s to the 1970s, mostly public domain and mostly long)
and NASA (the Earth from orbit, launches, aircraft, laboratories). The rest of the Internet Archive is
left out: anyone can upload there, and the licence claims are unchecked.

```bash
node <skill>/scripts/assets.mjs "coffee roasting" --video
node <skill>/scripts/assets.mjs "river" --video --source commons,nasa --orientation landscape
node <skill>/scripts/assets.mjs --get commons:49769620        # the clip, a poster frame, the credit
```

It takes a rendition of 720p or smaller (`--res` changes that), lists short clips first, prints each
clip's length and file size, and flags anything over 25 MB or longer than a minute. `--get` refuses a
clip over 25 MB unless you pass `--max-mb`, and saves the source's still frame beside it as the
poster (Commons and NASA; the archive's own stills are too small). An archive film of ten minutes is
too heavy as it stands: trim a few seconds from it with ffmpeg if it is installed, or choose a
shorter clip. Licences, credits and honesty work exactly as for pictures (section 3).

**Choosing a clip.**

- **Short:** 5 to 20 seconds that loop without a visible jump: water, smoke, a turning drum, traffic,
  leaves, a crowd from far away. Watch it to the end before choosing.
- **Light:** under about 5 MB for a section and 10 MB for a hero. 720p is plenty behind type.
- **Clean:** no slate, title card, logo, watermark or burned-in caption. NASA and archive films often
  open with a slate, and the source's poster frame may be that slate. No recognisable person who could
  be taken for the client's staff or customers.
- **Never the client's own:** a found clip of a roastery is not this roastery.
- **One per page, two at most.** A page of moving tiles is noise.

**On the page.**

- Muted, looping, inline, with a poster and a fixed size, as `--get` prints it:
  `<video autoplay muted loop playsinline preload="metadata" poster="assets/river-poster.jpg"
  width="854" height="480" aria-hidden="true"><source src="assets/river.webm" type="video/webm"></video>`.
  No sound and no controls on a decorative loop. `aria-hidden` because it is decoration: whatever the
  clip says that matters belongs in the text beside it.
- The poster shows before the clip plays, on slow connections and under reduced motion, so it must
  work as a picture on its own. If the source's still is a slate or a blur, take a frame from the clip
  yourself or use a found picture.
- Under `prefers-reduced-motion: reduce`, stop it and show the poster:

  ```html
  <script>
    const calm = matchMedia('(prefers-reduced-motion: reduce)');
    for (const v of document.querySelectorAll('video[autoplay]')) {
      const sync = () => { if (calm.matches) { v.removeAttribute('autoplay'); v.pause(); v.load(); } else { v.play().catch(() => {}); } };
      sync(); calm.addEventListener('change', sync);
    }
  </script>
  ```

- Crop and place it like a photograph (sections 5 and 6): `object-fit: cover`, one ratio, square
  corners, no frame, a ground-coloured `background-color` while it loads.
- Never under body text. A headline over a clip gets the same neutral scrim as text on a photograph,
  and nothing lies on top of a headline or a statement.
- It is motion: let it be the page's one moving thing, or sit in a section where nothing else moves.
- Credit it with the pictures: `--credits` prints one footer line for both ("Pictures and footage:")
  and the list for the report, with each clip's length.
