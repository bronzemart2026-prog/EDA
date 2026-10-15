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
  if (num === null || num === undefined) return '০';
  return String(num)
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
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  return `${banglaMonths[month] || month} ${toBanglaNumber(year)}`;
};

/**
 * Formats Date object or timestamp into standard Bangla date DD-MM-YYYY.
 * @param {string|Date} dateInput 
 * @returns {string}
 */
export const formatBanglaDate = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const day = String(date.getDate());
  const month = String(date.getMonth() + 1);
  const year = date.getFullYear();
  
  return `${toBanglaNumber(day)}ই ${banglaMonthsShort[month]} ${toBanglaNumber(year)}`;
};

/**
 * Formats currency amount with BDT symbol.
 * @param {number} amount
 * @returns {string}
 */
export const formatBDT = (amount) => {
  return `${toBanglaNumber(amount)} ৳`;
};
