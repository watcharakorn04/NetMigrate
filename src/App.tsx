/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ConvertConfigView } from './components/convert/ConvertConfigView';
import { DeployTestView } from './components/deploy/DeployTestView';
import { DevicesView } from './components/devices/DevicesView';
import { DashboardView } from './components/dashboard/DashboardView';
import { HistoryView } from './components/history/HistoryView';
import { SupportedRulesView } from './components/rules/SupportedRulesView';
import { SettingsView } from './components/settings/SettingsView';
import { AuthView } from './components/auth/AuthView';
import { AuditLog, ConfigConversion, Device, Language, ThemeMode, UserProfile } from './types';
import { INITIAL_CONVERSIONS, INITIAL_DEVICES, INITIAL_AUDIT_LOGS } from './data/mockData';
import { translations } from './locales/translations';
import { LogOut, Terminal, ShieldCheck, CheckCircle2, Lock, ArrowRight } from 'lucide-react';

export default function App() {
  // Theme & Language persistence in localStorage
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('netmigrate_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('netmigrate_lang');
      return (saved === 'th' || saved === 'en') ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  // Authentication & Session state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('netmigrate_logged_out') !== 'true';
    } catch {
      return true;
    }
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // User Profile state (matching single-role schema)
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('netmigrate_user_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      fullName: 'Alex Morgan',
      username: 'admin_user',
      email: 'admin@enterprise.local',
      phone: '081-234-5678',
    };
  });

  const handleUpdateProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    try {
      localStorage.setItem('netmigrate_user_profile', JSON.stringify(newProfile));
    } catch {}
  };

  // Track if user explicitly clicked the manual collapse toggle button on desktop
  const [userManuallyCollapsed, setUserManuallyCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('netmigrate_manual_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Sidebar collapsed state: initialize collapsed on screens smaller than 1024px, or if user manually collapsed
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      if (localStorage.getItem('netmigrate_manual_sidebar_collapsed') === 'true') {
        return true;
      }
    } catch {}
    return typeof window !== 'undefined' && window.innerWidth < 1024;
  });

  // Bi-directional responsive auto-expand/collapse:
  // Automatically restores full width (w-64) when viewport is resized back above 1024px,
  // while preserving user's preference if they explicitly manual-collapsed.
  useEffect(() => {
    let lastWidth = window.innerWidth;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      // When crossing from desktop to smaller screens (< 1024px)
      if (currentWidth < 1024 && lastWidth >= 1024) {
        setIsSidebarCollapsed(true);
      }
      // When crossing from smaller screens back to desktop (>= 1024px)
      else if (currentWidth >= 1024 && lastWidth < 1024) {
        if (!userManuallyCollapsed) {
          setIsSidebarCollapsed(false);
        }
      }
      lastWidth = currentWidth;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [userManuallyCollapsed]);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      // Record explicit manual user intent
      setUserManuallyCollapsed(next);
      try {
        localStorage.setItem('netmigrate_manual_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Navigation Tab (Settings replaced PRD)
  const [currentTab, setCurrentTab] = useState<string>('convert');
  const [settingsInitialSection, setSettingsInitialSection] = useState<'general' | 'eveng' | 'engine' | 'security' | 'session'>('general');

  const handleTabChange = (tab: string, section?: string) => {
    setCurrentTab(tab);
    if (tab === 'settings' && section) {
      setSettingsInitialSection(section as any);
    }
  };

  // Application Data State
  const [conversions, setConversions] = useState<ConfigConversion[]>(INITIAL_CONVERSIONS);
  const [activeConversionId, setActiveConversionId] = useState<string>(INITIAL_CONVERSIONS[0].id);
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync theme with HTML class and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    try {
      localStorage.setItem('netmigrate_theme', theme);
    } catch {}
  }, [theme]);

  // Sync language with document attribute and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    if (language === 'th') {
      document.body.classList.add('lang-th');
      document.body.classList.remove('lang-en');
    } else {
      document.body.classList.add('lang-en');
      document.body.classList.remove('lang-th');
    }
    try {
      localStorage.setItem('netmigrate_lang', language);
    } catch {}
  }, [language]);

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  // Conversions management
  const handleAddConversions = (newConvs: ConfigConversion[]) => {
    setConversions((prev) => [...newConvs, ...prev]);
    if (newConvs.length > 0) {
      setActiveConversionId(newConvs[0].id);
    }
  };

  const handleUpdateConversion = (updatedConv: ConfigConversion) => {
    setConversions((prev) =>
      prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
    );
  };

  const handleDeleteConversion = (idToDelete: string) => {
    setConversions((prev) => {
      const next = prev.filter((c) => c.id !== idToDelete);
      if (activeConversionId === idToDelete) {
        if (next.length > 0) {
          setActiveConversionId(next[0].id);
        } else {
          setActiveConversionId('');
        }
      }
      return next;
    });
  };

  // Deployment payloads management (explicit ingestion, starts empty by default)
  const [deployPayloads, setDeployPayloads] = useState<ConfigConversion[]>([]);
  const [activeDeployPayloadId, setActiveDeployPayloadId] = useState<string>('');

  const handleSendToDeploy = (conversion: ConfigConversion) => {
    setDeployPayloads((prev) => {
      const exists = prev.find((p) => p.id === conversion.id);
      if (exists) return prev;
      return [...prev, conversion];
    });
    setActiveDeployPayloadId(conversion.id);
    setCurrentTab('deploy');
    showToast(
      language === 'th'
        ? `ส่งสคริปต์ ${conversion.filename} ไปยังคิว Deploy & Test เรียบร้อยแล้ว`
        : `Sent "${conversion.filename}" to Deploy & Test queue`
    );
    handleRecordAudit(
      'SEND_TO_DEPLOY',
      {
        id: conversion.id,
        filename: conversion.filename,
        targetVendor: conversion.targetVendor,
        linesCount: conversion.lines.length,
      },
      0
    );
  };

  const handleAddDeployPayloads = (newPayloads: ConfigConversion[]) => {
    setDeployPayloads((prev) => [...prev, ...newPayloads]);
    if (newPayloads.length > 0) {
      setActiveDeployPayloadId(newPayloads[0].id);
    }
  };

  const handleDeleteDeployPayload = (idToDelete: string) => {
    setDeployPayloads((prev) => {
      const next = prev.filter((p) => p.id !== idToDelete);
      if (activeDeployPayloadId === idToDelete) {
        setActiveDeployPayloadId(next.length > 0 ? next[0].id : '');
      }
      return next;
    });
  };

  // Device management
  const handleAddDevice = (device: Device) => {
    setDevices((prev) => [device, ...prev]);
    handleRecordAudit(
      'ADD_DEVICE',
      {
        deviceId: device.id,
        hostname: device.hostname,
        vendor: device.vendor,
        isEveNg: device.isEveNg,
        eveNodeId: device.eveNodeId,
      },
      0
    );
  };

  const handleUpdateDevice = (device: Device) => {
    setDevices((prev) => prev.map((d) => (d.id === device.id ? device : d)));
    handleRecordAudit(
      'EDIT_DEVICE',
      {
        deviceId: device.id,
        hostname: device.hostname,
        vendor: device.vendor,
      },
      0
    );
  };

  const handleDeleteDevice = (id: string) => {
    const target = devices.find((d) => d.id === id);
    setDevices((prev) => prev.filter((d) => d.id !== id));
    if (target) {
      handleRecordAudit(
        'DELETE_DEVICE',
        {
          deviceId: id,
          hostname: target.hostname,
        },
        0
      );
    }
  };

  // Audit Logging
  const handleRecordAudit = (
    action: string,
    details: Record<string, unknown>,
    maskedCount: number
  ) => {
    const activeConv = conversions.find((c) => c.id === activeConversionId) || conversions[0];
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      username: 'admin_user',
      action: action as any,
      sourceVendor: activeConv ? activeConv.sourceVendor : 'cisco',
      targetVendor: activeConv ? activeConv.targetVendor : 'huawei',
      maskedSecretsCount: maskedCount,
      status: 'SUCCESS',
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Logout Handlers
  const handleTriggerLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    try {
      localStorage.setItem('netmigrate_logged_out', 'true');
      localStorage.removeItem('netmigrate_session_token');
    } catch {}
    setShowLogoutModal(false);
    setIsLoggedIn(false);
  };

  const handleSignIn = (username: string = 'admin_user') => {
    try {
      localStorage.removeItem('netmigrate_logged_out');
      localStorage.setItem('netmigrate_session_token', `token-${username}-active`);
    } catch {}
    setIsLoggedIn(true);
    showToast(
      language === 'th' 
        ? `เข้าสู่ระบบสำเร็จในฐานะ ${username}` 
        : `Signed in successfully as ${username}`
    );
  };

  const handleResetStorage = () => {
    try {
      localStorage.clear();
      setConversions(INITIAL_CONVERSIONS);
      setDevices(INITIAL_DEVICES);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      const defaultProfile: UserProfile = {
        fullName: 'Alex Morgan',
        username: 'admin_user',
        email: 'admin@enterprise.local',
        phone: '081-234-5678',
      };
      setUserProfile(defaultProfile);
    } catch {}
    showToast(language === 'th' ? 'รีเซ็ตข้อมูลและแคชเรียบร้อยแล้ว' : 'Cache and inventory reset to default');
  };

  const t = translations[language];
  const activeConversion = conversions.find((c) => c.id === activeConversionId) || conversions[0];
  const onlineCount = devices.filter((d) => d.status === 'Online').length;

  // Logged-out Screen with Glassmorphic Auth
  if (!isLoggedIn) {
    return (
      <AuthView
        onSuccess={handleSignIn}
        language={language}
        onLanguageChange={handleLanguageChange}
        theme={theme}
        onThemeToggle={handleThemeToggle}
      />
    );
  }

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1F8A7A] text-white text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-bottom-3 leading-none">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Strictly Sticky / Fixed Sidebar (h-screen sticky top-0) */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        language={language}
        onlineDeviceCount={onlineCount}
        onLogout={handleTriggerLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Workspace with Header and Scrollable Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header conforming to Top Bar Contract */}
        <Header
          currentTab={currentTab}
          language={language}
          onLanguageChange={handleLanguageChange}
          theme={theme}
          onThemeToggle={handleThemeToggle}
          onLogout={handleTriggerLogout}
          onToggleSidebar={handleToggleSidebar}
          onTabChange={handleTabChange}
          userProfile={userProfile}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden min-w-0">
          {currentTab === 'convert' && (
            <ConvertConfigView
              conversions={conversions}
              activeConversionId={activeConversionId}
              onSelectConversion={setActiveConversionId}
              onAddConversions={handleAddConversions}
              onUpdateConversion={handleUpdateConversion}
              onDeleteConversion={handleDeleteConversion}
              onSendToDeploy={handleSendToDeploy}
              language={language}
              onRecordAudit={handleRecordAudit}
            />
          )}

          {currentTab === 'deploy' && (
            <DeployTestView
              devices={devices}
              deployPayloads={deployPayloads}
              activeDeployPayloadId={activeDeployPayloadId}
              onSelectDeployPayload={setActiveDeployPayloadId}
              onAddDeployPayloads={handleAddDeployPayloads}
              onDeleteDeployPayload={handleDeleteDeployPayload}
              activeConversion={activeConversion}
              conversions={conversions}
              activeConversionId={activeConversionId}
              onSelectConversion={setActiveConversionId}
              onAddConversions={handleAddConversions}
              onDeleteConversion={handleDeleteConversion}
              language={language}
              onRecordAudit={handleRecordAudit}
            />
          )}

          {currentTab === 'devices' && (
            <DevicesView
              devices={devices}
              onAddDevice={handleAddDevice}
              onUpdateDevice={handleUpdateDevice}
              onDeleteDevice={handleDeleteDevice}
              language={language}
            />
          )}

          {currentTab === 'dashboard' && (
            <DashboardView
              conversions={conversions}
              devices={devices}
              onNavigate={setCurrentTab}
              onSelectConversion={setActiveConversionId}
              language={language}
            />
          )}

          {currentTab === 'history' && (
            <HistoryView
              logs={auditLogs}
              language={language}
            />
          )}

          {currentTab === 'rules' && (
            <SupportedRulesView
              language={language}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              language={language}
              onLanguageChange={handleLanguageChange}
              theme={theme}
              onThemeToggle={handleThemeToggle}
              onLogout={handleTriggerLogout}
              onResetStorage={handleResetStorage}
              userProfile={userProfile}
              onUpdateProfile={handleUpdateProfile}
              initialSection={settingsInitialSection}
            />
          )}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t.confirmLogoutTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Operator: <strong className="text-slate-800 dark:text-slate-200">{t.userName}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.confirmLogoutDesc}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="h-9 min-h-[36px] px-4 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors leading-none"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleConfirmLogout}
                className="h-9 min-h-[36px] px-4 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors shadow-2xs leading-none"
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
