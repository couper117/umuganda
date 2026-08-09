<?php
/**
 * lib/security.php — session hardening, CSRF, rate limiting and input validation.
 *
 * Every entry point should require_once this file. It has no output of its own,
 * so it is safe to include before headers are sent.
 */

require_once __DIR__ . '/../config.php';

/* -------------------------------------------------------------------------
 * Sessions
 * ---------------------------------------------------------------------- */

/**
 * Start a hardened session: HttpOnly, SameSite=Lax, Secure over HTTPS, and a
 * strict-mode cookie so an attacker cannot fixate a session id of their choice.
 * Also enforces idle and absolute timeouts.
 */
function ck_session_start() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['SERVER_PORT'] ?? '') == 443)
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');

    session_name(SESSION_NAME);
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();

    $now = time();

    // Idle timeout.
    if (isset($_SESSION['last_activity']) && ($now - $_SESSION['last_activity']) > SESSION_IDLE_TIMEOUT) {
        ck_session_destroy();
        session_start();
    }

    // Absolute timeout — a stolen session cannot be kept alive indefinitely.
    if (isset($_SESSION['created_at']) && ($now - $_SESSION['created_at']) > SESSION_ABSOLUTE_TIMEOUT) {
        ck_session_destroy();
        session_start();
    }

    if (!isset($_SESSION['created_at'])) {
        $_SESSION['created_at'] = $now;
    }
    $_SESSION['last_activity'] = $now;
}

/**
 * Fully tear down the current session, including its cookie.
 */
function ck_session_destroy() {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

/* -------------------------------------------------------------------------
 * CSRF
 * ---------------------------------------------------------------------- */

/**
 * Return the session's CSRF token, generating one on first use.
 */
function ck_csrf_token() {
    ck_session_start();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Hidden input carrying the CSRF token, for embedding in forms.
 */
function ck_csrf_field() {
    return '<input type="hidden" name="csrf_token" value="' . ck_csrf_token() . '">';
}

/**
 * Constant-time check of a submitted token. Accepts the token from either the
 * POST body or the X-CSRF-Token header (used by the dashboard's fetch calls).
 */
function ck_csrf_verify($submitted = null) {
    ck_session_start();
    if ($submitted === null) {
        $submitted = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    }
    if (empty($_SESSION['csrf_token']) || !is_string($submitted) || $submitted === '') {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $submitted);
}

/**
 * Verify CSRF or terminate. $as_json controls the response shape.
 */
function ck_csrf_require($as_json = false) {
    if (ck_csrf_verify()) {
        return;
    }
    http_response_code(419);
    if ($as_json) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Your session expired. Please reload the page.']);
    } else {
        echo 'Your session expired. Please go back, reload the page and try again.';
    }
    exit;
}

/* -------------------------------------------------------------------------
 * Client identity
 * ---------------------------------------------------------------------- */

/**
 * Best-effort client IP.
 *
 * X-Forwarded-For is only trusted when the request actually arrives from a
 * known proxy, because the header is trivially spoofed otherwise — and this
 * value gates the rate limiter.
 */
function ck_client_ip() {
    $trusted_proxies = ['127.0.0.1', '::1'];
    $remote = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

    if (in_array($remote, $trusted_proxies, true) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $candidate = trim($parts[0]);
        if (filter_var($candidate, FILTER_VALIDATE_IP)) {
            return $candidate;
        }
    }

    return filter_var($remote, FILTER_VALIDATE_IP) ? $remote : '0.0.0.0';
}

/* -------------------------------------------------------------------------
 * Rate limiting
 * ---------------------------------------------------------------------- */

/**
 * Count events in the trailing window for a bucket/identifier pair.
 * Returns true when the caller is still under the limit.
 *
 * Call ck_rate_record() only once the action actually succeeds, so failed or
 * rejected attempts do not consume a user's quota.
 */
function ck_rate_check(mysqli $conn, $bucket, $identifier, $max, $window_seconds) {
    $cutoff = date('Y-m-d H:i:s', time() - $window_seconds);
    $stmt = $conn->prepare(
        'SELECT COUNT(*) AS c FROM rate_limits WHERE bucket = ? AND identifier = ? AND occurred_at > ?'
    );
    if (!$stmt) {
        return true; // Never lock users out because the limiter itself broke.
    }
    $stmt->bind_param('sss', $bucket, $identifier, $cutoff);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return intval($row['c'] ?? 0) < $max;
}

/**
 * Record one event against a bucket, and opportunistically prune old rows so
 * the table does not grow without bound.
 */
function ck_rate_record(mysqli $conn, $bucket, $identifier) {
    $now = date('Y-m-d H:i:s');
    $stmt = $conn->prepare('INSERT INTO rate_limits (bucket, identifier, occurred_at) VALUES (?, ?, ?)');
    if ($stmt) {
        $stmt->bind_param('sss', $bucket, $identifier, $now);
        $stmt->execute();
        $stmt->close();
    }

    // ~2% of calls sweep entries older than a day.
    if (random_int(1, 50) === 1) {
        $cutoff = date('Y-m-d H:i:s', time() - 86400);
        $prune = $conn->prepare('DELETE FROM rate_limits WHERE occurred_at < ?');
        if ($prune) {
            $prune->bind_param('s', $cutoff);
            $prune->execute();
            $prune->close();
        }
    }
}

/* -------------------------------------------------------------------------
 * Audit log
 * ---------------------------------------------------------------------- */

/**
 * Record a privileged action so destructive changes are attributable.
 */
function ck_audit(mysqli $conn, $actor, $action, $target_id = null, $detail = null) {
    $now = date('Y-m-d H:i:s');
    $ip = ck_client_ip();
    $stmt = $conn->prepare(
        'INSERT INTO audit_log (occurred_at, actor, action, target_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?)'
    );
    if ($stmt) {
        $stmt->bind_param('sssiss', $now, $actor, $action, $target_id, $detail, $ip);
        $stmt->execute();
        $stmt->close();
    }
}

/* -------------------------------------------------------------------------
 * Input validation
 * ---------------------------------------------------------------------- */

/**
 * Escape for HTML output. Shorter than spelling out htmlspecialchars flags at
 * every call site, and consistent about the charset.
 */
function e($value) {
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Trim, strip control characters, and cap length. Returns null when the field
 * is empty after cleaning.
 */
function ck_clean_text($value, $max_len) {
    if (!is_string($value)) {
        return null;
    }
    // Drop C0/C1 control characters except tab and newline.
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);
    $value = trim($value);
    if ($value === '') {
        return null;
    }
    if (function_exists('mb_substr')) {
        $value = mb_substr($value, 0, $max_len, 'UTF-8');
    } else {
        $value = substr($value, 0, $max_len);
    }
    return $value;
}

/**
 * Return $value only if it appears in $allowed, otherwise null.
 */
function ck_enum($value, array $allowed) {
    return (is_string($value) && in_array($value, $allowed, true)) ? $value : null;
}

/**
 * Validate a full report submission.
 * Returns ['data' => [...]] on success or ['errors' => [...]] on failure.
 */
function ck_validate_report(array $post) {
    $errors = [];

    $category = ck_enum($post['category'] ?? null, VALID_CATEGORIES);
    if ($category === null) {
        $errors[] = 'category';
    }

    $urgency = ck_enum($post['urgency'] ?? null, VALID_URGENCIES);
    if ($urgency === null) {
        $errors[] = 'urgency';
    }

    $location = ck_clean_text($post['location'] ?? null, MAX_LOCATION_LEN);
    if ($location === null) {
        $errors[] = 'location';
    }

    // Optional fields — cleaned and capped, never rejected.
    $sector  = ck_clean_text($post['sector'] ?? null, MAX_SECTOR_LEN);
    $details = ck_clean_text($post['details'] ?? null, MAX_DETAILS_LEN);
    $name    = ck_clean_text($post['name'] ?? null, MAX_NAME_LEN);
    $contact = ck_clean_text($post['contact'] ?? null, MAX_CONTACT_LEN);

    if ($errors) {
        return ['errors' => $errors];
    }

    return ['data' => [
        'category' => $category,
        'urgency'  => $urgency,
        'location' => $location,
        'sector'   => $sector,
        'details'  => $details,
        'name'     => $name,
        'contact'  => $contact,
    ]];
}

/**
 * Parse a CK-#### reference into a positive integer id, or null if malformed.
 */
function ck_parse_reference($reference) {
    if (!is_string($reference)) {
        return null;
    }
    $reference = strtoupper(trim($reference));
    if (!preg_match('/^CK-?(\d{1,9})$/', $reference, $m)) {
        return null;
    }
    $id = intval($m[1]);
    return $id > 0 ? $id : null;
}

/**
 * Emit response headers that apply to every page.
 * Call before any output.
 */
function ck_send_security_headers() {
    if (headers_sent()) {
        return;
    }
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
}
