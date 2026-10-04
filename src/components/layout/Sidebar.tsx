import React from 'react';
import {
  ArrowLeftRight,
  Server,
  PlaySquare,
  BarChart3,
  History,
  BookOpen,
  Settings,
  Terminal,
  PanelLeftClose
} from 'lucide-react';
import { Language } from '../../types';
import { translations } from '../../locales/translations';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  language: Language;
  onlineDeviceCount: number;
  onLogout?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  language,
  onlineDeviceCount: _onlineDeviceCount,
  onLogout: _onLogout,
  isCollapsed,
  onToggleCollapse,
}) => {
  const t = translations[language];

  const menuItems = [
    {
      id: 'convert',
      label: t.nav.convert,
      icon: ArrowLeftRight,
    },
    {
      id: 'deploy',
      label: t.nav.deploy,
      icon: PlaySquare,
    },
    {
      id: 'devices',
      label: t.nav.devices,
      icon: Server,
    },
    {
      id: 'dashboard',
      label: t.nav.dashboard,
      icon: BarChart3,
    },
    {
      id: 'history',
      label: t.nav.history,
      icon: History,
    },
    {
      id: 'rules',
      label: t.nav.rules,
      icon: BookOpen,
    },
    {
      id: 'settings',
      label: t.nav.settings,
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16 items-center' : 'w-16 lg:w-64'
      } h-screen sticky top-0 flex flex-col justify-between shrink-0 overflow-x-hidden overflow-y-auto scrollbar-none border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 ease-in-out select-none z-30`}
    >
      {/* Top Section: Header/Logo + Navigation Links */}
      <div className={`w-full flex-1 flex flex-col ${isCollapsed ? 'items-center' : 'items-center lg:items-stretch'} min-h-0 overflow-x-hidden`}>
        {/* Unified Top Header inside Sidebar */}
        <div
          className={`h-16 border-b border-slate-100 dark:border-slate-800 flex items-center shrink-0 w-full overflow-hidden ${
            isCollapsed
              ? 'justify-center px-0'
              : 'justify-center lg:justify-between px-0 lg:px-4'
          }`}
        >
          {!isCollapsed ? (
            <>
              {/* Left: [>_] NetMigrate Logo */}
              <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="w-8 h-8 rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] flex items-center justify-center text-white shadow-xs shrink-0 cursor-pointer"
                  title="NetMigrate"
                >
                  <Terminal className="w-4 h-4" />
                </button>
                <span className="hidden lg:inline-block text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-normal truncate">
                  NetMigrate
                </span>
              </div>

              {/* Right: Sleek Collapse Button [|<] on Desktop */}
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex w-7 h-7 rounded-md border border-slate-200/80 dark:border-slate-700/80 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer"
                title={language === 'th' ? 'ย่อแถบข้าง [|<]' : 'Collapse Sidebar [|<]'}
                aria-label="Collapse Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          ) : (
            /* Explicit Collapsed State */
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-10 h-10 rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] text-white flex items-center justify-center shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              title={language === 'th' ? 'ขยายแถบข้าง' : 'Expand Sidebar'}
              aria-label="Expand Sidebar"
            >
              <Terminal className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Action Links Area */}
        <div className="flex-1 py-4 w-full overflow-x-hidden overflow-y-auto scrollbar-none">
          {/* Workspace Heading: Hidden when collapsed or on smaller screens */}
          <div
            className={`px-4 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate ${
              isCollapsed ? 'hidden' : 'hidden lg:block'
            }`}
          >
            {language === 'th' ? 'เมนูหลัก' : 'Workspace'}
          </div>

          <nav
            className={`w-full flex flex-col ${
              isCollapsed
                ? 'items-center space-y-2 px-0'
                : 'items-center lg:items-stretch space-y-2 lg:space-y-1 px-0 lg:px-3'
            }`}
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  className={`transition-all rounded-lg flex items-center leading-relaxed cursor-pointer ${
                    isCollapsed
                      ? 'w-10 h-10 justify-center shrink-0'
                      : 'w-10 lg:w-full h-10 lg:h-auto min-h-[40px] lg:min-h-[42px] justify-center lg:justify-start px-0 lg:px-3 py-0 lg:py-2'
                  } ${
                    isActive
                      ? 'bg-[#1F8A7A] text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                    }`}
                  />
                  {/* Clean text hiding on collapsed or smaller screens */}
                  <span
                    className={`ml-2.5 truncate leading-relaxed text-left pb-0.5 ${
                      isCollapsed ? 'hidden' : 'hidden lg:inline-block'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
};
