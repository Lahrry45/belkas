export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River",
  "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna",
  "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

export const SHOE_SIZES = ["39", "40", "41", "42", "43", "44", "45", "46", "47"];

/** EU → UK/US approximations for the size guide. */
export const SIZE_GUIDE: { eu: string; uk: string; us: string; cm: string }[] = [
  { eu: "39", uk: "5.5", us: "6.5", cm: "24.5" },
  { eu: "40", uk: "6.5", us: "7", cm: "25" },
  { eu: "41", uk: "7", us: "8", cm: "26" },
  { eu: "42", uk: "8", us: "9", cm: "26.5" },
  { eu: "43", uk: "9", us: "10", cm: "27.5" },
  { eu: "44", uk: "9.5", us: "10.5", cm: "28" },
  { eu: "45", uk: "10.5", us: "11.5", cm: "29" },
  { eu: "46", uk: "11", us: "12", cm: "29.5" },
  { eu: "47", uk: "12", us: "13", cm: "30.5" },
];
