/* admin.js - Mobile-First Interactive Controller for Clean Kigali Admin Dashboard */

document.addEventListener('DOMContentLoaded', () => {
    // 0. CSRF token, rendered into <meta> by admin.php. Every state-changing
    //    request carries it so a cross-site form post is rejected server-side.
    const CSRF_TOKEN = document.querySelector('meta[name="csrf-token"]')?.content || '';

    /**
     * POST to admin.php with the CSRF token attached both as a form field and
     * as a header. A 401 means the session lapsed — bounce to the login page
     * rather than leaving the admin clicking buttons that silently do nothing.
     */
    function postToAdmin(formData) {
        formData.append('csrf_token', CSRF_TOKEN);

        return fetch('admin.php', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin',
            headers: { 'X-CSRF-Token': CSRF_TOKEN }
        }).then(response => {
            if (response.status === 401) {
                window.location.href = 'login.php';
                throw new Error('Session expired');
            }
            return response.json();
        });
    }

    // 1. Toast Notification Manager
    window.showToast = function(message, type = 'success') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        // textContent, not innerHTML: messages can carry server text, and this
        // keeps any markup in them inert.
        const span = document.createElement('span');
        span.textContent = message;
        toast.appendChild(span);
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    };

    // 2. Toggle Card Details Drawer
    window.toggleDetails = function(id) {
        const drawer = document.getElementById(`details-${id}`);
        const btn = document.querySelector(`#report-${id} .details-toggle-btn`);
        if (drawer) {
            const isVisible = drawer.style.display === 'block';
            drawer.style.display = isVisible ? 'none' : 'block';
            if (btn) {
                btn.innerHTML = isVisible ? 'See More Details ▾' : 'Hide Details ▴';
            }
        }
    };

    // 3. Bottom Sheet Filter Dialog Controls (Mobile)
    const filterBtnTrigger = document.getElementById('filterBtnTrigger');
    const filterSheetOverlay = document.getElementById('filterSheetOverlay');
    const filterSheet = document.getElementById('filterSheet');
    const filterSheetClose = document.getElementById('filterSheetClose');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const filterCountBadge = document.getElementById('filterCountBadge');

    function openBottomSheet() {
        if (filterSheet && filterSheetOverlay) {
            filterSheet.classList.add('open');
            filterSheetOverlay.classList.add('open');
            document.body.style.overflow = 'hidden'; // Lock page scroll
        }
    }

    function closeBottomSheet() {
        if (filterSheet && filterSheetOverlay) {
            filterSheet.classList.remove('open');
            filterSheetOverlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    if (filterBtnTrigger) {
        filterBtnTrigger.addEventListener('click', openBottomSheet);
    }
    if (filterSheetClose) {
        filterSheetClose.addEventListener('click', closeBottomSheet);
    }
    if (filterSheetOverlay) {
        filterSheetOverlay.addEventListener('click', closeBottomSheet);
    }

    // 4. Multi-criteria Filtering & Search Logic
    const searchInput = document.getElementById('adminSearch');
    const cards = document.querySelectorAll('.admin-report-card');
    const noResults = document.getElementById('noResultsState');
    const filterPills = document.querySelectorAll('.filter-pill');

    // Store selected filters
    let activeFilters = {
        status: [],
        urgency: [],
        category: []
    };

    // Pill click handler
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const type = pill.dataset.filterType;
            const value = pill.dataset.filterValue;

            pill.classList.toggle('active');

            if (pill.classList.contains('active')) {
                if (!activeFilters[type].includes(value)) {
                    activeFilters[type].push(value);
                }
            } else {
                activeFilters[type] = activeFilters[type].filter(v => v !== value);
            }

            // If desktop (non-mobile bottom sheet is not open but inline filters exist), apply immediately
            if (window.innerWidth >= 900) {
                applySearchAndFilters();
            }
        });
    });

    function applySearchAndFilters() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        let visibleCount = 0;
        let activeFilterCount = 0;

        // Calculate count of active filters
        Object.keys(activeFilters).forEach(key => {
            activeFilterCount += activeFilters[key].length;
        });

        // Update badge count
        if (filterCountBadge) {
            if (activeFilterCount > 0) {
                filterCountBadge.textContent = activeFilterCount;
                filterCountBadge.style.display = 'flex';
            } else {
                filterCountBadge.style.display = 'none';
            }
        }

        cards.forEach(card => {
            const category = card.dataset.category.toLowerCase();
            const location = card.dataset.location.toLowerCase();
            const sector = card.dataset.sector.toLowerCase();
            const name = card.dataset.name.toLowerCase();
            const details = card.dataset.details.toLowerCase();
            const ref = card.dataset.id.toLowerCase();
            
            const status = card.dataset.status;
            const urgency = card.dataset.urgency;

            // 1. Text Search query matching
            const matchesSearch = category.includes(query) || 
                                 location.includes(query) || 
                                 sector.includes(query) || 
                                 name.includes(query) || 
                                 ref.includes(query) ||
                                 details.includes(query);

            // 2. Status matching
            const matchesStatus = activeFilters.status.length === 0 || 
                                 activeFilters.status.includes(status);

            // 3. Urgency matching
            const matchesUrgency = activeFilters.urgency.length === 0 || 
                                  activeFilters.urgency.includes(urgency);

            // 4. Category matching
            const matchesCategory = activeFilters.category.length === 0 || 
                                    activeFilters.category.includes(card.dataset.category);

            if (matchesSearch && matchesStatus && matchesUrgency && matchesCategory) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (noResults) {
            noResults.style.display = (visibleCount === 0) ? 'block' : 'none';
        }
    }

    // Apply button click (mobile sheet)
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            applySearchAndFilters();
            closeBottomSheet();
            showToast('Filters applied successfully', 'info');
        });
    }

    // Clear filters button
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            activeFilters = {
                status: [],
                urgency: [],
                category: []
            };
            applySearchAndFilters();
            closeBottomSheet();
            showToast('Filters cleared', 'info');
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', applySearchAndFilters);
    }

    // 5. Update Stats Counters
    function updateStatsCounters(oldStatus, newStatus) {
        const totalPendingEl = document.getElementById('stat-pending');
        const totalResolvedEl = document.getElementById('stat-resolved');

        if (oldStatus !== newStatus) {
            // Adjust In Progress (Pending)
            if ((oldStatus === 'pending' || oldStatus === '' || oldStatus === 'notdone') && totalPendingEl) {
                if (newStatus === 'done') {
                    totalPendingEl.textContent = Math.max(0, parseInt(totalPendingEl.textContent) - 1);
                }
            } else if (newStatus === 'pending' || newStatus === 'notdone') {
                if (oldStatus === 'done' && totalPendingEl) {
                    totalPendingEl.textContent = parseInt(totalPendingEl.textContent) + 1;
                }
            }

            // Adjust Resolved (Done)
            if (oldStatus === 'done' && totalResolvedEl) {
                totalResolvedEl.textContent = Math.max(0, parseInt(totalResolvedEl.textContent) - 1);
            } else if (newStatus === 'done' && totalResolvedEl) {
                totalResolvedEl.textContent = parseInt(totalResolvedEl.textContent) + 1;
            }
        }
    }

    // 6. AJAX Status Update Handling
    window.updateStatus = function(event, reportId, newStatus) {
        event.preventDefault();
        
        const card = document.getElementById(`report-${reportId}`);
        const oldStatus = card.dataset.status;

        if (oldStatus === newStatus) return; // No change

        const formData = new FormData();
        formData.append('update_status_ajax', '1');
        formData.append('id', reportId);
        formData.append('status', newStatus);

        const btnGroup = card.querySelector('.status-btn-group');
        const originalOpacity = btnGroup.style.opacity;
        btnGroup.style.opacity = '0.5';
        btnGroup.style.pointerEvents = 'none';

        postToAdmin(formData)
        .then(data => {
            btnGroup.style.opacity = originalOpacity;
            btnGroup.style.pointerEvents = 'auto';

            if (data.success) {
                card.dataset.status = newStatus;

                const buttons = btnGroup.querySelectorAll('.status-pill-btn');
                buttons.forEach(btn => {
                    if (btn.dataset.status === newStatus) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });

                updateStatsCounters(oldStatus, newStatus);
                showToast(`Report CK-${reportId} status updated to ${newStatus.toUpperCase()}`, 'success');
                applySearchAndFilters();
            } else {
                showToast(data.message || 'Failed to update status', 'error');
            }
        })
        .catch(err => {
            btnGroup.style.opacity = originalOpacity;
            btnGroup.style.pointerEvents = 'auto';
            // On an expired session we are already redirecting; no toast needed.
            if (err.message !== 'Session expired') {
                showToast('Network error, please try again.', 'error');
                console.error(err);
            }
        });
    };

    // 7. AJAX Delete Handling
    window.deleteReport = function(event, reportId) {
        event.preventDefault();
        
        if (!confirm(`Are you sure you want to permanently delete report CK-${reportId}?`)) {
            return;
        }

        const card = document.getElementById(`report-${reportId}`);
        const status = card.dataset.status;
        const urgency = card.dataset.urgency;

        const formData = new FormData();
        formData.append('delete_report_ajax', '1');
        formData.append('id', reportId);

        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';

        postToAdmin(formData)
        .then(data => {
            if (data.success) {
                // Animate removal
                card.style.transform = 'scale(0.95)';
                card.style.opacity = '0';
                card.style.transition = '0.2s ease-out';
                
                setTimeout(() => {
                    card.remove();
                    
                    const totalReportsEl = document.getElementById('stat-total');
                    const totalPendingEl = document.getElementById('stat-pending');
                    const totalResolvedEl = document.getElementById('stat-resolved');
                    const totalHighEl = document.getElementById('stat-high');

                    if (totalReportsEl) totalReportsEl.textContent = Math.max(0, parseInt(totalReportsEl.textContent) - 1);
                    if ((status === 'pending' || status === 'notdone') && totalPendingEl) {
                        totalPendingEl.textContent = Math.max(0, parseInt(totalPendingEl.textContent) - 1);
                    }
                    if (status === 'done' && totalResolvedEl) totalResolvedEl.textContent = Math.max(0, parseInt(totalResolvedEl.textContent) - 1);
                    if (urgency === 'high' && totalHighEl) totalHighEl.textContent = Math.max(0, parseInt(totalHighEl.textContent) - 1);

                    showToast(`Report CK-${reportId} deleted`, 'success');
                    applySearchAndFilters();
                }, 200);
            } else {
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
                showToast(data.message || 'Failed to delete report', 'error');
            }
        })
        .catch(err => {
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
            if (err.message !== 'Session expired') {
                showToast('Network error, please try again.', 'error');
                console.error(err);
            }
        });
    };
});
