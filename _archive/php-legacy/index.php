<?php
/**
 * index.php — Kinyarwanda (RW) portal page.
 *
 * The tracker API, submission handling, validation, rate limiting and stats all
 * live in lib/portal.php, shared with indexe.php (EN) and indexf.php (FR).
 * Only the user-facing strings are defined here.
 */

$CK_STRINGS = [
    'default_sector'  => 'Umujyi wa Kigali',
    'no_details'      => 'Nta bisobanuro bindi byatanzwe.',
    'unknown_ref'     => 'Iyi nimero ntituyizi.',
    'track_limited'   => 'Mwagerageje kenshi cyane. Mutegereze iminota mike hanyuma mwongere mugerageze.',
    'submit_limited'  => 'Mwohereje raporo nyinshi mu gihe gito. Mwongere mugerageze nyuma.',
    'invalid_input'   => 'Nyabuneka reba neza ibisabwa byose hanyuma wongere ugerageze.',
    'submit_error'    => 'Hari ikibazo kibaye mu kubika iraporo. Nyabuneka ongera ugerageze.',
    'session_expired' => 'Igihe cyanyu cyarangiye. Nyabuneka ongera ufungure urupapuro maze wohereze.',
];

require_once __DIR__ . '/lib/portal.php';

// Helper to format category for user view
function formatCategory($cat) {
    switch ($cat) {
        case 'full-bin': return 'Ipubure Yuzuye Cyane';
        case 'blocked-drain': return 'Umuyoboro Wazibye';
        case 'illegal-dumping': return 'Guta Imyanda Ahatemewe';
        case 'litter': return 'Imyanda Inyanyagiye';
        default: return 'Ikindi Kibazo cy\'Isuku';
    }
}
?>
<!DOCTYPE html>
<html lang="rw">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clean Kigali • Fatanya Natwe Kugira Kigali Isukuye</title>
    <!-- Custom CSS Stylesheet -->
    <link rel="stylesheet" href="public/style.css">
</head>
<body>

    <a class="skip-link" href="#main">Simbukira ku bikubiyemo</a>

    <!-- Masthead: who operates the service, plus the language selector -->
    <div class="masthead">
        <div class="container masthead-inner">
            <div>
                <span class="masthead-operator">Clean Kigali Initiative</span>
                <span class="masthead-desc">Serivisi yo gutanga raporo z'isuku mu Mujyi wa Kigali</span>
            </div>
            <div class="lang-switcher" role="group" aria-label="Hitamo ururimi">
                <a href="index.php" class="lang-btn" lang="rw" hreflang="rw" aria-current="true">Ikinyarwanda</a>
                <a href="indexe.php" class="lang-btn" lang="en" hreflang="en">English</a>
                <a href="indexf.php" class="lang-btn" lang="fr" hreflang="fr">Français</a>
            </div>
        </div>
    </div>

    <nav class="navbar" aria-label="Imiyoboro y'ingenzi">
        <div class="container nav-container">
            <a href="#home" class="logo-wrapper" data-scroll>
                <span class="logo-mark" aria-hidden="true">CK</span>
                <span class="logo-text">Clean Kigali</span>
            </a>

            <button type="button" class="menu-toggle" id="menuToggle" aria-expanded="false" aria-controls="navLinks">
                <span class="menu-toggle-bars" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
                <span class="menu-toggle-label">Menyu</span>
            </button>

            <div class="nav-links" id="navLinks">
                <div class="nav-links-head">
                    <span class="nav-links-title">Menyu</span>
                    <button type="button" class="nav-close" id="navClose" aria-label="Funga menyu">&times;</button>
                </div>
                <a href="#home" class="nav-link" aria-current="true" data-scroll>Ahabanza</a>
                <a href="#tracker-section" class="nav-link" data-scroll>Kurikirana Iraporo</a>
                <a href="#report-section" class="nav-link" data-scroll>Tanga Iraporo</a>
                <a href="login.php" class="nav-link" rel="nofollow">Imbonerahamwe</a>
            </div>
        </div>
    </nav>

    <main id="main">

    <header class="hero" id="home">
        <div class="container">
            <p class="hero-eyebrow">Igikorwa cy'Umuganda mu Mujyi wa Kigali</p>
            <h1>Fatanya Natwe Kugira Kigali Isukuye</h1>
            <p class="hero-lead">
                Fatanya n'ibihumbi by'abaturage kugira Kigali umujyi ukeye cyane muri Afurika. Ubonye ikibazo cy'imyanda, pubure yuzuye cyangwa umuyoboro wazibye? Tanga iraporo mu masegonda make cyangwa ukurikire uko ikemurwa.
            </p>
            <div class="hero-actions">
                <a href="#report-section" class="btn btn-primary" data-scroll>
                    Tanga Iraporo
                </a>
                <a href="#tracker-section" class="btn btn-secondary" data-scroll>
                    Kurikirana Iraporo
                </a>
            </div>
        </div>
    </header>

    <!-- Service statistics. Real counts from lib/portal.php. -->
    <section class="stats-section" aria-labelledby="stats-heading">
        <div class="container">
            <h2 id="stats-heading" class="visually-hidden">Imibare y'iyi serivisi</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number"><?= $totalReports ?></div>
                    <div class="stat-label">Raporo Zose</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number"><?= $pendingReports ?></div>
                    <div class="stat-label">Zirimo Gukorwa</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number"><?= $resolvedReports ?></div>
                    <div class="stat-label">Ibyakemutse</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number"><?= e($resolutionRate) ?></div>
                    <div class="stat-label">Igipimo Cy'Ibyakemutse</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Tracking Section -->
    <section class="container" id="tracker-section" style="padding-top: 40px;">
        <div class="tracker-card">
            <div class="tracker-header">
                <h3>Kurikirana Iraporo yanyu</h3>
                <p style="color: var(--dark-muted); font-size: 0.9rem;">Andika nimero y'iraporo yawe (urugero: CK-21) kugira ngo urebe uko ikibazo gikemurwa ku murongo w'ibihe.</p>
            </div>
            
            <div class="tracker-search-section">
                <div class="tracker-input-group">
                    <input type="text" id="trackRefInput" placeholder="Urugero: CK-21" style="width: 100%; padding: 12px; border: 1px solid var(--light-border); border-radius: var(--radius-sm); font-size: 1rem; outline: none; min-height: 48px; text-transform: uppercase;">
                    <button type="button" class="btn btn-primary" id="trackSubmitBtn" style="width:100%;">
                        Kurikirana
                    </button>
                </div>
            </div>
            
            <!-- Result Output Box -->
            <div id="trackingResult" style="display: none;"></div>
        </div>
    </section>

    <!-- Main Grid Section -->
    <section class="container" id="report-section" style="padding-top: 40px;">
        <div class="section-header">
            <h2>Tanga Iraporo y'Isuku n'Ibidukikije</h2>
            <p>Hitamo ubwoko bw'ikibazo, andika aho giherereye, maze ubwohereze. Raporo ihita ishyikirizwa abashinzwe ibidukikije mu karere.</p>
        </div>

        <div class="main-grid">
            
            <!-- Reporting Form Container -->
            <div class="form-card">
                <?php if (!empty($success)): ?>
                    <div class="success-card">
                        <div class="checkmark-circle">
                            <svg class="checkmark-svg" viewBox="0 0 52 52">
                                <path class="checkmark-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                            </svg>
                        </div>
                        <h3 style="color: var(--primary-hover); margin-bottom: 8px;">Iraporo Yoherejwe!</h3>
                        <p style="color: var(--dark-muted); font-size: 0.9rem; margin-bottom: 20px;">
                            Murakoze kudufasha gukomeza gukesha Kigali. Iraporo yanyu yanditswe muri sisitemu.
                        </p>
                        <div class="ref-box">
                            <div class="ref-label">Nimero y'Iraporo (Reference)</div>
                            <div class="ref-code" id="refCode"><?= e($success) ?></div>
                        </div>
                        <div class="success-actions">
                            <button class="btn btn-primary" onclick="copyRefCode('<?= e($success) ?>')">
                                Kora Kopi ya Nimero
                            </button>
                            <button class="btn btn-secondary" onclick="trackReportDirect('<?= e($success) ?>')">
                                Kurikirana iyi Iraporo
                            </button>
                        </div>
                    </div>
                <?php else: ?>
                    <h3>Tanga Iraporo y'Isuku</h3>

                    <?php if (!empty($error)): ?>
                        <div class="form-error" role="alert"><?= e($error) ?></div>
                    <?php endif; ?>

                    <form method="POST" id="reportForm">
                        <?= ck_csrf_field() ?>

                        <!-- Interactive Category Selection (stacked) -->
                        <div class="form-group">
                            <label>Hitamo ubwoko bw'ikibazo cy'isuku *</label>
                            <div class="category-selector">
                                <div class="cat-option">
                                    <input type="radio" name="category" value="full-bin" id="cat-bin" required>
                                    <span class="cat-icon">🗑️</span>
                                    <span class="cat-label">Ipubure Yuzuye Cyane</span>
                                </div>
                                <div class="cat-option">
                                    <input type="radio" name="category" value="blocked-drain" id="cat-drain">
                                    <span class="cat-icon">🌊</span>
                                    <span class="cat-label">Umuyoboro Wazibye</span>
                                </div>
                                <div class="cat-option">
                                    <input type="radio" name="category" value="illegal-dumping" id="cat-dump">
                                    <span class="cat-icon">🚯</span>
                                    <span class="cat-label">Imyanda Ahatemewe</span>
                                </div>
                                <div class="cat-option">
                                    <input type="radio" name="category" value="litter" id="cat-litter">
                                    <span class="cat-icon">🍂</span>
                                    <span class="cat-label">Imyanda Inyanyagiye</span>
                                </div>
                            </div>
                        </div>

                        <!-- Urgency Selector -->
                        <div class="form-group">
                            <label>Uburyo Kibangamye / Cyihutirwa *</label>
                            <div class="urgency-selector">
                                <div class="urg-option" data-level="low">
                                    <input type="radio" name="urgency" value="low" id="urg-low" required>
                                    Hasi
                                </div>
                                <div class="urg-option" data-level="medium">
                                    <input type="radio" name="urgency" value="medium" id="urg-med">
                                    Kuringaniza
                                </div>
                                <div class="urg-option" data-level="high">
                                    <input type="radio" name="urgency" value="high" id="urg-high">
                                    Byihutirwa Cyane
                                </div>
                            </div>
                        </div>

                        <!-- Location details (Single columns) -->
                        <div class="form-group">
                            <label for="location">Aho Biherereye Neza *</label>
                            <input type="text" id="location" name="location" maxlength="100" placeholder="Urugero: Kwinjira kwa CHUK, Parikingi ya Nyabugogo" required>
                        </div>

                        <div class="form-group">
                            <label for="sector">Akarere → Umurenge (Si ngombwa)</label>
                            <input type="text" id="sector" name="sector" maxlength="50" placeholder="Urugero: Gasabo → Remera">
                        </div>

                        <div class="form-group">
                            <label for="details">Ibindi Bisobanuro (Si ngombwa)</label>
                            <textarea id="details" name="details" maxlength="2000" placeholder="Sobanura neza uko ikibazo giteye kugira ngo twihute kugikemura..."></textarea>
                        </div>

                        <div class="form-group">
                            <label for="name">Izina ryawe (Si ngombwa)</label>
                            <input type="text" id="name" name="name" maxlength="50" placeholder="Urugero: Keza Marie">
                        </div>

                        <div class="form-group" style="margin-bottom: 24px;">
                            <label for="contact">Terefone cyangwa Imeri (Si ngombwa)</label>
                            <input type="text" id="contact" name="contact" maxlength="50" placeholder="Urugero: 078XXXXXXX cyangwa marie@gmail.com">
                        </div>

                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            Ohereza Iraporo
                        </button>
                    </form>
                <?php endif; ?>
            </div>

            <!-- Public Live Tracker Feed -->
            <div class="tracker-card">
                <div class="tracker-header">
                    <h3>Raporo Ziherutse Gutangwa</h3>
                    <div class="search-box">
                        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        <input type="text" id="reportSearch" placeholder="Shakira ku Murenge cyangwa aho byabereye...">
                    </div>
                </div>

                <div class="reports-feed">
                    <?php if (empty($recentReports)): ?>
                        <div class="feed-empty" id="feedEmptyState">
                            <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/></svg>
                            <p>Nta raporo y'isuku iratangwa. Ba uwa mbere ufasha umujyi wacu!</p>
                        </div>
                    <?php else: ?>
                        <?php foreach ($recentReports as $report): ?>
                            <div class="feed-item">
                                <div class="feed-item-top">
                                    <span class="feed-title">
                                        <?= getCategoryEmoji($report['category']) ?> <?= formatCategory($report['category']) ?>
                                    </span>
                                    <span class="badge badge-<?= e($report['urgency']) ?>">
                                        <?php
                                        $u = $report['urgency'];
                                        echo ($u === 'low') ? 'Hasi' : (($u === 'medium') ? 'Kuringaniza' : 'Byihutirwa');
                                        ?>
                                    </span>
                                </div>
                                <p class="feed-desc">
                                    <?= e($report['location']) ?>
                                </p>
                                <div class="feed-meta">
                                    <span class="feed-location">
                                        📍 <?= e($report['sector'] ?: 'Umujyi wa Kigali') ?>
                                    </span>
                                    <span class="feed-status">
                                        <?php 
                                        $statusVal = strtolower($report['status'] ?? 'pending');
                                        if (empty($statusVal)) $statusVal = 'pending';
                                        ?>
                                        <span class="status-dot <?= $statusVal ?>"></span>
                                        <?= $statusVal === 'done' ? 'Byarakemutse' : ($statusVal === 'notdone' ? 'Ntibyakemutse' : 'Birimo Gukorwa') ?>
                                    </span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                        
                        <div class="feed-empty" id="feedEmptyState" style="display: none;">
                            <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/></svg>
                            <p>Nta raporo yabonetse ihuye n'ibyo ushatse.</p>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

        </div>
    </section>

    </main>

    <footer class="site-footer">
        <div class="container footer-grid">
            <div class="footer-logo">
                <h3>Clean Kigali</h3>
                <p class="footer-operator">Iyi serivisi ikorwa na Clean Kigali Initiative.</p>
                <p>Uburyo bwo gutanga raporo z'isuku no kubungabunga ibidukikije mu Mujyi wa Kigali.</p>
            </div>
            <div class="footer-links">
                <h4>Imiyoboro</h4>
                <ul>
                    <li><a href="#home" data-scroll>Ahabanza</a></li>
                    <li><a href="#tracker-section" data-scroll>Kurikirana Iraporo</a></li>
                    <li><a href="#report-section" data-scroll>Tanga Iraporo</a></li>
                </ul>
            </div>
            <div class="footer-links">
                <h4>Abafatanyabikorwa</h4>
                <ul>
                    <li><a href="https://kigalicity.gov.rw" target="_blank" rel="noopener">Umujyi wa Kigali</a></li>
                    <li><a href="https://rema.gov.rw" target="_blank" rel="noopener">REMA Rwanda</a></li>
                    <li><a href="login.php" rel="nofollow">Imbonerahamwe y'Ubugenzuzi</a></li>
                </ul>
            </div>
        </div>
        <div class="container footer-bottom">
            <p>&copy; <?= date('Y') ?> Clean Kigali Initiative</p>
            <p class="footer-note">Amakuru yose atangwa mu raporo akoreshwa gusa mu gukemura ibibazo by'isuku.</p>
        </div>
    </footer>

    <!-- Custom JS Script -->
    <script src="app.js"></script>
</body>
</html>
