/**
 * shell.ts — behaviour shared by every page, public and staff.
 *
 * Loaded synchronously in <head>, so the theme and the `.js` class are in place
 * before first paint and nobody sees a flash of the wrong colours. Everything
 * that needs the DOM waits for it. Compiled to public/js/shell.js.
 */

interface Window {
  CK: {
    countTo(el: HTMLElement, text: string): void;
    setNumber(el: HTMLElement, text: string): void;
    numberOf(el: HTMLElement): number;
    wizardReady?: boolean;
  };
}

(function () {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  const THEME_KEY = 'ck-theme';

  function storedTheme(): string | null {
    try {
      return window.localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  }

  const saved = storedTheme();
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);

  function isDark(): boolean {
    const explicit = root.getAttribute('data-theme');
    if (explicit !== null) return explicit === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
   * Numbers that count rather than appear
   *
   * Works on the text already on the page, so without JavaScript the real value
   * is simply there. Anything not starting with a number, such as "No reports
   * yet", is left alone.
   * ------------------------------------------------------------------ */

  function parse(text: string): { value: number; decimals: number; suffix: string } | null {
    const match = /^(\d+(?:\.(\d+))?)(.*)$/.exec(text.trim());
    if (match === null) return null;
    return { value: Number(match[1]), decimals: (match[2] ?? '').length, suffix: match[3] ?? '' };
  }

  /** Which count is current per element, so a newer value is never overwritten. */
  const runs = new WeakMap<HTMLElement, number>();

  function setNumber(el: HTMLElement, text: string): void {
    runs.set(el, (runs.get(el) ?? 0) + 1);
    el.dataset.target = text;
    el.dataset.counted = '1';
    el.textContent = text;
  }

  /** The value an element is heading for, even part-way through a count. */
  function numberOf(el: HTMLElement): number {
    return Number(el.dataset.target ?? el.textContent ?? 0) || 0;
  }

  function countTo(el: HTMLElement, text: string): void {
    const target = parse(text);
    const current = parse(el.textContent ?? '');
    if (target === null || calm) {
      setNumber(el, text);
      return;
    }
    const run = (runs.get(el) ?? 0) + 1;
    runs.set(el, run);
    el.dataset.target = text;
    const from = el.dataset.counted === undefined ? 0 : (current?.value ?? 0);
    el.dataset.counted = '1';
    if (from === target.value && el.textContent?.trim() === text.trim()) {
      el.textContent = text;
      return;
    }

    const started = performance.now();
    const duration = 900;
    function tick(now: number): void {
      if (runs.get(el) !== run) return;
      const t = Math.min((now - started) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      const shown = from + (target!.value - from) * eased;
      el.textContent = shown.toFixed(target!.decimals) + target!.suffix;
      if (t < 1) window.requestAnimationFrame(tick);
      else el.textContent = text;
    }
    window.requestAnimationFrame(tick);
  }

  window.CK = { countTo, setNumber, numberOf };

  /* ---------------------------------------------------------------------
   * Wiring, once the page exists
   * ------------------------------------------------------------------ */

  function ready(): void {
    // Theme toggle. Hidden in the markup, since it cannot work without script.
    document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach(function (button) {
      button.hidden = false;
      button.addEventListener('click', function () {
        const next = isDark() ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try {
          window.localStorage.setItem(THEME_KEY, next);
        } catch {
          // Private browsing: the choice just lasts for this page.
        }
      });
    });

    // Menus are native <details>, which do not close on an outside click or Escape.
    const menus = Array.prototype.slice.call(document.querySelectorAll('[data-menu]')) as HTMLDetailsElement[];
    document.addEventListener('click', function (event) {
      menus.forEach(function (menu) {
        if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
      });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      menus.forEach(function (menu) {
        if (menu.open) {
          menu.open = false;
          menu.querySelector('summary')?.focus();
        }
      });
    });

    // Reveal on scroll, and count up the first time a number comes into view.
    const revealed = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const counters = document.querySelectorAll<HTMLElement>('[data-count]');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            const el = entry.target as HTMLElement;
            observer.unobserve(el);
            if (el.hasAttribute('data-count')) countTo(el, el.textContent ?? '');
            else el.classList.add('is-in');
          });
        },
        { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
      );
      revealed.forEach((el) => observer.observe(el));
      counters.forEach((el) => observer.observe(el));
    } else {
      revealed.forEach((el) => el.classList.add('is-in'));
    }

    topbar();
  }

  /** The bar tightens once the page moves, and steps aside while reading. */
  function topbar(): void {
    const bar = document.querySelector<HTMLElement>('[data-topbar]');
    if (bar === null) return;
    const theBar = bar;

    let last = window.scrollY;
    let queued = false;

    function update(): void {
      queued = false;
      const y = window.scrollY;
      theBar.classList.toggle('is-scrolled', y > 24);
      const busy = theBar.querySelector('details[open]') !== null || theBar.contains(document.activeElement);
      if (y > 220 && y > last + 4 && !busy) theBar.classList.add('is-away');
      else if (y < last - 4 || y <= 220) theBar.classList.remove('is-away');
      last = y;
    }

    window.addEventListener(
      'scroll',
      function () {
        if (!queued) {
          queued = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true },
    );
    theBar.addEventListener('focusin', () => theBar.classList.remove('is-away'));
    update();

    // One pill that glides to whichever link is under the pointer.
    const nav = theBar.querySelector<HTMLElement>('[data-topnav]');
    const pill = theBar.querySelector<HTMLElement>('[data-topnav-pill]');
    if (nav === null || pill === null) return;
    const theNav = nav;
    const thePill = pill;

    function moveTo(link: HTMLElement | null): void {
      if (link === null) {
        theNav.classList.remove('has-pill');
        return;
      }
      thePill.style.width = link.offsetWidth + 'px';
      thePill.style.transform = 'translateX(' + link.offsetLeft + 'px)';
      theNav.classList.add('has-pill');
    }

    const current = (): HTMLElement | null => theNav.querySelector<HTMLElement>('[aria-current="page"]');

    theNav.querySelectorAll<HTMLElement>('.topnav-link').forEach(function (link) {
      link.addEventListener('pointerenter', () => moveTo(link));
      link.addEventListener('focus', () => moveTo(link));
    });
    theNav.addEventListener('pointerleave', () => moveTo(current()));
    window.addEventListener('resize', () => moveTo(current()));
    if (document.fonts !== undefined) void document.fonts.ready.then(() => moveTo(current()));
    moveTo(current());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();

  // A safety net for the guided form: if the main script never arrived, go back
  // to the plain layout where every field is visible, rather than a dead step.
  window.addEventListener('load', function () {
    if (document.querySelector('[data-report-form]') !== null && window.CK.wizardReady !== true) {
      root.classList.remove('js');
    }
  });
})();
