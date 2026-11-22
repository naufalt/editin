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
  BookOpen,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Languages,
} from 'lucide-react'
import { useAppSettings } from '../../store/settingsStore'

export type TabType =
  | 'dashboard'
  | 'editor'
  | 'pages'
  | 'merge'
  | 'split'
  | 'sign'
  | 'compress'
  | 'protect'
  | 'guide'
  | 'settings'

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

  const toolItems = [
    { id: 'dashboard' as TabType, label: t.navDashboard, icon: Home },
    { id: 'editor' as TabType, label: t.navEditor, icon: FileEdit },
    { id: 'pages' as TabType, label: t.navPages, icon: LayoutGrid },
    { id: 'merge' as TabType, label: t.navMerge, icon: Combine },
    { id: 'split' as TabType, label: t.navSplit, icon: Split },
    { id: 'sign' as TabType, label: t.navSign, icon: PenTool },
    { id: 'compress' as TabType, label: t.navCompress, icon: Minimize2 },
    { id: 'protect' as TabType, label: t.navProtect, icon: ShieldCheck },
  ]

  const systemItems = [
    {
      id: 'guide' as TabType,
      label: language === 'id' ? 'Panduan' : 'Guide',
      icon: BookOpen,
    },
    {
      id: 'settings' as TabType,
      label: language === 'id' ? 'Pengaturan' : 'Settings',
      icon: Sliders,
    },
  ]

  const renderNavButton = (item: { id: TabType; label: string; icon: React.ElementType }) => {
    const Icon = item.icon
    const isActive = activeTab === item.id
    return (
      <button
        key={item.id}
        onClick={() => onSelectTab(item.id)}
        title={isCollapsed ? item.label : undefined}
        className={`w-full flex items-center ${
          isCollapsed ? 'justify-center px-0' : 'justify-start px-3'
        } py-2 rounded-xl text-xs font-medium transition-all duration-150 gap-2.5 ${
          isActive
            ? isDark
              ? 'bg-[#1C202B] text-white shadow-sm border border-indigo-500/30 font-semibold'
              : 'bg-[#F8FAFC] text-slate-900 shadow-sm border border-slate-300/90 font-semibold'
            : isDark
              ? 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
              : 'text-slate-600 hover:bg-slate-300/50 hover:text-slate-900 border border-transparent'
        }`}
      >
        <Icon
          className={`w-4 h-4 flex-shrink-0 transition-colors ${
            isActive
              ? isDark
                ? 'text-indigo-400'
                : 'text-indigo-600'
              : 'text-slate-500'
          }`}
        />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </button>
    )
  }

  return (
    <aside
      className={`h-full flex-shrink-0 flex flex-col justify-between p-3 select-none border-r transition-all duration-300 ease-in-out ${
        isDark
          ? 'border-slate-800/80 bg-[#11131A]'
          : 'border-slate-300/70 bg-[#E3E8F0]'
      } ${isCollapsed ? 'w-16' : 'w-56'}`}
    >
      {/* Primary Navigation */}
      <div className="space-y-1 overflow-y-auto pr-0.5">
        <div className="flex items-center justify-between px-2 py-1.5 min-h-[32px]">
          {!isCollapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 truncate">
              {language === 'id' ? 'Workspace' : 'Workspace'}
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand' : 'Collapse'}
            className={`p-1.5 rounded-lg text-slate-500 transition-colors ${
              isDark
                ? 'hover:text-slate-200 hover:bg-slate-800/60'
                : 'hover:text-slate-700 hover:bg-slate-300/60'
            } ${isCollapsed ? 'mx-auto' : ''}`}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {toolItems.map(renderNavButton)}

        <div className={`my-2 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-300/70'}`} />

        {systemItems.map(renderNavButton)}
      </div>

      {/* Bottom Quick Utilities */}
      <div className={`space-y-2 pt-3 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-300/70'}`}>
        <div className={`flex items-center gap-1.5 ${isCollapsed ? 'flex-col' : ''}`}>
          <button
            onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
            title="Switch Language"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-[11px] font-medium border transition-colors ${
              isDark
                ? 'bg-[#181B24] border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-[#F8FAFC] border-slate-300/80 text-slate-700 hover:bg-white'
            }`}
          >
            <Languages className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            {!isCollapsed && <span className="uppercase font-mono">{language}</span>}
          </button>

          <button
            onClick={toggleTheme}
            title={isDark ? 'Light Mode' : 'Dark Mode'}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-[11px] font-medium border transition-colors ${
              isDark
                ? 'bg-[#181B24] border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-[#F8FAFC] border-slate-300/80 text-slate-700 hover:bg-white'
            }`}
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
            )}
            {!isCollapsed && <span>{isDark ? 'Light' : 'Dark'}</span>}
          </button>
        </div>

        {!isCollapsed && (
          <div className="flex items-center justify-center gap-1.5 py-1 text-[10px] font-mono text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>100% OFFLINE STUDIO</span>
          </div>
        )}
      </div>
    </aside>
  )
}
