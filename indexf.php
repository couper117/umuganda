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
        $success = "Veuillez remplir tous les champs obligatoires.";
    } else {
        $stmt = $conn->prepare(
            "INSERT INTO reports (time, category, urgency, location, sector, details, name, contact, ip)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("sssssssss", $time, $category, $urgency, $location, $sector, $details, $name, $contact, $ip);

        if ($stmt->execute()) {
            $success = "Merci ! Votre rapport a été soumis et sera examiné sous peu.";
        } else {
            $success = "Une erreur est survenue : " . $stmt->error;
        }

        $stmt->close();
    }

    $conn->close();
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Propreté Kigali • Soumettre un rapport</title>

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
    <div class="logo">Propreté Kigali</div>
    <p class="tagline">Aidez à garder Kigali propre — soumettez un rapport</p>
    
    <div style="margin-top:10px;">
        <p>Choisissez la langue</p>
        <a href="index.php"><button class="Btn-1">Kinyarwanda</button></a>
        <a href="indexf.php"><button class="Btn-2">Français</button></a>
    </div>
</header>

<?php if (!empty($success)): ?>
    <div class="success"><?= htmlspecialchars($success) ?></div>
<?php endif; ?>

<form method="POST">
    <div class="field">
        <label>Type de problème *</label>
        <select name="category" required>
            <option value="" disabled <?= empty($_POST['category']) ? 'selected' : '' ?>>Choisissez</option>
            <option value="full-bin" <?= ($_POST['category']??'')=='full-bin'?'selected':'' ?>>Poubelle pleine</option>
            <option value="blocked-drain" <?= ($_POST['category']??'')=='blocked-drain'?'selected':'' ?>>Canalisation bouchée</option>
            <option value="illegal-dumping" <?= ($_POST['category']??'')=='illegal-dumping'?'selected':'' ?>>Déversement illégal</option>
            <option value="litter" <?= ($_POST['category']??'')=='litter'?'selected':'' ?>>Déchets éparpillés</option>
            <option value="other" <?= ($_POST['category']??'')=='other'?'selected':'' ?>>Autre problème</option>
        </select>
    </div>

    <div class="field">
        <label>Niveau d'urgence *</label>
        <select name="urgency" required>
            <option value="" disabled <?= empty($_POST['urgency'])?'selected':'' ?>>Choisissez le niveau</option>
            <option value="low" <?= ($_POST['urgency']??'')=='low'?'selected':'' ?>>Faible</option>
            <option value="medium" <?= ($_POST['urgency']??'')=='medium'?'selected':'' ?>>Moyen</option>
            <option value="high" <?= ($_POST['urgency']??'')=='high'?'selected':'' ?>>Élevé (urgent)</option>
        </select>
    </div>

    <div class="field">
        <label>Emplacement exact *</label>
        <input type="text" name="location" value="<?= htmlspecialchars($_POST['location']??'') ?>" placeholder="Exemple : Près de l'entrée du CHUK, gare de Nyabugogo" required>
    </div>

    <div class="field">
        <label>District → Secteur (optionnel)</label>
        <input type="text" name="sector" value="<?= htmlspecialchars($_POST['sector']??'') ?>" placeholder="Exemple : Gasabo → Remera">
    </div>

    <div class="field">
        <label>Détails supplémentaires (optionnel)</label>
        <textarea name="details"><?= htmlspecialchars($_POST['details']??'') ?></textarea>
    </div>

    <div class="field">
        <label>Votre nom (optionnel)</label>
        <input type="text" name="name" value="<?= htmlspecialchars($_POST['name']??'') ?>">
    </div>

    <div class="field">
        <label>Téléphone ou email (optionnel)</label>
        <input type="text" name="contact" value="<?= htmlspecialchars($_POST['contact']??'') ?>">
    </div>

    <div class="buttons">
        <button type="submit" class="btn-primary">Soumettre le rapport</button>
        <button type="reset" class="btn-secondary">Tout effacer</button>
    </div>
</form>

<div class="info">
    <p>
        Ce système Umuganda permet aux citoyens de signaler les lieux nécessitant un nettoyage à Kigali.<br>
        Les rapports sont examinés par les autorités de la ville et les équipes de nettoyage afin d'assurer un environnement plus propre pour tous les habitants.
    </p>
</div>

<footer style="text-align:center; margin-top:20px; color:#666;">
    Créé pour la ville de Kigali • Pure PHP
</footer>

</div>
</body>
</html>
