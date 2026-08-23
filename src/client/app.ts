/**
 * app.ts — browser script for the public portal.
 *
 * One script serves all four pages; each block below no-ops when the elements
 * it needs are not on the page, so there is nothing to route.
 *
 * Three properties carried over from the port and kept here:
 *
 *  1. The tracker result is built with createElement/textContent rather than an
 *     innerHTML template. The PHP version funnelled every value through an
 *     escapeHtml() helper, which worked but left a whole class of bug one
 *     forgotten call away. Text set via textContent cannot become markup.
 *  2. No alert() dialogs. Outcomes go to inline live regions, which do not
 *     block the page and are announced by screen readers.
 *  3. No category/urgency selection logic. Those are real radios and the
 *     stylesheet handles the selected state, so the JS that used to fake it —
 *     and that made them keyboard-unreachable — is gone.
 *
 * Compiled by tsconfig.client.json to public/js/app.js. No bundler.
 */

interface ClientStrings {
  emptyRef: string;
  networkError: string;
  invalidRef: string;
  copied: string;
  copyFailed: string;
  detailsHeader: string;
  timelineHeader: string;
  labelRef: string;
  labelCategory: string;
  labelUrgency: string;
  labelLocation: string;
  labelSector: string;
  labelDetails: string;
  labelDate: string;
  timelineSubmitted: string;
  timelineProgress: string;
  timelineResolved: string;
  timelineNotDone: string;
  noMatches: string;
  searchCleared: string;
  categories: Record<string, string>;
  urgencies: Record<string, string>;
}

interface TrackData {
  id: string;
  time: string;
  category: string | null;
  urgency: string | null;
  location: string | null;
  sector: string;
  details: string;
  status: 'pending' | 'done' | 'notdone';
}

interface TrackResponse {
  success: boolean;
  message?: string;
  data?: TrackData;
}

(function () {
  'use strict';

  /** Strings are handed over in a data attribute, because the CSP forbids
   *  inline scripts and this keeps that promise intact. */
  function loadStrings(): ClientStrings | null {
    const raw = document.body.getAttribute('data-strings');
    if (raw === null || raw === '') return null;
    try {
      return JSON.parse(raw) as ClientStrings;
    } catch {
      return null;
    }
  }

  const S = loadStrings();

  function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
  ): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className !== undefined) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ---------------------------------------------------------------------
   * Mobile navigation
   * ------------------------------------------------------------------ */

  (function nav(): void {
    const toggle = document.querySelector<HTMLButtonElement>('[data-nav-toggle]');
    const links = document.getElementById('main-nav');
    if (toggle === null || links === null) return;

    toggle.addEventListener('click', function () {
      const open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      const label = open ? toggle.getAttribute('data-label-close') : toggle.getAttribute('data-label-open');
      const sr = toggle.querySelector('.visually-hidden');
      if (sr !== null && label !== null) sr.textContent = label;
    });

    // Escape closes it, matching what a keyboard user expects of a disclosure.
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && links.classList.contains('is-open')) {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  })();

  /* ---------------------------------------------------------------------
   * Submit buttons — disable and relabel while the request is in flight
   * ------------------------------------------------------------------ */

  (function reportForm(): void {
    const form = document.querySelector<HTMLFormElement>('[data-report-form]');
    if (form === null) return;

    form.addEventListener('submit', function () {
      const button = form.querySelector<HTMLButtonElement>('[data-submit]');
      if (button === null) return;
      const label = button.getAttribute('data-label-submitting');
      // Keep it enabled until after the browser has collected the form, or the
      // submission is cancelled. Disabling on the next tick avoids that.
      window.setTimeout(function () {
        button.disabled = true;
        if (label !== null) button.textContent = label;
      }, 0);
    });
  })();

  /* ---------------------------------------------------------------------
   * District → sector dependency
   *
   * The sector select is rendered with every sector in Kigali, each tagged
   * with its district. This narrows the visible options once a district is
   * chosen. It is an enhancement, not a control: with JavaScript off the full
   * list stays usable and the server still rejects a sector that does not
   * belong to the chosen district.
   * ------------------------------------------------------------------ */

  (function areaSelects(): void {
    const district = document.querySelector<HTMLSelectElement>('[data-district-select]');
    const sector = document.querySelector<HTMLSelectElement>('[data-sector-select]');
    if (district === null || sector === null) return;

    // Narrowing does not flow into apply() below, so the checked values are
    // captured here where the compiler can still see them.
    const dSel = district;
    const sSel = sector;

    // Options are removed from the DOM rather than hidden, because `hidden` on
    // an <option> is ignored by several browsers and Safari in particular will
    // still show and allow it.
    const all = Array.prototype.slice.call(sSel.options) as HTMLOptionElement[];
    const placeholder = all.filter((o) => o.value === '');
    const real = all.filter((o) => o.value !== '');

    function apply(): void {
      const chosen = dSel.value;
      const previous = sSel.value;

      sSel.textContent = '';
      placeholder.forEach((o) => sSel.appendChild(o));

      real
        .filter((o) => chosen === '' || o.getAttribute('data-district') === chosen)
        .forEach((o) => sSel.appendChild(o));

      // Keep the sector if it survived the filter; otherwise fall back to the
      // placeholder so a stale value is never submitted silently.
      sSel.value = Array.prototype.some.call(sSel.options, function (o: HTMLOptionElement) {
        return o.value === previous;
      })
        ? previous
        : '';
    }

    dSel.addEventListener('change', apply);
    apply();
  })();

  /* ---------------------------------------------------------------------
   * Copy the reference number
   * ------------------------------------------------------------------ */

  (function copyReference(): void {
    const button = document.querySelector<HTMLButtonElement>('[data-copy-reference]');
    const value = document.querySelector<HTMLElement>('[data-reference]');
    const status = document.querySelector<HTMLElement>('[data-copy-status]');
    if (button === null || value === null || S === null) return;

    // Narrowing does not flow into the nested handlers below, so the checked
    // values are captured here where the compiler can still see them.
    const str = S;

    function report(message: string): void {
      if (status !== null) status.textContent = message;
    }

    button.addEventListener('click', function () {
      const text = (value.textContent ?? '').trim();
      if (text === '') return;

      if (navigator.clipboard !== undefined) {
        navigator.clipboard.writeText(text).then(
          function () {
            report(str.copied);
          },
          function () {
            report(str.copyFailed);
          },
        );
        return;
      }
      report(str.copyFailed);
    });
  })();

  /* ---------------------------------------------------------------------
   * Tracker
   * ------------------------------------------------------------------ */

  (function tracker(): void {
    const form = document.querySelector<HTMLFormElement>('[data-track-form]');
    const found = document.querySelector<HTMLElement>('[data-track-result]');
    const field = form === null ? null : form.querySelector<HTMLInputElement>('#reference');
    if (form === null || found === null || field === null || S === null) return;

    // Narrowing does not flow into the nested functions below, so the checked
    // values are captured here where the compiler can still see them.
    const S2 = S;
    const result = found;
    const input = field;

    const button = form.querySelector<HTMLButtonElement>('[data-submit]');
    const endpoint = form.getAttribute('data-endpoint') ?? '';
    const idleLabel = button === null ? '' : (button.textContent ?? '').trim();

    function message(kind: 'error' | 'info', text: string): void {
      result.textContent = '';
      const box = el('div', 'flash flash-' + (kind === 'error' ? 'error' : 'info'));
      box.appendChild(el('span', undefined, text));
      result.appendChild(box);
    }

    function row(term: string, value: string): HTMLDivElement {
      const wrap = el('div', 'result-row');
      wrap.appendChild(el('dt', undefined, term));
      wrap.appendChild(el('dd', undefined, value));
      return wrap;
    }

    /** Build the result panel. Every value goes in as text, never as markup. */
    function render(data: TrackData): void {
      result.textContent = '';

      const card = el('div', 'result-card');

      const chip = el('span', 'chip chip-' + data.status);
      chip.textContent =
        data.status === 'done'
          ? S2.timelineResolved
          : data.status === 'notdone'
            ? S2.timelineNotDone
            : S2.timelineProgress;

      const head = el('div');
      head.style.marginBottom = '18px';
      head.appendChild(chip);
      card.appendChild(head);

      card.appendChild(el('h3', undefined, S2.detailsHeader));

      const list = el('dl', 'result-list');
      list.appendChild(row(S2.labelRef, data.id));
      if (data.category !== null) {
        list.appendChild(row(S2.labelCategory, S2.categories[data.category] ?? data.category));
      }
      if (data.urgency !== null) {
        list.appendChild(row(S2.labelUrgency, S2.urgencies[data.urgency] ?? data.urgency));
      }
      if (data.location !== null) list.appendChild(row(S2.labelLocation, data.location));
      list.appendChild(row(S2.labelSector, data.sector));
      list.appendChild(row(S2.labelDate, data.time));
      list.appendChild(row(S2.labelDetails, data.details));
      card.appendChild(list);

      card.appendChild(el('h3', undefined, S2.timelineHeader));

      const timeline = el('ol', 'timeline');
      const steps: ReadonlyArray<{ label: string; state: 'done' | 'failed' | 'todo' }> = [
        { label: S2.timelineSubmitted, state: 'done' },
        {
          label: S2.timelineProgress,
          state: data.status === 'done' || data.status === 'pending' ? 'done' : 'todo',
        },
        {
          label: data.status === 'notdone' ? S2.timelineNotDone : S2.timelineResolved,
          state: data.status === 'done' ? 'done' : data.status === 'notdone' ? 'failed' : 'todo',
        },
      ];

      steps.forEach(function (step, i) {
        const li = el('li');
        if (step.state === 'done') li.className = 'is-done';
        if (step.state === 'failed') li.className = 'is-failed';

        const dot = el('span', 'timeline-dot');
        dot.textContent = step.state === 'done' ? '✓' : step.state === 'failed' ? '✕' : String(i + 1);
        li.appendChild(dot);
        li.appendChild(el('span', 'timeline-label', step.label));
        timeline.appendChild(li);
      });

      card.appendChild(timeline);
      result.appendChild(card);
    }

    function busy(on: boolean): void {
      if (button === null) return;
      button.disabled = on;
      const label = button.getAttribute('data-label-submitting');
      button.textContent = on && label !== null ? label : idleLabel;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (input === null) return;

      const reference = input.value.trim();
      if (reference === '') {
        message('error', S2.emptyRef);
        input.focus();
        return;
      }

      busy(true);

      fetch(endpoint + '?reference=' + encodeURIComponent(reference), {
        headers: { Accept: 'application/json' },
      })
        .then(function (response) {
          return response.json() as Promise<TrackResponse>;
        })
        .then(function (payload) {
          busy(false);
          if (payload.success && payload.data !== undefined) {
            render(payload.data);
          } else {
            message('error', payload.message ?? S2.invalidRef);
          }
        })
        .catch(function () {
          busy(false);
          message('error', S2.networkError);
        });
    });

    // A reference arriving via ?ref= is looked up straight away, so following
    // "Track this report" from the success page shows the status immediately.
    if (input !== null && input.value.trim() !== '') {
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  })();

  /* ---------------------------------------------------------------------
   * Feed search — filters cards already on the page
   * ------------------------------------------------------------------ */

  (function feedSearch(): void {
    const input = document.querySelector<HTMLInputElement>('[data-feed-search]');
    const grid = document.querySelector<HTMLElement>('[data-feed-grid]');
    const empty = document.querySelector<HTMLElement>('[data-feed-empty]');
    const status = document.querySelector<HTMLElement>('[data-feed-status]');
    if (input === null || grid === null || S === null) return;

    const S3 = S;
    const box = input;

    const cards = Array.prototype.slice.call(
      grid.querySelectorAll('[data-feed-card]'),
    ) as HTMLElement[];

    function apply(): void {
      const term = box.value.trim().toLowerCase();
      let shown = 0;

      cards.forEach(function (card) {
        const haystack = card.getAttribute('data-search') ?? '';
        const match = term === '' || haystack.indexOf(term) !== -1;
        card.hidden = !match;
        if (match) shown += 1;
      });

      if (empty !== null) empty.hidden = shown !== 0;
      if (status !== null) status.textContent = term === '' ? S3.searchCleared : shown === 0 ? S3.noMatches : '';
    }

    input.addEventListener('input', apply);
  })();
})();
