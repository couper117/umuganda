/**
 * Kiswahili strings.
 *
 * Added 2026-08-21. Kiswahili became an official language of Rwanda in 2017,
 * so it belongs alongside Kinyarwanda, English and French on a City of Kigali
 * service.
 *
 * Unlike the other three tables, none of this is carried over from a PHP page —
 * there was never a Kiswahili version — so every string here is new and should
 * be reviewed by a native speaker before this faces the public. The register
 * aimed for is the plain, official Kiswahili used in East African government
 * services, not colloquial speech.
 */

import type { Strings } from './index';

export const sw: Strings = {
  htmlLang: 'sw',
  shortCode: 'SW',
  nativeName: 'Kiswahili',
  pageTitle: 'Clean Kigali — Kwa Pamoja, Tuweke Kigali Safi',
  metaDescription:
    'Ripoti mapipa yaliyojaa, mifereji iliyoziba, utupaji haramu wa taka na uchafu katika Jiji la Kigali, kisha fuatilia hatua iliyofikiwa.',
  skipLink: 'Rukia hadi maudhui makuu',

  pages: {
    home: {
      title: 'Clean Kigali — Kwa Pamoja, Tuweke Kigali Safi',
      description:
        'Ripoti mapipa yaliyojaa, mifereji iliyoziba, utupaji haramu wa taka na uchafu katika Jiji la Kigali, kisha fuatilia hatua iliyofikiwa.',
    },
    report: {
      title: 'Ripoti Tatizo — Clean Kigali',
      description:
        'Tuarifu kuhusu pipa lililojaa, mfereji uliyoziba, utupaji haramu wa taka au uchafu popote katika Jiji la Kigali.',
    },
    track: {
      title: 'Fuatilia Ripoti Yangu — Clean Kigali',
      description: 'Weka nambari yako ya kumbukumbu ya CK ili kuona hali ya sasa ya ripoti yako.',
    },
    feed: {
      title: 'Ripoti za Hivi Karibuni — Clean Kigali',
      description: 'Angalia ripoti za usafi zilizotolewa hivi karibuni na wakazi wa Jiji la Kigali.',
    },
  },

  masthead: {
    operator: 'Clean Kigali Initiative',
    description: 'Huduma ya jamii ya kuripoti masuala ya usafi kwa Jiji la Kigali',
    chooseLanguage: 'Chagua lugha',
  },

  nav: {
    label: 'Urambazaji mkuu',
    menu: 'Menyu',
    closeMenu: 'Funga menyu',
    home: 'Mwanzo',
    track: 'Fuatilia Ripoti',
    report: 'Ripoti Tatizo',
    reports: 'Ripoti za Hivi Karibuni',
    admin: 'Kuingia kwa Wafanyakazi',
  },

  home: {
    howHeading: 'Jinsi inavyofanya kazi',
    howIntro: 'Hatua tatu, dakika chache, na huhitaji akaunti.',
    steps: [
      {
        title: 'Eleza tatizo',
        body: 'Chagua aina ya tatizo, onyesha kiwango cha dharura, na tueleze mahali lilipo hasa. Kuweka jina na mawasiliano yako ni hiari.',
      },
      {
        title: 'Pata nambari yako',
        body: 'Unapewa nambari ya kumbukumbu mara tu ripoti yako inapohifadhiwa. Iandike — ndiyo utakayotumia kufuatilia baadaye.',
      },
      {
        title: 'Timu inachukua hatua',
        body: 'Ripoti yako inawafikia maafisa wa mazingira wa eneo hilo. Fuatilia nambari wakati wowote ili kuona hatua iliyofikiwa.',
      },
    ],
    recentHeading: 'Zilizoripotiwa hivi karibuni',
    recentIntro: 'Matatizo ya hivi punde yaliyoripotiwa na wakazi kote jijini.',
    viewAll: 'Ona ripoti zote',
    ctaHeading: 'Umeona kitu kinachohitaji kusafishwa?',
    ctaBody: 'Inachukua takribani dakika mbili, na unaweza kufanya hivyo bila kutoa jina lako.',
    ctaButton: 'Ripoti Tatizo',
  },

  hero: {
    eyebrow: 'Kampeni ya usafi jijini',
    heading: 'Kwa Pamoja, Tuweke Kigali Safi',
    lead: 'Ripoti pipa lililojaa, mfereji uliyoziba au utupaji haramu wa taka. Utapokea nambari ya kumbukumbu unayoweza kutumia kuangalia maendeleo wakati wowote.',
    reportCta: 'Ripoti Tatizo',
    trackCta: 'Fuatilia Ripoti',
  },

  stats: {
    heading: 'Takwimu za huduma',
    total: 'Jumla ya Ripoti',
    pending: 'Zilizo Wazi',
    resolved: 'Zilizotatuliwa',
    rate: 'Kiwango cha Utatuzi',
    noData: 'Hakuna ripoti bado',
  },

  tracker: {
    heading: 'Fuatilia Ripoti Yangu',
    intro: 'Weka nambari ya kumbukumbu ya ripoti yako ili kuona hali yake ya sasa.',
    inputLabel: 'Nambari ya kumbukumbu',
    inputHint: "Msimbo uliyoonyeshwa ulipowasilisha, kwa mfano CK-21-7KQ4MZ.",
    placeholder: "CK-21-7KQ4MZ",
    submit: 'Fuatilia Ripoti',
    working: 'Inaangalia…',
    resultsLabel: 'Hali ya ripoti',
    noDetails: 'Hakuna maelezo ya ziada yaliyotolewa.',
  },

  form: {
    heading: 'Wasilisha Ripoti ya Usafi',
    intro: 'Chagua aina ya tatizo, eleza lilipo, kisha tuma. Ripoti hupelekwa kwa maafisa wa mazingira wa eneo hilo.',
    categoryLegend: 'Unaripoti tatizo la aina gani?',
    urgencyLegend: 'Ni la dharura kiasi gani?',
    optional: 'hiari',
    requiredNote: 'Sehemu zenye alama ya nyota ni lazima zijazwe.',
    locationLabel: 'Mahali hasa au alama ya kutambulisha',
    locationHint: 'Kuwa mahususi kadri uwezavyo, ili timu iweze kupafikia.',
    locationPlaceholder: 'Karibu na lango la CHUK, Stendi ya Nyabugogo',
    sectorLabel: 'Wilaya na sekta',
    sectorPlaceholder: 'Gasabo, Remera',
    districtLabel: 'Wilaya',
    chooseDistrict: 'Chagua wilaya…',
    sectorOnlyLabel: 'Sekta',
    chooseSector: 'Chagua sekta…',
    cellLabel: 'Kata',
    cellHint: 'Kata ndiyo huamua kiongozi wa eneo atakayepokea ripoti yako.',
    cellPlaceholder: 'Rukiri I',
    villageLabel: 'Kijiji',
    villagePlaceholder: 'Amajyambere',
    detailsLabel: 'Maelezo ya ziada',
    detailsPlaceholder: 'Eleza ukubwa au mazingira ya tatizo.',
    contactHeading: 'Maelezo yako',
    privacyNotice:
      'Unaweza kuripoti bila kujitambulisha. Ukiacha jina au mawasiliano yako, hutumika tu kufuatilia ripoti hii, na hayaonyeshwi hadharani kamwe.',
    nameLabel: 'Jina lako',
    namePlaceholder: '',
    contactLabel: 'Simu au barua pepe',
    contactPlaceholder: '078XXXXXXX',
    submit: 'Wasilisha Ripoti',
    submitting: 'Inatuma…',
    photoLabel: "Ongeza picha",
    photoHint: "Picha husaidia timu kujua cha kuleta. Taarifa za mahali zilizo ndani ya picha huondolewa.",
    photoRemove: "Ondoa picha",
    gpsButton: "Tumia mahali nilipo sasa",
    gpsHint: "Si lazima. Husaidia timu kupata mahali halisi. Bado unahitaji kujaza sehemu zilizo hapa chini.",
  },

  success: {
    heading: 'Ripoti imewasilishwa',
    body: 'Asante. Ripoti yako imehifadhiwa na kupelekwa ili hatua zichukuliwe.',
    refLabel: 'Nambari yako ya kumbukumbu',
    keepSafe: 'Iandike. Utaihitaji ili kuangalia maendeleo baadaye.',
    copy: 'Nakili nambari ya kumbukumbu',
    track: 'Fuatilia ripoti hii',
    another: 'Wasilisha ripoti nyingine',
    linkedNotice: "Ripoti inayofanana tayari iko wazi karibu, kwa hiyo tumeunganisha yako nayo. Ripoti yako inaongeza uzito na kusaidia timu kuchukua hatua haraka.",
  },

  feed: {
    heading: 'Ripoti za Hivi Karibuni',
    searchLabel: 'Tafuta katika ripoti za hivi karibuni',
    searchPlaceholder: 'Tafuta sekta au alama ya mahali',
    empty: 'Hakuna ripoti iliyowasilishwa bado.',
    noMatches: 'Hakuna ripoti inayolingana na utafutaji wako.',
    defaultSector: 'Jiji la Kigali',
  },

  ui: {
    tabHome: "Nyumbani",
    tabTrack: "Fuatilia",
    tabReport: "Ripoti",
    tabFeed: "Ripoti zote",
    tabStaff: "Wafanyakazi",
    themeLabel: "Badili kati ya mwanga na giza",
    installApp: "Sakinisha programu",
    live: "Moja kwa moja",
    liveHeading: "Jiji kwa sasa",
    quickTrackLabel: "Tayari umeripoti? Weka msimbo wako.",
    quickTrackButton: "Angalia hali",
    filterAll: "Zote",
    stepIssue: "Tatizo",
    stepWhere: "Mahali",
    stepDetails: "Maelezo",
    stepYou: "Hakiki",
    next: "Endelea",
    back: "Rudi",
    reviewHeading: "Hakiki kabla ya kutuma",
    share: "Shiriki",
    myReports: "Ripoti zangu kwenye kifaa hiki",
    languageLabel: "Lugha",
    openLabel: "Zilizo wazi",
    howEyebrow: "Rahisi kwa makusudi",
    feedEyebrow: "Katika jiji lote",
  },

  categories: {
    'full-bin': 'Pipa Lililojaa',
    'blocked-drain': 'Mfereji Uliyoziba',
    'illegal-dumping': 'Utupaji Haramu',
    litter: 'Uchafu wa Kawaida',
    other: 'Tatizo Lingine',
  },

  urgencies: {
    low: 'Chini',
    medium: 'Wastani',
    high: 'Juu',
  },

  statuses: {
    pending: "Imepokelewa",
    in_progress: "Inaendelea",
    done: "Imetatuliwa",
    notdone: "Haijatatuliwa",
    reopened: "Imefunguliwa Tena",
  },

  footer: {
    operatorLine: 'Huduma hii inaendeshwa na Clean Kigali Initiative.',
    description: 'Huduma ya kuripoti masuala ya usafi na taka katika Jiji la Kigali.',
    resourcesHeading: 'Rasilimali',
    partnersHeading: 'Washirika',
    cityLink: 'Jiji la Kigali',
    remaLink: 'REMA Rwanda',
    adminLink: 'Kuingia kwa Wasimamizi',
    dataNote: 'Taarifa zinazowasilishwa katika ripoti hutumika tu kutatua tatizo la usafi lililoripotiwa.',
  },

  errors: {
    unknownRef: 'Nambari ya kumbukumbu si sahihi.',
    trackLimited: 'Maombi mengi mno kutoka mtandao huu. Tafadhali subiri dakika chache kisha ujaribu tena.',
    submitLimited: 'Umewasilisha ripoti kadhaa hivi karibuni. Tafadhali jaribu tena baadaye.',
    invalidInput: 'Tafadhali angalia sehemu zinazohitajika kisha ujaribu tena.',
    submitError: 'Hitilafu imetokea wakati wa kuhifadhi ripoti yako. Tafadhali jaribu tena.',
    sessionExpired: 'Muda wa kipindi chako umeisha. Tafadhali pakia ukurasa upya kisha uwasilishe tena.',
    photoRejected: "Picha hiyo haikuweza kutumika. Tafadhali chagua picha ya JPEG au PNG, au tuma ripoti bila picha.",
    photoTooLarge: "Picha hiyo ni kubwa mno. Tafadhali chagua ndogo zaidi, au tuma ripoti bila picha.",
    feedbackNotAllowed: "Ripoti hii haiwezi tena kusasishwa kwa njia hii.",
  },

  client: {
    emptyRef: 'Tafadhali weka nambari ya kumbukumbu.',
    networkError: 'Imeshindwa kufikia huduma. Tafadhali angalia muunganisho wako kisha ujaribu tena.',
    invalidRef: 'Nambari ya kumbukumbu si sahihi. Tafadhali iangalie kisha ujaribu tena.',
    copied: 'Nambari ya kumbukumbu imenakiliwa.',
    copyFailed: 'Imeshindwa kunakili kiotomatiki. Tafadhali andika nambari.',
    detailsHeader: 'Maelezo ya ripoti',
    timelineHeader: 'Maendeleo',
    labelRef: 'Kumbukumbu',
    labelCategory: 'Aina',
    labelUrgency: 'Dharura',
    labelLocation: 'Mahali',
    labelSector: 'Sekta',
    labelDetails: 'Maelezo',
    labelDate: 'Iliripotiwa',
    noMatches: 'Hakuna ripoti inayolingana na utafutaji wako.',
    searchCleared: 'Inaonyesha ripoti zote za hivi karibuni.',
    statuses: {
      pending: "Imepokelewa",
      in_progress: "Inaendelea",
      done: "Imetatuliwa",
      notdone: "Haijatatuliwa",
      reopened: "Imefunguliwa Tena",
    },
    labelTarget: "Tarehe lengwa",
    overdueNote: "Ripoti hii imepita tarehe yake lengwa, na timu imearifiwa.",
    photoAlt: "Picha iliyoambatishwa kwenye ripoti hii",
    eventCreated: "Ripoti imewasilishwa",
    eventStatuses: {
      pending: "Imerudishwa kwenye foleni",
      in_progress: "Timu imeanza kazi",
      done: "Imewekwa kama imetatuliwa",
      notdone: "Imefungwa bila kutatuliwa",
      reopened: "Imefunguliwa tena na mtoa ripoti",
    },
    eventConfirmed: "Mtoa ripoti amethibitisha kutatuliwa",
    eventNote: "Taarifa kutoka kwa timu",
    feedbackHeading: "Je, tatizo limeisha kweli?",
    feedbackBody: "Unapafahamu mahali hapa vizuri. Tafadhali tuambie kama limetatuliwa kweli.",
    confirmButton: "Ndiyo, limetatuliwa",
    reopenButton: "Hapana, bado ni tatizo",
    reopenNoteLabel: "Nini bado hakijakaa sawa? (si lazima)",
    reopenSubmit: "Rudisha kwa timu",
    cancel: "Ghairi",
    feedbackConfirmed: "Asante kwa kuthibitisha.",
    feedbackReopened: "Ripoti yako imefunguliwa tena na kurudishwa kwa timu.",
    confirmedNote: "Umethibitisha kuwa limetatuliwa. Asante.",
    gpsWorking: "Inatafuta mahali ulipo…",
    gpsCaptured: "Mahali pamehifadhiwa, kwa usahihi wa takriban mita {m}.",
    gpsFailed: "Imeshindwa kupata mahali ulipo. Bado unaweza kutuma ripoti kwa kujaza sehemu zilizo hapa chini.",
    gpsOutside: "Mahali hapo panaonekana kuwa nje ya Kigali, kwa hiyo hapakuhifadhiwa.",
    photoWrongType: "Tafadhali chagua picha.",
    photoProcessing: "Inatayarisha picha yako…",
    draftRestored: "Tumerejesha ripoti uliyokuwa umeanza.",
    draftDiscard: "Anza upya",
    fieldRequired: "Tafadhali jaza hapa ili kuendelea.",
    stepOf: "Hatua {n} kati ya {total}",
    removeSaved: "Ondoa",
    shareText: "Msimbo wa ripoti yangu ya Clean Kigali:",
    categories: {
      'full-bin': 'Pipa Lililojaa',
      'blocked-drain': 'Mfereji Uliyoziba',
      'illegal-dumping': 'Utupaji Haramu',
      litter: 'Uchafu wa Kawaida',
      other: 'Tatizo Lingine',
    },
    urgencies: {
      low: 'Chini',
      medium: 'Wastani',
      high: 'Juu',
    },
  },
};
