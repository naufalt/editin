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
import { useAppSettings } from '../../store/settingsStore'

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
  const { isDark, t } = useAppSettings()

  const featureCards = [
    {
      tab: 'editor' as TabType,
      title: t.cardEditorTitle,
      desc: t.cardEditorDesc,
      icon: FileEdit,
      color: 'from-indigo-600 to-violet-600',
      tag: t.badgePrimary,
    },
    {
      tab: 'pages' as TabType,
      title: t.cardPagesTitle,
      desc: t.cardPagesDesc,
      icon: LayoutGrid,
      color: 'from-blue-600 to-indigo-600',
    },
    {
      tab: 'merge' as TabType,
      title: t.cardMergeTitle,
      desc: t.cardMergeDesc,
      icon: Combine,
      color: 'from-purple-600 to-pink-600',
    },
    {
      tab: 'split' as TabType,
      title: t.cardSplitTitle,
      desc: t.cardSplitDesc,
      icon: Split,
      color: 'from-emerald-600 to-teal-600',
    },
    {
      tab: 'sign' as TabType,
      title: t.cardSignTitle,
      desc: t.cardSignDesc,
      icon: PenTool,
      color: 'from-amber-600 to-orange-600',
    },
    {
      tab: 'compress' as TabType,
      title: t.cardCompressTitle,
      desc: t.cardCompressDesc,
      icon: Minimize2,
      color: 'from-rose-600 to-red-600',
    },
    {
      tab: 'protect' as TabType,
      title: t.cardProtectTitle,
      desc: t.cardProtectDesc,
      icon: ShieldCheck,
      color: 'from-slate-700 to-slate-900',
    },
  ]

  return (
    <div className={`flex-1 flex flex-col h-full overflow-y-auto select-none p-8 transition-colors duration-150 ${
      isDark ? 'bg-[#0C0D12]' : 'bg-[#F4F5F8]'
    }`}>
      <div className="max-w-4xl mx-auto w-full space-y-7">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-indigo-500 font-mono text-xs font-bold mb-1">
              <Sparkles size={14} />
              <span>EDITIN // DOCUMENT STUDIO</span>
            </div>
            <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t.welcomeHeading}
            </h1>
            <p className={`text-xs mt-1 max-w-xl leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {t.welcomeSub}
            </p>
          </div>

          <button
            onClick={onOpenFile}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center space-x-2 active:scale-95 shrink-0"
          >
            <UploadCloud size={16} />
            <span>{t.openPdfBtn}</span>
          </button>
        </div>

        {/* Active Document Status Card (If loaded) */}
        {fileName && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-xl transition-all ${
            isDark 
              ? 'bg-gradient-to-r from-indigo-950/40 via-[#13151D] to-[#13151D] border-indigo-500/30' 
              : 'bg-white border-indigo-200 shadow-indigo-100'
          }`}>
            <div className="flex items-center space-x-3.5 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shrink-0">
                <FileText size={20} />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-bold shrink-0">
                    {t.docActive}
                  </span>
                  <h3 className={`text-xs font-bold truncate max-w-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                    {fileName}
                  </h3>
                </div>
                <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {pageCount} {t.pagesReady}
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('editor')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center space-x-1.5 shrink-0 ${
                isDark 
                  ? 'bg-white/10 hover:bg-white/20 text-white' 
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
              }`}
            >
              <span>{t.openEditor}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Feature Grid */}
        <div>
          <h2 className={`text-[11px] font-bold uppercase tracking-wider mb-3 px-1 ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {t.chooseFeature}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {featureCards.map((feat) => {
              const Icon = feat.icon

              return (
                <div
                  key={feat.tab}
                  onClick={() => onNavigate(feat.tab)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all duration-150 flex flex-col justify-between group shadow-sm hover:shadow-xl hover:-translate-y-0.5 ${
                    isDark 
                      ? 'bg-[#13151D] hover:bg-[#181A25] border-white/5 hover:border-indigo-500/40' 
                      : 'bg-white hover:bg-slate-50/80 border-slate-200/80 hover:border-indigo-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${feat.color} flex items-center justify-center text-white shadow-md shadow-indigo-600/10`}>
                        <Icon size={18} />
                      </div>
                      {feat.tag && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          isDark ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {feat.tag}
                        </span>
                      )}
                    </div>

                    <h3 className={`text-xs font-bold transition-colors ${
                      isDark ? 'text-slate-100 group-hover:text-indigo-300' : 'text-slate-800 group-hover:text-indigo-600'
                    }`}>
                      {feat.title}
                    </h3>
                    <p className={`text-[11px] mt-1 leading-relaxed ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {feat.desc}
                    </p>
                  </div>

                  <div className="flex items-center text-[11px] text-indigo-500 font-semibold mt-4 group-hover:translate-x-1 transition-transform">
                    <span>{t.startFeature}</span>
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
