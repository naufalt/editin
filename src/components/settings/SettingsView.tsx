import React, { useState } from 'react'
import {
  Sun,
  Moon,
  Languages,
  Code2,
  CupSoda,
  ExternalLink,
  Heart,
  X,
  ShieldCheck,
} from 'lucide-react'
import { useAppSettings } from '../../store/settingsStore'

export const SettingsView: React.FC = () => {
  const { isDark, setTheme, language, setLanguage } = useAppSettings()
  const [showQrisModal, setShowQrisModal] = useState(false)

  const handleOpenExternal = (url: string) => {
    if (window.electronAPI?.openPath) {
      window.electronAPI.openPath(url)
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 select-none space-y-6">
      {/* Header */}
      <div className={`pb-4 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-300/70'}`}>
        <h2 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          {language === 'id' ? 'Pengaturan' : 'Preferences'}
        </h2>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {language === 'id'
            ? 'Sesuaikan bahasa, tema tampilan, dan informasi aplikasi EditIn.'
            : 'Customize language, appearance theme, and EditIn application info.'}
        </p>
      </div>

      <div className="max-w-2xl space-y-3.5">
        {/* Language Selection */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm ${
            isDark
              ? 'bg-[#13151C] border-slate-800/80'
              : 'bg-[#F8FAFC] border-slate-200/90'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {language === 'id' ? 'Bahasa Antarmuka' : 'Interface Language'}
              </div>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {language === 'id'
                  ? 'Pilih bahasa yang digunakan di seluruh aplikasi.'
                  : 'Choose the language used across the application.'}
              </p>
            </div>
          </div>

          <div
            className={`flex items-center p-1 rounded-xl border ${
              isDark
                ? 'bg-slate-800/80 border-slate-700/60'
                : 'bg-[#E8EEF5] border-slate-300/70'
            }`}
          >
            <button
              onClick={() => setLanguage('id')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                language === 'id'
                  ? isDark
                    ? 'bg-[#13151C] text-white shadow-sm font-semibold'
                    : 'bg-[#F8FAFC] text-slate-900 shadow-sm font-semibold'
                  : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Indonesia
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                language === 'en'
                  ? isDark
                    ? 'bg-[#13151C] text-white shadow-sm font-semibold'
                    : 'bg-[#F8FAFC] text-slate-900 shadow-sm font-semibold'
                  : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Theme Selection */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm ${
            isDark
              ? 'bg-[#13151C] border-slate-800/80'
              : 'bg-[#F8FAFC] border-slate-200/90'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div>
              <div className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {language === 'id' ? 'Tema Tampilan' : 'Appearance Theme'}
              </div>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {language === 'id'
                  ? 'Ganti antara mode gelap dan mode terang.'
                  : 'Switch between dark mode and light mode.'}
              </p>
            </div>
          </div>

          <div
            className={`flex items-center p-1 rounded-xl border ${
              isDark
                ? 'bg-slate-800/80 border-slate-700/60'
                : 'bg-[#E8EEF5] border-slate-300/70'
            }`}
          >
            <button
              onClick={() => setTheme(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                isDark
                  ? 'bg-[#13151C] text-white shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => setTheme(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                !isDark
                  ? 'bg-[#F8FAFC] text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
          </div>
        </div>

        {/* Privacy & Offline Info */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm ${
            isDark
              ? 'bg-[#13151C] border-slate-800/80'
              : 'bg-[#F8FAFC] border-slate-200/90'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {language === 'id' ? '100% Offline & Privat' : '100% Offline & Private'}
              </div>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {language === 'id'
                  ? 'Semua proses edit, gabung, kompres, dan proteksi PDF berjalan lokal di perangkat Anda.'
                  : 'All PDF editing, merging, compressing, and protection run locally on your device.'}
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold font-mono flex-shrink-0">
            LOCAL
          </span>
        </div>

        {/* Developer Info & Support Matcha Section */}
        <div className="pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2.5 px-1">
            {language === 'id' ? 'Tentang Developer' : 'About Developer'}
          </div>

          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
              isDark
                ? 'bg-[#13151C] border-slate-800/80'
                : 'bg-[#F8FAFC] border-slate-200/90'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0 border border-emerald-500/20">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                    Ngoods Studio
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-[#E8EEF5] text-slate-600'
                    }`}
                  >
                    @naufalt
                  </span>
                </div>
                <p className={`text-[11px] mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {language === 'id'
                    ? 'EditIn dibuat agar Anda bisa mengelola dokumen PDF dengan cepat tanpa upload ke server mana pun.'
                    : 'EditIn is built so you can manage PDF documents fast without uploading to any server.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleOpenExternal('https://github.com/naufalt')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-[#E8EEF5] hover:bg-slate-300/80 text-slate-700 border-slate-300/80'
                }`}
                title="GitHub"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>

              <button
                onClick={() => setShowQrisModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                title="Scan QRIS Ngoods to Buy Developer Matcha"
              >
                <CupSoda className="w-3.5 h-3.5" />
                <span>{language === 'id' ? 'Traktir Matcha' : 'Buy Developer Matcha'}</span>
                <Heart className="w-3 h-3 fill-current opacity-80" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QRIS Ngoods Modal */}
      {showQrisModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowQrisModal(false)}
        >
          <div
            className={`relative w-full max-w-xs rounded-2xl border shadow-2xl p-5 flex flex-col items-center text-center ${
              isDark ? 'bg-[#13151C] border-slate-800' : 'bg-white border-slate-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQrisModal(false)}
              className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'text-slate-400 hover:bg-slate-800'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              aria-label="Close QRIS modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 text-emerald-500 font-semibold text-xs mb-1">
              <CupSoda className="w-4 h-4" />
              <span>{language === 'id' ? 'Traktir Developer Matcha' : 'Buy Developer Matcha'}</span>
            </div>
            <p className={`text-[11px] mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              QRIS a.n. <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Ngoods</span>
            </p>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-inner">
              <img
                src="./qris-ngoods.jpg"
                alt="QRIS Ngoods"
                className="w-56 h-56 object-contain rounded-lg"
              />
            </div>

            <p className={`text-[10px] mt-3 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {language === 'id'
                ? 'Scan QRIS di atas dengan e-wallet atau mobile banking favorit Anda. Terima kasih!'
                : 'Scan the QRIS above with your favorite e-wallet or mobile banking app. Thank you!'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
