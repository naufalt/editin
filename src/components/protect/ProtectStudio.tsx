import React, { useState } from 'react'
import { ShieldCheck, Lock, Eye, EyeOff, FileText, CheckCircle2 } from 'lucide-react'

interface ProtectStudioProps {
  fileName: string | null
  totalPageCount: number
  passwordValue: string
  onPasswordChange: (val: string) => void
}

export const ProtectStudio: React.FC<ProtectStudioProps> = ({
  fileName,
  totalPageCount,
  passwordValue,
  onPasswordChange,
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')

  const isMatched = passwordValue.length > 0 && passwordValue === confirmPassword
  const isTooShort = passwordValue.length > 0 && passwordValue.length < 4

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0C0D12] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#13151D] shrink-0">
        <div className="flex items-center space-x-2">
          <ShieldCheck size={17} className="text-indigo-400" />
          <span className="text-sm font-bold text-slate-100">Kunci Sandi & Keamanan Dokumen</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Enkripsi AES/RC4 128-bit
        </span>
      </div>

      {/* Main Settings */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto w-full my-auto">
          <div className="bg-[#13151D] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
          {/* File summary */}
          <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-white/5 border border-white/5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FileText size={20} />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-semibold text-slate-200 truncate">
                {fileName || 'Dokumen Aktif'}
              </h4>
              <span className="text-[11px] text-slate-400">
                {totalPageCount} Halaman • Siap Diamankan
              </span>
            </div>
          </div>

          {/* Password Input Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Kata Sandi Pembuka Dokumen:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordValue}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder="Masukkan kata sandi rahasia..."
                  className="w-full bg-[#0C0D12] border border-white/15 focus:border-indigo-500 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors"
                />
                <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Ulangi Kata Sandi:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi..."
                  className="w-full bg-[#0C0D12] border border-white/15 focus:border-indigo-500 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors"
                />
                <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>
            </div>
          </div>

          {/* Validation Feedback */}
          {passwordValue.length > 0 && (
            <div className={`p-3.5 rounded-xl border flex items-center space-x-2.5 ${
              isMatched && !isTooShort
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}>
              {isMatched && !isTooShort ? (
                <>
                  <CheckCircle2 size={16} />
                  <span className="text-xs font-medium">
                    Kata sandi cocok dan siap dipasang ke dokumen
                  </span>
                </>
              ) : (
                <span className="text-xs">
                  {isTooShort
                    ? 'Kata sandi minimal 4 karakter'
                    : 'Kata sandi konfirmasi belum sesuai'}
                </span>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Dokumen yang dikunci sandi memerlukan kata sandi ini setiap kali dibuka di aplikasi PDF mana pun (Adobe Acrobat, Google Chrome, Microsoft Edge, dll.).
          </p>
          </div>
        </div>
      </div>
    </div>
  )
}
