<?php
/**
 * lib/auth.php — admin authentication for the Clean Kigali dashboard.
 *
 * Passwords are stored as password_hash() bcrypt digests. Repeated failures
 * lock the account for a cooldown window, and login responses are deliberately
 * identical for unknown users and wrong passwords so the form cannot be used
 * to enumerate valid usernames.
 */

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/../db_connection.php';

/**
 * True when the current session belongs to a signed-in admin.
 */
function ck_is_logged_in() {
    ck_session_start();
    return !empty($_SESSION['admin_id']) && !empty($_SESSION['admin_username']);
}

/**
 * Username of the signed-in admin, or 'system' when unauthenticated.
 */
function ck_current_admin() {
    ck_session_start();
    return $_SESSION['admin_username'] ?? 'system';
}

/**
 * Gate a page behind authentication. Redirects browsers to the login form and
 * returns 401 JSON for AJAX callers.
 */
function ck_require_admin($as_json = false) {
    if (ck_is_logged_in()) {
        return;
    }

    if ($as_json) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Your session expired. Please sign in again.']);
        exit;
    }

    $target = $_SERVER['REQUEST_URI'] ?? '/admin.php';
    header('Location: login.php?next=' . urlencode($target));
    exit;
}

/**
 * True when at least one admin account exists.
 */
function ck_admin_exists(mysqli $conn) {
    $res = $conn->query('SELECT COUNT(*) AS c FROM admin_users');
    if (!$res) {
        return false;
    }
    $row = $res->fetch_assoc();
    return intval($row['c'] ?? 0) > 0;
}

/**
 * Create an admin account. Returns [ok => bool, message => string].
 */
function ck_create_admin(mysqli $conn, $username, $password) {
    $username = ck_clean_text($username, 50);
    if ($username === null || !preg_match('/^[A-Za-z0-9._-]{3,50}$/', $username)) {
        return ['ok' => false, 'message' => 'Username must be 3–50 characters, using letters, numbers, dot, underscore or hyphen only.'];
    }

    $strength = ck_password_problem($password);
    if ($strength !== null) {
        return ['ok' => false, 'message' => $strength];
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $now = date('Y-m-d H:i:s');

    $stmt = $conn->prepare('INSERT INTO admin_users (username, password_hash, created_at) VALUES (?, ?, ?)');
    if (!$stmt) {
        return ['ok' => false, 'message' => 'Could not create the account. Please try again.'];
    }
    $stmt->bind_param('sss', $username, $hash, $now);
    $ok = $stmt->execute();
    $dup = ($conn->errno === 1062);
    $stmt->close();

    if (!$ok) {
        return ['ok' => false, 'message' => $dup ? 'That username is already taken.' : 'Could not create the account. Please try again.'];
    }

    ck_audit($conn, $username, 'admin_created', null, 'New dashboard account');
    return ['ok' => true, 'message' => 'Account created.'];
}

/**
 * Reject weak passwords. Returns an explanation, or null when acceptable.
 */
function ck_password_problem($password) {
    if (!is_string($password) || strlen($password) < 12) {
        return 'Password must be at least 12 characters long.';
    }
    if (strlen($password) > 200) {
        return 'Password must be 200 characters or fewer.';
    }
    if (!preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9]/', $password)) {
        return 'Password must contain both letters and numbers.';
    }
    return null;
}

/**
 * Attempt a login. Returns [ok => bool, message => string].
 *
 * On success the session id is regenerated, which prevents session fixation.
 */
function ck_login(mysqli $conn, $username, $password) {
    ck_session_start();

    $generic = ['ok' => false, 'message' => 'Incorrect username or password.'];

    $username = ck_clean_text($username, 50);
    if ($username === null || !is_string($password) || $password === '') {
        return $generic;
    }

    $stmt = $conn->prepare(
        'SELECT id, username, password_hash, failed_attempts, locked_until FROM admin_users WHERE username = ?'
    );
    if (!$stmt) {
        return $generic;
    }
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user) {
        // Spend comparable time on unknown users so response timing does not
        // reveal whether the account exists.
        password_verify($password, '$2y$10$usesomesillystringforsalttoburncycles0000000000000000000');
        return $generic;
    }

    // Honour an active lockout.
    if (!empty($user['locked_until']) && strtotime($user['locked_until']) > time()) {
        $minutes = max(1, (int) ceil((strtotime($user['locked_until']) - time()) / 60));
        return ['ok' => false, 'message' => "Too many failed attempts. Try again in {$minutes} minute(s)."];
    }

    if (!password_verify($password, $user['password_hash'])) {
        ck_register_failed_login($conn, $user);
        return $generic;
    }

    // Success — reset counters, rotate the session, refresh the hash if the
    // default algorithm has since been upgraded.
    if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
        $new_hash = password_hash($password, PASSWORD_DEFAULT);
        $up = $conn->prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?');
        if ($up) {
            $up->bind_param('si', $new_hash, $user['id']);
            $up->execute();
            $up->close();
        }
    }

    $now = date('Y-m-d H:i:s');
    $up = $conn->prepare('UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login = ? WHERE id = ?');
    if ($up) {
        $up->bind_param('si', $now, $user['id']);
        $up->execute();
        $up->close();
    }

    session_regenerate_id(true);
    $_SESSION['admin_id']       = (int) $user['id'];
    $_SESSION['admin_username'] = $user['username'];
    $_SESSION['created_at']     = time();
    $_SESSION['last_activity']  = time();
    unset($_SESSION['csrf_token']); // Issue a fresh token for the new session.

    ck_audit($conn, $user['username'], 'login_success');
    return ['ok' => true, 'message' => 'Signed in.'];
}

/**
 * Increment the failure counter and lock the account once the threshold is hit.
 */
function ck_register_failed_login(mysqli $conn, array $user) {
    $attempts = intval($user['failed_attempts']) + 1;

    if ($attempts >= LOGIN_MAX_ATTEMPTS) {
        $until = date('Y-m-d H:i:s', time() + LOGIN_LOCKOUT_WINDOW);
        $stmt = $conn->prepare('UPDATE admin_users SET failed_attempts = ?, locked_until = ? WHERE id = ?');
        if ($stmt) {
            $stmt->bind_param('isi', $attempts, $until, $user['id']);
            $stmt->execute();
            $stmt->close();
        }
        ck_audit($conn, $user['username'], 'login_locked', null, "Locked after {$attempts} failed attempts");
    } else {
        $stmt = $conn->prepare('UPDATE admin_users SET failed_attempts = ? WHERE id = ?');
        if ($stmt) {
            $stmt->bind_param('ii', $attempts, $user['id']);
            $stmt->execute();
            $stmt->close();
        }
        ck_audit($conn, $user['username'], 'login_failed', null, "Attempt {$attempts}");
    }
}

/**
 * Sign the current admin out.
 */
function ck_logout(mysqli $conn = null) {
    ck_session_start();
    if ($conn && ck_is_logged_in()) {
        ck_audit($conn, ck_current_admin(), 'logout');
    }
    ck_session_destroy();
}
