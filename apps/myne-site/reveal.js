// Scroll reveal. Elements marked .reveal fade up the first time they enter the
// viewport. Without JS (or with reduced motion) everything is simply visible:
// the hidden state only applies under html.js, which this file sets.
(() => {
  const root = document.documentElement;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  root.classList.add("js");
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in");
        seen.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
  );
  // Whatever is already on screen at load is shown straight away, measured
  // directly: observers do not fire in a background tab, and the first screen
  // must never depend on one.
  const start = () =>
    document.querySelectorAll(".reveal").forEach((el) => {
      if (el.getBoundingClientRect().top < innerHeight * 0.92) el.classList.add("in");
      else seen.observe(el);
    });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
