<?php
/**
 * indexf.php — French (FR) portal page.
 *
 * The tracker API, submission handling, validation, rate limiting and stats all
 * live in lib/portal.php, shared with index.php (RW) and indexe.php (EN).
 * Only the user-facing strings are defined here.
 */

$CK_STRINGS = [
    'default_sector'  => 'Ville de Kigali',
    'no_details'      => 'Aucun détail supplémentaire fourni.',
    'unknown_ref'     => 'Numéro de référence invalide.',
    'track_limited'   => 'Trop de recherches depuis ce réseau. Veuillez patienter quelques minutes et réessayer.',
    'submit_limited'  => 'Vous avez soumis plusieurs signalements récemment. Veuillez réessayer plus tard.',
    'invalid_input'   => 'Veuillez vérifier les champs obligatoires et réessayer.',
    'submit_error'    => 'Une erreur est survenue lors de l\'enregistrement de votre signalement. Veuillez réessayer.',
    'session_expired' => 'Votre session a expiré. Veuillez recharger la page et soumettre à nouveau.',
];

require_once __DIR__ . '/lib/portal.php';

// Helper to format category for user view
function formatCategory($cat) {
    switch ($cat) {
        case 'full-bin': return 'Poubelle Pleine';
        case 'blocked-drain': return 'Caniveau Bouché';
        case 'illegal-dumping': return 'Dépôt Sauvage';
        case 'litter': return 'Déchets Jetés';
        default: return 'Autre Problème de Propreté';
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clean Kigali • Ensemble, Gardons Kigali Propre</title>
    <!-- Custom CSS Stylesheet -->
    <link rel="stylesheet" href="public/style.css">
</head>
<body>

    <a class="skip-link" href="#main">Aller au contenu principal</a>

    <!-- Masthead: who operates the service, plus the language selector -->
    <div class="masthead">
        <div class="container masthead-inner">
            <div>
                <span class="masthead-operator">Clean Kigali Initiative</span>
                <span class="masthead-desc">Service communautaire de signalement de propreté pour la Ville de Kigali</span>
            </div>
            <div class="lang-switcher" role="group" aria-label="Choisir la langue">
                <a href="index.php" class="lang-btn" lang="rw" hreflang="rw">Ikinyarwanda</a>
                <a href="indexe.php" class="lang-btn" lang="en" hreflang="en">English</a>
                <a href="indexf.php" class="lang-btn" lang="fr" hreflang="fr" aria-current="true">Français</a>
            </div>
        </div>
    </div>

    <nav class="navbar" aria-label="Navigation principale">
        <div class="container nav-container">
            <a href="#home" class="logo-wrapper" data-scroll>
                <span class="logo-mark" aria-hidden="true">CK</span>
                <span class="logo-text">Clean Kigali</span>
            </a>

            <button type="button" class="menu-toggle" id="menuToggle" aria-expanded="false" aria-controls="navLinks">
                <span class="menu-toggle-bars" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
                <span class="menu-toggle-label">Menu</span>
            </button>

            <div class="nav-links" id="navLinks">
                <div class="nav-links-head">
                    <span class="nav-links-title">Menu</span>
                    <button type="button" class="nav-close" id="navClose" aria-label="Fermer le menu">&times;</button>
                </div>
                <a href="#home" class="nav-link" aria-current="true" data-scroll>Accueil</a>
                <a href="#tracker-section" class="nav-link" data-scroll>Suivre mon Signalement</a>
                <a href="#report-section" class="nav-link" data-scroll>Signaler un Problème</a>
                <a href="login.php" class="nav-link" rel="nofollow">Tableau de Bord</a>
            </div>
        </div>
    </nav>

    <main id="main">

    <header class="hero" id="home">
        <div class="container">
            <p class="hero-eyebrow">Initiative de propreté urbaine</p>
            <h1>Ensemble, Gardons Kigali Propre</h1>
            <p class="hero-lead">
                Rejoignez des milliers de citoyens pour faire de Kigali la ville la plus propre. Poubelles qui débordent, égouts bouchés ou dépôts sauvages ? Signalez-le en quelques secondes ou suivez l'avancement.
            </p>
            <div class="hero-actions">
                <a href="#report-section" class="btn btn-primary" data-scroll>
                    Signaler un Problème
                </a>
                <a href="#tracker-section" class="btn btn-secondary" data-scroll>
                    Suivre mon Signalement
                </a>
            </div>
        </div>
    </header>

    <!-- Service statistics. Real counts from lib/portal.php. -->
    <section class="stats-section" aria-labelledby="stats-heading">
        <div class="container">
            <h2 id="stats-heading" class="visually-hidden">Statistiques du service</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number"><?= $totalReports ?></div>
                    <div class="stat-label">Total Signalements</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number"><?= $pendingReports ?></div>
                    <div class="stat-label">En Cours</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number"><?= $resolvedReports ?></div>
                    <div class="stat-label">Résolus</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number"><?= e($resolutionRate) ?></div>
                    <div class="stat-label">Taux de Résolution</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Tracking Section -->
    <section class="container" id="tracker-section" style="padding-top: 40px;">
        <div class="tracker-card">
            <div class="tracker-header">
                <h3>Suivre mon Signalement</h3>
                <p style="color: var(--dark-muted); font-size: 0.9rem;">Entrez le numéro de référence de votre signalement (ex. CK-21) pour suivre sa progression sur la ligne de statut.</p>
            </div>
            
            <div class="tracker-search-section">
                <div class="tracker-input-group">
                    <input type="text" id="trackRefInput" placeholder="Ex. CK-21" style="width: 100%; padding: 12px; border: 1px solid var(--light-border); border-radius: var(--radius-sm); font-size: 1rem; outline: none; min-height: 48px; text-transform: uppercase;">
                    <button type="button" class="btn btn-primary" id="trackSubmitBtn" style="width:100%;">
                        Suivre
                    </button>
                </div>
            </div>
            
            <!-- Result Output Box -->
            <div id="trackingResult" style="display: none;"></div>
        </div>
    </section>

    <!-- Main Grid Section -->
    <section class="container" id="report-section" style="padding-top: 40px;">
        <div class="section-header">
            <h2>Signaler un Problème Environnemental</h2>
            <p>Sélectionnez une catégorie, spécifiez l'emplacement exact et envoyez. Le rapport sera assigné à notre équipe de nettoyage.</p>
        </div>

        <div class="main-grid">
            
            <!-- Reporting Form Container -->
            <div class="form-card">
                <?php if (!empty($success)): ?>
                    <div class="success-card">
                        <div class="checkmark-circle">
                            <svg class="checkmark-svg" viewBox="0 0 52 52">
                                <path class="checkmark-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                            </svg>
                        </div>
                        <h3 style="color: var(--primary-hover); margin-bottom: 8px;">Signalement Envoyé !</h3>
                        <p style="color: var(--dark-muted); font-size: 0.9rem; margin-bottom: 20px;">
                            Merci beaucoup d'aider à garder Kigali propre. Votre rapport a été enregistré.
                        </p>
                        <div class="ref-box">
                            <div class="ref-label">Numéro de Référence</div>
                            <div class="ref-code" id="refCode"><?= e($success) ?></div>
                        </div>
                        <div class="success-actions">
                            <button class="btn btn-primary" onclick="copyRefCode('<?= e($success) ?>')">
                                Copier le Numéro
                            </button>
                            <button class="btn btn-secondary" onclick="trackReportDirect('<?= e($success) ?>')">
                                Suivre ce Signalement
                            </button>
                        </div>
                    </div>
                <?php else: ?>
                    <h3>Soumettre un Rapport de Propreté</h3>

                    <?php if (!empty($error)): ?>
                        <div class="form-error" role="alert"><?= e($error) ?></div>
                    <?php endif; ?>

                    <form method="POST" id="reportForm">
                        <?= ck_csrf_field() ?>
                        
                        <!-- Interactive Category Selection (stacked) -->
                        <div class="form-group">
                            <label>Quel problème signalez-vous ? *</label>
                            <div class="category-selector">
                                <div class="cat-option">
                                    <input type="radio" name="category" value="full-bin" id="cat-bin" required>
                                    <span class="cat-icon">🗑️</span>
                                    <span class="cat-label">Poubelle Pleine</span>
                                </div>
                                <div class="cat-option">
                                    <input type="radio" name="category" value="blocked-drain" id="cat-drain">
                                    <span class="cat-icon">🌊</span>
                                    <span class="cat-label">Caniveau Bouché</span>
                                </div>
                                <div class="cat-option">
                                    <input type="radio" name="category" value="illegal-dumping" id="cat-dump">
                                    <span class="cat-icon">🚯</span>
                                    <span class="cat-label">Dépôt Sauvage</span>
                                </div>
                                <div class="cat-option">
                                    <input type="radio" name="category" value="litter" id="cat-litter">
                                    <span class="cat-icon">🍂</span>
                                    <span class="cat-label">Déchets Jetés</span>
                                </div>
                            </div>
                        </div>

                        <!-- Urgency Selector -->
                        <div class="form-group">
                            <label>Niveau d'Urgence *</label>
                            <div class="urgency-selector">
                                <div class="urg-option" data-level="low">
                                    <input type="radio" name="urgency" value="low" id="urg-low" required>
                                    Faible
                                </div>
                                <div class="urg-option" data-level="medium">
                                    <input type="radio" name="urgency" value="medium" id="urg-med">
                                    Moyenne
                                </div>
                                <div class="urg-option" data-level="high">
                                    <input type="radio" name="urgency" value="high" id="urg-high">
                                    Très Urgent
                                </div>
                            </div>
                        </div>

                        <!-- Location details (Single columns) -->
                        <div class="form-group">
                            <label for="location">Emplacement Précis / Repère *</label>
                            <input type="text" id="location" name="location" maxlength="100" placeholder="Ex. Devant l'entrée de CHUK, Gare de Nyabugogo" required>
                        </div>

                        <div class="form-group">
                            <label for="sector">District → Secteur (optionnel)</label>
                            <input type="text" id="sector" name="sector" maxlength="50" placeholder="Ex. Gasabo → Remera">
                        </div>

                        <div class="form-group">
                            <label for="details">Détails Supplémentaires (optionnel)</label>
                            <textarea id="details" name="details" maxlength="2000" placeholder="Décrivez la nature, la taille ou l'emplacement des déchets..."></textarea>
                        </div>

                        <div class="form-group">
                            <label for="name">Votre Nom (optionnel)</label>
                            <input type="text" id="name" name="name" maxlength="50" placeholder="Ex. Jean Dupont">
                        </div>

                        <div class="form-group" style="margin-bottom: 24px;">
                            <label for="contact">Téléphone ou Email (optionnel)</label>
                            <input type="text" id="contact" name="contact" maxlength="50" placeholder="Ex. 078XXXXXXX ou jean@gmail.com">
                        </div>

                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            Soumettre le Signalement
                        </button>
                    </form>
                <?php endif; ?>
            </div>

            <!-- Public Live Tracker Feed -->
            <div class="tracker-card">
                <div class="tracker-header">
                    <h3>Signalements Récents</h3>
                    <div class="search-box">
                        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        <input type="text" id="reportSearch" placeholder="Rechercher par secteur ou repère...">
                    </div>
                </div>

                <div class="reports-feed">
                    <?php if (empty($recentReports)): ?>
                        <div class="feed-empty" id="feedEmptyState">
                            <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/></svg>
                            <p>Aucun rapport environnemental soumis pour le moment. Participez pour aider la ville !</p>
                        </div>
                    <?php else: ?>
                        <?php foreach ($recentReports as $report): ?>
                            <div class="feed-item">
                                <div class="feed-item-top">
                                    <span class="feed-title">
                                        <?= getCategoryEmoji($report['category']) ?> <?= formatCategory($report['category']) ?>
                                    </span>
                                    <span class="badge badge-<?= e($report['urgency']) ?>">
                                        <?php
                                        $u = $report['urgency'];
                                        echo ($u === 'low') ? 'Faible' : (($u === 'medium') ? 'Moyenne' : 'Très Urgent');
                                        ?>
                                    </span>
                                </div>
                                <p class="feed-desc">
                                    <?= e($report['location']) ?>
                                </p>
                                <div class="feed-meta">
                                    <span class="feed-location">
                                        📍 <?= e($report['sector'] ?: 'Ville de Kigali') ?>
                                    </span>
                                    <span class="feed-status">
                                        <?php 
                                        $statusVal = strtolower($report['status'] ?? 'pending');
                                        if (empty($statusVal)) $statusVal = 'pending';
                                        ?>
                                        <span class="status-dot <?= $statusVal ?>"></span>
                                        <?= $statusVal === 'done' ? 'Résolu' : ($statusVal === 'notdone' ? 'Non Résolu' : 'En Cours') ?>
                                    </span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                        
                        <div class="feed-empty" id="feedEmptyState" style="display: none;">
                            <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/></svg>
                            <p>Aucun signalement correspondant trouvé.</p>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

        </div>
    </section>

    </main>

    <footer class="site-footer">
        <div class="container footer-grid">
            <div class="footer-logo">
                <h3>Clean Kigali</h3>
                <p class="footer-operator">Ce service est exploité par l'Initiative Clean Kigali.</p>
                <p>Un service de signalement pour les problèmes de propreté et de déchets dans la Ville de Kigali.</p>
            </div>
            <div class="footer-links">
                <h4>Ressources</h4>
                <ul>
                    <li><a href="#home" data-scroll>Accueil</a></li>
                    <li><a href="#tracker-section" data-scroll>Suivre mon Signalement</a></li>
                    <li><a href="#report-section" data-scroll>Signaler un Problème</a></li>
                </ul>
            </div>
            <div class="footer-links">
                <h4>Partenaires Publics</h4>
                <ul>
                    <li><a href="https://kigalicity.gov.rw" target="_blank" rel="noopener">Ville de Kigali</a></li>
                    <li><a href="https://rema.gov.rw" target="_blank" rel="noopener">REMA Rwanda</a></li>
                    <li><a href="login.php" rel="nofollow">Accès Administration</a></li>
                </ul>
            </div>
        </div>
        <div class="container footer-bottom">
            <p>&copy; <?= date('Y') ?> Initiative Clean Kigali</p>
            <p class="footer-note">Les informations transmises dans un signalement servent uniquement à résoudre le problème de propreté signalé.</p>
        </div>
    </footer>

    <!-- Custom JS Script -->
    <script src="app.js"></script>
</body>
</html>
