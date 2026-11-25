// Turns probe() metrics into findings. Each finding: { level: 'FAIL'|'WARN', id, message, fix }.
// FAIL = a banned tell or a broken page; the work is not done while one remains.
// WARN = usually wrong; keep only with a reason you could say out loud to a designer.

const inRange = (h, a, b) => (a <= b ? h >= a && h <= b : h >= a || h <= b);

// Colour families this skill treats as generated-page signatures.
export function colourFamily(hsl) {
  if (!hsl) return null;
  const { h, s, l } = hsl;
  if (inRange(h, 22, 62) && s >= 0.16 && l >= 0.88 && l < 0.995) return 'cream';
  if (inRange(h, 6, 30) && s >= 0.38 && s <= 0.85 && l >= 0.42 && l <= 0.72) return 'terracotta';
  if (inRange(h, 244, 295) && s >= 0.42 && l >= 0.3 && l <= 0.8) return 'ai-purple';
  return null;
}

const hexToHsl = (hex) => {
  const n = parseInt(hex.slice(1), 16); const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return { h: Math.round(h), s, l };
};

export function judge(m, { width = m.viewport.w, allow = [] } = {}) {
  const out = [];
  const add = (level, id, message, fix) => { if (!allow.includes(id)) out.push({ level, id, width, message, fix }); };
  const mobile = width < 600;

  // --- headlines
  // A title holds to two lines. A statement (a paragraph, quotation or list item set large) may run
  // longer, but only at statement size; set at display size it is a headline again. In blind tests jurors
  // read any large sentence of three lines or more as a long headline, so statement size is kept modest.
  const stmtMaxPx = width < 600 ? 24 : width < 1100 ? 32 : 36;
  const stmtMaxLines = width < 600 ? 4 : 3;
  const isStatement = (h) => h.kind === 'statement' && h.size <= stmtMaxPx;
  const long = m.headings.filter((h) => h.lines > 2 && !isStatement(h));
  if (long.length) {
    add('FAIL', 'headline-lines', `${long.length} headline(s) wrap past two lines at ${width}px: ` + long.slice(0, 4).map((h) => `"${h.text.slice(0, 48)}" → ${h.lines} lines (${h.words} words, ${h.size}px${h.kind === 'statement' ? ', a paragraph set above ' + stmtMaxPx + 'px' : ''})`).join('; '),
      'Cut words first (a headline is a title, not a sentence). Then give it a wider measure. Lower the size only as a last resort and never below the scale you chose. A real statement paragraph belongs in a <p> or <blockquote> at ' + stmtMaxPx + 'px or less.');
  }
  const longStatements = m.headings.filter((h) => isStatement(h) && h.lines > stmtMaxLines);
  if (longStatements.length) {
    add('WARN', 'statement-length', `${longStatements.length} large-set statement(s) run past ${stmtMaxLines} lines at ${width}px: ` + longStatements.slice(0, 3).map((h) => `"${h.text.slice(0, 40)}…" → ${h.lines} lines at ${h.size}px`).join('; '),
      'A statement set large is about 30 words. Cut it, or set the rest as ordinary body text.');
  }
  if (m.hero && m.hero.words > 10) add('WARN', 'hero-words', `Hero headline is ${m.hero.words} words ("${m.hero.text.slice(0, 60)}"). Gallery median is 5.`, 'Say the one thing. Move the rest to the supporting line.');
  if (m.headingSummary.mixedFontHeadings) add('WARN', 'mixed-font-headline', `${m.headingSummary.mixedFontHeadings} headline(s) switch typeface or to italic mid-line (the "one italic serif word" move).`, 'Set the whole headline in one face. Emphasis comes from the words.');

  // --- banned furniture
  if (m.eyebrows.length) {
    add('FAIL', 'eyebrow', `${m.eyebrows.length} eyebrow/kicker label(s) above headings: ` + m.eyebrows.slice(0, 5).map((e) => `"${e.text}"${e.pill ? ' (pill)' : ''} above "${e.above}"`).join('; '),
      'Delete them. If the label carried real information, fold it into the headline or the supporting sentence.');
  }
  if (m.type.monoProseShare > 0) {
    add('FAIL', 'mono', `Monospace type outside code: ${m.type.monoFamilies.join(', ')} — e.g. ${m.type.monoSamples.slice(0, 4).map((s) => `"${s}"`).join(', ')}`,
      'Set it in the text face. Monospace is for literal code inside <pre>/<code> only.');
  }
  if (m.numbered.length) {
    add('FAIL', 'numbering', `Decorative index numbers: ${m.numbered.slice(0, 6).map((n) => `"${n.text}"`).join(', ')}`,
      'Remove them. If order truly matters, write it into the words ("First, …") or use a real <ol>.');
  }
  if (m.type.microLabels >= 3) add('FAIL', 'micro-label', `${m.type.microLabels} tiny uppercase letter-spaced labels (e.g. ${m.type.microSamples.slice(0, 4).map((s) => `"${s}"`).join(', ')}).`, 'Use sentence-case text at a readable size, or delete the label.');
  else if (m.type.microLabels > 0) add('WARN', 'micro-label', `${m.type.microLabels} tiny uppercase letter-spaced label(s): ${m.type.microSamples.slice(0, 3).map((s) => `"${s}"`).join(', ')}`, 'Prefer sentence case at body size.');
  if (m.page.emoji.length) add('FAIL', 'emoji', `Emoji in the page: ${m.page.emoji.join(' ')}`, 'Remove. Use words or real imagery.');

  // --- surfaces
  const s = m.surfaces;
  if (s.gradients) add('FAIL', 'gradient', `${s.gradients} gradient fill(s): ${s.gradientSamples.slice(0, 3).join(' | ')}`, 'Use a flat colour or a real image. The only gradient allowed by default is a neutral scrim over a photo for legibility.');
  if (s.gradientText) add('FAIL', 'gradient-text', `${s.gradientText} gradient-filled text element(s).`, 'Solid colour text.');
  if (s.shadowStatic) add('FAIL', 'shadow', `${s.shadowStatic} box-shadow(s) on elements at rest: ${s.shadowSamples.slice(0, 3).join(' | ')}`, 'Remove. Separate surfaces with a tone step or space. Shadows are for things that really float (menus, dialogs, sticky bars).');
  if (s.textShadow) add('FAIL', 'text-shadow', `${s.textShadow} text-shadow(s).`, 'Remove; fix legibility with a scrim or a different crop.');
  if (m.buttons.withGradient || m.buttons.withShadow) add('FAIL', 'button-fx', `Buttons with ${m.buttons.withGradient ? 'gradient fill' : ''}${m.buttons.withGradient && m.buttons.withShadow ? ' and ' : ''}${m.buttons.withShadow ? 'shadow/glow' : ''}.`, 'Flat fill, one colour.');
  if (s.hairlines) add(s.hairlines >= 2 ? 'FAIL' : 'WARN', 'hairline', `${s.hairlines} thin rule(s)/divider line(s): ${s.hairlineSamples.slice(0, 4).join(' | ')}`, 'Delete. Separate with space, a tone change, or scale. Lines are only for real tables and form fields.');
  if (s.outlinedBoxes >= 3) add('FAIL', 'outlined-box', `${s.outlinedBoxes} boxes drawn with a 1px outline.`, 'Define a surface by its fill (one tone step from the page) or leave the content unboxed.');
  else if (s.outlinedBoxes) add('WARN', 'outlined-box', `${s.outlinedBoxes} box(es) drawn with a 1px outline.`, 'Prefer a filled surface or no box.');
  if (s.dashed) add('WARN', 'dashed', `${s.dashed} dashed/dotted border(s).`, 'Remove unless it is a real drop zone.');
  if (s.blurred > 1) add('WARN', 'glass', `${s.blurred} backdrop-blur surfaces.`, 'One blurred sticky bar at most; glass cards are a tell.');
  const iconRows = s.cardRows.filter((c) => c.iconTopped);
  if (iconRows.length) add('FAIL', 'icon-cards', `${iconRows.length} row(s) of identical cards each topped with a small icon (${iconRows.map((c) => c.count).join(', ')} cards).`, 'Replace with one composed section from the direction: a narrative split, a list set in large type, or real imagery per item.');
  else if (s.cardRows.length >= 2) add('WARN', 'card-rows', `${s.cardRows.length} rows of identical boxed cards.`, 'Vary the composition; not every section is a card grid.');
  if (m.nav?.floatingPill) add('WARN', 'pill-nav', 'Floating rounded pill navigation.', 'Use a plain bar: wordmark left, a few links, one action.');

  // --- colour
  const fams = new Map();
  const note = (label, hsl) => { const f = colourFamily(hsl); if (f) fams.set(f, [...(fams.get(f) || []), label]); };
  note('page background ' + m.color.bodyBg, m.color.bodyBgHsl);
  for (const sb of m.color.sectionBgs) note('section ' + sb.color, sb.hsl || hexToHsl(sb.color));
  if (m.color.button) note('button ' + m.color.button.bg, m.color.button.hsl || hexToHsl(m.color.button.bg));
  for (const t of m.color.textColors) if (t.share >= 0.01) note('text ' + t.color, hexToHsl(t.color));
  if (fams.has('terracotta') && fams.has('cream')) add('FAIL', 'palette-claude', `Cream + terracotta palette (${[...fams.get('cream'), ...fams.get('terracotta')].slice(0, 4).join(', ')}).`, 'Re-draw the palette from the library. This pairing reads as an assistant brand, not yours.');
  else if (fams.has('terracotta')) add('FAIL', 'palette-terracotta', `Terracotta / rust-orange accent (${fams.get('terracotta').slice(0, 3).join(', ')}).`, 'Use the accent from the drawn palette.');
  else if (fams.has('cream')) add('WARN', 'palette-cream', `Yellow-cream background (${fams.get('cream').slice(0, 3).join(', ')}).`, 'Use the drawn palette. If you want warmth, take a low-chroma stone or bone, not a yellow cream.');
  if (fams.has('ai-purple')) add('FAIL', 'palette-purple', `Indigo / violet (${fams.get('ai-purple').slice(0, 3).join(', ')}).`, 'Use the accent from the drawn palette.');
  if (m.color.textColors.some((t) => t.color === '#0000ee' || t.color === '#551a8b')) add('WARN', 'default-link', 'Browser-default blue/purple link colour is showing.', 'Style every link: inherit the text colour and mark it with weight, underline offset, or the accent.');
  const veryLow = m.color.lowContrast.filter((c) => c.ratio < 2.6);
  if (veryLow.length) add('FAIL', 'contrast', `Unreadable text: ` + veryLow.slice(0, 4).map((c) => `"${c.text}" ${c.ratio}:1 (${c.fg} on ${c.bg})`).join('; '), 'Raise contrast to at least 4.5:1 for text, 3:1 for large display.');
  else if (m.color.lowContrast.length) add('WARN', 'contrast', `Low-contrast text: ` + m.color.lowContrast.slice(0, 4).map((c) => `"${c.text}" ${c.ratio}:1 needs ${c.need}:1`).join('; '), 'Darken or lighten the text colour.');

  // --- type system
  const realFams = m.type.families.filter((f) => f.share >= 0.02);
  if (realFams.length > 3) add('FAIL', 'font-count', `${realFams.length} typefaces in use (${realFams.map((f) => f.family).join(', ')}).`, 'Two at most: one display, one text. Often one is enough.');
  else if (realFams.length === 3) add('WARN', 'font-count', `3 typefaces in use (${realFams.map((f) => f.family).join(', ')}).`, 'Two at most.');
  if (m.type.notLoaded.length) add('WARN', 'font-fallback', `Typeface(s) declared but not loaded, so a fallback is rendering: ${m.type.notLoaded.join(', ')}`, 'Fix the font URL / family name, or the screenshots you are judging are not the design.');
  if (m.type.sizeCount > 9) add('WARN', 'size-count', `${m.type.sizeCount} different font sizes (${m.type.sizes.join(', ')}).`, 'A page needs about five: display, heading, lead, body, small.');
  // Tiny text is the fault the study's best sites share (about a quarter of them); it is not copied here.
  if (m.type.body && m.type.body.size < 15) add('FAIL', 'body-size', `Body text is ${m.type.body.size}px (the size most of the running text is set in).`, 'Body copy 16–20px. Map small sizes from blueprints onto your body step.');
  else if (m.type.body && m.type.body.size < 16 && !mobile) add('WARN', 'body-size', `Body text is ${m.type.body.size}px.`, 'Body copy 16–20px.');
  if (m.type.body?.contrast && m.type.body.contrast < 7) add('WARN', 'grey-body', `The running text is a soft grey on its ground (${m.type.body.contrast}:1).`, 'Set body copy in the full ink (7:1 or more). Keep the muted ink for secondary notes; pages read thin and unfinished when everything is grey.');
  if (m.buttons.inHero === 0) add('WARN', 'first-action', `No visible button in the first ${mobile ? 'phone ' : ''}screen.`, mobile ? 'On a phone the first screen still holds the headline, the supporting sentence and the action; move navigation into one row or a menu so it does not push them down.' : 'Give the one primary action a real button in the first screen (a filled or solid-bordered control, 44px or taller), not only a link in the navigation.');
  // Models skip pictures when nothing makes them: the page must carry real ones (see SKILL.md, imagery).
  if (width >= 1100 && m.page.realPictures != null) {
    const pics = m.page.realPictures + m.page.uiPictures;
    if (pics < 4) add('FAIL', 'few-pictures', `Only ${pics} picture(s) on the page (${m.page.realPictures} photographs, footage or raster images, ${m.page.uiPictures} interface fragments). Drawings in SVG do not count.`, 'Find real pictures of the subject\'s world with scripts/assets.mjs (photographs, archival images, maps, engravings, footage), download them to assets/ and give them room: a hero picture, one per section that has a subject, a full-width band. At least four, usually six to twelve.');
    else if (m.page.realPictures < 2) add('WARN', 'no-real-pictures', `Only ${m.page.realPictures} real photograph(s) or clip(s); the rest are interface fragments.`, 'Add two or more real pictures of the customer\'s world from scripts/assets.mjs, not stock of people at laptops.');
    if (!m.page.videoCount) add('WARN', 'no-footage', 'No video anywhere on the page.', 'Look for one honest clip with scripts/assets.mjs --video (the place, the material, the process) and use it as a muted loop with a poster frame. Defend its absence only if no clip fits the subject.');
  }
  if (m.page.sideScrollers) add('WARN', 'side-scroll', `${m.page.sideScrollers} row(s) scroll sideways with content past their edge.`, 'Jurors and most visitors read a row cut at the edge as clipped, not as scrollable. Wrap it onto more lines, or end it inside the grid.');
  if (m.page.blendText) add('WARN', 'blend-text', `${m.page.blendText} text element(s) use mix-blend-mode difference or exclusion.`, 'Over anything but black, white or grey, blended text takes random hues (blue on orange, lilac on green) that jurors read as a glitch. Use a solid ink chosen for the ground, or keep the blended text over neutral grounds only.');
  if (m.type.measureChars && m.type.measureChars > 88 && !mobile) add('WARN', 'measure', `Longest paragraph runs about ${m.type.measureChars} characters per line.`, 'Cap paragraphs at 45–75 characters (max-width: 60ch).');
  if (m.type.smallText > 3) add('FAIL', 'small-text', `${m.type.smallText} text blocks under 13px.`, 'Nothing meant to be read goes below 13px.');
  else if (m.type.smallText > 0) add('WARN', 'small-text', `${m.type.smallText} text block(s) under 13px.`, 'Nothing meant to be read goes below 13px.');
  if (m.type.centerShare > 0.72 && m.headings.length >= 4) add('WARN', 'all-centred', `${Math.round(m.type.centerShare * 100)}% of the text is centre-aligned.`, 'Centre one moment at most; anchor the rest to a shared left edge.');

  // --- breakage
  if (m.page.uiAbuse) add('FAIL', 'ui-wrapper', 'A data-ui element wraps a heading or more than a screen and a half of the page.', 'data-ui marks a cropped interface fragment only. Remove it from page-level wrappers.');
  if (m.page.horizontalOverflow) add('FAIL', 'overflow', `Page scrolls sideways by ${m.page.horizontalOverflow}px at ${width}px.${m.page.overflowCulprits?.length ? ' Widest offenders: ' + m.page.overflowCulprits.join(', ') + '.' : ''}`, 'Constrain the element that is wider than the viewport (max-width: 100%, or overflow: clip on its section).');
  if (m.page.brokenImages.length) add('FAIL', 'broken-image', `Broken image(s): ${m.page.brokenImages.slice(0, 4).join(', ')}`, 'Fix the URL or replace the asset.');
  if (!m.hero) add('WARN', 'no-hero', 'No headline found in the first viewport.', 'The first screen needs a clear focal statement or image.');
  // One dominant thing per first screen: large type, or a picture that holds a third of it, or (for software) an interface fragment.
  else if (!mobile && m.hero.vw < 4.5 && (m.heroMedia[0]?.ratio || 0) < 0.3 && !m.page.uiFragments) {
    add('FAIL', 'focal-point', `The first screen has no dominant element: the largest type is ${m.hero.size}px (${m.hero.vw}vw) and no single picture holds a third of the viewport.`, 'Make one thing lead: the headline at display size, or one large picture. A grid of many small pictures is not one thing; in blind tests jurors marked a first screen without a headline down every time. On the strongest studied sites the largest type has a median of 8.4vw.');
  }

  return out;
}

export const RULE_IDS = ['headline-lines', 'statement-length', 'focal-point', 'hero-words', 'mixed-font-headline', 'eyebrow', 'mono', 'numbering', 'micro-label', 'emoji', 'gradient', 'gradient-text', 'shadow', 'text-shadow', 'button-fx', 'hairline', 'outlined-box', 'dashed', 'glass', 'icon-cards', 'card-rows', 'pill-nav', 'palette-claude', 'palette-terracotta', 'palette-cream', 'palette-purple', 'default-link', 'contrast', 'font-count', 'font-fallback', 'size-count', 'body-size', 'measure', 'small-text', 'all-centred', 'ui-wrapper', 'overflow', 'broken-image', 'no-hero', 'first-action', 'grey-body', 'blend-text', 'covered-text', 'clipped-text', 'pinned-over-picture', 'empty-screens', 'long-pin', 'side-scroll', 'few-pictures', 'no-real-pictures', 'no-footage', 'still-page'];
