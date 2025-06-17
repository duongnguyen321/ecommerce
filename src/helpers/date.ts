import { removeAccents, upperFirstLetter } from './string';
import moment from 'moment';

/**
 * Converts a string representing time into seconds.
 * The function supports various units of time (seconds, minutes, hours, days, months, years)
 * in both English and Vietnamese. It first removes accents and converts the input to lowercase
 * to standardize the format, then parses the string to extract the quantity and unit of time.
 * The result is calculated in seconds based on the unit specified.
 *
 * @param time - A string representing the time quantity and unit (e.g., "2 hours", "3 ngày").
 * @returns The equivalent time in seconds as a number.
 * @throws {Error} If the input string does not match the expected format or contains an invalid time unit.
 */
export function dateToTime(time: string): number {
  const trimmedTime = removeAccents(time.trim().toLowerCase());

  const timePattern =
    /^(\d+)\s*(giay?|seconds?|s?|phut?|minutes?|m?|gio?|hours?|h?|ngay?|days?|d?|thang?|months?|mm?|nam?|years?|y?)$/;
  const match = trimmedTime.match(timePattern);

  if (!match) {
    throw new Error('Invalid time format');
  }

  const quantity = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
    case 'giay':
    case 'second':
    case 'seconds':
      return quantity;
    case 'm':
    case 'phut':
    case 'minute':
    case 'minutes':
      return quantity * 60;
    case 'h':
    case 'gio':
    case 'hour':
    case 'hours':
      return quantity * 60 * 60;
    case 'd':
    case 'ngay':
    case 'day':
    case 'days':
      return quantity * 60 * 60 * 24;
    case 'mm':
    case 'thang':
    case 'month':
    case 'months':
      return quantity * 60 * 60 * 24 * 30;
    case 'y':
    case 'nam':
    case 'year':
    case 'years':
      return quantity * 60 * 60 * 24 * 365;
    default:
      throw new Error('Invalid time unit');
  }
}

/**
 * Returns a human-friendly representation of the time since the given date,
 * e.g., "3 hours ago" or "in 2 days".
 *
 * @param date - A date or a string that can be converted to a date.
 * @param locale - The locale to use for formatting the date. Defaults to 'vi'.
 * @returns A string representing the time since the given date.
 */
export const getDate = (
  date: string | number,
  locale: string = 'vi'
): string => {
  moment.locale(locale);
  return upperFirstLetter(moment(date).fromNow());
};

export function isValidDate(dateString: string) {
  return !isNaN(new Date(dateString).getTime());
}

/**
 * Parses a date string in various formats and returns it in 'YYYY-MM-DD' format.
 * @param {string} dateString The date string to parse.
 * @param {string} format The returned format date
 * @return {string} The formatted date string or an indication of an invalid date.
 */
export function formatDate(
  dateString: string,
  format: string = 'YYYY-MM-DD'
): string {
  if (isValidDate(dateString)) {
    return moment(dateString).format(format);
  }
  const formats = [
    'DDMMYYYY',
    'DD/MM/YYYY',
    'DD-MM-YYYY',
    'DD MM YYYY',
    'DD/MMYYYY',
    'DDMM/YYYY',
    'YYYY-MM-DD',
    'YYYY-MM-DD',
    'YYYYMM-DD',
    'YYYY-MMDD',
    'YYYY/MM/DD',
    'YYYYMM/DD',
    'YYYY/MMDD',
    moment.ISO_8601,
  ];

  const parsedDate = moment(dateString, formats, true);
  if (parsedDate.isValid()) {
    return parsedDate.format(format);
  } else {
    try {
      return new Date(dateString).toISOString();
    } catch {
      return dateString;
    }
  }
}
