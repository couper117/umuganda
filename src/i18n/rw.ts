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
    pending: 'Zirimo Gukorwa',
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
    inputHint: "Nimero mwahawe igihe mwohereza, urugero CK-21.",
    placeholder: 'CK-21',
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
    pending: 'Birimo Gukorwa',
    done: 'Byarakemutse',
    notdone: 'Ntibyakemutse',
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
    timelineSubmitted: 'Iraporo Yoherejwe',
    timelineProgress: 'Birimo Gukurikiranwa',
    timelineResolved: 'Isuku Yarangiye',
    timelineNotDone: 'Ntibyakemutse',
    noMatches: "Nta raporo yabonetse ihuye n'ibyo ushatse.",
    // NEW
    searchCleared: 'Turerekana raporo zose ziherutse.',
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
