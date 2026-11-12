import React from 'react'
import { 
  FileEdit, 
  LayoutGrid, 
  Combine, 
  Split, 
  PenTool, 
  Minimize2, 
  ShieldCheck, 
  UploadCloud,
  FileText,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { TabType } from '../layout/Sidebar'

interface DashboardHomeProps {
  onNavigate: (tab: TabType) => void
  onOpenFile: () => void
  fileName: string | null
  pageCount: number
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  onNavigate,
  onOpenFile,
  fileName,
  pageCount,
}) => {
  const featureCards = [
    {
      tab: 'editor' as TabType,
      title: 'Edit Isi Dokumen',
      desc: 'Ketik teks baru, tutup teks lama (tipex), dan tempel logo/gambar.',
      icon: FileEdit,
      color: 'from-indigo-600 to-violet-600',
      tag: 'Paling Utama',
    },
    {
      tab: 'pages' as TabType,
      title: 'Susun & Putar Halaman',
      desc: 'Putar halaman terbalik, atur ulang urutan lembar, atau hapus halaman kosong.',
      icon: LayoutGrid,
      color: 'from-blue-600 to-indigo-600',
    },
    {
      tab: 'merge' as TabType,
      title: 'Gabung Dokumen (Merge)',
      desc: 'Satukan beberapa file PDF terpisah menjadi 1 dokumen rapi dan terurut.',
      icon: Combine,
      color: 'from-purple-600 to-pink-600',
    },
    {
      tab: 'split' as TabType,
      title: 'Pisah & Ambil Halaman',
      desc: 'Ekstrak rentang halaman tertentu (misal hal 1-3) atau pecah per N halaman.',
      icon: Split,
      color: 'from-emerald-600 to-teal-600',
    },
    {
      tab: 'sign' as TabType,
      title: 'Tanda Tangan & Cap',
      desc: 'Goreskan tanda tangan langsung atau pilih stempel resmi (APPROVED, LUNAS).',
      icon: PenTool,
      color: 'from-amber-600 to-orange-600',
    },
    {
      tab: 'compress' as TabType,
      title: 'Kecilkan Ukuran PDF',
      desc: 'Kompres file agar lolos syarat upload CPNS, portal kampus, atau email (< 2MB).',
      icon: Minimize2,
      color: 'from-rose-600 to-red-600',
    },
    {
      tab: 'protect' as TabType,
      title: 'Kunci Kata Sandi',
      desc: 'Amankan dokumen pribadi dengan enkripsi kata sandi kuat.',
      icon: ShieldCheck,
      color: 'from-slate-700 to-slate-900',
    },
  ]

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0C0D12] overflow-y-auto select-none p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-mono text-xs font-bold mb-1">
              <Sparkles size={14} />
              <span>EDITIN // DOCUMENT STUDIO</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Selamat Datang di Studio PDF Anda
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Semua fitur berjalan 100% offline di komputer Anda. Aman, cepat, tanpa upload ke internet.
            </p>
          </div>

          <button
            onClick={onOpenFile}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center space-x-2 active:scale-95"
          >
            <UploadCloud size={16} />
            <span>Buka Berkas PDF</span>
          </button>
        </div>

        {/* Active Document Status Card (If loaded) */}
        {fileName && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-[#13151D] to-[#13151D] border border-indigo-500/30 flex items-center justify-between shadow-xl">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <FileText size={20} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    DOKUMEN AKTIF
                  </span>
                  <h3 className="text-xs font-bold text-slate-100 truncate max-w-sm">
                    {fileName}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {pageCount} Halaman siap diproses. Pilih salah satu fitur di bawah untuk melanjutkan.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('editor')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all flex items-center space-x-1.5"
            >
              <span>Buka Editor</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Feature Grid */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
            Pilih Fitur yang Ingin Digunakan:
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {featureCards.map((feat) => {
              const Icon = feat.icon

              return (
                <div
                  key={feat.tab}
                  onClick={() => onNavigate(feat.tab)}
                  className="p-5 rounded-2xl bg-[#13151D] hover:bg-[#181A25] border border-white/5 hover:border-indigo-500/40 cursor-pointer transition-all duration-150 flex flex-col justify-between group shadow-sm hover:shadow-xl hover:-translate-y-0.5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${feat.color} flex items-center justify-center text-white shadow-md shadow-indigo-600/10`}>
                        <Icon size={18} />
                      </div>
                      {feat.tag && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {feat.tag}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>

                  <div className="flex items-center text-[11px] text-indigo-400 font-semibold mt-4 group-hover:translate-x-1 transition-transform">
                    <span>Mulai fitur ini</span>
                    <ArrowRight size={13} className="ml-1" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
