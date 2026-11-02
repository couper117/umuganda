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

type ReportStatus = 'pending' | 'in_progress' | 'done' | 'notdone' | 'reopened';

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
  noMatches: string;
  searchCleared: string;
  categories: Record<string, string>;
  urgencies: Record<string, string>;
  statuses: Record<ReportStatus, string>;
  labelTarget: string;
  overdueNote: string;
  photoAlt: string;
  eventCreated: string;
  eventStatuses: Record<ReportStatus, string>;
  eventConfirmed: string;
  eventNote: string;
  feedbackHeading: string;
  feedbackBody: string;
  confirmButton: string;
  reopenButton: string;
  reopenNoteLabel: string;
  reopenSubmit: string;
  cancel: string;
  confirmedNote: string;
  gpsWorking: string;
  gpsCaptured: string;
  gpsFailed: string;
  gpsOutside: string;
  photoWrongType: string;
  photoProcessing: string;
  draftRestored: string;
  draftDiscard: string;
  fieldRequired: string;
  stepOf: string;
  removeSaved: string;
  shareText: string;
}

interface TrackEvent {
  kind: 'created' | 'status' | 'note' | 'confirmed' | 'reopened' | 'duplicate';
  time: string;
  status: ReportStatus | null;
  note: string | null;
}

interface TrackData {
  id: string;
  time: string;
  category: string | null;
  urgency: string | null;
  location: string | null;
  sector: string;
  details: string;
  status: ReportStatus;
  dueBy: string | null;
  overdue: boolean;
  photoUrl: string | null;
  events: TrackEvent[];
  canConfirm: boolean;
  canReopen: boolean;
  confirmed: boolean;
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
   * "Use my current location"
   *
   * Asks only when the button is pressed, never on page load: a permission
   * prompt with no explanation is one people reasonably refuse. The bounds match
   * lib/geo.ts; the server checks again and simply ignores anything outside them.
   * ------------------------------------------------------------------ */

  (function gps(): void {
    const box = document.querySelector<HTMLElement>('[data-gps]');
    if (box === null || S === null || !('geolocation' in navigator)) return;

    const button = box.querySelector<HTMLButtonElement>('[data-gps-button]');
    const status = box.querySelector<HTMLElement>('[data-gps-status]');
    const lat = box.querySelector<HTMLInputElement>('[data-gps-lat]');
    const lng = box.querySelector<HTMLInputElement>('[data-gps-lng]');
    const acc = box.querySelector<HTMLInputElement>('[data-gps-acc]');
    if (button === null || status === null || lat === null || lng === null || acc === null) return;

    const str = S;
    const btn = button;
    const line = status;
    const fields = [lat, lng, acc];
    box.hidden = false;

    function clear(): void {
      fields.forEach(function (f) {
        f.value = '';
      });
    }

    btn.addEventListener('click', function () {
      btn.disabled = true;
      line.textContent = str.gpsWorking;

      navigator.geolocation.getCurrentPosition(
        function (position) {
          btn.disabled = false;
          const { latitude, longitude, accuracy } = position.coords;
          const inKigali = latitude >= -2.15 && latitude <= -1.8 && longitude >= 29.95 && longitude <= 30.35;
          if (!inKigali) {
            clear();
            line.textContent = str.gpsOutside;
            return;
          }
          fields[0]!.value = String(latitude);
          fields[1]!.value = String(longitude);
          fields[2]!.value = String(Math.round(accuracy));
          line.textContent = str.gpsCaptured.replace('{m}', String(Math.round(accuracy)));
          box.classList.add('is-captured');
        },
        function () {
          btn.disabled = false;
          clear();
          line.textContent = str.gpsFailed;
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    });
  })();

  /* ---------------------------------------------------------------------
   * Photo: shrink before sending
   *
   * A phone photo can be 8 MB, which is slow and costly on mobile data. Drawing
   * it to a canvas brings it down to a few hundred KB, and also drops the EXIF
   * block, including the GPS position it was taken at. The server strips metadata
   * again regardless, because a request can skip this script.
   *
   * If anything here is unsupported the original file is left in place and the
   * form still works: this is an enhancement, not a requirement.
   * ------------------------------------------------------------------ */

  (function photo(): void {
    const input = document.querySelector<HTMLInputElement>('[data-photo-input]');
    const preview = document.querySelector<HTMLElement>('[data-photo-preview]');
    const image = document.querySelector<HTMLImageElement>('[data-photo-image]');
    const remove = document.querySelector<HTMLButtonElement>('[data-photo-remove]');
    const status = document.querySelector<HTMLElement>('[data-photo-status]');
    if (input === null || preview === null || image === null || remove === null || status === null || S === null) return;

    const str = S;
    const field = input;
    const box = preview;
    const img = image;
    const line = status;

    const MAX_EDGE = 1600;
    const QUALITY = 0.82;

    function reset(): void {
      field.value = '';
      img.removeAttribute('src');
      box.hidden = true;
      line.textContent = '';
    }

    /** Swap the chosen file for the smaller one, where the browser allows it. */
    function replaceFile(blob: Blob): void {
      if (typeof DataTransfer !== 'function') return;
      try {
        const transfer = new DataTransfer();
        transfer.items.add(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
        field.files = transfer.files;
      } catch {
        // Older browsers cannot assign files. The original still uploads.
      }
    }

    function shrink(source: HTMLImageElement): void {
      const scale = Math.min(1, MAX_EDGE / Math.max(source.naturalWidth, source.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(Math.round(source.naturalWidth * scale), 1);
      canvas.height = Math.max(Math.round(source.naturalHeight * scale), 1);
      const ctx = canvas.getContext('2d');
      if (ctx === null || typeof canvas.toBlob !== 'function') {
        line.textContent = '';
        return;
      }
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        function (blob) {
          line.textContent = '';
          if (blob !== null) replaceFile(blob);
        },
        'image/jpeg',
        QUALITY,
      );
    }

    field.addEventListener('change', function () {
      const file = field.files === null ? undefined : field.files[0];
      if (file === undefined) {
        reset();
        return;
      }
      if (file.type !== '' && file.type.indexOf('image/') !== 0) {
        reset();
        line.textContent = str.photoWrongType;
        return;
      }

      line.textContent = str.photoProcessing;

      // A data: URL rather than a blob: one, because the CSP allows data: images.
      const reader = new FileReader();
      reader.onload = function () {
        const loaded = new Image();
        loaded.onload = function () {
          img.src = String(reader.result);
          box.hidden = false;
          shrink(loaded);
        };
        loaded.onerror = function () {
          // Could not decode here, HEIC on many browsers for instance. Leave the
          // original in place and let the server decide.
          box.hidden = true;
          line.textContent = '';
        };
        loaded.src = String(reader.result);
      };
      reader.onerror = function () {
        line.textContent = '';
      };
      reader.readAsDataURL(file);
    });

    remove.addEventListener('click', function () {
      reset();
      field.focus();
    });
  })();

  /* ---------------------------------------------------------------------
   * Draft: never lose a half-written report
   *
   * A dropped connection or an expired session used to mean retyping everything.
   * The form is kept on this device until the report is accepted. Name and contact
   * are deliberately left out: a phone at a shared kiosk or a borrowed handset
   * should not hand one resident's details to the next.
   * ------------------------------------------------------------------ */

  (function draft(): void {
    const KEY = 'ck-report-draft';

    function read(): Record<string, string> | null {
      try {
        const raw = window.localStorage.getItem(KEY);
        return raw === null ? null : (JSON.parse(raw) as Record<string, string>);
      } catch {
        return null;
      }
    }
    function write(value: Record<string, string>): void {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(value));
      } catch {
        // Private browsing or a full disk. The form still works without a draft.
      }
    }
    function erase(): void {
      try {
        window.localStorage.removeItem(KEY);
      } catch {
        // Nothing to do.
      }
    }

    // The success panel means the report is safely in. Forget the draft.
    if (document.querySelector('[data-reference]') !== null) {
      erase();
      return;
    }

    const form = document.querySelector<HTMLFormElement>('[data-report-form]');
    if (form === null || S === null) return;

    const str = S;
    const theForm = form;
    const SKIP = ['csrf_token', 'name', 'contact', 'photo', 'latitude', 'longitude', 'accuracy'];

    function capture(): Record<string, string> {
      const out: Record<string, string> = {};
      new FormData(theForm).forEach(function (value, key) {
        if (SKIP.indexOf(key) === -1 && typeof value === 'string' && value !== '') out[key] = value;
      });
      return out;
    }

    const saved = read();
    if (saved !== null && Object.keys(saved).length > 0) {
      // District first: choosing it is what narrows the sector list.
      ['district', 'sector', 'location', 'cell', 'village', 'details'].forEach(function (name) {
        const control = theForm.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
        const value = saved[name];
        if (control === null || value === undefined) return;
        control.value = value;
        if (name === 'district') control.dispatchEvent(new Event('change'));
      });
      ['category', 'urgency'].forEach(function (name) {
        const value = saved[name];
        if (value === undefined) return;
        const radio = theForm.querySelector<HTMLInputElement>('input[name="' + name + '"][value="' + CSS.escape(value) + '"]');
        if (radio !== null) radio.checked = true;
      });

      const notice = document.querySelector<HTMLElement>('[data-draft-notice]');
      const text = document.querySelector<HTMLElement>('[data-draft-text]');
      const discard = document.querySelector<HTMLButtonElement>('[data-draft-discard]');
      if (notice !== null && text !== null && discard !== null) {
        text.textContent = str.draftRestored;
        discard.textContent = str.draftDiscard;
        notice.hidden = false;
        discard.addEventListener('click', function () {
          erase();
          theForm.reset();
          const district = theForm.elements.namedItem('district') as HTMLSelectElement | null;
          district?.dispatchEvent(new Event('change'));
          notice.hidden = true;
        });
      }
    }

    let timer = 0;
    function save(): void {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        write(capture());
      }, 400);
    }
    theForm.addEventListener('input', save);
    theForm.addEventListener('change', save);
  })();

  /* ---------------------------------------------------------------------
   * Offline support
   *
   * Registered from here so the admin pages, which load a different script, stay
   * out of its scope entirely. Failure is harmless: the site just stays online-only.
   * ------------------------------------------------------------------ */

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {
        // Unsupported or blocked. Nothing depends on it.
      });
    });
  }

  /* ---------------------------------------------------------------------
   * Guided report form
   *
   * One question at a time on a phone beats a long form. This only shows and
   * hides what is already in the page: all the fields are in one real <form>, it
   * posts normally, and the server validates everything again regardless.
   * ------------------------------------------------------------------ */

  (function wizard(): void {
    window.CK.wizardReady = true;

    const form = document.querySelector<HTMLFormElement>('[data-report-form]');
    if (form === null || S === null) return;
    const theForm = form;
    const str = S;

    const steps = Array.prototype.slice.call(theForm.querySelectorAll('[data-step]')) as HTMLElement[];
    const back = theForm.querySelector<HTMLButtonElement>('[data-wizard-back]');
    const next = theForm.querySelector<HTMLButtonElement>('[data-wizard-next]');
    const actions = theForm.querySelector<HTMLElement>('.wizard-actions');
    const fill = document.querySelector<HTMLElement>('[data-stepper-fill]');
    const stepper = document.querySelector<HTMLElement>('[data-stepper]');
    const labels = document.querySelectorAll<HTMLElement>('.stepper-labels li');
    const status = document.querySelector<HTMLElement>('[data-step-status]');
    const reviewList = theForm.querySelector<HTMLElement>('[data-review-list]');

    let at = 0;

    function clearError(control: HTMLElement): void {
      control.removeAttribute('aria-invalid');
      control.parentElement?.querySelector('.field-error')?.remove();
    }

    /** Mark the empty required fields in a step. True when it can move on. */
    function validate(step: HTMLElement, focus: boolean): boolean {
      let first: HTMLElement | null = null;
      step.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[required]:not([type=radio]), select[required]').forEach(function (control) {
        clearError(control);
        if (control.value.trim() !== '') return;
        control.setAttribute('aria-invalid', 'true');
        const message = el('p', 'field-error', str.fieldRequired);
        control.parentElement?.appendChild(message);
        if (first === null) first = control;
      });
      if (first !== null && focus) (first as HTMLElement).focus();
      return first === null;
    }

    function checkedLabel(name: string): string {
      const radio = theForm.querySelector<HTMLInputElement>('input[name="' + name + '"]:checked');
      return radio?.parentElement?.querySelector('[data-option-label]')?.textContent?.trim() ?? '';
    }

    function value(name: string): string {
      const control = theForm.elements.namedItem(name) as HTMLInputElement | null;
      return control === null ? '' : control.value.trim();
    }

    /** The last step shows what is about to be sent. Text only, never markup. */
    function buildReview(): void {
      if (reviewList === null) return;
      reviewList.textContent = '';
      const place = [value('cell'), value('sector'), value('district')].filter((v) => v !== '').join(', ');
      const rows: Array<[string, string]> = [
        [str.labelCategory, checkedLabel('category')],
        [str.labelUrgency, checkedLabel('urgency')],
        [str.labelLocation, value('location')],
        [str.labelSector, place],
        [str.labelDetails, value('details')],
      ];
      rows.forEach(function (row) {
        if (row[1] === '') return;
        reviewList.appendChild(el('dt', undefined, row[0]));
        reviewList.appendChild(el('dd', undefined, row[1]));
      });
    }

    function show(index: number, direction: 1 | -1, moveFocus: boolean): void {
      at = index;
      steps.forEach(function (step, i) {
        step.classList.toggle('is-active', i === index);
        step.classList.toggle('is-back', i === index && direction === -1);
      });

      const last = index === steps.length - 1;
      if (last) buildReview();
      if (back !== null) back.hidden = index === 0;
      if (next !== null) next.hidden = last;
      actions?.classList.toggle('is-last', last);

      if (fill !== null) fill.style.width = ((index + 1) / steps.length) * 100 + '%';
      Array.prototype.forEach.call(labels, function (label: HTMLElement, i: number) {
        label.classList.toggle('is-current', i === index);
        label.classList.toggle('is-done', i < index);
      });
      if (status !== null) {
        const title = steps[index]?.querySelector('.step-title')?.textContent ?? '';
        status.textContent =
          str.stepOf.replace('{n}', String(index + 1)).replace('{total}', String(steps.length)) + ': ' + title;
      }

      if (moveFocus) {
        stepper?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const heading = steps[index]?.querySelector<HTMLElement>('.step-title');
        if (heading !== null && heading !== undefined) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      }
    }

    function advance(): void {
      const step = steps[at];
      if (step === undefined || !validate(step, true)) return;
      if (at < steps.length - 1) show(at + 1, 1, true);
    }

    next?.addEventListener('click', advance);
    back?.addEventListener('click', function () {
      if (at > 0) show(at - 1, -1, true);
    });

    theForm.addEventListener('input', function (event) {
      const target = event.target as HTMLElement;
      if (target.getAttribute('aria-invalid') === 'true') clearError(target);
    });
    theForm.addEventListener('change', function (event) {
      const target = event.target as HTMLElement;
      if (target.getAttribute('aria-invalid') === 'true') clearError(target);
    });

    // Enter in a text box means "continue", not "send a half-finished report".
    theForm.addEventListener('keydown', function (event) {
      const target = event.target as HTMLElement;
      if (event.key === 'Enter' && target.tagName === 'INPUT' && at < steps.length - 1) {
        event.preventDefault();
        advance();
      }
    });

    theForm.addEventListener('submit', function (event) {
      // Jump back to the first step with a gap rather than submit and bounce.
      for (let i = 0; i < steps.length; i += 1) {
        if (!validate(steps[i] as HTMLElement, false)) {
          event.preventDefault();
          show(i, -1, true);
          validate(steps[i] as HTMLElement, true);
          return;
        }
      }

      const button = theForm.querySelector<HTMLButtonElement>('[data-submit]');
      if (button === null) return;
      const label = button.getAttribute('data-label-submitting');
      const span = button.querySelector('[data-submit-label]');
      // Keep it enabled until the browser has collected the form, or the
      // submission is cancelled. Disabling on the next tick avoids that.
      window.setTimeout(function () {
        button.disabled = true;
        if (label !== null && span !== null) span.textContent = label;
      }, 0);
    });

    show(0, 1, false);
  })();

  /* ---------------------------------------------------------------------
   * References this device has seen
   *
   * Nobody should have to keep a code on a scrap of paper when their phone can
   * remember it. They stay on the device and can be removed with one tap.
   * ------------------------------------------------------------------ */

  const SAVED_KEY = 'ck-my-reports';
  const SAVED_MAX = 6;

  function savedReferences(): string[] {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? '[]') as unknown;
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
    } catch {
      return [];
    }
  }

  function writeReferences(list: string[]): void {
    try {
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, SAVED_MAX)));
    } catch {
      // Private browsing: nothing is remembered, and nothing else depends on it.
    }
  }

  function rememberReference(reference: string): void {
    writeReferences([reference].concat(savedReferences().filter((r) => r !== reference)));
  }

  /* ---------------------------------------------------------------------
   * Success ticket: copy, share and remember the reference
   * ------------------------------------------------------------------ */

  (function ticket(): void {
    const value = document.querySelector<HTMLElement>('[data-reference]');
    if (value === null || S === null) return;

    const str = S;
    const text = (value.textContent ?? '').trim();
    if (text !== '') rememberReference(text);

    const copy = document.querySelector<HTMLButtonElement>('[data-copy-reference]');
    const share = document.querySelector<HTMLButtonElement>('[data-share-reference]');
    const status = document.querySelector<HTMLElement>('[data-copy-status]');
    const label = document.querySelector<HTMLElement>('[data-copy-label]');
    const idle = label?.textContent ?? '';

    function report(message: string, changeLabel: boolean): void {
      if (status !== null) status.textContent = message;
      if (changeLabel && label !== null) {
        label.textContent = message;
        window.setTimeout(function () {
          label.textContent = idle;
        }, 2200);
      }
    }

    copy?.addEventListener('click', function () {
      if (navigator.clipboard === undefined) {
        report(str.copyFailed, false);
        return;
      }
      navigator.clipboard.writeText(text).then(
        () => report(str.copied, true),
        () => report(str.copyFailed, false),
      );
    });

    if (share !== null && typeof navigator.share === 'function') {
      share.hidden = false;
      share.addEventListener('click', function () {
        navigator.share({ text: str.shareText + ' ' + text }).catch(function () {
          // Cancelled by the visitor. Nothing to report.
        });
      });
    }
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
    const feedbackEndpoint = form.getAttribute('data-feedback-endpoint') ?? '';
    const csrf = form.getAttribute('data-csrf') ?? '';

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

    /** One line of the history. */
    function eventLabel(event: TrackEvent): string {
      switch (event.kind) {
        case 'created':
          return S2.eventCreated;
        case 'status':
          return event.status === null ? S2.eventNote : S2.eventStatuses[event.status];
        case 'reopened':
          return S2.eventStatuses.reopened;
        case 'confirmed':
          return S2.eventConfirmed;
        default:
          return S2.eventNote;
      }
    }

    function timelineItem(label: string, time: string, note: string | null, state: 'done' | 'failed' | 'todo'): HTMLLIElement {
      const li = el('li');
      if (state === 'done') li.className = 'is-done';
      if (state === 'failed') li.className = 'is-failed';

      li.appendChild(el('span', 'timeline-dot', state === 'done' ? '✓' : state === 'failed' ? '✕' : ''));

      const body = el('div', 'timeline-body');
      body.appendChild(el('span', 'timeline-label', label));
      if (time !== '') body.appendChild(el('span', 'timeline-time', time));
      if (note !== null && note !== '') body.appendChild(el('p', 'timeline-note', note));
      li.appendChild(body);
      return li;
    }

    /** The reporter's say: did it actually get fixed? */
    function feedbackPanel(data: TrackData): HTMLElement {
      const panel = el('div', 'feedback-panel');
      panel.appendChild(el('h3', undefined, S2.feedbackHeading));
      panel.appendChild(el('p', undefined, S2.feedbackBody));

      const actions = el('div', 'feedback-actions');
      panel.appendChild(actions);

      if (data.canConfirm) {
        const yes = el('button', 'btn btn-primary', S2.confirmButton);
        yes.type = 'button';
        yes.addEventListener('click', function () {
          sendFeedback(data.id, 'confirm', '', yes);
        });
        actions.appendChild(yes);
      }

      if (data.canReopen) {
        const no = el('button', 'btn btn-outline', S2.reopenButton);
        no.type = 'button';
        actions.appendChild(no);

        const form = el('form', 'reopen-form');
        form.hidden = true;
        const id = 'reopen-note';
        const label = el('label', undefined, S2.reopenNoteLabel);
        label.htmlFor = id;
        const note = el('textarea');
        note.id = id;
        note.maxLength = 500;
        note.rows = 3;
        const row = el('div', 'feedback-actions');
        const send = el('button', 'btn btn-primary', S2.reopenSubmit);
        send.type = 'submit';
        const cancel = el('button', 'btn btn-outline', S2.cancel);
        cancel.type = 'button';
        row.appendChild(send);
        row.appendChild(cancel);
        form.appendChild(label);
        form.appendChild(note);
        form.appendChild(row);
        panel.appendChild(form);

        no.addEventListener('click', function () {
          form.hidden = false;
          actions.hidden = true;
          note.focus();
        });
        cancel.addEventListener('click', function () {
          form.hidden = true;
          actions.hidden = false;
          no.focus();
        });
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          sendFeedback(data.id, 'reopen', note.value, send);
        });
      }

      return panel;
    }

    function sendFeedback(reference: string, action: 'confirm' | 'reopen', note: string, button: HTMLButtonElement): void {
      button.disabled = true;

      const body = new URLSearchParams();
      body.set('csrf_token', csrf);
      body.set('reference', reference);
      body.set('action', action);
      if (note.trim() !== '') body.set('note', note.trim());

      fetch(feedbackEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'X-CSRF-Token': csrf },
        body: body.toString(),
      })
        .then(function (response) {
          return response.json() as Promise<TrackResponse>;
        })
        .then(function (payload) {
          if (payload.success && payload.data !== undefined) {
            render(payload.data, payload.message);
          } else {
            button.disabled = false;
            message('error', payload.message ?? S2.networkError);
          }
        })
        .catch(function () {
          button.disabled = false;
          message('error', S2.networkError);
        });
    }

    /** Build the result panel. Every value goes in as text, never as markup. */
    function render(data: TrackData, notice?: string): void {
      result.textContent = '';

      if (notice !== undefined) {
        const box = el('div', 'flash flash-success');
        box.appendChild(el('span', undefined, notice));
        result.appendChild(box);
      }

      const card = el('div', 'result-card');

      const head = el('div', 'result-head');
      head.appendChild(el('span', 'chip chip-' + data.status, S2.statuses[data.status]));
      head.appendChild(el('span', 'result-ref', data.id));
      card.appendChild(head);

      // Three segments: received, being worked on, closed.
      const reached = data.status === 'pending' ? 1 : data.status === 'in_progress' || data.status === 'reopened' ? 2 : 3;
      const rail = el('div', 'progress-rail');
      rail.setAttribute('aria-hidden', 'true');
      for (let i = 1; i <= 3; i += 1) {
        const part = el('span');
        if (i <= reached) part.className = 'is-on';
        if (i === reached && (data.status === 'reopened' || data.status === 'notdone')) part.className = 'is-on is-warn';
        part.style.animationDelay = i * 120 + 'ms';
        rail.appendChild(part);
      }
      card.appendChild(rail);

      if (data.overdue) card.appendChild(el('p', 'overdue-note', S2.overdueNote));

      card.appendChild(el('h3', undefined, S2.detailsHeader));

      const list = el('dl', 'result-list');
      if (data.category !== null) {
        list.appendChild(row(S2.labelCategory, S2.categories[data.category] ?? data.category));
      }
      if (data.urgency !== null) {
        list.appendChild(row(S2.labelUrgency, S2.urgencies[data.urgency] ?? data.urgency));
      }
      if (data.location !== null) list.appendChild(row(S2.labelLocation, data.location));
      list.appendChild(row(S2.labelSector, data.sector));
      list.appendChild(row(S2.labelDate, data.time));
      if (data.dueBy !== null) list.appendChild(row(S2.labelTarget, data.dueBy));
      const detailsRow = row(S2.labelDetails, data.details);
      detailsRow.classList.add('result-row-wide');
      list.appendChild(detailsRow);
      card.appendChild(list);

      if (data.photoUrl !== null) {
        const figure = el('a', 'result-photo');
        figure.href = data.photoUrl;
        figure.target = '_blank';
        figure.rel = 'noopener';
        const photo = el('img');
        photo.src = data.photoUrl;
        photo.alt = S2.photoAlt;
        photo.loading = 'lazy';
        figure.appendChild(photo);
        card.appendChild(figure);
      }

      card.appendChild(el('h3', undefined, S2.timelineHeader));

      const timeline = el('ol', 'timeline');
      data.events.forEach(function (event, i) {
        const failed = event.kind === 'status' && event.status === 'notdone';
        const item = timelineItem(eventLabel(event), event.time, event.note, failed ? 'failed' : 'done');
        item.style.setProperty('--i', String(i));
        timeline.appendChild(item);
      });
      // What is still to come, so an open report reads as "not finished yet"
      // rather than as a history that simply stopped.
      if (data.status !== 'done' && data.status !== 'notdone') {
        timeline.appendChild(timelineItem(S2.statuses.done, data.dueBy ?? '', null, 'todo'));
      }
      card.appendChild(timeline);

      if (data.canConfirm || data.canReopen) card.appendChild(feedbackPanel(data));
      if (data.confirmed) card.appendChild(el('p', 'confirmed-note', S2.confirmedNote));

      result.appendChild(card);
    }

    const submitLabel = button === null ? null : button.querySelector('[data-submit-label]');
    const idleText = submitLabel === null ? '' : submitLabel.textContent ?? '';

    function busy(on: boolean): void {
      if (button === null) return;
      button.disabled = on;
      const label = button.getAttribute('data-label-submitting');
      if (submitLabel !== null) submitLabel.textContent = on && label !== null ? label : idleText;
      if (on) {
        result.textContent = '';
        result.appendChild(el('div', 'skeleton'));
      }
    }

    /** Chips for the references this device remembers. */
    const savedBox = document.querySelector<HTMLElement>('[data-saved-reports]');

    function closeIcon(): SVGSVGElement {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 16 16');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M4 4l8 8M12 4l-8 8');
      svg.appendChild(path);
      return svg;
    }

    function renderSaved(): void {
      if (savedBox === null) return;
      const list = savedReferences();
      savedBox.textContent = '';
      savedBox.hidden = list.length === 0;
      if (list.length === 0) return;

      savedBox.appendChild(el('span', 'saved-label', savedBox.getAttribute('data-label') ?? ''));
      list.forEach(function (reference) {
        const chip = el('span', 'saved-chip');
        const open = el('button', 'saved-open', reference);
        open.type = 'button';
        open.addEventListener('click', function () {
          input.value = reference;
          form?.dispatchEvent(new Event('submit', { cancelable: true }));
        });
        const remove = el('button', 'saved-remove');
        remove.type = 'button';
        remove.setAttribute('aria-label', S2.removeSaved + ' ' + reference);
        remove.appendChild(closeIcon());
        remove.addEventListener('click', function () {
          writeReferences(savedReferences().filter((r) => r !== reference));
          renderSaved();
        });
        chip.appendChild(open);
        chip.appendChild(remove);
        savedBox.appendChild(chip);
      });
    }

    renderSaved();

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
            rememberReference(payload.data.id);
            renderSaved();
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
   * Feed: search and filters, over the cards already on the page
   * ------------------------------------------------------------------ */

  (function feed(): void {
    const box = document.querySelector<HTMLInputElement>('[data-feed-search]');
    const grid = document.querySelector<HTMLElement>('[data-feed-grid]');
    const empty = document.querySelector<HTMLElement>('[data-feed-empty]');
    const status = document.querySelector<HTMLElement>('[data-feed-status]');
    if (box === null || grid === null || S === null) return;

    const str = S;
    const search = box;
    const cards = Array.prototype.slice.call(grid.querySelectorAll('[data-feed-card]')) as HTMLElement[];
    cards.forEach((card) => card.classList.add('is-entering'));

    let group = 'all';
    let category = 'all';

    function apply(): void {
      const term = search.value.trim().toLowerCase();
      let shown = 0;
      cards.forEach(function (card) {
        const match =
          (term === '' || (card.getAttribute('data-search') ?? '').indexOf(term) !== -1) &&
          (group === 'all' || card.getAttribute('data-group') === group) &&
          (category === 'all' || card.getAttribute('data-category') === category);
        card.hidden = !match;
        if (match) shown += 1;
      });
      if (empty !== null) empty.hidden = shown !== 0;
      if (status !== null) status.textContent = shown === cards.length ? str.searchCleared : shown === 0 ? str.noMatches : '';
    }

    function wire(attribute: string, set: (value: string) => void): void {
      const buttons = document.querySelectorAll<HTMLButtonElement>('[' + attribute + ']');
      buttons.forEach(function (button) {
        button.addEventListener('click', function () {
          buttons.forEach((b) => b.setAttribute('aria-pressed', b === button ? 'true' : 'false'));
          set(button.getAttribute(attribute) ?? 'all');
          apply();
        });
      });
    }

    wire('data-feed-group', (value) => {
      group = value;
    });
    wire('data-feed-category', (value) => {
      category = value;
    });
    search.addEventListener('input', apply);
  })();

  /* ---------------------------------------------------------------------
   * Live counters on the home page
   *
   * Refreshes only while the tab is visible, so a page left open in the
   * background costs nothing. A failed poll is silent: the last numbers stay.
   * ------------------------------------------------------------------ */

  (function liveStats(): void {
    const card = document.querySelector<HTMLElement>('[data-live-stats]');
    const url = card === null ? null : card.getAttribute('data-live-stats');
    if (card === null || url === null) return;
    const theCard = card;
    const endpoint = url;

    function refresh(): void {
      if (document.hidden) return;
      fetch(endpoint, { headers: { Accept: 'application/json' } })
        .then((response) => (response.ok ? (response.json() as Promise<Record<string, unknown>>) : null))
        .then(function (stats) {
          if (stats === null) return;
          theCard.querySelectorAll<HTMLElement>('[data-stat]').forEach(function (node) {
            const value = stats[node.getAttribute('data-stat') ?? ''];
            if (value !== undefined && String(value) !== (node.textContent ?? '').trim()) {
              window.CK.countTo(node, String(value));
            }
          });
        })
        .catch(function () {
          // Offline for a moment. The next poll tries again.
        });
    }

    window.setInterval(refresh, 45000);
    document.addEventListener('visibilitychange', refresh);
  })();

  /* ---------------------------------------------------------------------
   * Install as an app, where the browser offers it
   * ------------------------------------------------------------------ */

  (function install(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('[data-install]');
    let offer: (Event & { prompt(): Promise<void> }) | null = null;

    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      offer = event as Event & { prompt(): Promise<void> };
      buttons.forEach((button) => {
        button.hidden = false;
      });
    });

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        void offer?.prompt();
        offer = null;
        buttons.forEach((b) => {
          b.hidden = true;
        });
      });
    });
  })();
})();
