import React from 'react'
import {
  BookOpen,
  ArrowRight,
  FileEdit,
  LayoutGrid,
  Combine,
  Split,
  PenTool,
  Minimize2,
  ShieldCheck,
} from 'lucide-react'
import { useAppSettings } from '../../store/settingsStore'
import { TabType } from '../layout/Sidebar'

interface GuideViewProps {
  onSelectTab: (tab: TabType) => void
}

export const GuideView: React.FC<GuideViewProps> = ({ onSelectTab }) => {
  const { isDark, language } = useAppSettings()

  const steps = language === 'id'
    ? [
        {
          num: '1',
          title: 'Buka atau Tarik File PDF',
          desc: 'Klik "Buka PDF" di Dashboard atau drag & drop file PDF langsung ke area aplikasi.',
        },
        {
          num: '2',
          title: 'Pilih Studio yang Dibutuhkan',
          desc: 'Edit teks & anotasi, atur halaman, gabung/pisah, tanda tangani, kompres, atau beri password.',
        },
        {
          num: '3',
          title: 'Simpan Langsung Secara Offline',
          desc: 'Klik Simpan/Export di panel bawah. File diproses 100% di perangkat Anda tanpa internet.',
        },
      ]
    : [
        {
          num: '1',
          title: 'Open or Drop Your PDF',
          desc: 'Click "Open PDF" on the Dashboard or drag & drop a PDF file directly into the app.',
        },
        {
          num: '2',
          title: 'Pick the Studio You Need',
          desc: 'Edit text & annotations, organize pages, merge/split, sign, compress, or password-protect.',
        },
        {
          num: '3',
          title: 'Save Offline Instantly',
          desc: 'Click Save/Export on the bottom bar. Everything runs 100% locally on your device.',
        },
      ]

  const features = [
    {
      tab: 'editor' as TabType,
      icon: FileEdit,
      title: language === 'id' ? 'Editor PDF' : 'PDF Editor',
      desc: language === 'id'
        ? 'Edit teks langsung di halaman PDF, tambah teks baru, highlight, atau coret.'
        : 'Edit existing PDF text, add new text, highlight, or draw.',
    },
    {
      tab: 'pages' as TabType,
      icon: LayoutGrid,
      title: language === 'id' ? 'Kelola Halaman' : 'Page Manager',
      desc: language === 'id'
        ? 'Putar (rotate), hapus, atau atur ulang urutan halaman PDF.'
        : 'Rotate, delete, or reorder PDF pages visually.',
    },
    {
      tab: 'merge' as TabType,
      icon: Combine,
      title: language === 'id' ? 'Gabung PDF' : 'Merge PDF',
      desc: language === 'id'
        ? 'Gabungkan beberapa dokumen PDF menjadi satu file.'
        : 'Combine multiple PDF documents into a single file.',
    },
    {
      tab: 'split' as TabType,
      icon: Split,
      title: language === 'id' ? 'Pisah PDF' : 'Split PDF',
      desc: language === 'id'
        ? 'Ekstrak halaman tertentu (mis. 1-3, 5) atau pecah per N halaman.'
        : 'Extract specific pages (e.g. 1-3, 5) or split every N pages.',
    },
    {
      tab: 'sign' as TabType,
      icon: PenTool,
      title: language === 'id' ? 'Tanda Tangan & Stempel' : 'Sign & Stamp',
      desc: language === 'id'
        ? 'Gambar tanda tangan digital atau tempel stempel resmi ke dokumen.'
        : 'Draw a digital signature or place stamps onto your document.',
    },
    {
      tab: 'compress' as TabType,
      icon: Minimize2,
      title: language === 'id' ? 'Kompres PDF' : 'Compress PDF',
      desc: language === 'id'
        ? 'Perkecil ukuran file PDF dengan pilihan kualitas Extreme, Balanced, atau High.'
        : 'Reduce PDF file size with Extreme, Balanced, or High quality presets.',
    },
    {
      tab: 'protect' as TabType,
      icon: ShieldCheck,
      title: language === 'id' ? 'Proteksi Password' : 'Protect PDF',
      desc: language === 'id'
        ? 'Kunci dokumen PDF Anda dengan enkripsi password.'
        : 'Lock your PDF document with password encryption.',
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 select-none space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-300/70'}`}>
        <div>
          <h2 className={`text-base font-semibold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span>{language === 'id' ? 'Panduan Penggunaan' : 'How to Use EditIn'}</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {language === 'id'
              ? 'Langkah cepat menggunakan seluruh fitur studio PDF offline EditIn.'
              : 'Quick steps to use all offline PDF studio features in EditIn.'}
          </p>
        </div>

        <button
          onClick={() => onSelectTab('editor')}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <span>{language === 'id' ? 'Mulai Edit' : 'Start Editing'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3 Quick Steps */}
      <div
        className={`p-5 rounded-2xl border shadow-sm space-y-3 ${
          isDark ? 'bg-[#13151C] border-slate-800/80' : 'bg-[#F8FAFC] border-slate-200/90'
        }`}
      >
        <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {language === 'id' ? 'Alur Kerja Cepat' : 'Quick Workflow'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {steps.map((s) => (
            <div
              key={s.num}
              className={`p-3.5 rounded-xl border ${
                isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-[#EEF2F6] border-slate-200/80'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {s.num}
                </div>
                <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {s.title}
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Directory */}
      <div className="space-y-3">
        <h3 className={`text-xs font-bold uppercase tracking-wider px-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {language === 'id' ? 'Daftar Fitur Studio' : 'Studio Features'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <button
                key={f.tab}
                onClick={() => onSelectTab(f.tab)}
                className={`text-left p-4 rounded-2xl border transition-all hover:border-indigo-500/40 group ${
                  isDark
                    ? 'bg-[#13151C] border-slate-800/80 hover:bg-[#181B24]'
                    : 'bg-[#F8FAFC] border-slate-200/90 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-semibold group-hover:text-indigo-500 transition-colors ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {f.title}
                  </span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {f.desc}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
