import { useEffect, useState } from 'react'
import { applyThemeClass, getStoredThemePref, storeThemePref, type ThemePref } from './theme'

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(getStoredThemePref)

  useEffect(() => {
    applyThemeClass(pref)
    if (pref !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeClass('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [pref])

  function setTheme(next: ThemePref) {
    storeThemePref(next)
    setPref(next)
  }

  return { pref, setTheme }
}
