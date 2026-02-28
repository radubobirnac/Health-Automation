import { useEffect } from "react";

export default function useScrollReveal({
  selector = "[data-reveal]",
  threshold = 0.2,
  rootMargin = "0px 0px -10% 0px"
} = {}) {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll(selector));
    if (!elements.length) {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      elements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold, rootMargin }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [rootMargin, selector, threshold]);
}
