import React, { useState } from 'react'
import { ShieldCheck, FileText, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { useAppSettings } from '../../store/settingsStore'

interface ProtectStudioProps {
  fileName: string | null
  totalPageCount: number
  passwordValue: string
  onPasswordChange: (pwd: string) => void
}

export const ProtectStudio: React.FC<ProtectStudioProps> = ({
  fileName,
  totalPageCount,
  passwordValue,
  onPasswordChange,
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const { isDark, t } = useAppSettings()

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden select-none transition-colors duration-150 ${
      isDark ? 'bg-[#0C0D12]' : 'bg-[#F4F5F8]'
    }`}>
      {/* Top Header */}
      <div className={`h-14 border-b px-6 flex items-center justify-between shrink-0 transition-colors duration-150 ${
        isDark ? 'bg-[#13151D] border-white/5' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center space-x-2">
          <ShieldCheck size={17} className="text-indigo-500" />
          <span className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {t.protectHeader}
          </span>
        </div>
      </div>

      {/* Main Settings */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto w-full my-auto space-y-4">
          <div className={`border rounded-2xl p-5 shadow-xl space-y-5 transition-colors duration-150 ${
            isDark ? 'bg-[#13151D] border-white/5' : 'bg-white border-slate-200'
          }`}>
            {/* File summary */}
            <div className={`flex items-center space-x-3 p-3.5 rounded-xl border ${
              isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                <FileText size={20} />
              </div>
              <div className="overflow-hidden flex-1">
                <h4 className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {fileName || 'Dokumen Aktif'}
                </h4>
                <span className={`text-[11px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {totalPageCount} {t.pageUnit}
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-xs font-bold font-mono shrink-0 flex items-center space-x-1">
                <Lock size={12} />
                <span>128-bit Encrypt</span>
              </div>
            </div>

            {/* Password input card */}
            <div className="space-y-3">
              <label className={`text-xs font-semibold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t.inputPasswordLabel}
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordValue}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder={t.inputPasswordPlaceholder}
                  className={`w-full text-xs font-mono px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    isDark 
                      ? 'bg-black/30 border-white/10 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                    isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title={showPassword ? t.hidePassword : t.showPassword}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {passwordValue.length > 0 && passwordValue.length < 4 && (
                <span className="text-[11px] text-amber-500 font-medium block">
                  * Sandi minimal 4 karakter
                </span>
              )}
            </div>

            <div className={`p-3 rounded-xl border flex items-center space-x-2.5 text-xs ${
              isDark ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <ShieldAlert size={15} className="text-indigo-500 shrink-0" />
              <span>
                {t.securityNotice}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
