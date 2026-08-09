<?php
require_once __DIR__ . '/lib/auth.php';

$is_ajax = isset($_POST['update_status_ajax']) || isset($_POST['delete_report_ajax']);

// Nothing below this line is reachable without a valid admin session.
ck_require_admin($is_ajax);
ck_send_security_headers();

// 1. Handle Status Update (AJAX)
if (isset($_POST['update_status_ajax'])) {
    header('Content-Type: application/json');
    ck_csrf_require(true);

    $id = intval($_POST['id'] ?? 0);
    $status = ck_enum($_POST['status'] ?? null, VALID_STATUSES);

    if ($id <= 0 || $status === null) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid request."]);
        exit;
    }

    $stmt = $conn->prepare("UPDATE reports SET status=? WHERE id=?");
    $stmt->bind_param("si", $status, $id);
    if ($stmt->execute()) {
        ck_audit($conn, ck_current_admin(), 'status_change', $id, "Set to {$status}");
        echo json_encode(["success" => true]);
    } else {
        ck_log("Status update failed for report {$id}: " . $stmt->error);
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Could not update the report. Please try again."]);
    }
    $stmt->close();
    exit;
}

// 2. Handle Delete Report (AJAX)
if (isset($_POST['delete_report_ajax'])) {
    header('Content-Type: application/json');
    ck_csrf_require(true);

    $id = intval($_POST['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid request."]);
        exit;
    }

    $stmt = $conn->prepare("DELETE FROM reports WHERE id=?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
        ck_audit($conn, ck_current_admin(), 'report_deleted', $id);
        echo json_encode(["success" => true]);
    } else {
        ck_log("Delete failed for report {$id}: " . $stmt->error);
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Could not delete the report. Please try again."]);
    }
    $stmt->close();
    exit;
}

// 3. Fetch Statistics
$totalCount = 0;
$pendingCount = 0;
$doneCount = 0;
$highCount = 0;

$countQuery = $conn->query("SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'pending' OR status = '' OR status IS NULL OR status = 'notdone' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
    SUM(CASE WHEN urgency = 'high' THEN 1 ELSE 0 END) as high
    FROM reports");

if ($countQuery) {
    $counts = $countQuery->fetch_assoc();
    $totalCount = intval($counts['total']);
    $pendingCount = intval($counts['pending']);
    $doneCount = intval($counts['done']);
    $highCount = intval($counts['high']);
}

// 4. Fetch Hotspots / Top reported locations
$topLocationsResult = $conn->query("
    SELECT location, COUNT(*) as count 
    FROM reports 
    GROUP BY location 
    ORDER BY count DESC 
    LIMIT 3
");

$topLocations = [];
if ($topLocationsResult) {
    while ($row = $topLocationsResult->fetch_assoc()) {
        $topLocations[] = $row;
    }
}

// 5. Fetch Reports sorted by urgency (high first) and time
$reportsResult = $conn->query("SELECT * FROM reports ORDER BY 
    CASE urgency 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
        ELSE 4 
    END, time DESC");

// Helper to format category for view
function formatCategory($cat) {
    switch ($cat) {
        case 'full-bin': return '🗑️ Overflowing Bin';
        case 'blocked-drain': return '🌊 Blocked Drain';
        case 'illegal-dumping': return '🚯 Illegal Dumping';
        case 'litter': return '🍂 General Litter';
        default: return '📍 Other Issue';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <!-- Token read by admin.js and sent with every state-changing request -->
    <meta name="csrf-token" content="<?= ck_csrf_token() ?>">
    <title>Admin Dashboard • Clean Kigali</title>
    <!-- CSS stylesheet for dashboard -->
    <link rel="stylesheet" href="admin.css">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet">
</head>
<body class="admin-body">

    <div class="dashboard-container">
        
        <!-- Header -->
        <header class="dashboard-header">
            <div class="dashboard-title">
                <h1>Admin Control Center</h1>
                <p>Signed in as <strong><?= e(ck_current_admin()) ?></strong> — monitor reports, update progress timelines, and manage issues.</p>
            </div>
            <div class="header-actions">
                <a href="index.php" class="back-btn">
                    ← Back to Portal
                </a>
                <!-- POST + CSRF so an external page cannot force a sign-out -->
                <form method="POST" action="logout.php" class="logout-form">
                    <?= ck_csrf_field() ?>
                    <button type="submit" class="back-btn logout-btn">Sign Out</button>
                </form>
            </div>
        </header>

        <!-- KPI Statistic Blocks (Horizontally Scrollable on Mobile) -->
        <section class="dashboard-stats">
            <div class="admin-stat-card">
                <div class="admin-stat-icon total">📊</div>
                <div class="admin-stat-info">
                    <h3>Total Reports</h3>
                    <div class="admin-stat-number" id="stat-total"><?= $totalCount ?></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="admin-stat-icon pending">⏳</div>
                <div class="admin-stat-info">
                    <h3>In Progress</h3>
                    <div class="admin-stat-number" id="stat-pending"><?= $pendingCount ?></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="admin-stat-icon resolved">✅</div>
                <div class="admin-stat-info">
                    <h3>Resolved</h3>
                    <div class="admin-stat-number" id="stat-resolved"><?= $doneCount ?></div>
                </div>
            </div>
            <div class="admin-stat-card">
                <div class="admin-stat-icon high">🚨</div>
                <div class="admin-stat-info">
                    <h3>Critical</h3>
                    <div class="admin-stat-number" id="stat-high"><?= $highCount ?></div>
                </div>
            </div>
        </section>

        <!-- Hotspot Locations Banner -->
        <?php if (!empty($topLocations)): ?>
            <section class="hotspot-banner">
                <div class="hotspot-info">
                    <h2>Hotspots / Areas of Focus</h2>
                    <p>Subdivisions receiving frequent reports. Prioritize cleanup bins here.</p>
                </div>
                <div class="hotspot-tags">
                    <?php foreach ($topLocations as $loc): ?>
                        <div class="hotspot-tag">
                            📍 <?= e($loc['location']) ?> 
                            <span class="badge-num"><?= $loc['count'] ?> reports</span>
                        </div>
                    <?php endforeach; ?>
                </div>
            </section>
        <?php endif; ?>

        <!-- Search and Filters Bar (Mobile First) -->
        <section class="filter-controls">
            <!-- Search field (Always full-width on mobile) -->
            <div class="admin-search-box">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input type="text" id="adminSearch" placeholder="Search reference, sectors, category...">
            </div>

            <!-- Trigger Button for Bottom Sheet on Mobile -->
            <button class="filter-btn-trigger" id="filterBtnTrigger">
                ⚙️ Filter Options
                <span class="filter-count-badge" id="filterCountBadge" style="display: none;">0</span>
            </button>

            <!-- Inline Filters (Only displayed on tablet/desktop view) -->
            <div class="filter-group-inline">
                <span style="font-weight:700; font-size:0.85rem; color:var(--dark-muted);">Quick Filters:</span>
                <button class="filter-pill" data-filter-type="status" data-filter-value="pending">In Progress</button>
                <button class="filter-pill" data-filter-type="status" data-filter-value="done">Resolved</button>
                <button class="filter-pill" data-filter-type="status" data-filter-value="notdone">Not Resolved</button>
                <button class="filter-pill" data-filter-type="urgency" data-filter-value="high">High</button>
                <button class="filter-pill" data-filter-type="urgency" data-filter-value="medium">Medium</button>
                <button class="filter-pill" data-filter-type="urgency" data-filter-value="low">Low</button>
            </div>
        </section>

        <!-- Reports Grid (Mobile first stacked list) -->
        <section class="reports-grid">
            <?php if (!$reportsResult || $reportsResult->num_rows === 0): ?>
                <div class="no-results" id="noResultsState">
                    <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/></svg>
                    <h3>No environmental reports found</h3>
                    <p>Submitted reports will populate here.</p>
                </div>
            <?php else: ?>
                <?php while ($report = $reportsResult->fetch_assoc()): 
                    $statusClass = strtolower($report['status'] ?? 'pending');
                    if (empty($statusClass)) $statusClass = 'pending';
                    $urgencyClass = strtolower($report['urgency']);
                    $refNumber = "CK-" . $report['id'];
                ?>
                    <div class="admin-report-card <?= e($urgencyClass) ?>"
                         id="report-<?= (int) $report['id'] ?>"
                         data-id="<?= e($refNumber) ?>"
                         data-category="<?= e($report['category']) ?>"
                         data-location="<?= e($report['location']) ?>"
                         data-sector="<?= e($report['sector']) ?>"
                         data-name="<?= e($report['name'] ?? 'Anonymous') ?>"
                         data-details="<?= e($report['details']) ?>"
                         data-status="<?= e($statusClass) ?>"
                         data-urgency="<?= e($urgencyClass) ?>">
                        
                        <div class="card-header">
                            <div class="card-title-group">
                                <h3><?= formatCategory($report['category']) ?></h3>
                                <span class="card-time">📅 <?= e($report['time']) ?></span>
                            </div>
                            <span class="card-badge-urgency <?= e($urgencyClass) ?>"><?= e($urgencyClass) ?></span>
                        </div>

                        <div class="card-body">
                            <div class="card-info-row">
                                <strong>Reference:</strong>
                                <span style="font-weight: 700; color: var(--dark);"><?= $refNumber ?></span>
                            </div>
                            <div class="card-info-row">
                                <strong>Location:</strong>
                                <span><?= e($report['location']) ?></span>
                            </div>
                            <div class="card-info-row">
                                <strong>Sector:</strong>
                                <span><?= e($report['sector'] ?: 'Unspecified') ?></span>
                            </div>
                            
                            <!-- Collapsible Drawer -->
                            <div class="card-details-drawer" id="details-<?= $report['id'] ?>">
                                <p><strong>Reporter Name:</strong> <?= e($report['name'] ?: 'Anonymous') ?></p>
                                <p><strong>Contact Details:</strong> <?= e($report['contact'] ?: 'None') ?></p>
                                <p><strong>Reporter IP:</strong> <code><?= e($report['ip']) ?></code></p>
                                <p style="margin-top:8px;"><strong>Full Description:</strong></p>
                                <p style="color:var(--dark); line-height:1.4;"><?= e($report['details'] ?: 'No additional description.') ?></p>
                            </div>
                        </div>

                        <!-- Card Action Panel (Touch optimized) -->
                        <div class="card-actions">
                            <button class="details-toggle-btn" onclick="toggleDetails(<?= $report['id'] ?>)">
                                See More Details ▾
                            </button>
                            
                            <div class="status-btn-group">
                                <button class="status-pill-btn <?= $statusClass === 'pending' ? 'active' : '' ?>" 
                                        data-status="pending" 
                                        onclick="updateStatus(event, <?= $report['id'] ?>, 'pending')">
                                    In Progress
                                </button>
                                <button class="status-pill-btn <?= $statusClass === 'notdone' ? 'active' : '' ?>" 
                                        data-status="notdone" 
                                        onclick="updateStatus(event, <?= $report['id'] ?>, 'notdone')">
                                    Not Resolved
                                </button>
                                <button class="status-pill-btn <?= $statusClass === 'done' ? 'active' : '' ?>" 
                                        data-status="done" 
                                        onclick="updateStatus(event, <?= $report['id'] ?>, 'done')">
                                    Resolved
                                </button>
                            </div>

                            <button class="delete-action-btn" onclick="deleteReport(event, <?= $report['id'] ?>)">
                                🗑️ Delete Report
                            </button>
                        </div>
                    </div>
                <?php endwhile; ?>
                
                <!-- Dynamic Empty State -->
                <div class="no-results" id="noResultsState" style="display: none;">
                    <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/></svg>
                    <h3>No matching reports found</h3>
                    <p>Try clearing your filters or search query.</p>
                </div>
            <?php endif; ?>
        </section>

    </div>

    <!-- Slide-Up Bottom Sheet Filter Drawer (Mobile Only) -->
    <div class="bottom-sheet-overlay" id="filterSheetOverlay"></div>
    <div class="bottom-sheet" id="filterSheet">
        <div class="bottom-sheet-header">
            <h3>Filter Queue</h3>
            <button class="bottom-sheet-close" id="filterSheetClose">&times;</button>
        </div>
        
        <!-- Status Filter Group -->
        <div class="filter-sheet-section">
            <h4>Status</h4>
            <div class="filter-pills">
                <button class="filter-pill" data-filter-type="status" data-filter-value="pending">In Progress</button>
                <button class="filter-pill" data-filter-type="status" data-filter-value="done">Resolved</button>
                <button class="filter-pill" data-filter-type="status" data-filter-value="notdone">Not Resolved</button>
            </div>
        </div>
        
        <!-- Urgency Filter Group -->
        <div class="filter-sheet-section">
            <h4>Urgency</h4>
            <div class="filter-pills">
                <button class="filter-pill" data-filter-type="urgency" data-filter-value="high">High Urgency</button>
                <button class="filter-pill" data-filter-type="urgency" data-filter-value="medium">Medium Urgency</button>
                <button class="filter-pill" data-filter-type="urgency" data-filter-value="low">Low Urgency</button>
            </div>
        </div>

        <!-- Category Filter Group -->
        <div class="filter-sheet-section">
            <h4>Category</h4>
            <div class="filter-pills">
                <button class="filter-pill" data-filter-type="category" data-filter-value="full-bin">Overflowing Bin</button>
                <button class="filter-pill" data-filter-type="category" data-filter-value="blocked-drain">Blocked Drain</button>
                <button class="filter-pill" data-filter-type="category" data-filter-value="illegal-dumping">Illegal Dumping</button>
                <button class="filter-pill" data-filter-type="category" data-filter-value="litter">General Litter</button>
            </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="filter-sheet-actions">
            <button class="btn btn-secondary" id="clearFiltersBtn">Clear All</button>
            <button class="btn btn-primary" id="applyFiltersBtn">Apply Filters</button>
        </div>
    </div>

    <!-- Script controllers -->
    <script src="admin.js"></script>
</body>
</html>
