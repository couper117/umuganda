/**
 * French strings.
 *
 * Wording carried over from indexf.php verbatim wherever it existed, including
 * the $CK_STRINGS error messages. Strings marked NEW did not exist in the PHP
 * page — they were added by the redesign and are worth a native speaker's
 * review before this goes in front of the public.
 */

import type { Strings } from './index';

export const fr: Strings = {
  htmlLang: 'fr',
  shortCode: 'FR',
  nativeName: 'Français',
  pageTitle: 'Clean Kigali — Ensemble, Gardons Kigali Propre',
  metaDescription:
    'Signalez les poubelles pleines, les caniveaux bouchés, les dépôts sauvages et les déchets dans la Ville de Kigali, et suivez l’avancement de votre signalement.',
  skipLink: 'Aller au contenu principal',

  // NEW
  pages: {
    home: {
      title: 'Clean Kigali — Ensemble, Gardons Kigali Propre',
      description:
        'Signalez les poubelles pleines, les caniveaux bouchés, les dépôts sauvages et les déchets dans la Ville de Kigali, et suivez l’avancement de votre signalement.',
    },
    report: {
      title: 'Signaler un Problème — Clean Kigali',
      description:
        'Signalez une poubelle qui déborde, un caniveau bouché, un dépôt sauvage ou des déchets partout dans la Ville de Kigali.',
    },
    track: {
      title: 'Suivre mon Signalement — Clean Kigali',
      description: 'Saisissez votre numéro de référence CK pour connaître l’état actuel de votre signalement.',
    },
    feed: {
      title: 'Signalements Récents — Clean Kigali',
      description: 'Consultez les signalements de propreté récemment déposés par les habitants de la Ville de Kigali.',
    },
  },

  masthead: {
    operator: 'Clean Kigali Initiative',
    // NEW
    description: 'Service communautaire de signalement de propreté pour la Ville de Kigali',
    // NEW
    chooseLanguage: 'Choisir la langue',
  },

  nav: {
    label: 'Navigation principale',
    menu: 'Menu',
    // NEW
    closeMenu: 'Fermer le menu',
    home: 'Accueil',
    track: 'Suivre mon Signalement',
    report: 'Signaler un Problème',
    // NEW
    reports: 'Signalements Récents',
    admin: 'Espace Personnel',
  },

  // NEW
  home: {
    howHeading: 'Comment ça marche',
    howIntro: 'Trois étapes, quelques minutes, et aucun compte à créer.',
    steps: [
      {
        title: 'Décrivez le problème',
        body: 'Choisissez le type de problème, indiquez son urgence et précisez où il se trouve. Votre nom et vos coordonnées restent facultatifs.',
      },
      {
        title: 'Recevez votre référence',
        body: 'Un numéro de référence vous est attribué dès l’enregistrement du signalement. Notez-le : c’est avec lui que vous suivrez l’avancement.',
      },
      {
        title: 'L’équipe intervient',
        body: 'Votre signalement parvient aux agents environnementaux du secteur concerné. Suivez la référence à tout moment pour voir où il en est.',
      },
    ],
    recentHeading: 'Signalés récemment',
    recentIntro: 'Les derniers problèmes signalés par les habitants à travers la ville.',
    viewAll: 'Voir tous les signalements',
    ctaHeading: 'Vous avez vu quelque chose à nettoyer ?',
    ctaBody: 'Cela prend environ deux minutes, et vous pouvez le faire sans donner votre nom.',
    ctaButton: 'Signaler un Problème',
  },

  hero: {
    eyebrow: 'Initiative de propreté urbaine',
    heading: 'Ensemble, Gardons Kigali Propre',
    // NEW — recentred on the action rather than the campaign.
    lead: 'Signalez une poubelle qui déborde, un caniveau bouché ou un dépôt sauvage. Vous recevrez un numéro de référence pour suivre l’avancement à tout moment.',
    reportCta: 'Signaler un Problème',
    trackCta: 'Suivre mon Signalement',
  },

  stats: {
    heading: 'Statistiques du service',
    total: 'Total Signalements',
    pending: 'Ouverts',
    resolved: 'Résolus',
    rate: 'Taux de Résolution',
    // NEW
    noData: 'Aucun signalement',
  },

  tracker: {
    heading: 'Suivre mon Signalement',
    intro: 'Entrez le numéro de référence de votre signalement pour voir son statut actuel.',
    // NEW
    inputLabel: 'Numéro de référence',
    // NEW
    inputHint: "Le code affiché lors de l’envoi, par exemple CK-21-7KQ4MZ.",
    placeholder: "CK-21-7KQ4MZ",
    submit: 'Suivre',
    // NEW
    working: 'Vérification…',
    // NEW
    resultsLabel: 'Statut du signalement',
    noDetails: 'Aucun détail supplémentaire fourni.',
  },

  form: {
    heading: 'Soumettre un Rapport de Propreté',
    intro:
      'Sélectionnez une catégorie, précisez l’emplacement et envoyez. Le signalement est transmis aux agents environnementaux du secteur.',
    categoryLegend: 'Quel problème signalez-vous ?',
    urgencyLegend: 'Quel est le niveau d’urgence ?',
    optional: 'optionnel',
    // NEW
    requiredNote: 'Les champs marqués d’un astérisque sont obligatoires.',
    locationLabel: 'Emplacement précis ou repère',
    // NEW
    locationHint: 'Soyez aussi précis que possible pour que l’équipe puisse le trouver.',
    locationPlaceholder: 'Devant l’entrée de CHUK, Gare de Nyabugogo',
    sectorLabel: 'District et secteur',
    sectorPlaceholder: 'Gasabo, Remera',
    // NEW
    districtLabel: 'District',
    chooseDistrict: 'Choisissez un district…',
    sectorOnlyLabel: 'Secteur',
    chooseSector: 'Choisissez un secteur…',
    cellLabel: 'Cellule',
    cellHint: 'La cellule détermine quel responsable local reçoit votre signalement.',
    cellPlaceholder: 'Rukiri I',
    villageLabel: 'Village',
    villagePlaceholder: 'Amajyambere',
    detailsLabel: 'Détails supplémentaires',
    detailsPlaceholder: 'Décrivez la nature ou l’ampleur du problème.',
    // NEW
    contactHeading: 'Vos coordonnées',
    // NEW
    privacyNotice:
      'Vous pouvez signaler anonymement. Si vous laissez votre nom ou vos coordonnées, ils servent uniquement au suivi de ce signalement et ne sont jamais affichés publiquement.',
    nameLabel: 'Votre nom',
    namePlaceholder: '',
    contactLabel: 'Téléphone ou email',
    contactPlaceholder: '078XXXXXXX',
    submit: 'Soumettre le Signalement',
    // NEW
    submitting: 'Envoi…',
    photoLabel: "Ajouter une photo",
    photoHint: "Une image aide l’équipe à savoir quoi apporter. Les données de localisation contenues dans la photo sont supprimées.",
    photoRemove: "Retirer la photo",
    gpsButton: "Utiliser ma position actuelle",
    gpsHint: "Facultatif. Aide l’équipe à trouver l’endroit exact. Vous devez tout de même remplir les champs ci-dessous.",
  },

  success: {
    heading: 'Signalement envoyé',
    body: 'Merci. Votre signalement a été enregistré et transmis pour action.',
    refLabel: 'Votre numéro de référence',
    // NEW
    keepSafe: 'Notez-le. Il vous sera nécessaire pour suivre l’avancement.',
    copy: 'Copier le Numéro',
    track: 'Suivre ce Signalement',
    // NEW
    another: 'Envoyer un autre signalement',
    linkedNotice: "Un signalement similaire est déjà ouvert à proximité, le vôtre y a donc été lié. Il lui donne plus de poids et aide l’équipe à agir plus vite.",
  },

  feed: {
    heading: 'Signalements Récents',
    // NEW
    searchLabel: 'Rechercher dans les signalements récents',
    searchPlaceholder: 'Rechercher par secteur ou repère',
    empty: 'Aucun signalement n’a encore été déposé.',
    noMatches: 'Aucun signalement ne correspond à votre recherche.',
    defaultSector: 'Ville de Kigali',
  },

  ui: {
    tabHome: "Accueil",
    tabTrack: "Suivre",
    tabReport: "Signaler",
    tabFeed: "Signalements",
    tabStaff: "Équipe",
    themeLabel: "Basculer entre clair et sombre",
    installApp: "Installer l’application",
    live: "En direct",
    liveHeading: "La ville en ce moment",
    quickTrackLabel: "Déjà signalé ? Entrez votre référence.",
    quickTrackButton: "Voir le statut",
    filterAll: "Tous",
    stepIssue: "Le problème",
    stepWhere: "Le lieu",
    stepDetails: "Détails",
    stepYou: "Vérifier",
    next: "Continuer",
    back: "Retour",
    reviewHeading: "Vérifiez avant d’envoyer",
    share: "Partager",
    myReports: "Mes signalements sur cet appareil",
    languageLabel: "Langue",
    openLabel: "Ouverts",
    howEyebrow: "La simplicité avant tout",
    feedEyebrow: "Dans toute la ville",
  },

  categories: {
    'full-bin': 'Poubelle Pleine',
    'blocked-drain': 'Caniveau Bouché',
    'illegal-dumping': 'Dépôt Sauvage',
    litter: 'Déchets Jetés',
    other: 'Autre Problème',
  },

  urgencies: {
    low: 'Faible',
    medium: 'Moyenne',
    high: 'Très Urgent',
  },

  statuses: {
    pending: "Reçu",
    in_progress: "En Cours",
    done: "Résolu",
    notdone: "Non Résolu",
    reopened: "Rouvert",
  },

  footer: {
    // NEW
    operatorLine: 'Ce service est exploité par l’Initiative Clean Kigali.',
    description: 'Un service de signalement pour les problèmes de propreté et de déchets dans la Ville de Kigali.',
    resourcesHeading: 'Ressources',
    partnersHeading: 'Partenaires Publics',
    cityLink: 'Ville de Kigali',
    remaLink: 'REMA Rwanda',
    adminLink: 'Accès Administration',
    // NEW
    dataNote:
      'Les informations transmises dans un signalement servent uniquement à résoudre le problème de propreté signalé.',
  },

  errors: {
    unknownRef: 'Numéro de référence invalide.',
    trackLimited: 'Trop de recherches depuis ce réseau. Veuillez patienter quelques minutes et réessayer.',
    submitLimited: 'Vous avez soumis plusieurs signalements récemment. Veuillez réessayer plus tard.',
    invalidInput: 'Veuillez vérifier les champs obligatoires et réessayer.',
    submitError: 'Une erreur est survenue lors de l’enregistrement de votre signalement. Veuillez réessayer.',
    sessionExpired: 'Votre session a expiré. Veuillez recharger la page et soumettre à nouveau.',
    photoRejected: "Cette photo n’a pas pu être utilisée. Veuillez choisir une image JPEG ou PNG, ou envoyer le signalement sans photo.",
    photoTooLarge: "Cette photo est trop volumineuse. Veuillez en choisir une plus petite, ou envoyer le signalement sans photo.",
    feedbackNotAllowed: "Ce signalement ne peut plus être mis à jour de cette façon.",
  },

  client: {
    emptyRef: 'Entrez un numéro de référence.',
    // NEW
    networkError: 'Service inaccessible. Vérifiez votre connexion et réessayez.',
    invalidRef: 'Numéro invalide. Veuillez réessayer.',
    copied: 'Code de référence copié !',
    // NEW
    copyFailed: 'Copie automatique impossible. Veuillez noter le numéro.',
    detailsHeader: 'Détails du Signalement',
    timelineHeader: 'Avancement',
    labelRef: 'Référence',
    labelCategory: 'Catégorie',
    labelUrgency: 'Urgence',
    labelLocation: 'Lieu',
    labelSector: 'Secteur',
    labelDetails: 'Description',
    labelDate: 'Signalé le',
    noMatches: 'Aucun signalement ne correspond à votre recherche.',
    // NEW
    searchCleared: 'Affichage de tous les signalements récents.',
    statuses: {
      pending: "Reçu",
      in_progress: "En Cours",
      done: "Résolu",
      notdone: "Non Résolu",
      reopened: "Rouvert",
    },
    labelTarget: "Date cible",
    overdueNote: "Ce signalement a dépassé sa date cible, et l’équipe a été alertée.",
    photoAlt: "Photo jointe à ce signalement",
    eventCreated: "Signalement envoyé",
    eventStatuses: {
      pending: "Remis dans la file d’attente",
      in_progress: "L’équipe a commencé le travail",
      done: "Marqué comme résolu",
      notdone: "Clôturé sans solution",
      reopened: "Rouvert par l’auteur du signalement",
    },
    eventConfirmed: "Solution confirmée par l’auteur du signalement",
    eventNote: "Message de l’équipe",
    feedbackHeading: "Le problème a-t-il vraiment disparu ?",
    feedbackBody: "Vous connaissez bien cet endroit. Dites-nous s’il a réellement été réglé.",
    confirmButton: "Oui, c’est réglé",
    reopenButton: "Non, le problème persiste",
    reopenNoteLabel: "Qu’est-ce qui ne va toujours pas ? (facultatif)",
    reopenSubmit: "Renvoyer à l’équipe",
    cancel: "Annuler",
    feedbackConfirmed: "Merci d’avoir confirmé la solution.",
    feedbackReopened: "Votre signalement a été rouvert et renvoyé à l’équipe.",
    confirmedNote: "Vous avez confirmé que c’était réglé. Merci.",
    gpsWorking: "Recherche de votre position…",
    gpsCaptured: "Position enregistrée, précise à environ {m} mètres.",
    gpsFailed: "Impossible d’obtenir votre position. Vous pouvez tout de même envoyer le signalement en remplissant les champs ci-dessous.",
    gpsOutside: "Cette position semble être hors de Kigali, elle n’a donc pas été enregistrée.",
    photoWrongType: "Veuillez choisir une photo.",
    photoProcessing: "Préparation de votre photo…",
    draftRestored: "Nous avons restauré le signalement que vous aviez commencé.",
    draftDiscard: "Recommencer",
    fieldRequired: "Veuillez remplir ce champ pour continuer.",
    stepOf: "Étape {n} sur {total}",
    removeSaved: "Retirer",
    shareText: "Référence de mon signalement Clean Kigali :",
    categories: {
      'full-bin': 'Poubelle Pleine',
      'blocked-drain': 'Caniveau Bouché',
      'illegal-dumping': 'Dépôt Sauvage',
      litter: 'Déchets Jetés',
      other: 'Autre Problème',
    },
    urgencies: {
      low: 'Faible',
      medium: 'Moyenne',
      high: 'Très Urgent',
    },
  },
};
