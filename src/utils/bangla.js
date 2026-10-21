const englishToBanglaNumerals = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

const banglaMonths = {
  '01': 'জানুয়ারি', '02': 'ফেব্রুয়ারি', '03': 'মার্চ', '04': 'এপ্রিল',
  '05': 'মে', '06': 'জুন', '07': 'জুলাই', '08': 'আগস্ট',
  '09': 'সেপ্টেম্বর', '10': 'অক্টোবর', '11': 'নভেম্বর', '12': 'ডিসেম্বর'
};

const banglaMonthsShort = {
  '1': 'জানুয়ারি', '2': 'ফেব্রুয়ারি', '3': 'মার্চ', '4': 'এপ্রিল',
  '5': 'মে', '6': 'জুন', '7': 'জুলাই', '8': 'আগস্ট',
  '9': 'সেপ্টেম্বর', '10': 'অক্টোবর', '11': 'নভেম্বর', '12': 'ডিসেম্বর'
};

/**
 * Converts English number to Bangla numbers.
 * @param {string|number} num - The number or string to convert.
 * @returns {string}
 */
export const toBanglaNumber = (num) => {
  if (num === null || num === undefined || (typeof num === 'number' && isNaN(num))) return '০';
  const str = String(num);
  if (str === 'NaN' || str === 'undefined' || str === 'null') return '০';
  return str
    .split('')
    .map(char => englishToBanglaNumerals[char] || char)
    .join('');
};

/**
 * Formats a month string of type YYYY-MM into "Month Year" in Bangla.
 * @param {string} monthStr - Format "YYYY-MM" (e.g. "2026-06")
 * @returns {string}
 */
export const formatBanglaMonth = (monthStr) => {
  if (!monthStr) return '';
  if (typeof monthStr === 'string' && /[ঁ-৯]/.test(monthStr) && !monthStr.includes('-')) {
    return monthStr;
  }
  if (!monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  return `${banglaMonths[month] || month} ${toBanglaNumber(year)}`;
};

/**
 * Formats Date object or timestamp into standard Bangla date DD-MM-YYYY.
 * Idempotent: If already formatted in Bengali, returns the string directly.
 * @param {string|Date} dateInput 
 * @returns {string}
 */
export const formatBanglaDate = (dateInput) => {
  if (!dateInput) return '';

  // If already formatted in Bengali, return as is
  if (typeof dateInput === 'string' && /[ঁ-৯]/.test(dateInput)) {
    return dateInput;
  }

  let date;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [y, m, d] = dateInput.trim().split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(dateInput);
  }

  if (isNaN(date.getTime())) {
    return typeof dateInput === 'string' ? dateInput : '';
  }

  const day = date.getDate();
  const month = String(date.getMonth() + 1);
  const year = date.getFullYear();

  let suffix = 'ই';
  if (day === 1) suffix = 'লা';
  else if (day === 2 || day === 3) suffix = 'রা';
  else if (day === 4) suffix = 'ঠা';
  else if (day >= 19) suffix = 'শে';

  const monthName = banglaMonthsShort[month] || '';
  return `${toBanglaNumber(day)}${suffix} ${monthName} ${toBanglaNumber(year)}`.trim();
};

/**
 * Formats currency amount with BDT symbol.
 * @param {number} amount
 * @returns {string}
 */
export const formatBDT = (amount) => {
  return `${toBanglaNumber(amount)} ৳`;
};

const banglaNumbersWords = [
  '', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ',
  'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ',
  'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আঠাশ', 'উনত্রিশ', 'ত্রিশ',
  'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'উনচল্লিশ', 'চল্লিশ',
  'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'উনপঞ্চাশ', 'পঞ্চাশ',
  'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'উনষাট', 'ষাট',
  'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'উনসত্তর', 'সত্তর',
  'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'উনাশি', 'আশি',
  'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'আটাশি', 'ঊননব্বই', 'নব্বই',
  'একানব্বই', 'বানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'
];

/**
 * Converts a numeric amount to Bangla words (e.g. 1500 -> "এক হাজার পাঁচ শত টাকা মাত্র").
 * @param {number|string} amount
 * @returns {string}
 */
export const numberToBanglaWords = (amount) => {
  const n = Math.floor(Math.abs(Number(amount) || 0));
  if (n === 0) return 'শূন্য টাকা মাত্র';

  const convertTwoDigits = (num) => banglaNumbersWords[num] || '';

  let words = '';
  let rem = n;

  // Crore (কোটি)
  const crore = Math.floor(rem / 10000000);
  rem %= 10000000;
  if (crore > 0) {
    words += (crore < 100 ? convertTwoDigits(crore) : numberToBanglaWords(crore).replace(' টাকা মাত্র', '')) + ' কোটি ';
  }

  // Lakh (লাখ)
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  if (lakh > 0) {
    words += convertTwoDigits(lakh) + ' লাখ ';
  }

  // Thousand (হাজার)
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  if (thousand > 0) {
    words += convertTwoDigits(thousand) + ' হাজার ';
  }

  // Hundred (শত)
  const hundred = Math.floor(rem / 100);
  rem %= 100;
  if (hundred > 0) {
    words += convertTwoDigits(hundred) + ' শত ';
  }

  // Remainder (1-99)
  if (rem > 0) {
    words += convertTwoDigits(rem) + ' ';
  }

  return words.trim() + ' টাকা মাত্র';
};

