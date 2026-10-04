import React, { useState } from 'react';
import { 
  Terminal, 
  Lock, 
  Mail, 
  User, 
  Phone,
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  KeyRound,
  Globe,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  AtSign,
  ShieldCheck
} from 'lucide-react';
import { Language, ThemeMode } from '../../types';
import { translations } from '../../locales/translations';

interface AuthViewProps {
  onSuccess: (username: string) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onSuccess,
  language,
  onLanguageChange,
  theme,
  onThemeToggle,
}) => {
  const [viewMode, setViewMode] = useState<'signin' | 'register' | 'forgot'>('signin');
  
  // Sign In Form States
  const [signInIdentifier, setSignInIdentifier] = useState('admin_user');
  const [signInPassword, setSignInPassword] = useState('NetMigrate@2026');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register Form States
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // 2-Step Forgot Password Form States
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Validation & Loading States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const t = translations[language];

  // Quick autofill demo credentials
  const handleAutoFillDemo = () => {
    setViewMode('signin');
    setResetStep(1);
    setSignInIdentifier('admin_user');
    setSignInPassword('NetMigrate@2026');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Switch to forgot password mode
  const handleOpenForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setViewMode('forgot');
    setResetStep(1);
    setResetIdentifier(signInIdentifier || '');
    setNewPassword('');
    setConfirmNewPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Submit Sign In
  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!signInIdentifier.trim() || !signInPassword.trim()) {
      setErrorMsg(t.auth.requiredFields);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess(signInIdentifier.trim());
    }, 600);
  };

  // Submit Register
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (
      !registerFullName.trim() ||
      !registerUsername.trim() ||
      !registerEmail.trim() ||
      !registerPhone.trim() ||
      !registerPassword.trim() ||
      !registerConfirmPassword.trim()
    ) {
      setErrorMsg(t.auth.requiredFields);
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setErrorMsg(t.auth.passwordMismatch);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess(registerUsername.trim() || 'new_user');
    }, 600);
  };

  // Step 1: Identify User -> Move to Step 2
  const handleResetStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!resetIdentifier.trim()) {
      setErrorMsg(t.auth.requiredFields);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setResetStep(2);
    }, 450);
  };

  // Step 2: Set New Password -> Save & Redirect to Sign In
  const handleResetStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      setErrorMsg(t.auth.requiredFields);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg(t.auth.passwordMismatch);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMsg(t.auth.resetSuccessMsg);

      // Auto redirect to Sign In mode
      setTimeout(() => {
        setSignInIdentifier(resetIdentifier);
        setSignInPassword(newPassword);
        setViewMode('signin');
        setResetStep(1);
        setNewPassword('');
        setConfirmNewPassword('');
        setSuccessMsg(null);
      }, 1500);
    }, 650);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-slate-100 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 flex flex-col justify-between relative overflow-hidden select-none font-sans transition-colors duration-200`}>
      {/* Background Ambient Glow Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-3xl pointer-events-none animate-pulse duration-1000" />
      <div className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] bg-teal-600/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Subtle Dot Matrix Grid */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-35 dark:opacity-25 pointer-events-none" 
      />

      {/* Top Utility Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0d9488] shadow-md shadow-teal-500/30 flex items-center justify-center text-white">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
              NetMigrate
            </span>
          </div>
        </div>

        {/* Language & Theme Controls */}
        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <button
            type="button"
            onClick={() => onLanguageChange(language === 'en' ? 'th' : 'en')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition-colors cursor-pointer"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-[#0d9488]" />
            <span className="font-semibold uppercase">{language === 'en' ? 'ไทย' : 'EN'}</span>
          </button>

          {/* Theme Toggle (Sun in Dark, Moon in Light) */}
          <button
            type="button"
            onClick={onThemeToggle}
            className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </header>

      {/* Main Glassmorphic Auth Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className={`w-full ${viewMode === 'register' ? 'max-w-xl' : 'max-w-md'} rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xl shadow-slate-300/40 dark:shadow-2xl dark:shadow-slate-950/80 p-6 sm:p-8 transition-all duration-300`}>
          
          {/* Card Header & Branding */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#0d9488] shadow-lg shadow-teal-500/25 flex items-center justify-center text-white mx-auto mb-3">
              <Terminal className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {viewMode === 'signin' && t.auth.welcomeBack}
              {viewMode === 'register' && t.auth.createAccountTitle}
              {viewMode === 'forgot' && (resetStep === 1 ? t.auth.resetPasswordTitle : t.auth.resetStep2Title)}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-md mx-auto text-balance [text-wrap:balance]">
              {viewMode === 'signin' && t.auth.welcomeBackSubtitle}
              {viewMode === 'register' && t.auth.createAccountSubtitle}
              {viewMode === 'forgot' && (resetStep === 1 ? t.auth.resetPasswordSubtitle : t.auth.resetStep2Subtitle)}
            </p>
          </div>

          {/* Tab Switcher Segmented Control (Shown on signin / register) */}
          {viewMode !== 'forgot' && (
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  setViewMode('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewMode === 'signin'
                    ? 'bg-[#0d9488] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{t.auth.signInTab}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewMode === 'register'
                    ? 'bg-[#0d9488] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{t.auth.registerTab}</span>
              </button>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW 1: SIGN IN FORM */}
          {viewMode === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              {/* Identifier Input: Username or Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.auth.emailOrUsername}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={signInIdentifier}
                    onChange={(e) => setSignInIdentifier(e.target.value)}
                    placeholder={t.auth.emailOrUsernamePlaceholder}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488] transition-colors shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Field with Show/Hide toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t.auth.password}
                  </label>
                  <a
                    href="#forgot"
                    onClick={handleOpenForgotPassword}
                    className="text-[11px] text-[#0d9488] hover:text-teal-700 dark:hover:text-teal-400 transition-colors cursor-pointer"
                  >
                    {t.auth.forgotPassword}
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder={t.auth.passwordPlaceholder}
                    className="w-full h-10 pl-9 pr-10 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488] transition-colors shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={showSignInPassword ? t.auth.hidePassword : t.auth.showPassword}
                  >
                    {showSignInPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 shrink-0 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-[#0d9488] focus:ring-[#0d9488] focus:ring-offset-white dark:focus:ring-offset-slate-900 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 leading-normal">{t.auth.rememberMe}</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-900/20 dark:shadow-teal-900/40 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t.auth.signInBtn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Demo Auto-fill Pill */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAutoFillDemo}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#0d9488]" />
                    <span>{t.auth.demoCredentialsTitle}</span>
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">admin_user</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW 2: CREATE ACCOUNT (REGISTER) FORM */}
          {viewMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Row 1: Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t.auth.fullName}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={registerFullName}
                      onChange={(e) => setRegisterFullName(e.target.value)}
                      placeholder={t.auth.fullNamePlaceholder}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488] transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t.auth.username}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <AtSign className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      placeholder={t.auth.usernamePlaceholder}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488] transition-colors shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Email & Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t.auth.email}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder={t.auth.emailPlaceholder}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488] transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t.auth.phone}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      placeholder={t.auth.phonePlaceholder}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488] transition-colors shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t.auth.password}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder={t.auth.passwordPlaceholder}
                      className="w-full h-10 pl-9 pr-10 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488] transition-colors shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title={showRegisterPassword ? t.auth.hidePassword : t.auth.showPassword}
                    >
                      {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t.auth.confirmPassword}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegisterConfirmPassword ? 'text' : 'password'}
                      required
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      placeholder={t.auth.confirmPasswordPlaceholder}
                      className="w-full h-10 pl-9 pr-10 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488] transition-colors shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title={showRegisterConfirmPassword ? t.auth.hidePassword : t.auth.showPassword}
                    >
                      {showRegisterConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 shrink-0 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-[#0d9488] focus:ring-[#0d9488] focus:ring-offset-white dark:focus:ring-offset-slate-900 cursor-pointer"
                />
                <label htmlFor="agreeTerms" className="text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer leading-normal select-none">
                  {t.auth.termsNotice}
                </label>
              </div>

              {/* Submit Register Button */}
              <button
                type="submit"
                disabled={isLoading || !agreeTerms}
                className="w-full h-10 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-900/20 dark:shadow-teal-900/40 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t.auth.createAccountBtn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* VIEW 3: 2-STEP RESET PASSWORD (FORGOT) FORM */}
          {viewMode === 'forgot' && (
            <div className="space-y-4">
              {/* Step indicator pill */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${resetStep === 1 ? 'bg-[#0d9488] text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                  1
                </span>
                <span className="w-8 h-0.5 bg-slate-200 dark:bg-slate-700" />
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${resetStep === 2 ? 'bg-[#0d9488] text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                  2
                </span>
              </div>

              {/* STEP 1: Identify User */}
              {resetStep === 1 && (
                <form onSubmit={handleResetStep1Submit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t.auth.emailOrUsername}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={resetIdentifier}
                        onChange={(e) => setResetIdentifier(e.target.value)}
                        placeholder={t.auth.resetInputPlaceholder}
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488] transition-colors shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Continue Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-900/20 dark:shadow-teal-900/40 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{t.auth.continueBtn}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Back to Sign In Link */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('signin');
                        setResetStep(1);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{t.auth.backToSignIn}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Set New Password */}
              {resetStep === 2 && (
                <form onSubmit={handleResetStep2Submit} className="space-y-4">
                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t.auth.newPassword}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t.auth.newPasswordPlaceholder}
                        className="w-full h-10 pl-9 pr-10 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488] transition-colors shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title={showNewPassword ? t.auth.hidePassword : t.auth.showPassword}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t.auth.confirmNewPassword}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder={t.auth.confirmNewPasswordPlaceholder}
                        className="w-full h-10 pl-9 pr-10 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488] transition-colors shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title={showConfirmNewPassword ? t.auth.hidePassword : t.auth.showPassword}
                      >
                        {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Reset & Save Password Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-900/20 dark:shadow-teal-900/40 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{t.auth.resetAndSaveBtn}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Back Navigation Links */}
                  <div className="pt-2 flex items-center justify-between text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setResetStep(1);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{language === 'th' ? 'กลับขั้นตอนที่ 1' : 'Back to Step 1'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('signin');
                        setResetStep(1);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-[#0d9488] hover:text-teal-700 dark:hover:text-teal-400 transition-colors cursor-pointer"
                    >
                      <span>{t.auth.backToSignIn}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800/40">
        NetMigrate v2.4 • High-Trust CLI Translation Platform
      </footer>
    </div>
  );
};
