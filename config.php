<?php
/**
 * config.php — central configuration for Clean Kigali.
 *
 * Values are read from environment variables first so that production
 * credentials never live in source control. For local XAMPP development the
 * defaults below apply. To override without touching this file, create
 * config.local.php next to it and return an associative array:
 *
 *     <?php return ['DB_PASS' => 'secret', 'APP_ENV' => 'production'];
 *
 * config.local.php is blocked from web access by .htaccess and should be
 * excluded from version control.
 */

if (defined('CK_CONFIG_LOADED')) {
    return;
}
define('CK_CONFIG_LOADED', true);

$__ck_local = [];
if (is_readable(__DIR__ . '/config.local.php')) {
    $__ck_local = include __DIR__ . '/config.local.php';
    if (!is_array($__ck_local)) {
        $__ck_local = [];
    }
}

/**
 * Resolve a setting: environment variable > config.local.php > default.
 */
function ck_config_value($key, $default, array $local) {
    $env = getenv($key);
    if ($env !== false && $env !== '') {
        return $env;
    }
    if (array_key_exists($key, $local)) {
        return $local[$key];
    }
    return $default;
}

// --- Environment -----------------------------------------------------------
// 'production' hides error detail from users. Anything else shows it on screen.
define('APP_ENV', ck_config_value('CK_APP_ENV', 'production', $__ck_local));
define('IS_PRODUCTION', APP_ENV === 'production');

// --- Database --------------------------------------------------------------
define('DB_HOST', ck_config_value('CK_DB_HOST', 'localhost', $__ck_local));
define('DB_USER', ck_config_value('CK_DB_USER', 'root', $__ck_local));
define('DB_PASS', ck_config_value('CK_DB_PASS', '', $__ck_local));
define('DB_NAME', ck_config_value('CK_DB_NAME', 'umuganda', $__ck_local));

// --- Paths -----------------------------------------------------------------
// Log directory. Kept out of the document root where possible; falls back to a
// local ./logs folder that .htaccess denies.
define('LOG_DIR', ck_config_value('CK_LOG_DIR', __DIR__ . '/logs', $__ck_local));

// --- Session ---------------------------------------------------------------
define('SESSION_NAME', 'CK_ADMIN_SESSION');
define('SESSION_IDLE_TIMEOUT', 1800);   // 30 min of inactivity ends the session
define('SESSION_ABSOLUTE_TIMEOUT', 43200); // 12 h hard cap regardless of activity

// --- Rate limiting ---------------------------------------------------------
// Public report submissions per IP.
define('RATE_SUBMIT_MAX', 5);
define('RATE_SUBMIT_WINDOW', 3600);     // per hour

// Tracker lookups per IP — this is what stops sequential CK-1, CK-2 scraping.
define('RATE_TRACK_MAX', 30);
define('RATE_TRACK_WINDOW', 600);       // per 10 minutes

// Failed admin logins before the account is temporarily locked.
define('LOGIN_MAX_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_WINDOW', 900);    // 15 minutes

// --- First-run setup -------------------------------------------------------
// setup_admin.php only works while zero admin accounts exist. On a public
// deployment, also set a token here (or as CK_SETUP_TOKEN) so nobody can reach
// the setup page in the window between deploying and creating your account.
define('SETUP_TOKEN', ck_config_value('CK_SETUP_TOKEN', '', $__ck_local));

// --- Field limits ----------------------------------------------------------
// These mirror the column widths in the reports table so input is rejected
// with a clear message rather than silently truncated by MySQL.
define('MAX_LOCATION_LEN', 100);
define('MAX_SECTOR_LEN', 50);
define('MAX_DETAILS_LEN', 2000);
define('MAX_NAME_LEN', 50);
define('MAX_CONTACT_LEN', 50);

// --- Controlled vocabularies ----------------------------------------------
// Anything not on these lists is rejected outright.
define('VALID_CATEGORIES', ['full-bin', 'blocked-drain', 'illegal-dumping', 'litter', 'other']);
define('VALID_URGENCIES', ['low', 'medium', 'high']);
define('VALID_STATUSES', ['pending', 'notdone', 'done']);
