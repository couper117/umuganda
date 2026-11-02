/**
 * English strings.
 *
 * Wording is carried over from indexe.php unchanged wherever the original had
 * a phrase for it, so the port is not also a rewrite of the copy. New strings
 * exist only where the redesign added something the PHP page did not have: the
 * operator line, the privacy notice, field hints and the status messages that
 * replaced alert() dialogs.
 */

import type { Strings } from './index';

export const en: Strings = {
  htmlLang: 'en',
  shortCode: 'EN',
  nativeName: 'English',
  pageTitle: 'Clean Kigali — Together, We Keep Kigali Clean',
  metaDescription:
    'Report overflowing bins, blocked drains, illegal dumping and litter in the City of Kigali, and track the progress of your report.',
  skipLink: 'Skip to main content',

  pages: {
    home: {
      title: 'Clean Kigali — Together, We Keep Kigali Clean',
      description:
        'Report overflowing bins, blocked drains, illegal dumping and litter in the City of Kigali, and track the progress of your report.',
    },
    report: {
      title: 'Report an Issue — Clean Kigali',
      description:
        'Tell us about an overflowing bin, a blocked drain, illegal dumping or litter anywhere in the City of Kigali.',
    },
    track: {
      title: 'Track My Report — Clean Kigali',
      description: 'Enter your CK reference number to see the current status of a sanitation report.',
    },
    feed: {
      title: 'Recent Reports — Clean Kigali',
      description: 'Browse recent sanitation reports filed by residents across the City of Kigali.',
    },
  },

  masthead: {
    operator: 'Clean Kigali Initiative',
    description: 'Community sanitation reporting service for the City of Kigali',
    chooseLanguage: 'Choose language',
  },

  nav: {
    label: 'Main navigation',
    menu: 'Menu',
    closeMenu: 'Close menu',
    home: 'Home',
    track: 'Track My Report',
    report: 'Report an Issue',
    reports: 'Recent Reports',
    admin: 'Staff Login',
  },

  home: {
    howHeading: 'How it works',
    howIntro: 'Three steps, a couple of minutes, and no account needed.',
    steps: [
      {
        title: 'Describe the problem',
        body: 'Pick the type of issue, mark how urgent it is, and tell us exactly where it is. Adding your name and contact is optional.',
      },
      {
        title: 'Get your reference',
        body: 'You receive a reference number the moment your report is saved. Write it down — it is how you check progress later.',
      },
      {
        title: 'The team responds',
        body: 'Your report reaches the environmental officers for that area. Track the reference at any time to see where it has got to.',
      },
    ],
    recentHeading: 'Recently reported',
    recentIntro: 'The latest issues residents have flagged across the city.',
    viewAll: 'See all reports',
    ctaHeading: 'Seen something that needs cleaning up?',
    ctaBody: 'It takes about two minutes, and you can do it without giving your name.',
    ctaButton: 'Report an Issue',
  },

  hero: {
    eyebrow: 'Citywide cleanup initiative',
    heading: 'Together, We Keep Kigali Clean',
    lead: 'Report an overflowing waste bin, a blocked drain or illegal dumping. You will get a reference number you can use to check progress at any time.',
    reportCta: 'Report an Issue',
    trackCta: 'Track My Report',
  },

  stats: {
    heading: 'Service statistics',
    total: 'Total Reports',
    pending: 'Open',
    resolved: 'Resolved',
    rate: 'Resolved Rate',
    noData: 'No reports yet',
  },

  tracker: {
    heading: 'Track My Report',
    intro: 'Enter the reference number from your report to see its current status.',
    inputLabel: 'Reference number',
    inputHint: "The code shown when you submitted, for example CK-21-7KQ4MZ.",
    placeholder: "CK-21-7KQ4MZ",
    submit: 'Track Report',
    working: 'Checking…',
    resultsLabel: 'Report status',
    noDetails: 'No additional details provided.',
  },

  form: {
    heading: 'Submit a Cleanup Report',
    intro: 'Choose the type of issue, say where it is, and send. Reports are passed to the environmental officers for the area.',
    categoryLegend: 'What issue are you reporting?',
    urgencyLegend: 'How urgent is it?',
    optional: 'optional',
    requiredNote: 'Fields marked with an asterisk are required.',
    locationLabel: 'Exact location or landmark',
    locationHint: 'Be as specific as you can, so the team can find it.',
    locationPlaceholder: 'Near CHUK entrance, Nyabugogo Taxi Park',
    sectorLabel: 'District and sector',
    sectorPlaceholder: 'Gasabo, Remera',
    districtLabel: 'District',
    chooseDistrict: 'Choose a district…',
    sectorOnlyLabel: 'Sector',
    chooseSector: 'Choose a sector…',
    cellLabel: 'Cell',
    cellHint: 'The cell decides which local leader receives your report.',
    cellPlaceholder: 'Rukiri I',
    villageLabel: 'Village',
    villagePlaceholder: 'Amajyambere',
    detailsLabel: 'Additional details',
    detailsPlaceholder: 'Describe the size or context of the problem.',
    contactHeading: 'Your details',
    privacyNotice:
      'You can report anonymously. If you leave your name or contact details they are used only to follow up on this report, and are never shown publicly.',
    nameLabel: 'Your name',
    namePlaceholder: '',
    contactLabel: 'Phone or email',
    contactPlaceholder: '078XXXXXXX',
    submit: 'Submit Report',
    submitting: 'Sending…',
    photoLabel: "Add a photo",
    photoHint: "A picture helps the team see what to bring. Location details stored inside the photo are removed.",
    photoRemove: "Remove photo",
    gpsButton: "Use my current location",
    gpsHint: "Optional. Helps the team find the exact spot. You still need to fill in the fields below.",
  },

  success: {
    heading: 'Report submitted',
    body: 'Thank you. Your report has been recorded and passed on for action.',
    refLabel: 'Your reference number',
    keepSafe: 'Write this down. You need it to check progress later.',
    copy: 'Copy reference number',
    track: 'Track this report',
    another: 'Submit another report',
    linkedNotice: "A similar report is already open nearby, so we linked yours to it. Your report adds weight and helps the team act sooner.",
  },

  feed: {
    heading: 'Recent Reports',
    searchLabel: 'Search recent reports',
    searchPlaceholder: 'Search a sector or landmark',
    empty: 'No reports have been filed yet.',
    noMatches: 'No reports match your search.',
    defaultSector: 'Kigali City',
  },

  ui: {
    tabHome: "Home",
    tabTrack: "Track",
    tabReport: "Report",
    tabFeed: "Reports",
    tabStaff: "Staff",
    themeLabel: "Switch between light and dark",
    installApp: "Install the app",
    live: "Live",
    liveHeading: "The city right now",
    quickTrackLabel: "Already reported? Enter your reference.",
    quickTrackButton: "Check status",
    filterAll: "All",
    stepIssue: "The issue",
    stepWhere: "Location",
    stepDetails: "Details",
    stepYou: "Review",
    next: "Continue",
    back: "Back",
    reviewHeading: "Check before you send",
    share: "Share",
    myReports: "My reports on this device",
    languageLabel: "Language",
    openLabel: "Open",
    howEyebrow: "Simple by design",
    feedEyebrow: "Across the city",
  },

  categories: {
    'full-bin': 'Overflowing Bin',
    'blocked-drain': 'Blocked Drain',
    'illegal-dumping': 'Illegal Dumping',
    litter: 'General Litter',
    other: 'Other Issue',
  },

  urgencies: {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  },

  statuses: {
    pending: "Received",
    in_progress: "In Progress",
    done: "Resolved",
    notdone: "Not Resolved",
    reopened: "Reopened",
  },

  footer: {
    operatorLine: 'This service is operated by the Clean Kigali Initiative.',
    description: 'A reporting service for sanitation and waste issues in the City of Kigali.',
    resourcesHeading: 'Resources',
    partnersHeading: 'Partners',
    cityLink: 'City of Kigali',
    remaLink: 'REMA Rwanda',
    adminLink: 'Admin Login Portal',
    dataNote: 'Information submitted in a report is used only to resolve the sanitation issue reported.',
  },

  errors: {
    unknownRef: 'Invalid reference number.',
    trackLimited: 'Too many lookups from this network. Please wait a few minutes and try again.',
    submitLimited: 'You have submitted several reports recently. Please try again later.',
    invalidInput: 'Please check the required fields and try again.',
    submitError: 'Something went wrong while saving your report. Please try again.',
    sessionExpired: 'Your session expired. Please reload the page and submit again.',
    photoRejected: "That photo could not be used. Please choose a JPEG or PNG image, or send the report without one.",
    photoTooLarge: "That photo is too large. Please choose a smaller one, or send the report without it.",
    feedbackNotAllowed: "This report can no longer be updated this way.",
  },

  client: {
    emptyRef: 'Please enter a reference number.',
    networkError: 'Could not reach the service. Please check your connection and try again.',
    invalidRef: 'Invalid reference number. Please check it and try again.',
    copied: 'Reference number copied.',
    copyFailed: 'Could not copy automatically. Please write the number down.',
    detailsHeader: 'Report details',
    timelineHeader: 'Progress',
    labelRef: 'Reference',
    labelCategory: 'Category',
    labelUrgency: 'Urgency',
    labelLocation: 'Location',
    labelSector: 'Sector',
    labelDetails: 'Details',
    labelDate: 'Reported',
    noMatches: 'No reports match your search.',
    searchCleared: 'Showing all recent reports.',
    statuses: {
      pending: "Received",
      in_progress: "In Progress",
      done: "Resolved",
      notdone: "Not Resolved",
      reopened: "Reopened",
    },
    labelTarget: "Target date",
    overdueNote: "This report has passed its target date, and the team has been alerted.",
    photoAlt: "Photo attached to this report",
    eventCreated: "Report submitted",
    eventStatuses: {
      pending: "Returned to the queue",
      in_progress: "The team started work",
      done: "Marked as resolved",
      notdone: "Closed without a fix",
      reopened: "Reopened by the reporter",
    },
    eventConfirmed: "Fix confirmed by the reporter",
    eventNote: "Update from the team",
    feedbackHeading: "Is the problem really gone?",
    feedbackBody: "You know this place best. Please tell us whether it was actually fixed.",
    confirmButton: "Yes, it is fixed",
    reopenButton: "No, it is still a problem",
    reopenNoteLabel: "What is still wrong? (optional)",
    reopenSubmit: "Send it back to the team",
    cancel: "Cancel",
    feedbackConfirmed: "Thank you for confirming the fix.",
    feedbackReopened: "Your report has been reopened and sent back to the team.",
    confirmedNote: "You confirmed this was fixed. Thank you.",
    gpsWorking: "Finding your location…",
    gpsCaptured: "Location saved, accurate to about {m} metres.",
    gpsFailed: "Could not get your location. You can still send the report by filling in the fields below.",
    gpsOutside: "That location appears to be outside Kigali, so it was not saved.",
    photoWrongType: "Please choose a photo.",
    photoProcessing: "Preparing your photo…",
    draftRestored: "We restored the report you had started.",
    draftDiscard: "Start over",
    fieldRequired: "Please fill this in to continue.",
    stepOf: "Step {n} of {total}",
    removeSaved: "Remove",
    shareText: "My Clean Kigali report reference:",
    categories: {
      'full-bin': 'Overflowing Bin',
      'blocked-drain': 'Blocked Drain',
      'illegal-dumping': 'Illegal Dumping',
      litter: 'General Litter',
      other: 'Other Issue',
    },
    urgencies: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
    },
  },
};
