// Federal Supply Group (first two digits of an NSN/FSC) names, for human-readable category filters.
export const FSG_NAMES = {
  10: 'Weapons', 11: 'Nuclear ordnance', 12: 'Fire control equipment', 13: 'Ammunition & explosives',
  14: 'Guided missiles', 15: 'Aircraft & airframe components', 16: 'Aircraft components & accessories',
  17: 'Aircraft launching & ground handling', 18: 'Space vehicles', 19: 'Ships, small craft & docks',
  20: 'Ship & marine equipment', 22: 'Railway equipment', 23: 'Ground vehicles & trailers',
  24: 'Tractors', 25: 'Vehicular equipment components', 26: 'Tires & tubes', 28: 'Engines & turbines',
  29: 'Engine accessories', 30: 'Mechanical power transmission', 31: 'Bearings',
  32: 'Woodworking machinery', 34: 'Metalworking machinery', 35: 'Service & trade equipment',
  36: 'Special industry machinery', 37: 'Agricultural machinery', 38: 'Construction & mining equipment',
  39: 'Materials handling equipment', 40: 'Rope, cable, chain & fittings', 41: 'Refrigeration & air conditioning',
  42: 'Fire fighting, rescue & safety', 43: 'Pumps & compressors', 44: 'Furnace, steam & drying equipment',
  45: 'Plumbing, heating & sanitation', 46: 'Water purification & sewage', 47: 'Pipe, tubing, hose & fittings',
  48: 'Valves', 49: 'Maintenance & repair shop equipment', 51: 'Hand tools', 52: 'Measuring tools',
  53: 'Hardware & abrasives', 54: 'Prefabricated structures', 55: 'Lumber, millwork & plywood',
  56: 'Construction materials', 58: 'Communication & radar equipment', 59: 'Electrical & electronic components',
  60: 'Fiber optics', 61: 'Electric wire, power & distribution', 62: 'Lighting fixtures & lamps',
  63: 'Alarm, signal & security systems', 65: 'Medical, dental & veterinary', 66: 'Instruments & lab equipment',
  67: 'Photographic equipment', 68: 'Chemicals & chemical products', 69: 'Training aids & devices',
  70: 'IT equipment & software', 71: 'Furniture', 72: 'Household & commercial furnishings',
  73: 'Food preparation & serving', 74: 'Office machines & records', 75: 'Office supplies & devices',
  76: 'Books, maps & publications', 77: 'Musical instruments & radios', 78: 'Recreational & athletic equipment',
  79: 'Cleaning equipment & supplies', 80: 'Brushes, paints & adhesives', 81: 'Containers & packaging',
  83: 'Textiles, leather & tents', 84: 'Clothing & individual equipment', 85: 'Toiletries',
  87: 'Agricultural supplies', 88: 'Live animals', 89: 'Subsistence (food)', 91: 'Fuels & lubricants',
  93: 'Nonmetallic fabricated materials', 94: 'Nonmetallic crude materials', 95: 'Metal bars, sheets & shapes',
  96: 'Ores, minerals & primary products', 99: 'Miscellaneous',
};

export function fsgName(fsc) {
  return FSG_NAMES[String(fsc).slice(0, 2)] || 'Other';
}

export const SET_ASIDE_NAMES = {
  N: 'Unrestricted', Y: 'Small Business', L: 'Woman-Owned SB', E: 'EDWOSB',
  H: 'HUBZone', R: 'SDVOSB', A: '8(a)',
};

export const SOL_TYPE_NAMES = {
  F: 'Fast award', P: 'Auto evaluation', I: 'AIDC (IDC)', M: 'Manual',
};

// Acquisition Method Suffix Code: tells a vendor whether the government holds usable tech data.
export const AMSC_NAMES = {
  G: 'G: full data available, open competition',
  A: 'A: data not available/limited',
  B: 'B: source-controlled item',
  C: 'C: engineering source approval required',
  D: 'D: data not physically available',
  H: 'H: data not available, qualification',
  K: 'K: no data rights',
  L: 'L: data incomplete',
  P: 'P: data in process',
  Q: 'Q: qualified products list',
  R: 'R: data rights not owned',
  T: 'T: data inadequate',
  Z: 'Z: commercial item',
  V: 'V: data available, not competitive',
};
