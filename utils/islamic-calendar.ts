import { MAJOR_ISLAMIC_EVENTS } from '../data/islamic-events-data';

// --- Helper Functions for Date Conversion ---

function gmod(n: number, m: number): number {
    return ((n % m) + m) % m;
}

function kuwaitiAlgorithm(jd: number): number[] {
    let i, j, l, n, year, month, day;
    l = jd - 1948440 + 10632;
    n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) + (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
    l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
    month = Math.floor((24 * l) / 709);
    day = l - Math.floor((709 * month) / 24);
    year = 30 * n + j - 30;
    return [year, month, day];
}

function gregorianToJd(year: number, month: number, day: number): number {
    if (month < 3) {
        year -= 1;
        month += 12;
    }
    const a = Math.floor(year / 100);
    const b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

function jdToGregorian(jd: number): { year: number, month: number, day: number } {
    const z = Math.floor(jd + 0.5);
    const a = Math.floor((z - 1867216.25) / 36524.25);
    const b = (a > 0) ? z + 1 + a - Math.floor(a / 4) : z;
    const c = b + 1524;
    const d = Math.floor((c - 122.1) / 365.25);
    const e = Math.floor(365.25 * d);
    const f = Math.floor((c - e) / 30.6001);
    const day = c - e - Math.floor(30.6001 * f);
    const month = (f < 14) ? f - 1 : f - 13;
    const year = (month > 2) ? d - 4716 : d - 4715;
    return { year, month, day };
}

// --- Exported Main Functions ---

const HIJRI_MONTHS = [
    "Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani",
    "Jumada al-ula", "Jumada al-akhirah", "Rajab", "Sha'ban",
    "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
];

export interface HijriDate {
    hYear: number;
    hMonth: number;
    hDay: number;
    hMonthName: string;
    dayOfWeek: string;
}

export function gregorianToHijri(date: Date): HijriDate {
    const jd = gregorianToJd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const [year, month, day] = kuwaitiAlgorithm(jd);
    const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
    
    return {
        hYear: year,
        hMonth: month,
        hDay: day,
        hMonthName: HIJRI_MONTHS[month - 1],
        dayOfWeek
    };
}

export function hijriToGregorian(hYear: number, hMonth: number, hDay: number): Date {
    // FIX: Replace parseInt with Math.floor for numeric calculation, as parseInt expects a string.
    const jd = Math.floor((11 * hYear + 3) / 30) + 354 * hYear + 30 * hMonth - Math.floor((hMonth - 1) / 2) + hDay + 1948440 - 385;
    const { year, month, day } = jdToGregorian(jd);
    // JS Date month is 0-indexed
    return new Date(year, month - 1, day);
}

export function getMajorEventsForDate(date: Date): string[] {
    const hijri = gregorianToHijri(date);
    const key = `${hijri.hDay}-${hijri.hMonth}`;
    const events: string[] = [];

    // Simple check for fixed date events
    if (MAJOR_ISLAMIC_EVENTS[key]) {
        events.push(MAJOR_ISLAMIC_EVENTS[key]);
    }

    // Special range events
    if (hijri.hMonth === 9 && hijri.hDay >= 20) { // Last 10 nights of Ramadan
         events.push("Laylat al-Qadr (search)");
    }
     if (hijri.hMonth === 12 && hijri.hDay >= 8 && hijri.hDay <= 13) {
        events.push("Days of Hajj");
    }

    return events;
}