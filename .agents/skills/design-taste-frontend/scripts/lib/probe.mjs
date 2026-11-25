// probe() runs INSIDE the page (it is serialised and evaluated through cdp.mjs), so it must stay
// self-contained: no imports, no closures over module scope.
// It measures what a design reviewer looks at — headline line counts, the type system, colour,
// surfaces, decoration — and the specific tells this skill bans.
export function probe() {
  const W = innerWidth, H = innerHeight, SY = scrollY;
  const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

  // --- colour normalisation (handles oklch(), color(), named colours, etc.)
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = 1;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  const colorCache = new Map();
  const rgba = (c) => {
    if (colorCache.has(c)) return colorCache.get(c);
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const v = { r: d[0], g: d[1], b: d[2], a: round(d[3] / 255) };
    colorCache.set(c, v); return v;
  };
  const hex = (v) => '#' + [v.r, v.g, v.b].map((n) => n.toString(16).padStart(2, '0')).join('');
  const lum = (v) => {
    const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(v.r) + 0.7152 * f(v.g) + 0.0722 * f(v.b);
  };
  const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return round((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), 1); };
  const hsl = (v) => {
    const r = v.r / 255, g = v.g / 255, b = v.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = (mx + mn) / 2; let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    }
    return { h: Math.round(h), s: round(s), l: round(l) };
  };

  // --- monospace detection by measurement, not by font name
  const mctx = document.createElement('canvas').getContext('2d');
  const monoCache = new Map();
  const isMono = (family) => {
    if (monoCache.has(family)) return monoCache.get(family);
    mctx.font = `40px ${family}`;
    const a = mctx.measureText('iiiiiiii').width, b = mctx.measureText('WWWWWWWW').width;
    const v = Math.abs(a - b) < 1;
    monoCache.set(family, v); return v;
  };
  const firstFam = (ff) => ff.split(',')[0].replace(/["']/g, '').trim();
  // Text kept for screen readers only (the usual .sr-only / .visually-hidden patterns) is not on the page.
  const srHidden = (el) => {
    for (let p = el, i = 0; p && p !== document.body && i < 4; p = p.parentElement, i++) {
      const cs = getComputedStyle(p); const r = p.getBoundingClientRect();
      if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\(50%\)/.test(cs.clipPath) || (r.width <= 2 && r.height <= 2 && cs.overflow !== 'visible')) return true;
    }
    return false;
  };
  const GENERIC = /^(serif|sans-serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace|ui-rounded|cursive|fantasy|inherit|-apple-system|BlinkMacSystemFont|Segoe UI|Arial|Helvetica|Helvetica Neue|Times New Roman|Times|Georgia|Verdana|Tahoma|Courier New|Courier|Roboto|Apple Color Emoji)$/i;

  // --- collect elements
  const all = [...document.body.querySelectorAll('*')].slice(0, 9000);
  const texts = [];
  const big = [];
  for (const el of all) {
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const area = r.width * r.height;
    if (area >= 60 * 30) big.push({ el, r, cs, area, top: r.top + SY });
    let direct = '';
    for (const n of el.childNodes) if (n.nodeType === 3) direct += n.nodeValue;
    direct = direct.replace(/\s+/g, ' ').trim();
    if (!direct) continue;
    if (tag === 'OPTION' || el.closest('svg') || srHidden(el)) continue;
    const size = parseFloat(cs.fontSize);
    if (!size || size < 6) continue;
    const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) / size;
    const lh = cs.lineHeight === 'normal' ? 1.2 : parseFloat(cs.lineHeight) / size;
    texts.push({
      el, tag, text: direct, chars: direct.length, fam: firstFam(cs.fontFamily), ff: cs.fontFamily,
      size: round(size, 1), weight: +cs.fontWeight || 400, ls: round(ls, 3), lh: round(lh, 2),
      upper: cs.textTransform === 'uppercase' || (direct.length > 2 && direct === direct.toUpperCase() && /[A-Z]{2}/.test(direct)),
      italic: cs.fontStyle === 'italic', align: cs.textAlign, color: cs.color,
      top: r.top + SY, bottom: r.bottom + SY, left: r.left, right: r.right, w: r.width, h: r.height,
      clipText: (cs.webkitBackgroundClip || cs.backgroundClip || '').includes('text'),
      inCode: !!el.closest('pre, code, kbd, samp, textarea'), inUI: !!el.closest('[data-ui]'), textShadow: cs.textShadow !== 'none',
    });
  }

  // --- heading blocks: climb from a large text node to the block that holds the whole headline
  // An element that is a complete text unit by itself: separate links, list items or paragraphs set large
  // are separate lines of content, never the wrapped lines of one headline.
  const UNIT = 'h1, h2, h3, h4, h5, h6, [role="heading"], p, li, a, button, blockquote, dt, dd, figcaption, td, th, label, summary';
  const blockOf = (t) => {
    let cur = t.el;
    // usable as the block when it holds only this size of type (a title with its own small description is not one block)
    const clean = (el) => (el.innerText || '').trim().length <= 320 && !texts.some((o) => o.el !== t.el && el.contains(o.el) && o.size < t.size * 0.72);
    let unit = t.el.closest(UNIT);
    if (unit && unit.matches('a, button')) { const outer = unit.parentElement?.closest('h1, h2, h3, h4, h5, h6, p, blockquote, li'); if (outer && clean(outer)) unit = outer; }
    if (unit && clean(unit)) return unit;
    while (cur.parentElement && cur.parentElement !== document.body) {
      if (cur.matches(UNIT)) break;
      const p = cur.parentElement;
      if (p.matches('ul, ol, dl, nav, menu, table, tbody')) break;
      const inner = (p.innerText || '').trim();
      if (inner.length > 220) break;
      let ok = true;
      for (const o of texts) if (o.el !== t.el && p.contains(o.el) && o.size < t.size * 0.72) { ok = false; break; }
      if (!ok) break;
      cur = p;
    }
    return cur;
  };
  // Count lines from the text itself: inline images or media set inside a sentence are not lines.
  const linesOf = (el, size) => {
    const tops = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.nodeValue.trim()) continue;
      range.selectNodeContents(node);
      for (const rc of range.getClientRects()) {
        if (rc.width < 1 || rc.height < size * 0.35) continue;
        const mid = rc.top + rc.height / 2;
        if (!tops.some((t) => Math.abs(t - mid) < size * 0.55)) tops.push(mid);
      }
    }
    return Math.max(1, tops.length);
  };
  const describeBlock = (el, t) => {
    const r = el.getBoundingClientRect();
    const text = (el.innerText || t.text).replace(/\s+/g, ' ').trim();
    const cx = (r.left + r.right) / 2 / W;
    const fams = new Set(texts.filter((o) => el.contains(o.el)).map((o) => o.fam + (o.italic ? ' italic' : '')));
    return {
      text: text.slice(0, 200), words: text.split(' ').filter(Boolean).length, chars: text.length,
      lines: linesOf(el, t.size), size: t.size, vw: round((t.size / W) * 100, 1), font: t.fam, weight: t.weight,
      tracking: t.ls, leading: t.lh, upper: t.upper, italic: t.italic, mono: isMono(t.ff),
      align: /center/.test(t.align) ? 'center' : /right|end/.test(t.align) ? 'right' : 'left',
      position: cx < 0.42 ? 'left' : cx > 0.58 ? 'right' : 'center',
      widthRatio: round(r.width / W), top: Math.round(r.top + SY), mixedFonts: fams.size > 1 ? [...fams] : undefined,
      gradientText: texts.some((o) => el.contains(o.el) && o.clipText) || undefined, tag: el.tagName.toLowerCase(),
      // a title (h1–h6, or unmarked large text) or a statement (a paragraph, quotation or list item set large)
      kind: el.closest('h1,h2,h3,h4,h5,h6,[role="heading"]') || el.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]') ? 'heading'
        : t.el.closest('p, blockquote, li, dd, q, figcaption') || text.length > 150 ? 'statement' : 'heading',
    };
  };
  const headingMin = W < 600 ? 22 : Math.max(26, W * 0.019);
  const seenBlocks = new Set();
  const headings = [];
  for (const t of texts.filter((x) => x.size >= headingMin && !x.inCode).sort((a, b) => b.size - a.size)) {
    const blk = blockOf(t);
    if (seenBlocks.has(blk) || [...seenBlocks].some((b) => b.contains(blk) || blk.contains(b))) continue;
    seenBlocks.add(blk);
    const d = describeBlock(blk, t);
    if (d.kind === 'statement' && d.chars > 150 && d.size <= 30) continue; // a lead paragraph, not display type
    headings.push({ ...d, _el: blk });
  }
  headings.sort((a, b) => a.top - b.top);

  // hero headline = largest heading block that starts inside the first viewport
  const inHero = headings.filter((h) => h.top < H * 0.95);
  let hero = inHero.slice().sort((a, b) => b.size - a.size || b.chars - a.chars)[0] || null;
  if (hero) hero.kind = 'heading'; // the main line of the first screen is a headline whatever its tag
  const h1el = document.querySelector('h1');
  if (!hero) {
    // quiet pages: fall back to the h1, then to the largest text in the first viewport
    const h1r = h1el && h1el.getBoundingClientRect();
    const pick = (h1r && h1r.top < H * 0.95 && h1r.width > 0 && texts.find((t) => h1el.contains(t.el))) ||
      texts.filter((t) => t.top - SY < H * 0.95 && t.size >= 18 && t.chars >= 8).sort((a, b) => b.size - a.size)[0];
    if (pick) { const blk = h1el && h1el.contains(pick.el) ? h1el : blockOf(pick); hero = { ...describeBlock(blk, pick), _el: blk }; }
  }
  let h1 = null;
  if (h1el && h1el.getBoundingClientRect().width > 0) {
    const cs = getComputedStyle(h1el); const size = parseFloat(cs.fontSize);
    const text = (h1el.innerText || '').replace(/\s+/g, ' ').trim();
    h1 = { text: text.slice(0, 200), words: text.split(' ').filter(Boolean).length, lines: linesOf(h1el, size), size: round(size, 1), font: firstFam(cs.fontFamily) };
  }

  // --- eyebrows: a small short label sitting directly above a heading block
  // Sticky and fixed layers overlap other content by design; their geometry says nothing about what labels what.
  const pinned = (el) => { for (let p = el; p && p !== document.body; p = p.parentElement) { const pos = getComputedStyle(p).position; if (pos === 'fixed' || pos === 'sticky') return true; } return false; };
  const eyebrows = [];
  for (const h of headings) {
    const hr = h._el.getBoundingClientRect(); const htop = hr.top + SY;
    if (h._el.closest('[data-ui]')) continue;
    const cand = texts.filter((t) => !t.inUI && !h._el.contains(t.el) && t.size <= Math.min(18, h.size * 0.5) && t.chars <= 44 && t.chars >= 2 &&
      t.bottom <= htop + 4 && htop - t.bottom <= Math.min(140, Math.max(72, h.size * 1.1)) && t.right > hr.left - 8 && t.left < hr.right + 8 &&
      !t.el.closest('button') &&
      !t.el.closest('nav, [role="navigation"], footer') && !(t.top < 120 && t.el.closest('header')) && !pinned(t.el) && pinned(h._el) === false)
      .sort((a, b) => b.bottom - a.bottom)[0];
    if (!cand) continue;
    // must be alone on its row (a real paragraph above a heading is not an eyebrow)
    if (texts.some((t) => t !== cand && Math.abs(t.top - cand.top) < 6 && t.chars > 44)) continue;
    // a note that sits closer to the heading above it than to this one belongs to that heading
    const gapDown = htop - cand.bottom;
    if (headings.some((o) => o !== h && !o._el.contains(cand.el) && (() => { const or = o._el.getBoundingClientRect(); const gapUp = cand.top - (or.bottom + SY); return gapUp >= -2 && gapUp < gapDown && or.left < cand.right && or.right > cand.left; })())) continue;
    let pill = false; let p = cand.el;
    for (let i = 0; i < 3 && p; i++, p = p.parentElement) {
      const cs = getComputedStyle(p); const pr = p.getBoundingClientRect();
      if (pr.width < 420 && pr.height < 56 && parseFloat(cs.borderTopLeftRadius) >= 10 && (rgba(cs.backgroundColor).a > 0.04 || parseFloat(cs.borderTopWidth) > 0)) pill = true;
    }
    eyebrows.push({ text: cand.text.slice(0, 50), above: h.text.slice(0, 40), upper: cand.upper, tracked: cand.ls >= 0.04, mono: isMono(cand.ff), pill, size: cand.size, top: Math.round(cand.top) });
  }

  // --- decorative numbering: 01 / 02 / (03) / 04. / 001 / "Step 02"
  const numbered = texts.filter((t) => !t.inCode && !t.inUI && (/^[(\[\/#]?\s?0\d{1,2}\s?[)\]\/.:—–-]?$/.test(t.text) || /^0\d\s?[\/.—–-]\s/.test(t.text) || /^(step|phase|no\.?|n°|nº|chapter|part|fig\.?)\s?0\d{1,2}\b/i.test(t.text)));

  // --- type system
  const famChars = new Map(); const sizeChars = new Map(); let totalChars = 0; let monoChars = 0; let monoProse = 0; const monoFams = new Set(); const monoSamples = [];
  let microLabels = 0; let microLabelChars = 0; let upperChars = 0; let centerChars = 0; const microSamples = [];
  for (const t of texts) {
    totalChars += t.chars;
    famChars.set(t.fam, (famChars.get(t.fam) || 0) + t.chars);
    if (!t.inUI) { const s = Math.round(t.size); sizeChars.set(s, (sizeChars.get(s) || 0) + t.chars); } // interface fragments keep their own sizes
    if (isMono(t.ff)) {
      monoChars += t.chars; monoFams.add(t.fam);
      if (!t.inCode) { monoProse += t.chars; if (monoSamples.length < 6) monoSamples.push(t.text.slice(0, 40)); }
    }
    if (t.size <= 14 && t.upper && t.ls >= 0.05 && !t.inUI && !t.el.closest('nav, button, a[href]')) { microLabels++; microLabelChars += t.chars; if (microSamples.length < 6) microSamples.push(t.text.slice(0, 40)); }
    if (t.upper) upperChars += t.chars;
    if (/center/.test(t.align)) centerChars += t.chars;
  }
  const families = [...famChars.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([family, chars]) => ({ family, share: round(chars / totalChars), mono: isMono(`"${family}", serif`) && isMono(`"${family}", sans-serif`) }));
  const bodyTexts = texts.filter((t) => t.size >= 10 && t.size <= 24 && t.chars >= 60 && !t.inCode && !t.inUI);
  const bodyBy = new Map();
  for (const t of bodyTexts) { const k = t.fam + '|' + Math.round(t.size); bodyBy.set(k, (bodyBy.get(k) || 0) + t.chars); }
  const bodyTop = [...bodyBy.entries()].sort((a, b) => b[1] - a[1])[0];
  const bodySample = bodyTop ? bodyTexts.find((t) => t.fam + '|' + Math.round(t.size) === bodyTop[0]) : null;
  const longest = bodyTexts.slice().sort((a, b) => b.chars - a.chars)[0];
  const sizes = [...sizeChars.entries()].sort((a, b) => a[0] - b[0]).map(([s]) => s);
  const maxText = texts.slice().sort((a, b) => b.size - a.size)[0];
  const smallText = texts.filter((t) => t.size < 13 && t.chars >= 12 && !t.inUI && !t.inCode).length; // interface fragments keep their true sizes
  const loaded = new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '').toLowerCase()));
  const declared = new Set([...document.fonts].map((f) => f.family.replace(/["']/g, '').toLowerCase()));
  const notLoaded = families.map((f) => f.family).filter((f) => !GENERIC.test(f) && !loaded.has(f.toLowerCase()) && (declared.has(f.toLowerCase()) || declared.size > 0));

  // --- colours
  const bodyBg = (() => {
    for (const el of [document.body, document.documentElement]) { const v = rgba(getComputedStyle(el).backgroundColor); if (v.a > 0.5) return v; }
    return { r: 255, g: 255, b: 255, a: 1 };
  })();
  const sectionBgs = [];
  for (const b of big) {
    if (b.area < W * H * 0.3) continue;
    const v = rgba(b.cs.backgroundColor); if (v.a < 0.9) continue;
    const hx = hex(v); if (!sectionBgs.some((s) => s.color === hx)) sectionBgs.push({ color: hx, top: Math.round(b.top), hsl: hsl(v) });
  }
  const textColorChars = new Map();
  for (const t of texts) { const v = rgba(t.color); if (v.a < 0.3) continue; const hx = hex(v); textColorChars.set(hx, (textColorChars.get(hx) || 0) + t.chars); }
  const textColors = [...textColorChars.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([color, c]) => ({ color, share: round(c / totalChars) }));

  // effective background behind an element (null when an image or gradient sits behind it)
  const bgBehind = (el) => {
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.backgroundImage !== 'none' || p.tagName === 'VIDEO' || p.tagName === 'CANVAS') return null;
      const v = rgba(cs.backgroundColor); if (v.a >= 0.9) return v;
      if (cs.position === 'absolute' || cs.position === 'fixed') return null; // may overlap media
    }
    return bodyBg;
  };
  // media that may sit behind text without being its ancestor (an absolutely placed hero image, a video layer)
  const mediaRects = big.filter((b) => b.area >= 120 * 80 && (b.el.tagName === 'IMG' || b.el.tagName === 'VIDEO' || b.el.tagName === 'CANVAS' || b.el.tagName === 'PICTURE' || b.el.tagName === 'IFRAME' || b.el.tagName === 'svg' || b.cs.backgroundImage !== 'none')).map((b) => ({ el: b.el, l: b.r.left, r: b.r.right, t: b.r.top + SY, b: b.r.bottom + SY }));
  const overMedia = (t) => {
    const area = Math.max(1, t.w * t.h);
    for (const m of mediaRects) {
      const ox = Math.min(t.right, m.r) - Math.max(t.left, m.l), oy = Math.min(t.bottom, m.b) - Math.max(t.top, m.t);
      if (ox > 0 && oy > 0 && (ox * oy) / area >= 0.25) return true;
    }
    return false;
  };
  const lowContrast = [];
  for (const t of texts) {
    if (t.chars < 4 || t.top - SY > H * 6) continue;
    const fg = rgba(t.color); if (fg.a < 0.99) continue;
    if (overMedia(t)) continue; // cannot know the pixels behind it; judge that from the screenshot
    // text blended with difference or exclusion inverts whatever lies under it; its colour alone says nothing
    let blended = false;
    for (let p = t.el, i = 0; p && p !== document.body && i < 6; p = p.parentElement, i++) if (/difference|exclusion/.test(getComputedStyle(p).mixBlendMode)) { blended = true; break; }
    if (blended) continue;
    const bg = bgBehind(t.el); if (!bg) continue;
    const c = contrast(fg, bg); const need = t.size >= 24 || (t.size >= 18.5 && t.weight >= 700) ? 3 : 4.5;
    if (c < need) lowContrast.push({ text: t.text.slice(0, 40), ratio: c, need, size: t.size, fg: hex(fg), bg: hex(bg) });
  }
  lowContrast.sort((a, b) => a.ratio - b.ratio);

  // --- buttons
  const buttons = [];
  for (const el of document.querySelectorAll('a, button, [role="button"], input[type="submit"]')) {
    const r = el.getBoundingClientRect(); if (r.height < 28 || r.height > 84 || r.width < 64 || r.width > Math.min(W * 0.96, 900)) continue;
    const cs = getComputedStyle(el); let bg = rgba(cs.backgroundColor); const bw = parseFloat(cs.borderTopWidth) || 0;
    const grad = cs.backgroundImage.includes('gradient(');
    if (grad && bg.a < 0.5) { const first = cs.backgroundImage.match(/(rgba?\([^)]+\)|oklch\([^)]+\)|color\([^)]+\)|#[0-9a-f]{3,8})/i); if (first) bg = rgba(first[1]); }
    if (bg.a < 0.5 && bw < 1) continue;
    const rad = parseFloat(cs.borderTopLeftRadius) || 0;
    buttons.push({
      text: (el.innerText || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 40), filled: bg.a >= 0.5, bg: bg.a >= 0.5 ? hex(bg) : null, bgHsl: bg.a >= 0.5 ? hsl(bg) : null, fg: hex(rgba(cs.color)),
      radius: rad >= r.height / 2 - 1 ? 'pill' : Math.round(rad), h: Math.round(r.height), top: Math.round(r.top + SY),
      shadow: cs.boxShadow !== 'none' && !/^rgba?\(0, 0, 0, 0\)/.test(cs.boxShadow), gradient: grad, upper: cs.textTransform === 'uppercase', mono: isMono(cs.fontFamily),
    });
  }
  const mode = (arr) => { const m = new Map(); for (const a of arr) m.set(JSON.stringify(a), (m.get(JSON.stringify(a)) || 0) + 1); const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0]; return top ? JSON.parse(top[0]) : undefined; };
  const filledBtns = buttons.filter((b) => b.filled);

  // --- surfaces and decoration
  const isOverlay = (el) => { for (let p = el, i = 0; p && i < 4; p = p.parentElement, i++) { const pos = getComputedStyle(p).position; if (pos === 'fixed' || pos === 'sticky') return true; if (p.matches('dialog, [role="dialog"], [role="menu"], [role="tooltip"], [popover]')) return true; } return false; };
  // real tables, form fields and interface fragments (marked data-ui) keep their own lines
  const formish = (el) => el.matches('input, textarea, select, table, thead, tbody, tr, td, th, hr') || !!el.closest('table, [data-ui]');
  let shadowStatic = 0, shadowOverlay = 0; const shadowSamples = []; let gradients = 0; let scrims = 0; const gradientSamples = []; let gradientText = 0;
  let hairlines = 0; const hairlineSamples = []; let outlinedBoxes = 0; let blurred = 0; let roundedBoxes = 0; let squareMedia = 0; let roundedMedia = 0; const mediaRadii = []; const boxRadii = [];
  let dashed = 0;
  const label = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')).slice(0, 60);
  for (const b of big) {
    const { cs, r, el } = b;
    const sh = cs.boxShadow;
    if (sh !== 'none' && !/^rgba?\(0, 0, 0, 0\) 0px 0px 0px 0px$/.test(sh)) {
      const outer = sh.split(/,(?![^(]*\))/).some((part) => !/inset/.test(part) && !/ 0px 0px 0px 0px/.test(part) && !/rgba\(\d+, \d+, \d+, 0\)/.test(part));
      if (outer) { if (isOverlay(el) || el.closest('[data-ui]')) shadowOverlay++; else { shadowStatic++; if (shadowSamples.length < 4) shadowSamples.push(label(el) + ' → ' + sh.slice(0, 80)); } }
    }
    if (cs.backgroundImage.includes('gradient(')) {
      if ((cs.webkitBackgroundClip || cs.backgroundClip || '').includes('text')) gradientText++;
      else if (b.area >= W * H * 0.02) {
        // neutral stops with changing alpha = a legibility scrim over media, not decoration
        const stops = [...cs.backgroundImage.matchAll(/rgba?\(([^)]+)\)/g)].map((mm) => mm[1].split(/[,\s/]+/).filter(Boolean).map(Number));
        const exotic = /oklch|oklab|color\(|lab\(|lch\(|hsl/.test(cs.backgroundImage);
        const scrim = !exotic && stops.length > 0 && stops.every((c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) <= 14) && stops.some((c) => c.length > 3 && c[3] < 1);
        if (scrim) scrims++; else { gradients++; if (gradientSamples.length < 4) gradientSamples.push(label(el) + ' → ' + cs.backgroundImage.slice(0, 110)); }
      }
    }
    if ((cs.backdropFilter && cs.backdropFilter !== 'none') || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none')) blurred++;
    const bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0, bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
    const thin = (w, c, style) => w > 0 && w <= 1.5 && style !== 'none' && rgba(c).a > 0.02;
    const topLine = thin(bt, cs.borderTopColor, cs.borderTopStyle), botLine = thin(bb, cs.borderBottomColor, cs.borderBottomStyle);
    const leftLine = thin(bl, cs.borderLeftColor, cs.borderLeftStyle), rightLine = thin(br, cs.borderRightColor, cs.borderRightStyle);
    if (!formish(el)) {
      if (topLine && botLine && leftLine && rightLine) { if (r.width >= 150 && r.height >= 80) outlinedBoxes++; }
      else if ((r.width >= 240 && (topLine || botLine)) || (r.height >= 240 && (leftLine || rightLine))) { hairlines++; if (hairlineSamples.length < 5) hairlineSamples.push(label(el) + ' ' + Math.round(r.width) + 'px'); }
      // thin dashed or dotted lines; a heavy dotted edge (3px or more) is a drawn perforation, not a hairline
      if ([[cs.borderTopStyle, bt], [cs.borderBottomStyle, bb], [cs.borderLeftStyle, bl], [cs.borderRightStyle, br]].some(([st, w]) => /dashed|dotted/.test(st) && w > 0 && w < 3)) dashed++;
    }
    const rad = parseFloat(cs.borderTopLeftRadius) || 0;
    const isMedia = el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'CANVAS' || /url\(/.test(cs.backgroundImage);
    if (isMedia && r.width >= 200 && r.height >= 140) {
      let effective = rad; let p = el.parentElement;
      for (let i = 0; i < 3 && p && effective === 0; i++, p = p.parentElement) { const pcs = getComputedStyle(p); if (pcs.overflow !== 'visible') effective = parseFloat(pcs.borderTopLeftRadius) || 0; }
      if (effective > 1) { roundedMedia++; mediaRadii.push(Math.round(effective)); } else squareMedia++;
    } else if (rad >= 6 && r.width >= 150 && r.height >= 80 && (rgba(cs.backgroundColor).a > 0.04 || bt > 0)) { roundedBoxes++; boxRadii.push(Math.round(Math.min(rad, 99))); }
  }
  // elements that are themselves a thin rule (1px tall or 1px wide)
  for (const el of all) {
    const r = el.getBoundingClientRect();
    const horiz = r.height > 0 && r.height <= 1.5 && r.width >= 160, vert = r.width > 0 && r.width <= 1.5 && r.height >= 160;
    if (!horiz && !vert) continue; if (formish(el) && (el.tagName !== 'HR' || el.closest('[data-ui]'))) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.03) continue;
    if (rgba(cs.backgroundColor).a > 0.02 || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0 || cs.backgroundImage !== 'none') { hairlines++; if (hairlineSamples.length < 5) hairlineSamples.push(label(el) + ' ' + Math.round(Math.max(r.width, r.height)) + 'px rule'); }
  }

  // --- repeated card rows (three or more same-size boxed siblings)
  const cardRows = [];
  const seenParents = new Set();
  for (const b of big) {
    const p = b.el.parentElement; if (!p || seenParents.has(p)) continue; seenParents.add(p);
    // cards carry text; a row of photographs or media tiles is not a card row
    const kids = [...p.children].filter((k) => { const r = k.getBoundingClientRect(); return r.width >= 150 && r.width < W * 0.9 && r.height >= 90 && !k.matches('img, picture, video, canvas, svg, figure:not(:has(figcaption))') && (k.innerText || '').trim().length >= 12; }); // full-width bands are sections, not cards
    if (kids.length < 3) continue;
    const boxed = kids.filter((k) => { const cs = getComputedStyle(k); return (rgba(cs.backgroundColor).a > 0.04 || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none') && true; });
    if (boxed.length < 3) continue;
    const w0 = boxed[0].getBoundingClientRect().width;
    const same = boxed.filter((k) => Math.abs(k.getBoundingClientRect().width - w0) < 3);
    if (same.length < 3) continue;
    const iconTop = same.filter((k) => { const first = k.querySelector('svg, img, i, [class*="icon" i]'); if (!first) return false; const r = first.getBoundingClientRect(); return r.width > 0 && r.width <= 64 && r.height <= 64; }).length;
    cardRows.push({ count: same.length, iconTopped: iconTop >= same.length - 1 && iconTop >= 3, rounded: (parseFloat(getComputedStyle(same[0]).borderTopLeftRadius) || 0) >= 6, top: Math.round(same[0].getBoundingClientRect().top + SY) });
  }

  // --- hero media
  const heroMedia = [];
  for (const b of big) {
    const { el, r, cs } = b; if (r.top > H * 0.9 || r.bottom < 0) continue;
    const type = el.tagName === 'IMG' ? 'img' : el.tagName === 'VIDEO' ? 'video' : el.tagName === 'CANVAS' ? 'canvas' : el.tagName === 'svg' && r.width > 240 ? 'svg' : /url\(/.test(cs.backgroundImage) ? 'bg-image' : el.tagName === 'IFRAME' ? 'iframe' : null;
    if (!type) continue;
    const vw = Math.max(0, Math.min(r.right, W) - Math.max(r.left, 0)), vh = Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0));
    const ratio = (vw * vh) / (W * H); if (ratio >= 0.08) heroMedia.push({ type, ratio: round(ratio) });
  }
  heroMedia.sort((a, b) => b.ratio - a.ratio);
  const brokenImages = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getBoundingClientRect().width > 0 && (i.currentSrc || i.src)).map((i) => (i.currentSrc || i.src).slice(0, 120)).slice(0, 8);

  // --- navigation
  const navEl = document.querySelector('header nav, nav, header, [role="navigation"]');
  let nav = null;
  if (navEl) {
    let host = navEl; let fixed = false; let p = navEl;
    for (let i = 0; i < 4 && p && p !== document.body; i++, p = p.parentElement) { const pos = getComputedStyle(p).position; if (pos === 'fixed' || pos === 'sticky') { fixed = true; host = p; break; } }
    const hr = host.getBoundingClientRect(); const hcs = getComputedStyle(host);
    const links = [...navEl.querySelectorAll('a')].filter((a) => { const r = a.getBoundingClientRect(); return r.width > 0 && r.top < 140; });
    nav = { links: links.length, fixed, height: Math.round(hr.height), floatingPill: hr.width < W * 0.92 && parseFloat(hcs.borderTopLeftRadius) >= 16 && hr.top > 4, blur: (hcs.backdropFilter || 'none') !== 'none' };
  }

  // data-ui is for cropped interface fragments, not for wrapping the page
  const uiAbuse = [...document.querySelectorAll('[data-ui]')].some((el) => el.querySelector('h1') || el.getBoundingClientRect().height > H * 1.6 || el === document.body);
  const uiFragments = document.querySelectorAll('[data-ui]').length;
  // pictures that were not drawn by the page's own code: photographs, footage, raster artwork.
  // Inline SVG and .svg files do not count; cropped interface fragments (data-ui) are counted apart.
  const svgSrc = (u) => /\.svg(\?|#|$)|^data:image\/svg/i.test(u || '');
  let realPictures = 0, videoCount = 0; const pictureSamples = [];
  for (const el of all) {
    if (el.closest('[data-ui]') || el.closest('svg')) continue;
    const r = el.getBoundingClientRect(); if (r.width < 120 || r.height < 90 || r.width * r.height < 160 * 120) continue;
    if (el.tagName === 'IMG') {
      const src = el.currentSrc || el.src;
      if (el.naturalWidth > 0 && !svgSrc(src)) { realPictures++; if (pictureSamples.length < 8) pictureSamples.push(src.split('/').pop().slice(0, 48)); }
      continue;
    }
    if (el.tagName === 'VIDEO') { realPictures++; videoCount++; continue; }
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg.includes('url(')) { const u = (bg.match(/url\(["']?([^"')]+)/) || [])[1]; if (!svgSrc(u)) realPictures++; }
  }
  const uiPictures = [...document.querySelectorAll('[data-ui]')].filter((el) => { const r = el.getBoundingClientRect(); return r.width >= 300 && r.height >= 200; }).length;
  // which elements push the page wider than the viewport (the deepest ones that are not clipped by an ancestor)
  let overflowCulprits = [];
  if (document.documentElement.scrollWidth > W + 2) {
    const clippedByAncestor = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { if (getComputedStyle(p).overflowX !== 'visible' && p.getBoundingClientRect().right <= W + 2) return true; } return false; };
    const wide = all.filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > W + 2 && !clippedByAncestor(el); });
    overflowCulprits = wide.filter((el) => !wide.some((o) => o !== el && el.contains(o))).slice(0, 3).map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : ''} (+${Math.round(el.getBoundingClientRect().right - W)}px)`);
  }
  // rows that scroll sideways with content past their edge (read as clipped in screenshots and by most visitors)
  const sideScrollers = all.filter((el) => { if (el.closest('[data-ui], table, pre, code')) return false; const cs = getComputedStyle(el); return /auto|scroll/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 24 && el.clientHeight > 40; }).length;
  const blendText = texts.filter((t) => { for (let p = t.el, i = 0; p && p !== document.body && i < 6; p = p.parentElement, i++) if (/difference|exclusion/.test(getComputedStyle(p).mixBlendMode)) return true; return false; }).length;
  const bodyText = document.body.innerText || '';
  const emoji = (bodyText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []);
  const doc = document.documentElement; const pageH = Math.max(doc.scrollHeight, document.body.scrollHeight);
  const headingStats = headings.map(({ _el, ...h }) => h);
  const heroOut = hero ? (({ _el, ...h }) => h)(hero) : null;
  const below = headingStats.filter((h) => !heroOut || h.top !== heroOut.top);

  return {
    viewport: { w: W, h: H },
    page: { height: pageH, screens: round(pageH / H, 1), words: bodyText.split(/\s+/).filter(Boolean).length,
      img: document.images.length, video: document.querySelectorAll('video').length, canvas: document.querySelectorAll('canvas').length, svg: document.querySelectorAll('svg').length, sections: document.querySelectorAll('section').length,
      horizontalOverflow: doc.scrollWidth > W + 2 ? doc.scrollWidth - W : 0, overflowCulprits, uiFragments, uiAbuse, realPictures, videoCount, uiPictures, pictureSamples, blendText, sideScrollers, brokenImages, emoji: [...new Set(emoji)].slice(0, 10) },
    hero: heroOut, h1,
    headings: headingStats.slice(0, 40),
    headingSummary: { count: headingStats.length, maxLines: Math.max(0, ...headingStats.map((h) => h.lines)), over2Lines: headingStats.filter((h) => h.lines > 2 && h.kind !== 'statement').length, statements: headingStats.filter((h) => h.kind === 'statement').length, centered: headingStats.filter((h) => h.align === 'center').length, medianWords: below.length ? below.map((h) => h.words).sort((a, b) => a - b)[Math.floor(below.length / 2)] : null, mixedFontHeadings: headingStats.filter((h) => h.mixedFonts).length },
    type: {
      families, familyCount: famChars.size, sizes, sizeCount: sizes.length, notLoaded,
      body: bodySample ? { font: bodySample.fam, size: bodySample.size, leading: bodySample.lh, weight: bodySample.weight, tracking: bodySample.ls, contrast: (() => { const bg = bgBehind(bodySample.el); return bg ? contrast(rgba(bodySample.color), bg) : null; })() } : null,
      measureChars: longest ? Math.round(longest.w / (longest.size * 0.5)) : null,
      max: maxText ? { size: maxText.size, vw: round((maxText.size / W) * 100, 1), font: maxText.fam, text: maxText.text.slice(0, 40) } : null,
      monoShare: round(monoChars / Math.max(1, totalChars)), monoProseShare: round(monoProse / Math.max(1, totalChars)), monoFamilies: [...monoFams], monoSamples,
      microLabels, microLabelShare: round(microLabelChars / Math.max(1, totalChars), 3), microSamples,
      upperShare: round(upperChars / Math.max(1, totalChars)), centerShare: round(centerChars / Math.max(1, totalChars)), smallText,
    },
    eyebrows, numbered: numbered.slice(0, 12).map((t) => ({ text: t.text.slice(0, 30), size: t.size, top: Math.round(t.top) })),
    color: {
      bodyBg: hex(bodyBg), bodyBgHsl: hsl(bodyBg), dark: lum(bodyBg) < 0.18, sectionBgs: sectionBgs.slice(0, 10), textColors,
      button: filledBtns.length ? { bg: mode(filledBtns.map((b) => b.bg)), hsl: mode(filledBtns.map((b) => b.bgHsl)), fg: mode(filledBtns.map((b) => b.fg)) } : null,
      lowContrast: lowContrast.slice(0, 6),
    },
    buttons: { count: buttons.length, inHero: buttons.filter((b) => b.top < H).length, radius: mode(buttons.map((b) => b.radius)), height: mode(buttons.map((b) => b.h)), withShadow: buttons.filter((b) => b.shadow).length, withGradient: buttons.filter((b) => b.gradient).length, mono: buttons.filter((b) => b.mono).length, upper: buttons.filter((b) => b.upper).length, heroLabels: buttons.filter((b) => b.top < H).map((b) => b.text).filter(Boolean).slice(0, 5) },
    surfaces: { shadowStatic, shadowOverlay, shadowSamples, gradients, scrims, gradientSamples, gradientText, hairlines, hairlineSamples, outlinedBoxes, dashed, blurred, roundedBoxes, boxRadius: mode(boxRadii) ?? 0, squareMedia, roundedMedia, mediaRadius: mode(mediaRadii) ?? 0, textShadow: texts.filter((t) => t.textShadow).length, cardRows: cardRows.slice(0, 8) },
    heroMedia: heroMedia.slice(0, 4), nav,
    fontsLoaded: [...loaded].slice(0, 12),
  };
}

// frame() runs at each scroll position the inspector photographs. It reports large text that something
// else is lying on top of (a picture sliding over a headline), and how much of the screen holds anything.
export function frame() {
  const W = innerWidth, H = innerHeight;
  const pinnedTop = (el) => { for (let p = el; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if ((cs.position === 'fixed' || cs.position === 'sticky') && p.getBoundingClientRect().top < 140 && p.getBoundingClientRect().height < 180) return true; } return false; };
  // 1. covered text. Hit-testing skips elements with pointer-events: none (a pinned title usually has it),
  // which would make whatever lies beneath look as if it were on top; switch it on while sampling.
  const hitStyle = document.createElement('style');
  hitStyle.textContent = '*, *::before, *::after { pointer-events: auto !important; }';
  document.head.appendChild(hitStyle);
  const covered = [], clipped = [], pinnedOver = [];
  const label = (el, direct) => (el.innerText || direct).replace(/\s+/g, ' ').trim().slice(0, 48);
  const pinnedLow = (el) => { for (let p = el; p && p !== document.body; p = p.parentElement) { const pcs = getComputedStyle(p); if (pcs.position === 'fixed' || pcs.position === 'sticky') return !pinnedTop(el); } return false; };
  // Does the element found on top actually paint anything there? A transparent layout box does not hide text.
  const paints = (hit, el) => {
    for (let p = hit; p && p !== document.body && !p.contains(el); p = p.parentElement) {
      if (/^(IMG|VIDEO|CANVAS|PICTURE|IFRAME|svg)$/.test(p.tagName) || p.closest('svg')) return true;
      const pcs = getComputedStyle(p);
      if (pcs.backgroundImage !== 'none') return true;
      const m = pcs.backgroundColor.match(/rgba?\(([^)]+)\)/); const parts = m ? m[1].split(/[,\s/]+/).filter(Boolean) : [];
      if (parts.length && (parts.length < 4 || parseFloat(parts[3]) > 0.05)) return true;
      if (p === hit) for (const n of p.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true; // its own text lies on ours
    }
    return false;
  };
  const pictures = [...document.querySelectorAll('img, picture, svg, canvas, video')].filter((m) => !m.parentElement?.closest('svg')).map((m) => ({ m, r: m.getBoundingClientRect() })).filter(({ r }) => r.width >= 80 && r.height >= 80 && r.bottom > 0 && r.top < H);
  for (const el of document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, li, a, button, span, div')) {
    let direct = ''; for (const n of el.childNodes) if (n.nodeType === 3) direct += n.nodeValue;
    if (direct.trim().length < 3) continue;
    const cs = getComputedStyle(el); const size = parseFloat(cs.fontSize); if (size < 24 || cs.visibility === 'hidden' || +cs.opacity < 0.3) continue;
    let srOnly = false;
    for (let p = el, i = 0; p && p !== document.body && i < 4; p = p.parentElement, i++) { const pcs = getComputedStyle(p); const pr = p.getBoundingClientRect(); if (pcs.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\(50%\)/.test(pcs.clipPath) || (pr.width <= 2 && pr.height <= 2 && pcs.overflow !== 'visible')) { srOnly = true; break; } }
    if (srOnly) continue;
    // the boxes that clip this text (overflow other than visible, or a clip-path)
    const clips = []; for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const pcs = getComputedStyle(p); if (pcs.overflowY !== 'visible' || pcs.overflowX !== 'visible' || pcs.clipPath !== 'none') clips.push(p.getBoundingClientRect()); }
    const pinned = size >= 32 && pinnedLow(el);
    // lines of one heading set as separate spans overlap each other's glyph boxes; that is not a collision
    const unit = el.closest('h1, h2, h3, h4, h5, h6, p, blockquote');
    const range = document.createRange(); let total = 0, hidden = 0, cutTop = false, area = 0, over = 0;
    for (const node of el.childNodes) {
      if (node.nodeType !== 3 || !node.nodeValue.trim()) continue;
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        if (r.width < 6 || r.bottom < 0 || r.top > H) continue;
        // sampled at two heights inside the line box (a display face's glyph box often spills past it and
        // under the next line), so a band lying over the top or the bottom of the letters is found too
        const lh = parseFloat(cs.lineHeight); const band = Math.min(r.height, Number.isFinite(lh) ? lh : r.height);
        for (const dy of [-0.2, 0.2]) for (const fx of [0.12, 0.37, 0.63, 0.88]) {
          const x = r.left + r.width * fx, y = r.top + r.height * 0.55 + band * dy; if (x < 0 || x >= W || y < 0 || y >= H) continue;
          total++; const hit = document.elementFromPoint(x, y);
          if (hit && hit !== el && !el.contains(hit) && !hit.contains(el) && !pinnedTop(hit) && !(unit && unit.contains(hit) && !/^(IMG|VIDEO|CANVAS|PICTURE|svg)$/.test(hit.tagName) && !hit.closest('svg')) && paints(hit, el)) hidden++;
        }
        // the glyph box starts above the capitals (ascender room), so only a cut well into it is a real crop
        if (size >= 40 && r.top >= -4 && clips.some((c) => c.top > r.top + r.height * 0.3 && c.top < r.bottom - r.height * 0.2)) cutTop = true;
        if (pinned) { area += r.width * r.height; for (const { m, r: pr } of pictures) { if (m.contains(el) || el.contains(m)) continue; const ox = Math.min(r.right, pr.right) - Math.max(r.left, pr.left), oy = Math.min(r.bottom, pr.bottom) - Math.max(r.top, pr.top); if (ox > 0 && oy > 0) over += ox * oy; } }
      }
    }
    if (total >= 4 && hidden / total >= 0.2) covered.push({ text: label(el, direct), share: Math.round((hidden / total) * 100) / 100 });
    if (cutTop) clipped.push({ text: label(el, direct) });
    if (pinned && area && over / area >= 0.15) pinnedOver.push({ text: label(el, direct), share: Math.min(1, Math.round((over / area) * 100) / 100) });
  }
  hitStyle.remove();
  // 2. how much of the screen holds anything: text glyph boxes, media, or a ground that differs from the page's
  const opaque = (c) => c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(c);
  const pageBg = [document.body, document.documentElement].map((e) => getComputedStyle(e).backgroundColor).find(opaque) || 'rgb(255, 255, 255)';
  const textRects = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const rg = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim() || !n.parentElement) continue; const pcs = getComputedStyle(n.parentElement); if (pcs.visibility === 'hidden' || +pcs.opacity < 0.2) continue;
    rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.bottom > 0 && r.top < H && r.width > 1) textRects.push(r);
  }
  let filled = 0, samples = 0;
  for (let gx = 0; gx < 24; gx++) for (let gy = 0; gy < 15; gy++) {
    const x = (gx + 0.5) * (W / 24), y = (gy + 0.5) * (H / 15); samples++;
    if (textRects.some((r) => x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 4 && y <= r.bottom + 4)) { filled++; continue; }
    let el = document.elementFromPoint(x, y);
    for (let i = 0; el && i < 6 && el !== document.body && el !== document.documentElement; i++, el = el.parentElement) {
      if (/^(IMG|VIDEO|CANVAS|PICTURE|svg|IFRAME)$/.test(el.tagName) || el.closest('svg')) { filled++; break; }
      const cs = getComputedStyle(el);
      if (cs.backgroundImage !== 'none') { filled++; break; }
      const bg = cs.backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { if (bg !== pageBg) filled++; break; }
    }
  }
  // 3. the large text in view, to spot one statement held on screen for screen after screen
  const big = [...new Set([...document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote')].filter((el) => { const r = el.getBoundingClientRect(); return parseFloat(getComputedStyle(el).fontSize) >= 32 && r.top >= -4 && r.bottom <= H + 4 && r.height > 0; }).map((el) => (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60)).filter((t) => t.length >= 4))];
  return { covered, clipped, pinnedOver, filled: Math.round((filled / samples) * 100) / 100, big, y: Math.round(scrollY) };
}

// Dominant colours of a screenshot. Runs inside any page; takes a data: URL.
export async function palette(dataUrl) {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const w = 96, h = Math.max(1, Math.round((96 * img.height) / img.width));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data; const bins = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4);
    const b = bins.get(k) || [0, 0, 0, 0]; b[0] += d[i]; b[1] += d[i + 1]; b[2] += d[i + 2]; b[3]++; bins.set(k, b);
  }
  const total = w * h;
  return [...bins.values()].sort((a, b) => b[3] - a[3]).slice(0, 6).map((b) => ({
    color: '#' + [0, 1, 2].map((i) => Math.round(b[i] / b[3]).toString(16).padStart(2, '0')).join(''), share: Math.round((b[3] / total) * 100) / 100,
  }));
}
