/**
 * admin.ts — dashboard controller.
 *
 * Port of admin.js. Changes from the original:
 *
 *  1. window.confirm() for deletion is replaced by a real modal dialog. confirm()
 *     blocks the whole page, cannot be described to assistive tech, and cannot be
 *     styled; the dialog here traps focus and closes on Escape.
 *  2. Toasts are appended to one live region so a screen reader announces them.
 *     Text is set with textContent, as the original correctly did.
 *  3. Filters are real checkboxes inside a <details> disclosure rather than divs
 *     with a click handler, so the whole filter panel works by keyboard.
 *  4. Open counters are re-derived from the DOM after a change rather than nudged
 *     up and down. The original incremented and decremented, and its branch for
 *     notdone -> done could drift the "In progress" count out of step.
 *
 * Compiled by tsconfig.client.json to public/js/admin.js.
 */

type StatusKey = 'pending' | 'in_progress' | 'done' | 'notdone' | 'reopened';

interface TimelineEntry {
  time: string;
  title: string;
  note: string | null;
  actor: string;
  internal: boolean;
}

interface MutationResponse {
  success: boolean;
  message?: string;
  status?: StatusKey;
  label?: string;
  changed?: boolean;
  allowed?: StatusKey[];
  slaState?: string;
  slaLabel?: string;
  timeline?: TimelineEntry[];
}

(function () {
  'use strict';

  const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

  /* ---------------------------------------------------------------------
   * Transport
   * ------------------------------------------------------------------ */

  /**
   * POST to an admin endpoint with the CSRF token attached as both a form field
   * and a header. A 401 means the session lapsed — go to the login page rather
   * than leaving the operator clicking buttons that silently do nothing.
   */
  function postToAdmin(path: string, fields: Record<string, string>): Promise<MutationResponse> {
    const body = new URLSearchParams();
    body.set('csrf_token', csrfToken);
    Object.keys(fields).forEach(function (key) {
      body.set(key, fields[key] as string);
    });

    return window
      .fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRF-Token': csrfToken,
        },
        body: body.toString(),
      })
      .then(function (response) {
        if (response.status === 401) {
          window.location.href = '/login';
          throw new Error('Session expired');
        }
        return response.json() as Promise<MutationResponse>;
      });
  }

  /* ---------------------------------------------------------------------
   * District -> sector dependency, on the accounts page
   *
   * Same enhancement as the public report form: narrows the sector list to the
   * chosen district. The server validates the pair regardless.
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
   * Toasts
   * ------------------------------------------------------------------ */
  const toastRegion = document.getElementById('toastRegion');

  function toast(text: string, kind: 'success' | 'error'): void {
    if (toastRegion === null) return;
    const node = document.createElement('p');
    node.className = 'toast toast-' + kind;
    node.textContent = text; // never innerHTML: this carries server text
    toastRegion.appendChild(node);
    window.setTimeout(function () {
      node.remove();
    }, 5000);
  }

  /* ---------------------------------------------------------------------
   * Counters, re-derived from the DOM
   * ------------------------------------------------------------------ */
  function setCount(id: string, value: number): void {
    const el = document.getElementById(id);
    if (el !== null) window.CK.setNumber(el, String(value));
  }

  /**
   * Every open report is on the page, so the open counters can be recounted
   * from the rows. Resolved cannot: the queue lists only the most recent closed
   * reports, so that one is adjusted by the change rather than recounted.
   */
  function recountFromDom(): void {
    const cards = document.querySelectorAll<HTMLElement>('.report-card');
    let open = 0;
    let progress = 0;
    let overdue = 0;

    Array.prototype.forEach.call(cards, function (card: HTMLElement) {
      const status = card.dataset.status;
      if (status === 'pending' || status === 'in_progress' || status === 'reopened') open += 1;
      if (status === 'in_progress') progress += 1;
      if (card.dataset.sla === 'overdue') overdue += 1;
    });

    setCount('stat-open', open);
    setCount('stat-progress', progress);
    setCount('stat-overdue', overdue);

    const badge = document.querySelector<HTMLElement>('[data-open-badge]');
    if (badge !== null) badge.textContent = String(open);
  }

  function adjustResolved(delta: number): void {
    const el = document.getElementById('stat-resolved');
    if (el === null || delta === 0) return;
    window.CK.setNumber(el, String(Math.max(window.CK.numberOf(el) + delta, 0)));
  }

  /* ---------------------------------------------------------------------
   * Views, search and filters
   *
   * Everything narrows rows already on the page. With JavaScript off every report
   * is simply listed. The row whose panel is open stays put whatever the filter
   * says, because hiding it would pull the panel out from under the officer who
   * has just changed its status.
   * ------------------------------------------------------------------ */
  const searchInput = document.getElementById('adminSearch') as HTMLInputElement | null;
  const noResults = document.getElementById('noResultsState');
  const filterCount = document.getElementById('filterCount');
  const filterStatus = document.getElementById('filterStatus');
  const pillInputs = document.querySelectorAll<HTMLInputElement>('.pill-input');
  const viewTabs = document.querySelectorAll<HTMLButtonElement>('[data-view]');

  const VIEWS: Record<string, (card: HTMLElement) => boolean> = {
    open: (c) => c.dataset.status === 'pending' || c.dataset.status === 'in_progress' || c.dataset.status === 'reopened',
    overdue: (c) => c.dataset.sla === 'overdue',
    soon: (c) => c.dataset.sla === 'at_risk',
    progress: (c) => c.dataset.status === 'in_progress',
    reopened: (c) => c.dataset.status === 'reopened',
    closed: (c) => c.dataset.status === 'done' || c.dataset.status === 'notdone',
    all: () => true,
  };

  let currentView = 'open';

  function activeFilters(): Record<string, string[]> {
    const active: Record<string, string[]> = { urgency: [], category: [] };
    Array.prototype.forEach.call(pillInputs, function (input: HTMLInputElement) {
      if (!input.checked) return;
      const list = active[input.dataset.filterType ?? ''];
      if (list !== undefined) list.push(input.dataset.filterValue ?? '');
    });
    return active;
  }

  function applyFilters(): void {
    const query = (searchInput?.value ?? '').toLowerCase().trim();
    const active = activeFilters();
    const urgency = active.urgency as string[];
    const category = active.category as string[];
    const total = urgency.length + category.length;

    if (filterCount !== null) {
      filterCount.textContent = String(total);
      filterCount.hidden = total === 0;
    }

    const cards = Array.prototype.slice.call(document.querySelectorAll('.report-card')) as HTMLElement[];
    const inView = VIEWS[currentView] ?? VIEWS.all as (c: HTMLElement) => boolean;
    let visible = 0;

    cards.forEach(function (card) {
      const open = card.querySelector<HTMLDetailsElement>('.row-details')?.open === true;
      const match =
        inView(card) &&
        (query === '' || (card.dataset.search ?? '').indexOf(query) !== -1) &&
        (urgency.length === 0 || urgency.indexOf(card.dataset.urgency ?? '') !== -1) &&
        (category.length === 0 || category.indexOf(card.dataset.category ?? '') !== -1);
      card.hidden = !(match || open);
      if (!card.hidden) visible += 1;
    });

    Object.keys(VIEWS).forEach(function (name) {
      const counter = document.querySelector<HTMLElement>('[data-view-count="' + name + '"]');
      const test = VIEWS[name];
      if (counter !== null && test !== undefined) counter.textContent = String(cards.filter(test).length);
    });

    if (noResults !== null) noResults.hidden = !(visible === 0 && cards.length > 0);
    if (filterStatus !== null) filterStatus.textContent = visible + ' of ' + cards.length + ' reports shown';

    const queueCount = document.getElementById('queueCount');
    if (queueCount !== null) {
      queueCount.textContent = visible === cards.length ? cards.length + ' total' : visible + ' of ' + cards.length;
    }
  }

  function setView(name: string): void {
    currentView = VIEWS[name] === undefined ? 'open' : name;
    Array.prototype.forEach.call(viewTabs, function (tab: HTMLButtonElement) {
      tab.setAttribute('aria-pressed', tab.dataset.view === currentView ? 'true' : 'false');
    });
    applyFilters();
  }

  Array.prototype.forEach.call(viewTabs, function (tab: HTMLButtonElement) {
    tab.addEventListener('click', () => setView(tab.dataset.view ?? 'open'));
  });

  document.querySelectorAll<HTMLButtonElement>('[data-view-target]').forEach(function (kpi) {
    kpi.addEventListener('click', function () {
      setView(kpi.dataset.viewTarget ?? 'open');
      document.getElementById('queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  searchInput?.addEventListener('input', applyFilters);
  Array.prototype.forEach.call(pillInputs, function (input: HTMLInputElement) {
    input.addEventListener('change', applyFilters);
  });

  document.getElementById('clearFiltersBtn')?.addEventListener('click', function () {
    Array.prototype.forEach.call(pillInputs, function (input: HTMLInputElement) {
      input.checked = false;
    });
    if (searchInput !== null) searchInput.value = '';
    applyFilters();
    toast('Filters cleared', 'success');
  });

  /* ---------------------------------------------------------------------
   * Status changes
   * ------------------------------------------------------------------ */
  /** Narrow an attribute value to a status, rather than casting and hoping. */
  function toStatusKey(value: string | undefined): StatusKey | null {
    return value === 'pending' || value === 'in_progress' || value === 'done' || value === 'notdone' || value === 'reopened'
      ? value
      : null;
  }

  /** Rebuild a report's history. Every value goes in as text, never as markup. */
  function renderTimeline(card: HTMLElement, submittedAt: string, entries: TimelineEntry[]): void {
    const list = card.querySelector<HTMLElement>('[data-role="timeline"]');
    if (list === null) return;
    list.textContent = '';

    function add(title: string, meta: string, note: string | null, internal: boolean): void {
      const li = document.createElement('li');
      li.className = internal ? 'event event-internal' : 'event';
      const heading = document.createElement('span');
      heading.className = 'event-title';
      heading.textContent = title;
      const when = document.createElement('span');
      when.className = 'event-meta';
      when.textContent = meta;
      li.appendChild(heading);
      li.appendChild(when);
      if (note !== null && note !== '') {
        const body = document.createElement('p');
        body.className = 'event-note';
        body.textContent = note;
        li.appendChild(body);
      }
      list?.appendChild(li);
    }

    add('Report submitted', submittedAt, null, false);
    entries.forEach(function (e) {
      const meta = e.time + (e.actor !== '' ? ' · ' + e.actor : '') + (e.internal ? ' · internal' : '');
      add(e.title, meta, e.note, e.internal);
    });
  }

  /** Make one row reflect what the server just said is true of it. */
  function applyUpdate(card: HTMLElement, data: MutationResponse): void {
    const previous = card.dataset.status;
    const next = data.status;
    if (next === undefined) return;

    card.dataset.status = next;
    card.dataset.sla = data.slaState ?? '';

    const allowed = data.allowed ?? [];
    const buttons = card.querySelectorAll<HTMLButtonElement>('.status-btn');
    Array.prototype.forEach.call(buttons, function (btn: HTMLButtonElement) {
      const value = toStatusKey(btn.dataset.status);
      const isActive = value === next;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.disabled = !isActive && (value === null || allowed.indexOf(value) === -1);
    });

    const label = card.querySelector<HTMLElement>('[data-role="status-label"]');
    if (label !== null && data.label !== undefined) label.textContent = data.label;

    // The row's one-tap action always offers the next sensible step.
    const quick = card.querySelector<HTMLButtonElement>('[data-quick]');
    if (quick !== null) {
      const step = next === 'pending' || next === 'reopened' ? ['in_progress', 'Start work'] : next === 'in_progress' ? ['done', 'Mark resolved'] : null;
      quick.hidden = step === null;
      quick.dataset.status = step === null ? '' : (step[0] as string);
      quick.textContent = step === null ? '' : (step[1] as string);
    }

    const sla = card.querySelector<HTMLElement>('[data-role="sla-label"]');
    if (sla !== null) {
      sla.textContent = data.slaLabel ?? '';
      sla.hidden = (data.slaLabel ?? '') === '';
    }

    if (data.timeline !== undefined) {
      renderTimeline(card, card.dataset.submitted ?? '', data.timeline);
    }

    if (previous === 'done' && next !== 'done') adjustResolved(-1);
    if (previous !== 'done' && next === 'done') adjustResolved(1);

    recountFromDom();
    applyFilters();
  }

  function onStatusClick(button: HTMLButtonElement): void {
    const reportId = button.dataset.report ?? '';
    const nextStatus = toStatusKey(button.dataset.status);
    const card = document.getElementById('report-' + reportId);
    if (card === null || reportId === '' || nextStatus === null) return;
    if (card.dataset.status === nextStatus || button.disabled) return; // already there

    const group = card.querySelector<HTMLElement>('.status-buttons');
    group?.classList.add('is-busy');

    postToAdmin('/admin/status', { id: reportId, status: nextStatus })
      .then(function (data) {
        group?.classList.remove('is-busy');
        if (!data.success) {
          toast(data.message ?? 'Could not update the report.', 'error');
          return;
        }
        applyUpdate(card, data);
        toast((card.dataset.reference ?? 'Report') + ' set to ' + (data.label ?? nextStatus), 'success');
      })
      .catch(function (err: Error) {
        group?.classList.remove('is-busy');
        // On an expired session we are already redirecting.
        if (err.message !== 'Session expired') {
          toast('Network error. Please try again.', 'error');
        }
      });
  }

  /* ---------------------------------------------------------------------
   * Post an update: a note on a report, without moving it
   * ------------------------------------------------------------------ */
  document.addEventListener('submit', function (event) {
    const form = event.target as HTMLFormElement | null;
    if (form === null || !form.matches('[data-update-form]')) return;
    event.preventDefault();

    const reportId = form.dataset.report ?? '';
    const card = document.getElementById('report-' + reportId);
    const noteField = form.elements.namedItem('note') as HTMLTextAreaElement | null;
    const publicField = form.elements.namedItem('note_public') as HTMLInputElement | null;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (card === null || noteField === null || publicField === null) return;

    const note = noteField.value.trim();
    if (note === '') {
      toast('Write the update first.', 'error');
      noteField.focus();
      return;
    }

    const fields: Record<string, string> = { id: reportId, status: card.dataset.status ?? '', note: note };
    if (publicField.checked) fields['note_public'] = '1';

    if (submit !== null) submit.disabled = true;

    postToAdmin('/admin/status', fields)
      .then(function (data) {
        if (submit !== null) submit.disabled = false;
        if (!data.success) {
          toast(data.message ?? 'Could not post the update.', 'error');
          return;
        }
        applyUpdate(card, data);
        noteField.value = '';
        publicField.checked = false;
        toast('Update posted', 'success');
      })
      .catch(function (err: Error) {
        if (submit !== null) submit.disabled = false;
        if (err.message !== 'Session expired') {
          toast('Network error. Please try again.', 'error');
        }
      });
  });

  /* ---------------------------------------------------------------------
   * Delete, behind a real dialog
   * ------------------------------------------------------------------ */
  const backdrop = document.getElementById('deleteBackdrop');
  const dialog = document.getElementById('deleteDialog');
  const deleteTarget = document.getElementById('deleteTarget');
  const confirmBtn = document.getElementById('deleteConfirm') as HTMLButtonElement | null;
  const cancelBtn = document.getElementById('deleteCancel');

  let pendingDeleteId = '';
  let lastFocused: HTMLElement | null = null;

  function openDialog(reportId: string, reference: string): void {
    pendingDeleteId = reportId;
    lastFocused = document.activeElement as HTMLElement | null;
    if (deleteTarget !== null) deleteTarget.textContent = reference;
    if (backdrop !== null) backdrop.hidden = false;
    if (dialog !== null) dialog.hidden = false;
    confirmBtn?.focus();
  }

  function closeDialog(): void {
    pendingDeleteId = '';
    if (backdrop !== null) backdrop.hidden = true;
    if (dialog !== null) dialog.hidden = true;
    lastFocused?.focus();
  }

  cancelBtn?.addEventListener('click', closeDialog);
  backdrop?.addEventListener('click', closeDialog);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && dialog !== null && !dialog.hidden) {
      closeDialog();
    }
  });

  confirmBtn?.addEventListener('click', function () {
    const reportId = pendingDeleteId;
    if (reportId === '') return;
    const card = document.getElementById('report-' + reportId);
    closeDialog();
    if (card === null) return;

    card.classList.add('is-busy');

    postToAdmin('/admin/delete', { id: reportId })
      .then(function (data) {
        if (!data.success) {
          card.classList.remove('is-busy');
          toast(data.message ?? 'Could not delete the report.', 'error');
          return;
        }
        const reference = card.dataset.reference ?? 'Report';
        if (card.dataset.status === 'done') adjustResolved(-1);
        card.remove();
        recountFromDom();
        applyFilters();
        toast(reference + ' deleted', 'success');
      })
      .catch(function (err: Error) {
        card.classList.remove('is-busy');
        if (err.message !== 'Session expired') {
          toast('Network error. Please try again.', 'error');
        }
      });
  });

  /* ---------------------------------------------------------------------
   * Report panel
   *
   * The panel is a native <details>, so opening and closing already work. This
   * adds what a dialog is expected to do: one at a time, focus moved in and back
   * out, Tab kept inside, and closing on Escape or a click outside.
   * ------------------------------------------------------------------ */

  function openPanel(): HTMLDetailsElement | null {
    return document.querySelector<HTMLDetailsElement>('.row-details[open]');
  }

  document.addEventListener(
    'toggle',
    function (event) {
      const details = event.target as HTMLElement;
      if (!(details instanceof HTMLDetailsElement) || !details.classList.contains('row-details')) return;

      const card = details.closest<HTMLElement>('.report-card');
      if (details.open) {
        document.querySelectorAll<HTMLDetailsElement>('.row-details[open]').forEach(function (other) {
          if (other !== details) other.open = false;
        });
        const drawer = details.querySelector<HTMLElement>('.drawer');
        if (drawer !== null) {
          drawer.tabIndex = -1;
          drawer.focus({ preventScroll: true });
        }
      } else {
        applyFilters();
        if (openPanel() === null) card?.focus({ preventScroll: true });
      }
    },
    true,
  );

  document.addEventListener('keydown', function (event) {
    const panel = openPanel();

    if (event.key === 'Escape' && panel !== null && (dialog === null || dialog.hidden)) {
      panel.open = false;
      return;
    }

    if (event.key === 'Tab' && panel !== null && (dialog === null || dialog.hidden)) {
      const focusable = Array.prototype.slice
        .call(panel.querySelectorAll('summary, a[href], button:not([disabled]), textarea, input'))
        .filter((node: HTMLElement) => node.offsetParent !== null || node.tagName === 'SUMMARY') as HTMLElement[];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) return;
      const here = document.activeElement;
      if (event.shiftKey && (here === first || !panel.contains(here))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (here === last || !panel.contains(here))) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    // Shortcuts, never while typing or with a dialog open.
    const target = event.target as HTMLElement;
    const typing = target.matches('input, textarea, select') || target.isContentEditable;
    if (typing || panel !== null || event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key === '/' && searchInput !== null) {
      event.preventDefault();
      searchInput.focus();
      return;
    }

    if (event.key === 'j' || event.key === 'k') {
      const rows = (Array.prototype.slice.call(document.querySelectorAll('.report-card')) as HTMLElement[]).filter((r) => !r.hidden);
      if (rows.length === 0) return;
      const at = rows.indexOf(target.closest('.report-card') as HTMLElement);
      const next = event.key === 'j' ? Math.min(at + 1, rows.length - 1) : Math.max(at - 1, 0);
      rows[next]?.focus();
      rows[next]?.scrollIntoView({ block: 'nearest' });
      return;
    }

    if (event.key === 'Enter' && target.matches('.report-card')) {
      const details = target.querySelector<HTMLDetailsElement>('.row-details');
      if (details !== null) details.open = true;
    }
  });

  document.querySelectorAll<HTMLElement>('.report-card').forEach(function (card) {
    card.tabIndex = 0;
  });

  /* ---------------------------------------------------------------------
   * Delegated clicks, so buttons work regardless of render order
   * ------------------------------------------------------------------ */
  document.addEventListener('click', function (event) {
    const target = event.target as HTMLElement | null;
    if (target === null) return;

    const statusBtn = target.closest<HTMLButtonElement>('.status-btn, .quick-btn');
    if (statusBtn !== null) {
      event.preventDefault();
      onStatusClick(statusBtn);
      return;
    }

    const deleteBtn = target.closest<HTMLElement>('.delete-btn');
    if (deleteBtn !== null) {
      event.preventDefault();
      openDialog(deleteBtn.dataset.report ?? '', deleteBtn.dataset.reference ?? 'This report');
      return;
    }

    // The dimmed area behind an open panel belongs to the <details> itself.
    if (target.matches('.row-details[open]')) {
      (target as HTMLDetailsElement).open = false;
      return;
    }

    // Anywhere else on a row opens its panel.
    if (target.closest('a, button, input, textarea, label, summary, .drawer') !== null) return;
    const row = target.closest<HTMLElement>('.report-card');
    const details = row?.querySelector<HTMLDetailsElement>('.row-details');
    if (details !== null && details !== undefined) details.open = true;
  });

  /* ---------------------------------------------------------------------
   * Live updates
   *
   * Tells an officer that reports have arrived without reloading underneath them
   * and losing their place. Only while the tab is visible, and it stops for good
   * if the session has ended, rather than polling a sign-in page for ever.
   * ------------------------------------------------------------------ */

  (function live(): void {
    const status = document.getElementById('liveStatus');
    const pill = document.getElementById('newReports') as HTMLButtonElement | null;
    if (status === null || pill === null) return;
    const newPill = pill;

    let highest = 0;
    document.querySelectorAll<HTMLElement>('.report-card').forEach(function (card) {
      highest = Math.max(highest, Number(card.dataset.id));
    });

    newPill.addEventListener('click', () => window.location.reload());

    let timer = 0;

    function poll(): void {
      if (document.hidden) return;
      window
        .fetch('/admin/live', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (response) {
          if (response.status === 401) {
            window.clearInterval(timer);
            return null;
          }
          return response.ok ? (response.json() as Promise<{ newestId: number }>) : null;
        })
        .then(function (data) {
          if (data !== null && data.newestId > highest) {
            newPill.textContent = 'New reports. Refresh';
            newPill.hidden = false;
          }
        })
        .catch(function () {
          // Offline for a moment. The next poll tries again.
        });
    }

    timer = window.setInterval(poll, 30000);
    document.addEventListener('visibilitychange', poll);
  })();

  /* ---------------------------------------------------------------------
   * Chart tooltip, on the insights page
   * ------------------------------------------------------------------ */

  (function chartTip(): void {
    const wrap = document.querySelector<HTMLElement>('[data-chart]');
    const tip = document.querySelector<HTMLElement>('[data-chart-tip]');
    if (wrap === null || tip === null) return;
    const box = wrap;
    const label = tip;

    box.querySelectorAll('title').forEach((title) => title.remove());

    box.addEventListener('pointermove', function (event) {
      const day = (event.target as Element).closest<SVGGElement>('.chart-day');
      if (day === null) {
        label.hidden = true;
        return;
      }
      const area = box.getBoundingClientRect();
      label.textContent =
        (day.dataset.day ?? '') + ': ' + (day.dataset.created ?? '0') + ' reported, ' + (day.dataset.resolved ?? '0') + ' resolved';
      label.style.left = event.clientX - area.left + box.scrollLeft + 'px';
      label.style.top = event.clientY - area.top + 'px';
      label.hidden = false;
    });
    box.addEventListener('pointerleave', function () {
      label.hidden = true;
    });
  })();

  applyFilters();
})();
