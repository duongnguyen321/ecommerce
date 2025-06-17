import { MAIN_URL } from '@/configs/site.config';
import { UrlParamQuery } from '@/types/URL.types';

/**
 * Function to remove Vietnamese accents from a string
 * @function
 * @param {string} str - The string from which to remove accents
 * @returns {string} - The string after removing accents
 */
export function removeAccents(str: string) {
  if (!str) {
    return '';
  }
  return str
    .normalize('NFD') // Normalize the string to Unicode Normalization Form D (NFD)
    .replace(/[\u0300-\u036f]/g, '') // Remove all combining diacritical marks
    .replace('đ', 'd') // Replace specific Vietnamese characters with their non-accented counterparts
    .replace('Đ', 'D'); // Replace specific Vietnamese characters with their non-accented counterparts
}

/**
 * Function to create a slug from a string
 * @function
 * @param {string} str - The string from which to create a slug
 * @returns {string} - The slug created from the input string
 */
export function slug(str: string, id?: string | number) {
  str = removeAccents(str);
  str = str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  if (id) {
    str += `~${id}`;
  }
  return str;
}

/**
 * Clones an object or array.
 * @param {any} any - the value to clone
 * @returns {object} a clone of the input value
 */
export function cloneObj<T>(any: T): T {
  if (typeof any === 'object') {
    return JSON.parse(JSON.stringify(any));
  }
  return any;
}

/**
 * Parse JSON value to object.
 * @param {string} obj - the value to parse
 * @returns {object | null}  Object parsed or null
 */
export function parseObj(obj: string): object | null {
  let result: object | null = {};
  try {
    result = JSON.parse(obj);
  } catch {
    result = null;
  }
  return result;
}

/**
 * Constructs a URL string from a given path, optional parameters, query parameters, and a domain.
 * This function allows for the dynamic creation of URLs with path parameters and query strings.
 *
 * @param {string} path - The base path of the URL. This should not include the domain.
 * @param {UrlParamQuery} paramQuery - An object containing both `param` and `query` properties.
 *   - `param`: An optional array of path parameters to be appended to the URL.
 *   - `query`: An optional object representing query parameters, where keys are parameter names and values are parameter values.
 * @param {string} [domain=MAIN_URL] - The domain to prepend to the path, defaults to MAIN_URL if not provided.
 * @returns {string} - The constructed URL string including the domain, path, path parameters (if any), and query parameters (if any).
 */
export function urlBuilder(
  path: string,
  { param, query }: UrlParamQuery,
  domain = MAIN_URL
) {
  const url = new URL(path, domain);
  if (param) {
    url.pathname += `/${param.join('/')}`;
  }
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
}

/**
 * Converts the first character of a string to uppercase and returns the modified string.
 * If the input string is empty or undefined, an empty string is returned.
 *
 * @param {string} str - The string whose first character is to be converted to uppercase.
 * @returns {string} - The string with its first character converted to uppercase, or an empty string if the input is undefined or empty.
 */
export function upperFirstLetter(str?: string) {
  if (!str) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a phone number by removing all non-numeric characters except the plus sign, and replaces the country code +84 with 0.
 * This function is specifically designed for Vietnamese phone numbers but can be adapted for other formats.
 *
 * @param {string} phone - The phone number to be formatted.
 * @returns {string} - The formatted phone number with non-numeric characters removed and the country code +84 replaced with 0.
 */
export function formatPhone(phone: string): string {
  let cleanPhone = phone.replace(/[^\d+]/g, '');
  cleanPhone = cleanPhone.replace(/^\+84/, '0');
  return cleanPhone;
}
