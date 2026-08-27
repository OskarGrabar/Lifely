import en from './en.js'
import pl from './pl.js'
import sv from './sv.js'
import es from './es.js'

export const locales = { en, pl, sv, es }

/**
 * Translate a key using the given dictionary, falling back to English then the key itself.
 * Positional args replace {0}, {1}, … in the string.
 */
export function translate(dict, key, ...args) {
  let str = dict[key] ?? en[key] ?? key
  args.forEach((arg, i) => {
    str = str.replace(`{${i}}`, String(arg))
  })
  return str
}
