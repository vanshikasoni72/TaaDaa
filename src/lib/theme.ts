export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'taadaa.theme'

export function getStoredThemePref(): ThemePref {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' ? v : 'system'
}

export function storeThemePref(pref: ThemePref) {
  if (pref === 'system') localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, pref)
}

export function isDarkForPref(pref: ThemePref): boolean {
  if (pref === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches
  return pref === 'dark'
}

export function applyThemeClass(pref: ThemePref) {
  const dark = isDarkForPref(pref)
  document.documentElement.classList.toggle('dark', dark)

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#241019' : '#FAD6D5')
}
