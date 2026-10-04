import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  Shield,
  Sliders,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  LogOut,
  Save,
  Radio,
  Lock,
  Globe,
  Sun,
  Moon,
  Eye,
  EyeOff,
  KeyRound,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { Language, ThemeMode, Vendor, UserProfile } from '../../types';
import { translations } from '../../locales/translations';
import { getInitials } from '../../utils/avatar';

interface SettingsViewProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
  onLogout: () => void;
  onResetStorage: () => void;
  userProfile?: UserProfile;
  onUpdateProfile?: (profile: UserProfile) => void;
  initialSection?: 'general' | 'eveng' | 'engine' | 'security' | 'session';
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  language,
  onLanguageChange,
  theme,
  onThemeToggle,
  onLogout,
  onResetStorage,
  userProfile,
  onUpdateProfile,
  initialSection,
}) => {
  const t = translations[language];

  // User Profile editable states
  const [fullName, setFullName] = useState(userProfile?.fullName || 'Alex Morgan');
  const [email, setEmail] = useState(userProfile?.email || 'admin@enterprise.local');
  const [phone, setPhone] = useState(userProfile?.phone || '081-234-5678');
  const username = userProfile?.username || 'admin_user';

  // Real-time synchronization if parent userProfile changes
  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.fullName);
      setEmail(userProfile.email);
      setPhone(userProfile.phone);
    }
  }, [userProfile]);

  // Real-time change handlers syncing instantly with parent Header & Dropdown
  const handleFullNameChange = (val: string) => {
    setFullName(val);
    if (onUpdateProfile) {
      onUpdateProfile({
        fullName: val,
        username,
        email,
        phone,
      });
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (onUpdateProfile) {
      onUpdateProfile({
        fullName,
        username,
        email: val,
        phone,
      });
    }
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (onUpdateProfile) {
      onUpdateProfile({
        fullName,
        username,
        email,
        phone: val,
      });
    }
  };

  // Real-time dynamic avatar initials based on typed Full Name
  const avatarInitials = getInitials(fullName);

  // Active section tab (synced with initialSection if routed from header dropdown)
  const [activeSection, setActiveSection] = useState<'general' | 'eveng' | 'engine' | 'security' | 'session'>(
    initialSection || 'general'
  );

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // Form states
  const [evengHost, setEvengHost] = useState('192.168.10.150');
  const [evengPort, setEvengPort] = useState(443);
  const [evengHttps, setEvengHttps] = useState(true);
  const [evengToken, setEvengToken] = useState('netdevops-bearer-token-sec998');
  const [testingEveng, setTestingEveng] = useState(false);
  const [evengStatus, setEvengStatus] = useState<string | null>(null);

  // Engine preferences
  const [defaultSource, setDefaultSource] = useState<Vendor>('cisco');
  const [defaultTarget, setDefaultTarget] = useState<Vendor>('huawei');
  const [strictMode, setStrictMode] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);

  // Security preferences
  const [maskPasswords, setMaskPasswords] = useState(true);
  const [withholdUnsafe, setWithholdUnsafe] = useState(true);

  // Change Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Save feedback
  const [savedToast, setSavedToast] = useState(false);

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setChangePasswordError(language === 'th' ? 'กรุณากรอกข้อมูลให้ครบทุกช่อง' : 'Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError(language === 'th' ? 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน' : 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setChangePasswordError(language === 'th' ? 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' : 'New password must be at least 6 characters.');
      return;
    }

    setUpdatingPassword(true);
    setTimeout(() => {
      setUpdatingPassword(false);
      setChangePasswordSuccess(
        language === 'th'
          ? 'อัปเดตรหัสผ่านสำเร็จเรียบร้อยแล้ว!'
          : 'Password updated successfully!'
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setChangePasswordSuccess(null), 4000);
    }, 600);
  };

  const handleSaveSettings = () => {
    // Persist engine & environment settings
    try {
      localStorage.setItem('netmigrate_eveng_host', evengHost);
      localStorage.setItem('netmigrate_strict_mode', String(strictMode));
      localStorage.setItem('netmigrate_auto_detect', String(autoDetect));
      localStorage.setItem('netmigrate_mask_passwords', String(maskPasswords));
    } catch (e) {}

    // Persist user profile changes (Full Name, Email, Phone)
    const updatedProfile: UserProfile = {
      fullName: fullName.trim() || 'Alex Morgan',
      username,
      email: email.trim() || 'admin@enterprise.local',
      phone: phone.trim() || '081-234-5678',
    };

    try {
      localStorage.setItem('netmigrate_user_profile', JSON.stringify(updatedProfile));
    } catch (e) {}

    if (onUpdateProfile) {
      onUpdateProfile(updatedProfile);
    }

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleTestEveng = () => {
    setTestingEveng(true);
    setEvengStatus(null);
    setTimeout(() => {
      setTestingEveng(false);
      setEvengStatus(t.settings.evengConnSuccess);
    }, 900);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1F8A7A] text-white text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{t.settings.savedToast}</span>
        </div>
      )}

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-[#1F8A7A]" />
            <span>{t.settings.title}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t.settings.subtitle}
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="h-10 min-h-[40px] px-5 text-xs font-semibold rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] text-white inline-flex items-center gap-2 transition-colors shadow-2xs self-start sm:self-auto leading-none whitespace-nowrap"
        >
          <Save className="w-4 h-4 shrink-0" />
          <span>{t.common.save}</span>
        </button>
      </div>

      {/* Tabs Menu Navigation (Strict fixed height to prevent layout shift) */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveSection('general')}
          className={`h-9 min-h-[36px] px-3.5 rounded-lg font-medium inline-flex items-center gap-2 transition-all leading-none whitespace-nowrap ${
            activeSection === 'general'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span>{t.settings.tabGeneral}</span>
        </button>

        <button
          onClick={() => setActiveSection('eveng')}
          className={`h-9 min-h-[36px] px-3.5 rounded-lg font-medium inline-flex items-center gap-2 transition-all leading-none whitespace-nowrap ${
            activeSection === 'eveng'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Server className="w-3.5 h-3.5 shrink-0" />
          <span>{t.settings.tabEveng}</span>
        </button>

        <button
          onClick={() => setActiveSection('engine')}
          className={`h-9 min-h-[36px] px-3.5 rounded-lg font-medium inline-flex items-center gap-2 transition-all leading-none whitespace-nowrap ${
            activeSection === 'engine'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 shrink-0" />
          <span>{t.settings.tabEngine}</span>
        </button>

        <button
          onClick={() => setActiveSection('security')}
          className={`h-9 min-h-[36px] px-3.5 rounded-lg font-medium inline-flex items-center gap-2 transition-all leading-none whitespace-nowrap ${
            activeSection === 'security'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <span>{t.settings.tabSecurity}</span>
        </button>

        <button
          onClick={() => setActiveSection('session')}
          className={`h-9 min-h-[36px] px-3.5 rounded-lg font-medium inline-flex items-center gap-2 transition-all leading-none whitespace-nowrap ${
            activeSection === 'session'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 shrink-0" />
          <span>{t.settings.tabSession}</span>
        </button>
      </div>

      {/* Main Settings Panel */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-6 space-y-6">
        {/* Section 1: General & UI */}
        {activeSection === 'general' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t.settings.tabGeneral}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage appearance, bilingual typography, and layout stabilization.
              </p>
            </div>

            {/* Language Selection */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {t.settings.appLanguage}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.settings.appLangDesc}
                  </div>
                </div>

                <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    onClick={() => onLanguageChange('en')}
                    className={`h-8 min-h-[32px] px-3 rounded-md font-semibold inline-flex items-center gap-1.5 transition-all leading-none ${
                      language === 'en'
                        ? 'bg-[#1F8A7A] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <span>English</span>
                  </button>
                  <button
                    onClick={() => onLanguageChange('th')}
                    className={`h-8 min-h-[32px] px-3 rounded-md font-semibold inline-flex items-center gap-1.5 transition-all leading-none ${
                      language === 'th'
                        ? 'bg-[#1F8A7A] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <span>ภาษาไทย</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Theme Selection */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {t.settings.themeMode}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.settings.themeDesc}
                  </div>
                </div>

                <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    onClick={() => theme !== 'dark' && onThemeToggle()}
                    className={`h-8 min-h-[32px] px-3 rounded-md font-semibold inline-flex items-center gap-1.5 transition-all leading-none ${
                      theme === 'dark'
                        ? 'bg-[#1F8A7A] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 shrink-0" />
                    <span>Dark Slate</span>
                  </button>
                  <button
                    onClick={() => theme !== 'light' && onThemeToggle()}
                    className={`h-8 min-h-[32px] px-3 rounded-md font-semibold inline-flex items-center gap-1.5 transition-all leading-none ${
                      theme === 'light'
                        ? 'bg-[#1F8A7A] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 shrink-0" />
                    <span>Light Slate</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: EVE-NG Lab Server */}
        {activeSection === 'eveng' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t.settings.tabEveng}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure direct REST API access to virtual networking lab nodes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t.settings.evengHost}
                </label>
                <input
                  type="text"
                  value={evengHost}
                  onChange={(e) => setEvengHost(e.target.value)}
                  placeholder={t.settings.evengHostPlaceholder}
                  className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t.settings.evengPort}
                </label>
                <input
                  type="number"
                  value={evengPort}
                  onChange={(e) => setEvengPort(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t.settings.evengToken}
                </label>
                <input
                  type="password"
                  value={evengToken}
                  onChange={(e) => setEvengToken(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={evengHttps}
                    onChange={(e) => setEvengHttps(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1F8A7A] focus:ring-0"
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {t.settings.evengHttps}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleTestEveng}
                  disabled={testingEveng}
                  className="h-9 px-4 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors leading-none disabled:opacity-50"
                >
                  <Radio className={`w-3.5 h-3.5 ${testingEveng ? 'animate-pulse text-teal-400' : ''}`} />
                  <span>{testingEveng ? t.common.loading : t.settings.evengTestConnection}</span>
                </button>
              </div>

              {evengStatus && (
                <div className="md:col-span-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{evengStatus}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 3: Translation Engine */}
        {activeSection === 'engine' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t.settings.tabEngine}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tune bidirectional parsing heuristics, strict rules, and auto-detect vendors.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.settings.defaultSource}
                  </label>
                  <select
                    value={defaultSource}
                    onChange={(e) => setDefaultSource(e.target.value as Vendor)}
                    className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  >
                    <option value="cisco">Cisco IOS-XE</option>
                    <option value="huawei">Huawei VRP</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.settings.defaultTarget}
                  </label>
                  <select
                    value={defaultTarget}
                    onChange={(e) => setDefaultTarget(e.target.value as Vendor)}
                    className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  >
                    <option value="huawei">Huawei VRP</option>
                    <option value="cisco">Cisco IOS-XE</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {t.settings.strictRulesOnly}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.settings.strictRulesDesc}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={strictMode}
                  onChange={(e) => setStrictMode(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1F8A7A] focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {t.settings.autoDetectVendor}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.settings.autoDetectDesc}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoDetect}
                  onChange={(e) => setAutoDetect(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1F8A7A] focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Security & Guardrails */}
        {activeSection === 'security' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t.settings.tabSecurity}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Zero-Leak credential withholding and production safety locks.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {t.settings.maskSecrets}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.settings.maskSecretsDesc}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={maskPasswords}
                  onChange={(e) => setMaskPasswords(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1F8A7A] focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {t.settings.withholdUnsafe}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.settings.withholdUnsafeDesc}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={withholdUnsafe}
                  onChange={(e) => setWithholdUnsafe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1F8A7A] focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900 text-amber-800 dark:text-amber-300">
                <div className="font-semibold flex items-center gap-1.5 mb-1">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Enterprise Guardrail Policy Active</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Plaintext passwords and secret tokens are withheld by default. CLI configurations exported for hardware execution will have secrets stripped to prevent credential leaks.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Account & Session */}
        {activeSection === 'session' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t.settings.tabSession}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Current operator credentials, session status, and sign-out controls.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* User Profile Summary Card matching SQLite Schema */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#1F8A7A] text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0 select-none transition-all">
                      {avatarInitials}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {fullName || (language === 'th' ? 'ไม่มีชื่อ' : 'Unnamed User')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {email || username}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{t.settings.activeSession}</span>
                  </div>
                </div>

                {/* Account Details Form Grid with Editable Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Full Name (Editable) */}
                  <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 focus-within:border-[#1F8A7A] focus-within:ring-1 focus-within:ring-[#1F8A7A] transition-all">
                    <label htmlFor="settings-profile-fullname" className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium select-none">
                      <User className="w-3.5 h-3.5 text-[#1F8A7A] shrink-0" />
                      <span>{language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'}</span>
                    </label>
                    <input
                      id="settings-profile-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => handleFullNameChange(e.target.value)}
                      placeholder={language === 'th' ? 'กรอกชื่อ-นามสกุล' : 'Enter full name'}
                      className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                    />
                  </div>

                  {/* Username (Read-only / Disabled) */}
                  <div className="p-3.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5 cursor-not-allowed">
                    <div className="flex items-center justify-between">
                      <label htmlFor="settings-profile-username" className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium select-none">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>{language === 'th' ? 'ชื่อผู้ใช้' : 'Username'}</span>
                      </label>
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                        {language === 'th' ? 'อ่านอย่างเดียว' : 'Read-only'}
                      </span>
                    </div>
                    <input
                      id="settings-profile-username"
                      type="text"
                      value={username}
                      disabled
                      readOnly
                      className="w-full bg-transparent font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed focus:outline-none"
                    />
                  </div>

                  {/* Email (Editable) */}
                  <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 focus-within:border-[#1F8A7A] focus-within:ring-1 focus-within:ring-[#1F8A7A] transition-all">
                    <label htmlFor="settings-profile-email" className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium select-none">
                      <Mail className="w-3.5 h-3.5 text-[#1F8A7A] shrink-0" />
                      <span>{language === 'th' ? 'อีเมล' : 'Email'}</span>
                    </label>
                    <input
                      id="settings-profile-email"
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder={language === 'th' ? 'กรอกอีเมล' : 'Enter email'}
                      className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                    />
                  </div>

                  {/* Phone (Editable) */}
                  <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 focus-within:border-[#1F8A7A] focus-within:ring-1 focus-within:ring-[#1F8A7A] transition-all">
                    <label htmlFor="settings-profile-phone" className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium select-none">
                      <Phone className="w-3.5 h-3.5 text-[#1F8A7A] shrink-0" />
                      <span>{language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}</span>
                    </label>
                    <input
                      id="settings-profile-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder={language === 'th' ? 'กรอกเบอร์โทรศัพท์' : 'Enter phone number'}
                      className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  <span>
                    {language === 'th'
                      ? 'กดปุ่ม "บันทึก" ด้านบนขวาเพื่อบันทึกข้อมูลชื่อ อีเมล และเบอร์โทรศัพท์'
                      : 'Click the top-right "Save" button to apply Full Name, Email, and Phone changes.'}
                  </span>
                </div>
              </div>

              {/* Change Password Section */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#1F8A7A]" />
                    <span>{language === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Change Password'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'th'
                      ? 'อัปเดตรหัสผ่านของคุณเพื่อรักษาความปลอดภัยของบัญชีผู้ใช้'
                      : 'Update your password regularly to keep your NetMigrate account secure.'}
                  </p>
                </div>

                {changePasswordError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{changePasswordError}</span>
                  </div>
                )}

                {changePasswordSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{changePasswordSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 max-w-lg">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'th' ? 'รหัสผ่านปัจจุบัน' : 'Current Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder={language === 'th' ? 'กรอกรหัสผ่านปัจจุบัน' : 'Enter current password'}
                        required
                        className="w-full h-9 pl-3 pr-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1F8A7A] focus:ring-1 focus:ring-[#1F8A7A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showCurrentPassword ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'th' ? 'รหัสผ่านใหม่' : 'New Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={language === 'th' ? 'กรอกรหัสผ่านใหม่' : 'Enter new password'}
                        required
                        className="w-full h-9 pl-3 pr-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1F8A7A] focus:ring-1 focus:ring-[#1F8A7A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'th' ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm New Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={language === 'th' ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm new password'}
                        required
                        className="w-full h-9 pl-3 pr-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1F8A7A] focus:ring-1 focus:ring-[#1F8A7A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Update Password Button */}
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="h-9 px-4 rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] active:scale-[0.99] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-70"
                  >
                    {updatingPassword ? (
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{language === 'th' ? 'อัปเดตรหัสผ่าน' : 'Update Password'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Reset Cache */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {t.settings.resetStorage}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.settings.resetStorageDesc}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onResetStorage}
                  className="h-9 px-4 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors leading-none self-start sm:self-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Reset Cache</span>
                </button>
              </div>

              {/* Clear Logout Trigger */}
              <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-red-900 dark:text-red-200">
                    {t.settings.logoutBtn}
                  </div>
                  <div className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
                    {t.settings.logoutDesc}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors leading-none self-start sm:self-auto shadow-2xs"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.logout}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
