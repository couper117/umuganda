/* app.js - Mobile-First Interactive Scripts for Clean Kigali */

/**
 * Escape a value for safe interpolation into an innerHTML template.
 * Report text is submitted by the public, so it must never be trusted as markup.
 */
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
    // Get page language
    const lang = document.documentElement.lang || 'rw';

    // 1. Mobile Menu Drawer Toggle
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active') && !navLinks.contains(e.target) && e.target !== menuToggle) {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
            }
        });

        // Close menu when clicking a nav link
        const links = navLinks.querySelectorAll('.nav-link');
        links.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // 2. Form Submission Loading Feedback
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', () => {
            const submitBtn = reportForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.classList.add('btn-submit-loading');
                submitBtn.disabled = true;
            }
        });
    }

    // 3. Category Selector Radio Cards (Touch friendly)
    const catOptions = document.querySelectorAll('.cat-option');
    catOptions.forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        if (radio) {
            if (radio.checked) {
                option.classList.add('selected');
            }
            option.addEventListener('click', () => {
                catOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                radio.checked = true;
            });
        }
    });

    // 4. Urgency Selector Buttons (Touch friendly)
    const urgOptions = document.querySelectorAll('.urg-option');
    urgOptions.forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        if (radio) {
            if (radio.checked) {
                option.classList.add('selected');
            }
            option.addEventListener('click', () => {
                urgOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                radio.checked = true;
            });
        }
    });

    // 5. Success Screen: Copy Reference Code to Clipboard
    window.copyRefCode = function(refCode) {
        navigator.clipboard.writeText(refCode).then(() => {
            let alertMsg = 'Reference code copied to clipboard!';
            if (lang === 'rw') alertMsg = 'Nimero y\'iraporo yanditswe!';
            if (lang === 'fr') alertMsg = 'Code de référence copié !';
            alert(alertMsg);
        }).catch(err => {
            console.error('Copy failed: ', err);
        });
    };

    // 6. Success Screen: Track This Report Action Shortcut
    window.trackReportDirect = function(refCode) {
        const trackInput = document.getElementById('trackRefInput');
        const trackerSection = document.getElementById('tracker-section');
        if (trackInput && trackerSection) {
            trackInput.value = refCode;
            
            // Close mobile menu if open
            if (menuToggle) {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
            }
            
            // Scroll to tracker
            trackerSection.scrollIntoView({ behavior: 'smooth' });
            
            // Click track button
            const trackBtn = document.getElementById('trackSubmitBtn');
            if (trackBtn) {
                trackBtn.click();
            }
        }
    };

    // 7. Localized helper mappings
    function formatCategoryLocal(cat) {
        if (lang === 'rw') {
            switch (cat) {
                case 'full-bin': return '🗑️ Ipubure Yuzuye Cyane';
                case 'blocked-drain': return '🌊 Umuyoboro Wazibye';
                case 'illegal-dumping': return '🚯 Imyanda Ahatemewe';
                case 'litter': return '🍂 Imyanda Inyanyagiye';
                default: return '📍 Ikindi Kibazo';
            }
        } else if (lang === 'fr') {
            switch (cat) {
                case 'full-bin': return '🗑️ Poubelle Pleine';
                case 'blocked-drain': return '🌊 Caniveau Bouché';
                case 'illegal-dumping': return '🚯 Dépôt Sauvage';
                case 'litter': return '🍂 Déchets Jetés';
                default: return '📍 Autre Problème';
            }
        } else {
            switch (cat) {
                case 'full-bin': return '🗑️ Overflowing Bin';
                case 'blocked-drain': return '🌊 Blocked Drain';
                case 'illegal-dumping': return '🚯 Illegal Dumping';
                case 'litter': return '🍂 General Litter';
                default: return '📍 Other Issue';
            }
        }
    }

    function formatUrgencyLocal(urg) {
        if (lang === 'rw') {
            switch (urg) {
                case 'low': return 'Hasi';
                case 'medium': return 'Kuringaniza';
                case 'high': return 'Byihutirwa Cyane';
                default: return urg;
            }
        } else if (lang === 'fr') {
            switch (urg) {
                case 'low': return 'Faible';
                case 'medium': return 'Moyenne';
                case 'high': return 'Très Urgent';
                default: return urg;
            }
        } else {
            return urg.charAt(0).toUpperCase() + urg.slice(1);
        }
    }

    function getTimelineLabel(step) {
        const labels = {
            rw: {
                submitted: 'Iraporo Yoherejwe',
                progress: 'Birimo Gukurikiranwa',
                resolved: 'Isuku Yarangiye (Byarakemutse)',
                notdone: 'Ntibyakemutse'
            },
            fr: {
                submitted: 'Signalement Reçu',
                progress: 'En Cours de Traitement',
                resolved: 'Résolu & Nettoyé',
                notdone: 'Non Résolu'
            },
            en: {
                submitted: 'Report Submitted',
                progress: 'Under Review / In Progress',
                resolved: 'Resolved & Cleaned',
                notdone: 'Not Resolved'
            }
        };
        return labels[lang][step] || step;
    }

    function getTimelineClass(status, step) {
        if (step === 'pending') {
            return 'active'; // Always active since report is submitted
        }
        if (step === 'progress') {
            if (status === 'pending' || status === 'notdone' || status === 'done') {
                return status === 'pending' ? 'current' : 'active';
            }
        }
        if (step === 'done') {
            if (status === 'done' || status === 'notdone') {
                return status === 'notdone' ? 'current' : 'active';
            }
        }
        return '';
    }

    // 8. AJAX Status Tracking Logic
    const trackSubmitBtn = document.getElementById('trackSubmitBtn');
    const trackRefInput = document.getElementById('trackRefInput');
    const trackingResult = document.getElementById('trackingResult');

    if (trackSubmitBtn && trackRefInput && trackingResult) {
        trackSubmitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const ref = trackRefInput.value.trim().toUpperCase();
            if (!ref) {
                let errorMsg = 'Please enter a reference number.';
                if (lang === 'rw') errorMsg = 'Andika nimero y\'iraporo.';
                if (lang === 'fr') errorMsg = 'Entrez un numéro de référence.';
                alert(errorMsg);
                return;
            }

            trackSubmitBtn.classList.add('btn-submit-loading');
            trackSubmitBtn.disabled = true;

            const currentPath = window.location.pathname.split('/').pop() || 'index.php';
            
            fetch(`${currentPath}?action=track&reference=${encodeURIComponent(ref)}`)
            .then(res => res.json())
            .then(res => {
                trackSubmitBtn.classList.remove('btn-submit-loading');
                trackSubmitBtn.disabled = false;

                if (res.success) {
                    const data = res.data;
                    const catText = formatCategoryLocal(data.category);
                    const urgencyText = formatUrgencyLocal(data.urgency);
                    
                    // Render status block elements
                    let detailsHeader = 'Report Details';
                    let refLabel = 'Reference:';
                    let catLabel = 'Category:';
                    let urgLabel = 'Urgency:';
                    let locLabel = 'Location:';
                    let secLabel = 'Sector:';
                    let descLabel = 'Description:';
                    let dateLabel = 'Date:';
                    let timelineHeader = 'Status Timeline';

                    if (lang === 'rw') {
                        detailsHeader = 'Amakuru y\'Iraporo';
                        refLabel = 'Nimero:';
                        catLabel = 'Ubwoko:';
                        urgLabel = 'Ubugome:';
                        locLabel = 'Aho biri:';
                        secLabel = 'Umurenge:';
                        descLabel = 'Ibisobanuro:';
                        dateLabel = 'Itariki:';
                        timelineHeader = 'Igipimo cy\'Aho Bigeze';
                    } else if (lang === 'fr') {
                        detailsHeader = 'Détails du Signalement';
                        refLabel = 'Référence:';
                        catLabel = 'Catégorie:';
                        urgLabel = 'Urgence:';
                        locLabel = 'Lieu:';
                        secLabel = 'Secteur:';
                        descLabel = 'Description:';
                        dateLabel = 'Date:';
                        timelineHeader = 'Ligne de Statut';
                    }

                    // Every value below originates from a public submission, so
                    // it is escaped before being interpolated into innerHTML.
                    trackingResult.innerHTML = `
                        <div class="tracking-result-box" style="margin-top: 20px;">
                            <div class="tracking-details-card">
                                <div class="tracking-details-title">📋 ${escapeHtml(detailsHeader)}</div>
                                <div class="tracking-row"><strong>${escapeHtml(refLabel)}</strong> <span>${escapeHtml(data.id)}</span></div>
                                <div class="tracking-row"><strong>${escapeHtml(catLabel)}</strong> <span>${escapeHtml(catText)}</span></div>
                                <div class="tracking-row"><strong>${escapeHtml(urgLabel)}</strong> <span>${escapeHtml(urgencyText)}</span></div>
                                <div class="tracking-row"><strong>${escapeHtml(locLabel)}</strong> <span>${escapeHtml(data.location)}</span></div>
                                <div class="tracking-row"><strong>${escapeHtml(secLabel)}</strong> <span>${escapeHtml(data.sector)}</span></div>
                                <div class="tracking-row"><strong>${escapeHtml(descLabel)}</strong> <span>${escapeHtml(data.details)}</span></div>
                                <div class="tracking-row"><strong>${escapeHtml(dateLabel)}</strong> <span>${escapeHtml(data.time)}</span></div>
                            </div>

                            <div class="tracking-details-title" style="margin-top: 20px; font-weight:700;">${escapeHtml(timelineHeader)}</div>
                            <div class="timeline-vertical">
                                <div class="timeline-step ${getTimelineClass(data.status, 'pending')}">
                                    <div class="timeline-dot"></div>
                                    <div class="timeline-text">${escapeHtml(getTimelineLabel('submitted'))}</div>
                                    <div class="timeline-date">${escapeHtml(data.time)}</div>
                                </div>
                                <div class="timeline-step ${getTimelineClass(data.status, 'progress')}">
                                    <div class="timeline-dot"></div>
                                    <div class="timeline-text">${escapeHtml(getTimelineLabel('progress'))}</div>
                                </div>
                                <div class="timeline-step ${getTimelineClass(data.status, 'done')}">
                                    <div class="timeline-dot"></div>
                                    <div class="timeline-text">${escapeHtml(getTimelineLabel(data.status === 'notdone' ? 'notdone' : 'resolved'))}</div>
                                </div>
                            </div>
                        </div>
                    `;
                    trackingResult.style.display = 'block';
                } else {
                    // Prefer the server's message — it distinguishes "unknown
                    // reference" from "you are being rate limited".
                    let notFoundText = res.message;
                    if (!notFoundText) {
                        notFoundText = 'Invalid reference number. Please try again.';
                        if (lang === 'rw') notFoundText = 'Iyi nimero ntituyizi. Ongera ugerageze.';
                        if (lang === 'fr') notFoundText = 'Numéro invalide. Veuillez réessayer.';
                    }

                    trackingResult.innerHTML = `
                        <div class="feed-empty" style="margin-top:20px;">
                            <div style="font-size:2rem; margin-bottom:8px;">❌</div>
                            <p style="color: var(--urgency-high); font-weight:700;">${escapeHtml(notFoundText)}</p>
                        </div>
                    `;
                    trackingResult.style.display = 'block';
                }
            })
            .catch(err => {
                trackSubmitBtn.classList.remove('btn-submit-loading');
                trackSubmitBtn.disabled = false;
                console.error(err);
                alert('Network error. Please try again.');
            });
        });
    }

    // 9. Client side search on recent reports
    const searchInput = document.getElementById('reportSearch');
    const feedItems = document.querySelectorAll('.feed-item');
    const emptyState = document.getElementById('feedEmptyState');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            let visibleCount = 0;

            feedItems.forEach(item => {
                const title = item.querySelector('.feed-title').textContent.toLowerCase();
                const desc = item.querySelector('.feed-desc').textContent.toLowerCase();
                const loc = item.querySelector('.feed-location').textContent.toLowerCase();
                
                if (title.includes(query) || desc.includes(query) || loc.includes(query)) {
                    item.style.display = 'block';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                }
            });

            if (emptyState) {
                emptyState.style.display = (visibleCount === 0) ? 'block' : 'none';
            }
        });
    }

    // 10. Smooth Scroll to sections
    const scrollLinks = document.querySelectorAll('[data-scroll]');
    scrollLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                const navHeight = 70; // Sticky navbar height
                const offsetPosition = targetEl.getBoundingClientRect().top + window.scrollY - navHeight;
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});
