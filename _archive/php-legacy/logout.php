<?php
/**
 * logout.php — end the current admin session.
 *
 * POST-only with a CSRF check, so a third-party page cannot forcibly sign an
 * admin out via an <img> tag or a stray link.
 */

require_once __DIR__ . '/lib/auth.php';

ck_session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: admin.php');
    exit;
}

ck_csrf_require();
ck_logout($conn);

header('Location: login.php');
exit;
