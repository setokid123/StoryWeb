// Page-wide decoration (inc/decor.php): hands the scroll offset to the layer as --sy (a px number), so its parts
// can drift at their own depth while the page scrolls. Set on the layer only, so a scroll restyles nothing else.
// Nothing moves with reduced motion.
const layer = document.querySelector("[data-decor]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (layer && !reduceMotion.matches) {
  let frame = 0;
  const update = () => {
    frame = 0;
    layer.style.setProperty("--sy", String(Math.round(window.scrollY)));
  };
  window.addEventListener("scroll", () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
  update();
}
