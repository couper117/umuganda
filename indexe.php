<?php
include 'db_connection.php';

$success = ''; // initialize

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $category = $_POST['category'] ?? '';
    $urgency  = $_POST['urgency'] ?? '';
    $location = $_POST['location'] ?? '';
    $sector   = $_POST['sector'] ?? '';
    $details  = $_POST['details'] ?? '';
    $name     = $_POST['name'] ?? '';
    $contact  = $_POST['contact'] ?? '';
    $ip       = $_SERVER['REMOTE_ADDR'];
    $time     = date('Y-m-d H:i:s');

    if (empty($category) || empty($urgency) || empty($location)) {
        $success = "Please fill in all required fields.";
    } else {
        $stmt = $conn->prepare(
            "INSERT INTO reports (time, category, urgency, location, sector, details, name, contact, ip)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("sssssssss", $time, $category, $urgency, $location, $sector, $details, $name, $contact, $ip);

        if ($stmt->execute()) {
            $success = "Thank you! Your report has been submitted and will be reviewed shortly.";
        } else {
            $success = "An error occurred: " . $stmt->error;
        }

        $stmt->close();
    }

    $conn->close();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Clean Kigali • Submit Report</title>

<style>
    body {
        font-family: Arial, sans-serif;
        background: #f2f2f2;
        margin: 0;
        padding: 0;
    }

    .container {
        max-width: 600px;
        margin: 30px auto;
        padding: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }

    header .logo {
        font-size: 24px;
        font-weight: bold;
    }

    header .tagline {
        font-size: 14px;
        color: #666;
        margin-bottom: 20px;
    }

    .field {
        margin-bottom: 15px;
    }

    .field label {
        display: block;
        margin-bottom: 5px;
    }

    .field input,
    .field select,
    .field textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    textarea {
        resize: vertical;
    }

    .success {
        background: #d4edda;
        color: #155724;
        padding: 10px;
        border-radius: 4px;
        margin-bottom: 15px;
    }

    .buttons {
        display: flex;
        gap: 10px;
    }

    button {
        padding: 10px 15px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .btn-primary {
        background: #10b981;
        color: white;
    }

    .btn-secondary {
        background: #6b7280;
        color: white;
    }

    .Btn-1,
    .Btn-2 {
        background-color: #10b981;
        margin-left: 10px;
        cursor: pointer;
        margin-bottom: 20px;
        transition: 2s;
    }

    .Btn-1:hover,
    .Btn-2:hover {
        transform: scale(1.1);
        transition: 2s;
    }
</style>
</head>

<body>
<div class="container">

<header>
    <div class="logo">Clean Kigali</div>
    <p class="tagline">Help keep Kigali clean — submit a report</p>
    
    <div style="margin-top:10px;">
        <p>Select your language</p>
        <a href="index.php"><button class="Btn-1">Kinyarwanda</button></a>
        <a href="indexf.php"><button class="Btn-2">French</button></a>
    </div>
</header>

<?php if (!empty($success)): ?>
    <div class="success"><?= htmlspecialchars($success) ?></div>
<?php endif; ?>

<form method="POST">
    <div class="field">
        <label>Type of issue *</label>
        <select name="category" required>
            <option value="" disabled <?= empty($_POST['category']) ? 'selected' : '' ?>>Choose one</option>
            <option value="full-bin" <?= ($_POST['category']??'')=='full-bin'?'selected':'' ?>>Full trash bin</option>
            <option value="blocked-drain" <?= ($_POST['category']??'')=='blocked-drain'?'selected':'' ?>>Blocked drainage</option>
            <option value="illegal-dumping" <?= ($_POST['category']??'')=='illegal-dumping'?'selected':'' ?>>Illegal dumping</option>
            <option value="litter" <?= ($_POST['category']??'')=='litter'?'selected':'' ?>>Littering</option>
            <option value="other" <?= ($_POST['category']??'')=='other'?'selected':'' ?>>Other issue</option>
        </select>
    </div>

    <div class="field">
        <label>Urgency level *</label>
        <select name="urgency" required>
            <option value="" disabled <?= empty($_POST['urgency'])?'selected':'' ?>>Choose level</option>
            <option value="low" <?= ($_POST['urgency']??'')=='low'?'selected':'' ?>>Low</option>
            <option value="medium" <?= ($_POST['urgency']??'')=='medium'?'selected':'' ?>>Medium</option>
            <option value="high" <?= ($_POST['urgency']??'')=='high'?'selected':'' ?>>High (urgent)</option>
        </select>
    </div>

    <div class="field">
        <label>Exact location *</label>
        <input type="text" name="location" value="<?= htmlspecialchars($_POST['location']??'') ?>" placeholder="Example: Near CHUK entrance, Nyabugogo bus station" required>
    </div>

    <div class="field">
        <label>District → Sector (optional)</label>
        <input type="text" name="sector" value="<?= htmlspecialchars($_POST['sector']??'') ?>" placeholder="Example: Gasabo → Remera">
    </div>

    <div class="field">
        <label>Additional details (optional)</label>
        <textarea name="details"><?= htmlspecialchars($_POST['details']??'') ?></textarea>
    </div>

    <div class="field">
        <label>Your name (optional)</label>
        <input type="text" name="name" value="<?= htmlspecialchars($_POST['name']??'') ?>">
    </div>

    <div class="field">
        <label>Phone or email (optional)</label>
        <input type="text" name="contact" value="<?= htmlspecialchars($_POST['contact']??'') ?>">
    </div>

    <div class="buttons">
        <button type="submit" class="btn-primary">Submit Report</button>
        <button type="reset" class="btn-secondary">Clear All</button>
    </div>
</form>

<div class="info">
    <p>
        This umuganda systems helps to people to suggest locations that need cleaning in Kigali.<br>
        Reports are reviewed by city officials and cleaning teams to ensure a cleaner environment for all residents.
    </p>
</div>

<footer style="text-align:center; margin-top:20px; color:#666;">
    Created for the City of Kigali • Pure PHP
</footer>

</div>
</body>
</html>
