/**
 * lib/areas.ts — the administrative areas of the City of Kigali.
 *
 * Rwanda's administrative hierarchy runs Province → District → Sector → Cell →
 * Village. The City of Kigali is one province containing three districts and
 * thirty-five sectors, and those two levels are stable enough to build in.
 *
 * Cells and villages are NOT listed here. Kigali has roughly 160 cells and over
 * a thousand villages; reproducing that list from memory would put wrong names
 * in front of residents and, worse, would silently mis-route reports when a
 * leader is assigned to a cell that does not exist. They are free text instead,
 * so the data is only ever as good as what someone actually typed — which is
 * honest — and can be replaced with a real dataset later without touching
 * anything but this file.
 *
 * District and sector are validated against these lists, so those two levels
 * cannot hold junk.
 */

export interface District {
  readonly name: string;
  readonly sectors: readonly string[];
}

export const KIGALI_DISTRICTS: readonly District[] = [
  {
    name: 'Gasabo',
    sectors: [
      'Bumbogo',
      'Gatsata',
      'Gikomero',
      'Gisozi',
      'Jabana',
      'Jali',
      'Kacyiru',
      'Kimihurura',
      'Kimironko',
      'Kinyinya',
      'Ndera',
      'Nduba',
      'Remera',
      'Rusororo',
      'Rutunga',
    ],
  },
  {
    name: 'Kicukiro',
    sectors: [
      'Gahanga',
      'Gatenga',
      'Gikondo',
      'Kagarama',
      'Kanombe',
      'Kicukiro',
      'Kigarama',
      'Masaka',
      'Niboye',
      'Nyarugunga',
    ],
  },
  {
    name: 'Nyarugenge',
    sectors: [
      'Gitega',
      'Kanyinya',
      'Kigali',
      'Kimisagara',
      'Mageragere',
      'Muhima',
      'Nyakabanda',
      'Nyamirambo',
      'Nyarugenge',
      'Rwezamenyo',
    ],
  },
] as const;

/** Every district name. */
export const DISTRICT_NAMES: readonly string[] = KIGALI_DISTRICTS.map((d) => d.name);

/** True when the name is one of the three Kigali districts. */
export function isDistrict(value: unknown): value is string {
  return typeof value === 'string' && DISTRICT_NAMES.includes(value);
}

/** Sectors of a district, or an empty list when the district is unknown. */
export function sectorsOf(district: unknown): readonly string[] {
  const match = KIGALI_DISTRICTS.find((d) => d.name === district);
  return match === undefined ? [] : match.sectors;
}

/**
 * True when the sector genuinely belongs to that district.
 *
 * Checked as a pair rather than against a flat list of all sectors, so a
 * submission cannot claim a Gasabo sector while naming Kicukiro as its
 * district — which would put the report beyond the reach of both leaders.
 */
export function isSectorOf(district: unknown, sector: unknown): boolean {
  return typeof sector === 'string' && sectorsOf(district).includes(sector);
}

/** Shape handed to the templates for building the dependent dropdowns. */
export function districtOptions(): ReadonlyArray<{ name: string; sectors: readonly string[] }> {
  return KIGALI_DISTRICTS.map((d) => ({ name: d.name, sectors: d.sectors }));
}
