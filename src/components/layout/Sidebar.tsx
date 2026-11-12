import React from 'react'
import { 
  Home,
  FileEdit,
  LayoutGrid, 
  Combine, 
  Split, 
  PenTool, 
  Minimize2, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react'

export type TabType = 'dashboard' | 'editor' | 'pages' | 'merge' | 'split' | 'sign' | 'compress' | 'protect'

interface SidebarProps {
  activeTab: TabType
  onSelectTab: (tab: TabType) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  isDark: boolean
  onToggleTheme: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isDark,
  onToggleTheme
}) => {
  const navItems = [
    { 
      id: 'dashboard' as TabType, 
      label: 'Beranda / Dashboard', 
      icon: Home, 
      desc: 'Pilihan cepat & status dokumen' 
    },
    { 
      id: 'editor' as TabType, 
      label: 'Edit Isi Dokumen', 
      icon: FileEdit, 
      desc: 'Tambah teks, foto & tipex',
      badge: 'Utama'
    },
    { 
      id: 'pages' as TabType, 
      label: 'Susun Halaman', 
      icon: LayoutGrid, 
      desc: 'Atur urutan, putar & hapus' 
    },
    { 
      id: 'merge' as TabType, 
      label: 'Gabung PDF', 
      icon: Combine, 
      desc: 'Satukan beberapa file jadi satu' 
    },
    { 
      id: 'split' as TabType, 
      label: 'Pisah Halaman', 
      icon: Split, 
      desc: 'Ambil atau potong halaman tertentu' 
    },
    { 
      id: 'sign' as TabType, 
      label: 'Tanda Tangan & Cap', 
      icon: PenTool, 
      desc: 'Tanda tangan digital & cap resmi' 
    },
    { 
      id: 'compress' as TabType, 
      label: 'Kecilkan Ukuran', 
      icon: Minimize2, 
      desc: 'Kompres agar lolos syarat upload' 
    },
    { 
      id: 'protect' as TabType, 
      label: 'Kunci Sandi', 
      icon: ShieldCheck, 
      desc: 'Pasang password pengaman' 
    },
  ]

  return (
    <aside 
      className={`h-[calc(100vh-2.5rem)] bg-[#0C0D12] border-r border-white/5 flex flex-col justify-between transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header & Navigation */}
      <div className="p-3">
        {/* Toggle Collapse Button */}
        <div className="flex items-center justify-between mb-3 px-2">
          {!isCollapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Menu Dokumen
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors ml-auto"
            title={isCollapsed ? "Buka menu" : "Sembunyikan menu"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center rounded-xl p-2.5 transition-all text-left group ${
                  isActive 
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-inner' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`p-1.5 rounded-lg mr-3 transition-colors ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' 
                    : 'bg-white/5 group-hover:bg-white/10 text-slate-400 group-hover:text-slate-200'
                }`}>
                  <Icon size={17} />
                </div>
                
                {!isCollapsed && (
                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate leading-snug">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {item.desc}
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom Footer Actions (Theme Switcher) */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={onToggleTheme}
          className="w-full flex items-center p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          title="Ganti Tema Gelap / Terang"
        >
          <div className="p-1.5 rounded-lg bg-white/5 mr-3">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </div>
          {!isCollapsed && (
            <span className="text-xs font-medium">
              {isDark ? 'Mode Terang' : 'Mode Gelap'}
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
