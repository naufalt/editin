import React from 'react'
import { X, DownloadCloud, CheckCircle2 } from 'lucide-react'
import { useAppSettings } from '../../store/settingsStore'

interface UpdateModalProps {
  isOpen: boolean
  onClose: () => void
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose }) => {
  const { isDark, language } = useAppSettings()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-sm rounded-2xl border shadow-2xl p-6 text-center ${
          isDark ? 'bg-[#13151C] border-slate-800' : 'bg-white border-slate-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors ${
            isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
          }`}
          aria-label="Close update modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-3">
          <DownloadCloud className="w-6 h-6" />
        </div>

        <h3 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          {language === 'id' ? 'Pembaruan Aplikasi' : 'Application Updates'}
        </h3>

        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[11px] font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>EditIn v1.0.0</span>
        </div>

        <p className={`text-xs mt-3 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {language === 'id'
            ? 'Anda menggunakan versi terbaru. Pembaruan otomatis akan terhubung melalui Microsoft Store setelah rilis.'
            : 'You are on the latest version. Automatic updates will be connected via Microsoft Store upon release.'}
        </p>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
        >
          {language === 'id' ? 'Tutup' : 'Close'}
        </button>
      </div>
    </div>
  )
}
