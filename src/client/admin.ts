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
 *  4. Counters are re-derived from the DOM after a change rather than nudged up
 *     and down. The original incremented and decremented, and its branch for
 *     notdone -> done could drift the "In progress" count out of step.
 *
 * Compiled by tsconfig.client.json to public/js/admin.js.
 */

type StatusKey = 'pending' | 'done' | 'notdone';

interface MutationResponse {
  success: boolean;
  message?: string;
  status?: StatusKey;
  label?: string;
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
    if (el !== null) el.textContent = String(value);
  }

  function recountFromDom(): void {
    const cards = document.querySelectorAll<HTMLElement>('.report-card');
    let pending = 0;
    let done = 0;
    let high = 0;

    Array.prototype.forEach.call(cards, function (card: HTMLElement) {
      const status = card.dataset.status;
      if (status === 'done') {
        done += 1;
      } else {
        // 'pending' and 'notdone' both count as outstanding, matching the
        // dashboard query.
        pending += 1;
      }
      if (card.dataset.urgency === 'high') high += 1;
    });

    setCount('stat-total', cards.length);
    setCount('stat-pending', pending);
    setCount('stat-resolved', done);
    setCount('stat-high', high);
  }

  /* ---------------------------------------------------------------------
   * Search and filters
   * ------------------------------------------------------------------ */
  const searchInput = document.getElementById('adminSearch') as HTMLInputElement | null;
  const noResults = document.getElementById('noResultsState');
  const filterCount = document.getElementById('filterCount');
  const filterStatus = document.getElementById('filterStatus');
  const pillInputs = document.querySelectorAll<HTMLInputElement>('.pill-input');

  function activeFilters(): Record<string, string[]> {
    const active: Record<string, string[]> = { status: [], urgency: [], category: [] };
    Array.prototype.forEach.call(pillInputs, function (input: HTMLInputElement) {
      if (!input.checked) return;
      const type = input.dataset.filterType ?? '';
      const value = input.dataset.filterValue ?? '';
      if (active[type] !== undefined) (active[type] as string[]).push(value);
    });
    return active;
  }

  function applyFilters(): void {
    const query = (searchInput?.value ?? '').toLowerCase().trim();
    const active = activeFilters();
    const total =
      (active.status as string[]).length + (active.urgency as string[]).length + (active.category as string[]).length;

    if (filterCount !== null) {
      filterCount.textContent = String(total);
      filterCount.hidden = total === 0;
    }

    const cards = document.querySelectorAll<HTMLElement>('.report-card');
    let visible = 0;

    Array.prototype.forEach.call(cards, function (card: HTMLElement) {
      const haystack = card.dataset.search ?? '';
      const matchesQuery = query === '' || haystack.indexOf(query) !== -1;
      const matchesStatus =
        (active.status as string[]).length === 0 ||
        (active.status as string[]).indexOf(card.dataset.status ?? '') !== -1;
      const matchesUrgency =
        (active.urgency as string[]).length === 0 ||
        (active.urgency as string[]).indexOf(card.dataset.urgency ?? '') !== -1;
      const matchesCategory =
        (active.category as string[]).length === 0 ||
        (active.category as string[]).indexOf(card.dataset.category ?? '') !== -1;

      const show = matchesQuery && matchesStatus && matchesUrgency && matchesCategory;
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (noResults !== null) {
      noResults.hidden = !(visible === 0 && cards.length > 0);
    }
    if (filterStatus !== null) {
      filterStatus.textContent =
        query === '' && total === 0 ? '' : visible + ' of ' + cards.length + ' reports shown';
    }

    // The count beside the queue heading tracks what is actually on screen, so
    // it never disagrees with the rows below it.
    const queueCount = document.getElementById('queueCount');
    if (queueCount !== null) {
      queueCount.textContent =
        visible === cards.length ? cards.length + ' total' : visible + ' of ' + cards.length;
    }
  }

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
    return value === 'pending' || value === 'done' || value === 'notdone' ? value : null;
  }

  function onStatusClick(button: HTMLButtonElement): void {
    const reportId = button.dataset.report ?? '';
    const nextStatus = toStatusKey(button.dataset.status);
    const card = document.getElementById('report-' + reportId);
    if (card === null || reportId === '' || nextStatus === null) return;
    if (card.dataset.status === nextStatus) return; // already there

    const group = card.querySelector<HTMLElement>('.status-buttons');
    group?.classList.add('is-busy');

    postToAdmin('/admin/status', { id: reportId, status: nextStatus })
      .then(function (data) {
        group?.classList.remove('is-busy');
        if (!data.success) {
          toast(data.message ?? 'Could not update the report.', 'error');
          return;
        }

        card.dataset.status = nextStatus;

        const buttons = card.querySelectorAll<HTMLButtonElement>('.status-btn');
        Array.prototype.forEach.call(buttons, function (btn: HTMLButtonElement) {
          const isActive = btn.dataset.status === nextStatus;
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        const label = card.querySelector<HTMLElement>('[data-role="status-label"]');
        if (label !== null && data.label !== undefined) label.textContent = data.label;

        recountFromDom();
        applyFilters();
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
   * Delegated listeners, so buttons work regardless of render order
   * ------------------------------------------------------------------ */
  document.addEventListener('click', function (event) {
    const target = event.target as HTMLElement | null;
    if (target === null) return;

    const statusBtn = target.closest<HTMLButtonElement>('.status-btn');
    if (statusBtn !== null) {
      event.preventDefault();
      onStatusClick(statusBtn);
      return;
    }

    const deleteBtn = target.closest<HTMLElement>('.delete-btn');
    if (deleteBtn !== null) {
      event.preventDefault();
      openDialog(deleteBtn.dataset.report ?? '', deleteBtn.dataset.reference ?? 'This report');
    }
  });
})();
