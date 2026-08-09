<?php
/**
 * login.php — admin sign-in for the Clean Kigali dashboard.
 */

require_once __DIR__ . '/lib/auth.php';

ck_session_start();
ck_send_security_headers();

// Already signed in? Go straight to the dashboard.
if (ck_is_logged_in()) {
    header('Location: admin.php');
    exit;
}

// No accounts yet — send the operator to the one-time setup page.
if (!ck_admin_exists($conn)) {
    header('Location: setup_admin.php');
    exit;
}

$error = '';

// Only allow returning to a local path, so ?next= cannot bounce users offsite.
$next = $_GET['next'] ?? 'admin.php';
if (!preg_match('#^/?[A-Za-z0-9._/-]*\.php(\?[A-Za-z0-9._=&%-]*)?$#', $next) || strpos($next, '//') !== false) {
    $next = 'admin.php';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    ck_csrf_require();

    $ip = ck_client_ip();

    // Throttle login attempts per IP, on top of the per-account lockout.
    if (!ck_rate_check($conn, 'login', $ip, 15, 900)) {
        $error = 'Too many sign-in attempts from this network. Please wait a few minutes.';
    } else {
        $result = ck_login($conn, $_POST['username'] ?? '', $_POST['password'] ?? '');
        if ($result['ok']) {
            header('Location: ' . $next);
            exit;
        }
        ck_rate_record($conn, 'login', $ip);
        $error = $result['message'];
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Sign In • Clean Kigali Admin</title>
    <link rel="stylesheet" href="admin.css">
    <style>
        .auth-wrap {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
        }
        .auth-card {
            width: 100%;
            max-width: 420px;
            background: #fff;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
            padding: 32px 26px;
        }
        .auth-logo {
            width: 52px; height: 52px;
            border-radius: 14px;
            background: var(--primary);
            color: #fff;
            display: flex; align-items: center; justify-content: center;
            font-weight: 800; font-size: 1.1rem;
            margin-bottom: 18px;
        }
        .auth-card h1 { font-size: 1.5rem; margin-bottom: 6px; }
        .auth-card .auth-sub { color: var(--dark-muted); font-size: 0.9rem; margin-bottom: 24px; }
        .auth-field { margin-bottom: 16px; }
        .auth-field label {
            display: block;
            font-weight: 600;
            font-size: 0.85rem;
            margin-bottom: 6px;
        }
        .auth-field input {
            width: 100%;
            padding: 12px 14px;
            min-height: 48px;
            border: 1px solid var(--light-border);
            border-radius: var(--radius-sm);
            font-size: 1rem;
            font-family: inherit;
            outline: none;
        }
        .auth-field input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--urgency-low-light); }
        .auth-submit {
            width: 100%;
            min-height: 48px;
            border: none;
            border-radius: var(--radius-sm);
            background: var(--primary);
            color: #fff;
            font-weight: 700;
            font-size: 1rem;
            font-family: inherit;
            cursor: pointer;
            margin-top: 8px;
        }
        .auth-submit:hover { background: var(--primary-hover); }
        .auth-error {
            background: var(--urgency-high-light);
            color: #991b1b;
            border-radius: var(--radius-sm);
            padding: 12px 14px;
            font-size: 0.88rem;
            font-weight: 600;
            margin-bottom: 18px;
        }
        .auth-back {
            display: block;
            text-align: center;
            margin-top: 20px;
            color: var(--dark-muted);
            font-size: 0.85rem;
            text-decoration: none;
        }
        .auth-back:hover { color: var(--primary); }
    </style>
</head>
<body class="admin-body">
    <div class="auth-wrap">
        <div class="auth-card">
            <div class="auth-logo">CK</div>
            <h1>Admin Sign In</h1>
            <p class="auth-sub">Restricted area. Dashboard access is limited to authorised Clean Kigali staff.</p>

            <?php if ($error): ?>
                <div class="auth-error" role="alert"><?= e($error) ?></div>
            <?php endif; ?>

            <form method="POST" autocomplete="off">
                <?= ck_csrf_field() ?>

                <div class="auth-field">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required autofocus
                           maxlength="50" autocapitalize="none" autocorrect="off" spellcheck="false">
                </div>

                <div class="auth-field">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required maxlength="200">
                </div>

                <button type="submit" class="auth-submit">Sign In</button>
            </form>

            <a href="index.php" class="auth-back">← Back to the public portal</a>
        </div>
    </div>
</body>
</html>
