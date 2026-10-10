// Liquid glass behaviour (every page). Pure presentation: nothing here reads or changes content.
// - .lg-glow: a light that follows the mouse across the glass (CSS reads --mx / --my).
// - [data-tilt]: a small 3D tilt toward the pointer (mouse only, not with reduced motion).
// - [data-refract]: real refraction in Chromium, the only engine that applies SVG filters inside
//   backdrop-filter. Each element gets a displacement map drawn for its own size and corner radius, so what is
//   behind it bends at the rim like thick glass. Other browsers keep the CSS blur + saturate glass.

const root = document.documentElement;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const reduceTransparency = window.matchMedia("(prefers-reduced-transparency: reduce)");

// ---------- pointer light ----------
let pointer = null;
let frame = 0;
document.addEventListener(
  "pointermove",
  (event) => {
    if (event.pointerType !== "mouse") return;
    pointer = event;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const glow = pointer.target instanceof Element ? pointer.target.closest(".lg-glow") : null;
      if (!glow) return;
      const box = glow.getBoundingClientRect();
      glow.style.setProperty("--mx", `${pointer.clientX - box.left}px`);
      glow.style.setProperty("--my", `${pointer.clientY - box.top}px`);
    });
  },
  { passive: true },
);

// ---------- tilt ----------
if (finePointer.matches && !reduceMotion.matches) {
  for (const card of document.querySelectorAll("[data-tilt]")) {
    card.addEventListener("pointermove", (event) => {
      const box = card.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      card.style.setProperty("--ry", `${(x * 7).toFixed(2)}deg`);
      card.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
    });
  }
}

// ---------- refraction (Chromium) ----------
const chromium = Boolean(navigator.userAgentData?.brands?.some((brand) => brand.brand === "Chromium"));
if (chromium && !reduceTransparency.matches && "ResizeObserver" in window) setUpRefraction();

function setUpRefraction() {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  document.body.append(svg);

  const filters = new Map();
  let count = 0;

  const build = (el) => {
    const width = Math.round(el.offsetWidth);
    const height = Math.round(el.offsetHeight);
    if (width < 12 || height < 12) return;
    let f = filters.get(el);
    if (!f) {
      f = { id: `lg-refract-${++count}`, width: 0, height: 0, radius: -1 };
      f.filter = document.createElementNS(NS, "filter");
      f.filter.id = f.id;
      const attrs = { x: "0", y: "0", filterUnits: "userSpaceOnUse", primitiveUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" };
      for (const [key, value] of Object.entries(attrs)) f.filter.setAttribute(key, value);
      f.image = document.createElementNS(NS, "feImage");
      f.image.setAttribute("x", "0");
      f.image.setAttribute("y", "0");
      f.image.setAttribute("preserveAspectRatio", "none");
      f.image.setAttribute("result", "map");
      f.map = document.createElementNS(NS, "feDisplacementMap");
      f.map.setAttribute("in", "SourceGraphic");
      f.map.setAttribute("in2", "map");
      f.map.setAttribute("xChannelSelector", "R");
      f.map.setAttribute("yChannelSelector", "G");
      f.filter.append(f.image, f.map);
      svg.append(f.filter);
      filters.set(el, f);
    }
    const radius = cornerRadius(el, width, height);
    if (f.width === width && f.height === height && f.radius === radius) return;
    Object.assign(f, { width, height, radius });
    for (const node of [f.filter, f.image]) {
      node.setAttribute("width", String(width));
      node.setAttribute("height", String(height));
    }
    f.image.setAttribute("href", displacementMap(width, height, radius));
    const depth = Number(el.dataset.refract) || 1;
    f.map.setAttribute("scale", String(Math.round(Math.min(40, Math.min(width, height) * 0.42) * depth)));
    el.style.setProperty("--lg-refract", `url(#${f.id})`);
  };

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) build(entry.target);
  });
  for (const el of document.querySelectorAll("[data-refract]")) observer.observe(el);
  root.classList.add("lg-refract");
}

function cornerRadius(el, width, height) {
  const value = getComputedStyle(el).borderTopLeftRadius;
  const number = parseFloat(value) || 0;
  const px = value.trim().endsWith("%") ? (number / 100) * Math.min(width, height) : number;
  return Math.min(px, width / 2, height / 2);
}

/**
 * Displacement map for a rounded rectangle: neutral grey inside, and in a rim band the red/green channels point
 * inward along the edge normal, strongest at the edge. feDisplacementMap then samples the backdrop from further
 * inside near the rim, which reads as light bending through a thick glass edge.
 */
function displacementMap(width, height, radius) {
  const band = Math.max(6, Math.min(radius || 16, 30, Math.min(width, height) / 2));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const image = context.createImageData(width, height);
  const data = image.data;
  const halfW = width / 2;
  const halfH = height / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5 - halfW;
      const py = y + 0.5 - halfH;
      const qx = Math.abs(px) - (halfW - radius);
      const qy = Math.abs(py) - (halfH - radius);
      let inside;
      let nx;
      let ny;
      if (qx > 0 && qy > 0) {
        const length = Math.hypot(qx, qy);
        inside = radius - length;
        nx = qx / length;
        ny = qy / length;
      } else if (qx > qy) {
        inside = radius - qx;
        nx = 1;
        ny = 0;
      } else {
        inside = radius - qy;
        nx = 0;
        ny = 1;
      }
      nx *= px < 0 ? -1 : 1;
      ny *= py < 0 ? -1 : 1;
      let strength = 0;
      if (inside >= 0 && inside < band) {
        const t = 1 - inside / band;
        strength = t * t;
      }
      const i = (y * width + x) * 4;
      data[i] = Math.round(128 - nx * strength * 127);
      data[i + 1] = Math.round(128 - ny * strength * 127);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}
