import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, LogOut, Menu, ChevronDown, Settings, History } from 'lucide-react';
import { Language, ThemeMode, UserProfile } from '../../types';
import { translations } from '../../locales/translations';
import { getInitials } from '../../utils/avatar';

interface HeaderProps {
  currentTab: string;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
  onLogout: () => void;
  onToggleSidebar?: () => void;
  onTabChange?: (tab: string, section?: string) => void;
  userProfile?: UserProfile;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  language,
  onLanguageChange,
  theme,
  onThemeToggle,
  onLogout,
  onToggleSidebar,
  onTabChange,
  userProfile,
}) => {
  const t = translations[language];
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const profile: UserProfile = userProfile || {
    fullName: 'Alex Morgan',
    username: 'admin_user',
    email: 'admin@enterprise.local',
    phone: '081-234-5678',
  };
  const avatarInitials = getInitials(profile.fullName);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Breadcrumb label based on active tab
  const getTabLabel = () => {
    switch (currentTab) {
      case 'convert': return t.nav.convert;
      case 'deploy': return t.nav.deploy;
      case 'devices': return t.nav.devices;
      case 'dashboard': return t.nav.dashboard;
      case 'history': return t.nav.history;
      case 'rules': return t.nav.rules;
      case 'settings': return t.nav.settings;
      default: return t.nav.convert;
    }
  };

  return (
    <header className="h-16 min-h-[64px] px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-between gap-4 min-w-0 sticky top-0 z-30 transition-colors select-none">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors border border-slate-200 dark:border-slate-700/80 shrink-0 cursor-pointer"
            title="Toggle Menu"
            aria-label="Toggle Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <h1 className="hidden sm:block text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-normal truncate">
          {getTabLabel()}
        </h1>
      </div>

      {/* Zone 3: Language, Theme, and User Profile Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Language Switcher with fixed height and leading-none */}
        <div className="h-8 min-h-[32px] flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-medium">
          <button
            onClick={() => onLanguageChange('en')}
            className={`h-7 px-2.5 rounded-md flex items-center justify-center transition-all leading-none ${
              language === 'en'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="English"
          >
            <span className="leading-none">EN</span>
          </button>
          <button
            onClick={() => onLanguageChange('th')}
            className={`h-7 px-2.5 rounded-md flex items-center justify-center transition-all leading-none ${
              language === 'th'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="ภาษาไทย"
          >
            <span className="leading-none">TH</span>
          </button>
        </div>

        {/* Theme Toggle with fixed dimensions */}
        <button
          onClick={onThemeToggle}
          className="w-8 h-8 min-h-[32px] rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700/80 flex items-center justify-center shrink-0"
          aria-label={theme === 'dark' ? (language === 'th' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'Switch to light mode') : (language === 'th' ? 'เปลี่ยนเป็นโหมดมืด' : 'Switch to dark mode')}
          title={theme === 'dark' ? (language === 'th' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'Switch to light mode') : (language === 'th' ? 'เปลี่ยนเป็นโหมดมืด' : 'Switch to dark mode')}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* User Profile Trigger & Quick Dropdown Menu */}
        <div className="relative pl-2 border-l border-slate-200 dark:border-slate-800" ref={dropdownRef}>
          {/* Clickable Profile Chip with Subtle Hover Effect and Chevron Icon */}
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group cursor-pointer focus:outline-hidden"
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            title={`${profile.fullName || profile.username} (${profile.email})`}
          >
            <div className="w-8 h-8 rounded-full bg-[#1F8A7A] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 select-none">
              {avatarInitials}
            </div>
            <div className="hidden lg:flex flex-col text-left justify-center leading-none">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">
                {profile.fullName || profile.username}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-none">
                {profile.email}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180 text-[#1F8A7A]' : ''
              }`}
            />
          </button>

          {/* Dropdown Container */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-50 p-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User Header Info Card with refined typography & hierarchy */}
              <div className="p-3 rounded-lg bg-slate-50/90 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1F8A7A] text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0 select-none">
                  {avatarInitials}
                </div>
                <div className="flex flex-col min-w-0">
                  {/* Primary bold header title: Full Name */}
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                    {profile.fullName || 'Alex Morgan'}
                  </span>
                  {/* Subtle gray secondary text: Email & @username */}
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-normal">
                    {profile.email}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate leading-tight">
                    @{profile.username}
                  </span>
                </div>
              </div>

              {/* Separator Divider */}
              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

              {/* Quick Nav Items */}
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    onTabChange?.('settings', 'session');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                >
                  <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" />
                  <span>{language === 'th' ? 'การตั้งค่าบัญชีและเซสชัน' : 'Account & Session Settings'}</span>
                </button>

                <button
                  onClick={() => {
                    onTabChange?.('history');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                >
                  <History className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" />
                  <span>{language === 'th' ? 'ประวัติและบันทึกกิจกรรม' : 'Audit Trail & Activity Logs'}</span>
                </button>
              </div>

              {/* Separator Divider */}
              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

              {/* Destructive Action: Log Out */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onLogout();
                }}
                className="w-full px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>{t.logout}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
