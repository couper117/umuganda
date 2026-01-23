<?php
include 'db_connection.php';

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

    $stmt = $conn->prepare(
        "INSERT INTO reports (time, category, urgency, location, sector, details, name, contact, ip)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("sssssssss", $time, $category, $urgency, $location, $sector, $details, $name, $contact, $ip);

    if ($stmt->execute()) {
        $success = "Murakoze cyane! Raporo yanyu yoherejwe. Tuzayikurikirana vuba.";
    } else {
        $success = "Ibyagenze nabi! Habaye ikibazo: " . $stmt->error;
    }
    $stmt->close();
}

$conn->close();
?>
<!DOCTYPE html>
<html lang="rw">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Clean Kigali • Tanga Raporo</title>

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

    .Btn-1:hover {
        transform: scale(1.1);
        transition: 2s;
    }
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
    <p class="tagline">Dufashe gukomeza isuku y’Umujyi wa Kigali — tanga raporo</p>
    
    <div style="margin-top:10px;">
        <p>Hitamo ururimi rwawe</p>
        <a href="indexf.php"><button class="Btn-1">Igifaransa</button></a>
        <a href="indexe.php"><button class="Btn-2">English</button></a>
    </div>
</header>

<?php if (!empty($success)): ?>
    <div class="success"><?= $success ?></div>
<?php endif; ?>

<form method="POST">
    <div class="field">
        <label>Ubwoko bw’ikibazo *</label>
        <select name="category" required>
            <option value="" disabled <?= empty($_POST['category']) ? 'selected' : '' ?>>Hitamo kimwe</option>
            <option value="full-bin" <?= ($_POST['category']??'')=='full-bin'?'selected':'' ?>>Agasanduku k’imyanda kazuye</option>
            <option value="blocked-drain" <?= ($_POST['category']??'')=='blocked-drain'?'selected':'' ?>>Umuyoboro wuzuyemo / wabuze aho ujya</option>
            <option value="illegal-dumping" <?= ($_POST['category']??'')=='illegal-dumping'?'selected':'' ?>>Imyanda ijugunywe mu buryo butemewe</option>
            <option value="litter" <?= ($_POST['category']??'')=='litter'?'selected':'' ?>>Imyanda iri aho itagomba kuba</option>
            <option value="other" <?= ($_POST['category']??'')=='other'?'selected':'' ?>>Ikindi kibazo</option>
        </select>
    </div>

    <div class="field">
        <label>Uburyo bw’igihe cyihutirwa *</label>
        <select name="urgency" required>
            <option value="" disabled <?= empty($_POST['urgency'])?'selected':'' ?>>Hitamo urwego</option>
            <option value="low" <?= ($_POST['urgency']??'')=='low'?'selected':'' ?>>Ntoya</option>
            <option value="medium" <?= ($_POST['urgency']??'')=='medium'?'selected':'' ?>>Hagati</option>
            <option value="high" <?= ($_POST['urgency']??'')=='high'?'selected':'' ?>>Yihutirwa cyane</option>
        </select>
    </div>

    <div class="field">
        <label>Aho ikibazo giherereye neza *</label>
        <input type="text" name="location" value="<?= htmlspecialchars($_POST['location']??'') ?>" placeholder="Urugero: ku muryango wa CHUK, Nyabugogo kuri gare" required>
    </div>

    <div class="field">
        <label>Akarere → Umurenge (bitari ngombwa)</label>
        <input type="text" name="sector" value="<?= htmlspecialchars($_POST['sector']??'') ?>" placeholder="Urugero: Gasabo → Remera">
    </div>

    <div class="field">
        <label>Ibisobanuro (bitari ngombwa)</label>
        <textarea name="details"><?= htmlspecialchars($_POST['details']??'') ?></textarea>
    </div>

    <div class="field">
        <label>Amazina yawe (bitari ngombwa)</label>
        <input type="text" name="name" value="<?= htmlspecialchars($_POST['name']??'') ?>">
    </div>

    <div class="field">
        <label>Telefone cyangwa Imeyili (bitari ngombwa)</label>
        <input type="text" name="contact" value="<?= htmlspecialchars($_POST['contact']??'') ?>">
    </div>

    <div class="buttons">
        <button type="submit" class="btn-primary">Ohereza Raporo</button>
        <button type="reset" class="btn-secondary">Siba byose</button>
    </div>
</form>

<footer style="text-align:center; margin-top:20px; color:#666;">
    Byakozwe ku bw’Umujyi wa Kigali • Pure PHP
</footer>

</div>
</body>
</html>
