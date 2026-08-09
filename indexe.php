<?php
/**
 * indexe.php — English (EN) portal page.
 *
 * The tracker API, submission handling, validation, rate limiting and stats all
 * live in lib/portal.php, shared with index.php (RW) and indexf.php (FR).
 * Only the user-facing strings are defined here.
 */

$CK_STRINGS = [
    'default_sector'  => 'Kigali City',
    'no_details'      => 'No additional details provided.',
    'unknown_ref'     => 'Invalid reference number.',
    'track_limited'   => 'Too many lookups from this network. Please wait a few minutes and try again.',
    'submit_limited'  => 'You have submitted several reports recently. Please try again later.',
    'invalid_input'   => 'Please check the required fields and try again.',
    'submit_error'    => 'Something went wrong while saving your report. Please try again.',
    'session_expired' => 'Your session expired. Please reload the page and submit again.',
];

require_once __DIR__ . '/lib/portal.php';

// Helper to format category for user view
function formatCategory($cat) {
    switch ($cat) {
        case 'full-bin': return 'Full Trash Bin';
        case 'blocked-drain': return 'Blocked Drainage';
        case 'illegal-dumping': return 'Illegal Dumping';
        case 'litter': return 'General Littering';
        default: return 'Other Environmental Issue';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clean Kigali • Together, We Keep Kigali Clean</title>
    <!-- Custom CSS Stylesheet -->
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <!-- Sticky Navbar -->
    <nav class="navbar">
        <div class="container nav-container">
            <a href="#home" class="logo-wrapper" data-scroll>
                <div class="logo-icon">CK</div>
                <div class="logo-text">Clean Kigali</div>
            </a>
            
            <!-- Hamburger Toggle Button -->
            <button class="menu-toggle" id="menuToggle" aria-label="Toggle navigation">
                <span></span>
                <span></span>
                <span></span>
            </button>
            
            <!-- Menu overlay -->
            <div class="nav-links" id="navLinks">
                <a href="#home" class="nav-link active" data-scroll>Home</a>
                <a href="#tracker-section" class="nav-link" data-scroll>Track My Report</a>
                <a href="#report-section" class="nav-link" data-scroll>Report an Issue</a>
                <a href="login.php" class="nav-link" rel="nofollow">Admin Dashboard</a>
                
                <!-- Language selection switcher -->
                <div class="lang-switcher">
                    <a href="indexe.php" class="lang-btn active">EN</a>
                    <a href="index.php" class="lang-btn">RW</a>
                    <a href="indexf.php" class="lang-btn">FR</a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <header class="hero" id="home">
        <div class="container hero-grid">
            <div class="hero-content">
                <div class="hero-badge">
                    <span class="pulse"></span> Citywide Cleanup Initiative
                </div>
                <h1>Together, We Keep <br><span class="gradient">Kigali Clean</span></h1>
                <p class="hero-text">
                    Join thousands of citizens in making Kigali the cleanest city. Found overflowing waste bins, blocked sewers, or illegal dumping? Report it instantly or track cleanup progress.
                </p>
                <div class="hero-actions">
                    <a href="#report-section" class="btn btn-primary" data-scroll>
                        Report an Issue
                    </a>
                    <a href="#tracker-section" class="btn btn-secondary" data-scroll>
                        Track My Report
                    </a>
                </div>
            </div>
            
            <!-- Hero Graphic Floating Cards (Hidden on Mobile) -->
            <div class="hero-graphic">
                <div class="hero-circle"></div>
                <div class="hero-card-float">
                    <div class="float-stat">
                        <div class="float-stat-icon">🌱</div>
                        <div class="float-stat-info">
                            <h4>Eco-Score: 98%</h4>
                            <p>Kigali Environmental Index</p>
                        </div>
                    </div>
                    <div class="float-stat" style="margin-bottom: 0;">
                        <div class="float-stat-icon">🤝</div>
                        <div class="float-stat-info">
                            <h4>Umuganda Digitalized</h4>
                            <p>Collaborative city reporting</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Stats Banner -->
    <section class="stats-section">
        <div class="container stats-grid">
            <div class="stat-card">
                <div class="stat-number"><?= $totalReports ?></div>
                <div class="stat-label">Total Reports</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="color: var(--urgency-medium);"><?= $pendingReports ?></div>
                <div class="stat-label">In Progress</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="color: var(--primary);"><?= $resolvedReports ?></div>
                <div class="stat-label">Resolved</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="color: var(--secondary);"><?= e($resolutionRate) ?></div>
                <div class="stat-label">Resolved Rate</div>
            </div>
        </div>
    </section>

    <!-- Tracking Section -->
    <section class="container" id="tracker-section" style="padding-top: 40px;">
        <div class="tracker-card">
            <div class="tracker-header">
                <h3>Track My Report</h3>
                <p style="color: var(--dark-muted); font-size: 0.9rem;">Enter the reference number of your report to check its resolution progress timeline.</p>
            </div>
            
            <div class="tracker-search-section">
                <div class="tracker-input-group">
                    <input type="text" id="trackRefInput" placeholder="e.g. CK-21" style="width: 100%; padding: 12px; border: 1px solid var(--light-border); border-radius: var(--radius-sm); font-size: 1rem; outline: none; min-height: 48px; text-transform: uppercase;">
                    <button type="button" class="btn btn-primary" id="trackSubmitBtn" style="width:100%;">
                        Track Report
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
            <h2>Report Environmental Issue</h2>
            <p>Select your category, specify location details, and submit. Report will be assigned to area officers.</p>
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
                        <h3 style="color: var(--primary-hover); margin-bottom: 8px;">Report Submitted!</h3>
                        <p style="color: var(--dark-muted); font-size: 0.9rem; margin-bottom: 20px;">
                            Thank you for helping keep Kigali clean. Your report has been logged.
                        </p>
                        <div class="ref-box">
                            <div class="ref-label">Reference Number</div>
                            <div class="ref-code" id="refCode"><?= e($success) ?></div>
                        </div>
                        <div class="success-actions">
                            <button class="btn btn-primary" onclick="copyRefCode('<?= e($success) ?>')">
                                Copy Reference Number
                            </button>
                            <button class="btn btn-secondary" onclick="trackReportDirect('<?= e($success) ?>')">
                                Track This Report
                            </button>
                        </div>
                    </div>
                <?php else: ?>
                    <h3>Submit a Cleanup Report</h3>

                    <?php if (!empty($error)): ?>
                        <div class="form-error" role="alert"><?= e($error) ?></div>
                    <?php endif; ?>

                    <form method="POST" id="reportForm">
                        <?= ck_csrf_field() ?>
                        
                        <!-- Interactive Category Selection (stacked) -->
                        <div class="form-group">
                            <label>What issue are you reporting? *</label>
                            <div class="category-selector">
                                <div class="cat-option">
                                    <input type="radio" name="category" value="full-bin" id="cat-bin" required>
                                    <span class="cat-icon">🗑️</span>
                                    <span class="cat-label">Overflowing Bin</span>
                                </div>
                                <div class="cat-option">
                                    <input type="radio" name="category" value="blocked-drain" id="cat-drain">
                                    <span class="cat-icon">🌊</span>
                                    <span class="cat-label">Blocked Drain</span>
                                </div>
                                <div class="cat-option">
                                    <input type="radio" name="category" value="illegal-dumping" id="cat-dump">
                                    <span class="cat-icon">🚯</span>
                                    <span class="cat-label">Illegal Dumping</span>
                                </div>
                                <div class="cat-option">
                                    <input type="radio" name="category" value="litter" id="cat-litter">
                                    <span class="cat-icon">🍂</span>
                                    <span class="cat-label">General Litter</span>
                                </div>
                            </div>
                        </div>

                        <!-- Urgency Selector -->
                        <div class="form-group">
                            <label>Urgency Level *</label>
                            <div class="urgency-selector">
                                <div class="urg-option" data-level="low">
                                    <input type="radio" name="urgency" value="low" id="urg-low" required>
                                    Low
                                </div>
                                <div class="urg-option" data-level="medium">
                                    <input type="radio" name="urgency" value="medium" id="urg-med">
                                    Medium
                                </div>
                                <div class="urg-option" data-level="high">
                                    <input type="radio" name="urgency" value="high" id="urg-high">
                                    High / Urgent
                                </div>
                            </div>
                        </div>

                        <!-- Location details (Single columns) -->
                        <div class="form-group">
                            <label for="location">Exact Location / Landmark *</label>
                            <input type="text" id="location" name="location" maxlength="100" placeholder="e.g. Near CHUK entrance, Nyabugogo Taxi Park" required>
                        </div>

                        <div class="form-group">
                            <label for="sector">District → Sector (optional)</label>
                            <input type="text" id="sector" name="sector" maxlength="50" placeholder="e.g. Gasabo → Remera">
                        </div>

                        <div class="form-group">
                            <label for="details">Additional Details (optional)</label>
                            <textarea id="details" name="details" maxlength="2000" placeholder="Describe the size, context, or specific location of the waste..."></textarea>
                        </div>

                        <div class="form-group">
                            <label for="name">Your Name (optional)</label>
                            <input type="text" id="name" name="name" maxlength="50" placeholder="John Doe">
                        </div>

                        <div class="form-group" style="margin-bottom: 24px;">
                            <label for="contact">Phone or Email (optional)</label>
                            <input type="text" id="contact" name="contact" maxlength="50" placeholder="e.g. 078XXXXXXX or john@gmail.com">
                        </div>

                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            Submit Report
                        </button>
                    </form>
                <?php endif; ?>
            </div>

            <!-- Public Live Tracker Feed -->
            <div class="tracker-card">
                <div class="tracker-header">
                    <h3>Recent Public Issues</h3>
                    <div class="search-box">
                        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        <input type="text" id="reportSearch" placeholder="Search sectors or landmarks...">
                    </div>
                </div>

                <div class="reports-feed">
                    <?php if (empty($recentReports)): ?>
                        <div class="feed-empty" id="feedEmptyState">
                            <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/></svg>
                            <p>No environmental reports filed yet. Be the first to help cleanup!</p>
                        </div>
                    <?php else: ?>
                        <?php foreach ($recentReports as $report): ?>
                            <div class="feed-item">
                                <div class="feed-item-top">
                                    <span class="feed-title">
                                        <?= getCategoryEmoji($report['category']) ?> <?= formatCategory($report['category']) ?>
                                    </span>
                                    <span class="badge badge-<?= e($report['urgency']) ?>">
                                        <?= e($report['urgency']) ?>
                                    </span>
                                </div>
                                <p class="feed-desc">
                                    <?= e($report['location']) ?>
                                </p>
                                <div class="feed-meta">
                                    <span class="feed-location">
                                        📍 <?= e($report['sector'] ?: 'Kigali City') ?>
                                    </span>
                                    <span class="feed-status">
                                        <?php 
                                        $statusVal = strtolower($report['status'] ?? 'pending');
                                        if (empty($statusVal)) $statusVal = 'pending';
                                        ?>
                                        <span class="status-dot <?= $statusVal ?>"></span>
                                        <?= $statusVal === 'done' ? 'Resolved' : ($statusVal === 'notdone' ? 'Not Resolved' : 'In Progress') ?>
                                    </span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                        
                        <div class="feed-empty" id="feedEmptyState" style="display: none;">
                            <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/></svg>
                            <p>No matching reports found.</p>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

        </div>
    </section>

    <!-- Footer -->
    <footer class="site-footer">
        <div class="container footer-grid">
            <div class="footer-logo">
                <h3>Clean Kigali</h3>
                <p>Digitalizing city maintenance and waste control. Kigali is our home, let's keep it healthy and beautiful together.</p>
            </div>
            <div class="footer-links">
                <h4>Resources</h4>
                <ul>
                    <li><a href="#home" data-scroll>Home</a></li>
                    <li><a href="#tracker-section" data-scroll>Track My Report</a></li>
                    <li><a href="#report-section" data-scroll>Report an Issue</a></li>
                </ul>
            </div>
            <div class="footer-links">
                <h4>Partners</h4>
                <ul>
                    <li><a href="https://kigalicity.gov.rw" target="_blank" rel="noopener">City of Kigali</a></li>
                    <li><a href="https://rema.gov.rw" target="_blank" rel="noopener">REMA Rwanda</a></li>
                    <li><a href="login.php" rel="nofollow">Admin Login Portal</a></li>
                </ul>
            </div>
        </div>
        <div class="container footer-bottom">
            <p>&copy; <?= date('Y') ?> Clean Kigali Initiative. Built for Kigali with Love.</p>
        </div>
    </footer>

    <!-- Custom JS Script -->
    <script src="app.js"></script>
</body>
</html>
