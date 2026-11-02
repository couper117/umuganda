/**
 * Kinyarwanda strings.
 *
 * Wording carried over from index.php verbatim wherever it existed, including
 * the $CK_STRINGS error messages. Strings marked NEW below did not exist in the
 * PHP page — they were added by the redesign (operator line, privacy notice,
 * field hints, and the messages that replaced alert() dialogs) and are worth a
 * native speaker's review before this goes in front of the public.
 */

import type { Strings } from './index';

export const rw: Strings = {
  htmlLang: 'rw',
  shortCode: 'RW',
  nativeName: 'Ikinyarwanda',
  pageTitle: 'Clean Kigali — Fatanya Natwe Kugira Kigali Isukuye',
  metaDescription:
    'Tanga raporo ku mapubure yuzuye, imiyoboro yazibye, no guta imyanda ahatemewe mu Mujyi wa Kigali, hanyuma ukurikirane uko bikemurwa.',
  skipLink: 'Simbukira ku bikubiyemo',

  // NEW — the four-page split needs a title per page.
  pages: {
    home: {
      title: 'Clean Kigali — Fatanya Natwe Kugira Kigali Isukuye',
      description:
        'Tanga raporo ku mapubure yuzuye, imiyoboro yazibye, no guta imyanda ahatemewe mu Mujyi wa Kigali, hanyuma ukurikirane uko bikemurwa.',
    },
    report: {
      title: 'Tanga Iraporo — Clean Kigali',
      description:
        "Tubwire ku ipubure yuzuye, umuyoboro wazibye, cyangwa imyanda yatawe ahatemewe ahantu hose mu Mujyi wa Kigali.",
    },
    track: {
      title: 'Kurikirana Iraporo — Clean Kigali',
      description: "Andika nimero y'iraporo yawe ya CK urebe aho igeze.",
    },
    feed: {
      title: 'Raporo Ziheruka — Clean Kigali',
      description: "Reba raporo z'isuku ziheruka gutangwa n'abaturage mu Mujyi wa Kigali.",
    },
  },

  masthead: {
    operator: 'Clean Kigali Initiative',
    // NEW
    description: "Serivisi yo gutanga raporo z'isuku mu Mujyi wa Kigali",
    // NEW
    chooseLanguage: 'Hitamo ururimi',
  },

  nav: {
    label: "Imiyoboro y'ingenzi",
    menu: 'Menyu',
    // NEW
    closeMenu: 'Funga menyu',
    home: 'Ahabanza',
    track: 'Kurikirana Iraporo',
    report: 'Tanga Iraporo',
    // NEW
    reports: 'Raporo Ziheruka',
    admin: 'Kwinjira kw’Abakozi',
  },

  // NEW — landing page content that the single-page version did not have.
  home: {
    howHeading: 'Uko bikorwa',
    howIntro: 'Intambwe eshatu, iminota mike, kandi ntugomba gufungura konti.',
    steps: [
      {
        title: 'Sobanura ikibazo',
        body: "Hitamo ubwoko bw'ikibazo, werekane uko cyihutirwa, hanyuma utubwire neza aho kiri. Kwandika izina n'aho wakwandikirwa ni uguhitamo.",
      },
      {
        title: "Habona nimero y'iraporo",
        body: "Uhabwa nimero y'iraporo ako kanya iraporo yawe ibitswe. Uyandike — ni yo uzakoresha mu kureba aho igeze.",
      },
      {
        title: 'Itsinda rirakemura',
        body: "Iraporo yawe igera ku bakozi b'ibidukikije bo muri ako karere. Ushobora gukurikirana iyo nimero igihe cyose ngo urebe aho bigeze.",
      },
    ],
    recentHeading: 'Ibiheruka gutangwaho raporo',
    recentIntro: 'Ibibazo biheruka kwerekanwa n’abaturage mu mujyi hose.',
    viewAll: 'Reba raporo zose',
    ctaHeading: 'Hari icyo wabonye gikeneye gusukurwa?',
    ctaBody: 'Bifata nka iminota ibiri, kandi ushobora kubikora utatanze izina ryawe.',
    ctaButton: 'Tanga Iraporo',
  },

  hero: {
    eyebrow: "Igikorwa cy'Umuganda mu Mujyi wa Kigali",
    heading: 'Fatanya Natwe Kugira Kigali Isukuye',
    // NEW — shortened from the original paragraph to lead with what to do.
    lead: "Tanga raporo ku ipubure yuzuye, umuyoboro wazibye cyangwa imyanda yatawe ahatemewe. Uzahabwa nimero y'iraporo ushobora gukoresha mu kureba uko bigenda.",
    reportCta: 'Tanga Iraporo',
    trackCta: 'Kurikirana Iraporo',
  },

  stats: {
    heading: "Imibare y'iyi serivisi",
    total: 'Raporo Zose',
    pending: 'Bitarakemuka',
    resolved: 'Ibyakemutse',
    rate: "Igipimo Cy'Ibyakemutse",
    // NEW
    noData: 'Nta raporo iratangwa',
  },

  tracker: {
    heading: 'Kurikirana Iraporo yanyu',
    intro: "Andika nimero y'iraporo yawe kugira ngo urebe uko ikibazo gikemurwa.",
    // NEW
    inputLabel: "Nimero y'iraporo",
    // NEW
    inputHint: "Nimero mwahawe igihe mwohereza, urugero CK-21-7KQ4MZ.",
    placeholder: "CK-21-7KQ4MZ",
    submit: 'Kurikirana',
    // NEW
    working: 'Turareba…',
    // NEW
    resultsLabel: "Aho iraporo igeze",
    noDetails: 'Nta bisobanuro bindi byatanzwe.',
  },

  form: {
    heading: "Tanga Iraporo y'Isuku",
    intro: "Hitamo ubwoko bw'ikibazo, andika aho giherereye, maze ubwohereze. Raporo ihita ishyikirizwa abashinzwe ibidukikije mu karere.",
    categoryLegend: "Hitamo ubwoko bw'ikibazo cy'isuku",
    urgencyLegend: 'Uburyo Kibangamye / Cyihutirwa',
    // NEW
    optional: 'si ngombwa',
    // NEW
    requiredNote: 'Ibisabwa byose bifite akamenyetso (*) ni ngombwa.',
    locationLabel: 'Aho Biherereye Neza',
    // NEW
    locationHint: 'Sobanura neza kugira ngo abakora isuku babone aho ari.',
    locationPlaceholder: 'Kwinjira kwa CHUK, Parikingi ya Nyabugogo',
    sectorLabel: 'Akarere na Umurenge',
    sectorPlaceholder: 'Gasabo, Remera',
    // NEW — structured location, added with the leader roles.
    districtLabel: 'Akarere',
    chooseDistrict: 'Hitamo akarere…',
    sectorOnlyLabel: 'Umurenge',
    chooseSector: 'Hitamo umurenge…',
    cellLabel: 'Akagari',
    cellHint: "Akagari ni ko kagena umuyobozi w'aho utuye uzakira iraporo yawe.",
    cellPlaceholder: 'Rukiri I',
    villageLabel: 'Umudugudu',
    villagePlaceholder: 'Amajyambere',
    detailsLabel: 'Ibindi Bisobanuro',
    detailsPlaceholder: 'Sobanura neza uko ikibazo giteye.',
    // NEW
    contactHeading: 'Amakuru yawe',
    // NEW
    privacyNotice:
      "Ushobora gutanga iraporo utavuze amazina yawe. Nutanga izina cyangwa telefone, bikoreshwa gusa mu gukurikirana iyi raporo, kandi ntibigaragazwa ku mugaragaro.",
    nameLabel: 'Izina ryawe',
    namePlaceholder: '',
    contactLabel: 'Terefone cyangwa Imeri',
    contactPlaceholder: '078XXXXXXX',
    submit: 'Ohereza Iraporo',
    // NEW
    submitting: 'Turohereza…',
    photoLabel: "Ongeraho ifoto",
    photoHint: "Ifoto ifasha itsinda kumenya icyo rizazana. Amakuru y’aho ifoto yafatiwe arasibwa.",
    photoRemove: "Kuraho ifoto",
    gpsButton: "Koresha aho ndi ubu",
    gpsHint: "Si ngombwa. Bifasha itsinda kubona aho ari neza. Ugomba kuzuza n’ibisabwa hasi.",
  },

  success: {
    heading: 'Iraporo Yoherejwe',
    body: 'Murakoze. Iraporo yanyu yanditswe kandi yashyikirijwe ababishinzwe.',
    refLabel: "Nimero y'Iraporo yanyu",
    // NEW
    keepSafe: 'Iyandike. Uzayikenera mu kureba uko bigenda.',
    copy: 'Kora Kopi ya Nimero',
    track: 'Kurikirana iyi Iraporo',
    // NEW
    another: 'Tanga indi raporo',
    linkedNotice: "Hari indi raporo isa n’iyi igifunguye hafi aho, none twayihuje n’iyanyu. Iraporo yanyu yongera uburemere kandi ifasha itsinda gukora vuba.",
  },

  feed: {
    heading: 'Raporo Ziherutse Gutangwa',
    // NEW
    searchLabel: 'Shakisha mu raporo ziherutse',
    searchPlaceholder: 'Shakira ku Murenge cyangwa aho byabereye',
    empty: "Nta raporo y'isuku iratangwa. Ba uwa mbere ufasha umujyi wacu!",
    noMatches: "Nta raporo yabonetse ihuye n'ibyo ushatse.",
    defaultSector: 'Umujyi wa Kigali',
  },

  ui: {
    tabHome: "Ahabanza",
    tabTrack: "Kurikirana",
    tabReport: "Menyesha",
    tabFeed: "Raporo",
    tabStaff: "Abakozi",
    themeLabel: "Hindura urumuri cyangwa umwijima",
    installApp: "Shyira porogaramu kuri telefoni",
    live: "Ako kanya",
    liveHeading: "Umujyi muri iki gihe",
    quickTrackLabel: "Mwamaze gutanga iraporo? Andika nimero yanyu.",
    quickTrackButton: "Reba aho bigeze",
    filterAll: "Byose",
    stepIssue: "Ikibazo",
    stepWhere: "Aho biherereye",
    stepDetails: "Ibisobanuro",
    stepYou: "Gusuzuma",
    next: "Komeza",
    back: "Subira inyuma",
    reviewHeading: "Reba mbere yo kohereza",
    share: "Sangiza",
    myReports: "Raporo zanjye kuri iki gikoresho",
    languageLabel: "Ururimi",
    openLabel: "Bitarakemuka",
    howEyebrow: "Biroroshye",
    feedEyebrow: "Mu mujyi wose",
  },

  categories: {
    'full-bin': 'Ipubure Yuzuye Cyane',
    'blocked-drain': 'Umuyoboro Wazibye',
    'illegal-dumping': 'Imyanda Ahatemewe',
    litter: 'Imyanda Inyanyagiye',
    other: "Ikindi Kibazo cy'Isuku",
  },

  urgencies: {
    low: 'Hasi',
    medium: 'Kuringaniza',
    high: 'Byihutirwa Cyane',
  },

  statuses: {
    pending: "Yakiriwe",
    in_progress: "Birimo Gukorwa",
    done: "Byarakemutse",
    notdone: "Ntibyakemutse",
    reopened: "Yongeye Gufungurwa",
  },

  footer: {
    // NEW
    operatorLine: 'Iyi serivisi ikorwa na Clean Kigali Initiative.',
    description: "Uburyo bwo gutanga raporo z'isuku no kubungabunga ibidukikije mu Mujyi wa Kigali.",
    resourcesHeading: 'Imiyoboro',
    partnersHeading: 'Abafatanyabikorwa',
    cityLink: 'Umujyi wa Kigali',
    remaLink: 'REMA Rwanda',
    adminLink: "Imbonerahamwe y'Ubugenzuzi",
    // NEW
    dataNote: "Amakuru yose atangwa mu raporo akoreshwa gusa mu gukemura ibibazo by'isuku.",
  },

  errors: {
    unknownRef: 'Iyi nimero ntituyizi.',
    trackLimited: 'Mwagerageje kenshi cyane. Mutegereze iminota mike hanyuma mwongere mugerageze.',
    submitLimited: 'Mwohereje raporo nyinshi mu gihe gito. Mwongere mugerageze nyuma.',
    invalidInput: 'Nyabuneka reba neza ibisabwa byose hanyuma wongere ugerageze.',
    submitError: 'Hari ikibazo kibaye mu kubika iraporo. Nyabuneka ongera ugerageze.',
    sessionExpired: 'Igihe cyanyu cyarangiye. Nyabuneka ongera ufungure urupapuro maze wohereze.',
    photoRejected: "Iyo foto ntiyakoreshejwe. Nyabuneka hitamo ifoto ya JPEG cyangwa PNG, cyangwa wohereze iraporo nta foto.",
    photoTooLarge: "Iyo foto ni nini cyane. Nyabuneka hitamo intoya, cyangwa wohereze iraporo nta foto.",
    feedbackNotAllowed: "Iyi raporo ntigishobora guhindurwa muri ubu buryo.",
  },

  client: {
    emptyRef: "Andika nimero y'iraporo.",
    // NEW
    networkError: 'Ntitwabashije kugera kuri serivisi. Reba interineti yawe hanyuma wongere ugerageze.',
    invalidRef: 'Iyi nimero ntituyizi. Ongera ugerageze.',
    copied: "Nimero y'iraporo yanditswe!",
    // NEW
    copyFailed: 'Ntibyashobotse kwikorera kopi. Nyabuneka andika nimero.',
    detailsHeader: "Amakuru y'Iraporo",
    timelineHeader: "Igipimo cy'Aho Bigeze",
    labelRef: 'Nimero',
    labelCategory: 'Ubwoko',
    labelUrgency: 'Cyihutirwa',
    labelLocation: 'Aho biri',
    labelSector: 'Umurenge',
    labelDetails: 'Ibisobanuro',
    labelDate: 'Itariki',
    noMatches: "Nta raporo yabonetse ihuye n'ibyo ushatse.",
    // NEW
    searchCleared: 'Turerekana raporo zose ziherutse.',
    statuses: {
      pending: "Yakiriwe",
      in_progress: "Birimo Gukorwa",
      done: "Byarakemutse",
      notdone: "Ntibyakemutse",
      reopened: "Yongeye Gufungurwa",
    },
    labelTarget: "Itariki iteganyijwe",
    overdueNote: "Iyi raporo yarengeje itariki yari iteganyijwe, kandi itsinda ryamenyeshejwe.",
    photoAlt: "Ifoto yometse kuri iyi raporo",
    eventCreated: "Iraporo yoherejwe",
    eventStatuses: {
      pending: "Yasubijwe ku rutonde",
      in_progress: "Itsinda ryatangiye gukora",
      done: "Byemejwe ko byakemutse",
      notdone: "Yafunzwe bitakemutse",
      reopened: "Uwayitanze yongeye kuyifungura",
    },
    eventConfirmed: "Uwatanze iraporo yemeje ko byakemutse",
    eventNote: "Ubutumwa buvuye ku itsinda",
    feedbackHeading: "Ikibazo cyakemutse koko?",
    feedbackBody: "Aho hantu murahazi neza. Nyabuneka tubwire niba cyarakemutse koko.",
    confirmButton: "Yego, cyarakemutse",
    reopenButton: "Oya, kiracyahari",
    reopenNoteLabel: "Ni iki kikiri ikibazo? (si ngombwa)",
    reopenSubmit: "Bisubize itsinda",
    cancel: "Reka",
    feedbackConfirmed: "Murakoze kubyemeza.",
    feedbackReopened: "Iraporo yanyu yongeye gufungurwa isubizwa itsinda.",
    confirmedNote: "Mwemeje ko byakemutse. Murakoze.",
    gpsWorking: "Turashaka aho muri…",
    gpsCaptured: "Aho muri habitswe, hafi metero {m}.",
    gpsFailed: "Ntitwabashije kubona aho muri. Mushobora kohereza iraporo mwuzuza ibisabwa hasi.",
    gpsOutside: "Aho hantu hasa n’aho hari hanze ya Kigali, ntihabitswe.",
    photoWrongType: "Nyabuneka hitamo ifoto.",
    photoProcessing: "Turategura ifoto yanyu…",
    draftRestored: "Twagaruye iraporo mwari mwatangiye.",
    draftDiscard: "Tangira bushya",
    fieldRequired: "Nyabuneka uzuza hano kugira ngo ukomeze.",
    stepOf: "Intambwe {n} kuri {total}",
    removeSaved: "Kuraho",
    shareText: "Nimero y’iraporo yanjye ya Clean Kigali:",
    categories: {
      'full-bin': 'Ipubure Yuzuye Cyane',
      'blocked-drain': 'Umuyoboro Wazibye',
      'illegal-dumping': 'Imyanda Ahatemewe',
      litter: 'Imyanda Inyanyagiye',
      other: 'Ikindi Kibazo',
    },
    urgencies: {
      low: 'Hasi',
      medium: 'Kuringaniza',
      high: 'Byihutirwa Cyane',
    },
  },
};
