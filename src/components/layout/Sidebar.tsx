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
  Moon,
  Languages
} from 'lucide-react'
import { useAppSettings } from '../../store/settingsStore'

export type TabType = 'dashboard' | 'editor' | 'pages' | 'merge' | 'split' | 'sign' | 'compress' | 'protect'

interface SidebarProps {
  activeTab: TabType
  onSelectTab: (tab: TabType) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { isDark, toggleTheme, language, setLanguage, t } = useAppSettings()

  const navItems = [
    { 
      id: 'dashboard' as TabType, 
      label: t.navDashboard, 
      icon: Home, 
      desc: t.navDashboardDesc 
    },
    { 
      id: 'editor' as TabType, 
      label: t.navEditor, 
      icon: FileEdit, 
      desc: t.navEditorDesc,
      badge: t.badgePrimary
    },
    { 
      id: 'pages' as TabType, 
      label: t.navPages, 
      icon: LayoutGrid, 
      desc: t.navPagesDesc 
    },
    { 
      id: 'merge' as TabType, 
      label: t.navMerge, 
      icon: Combine, 
      desc: t.navMergeDesc 
    },
    { 
      id: 'split' as TabType, 
      label: t.navSplit, 
      icon: Split, 
      desc: t.navSplitDesc 
    },
    { 
      id: 'sign' as TabType, 
      label: t.navSign, 
      icon: PenTool, 
      desc: t.navSignDesc 
    },
    { 
      id: 'compress' as TabType, 
      label: t.navCompress, 
      icon: Minimize2, 
      desc: t.navCompressDesc 
    },
    { 
      id: 'protect' as TabType, 
      label: t.navProtect, 
      icon: ShieldCheck, 
      desc: t.navProtectDesc 
    },
  ]

  return (
    <aside 
      className={`h-[calc(100vh-2.5rem)] border-r flex flex-col justify-between transition-all duration-200 select-none ${
        isDark ? 'bg-[#0C0D12] border-white/5' : 'bg-[#FAFAFC] border-slate-200'
      } ${isCollapsed ? 'w-16' : 'w-64'}`}
    >
      {/* Top Header & Navigation */}
      <div className="p-3 overflow-y-auto">
        {/* Toggle Collapse Button */}
        <div className="flex items-center justify-between mb-3 px-2">
          {!isCollapsed && (
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {t.menuDoc}
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-lg transition-colors ml-auto ${
              isDark ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-200/60 text-slate-500 hover:text-slate-900'
            }`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
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
                    ? isDark 
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-inner' 
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                    : isDark 
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border border-transparent'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`p-1.5 rounded-lg mr-3 transition-colors ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' 
                    : isDark 
                      ? 'bg-white/5 group-hover:bg-white/10 text-slate-400 group-hover:text-slate-200' 
                      : 'bg-white group-hover:bg-slate-100 text-slate-500 group-hover:text-slate-800 shadow-xs'
                }`}>
                  <Icon size={16} />
                </div>
                
                {!isCollapsed && (
                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate leading-snug">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isDark ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] truncate mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {item.desc}
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom Footer Actions (Theme & Language Switchers) */}
      <div className={`p-3 border-t space-y-1.5 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
        {/* Language selector */}
        <div className={`flex items-center rounded-xl p-1.5 ${isDark ? 'bg-white/5' : 'bg-slate-200/50'}`}>
          <div className="p-1 rounded text-indigo-400 shrink-0">
            <Languages size={15} />
          </div>
          {!isCollapsed ? (
            <div className="flex-1 flex items-center justify-end space-x-1 ml-2">
              <button
                onClick={() => setLanguage('id')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  language === 'id' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ID
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  language === 'en' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
              className="w-full text-center text-[10px] font-bold text-indigo-400"
              title="Ganti Bahasa (ID / EN)"
            >
              {language.toUpperCase()}
            </button>
          )}
        </div>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center p-2 rounded-xl transition-colors ${
            isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
          title={isDark ? t.lightMode : t.darkMode}
        >
          <div className={`p-1.5 rounded-lg mr-3 ${isDark ? 'bg-white/5' : 'bg-white shadow-xs'}`}>
            {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-600" />}
          </div>
          {!isCollapsed && (
            <span className="text-xs font-medium">
              {isDark ? t.lightMode : t.darkMode}
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
