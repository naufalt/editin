import { create } from 'zustand'
import { Language, translations } from '../locales/translations'

interface AppSettingsState {
  isDark: boolean
  language: Language
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void
  setLanguage: (lang: Language) => void
  t: typeof translations.id
}

const getInitialTheme = (): boolean => {
  const saved = localStorage.getItem('editin_theme')
  if (saved !== null) return saved === 'dark'
  return true
}

const getInitialLang = (): Language => {
  const saved = localStorage.getItem('editin_lang')
  if (saved === 'id' || saved === 'en') return saved
  return 'id'
}

export const useAppSettings = create<AppSettingsState>((set, get) => {
  const initialTheme = getInitialTheme()
  const initialLang = getInitialLang()

  return {
    isDark: initialTheme,
    language: initialLang,
    t: translations[initialLang],
    toggleTheme: () => {
      const next = !get().isDark
      localStorage.setItem('editin_theme', next ? 'dark' : 'light')
      set({ isDark: next })
    },
    setTheme: (isDark) => {
      localStorage.setItem('editin_theme', isDark ? 'dark' : 'light')
      set({ isDark })
    },
    setLanguage: (language) => {
      localStorage.setItem('editin_lang', language)
      set({ language, t: translations[language] })
    }
  }
})
