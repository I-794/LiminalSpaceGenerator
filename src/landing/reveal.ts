/**
 * Landing-page scroll reveal. Uses IntersectionObserver (not a scroll listener)
 * and bails out entirely under prefers-reduced-motion, so content is shown
 * immediately for users who ask for less motion.
 */

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const targets = document.querySelectorAll<HTMLElement>(
  ".section-title, .about-body, .cell, .closer-line, .closer .btn, .closer-note",
);

if (reduce) {
  targets.forEach((el) => el.classList.add("in"));
} else {
  targets.forEach((el, i) => {
    el.classList.add("reveal");
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
  });

  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          obs.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.18 },
  );

  targets.forEach((el) => io.observe(el));
}
