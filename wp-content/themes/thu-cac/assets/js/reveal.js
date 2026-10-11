// Scroll reveal, "Vào ga – đèn lên sân ga" (tram.css §19, the "Reveal" sections of season-*.css). Every frame below
// the first screen docks once like the hero tram braking, its look's ornament lights up, then its contents arrive,
// one station action per kind. Pure presentation; not loaded on the reader page.
//
// - Measure, then tag: only what is strictly below the fold at load gets [data-rv] (units: frames, the cabin art and
//   copy, the genre track) or [data-rv-item] (cards, board rows, ranked rows, route stops, Halloween spider marks), so
//   nothing in view or above it is ever hidden. Without JS, IntersectionObserver or motion the page stays untagged,
//   i.e. exactly as before.
// - Items take their turn 110ms after their frame starts docking (while it is still braking, its title being painted),
//   row by row (and column by column), even when they cross the line a moment after their neighbours; nothing waits
//   more than 480ms.
// - One IntersectionObserver: each element gets .is-in once, with --rv-d (its delay) and --rv-k (its speed: 1; .55
//   when the reader flings the page; 0 when it comes in from above, so it simply appears), then is unobserved.
// - When its animations have ended an element loses its markers again, so nothing can replay later (theme switch,
//   ranking tabs, resizing). A unit keeps only .rv-done.
// - The bookshelf's cards arrive after load: its first fill is dealt, later re-renders just appear.

const root = document.documentElement;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

const UNITS = [
  ["frame", ".section--block > .container > .block, .hall__grid > .ranking, .hall__grid > .board, .ranking-page .ranking, .route-panel, .site-footer__panel"],
  ["art", ".cabin__art"],
  ["copy", ".cabin__copy"],
];
// kind, selector, row step, column step (ms)
const ITEMS = [
  ["card", ".story-grid > .story-card", 110, 70],
  ["row", ".board__rows .board-row", 60, 0],
  ["rank", ".ranking__panel:not([hidden]) .rank-row", 55, 40],
  ["stop", ".route .stop", 35, 0],
];
const STEPS = { ...Object.fromEntries(ITEMS.map(([kind, , row, col]) => [kind, [row, col]])), spider: [0, 0] };
// Halloween: the spiders hanging under these frames (season-halloween.css).
const SPIDER_HOSTS = ".lines .block, .hall__grid > .board";
const MAX_WAIT = 480; // ms: nothing waits longer than this for its turn
const fresh = new Set(); // the bookshelf's first fill
const starts = new WeakMap(); // unit -> { at: when it starts docking, k, last: { kind: when its latest item starts } }
let io = null;

if ("IntersectionObserver" in window && !reduce.matches && !document.body.classList.contains("single-chapter")) init();

function init() {
  const vh = window.innerHeight;
  const found = [];
  for (const [kind, selector] of UNITS) for (const el of document.querySelectorAll(selector)) found.push([el, "rv", kind]);
  for (const [kind, selector] of ITEMS) for (const el of document.querySelectorAll(selector)) found.push([el, "rvItem", kind]);
  const track = document.querySelector(".lines__track");
  // Read every rect before writing anything (one layout, and nothing paints in between).
  const below = found.map(([el]) => el.getBoundingClientRect().top >= vh);
  const trackBelow = track ? track.getBoundingClientRect().top >= vh : false;
  const spiders = root.dataset.season === "halloween" ? [...document.querySelectorAll(SPIDER_HOSTS)] : [];
  const spiderBelow = spiders.map((host) => host.getBoundingClientRect().bottom >= vh);

  const tagged = [];
  found.forEach(([el, key, kind], i) => {
    if (!below[i]) return;
    el.dataset[key] = kind;
    tagged.push(el);
  });
  // The genre chips unfold with their frame. When the frame already shows at load but the chips do not (a desktop
  // first screen ends just inside it), the track brings them in on its own.
  if (track && trackBelow && !track.closest("[data-rv]")) {
    track.dataset.rv = "track";
    tagged.push(track);
  }
  if (track?.closest("[data-rv]")) { // the track itself or its frame
    const chips = track.querySelectorAll(".line-chip");
    const base = track.dataset.rv ? 0 : 130; // while the frame brakes, just after its title starts
    chips.forEach((chip, i) => chip.style.setProperty("--i", String(i)));
    track.style.setProperty("--rv-cb", `${base}ms`);
    track.style.setProperty("--rv-cs", `${Math.round(Math.min(35, (MAX_WAIT - base) / Math.max(1, chips.length - 1)))}ms`);
  }
  // A spider hangs under its frame's lower edge, which is often still below the screen when the frame docks (the hall
  // board is 840px tall): an empty marker in its place is observed, so it lowers on its silk when it can be seen.
  spiders.forEach((host, i) => {
    if (!spiderBelow[i]) return;
    const mark = document.createElement("i");
    mark.className = "rv-spider";
    mark.setAttribute("aria-hidden", "true");
    mark.dataset.rvItem = "spider";
    host.dataset.rvSpider = "wait";
    host.append(mark);
    tagged.push(mark);
  });
  for (const selector of [".cabin__art[data-rv] .phone__page i", ".cabin__copy[data-rv] .cabin__list li"]) {
    document.querySelectorAll(selector).forEach((el, i) => el.style.setProperty("--i", String(i)));
  }

  root.classList.add("reveal-on");
  io = new IntersectionObserver(onIntersect, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
  for (const el of tagged) io.observe(el);

  watchBookshelf();

  // Keyboard: whatever takes focus shows at once, with every unit around it.
  document.addEventListener("focusin", (event) => {
    if (!(event.target instanceof Element)) return;
    const list = [];
    for (let el = event.target.closest("[data-rv], [data-rv-item]"); el; el = el.parentElement?.closest("[data-rv], [data-rv-item]")) {
      if (!el.classList.contains("is-in")) list.push({ el, top: -1, left: 0, height: 0 });
    }
    if (list.length) reveal(list, true);
  });

  // Motion turned off while the page is open: the CSS is gated by the media query anyway; stop tagging work.
  const off = () => {
    if (!reduce.matches) return;
    root.classList.remove("reveal-on");
    io.disconnect();
  };
  if (reduce.addEventListener) reduce.addEventListener("change", off);
  else reduce.addListener?.(off);
}

function onIntersect(entries) {
  const batch = [];
  for (const entry of entries) {
    if (!entry.isIntersecting || entry.target.classList.contains("is-in")) continue;
    const box = entry.boundingClientRect;
    batch.push({ el: entry.target, top: box.top, left: box.left, height: box.height });
  }
  if (batch.length) reveal(batch, false);
}

// batch: [{ el, top, left, height }] (viewport rects). quiet: show everything at once (focus).
function reveal(batch, quiet) {
  const vh = window.innerHeight;
  const filling = batch.some((x) => fresh.has(x.el));
  const express = !quiet && !filling && (batch.length > 8 || batch.some((x) => x.top >= 0 && x.top < 0.4 * vh));
  const k = express ? 0.55 : 1;
  const step = express ? 0.35 : 1;
  const inBatch = new Set(batch.map((x) => x.el));
  const plan = new Map(); // el -> [delay ms, speed]
  const groups = {};

  const now = performance.now();
  for (const x of batch) {
    const { el } = x;
    if (quiet || x.top < 0) { // from above: it simply appears
      plan.set(el, [0, 0]);
    } else if (el.dataset.rv) {
      // The hall pair: the ranking docks first, the departure board a beat later.
      const ranking = el.matches(".hall__grid > .board") ? el.parentElement.querySelector(":scope > .ranking") : null;
      const d = ranking && inBatch.has(ranking) ? Math.round(90 * k) : 0;
      plan.set(el, [d, k]);
      starts.set(el, { at: now + d, k, last: {} });
    } else if (el.dataset.rvItem) {
      (groups[el.dataset.rvItem] ??= []).push(x);
    }
  }

  // Items: visual rows (tops within a few px: dealt cards sit at slightly different heights), then columns. They
  // start 110ms after their frame starts docking (it is still braking, so it never shows as an empty slab), and an
  // item that crosses the line a moment after its neighbours (the docking frame carries it up) still takes its turn
  // after them.
  for (const [kind, list] of Object.entries(groups)) {
    const [rowStep, colStep] = STEPS[kind];
    list.sort((a, b) => a.top - b.top || a.left - b.left);
    const rows = [];
    let rowTop = -Infinity;
    for (const x of list) {
      if (x.top - rowTop > Math.min(24, x.height / 3)) { rows.push([]); rowTop = x.top; }
      rows[rows.length - 1].push(x);
    }
    const bases = new Map(); // unit -> base delay for this group (read before this batch writes its own turns)
    for (const x of list) {
      const unit = starts.get(x.el.parentElement?.closest("[data-rv]"));
      if (!unit || bases.has(unit)) continue;
      let base = Math.max(0, unit.at + 110 * unit.k - now);
      if (unit.last[kind] !== undefined) base = Math.max(base, unit.last[kind] + rowStep * step - now);
      bases.set(unit, base);
    }
    rows.forEach((row, r) => {
      row.sort((a, b) => a.left - b.left);
      row.forEach((x, c) => {
        const unit = starts.get(x.el.parentElement?.closest("[data-rv]"));
        const d = Math.round(Math.min(MAX_WAIT, (unit ? bases.get(unit) : 0) + (r * rowStep + c * colStep) * step));
        plan.set(x.el, [d, k]);
        if (unit) unit.last[kind] = Math.max(unit.last[kind] ?? 0, now + d);
      });
    });
  }

  // Write every variable, then the classes, so each element starts with its own timing.
  for (const [el, [d, speed]] of plan) {
    el.style.setProperty("--rv-d", `${d}ms`);
    el.style.setProperty("--rv-k", String(speed));
    if (el.dataset.rvItem === "spider") {
      el.parentElement.style.setProperty("--rv-sd", `${d}ms`);
      el.parentElement.style.setProperty("--rv-sk", String(speed));
    }
  }
  for (const [el, [, speed]] of plan) {
    el.classList.add("is-in");
    if (speed === 0) el.classList.add("rv-quiet");
    else if (express) el.classList.add("rv-express");
    io?.unobserve(el);
    fresh.delete(el);
  }
  for (const [el] of plan) if (el.dataset.rvItem === "spider") el.parentElement.dataset.rvSpider = "drop";
  for (const [el, [d, speed]] of plan) {
    settle(el, d, speed);
    if (speed > 0 && el.dataset.rvItem === "row") scramble(el, d + 200 * speed, speed);
  }
}

// Once its reveal animations have ended, the element goes back to its untagged state.
function settle(el, d, k) {
  const spider = el.dataset.rvItem === "spider";
  const done = () => (spider ? unhang(el) : clean(el));
  if (typeof el.getAnimations !== "function") {
    setTimeout(done, d + 2000 * k);
    return;
  }
  const running = spider
    ? el.parentElement.getAnimations({ subtree: true }).filter((a) => a.animationName === "rv-hw-drop")
    : el.getAnimations({ subtree: true }).filter((a) => /^rv-/.test(a.animationName ?? ""));
  Promise.allSettled(running.map((a) => a.finished)).then(done);
}

function unhang(mark) {
  const host = mark.parentElement;
  mark.remove();
  if (!host) return;
  delete host.dataset.rvSpider;
  host.style.removeProperty("--rv-sd");
  host.style.removeProperty("--rv-sk");
}

function clean(el) {
  if (el.dataset.rv) el.classList.add("rv-done"); // the hero's rail hand-off must not start on a frame that docked
  delete el.dataset.rv;
  delete el.dataset.rvItem;
  el.classList.remove("is-in", "rv-express", "rv-quiet");
  el.style.removeProperty("--rv-d");
  el.style.removeProperty("--rv-k");
  if (el.getAttribute("style") === "") el.removeAttribute("style");
}

// Departure board: the time flips in and its digits spin like a split-flap display, locking left to right. The
// separators never move, the original text comes back exactly, and the live clock is never touched. Each flap only
// carries what its slot can show on a 24-hour board, so no frame ever reads as a glitch ("09:87", "29:10").
function scramble(row, delay, k) {
  const cell = row.querySelector(".board-row__time");
  if (!cell || cell.closest("[data-board-clock]")) return;
  const text = cell.textContent;
  if (!/\d/.test(text)) return;
  const chars = [...text];
  const digits = chars.flatMap((ch, i) => (/\d/.test(ch) ? [i] : []));
  // out: the frame being written, left to right, so the hour's tens shown this tick are already in place.
  const cap = (out, pos) => {
    if (out[pos - 1] === ":") return 6; // tens of minutes
    if (out[pos + 2] === ":" && /\d/.test(out[pos + 1] ?? "")) return 3; // tens of hours (HH:MM)
    if (out[pos + 1] === ":" && out[pos - 1] === "2") return 4; // 20–23
    return 10;
  };
  setTimeout(() => {
    const start = performance.now();
    const timer = setInterval(() => {
      const t = performance.now() - start;
      const locked = digits.filter((_, j) => t >= (140 + 70 * j) * k).length;
      if (locked >= digits.length) {
        clearInterval(timer);
        cell.textContent = text;
        return;
      }
      const out = chars.slice();
      digits.forEach((pos, j) => { if (j >= locked) out[pos] = String(Math.floor(Math.random() * cap(out, pos))); });
      cell.textContent = out.join("");
    }, 45);
  }, delay);
}

// Bookshelf (site.js renders its cards after load): deal the first fill, tagged before it is first painted (the
// mutation callback runs before the next paint, and the grid is shown in the same task as it is filled).
function watchBookshelf() {
  const grid = document.querySelector("[data-bookshelf-grid]");
  if (!grid) return;
  if (grid.querySelector(".story-card")) { grid.dataset.rvSettled = "1"; return; }
  const mo = new MutationObserver(() => {
    const cards = grid.querySelectorAll(":scope > .story-card");
    if (cards.length === 0) return;
    mo.disconnect();
    grid.dataset.rvSettled = "1";
    if (!root.classList.contains("reveal-on") || reduce.matches) return;
    for (const card of cards) {
      card.dataset.rvItem = "card";
      fresh.add(card);
      io.observe(card);
    }
  });
  mo.observe(grid, { childList: true });
}
