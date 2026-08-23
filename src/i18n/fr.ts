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
    pending: 'En Cours',
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
    inputHint: 'Le code affiché lors de l’envoi, par exemple CK-21.',
    placeholder: 'CK-21',
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
    pending: 'En Cours',
    done: 'Résolu',
    notdone: 'Non Résolu',
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
    timelineSubmitted: 'Signalement reçu',
    timelineProgress: 'En cours de traitement',
    timelineResolved: 'Résolu et nettoyé',
    timelineNotDone: 'Non résolu',
    noMatches: 'Aucun signalement ne correspond à votre recherche.',
    // NEW
    searchCleared: 'Affichage de tous les signalements récents.',
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
