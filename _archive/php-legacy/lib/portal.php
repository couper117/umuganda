<?php
/**
 * lib/portal.php — shared back-end logic for the public portal pages
 * (index.php / indexe.php / indexf.php).
 *
 * The three language pages previously carried three copies of this code, which
 * meant every security fix had to be made three times and the copies drifted.
 * They now set $CK_STRINGS with their user-facing messages and include this
 * file, so the validation, rate limiting and CSRF handling exist exactly once.
 *
 * Provides to the including page:
 *   $success           reference code (e.g. "CK-21") after a successful submit
 *   $error             user-facing error message, or ''
 *   $totalReports, $pendingReports, $resolvedReports, $resolutionRate
 *   $recentReports     recent reports for the public feed
 *   getCategoryEmoji() icon helper
 */

// This file processes submissions, so it must never be reachable on its own.
// .htaccess already denies lib/, but that only applies where AllowOverride is
// on — this guard holds regardless of server configuration.
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/../db_connection.php';

ck_session_start();
ck_send_security_headers();

// Message defaults, overridden by whatever the language page supplies.
$CK_STRINGS = array_merge([
    'default_sector'  => 'Kigali City',
    'no_details'      => 'No additional details provided.',
    'unknown_ref'     => 'Invalid reference number.',
    'track_limited'   => 'Too many lookups. Please wait a few minutes and try again.',
    'submit_limited'  => 'You have submitted several reports recently. Please try again later.',
    'invalid_input'   => 'Please check the highlighted fields and try again.',
    'submit_error'    => 'Something went wrong while saving your report. Please try again.',
    'session_expired' => 'Your session expired. Please reload the page and submit again.',
], isset($CK_STRINGS) && is_array($CK_STRINGS) ? $CK_STRINGS : []);

$client_ip = ck_client_ip();

/* -------------------------------------------------------------------------
 * 1. Tracker API (AJAX)
 *
 * References are sequential, so this endpoint is the obvious target for a
 * CK-1, CK-2, CK-3… scrape. The rate limit is what makes that impractical,
 * and the response deliberately omits reporter name, contact and IP.
 * ---------------------------------------------------------------------- */
if (isset($_GET['action']) && $_GET['action'] === 'track' && isset($_GET['reference'])) {
    header('Content-Type: application/json');

    if (!ck_rate_check($conn, 'track', $client_ip, RATE_TRACK_MAX, RATE_TRACK_WINDOW)) {
        http_response_code(429);
        echo json_encode(["success" => false, "message" => $CK_STRINGS['track_limited']]);
        exit;
    }
    ck_rate_record($conn, 'track', $client_ip);

    $id = ck_parse_reference($_GET['reference']);
    if ($id === null) {
        echo json_encode(["success" => false, "message" => $CK_STRINGS['unknown_ref']]);
        exit;
    }

    $stmt = $conn->prepare(
        "SELECT id, time, category, urgency, location, sector, details, status FROM reports WHERE id=?"
    );
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $row = $result->fetch_assoc()) {
        echo json_encode([
            "success" => true,
            "data" => [
                "id"       => "CK-" . $row['id'],
                "time"     => $row['time'],
                "category" => $row['category'],
                "urgency"  => $row['urgency'],
                "location" => $row['location'],
                "sector"   => $row['sector'] ?: $CK_STRINGS['default_sector'],
                "details"  => $row['details'] ?: $CK_STRINGS['no_details'],
                "status"   => strtolower($row['status'] ?: 'pending')
            ]
        ]);
    } else {
        echo json_encode(["success" => false, "message" => $CK_STRINGS['unknown_ref']]);
    }

    $stmt->close();
    exit;
}

/* -------------------------------------------------------------------------
 * 2. Report submission
 * ---------------------------------------------------------------------- */
$success = "";
$error = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!ck_csrf_verify()) {
        $error = $CK_STRINGS['session_expired'];

    } elseif (!ck_rate_check($conn, 'submit', $client_ip, RATE_SUBMIT_MAX, RATE_SUBMIT_WINDOW)) {
        $error = $CK_STRINGS['submit_limited'];

    } else {
        // Category, urgency and status are checked against fixed vocabularies;
        // free-text fields are trimmed and capped to their column widths so
        // MySQL never has to silently truncate them.
        $validated = ck_validate_report($_POST);

        if (isset($validated['errors'])) {
            $error = $CK_STRINGS['invalid_input'];
        } else {
            $d = $validated['data'];
            $time = date('Y-m-d H:i:s');

            $stmt = $conn->prepare(
                "INSERT INTO reports (time, category, urgency, location, sector, details, name, contact, ip, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')"
            );
            $stmt->bind_param(
                "sssssssss",
                $time, $d['category'], $d['urgency'], $d['location'],
                $d['sector'], $d['details'], $d['name'], $d['contact'], $client_ip
            );

            if ($stmt->execute()) {
                $success = "CK-" . $conn->insert_id;
                ck_rate_record($conn, 'submit', $client_ip);
            } else {
                // Detail goes to the log; the visitor sees a generic message.
                ck_log('Report insert failed: ' . $stmt->error);
                $error = $CK_STRINGS['submit_error'];
            }
            $stmt->close();
        }
    }
}

/* -------------------------------------------------------------------------
 * 3. Public statistics
 *
 * These are real counts. The previous version fell back to hard-coded
 * placeholder figures (124/92/32) and a fixed 94.3% resolution rate whenever
 * the table was empty, which showed visitors numbers that were not true.
 * ---------------------------------------------------------------------- */
$totalReports = 0;
$resolvedReports = 0;
$pendingReports = 0;
$resolutionRate = '—';

$statsQuery = $conn->query("SELECT
    COUNT(*) as total,
    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as resolved,
    SUM(CASE WHEN status <> 'done' OR status IS NULL THEN 1 ELSE 0 END) as pending
    FROM reports");

if ($statsQuery && ($stats = $statsQuery->fetch_assoc())) {
    $totalReports    = intval($stats['total']);
    $resolvedReports = intval($stats['resolved']);
    $pendingReports  = intval($stats['pending']);

    if ($totalReports > 0) {
        $resolutionRate = number_format(($resolvedReports / $totalReports) * 100, 1) . '%';
    }
}

/* -------------------------------------------------------------------------
 * 4. Recent reports feed
 *
 * Only non-identifying columns are selected — reporter name, contact and IP
 * never reach the public page.
 * ---------------------------------------------------------------------- */
$recentReports = [];
$recentQuery = $conn->query(
    "SELECT category, urgency, location, sector, time, status FROM reports ORDER BY time DESC LIMIT 8"
);
if ($recentQuery) {
    while ($row = $recentQuery->fetch_assoc()) {
        $recentReports[] = $row;
    }
}

/**
 * Icon for a report category. Language-independent, so it lives here rather
 * than being repeated in each translation of the page.
 */
function getCategoryEmoji($cat) {
    switch ($cat) {
        case 'full-bin':        return '🗑️';
        case 'blocked-drain':   return '🌊';
        case 'illegal-dumping': return '🚯';
        case 'litter':          return '🍂';
        default:                return '📍';
    }
}
