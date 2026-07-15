/**
 * Converts a Gregorian date to the Ethiopian calendar date.
 * Returns { year, month, day } where month is 1-indexed (1 to 13).
 */
export function gregorianToEthiopian(date: Date): { year: number; month: number; day: number } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // Find Julian Day Number (JDN)
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  // Convert JDN to Ethiopian Date
  // Ethiopian epoch in Julian Day Number is 1723856 (August 29, 8 AD Julian)
  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);

  const ethYear =
    4 * Math.floor((jdn - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const ethMonth = Math.floor(n / 30) + 1;
  const ethDay = (n % 30) + 1;

  return {
    year: ethYear,
    month: ethMonth,
    day: ethDay,
  };
}

export const ETHIOPIAN_MONTHS_AM = [
  "መስከረም", // Meskerem (1)
  "ጥቅምት",   // Tekemt (2)
  "ኅዳር",    // Hedar (3)
  "ታኅሣሥ",   // Tahsas (4)
  "ጥር",     // Ter (5)
  "የካቲት",   // Yekatit (6)
  "መጋቢት",   // Megabit (7)
  "ሚያዝያ",   // Miazia (8)
  "ግንቦት",   // Ginbot (9)
  "ሰኔ",     // Sene (10)
  "ሐምሌ",    // Hamle (11)
  "ነሐሴ",    // Nehasse (12)
  "ጳጉሜን",   // Pagume (13)
];

export const ETHIOPIAN_MONTHS_EN = [
  "Meskerem",
  "Tekemt",
  "Hedar",
  "Tahsas",
  "Ter",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehasse",
  "Pagume",
];

/**
 * Format a Date object into Ethiopian calendar format localized by locale selection.
 */
export function formatEthiopianDate(date: Date, locale: string): string {
  const { year, month, day } = gregorianToEthiopian(date);
  const monthName =
    locale === "am" ? ETHIOPIAN_MONTHS_AM[month - 1] : ETHIOPIAN_MONTHS_EN[month - 1];

  if (locale === "am") {
    return `${monthName} ${day} ቀን ${year} ዓ.ም.`;
  }
  return `${monthName} ${day}, ${year} EE`;
}

/**
 * Format a Date object into Ethiopian localized time format.
 * Ethiopian time starts at 6:00 AM Gregorian as 12:00 (day).
 */
export function formatEthiopianTime(date: Date, locale: string): string {
  if (locale !== "am") {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");

  // Ethiopian hours are offset by 6 hours.
  let ethHours = (hours - 6 + 24) % 12;
  if (ethHours === 0) {
    ethHours = 12;
  }

  // Determine day or night period
  // Gregorian 6:00 AM (6) to 5:59 PM (17) is "ቀን" (Day)
  // Gregorian 6:00 PM (18) to 5:59 AM (5) is "ሌሊት" (Night)
  const period = hours >= 6 && hours < 18 ? "ቀን" : "ሌሊት";

  return `${period} ${ethHours}:${minutes}`;
}

/**
 * Global date formatter utility that supports Ethiopian Calendar for Amharic locale.
 */
export function formatGlobalDate(value: string | Date | null | undefined, locale: string): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  if (locale === "am") {
    return formatEthiopianDate(date, "am");
  }
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Converts an Ethiopian date back to Gregorian Date.
 * year, month (1-13), day (1-30).
 */
export function ethiopianToGregorian(year: number, month: number, day: number): Date {
  const gregYearGuess = month <= 3 || (month === 4 && day <= 22) ? year + 7 : year + 8;
  const gregMonthIndex = (month + 7) % 12;
  const guess = new Date(gregYearGuess, gregMonthIndex, day);

  for (let offset = -15; offset <= 15; offset++) {
    const testDate = new Date(guess.getTime() + offset * 24 * 60 * 60 * 1000);
    const eth = gregorianToEthiopian(testDate);
    if (eth.year === year && eth.month === month && eth.day === day) {
      return testDate;
    }
  }
  return guess;
}
