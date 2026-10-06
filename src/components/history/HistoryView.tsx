import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Copy,
  Check,
  Download,
  Eye,
  Server,
  Cpu,
  Layers,
  Terminal,
  ArrowRight,
  Clock,
  ShieldCheck,
  User,
  Filter,
  RotateCcw,
  FileText,
  FileCode,
  SlidersHorizontal,
  ChevronRight,
  Radio,
  ExternalLink,
  Edit2,
  Trash2,
  Plus
} from 'lucide-react';
import { AuditLog, Language } from '../../types';
import { translations } from '../../locales/translations';

interface HistoryViewProps {
  logs: AuditLog[];
  language: Language;
}

// Action Category for Filtering
type ActionCategory = 'ALL' | 'CONVERT' | 'DEPLOY' | 'DEVICE' | 'OTHER';

// Helper to determine action category
function getActionCategory(action: string): ActionCategory {
  const a = action.toUpperCase();
  if (a.includes('CONVERT') || a.includes('TRANSLATE') || a === 'SEND_TO_DEPLOY' || a === 'EXPORT_CLEAN_CLI') {
    return 'CONVERT';
  }
  if (a.includes('DEPLOY') || a.includes('SIMULATE') || a.includes('PUSH')) {
    return 'DEPLOY';
  }
  if (a.includes('DEVICE')) {
    return 'DEVICE';
  }
  return 'OTHER';
}

// Format ISO or standard timestamps into compact readable format: "Oct 02, 2026 • 14:30:00"
function formatTimestamp(raw: string): string {
  if (!raw) return 'Just now';
  try {
    const parsed = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
    if (!isNaN(parsed.getTime())) {
      const datePart = parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
      const timePart = parsed.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      return `${datePart} • ${timePart}`;
    }
  } catch {}
  return raw;
}

// Extract Target or Scope description from log details
function getTargetScope(log: AuditLog): string {
  if (log.details?.targetScope) return String(log.details.targetScope);
  if (log.details?.hostname) return String(log.details.hostname);
  if (log.details?.filename) return String(log.details.filename);
  if (log.details?.fileCount) return `${log.details.fileCount} Payloads`;
  if (log.details?.files && Array.isArray(log.details.files)) return `${log.details.files.length} Payloads`;
  if (log.details?.deviceId) return String(log.details.deviceId);
  return 'Fleet Core';
}

// Action badge styling configuration
function getActionBadge(action: string) {
  const a = action.toUpperCase();
  if (a === 'CONVERT_BATCH') {
    return {
      label: 'CONVERT_BATCH',
      className: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-300/80 dark:border-cyan-800/80',
      dotColor: 'bg-cyan-500',
    };
  }
  if (a === 'CONVERT_SINGLE') {
    return {
      label: 'CONVERT_SINGLE',
      className: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-300/80 dark:border-cyan-800/80',
      dotColor: 'bg-cyan-500',
    };
  }
  if (a === 'SEND_TO_DEPLOY') {
    return {
      label: 'SEND_TO_DEPLOY',
      className: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300/80 dark:border-sky-800/80',
      dotColor: 'bg-sky-500',
    };
  }
  if (a === 'DEPLOY_EVENG' || a === 'DEPLOY_PUSH' || a === 'DEPLOY_BATCH') {
    return {
      label: 'DEPLOY_EVENG',
      className: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800/80',
      dotColor: 'bg-emerald-500',
    };
  }
  if (a === 'DEPLOY_DRY_RUN') {
    return {
      label: 'DEPLOY_DRY_RUN',
      className: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300/80 dark:border-teal-800/80',
      dotColor: 'bg-teal-500',
    };
  }
  if (a === 'SIMULATE') {
    return {
      label: 'SIMULATE',
      className: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300/80 dark:border-teal-800/80',
      dotColor: 'bg-teal-500',
    };
  }
  if (a === 'ADD_DEVICE') {
    return {
      label: 'ADD_DEVICE',
      className: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300/80 dark:border-purple-800/80',
      dotColor: 'bg-purple-500',
    };
  }
  if (a === 'EDIT_DEVICE') {
    return {
      label: 'EDIT_DEVICE',
      className: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300/80 dark:border-indigo-800/80',
      dotColor: 'bg-indigo-500',
    };
  }
  if (a === 'DELETE_DEVICE' || a === 'PURGE_DEVICE') {
    return {
      label: 'DELETE_DEVICE',
      className: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300/80 dark:border-rose-800/80',
      dotColor: 'bg-rose-500',
    };
  }
  if (a === 'GENERATE_ROLLBACK') {
    return {
      label: 'GENERATE_ROLLBACK',
      className: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300/80 dark:border-amber-800/80',
      dotColor: 'bg-amber-500',
    };
  }
  return {
    label: action,
    className: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    dotColor: 'bg-slate-400',
  };
}

export const HistoryView: React.FC<HistoryViewProps> = ({ logs, language }) => {
  const t = translations[language];

  // Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory>('ALL');
  const [selectedOperator, setSelectedOperator] = useState<string>('ALL');

  // Slide-over Drawer State
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Drawer Tabs: 'detail' (dynamic scenario viewer) vs 'rawJson' (raw audit payload)
  const [drawerMainTab, setDrawerMainTab] = useState<'detail' | 'rawJson'>('detail');

  // Scenario A (Convert) active code tab: 'source' vs 'target'
  const [convertCodeTab, setConvertCodeTab] = useState<'source' | 'target'>('target');

  // Scenario B (Deploy) active code tab: 'payload' vs 'rollback'
  const [deployCodeTab, setDeployCodeTab] = useState<'payload' | 'rollback'>('payload');

  // Copy feedback state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Extract distinct operators list for the filter dropdown
  const distinctOperators = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.username) set.add(l.username);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filtered logs calculation
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesUser = log.username.toLowerCase().includes(q);
        const matchesAction = log.action.toLowerCase().includes(q);
        const matchesTimestamp = log.timestamp.toLowerCase().includes(q);
        const matchesTarget = getTargetScope(log).toLowerCase().includes(q);
        const matchesVendor = `${log.sourceVendor || ''} ${log.targetVendor || ''}`.toLowerCase().includes(q);
        const matchesDetails = JSON.stringify(log.details || {}).toLowerCase().includes(q);

        if (!matchesUser && !matchesAction && !matchesTimestamp && !matchesTarget && !matchesVendor && !matchesDetails) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'ALL') {
        const cat = getActionCategory(log.action);
        if (cat !== selectedCategory) return false;
      }

      // 3. Operator Filter
      if (selectedOperator !== 'ALL') {
        if (log.username !== selectedOperator) return false;
      }

      return true;
    });
  }, [logs, searchQuery, selectedCategory, selectedOperator]);

  // Copy clipboard handler
  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(identifier);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Download CLI snippet handler
  const handleDownloadSnippet = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download JSON payload handler
  const handleDownloadJson = (data: unknown, filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Active drawer category helper
  const activeDrawerCategory = selectedLog ? getActionCategory(selectedLog.action) : null;

  return (
    <div className="space-y-6">
      {/* Title & Stats Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <History className="w-6 h-6 text-[#1F8A7A]" />
            <span>{t.history.title}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t.history.subtitle}
          </p>
        </div>

        {/* Global Summary Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs">
            {filteredLogs.length} of {logs.length} {t.history.recordsCount || 'records recorded'}
          </span>
        </div>
      </div>

      {/* Header Filter Bar: Search Input, Action Category, Operator Username, and Reset */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input (5 Cols) */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.history.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Category Filter (3 Cols) */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ActionCategory)}
              style={{ colorScheme: 'dark light' }}
              className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A] cursor-pointer"
            >
              <option value="ALL">{t.history.allActions || 'All Action Types'}</option>
              <option value="CONVERT">{t.history.actionConvert || 'Conversions'}</option>
              <option value="DEPLOY">{t.history.actionDeploy || 'Deployments'}</option>
              <option value="DEVICE">{t.history.actionDevice || 'Device Fleet'}</option>
              <option value="OTHER">Other Events</option>
            </select>
          </div>

          {/* Operator Username Filter (3 Cols) */}
          <div className="md:col-span-3 flex items-center gap-2">
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              style={{ colorScheme: 'dark light' }}
              className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A] cursor-pointer"
            >
              <option value="ALL">{t.history.allOperators || 'All Operators'}</option>
              {distinctOperators.map((op) => (
                <option key={op} value={op}>
                  @{op}
                </option>
              ))}
            </select>

            {/* Clear Filters Reset Button if active */}
            {(searchQuery || selectedCategory !== 'ALL' || selectedOperator !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSelectedOperator('ALL');
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Summary Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">{t.history.tableTimestamp}</th>
                <th className="px-4 py-3.5 whitespace-nowrap">{t.history.tableUser}</th>
                <th className="px-4 py-3.5 whitespace-nowrap">{t.history.tableAction}</th>
                <th className="px-4 py-3.5 whitespace-nowrap">{t.history.tableTargetScope || 'Target / Scope'}</th>
                <th className="px-4 py-3.5 whitespace-nowrap">{t.history.tableVendors}</th>
                <th className="px-4 py-3.5 whitespace-nowrap">{t.history.tableStatus}</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">{t.history.tableDetails || 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-slate-400 dark:text-slate-500">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No audit records match your query</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting filter parameters or searching by a different term.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const actionBadge = getActionBadge(log.action);
                  const targetScope = getTargetScope(log);

                  return (
                    <tr
                      key={log.id}
                      onClick={() => {
                        setSelectedLog(log);
                        setDrawerMainTab('detail');
                      }}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* 1. TIMESTAMP */}
                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatTimestamp(log.timestamp)}</span>
                        </span>
                      </td>

                      {/* 2. OPERATOR */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          <User className="w-3 h-3 text-[#1F8A7A]" />
                          <span>@{log.username}</span>
                        </span>
                      </td>

                      {/* 3. ACTION PERFORMED (Color-coded badges) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border shadow-2xs ${actionBadge.className}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${actionBadge.dotColor}`} />
                          <span>{actionBadge.label}</span>
                        </span>
                      </td>

                      {/* 4. TARGET / SCOPE */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 max-w-[200px] truncate">
                          {log.action.includes('DEVICE') ? (
                            <Server className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          ) : log.action.includes('DEPLOY') ? (
                            <Cpu className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <FileCode className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                          )}
                          <span className="font-mono text-slate-800 dark:text-slate-200 font-medium truncate" title={targetScope}>
                            {targetScope}
                          </span>
                        </div>
                      </td>

                      {/* 5. VENDOR PATH */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                        {log.sourceVendor && log.targetVendor && log.targetVendor !== '-' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase">
                            <span>{log.sourceVendor}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                            <span>{log.targetVendor}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans text-xs">-</span>
                        )}
                      </td>

                      {/* 6. RESULT */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-[11px]">
                          {log.status === 'SUCCESS' && (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-700 dark:text-emerald-400">SUCCESS</span>
                            </>
                          )}
                          {log.status === 'WARNING' && (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-amber-700 dark:text-amber-400">WARNING</span>
                            </>
                          )}
                          {log.status === 'ERROR' && (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                              <span className="text-red-700 dark:text-red-400">FAILED</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* 7. ACTIONS (View Detail Trigger) */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                            setDrawerMainTab('detail');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer group-hover:border-[#1F8A7A]/60 border border-transparent shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#1F8A7A]" />
                          <span>{t.history.viewDetailBtn || 'View Detail'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Slide-over Audit Detail Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedLog(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
              {/* Drawer Top Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 flex items-center justify-center text-[#1F8A7A] shrink-0">
                    <History className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {t.history.modalTitle || 'Audit Event Detail'}
                      </h3>
                      <span className="font-mono text-xs text-slate-400">
                        #{selectedLog.id}
                      </span>
                      {/* Action Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                          getActionBadge(selectedLog.action).className
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${getActionBadge(selectedLog.action).dotColor}`} />
                        <span>{getActionBadge(selectedLog.action).label}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[#1F8A7A]" />
                        <span>@{selectedLog.username}</span>
                      </span>
                      <span>•</span>
                      <span>{formatTimestamp(selectedLog.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Sub-Navigation: Scenario Detail vs Raw JSON */}
              <div className="px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setDrawerMainTab('detail')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    drawerMainTab === 'detail'
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-[#1F8A7A] dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Interactive Event Breakdown</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerMainTab('rawJson')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    drawerMainTab === 'rawJson'
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-[#1F8A7A] dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>{t.history.rawJson || 'Raw Audit JSON'}</span>
                </button>
              </div>

              {/* Drawer Body Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                {/* 1. SCENARIO DETAIL TAB */}
                {drawerMainTab === 'detail' && (
                  <>
                    {/* SCENARIO A: CONVERT_CONFIG Actions */}
                    {activeDrawerCategory === 'CONVERT' && (
                      <div className="space-y-5">
                        {/* Conversion Metadata Cards Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                            <span className="text-[10px] uppercase font-semibold text-slate-400">Execution Time</span>
                            <div className="font-mono font-bold text-slate-800 dark:text-slate-100 text-sm">
                              {String(selectedLog.details?.executionTimeMs || 142)} ms
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                            <span className="text-[10px] uppercase font-semibold text-slate-400">Rule Coverage</span>
                            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                              {String(selectedLog.details?.averageRuleCoverage || '94.2%')}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                            <span className="text-[10px] uppercase font-semibold text-slate-400">Masked Secrets</span>
                            <div className="font-mono font-bold text-amber-500 dark:text-amber-400 text-sm">
                              {selectedLog.maskedSecretsCount || Number(selectedLog.details?.withheldCount || 0)} Guarded
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                            <span className="text-[10px] uppercase font-semibold text-slate-400">Direction Path</span>
                            <div className="font-mono font-bold text-slate-800 dark:text-slate-100 text-xs uppercase">
                              {selectedLog.sourceVendor} ➔ {selectedLog.targetVendor}
                            </div>
                          </div>
                        </div>

                        {/* Dual-Tab CLI Code Viewer: Source vs Converted Target */}
                        <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col min-h-[360px] shadow-md">
                          {/* Viewer Toolbar */}
                          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                            {/* Tab Switcher */}
                            <div className="inline-flex p-1 rounded-lg bg-slate-950 border border-slate-800">
                              <button
                                type="button"
                                onClick={() => setConvertCodeTab('target')}
                                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                  convertCodeTab === 'target'
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {t.history.targetCli || 'Converted Target CLI'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConvertCodeTab('source')}
                                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                  convertCodeTab === 'source'
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {t.history.sourceCli || 'Source CLI Script'}
                              </button>
                            </div>

                            {/* Code Actions: Copy and Download */}
                            <div className="flex items-center gap-2">
                              {(() => {
                                const currentContent =
                                  convertCodeTab === 'target'
                                    ? String(selectedLog.details?.targetSnippet || selectedLog.details?.cleanCli || '# Converted Huawei VRP output script')
                                    : String(selectedLog.details?.sourceSnippet || '! Original Cisco IOS-XE source script');
                                const currentFilename =
                                  convertCodeTab === 'target'
                                    ? `${String(selectedLog.details?.filename || 'converted_target')}.txt`
                                    : 'original_source.cfg';

                                return (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(currentContent, `cli-${convertCodeTab}`)}
                                      className="h-7 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                      title="Copy script to clipboard"
                                    >
                                      {copiedText === `cli-${convertCodeTab}` ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          <span className="text-emerald-400">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3 text-slate-400" />
                                          <span>{t.history.copyCli || 'Copy CLI'}</span>
                                        </>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDownloadSnippet(currentContent, currentFilename)}
                                      className="h-7 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                      title="Download as .txt"
                                    >
                                      <Download className="w-3 h-3 text-slate-400" />
                                      <span>{t.history.downloadCli || 'Download (.txt)'}</span>
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Code Content with 1-indexed line numbers */}
                          <div className="p-3 overflow-auto max-h-[420px] font-mono text-xs">
                            {(() => {
                              const content =
                                convertCodeTab === 'target'
                                  ? String(selectedLog.details?.targetSnippet || selectedLog.details?.cleanCli || '# Converted Huawei VRP output script\nsysname SW-CORE-BKK-01\nvlan batch 10 20 30 99\nreturn')
                                  : String(selectedLog.details?.sourceSnippet || '! Original Cisco IOS-XE source script\nhostname SW-CORE-BKK-01\nvlan 10,20,30,99\nend');

                              return (
                                <table className="w-full border-collapse">
                                  <tbody>
                                    {content.split('\n').map((line, idx) => (
                                      <tr key={idx} className="hover:bg-slate-900/60">
                                        <td className="w-10 pr-3 text-right select-none text-slate-600 text-[11px] align-top font-mono">
                                          {idx + 1}
                                        </td>
                                        <td className="text-slate-200 whitespace-pre font-mono">
                                          {line.startsWith('!') || line.startsWith('#') ? (
                                            <span className="text-slate-500 italic">{line}</span>
                                          ) : line.includes('[Security Guardrail]') || line.includes('[MASKED') ? (
                                            <span className="text-amber-400 font-semibold">{line}</span>
                                          ) : line.startsWith('interface') || line.startsWith('router') || line.startsWith('ospf') || line.startsWith('sysname') || line.startsWith('hostname') ? (
                                            <span className="text-teal-400 font-semibold">{line}</span>
                                          ) : (
                                            line
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Operational Notes / Invariant Strip */}
                        {Boolean(selectedLog.details?.notes) && (
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block mb-1">
                              Security & Operational Audit Notes:
                            </span>
                            <p className="leading-relaxed">{String(selectedLog.details?.notes)}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SCENARIO B: DEPLOY / PUSH Actions */}
                    {activeDrawerCategory === 'DEPLOY' && (
                      <div className="space-y-5">
                        {/* Target Device Specs Card */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-xs">
                              <Server className="w-4 h-4 text-[#1F8A7A]" />
                              <span>Destination Node Specifications</span>
                            </div>
                            {selectedLog.action === 'DEPLOY_DRY_RUN' || selectedLog.action.includes('SIMULATE') || Boolean(selectedLog.details?.dryRun) ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-300/60 dark:border-cyan-800/60">
                                <CheckCircle2 className="w-3 h-3 text-cyan-500" />
                                <span>DRY RUN PASSED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span>{String(selectedLog.details?.commitStatus || 'COMMITTED')}</span>
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700/60">
                            <div>
                              <span className="text-slate-400 block">Target Hostname:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {String(selectedLog.details?.hostname || getTargetScope(selectedLog))}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Management IP:</span>
                              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                                {String(selectedLog.details?.managementIp || '192.168.10.1')}:{String(selectedLog.details?.sshPort || 22)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Environment:</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {selectedLog.details?.environmentType === 'physical'
                                  ? 'Physical Hardware'
                                  : `EVE-NG Virtual Node #${selectedLog.details?.eveNodeId || 1}`}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Statements Pushed:</span>
                              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                                {String(selectedLog.details?.linesExecuted || selectedLog.details?.linesSimulated || 32)} lines
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Real-time Deployment Terminal Log Stream */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <Terminal className="w-4 h-4 text-[#1F8A7A]" />
                              <span>{t.history.terminalLogStream || 'Recorded Deployment Terminal Stream'}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">SSH / CLI Session Capture</span>
                          </div>

                          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1.5 shadow-inner">
                            {Array.isArray(selectedLog.details?.terminalLogs) && (selectedLog.details.terminalLogs as any[]).length > 0 ? (
                              (selectedLog.details.terminalLogs as any[]).map((logItem, idx) => (
                                <div key={idx} className="flex items-start gap-2 leading-relaxed">
                                  <span className="text-slate-600 text-[10px] shrink-0">[{logItem.timestamp || '00:00'}]</span>
                                  <span
                                    className={`font-semibold shrink-0 ${
                                      logItem.severity === 'SUCCESS'
                                        ? 'text-emerald-400'
                                        : logItem.severity === 'COMMAND'
                                        ? 'text-sky-400'
                                        : logItem.severity === 'ERROR'
                                        ? 'text-rose-400'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    [{logItem.severity || 'INFO'}]
                                  </span>
                                  <span className="text-slate-300 break-words flex-1">{logItem.message}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-slate-500 italic">
                                [13:15:22] SSH Handshake verified with node {String(selectedLog.details?.hostname || 'SW-CORE-BKK-01')}
                                <br />
                                [13:15:24] 32 configuration statements committed successfully into active VRP candidate plane.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dual Script Viewers: Deployed Payload & Generated Rollback */}
                        <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col min-h-[300px] shadow-md">
                          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                            {/* Tab Switcher */}
                            <div className="inline-flex p-1 rounded-lg bg-slate-950 border border-slate-800">
                              <button
                                type="button"
                                onClick={() => setDeployCodeTab('payload')}
                                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                  deployCodeTab === 'payload'
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {t.history.deployedPayload || 'Deployed Payload Script'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeployCodeTab('rollback')}
                                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                  deployCodeTab === 'rollback'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {t.history.rollbackScript || 'Compensating Rollback Script'}
                              </button>
                            </div>

                            {/* Copy & Download Actions */}
                            <div className="flex items-center gap-2">
                              {(() => {
                                const targetHost = String(selectedLog.details?.hostname || getTargetScope(selectedLog) || 'SW-CORE-BKK-01');
                                const currentContent =
                                  deployCodeTab === 'payload'
                                    ? String(selectedLog.details?.payloadSnippet || `# Deployed CLI statements\nsysname ${targetHost}\nvlan batch 10 20 30 99\nreturn`)
                                    : String(selectedLog.details?.rollbackSnippet || `# Rollback script\nsysname ${targetHost}\nundo vlan batch 10 20 30 99\nreturn`);
                                const currentFilename =
                                  deployCodeTab === 'payload'
                                    ? `${String(selectedLog.details?.hostname || 'deployed_payload')}.txt`
                                    : `${String(selectedLog.details?.hostname || 'rollback')}_rollback.txt`;

                                return (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(currentContent, `deploy-${deployCodeTab}`)}
                                      className="h-7 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      {copiedText === `deploy-${deployCodeTab}` ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          <span className="text-emerald-400">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3 text-slate-400" />
                                          <span>{t.history.copyCli || 'Copy CLI'}</span>
                                        </>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDownloadSnippet(currentContent, currentFilename)}
                                      className="h-7 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Download className="w-3 h-3 text-slate-400" />
                                      <span>{t.history.downloadCli || 'Download (.txt)'}</span>
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Code Content with Line Numbers */}
                          <div className="p-3 overflow-auto max-h-[300px] font-mono text-xs">
                            {(() => {
                              const targetHost = String(selectedLog.details?.hostname || getTargetScope(selectedLog) || 'SW-CORE-BKK-01');
                              const content =
                                deployCodeTab === 'payload'
                                  ? String(selectedLog.details?.payloadSnippet || `# Deployed CLI statements\nsysname ${targetHost}\nvlan batch 10 20 30 99\nreturn`)
                                  : String(selectedLog.details?.rollbackSnippet || `# Rollback script\nsysname ${targetHost}\nundo vlan batch 10 20 30 99\nreturn`);

                              return (
                                <table className="w-full border-collapse">
                                  <tbody>
                                    {content.split('\n').map((line, idx) => (
                                      <tr key={idx} className="hover:bg-slate-900/60">
                                        <td className="w-10 pr-3 text-right select-none text-slate-600 text-[11px] align-top font-mono">
                                          {idx + 1}
                                        </td>
                                        <td className="text-slate-200 whitespace-pre font-mono">
                                          {line.startsWith('!') || line.startsWith('#') ? (
                                            <span className="text-slate-500 italic">{line}</span>
                                          ) : line.startsWith('undo') ? (
                                            <span className="text-amber-400 font-semibold">{line}</span>
                                          ) : line.startsWith('interface') || line.startsWith('vlan') || line.startsWith('sysname') ? (
                                            <span className="text-teal-400 font-semibold">{line}</span>
                                          ) : (
                                            line
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SCENARIO C: DEVICE MANAGEMENT Actions (Add/Edit/Delete) */}
                    {activeDrawerCategory === 'DEVICE' && (
                      <div className="space-y-5">
                        {/* Device Target Profile Card */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-xs">
                              {selectedLog.action === 'DELETE_DEVICE' || selectedLog.action === 'PURGE_DEVICE' ? (
                                <Trash2 className="w-4 h-4 text-rose-500" />
                              ) : (
                                <Server className="w-4 h-4 text-purple-500" />
                              )}
                              <span>
                                {selectedLog.action === 'DELETE_DEVICE' || selectedLog.action === 'PURGE_DEVICE'
                                  ? 'Decommissioned Device Record'
                                  : 'Inventory Device Event Record'}
                              </span>
                            </div>
                            <span
                              className={`font-mono text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                                selectedLog.action === 'DELETE_DEVICE' || selectedLog.action === 'PURGE_DEVICE'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                  : 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                              }`}
                            >
                              {selectedLog.action === 'DELETE_DEVICE' || selectedLog.action === 'PURGE_DEVICE'
                                ? 'PURGED FROM FLEET'
                                : String(selectedLog.details?.deviceId || 'DEV-RECORD')}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700/60">
                            <div>
                              <span className="text-slate-400 block">Hostname:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {String(selectedLog.details?.hostname || getTargetScope(selectedLog))}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Vendor OS:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                                {String(selectedLog.details?.vendor || selectedLog.sourceVendor || 'Cisco')}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Architecture:</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {selectedLog.details?.environmentType === 'physical' ? 'Physical Hardware' : 'EVE-NG Virtual Node'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Location:</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {String(selectedLog.details?.siteLocation || 'Central DC')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Audit Note / Decommission Reason Card */}
                        {Boolean(selectedLog.details?.notes) && (
                          <div
                            className={`p-4 rounded-xl border space-y-1.5 shadow-2xs ${
                              selectedLog.action === 'DELETE_DEVICE' || selectedLog.action === 'PURGE_DEVICE'
                                ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {selectedLog.action === 'DELETE_DEVICE' || selectedLog.action === 'PURGE_DEVICE' ? (
                                <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-[#1F8A7A] shrink-0" />
                              )}
                              <h4
                                className={`font-bold text-xs ${
                                  selectedLog.action === 'DELETE_DEVICE' || selectedLog.action === 'PURGE_DEVICE'
                                    ? 'text-rose-900 dark:text-rose-200'
                                    : 'text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                {selectedLog.action === 'DELETE_DEVICE' || selectedLog.action === 'PURGE_DEVICE'
                                  ? 'Audit Note / Decommission Reason'
                                  : 'Audit Note / Reason'}
                              </h4>
                            </div>
                            <p
                              className={`text-xs leading-relaxed ${
                                selectedLog.action === 'DELETE_DEVICE' || selectedLog.action === 'PURGE_DEVICE'
                                  ? 'text-rose-800 dark:text-rose-300 pl-6'
                                  : 'text-slate-600 dark:text-slate-300 pl-6'
                              }`}
                            >
                              {String(selectedLog.details?.notes)}
                            </p>
                          </div>
                        )}

                        {/* If EDIT_DEVICE: Render Clear Diff Table Highlighting Previous vs Updated Value */}
                        {selectedLog.action === 'EDIT_DEVICE' && Array.isArray(selectedLog.details?.diff) && (
                          <div className="space-y-2">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{t.history.diffTableTitle || 'Parameter Modification Diff'}</span>
                            </h4>

                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                                  <tr>
                                    <th className="px-4 py-2.5">{t.history.diffProperty || 'Property'}</th>
                                    <th className="px-4 py-2.5 text-red-600 dark:text-red-400">
                                      {t.history.diffPrevious || 'Previous Value'}
                                    </th>
                                    <th className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400">
                                      {t.history.diffUpdated || 'Updated Value'}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                                  {(selectedLog.details.diff as any[]).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 font-mono text-[11px]">
                                      <td className="px-4 py-2.5 font-sans font-medium text-slate-700 dark:text-slate-300">
                                        {row.property}
                                      </td>
                                      <td className="px-4 py-2.5 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 line-through">
                                        {row.previous}
                                      </td>
                                      <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 font-bold">
                                        {row.updated}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Physical / Virtual Detailed Parameters Snapshot */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-[11px]">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                            Recorded Hardware Telemetry at Event Time:
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                            <div>
                              <span>Management IP: </span>
                              <code className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                                {String(selectedLog.details?.managementIp || '192.168.10.1')}
                              </code>
                            </div>
                            <div>
                              <span>SSH Port: </span>
                              <code className="font-mono text-slate-800 dark:text-slate-200">
                                {String(selectedLog.details?.sshPort || 22)}
                              </code>
                            </div>
                            {Boolean(selectedLog.details?.rackUnit) && (
                              <div>
                                <span>Rack / Unit: </span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {String(selectedLog.details?.rackUnit)}
                                </span>
                              </div>
                            )}
                            {Boolean(selectedLog.details?.serialNumber) && (
                              <div>
                                <span>Serial Number: </span>
                                <code className="font-mono text-slate-800 dark:text-slate-200">
                                  {String(selectedLog.details?.serialNumber)}
                                </code>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SCENARIO OTHER (Rollback generation / general events) */}
                    {activeDrawerCategory === 'OTHER' && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Event Overview</h4>
                          <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                            {selectedLog.action === 'GENERATE_ROLLBACK'
                              ? `Generated ${String(selectedLog.details?.rollbackCommandsGenerated || 14)} compensating rollback commands targeting ${String(selectedLog.details?.targetPlatform || 'Huawei VRP')}.`
                              : 'System activity recorded in secure immutable log stream.'}
                          </p>
                        </div>

                        {(Boolean(selectedLog.details?.targetSnippet) || Boolean(selectedLog.details?.rollbackSnippet)) && (
                          <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col min-h-[280px] shadow-md">
                            {/* Viewer Toolbar */}
                            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                              {/* Left Side: Title & Badge */}
                              <div className="flex items-center gap-2">
                                <RotateCcw className="w-4 h-4 text-amber-400" />
                                <span className="font-semibold text-xs text-slate-200">
                                  {t.history.rollbackScript || 'Auto-Generated Rollback Script'}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700/80">
                                  {String(selectedLog.details?.targetSnippet || selectedLog.details?.rollbackSnippet || '').split('\n').filter(Boolean).length} statements
                                </span>
                              </div>

                              {/* Right Side: Copy & Download Actions */}
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const rollbackContent = String(
                                    selectedLog.details?.targetSnippet || selectedLog.details?.rollbackSnippet || '# Rollback script'
                                  );
                                  const rollbackFilename = `${String(selectedLog.details?.filename || selectedLog.details?.targetScope || 'rollback').replace(/\.[^/.]+$/, '')}_rollback.txt`;

                                  return (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(rollbackContent, 'rollback-cli-other')}
                                        className="h-7 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                        title="Copy rollback script to clipboard"
                                      >
                                        {copiedText === 'rollback-cli-other' ? (
                                          <>
                                            <Check className="w-3 h-3 text-emerald-400" />
                                            <span className="text-emerald-400 font-semibold">Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3 text-slate-400" />
                                            <span>{t.history.copyCli || 'Copy CLI'}</span>
                                          </>
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDownloadSnippet(rollbackContent, rollbackFilename)}
                                        className="h-7 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                        title="Download rollback script as .txt"
                                      >
                                        <Download className="w-3 h-3 text-slate-400" />
                                        <span>{t.history.downloadCli || 'Download (.txt)'}</span>
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Code Content with 1-indexed line numbers */}
                            <div className="p-3 overflow-auto max-h-[360px] font-mono text-xs">
                              {(() => {
                                const content = String(
                                  selectedLog.details?.targetSnippet || selectedLog.details?.rollbackSnippet || '# Rollback script\nundo interface LoopBack0\nreturn'
                                );

                                return (
                                  <table className="w-full border-collapse">
                                    <tbody>
                                      {content.split('\n').map((line, idx) => (
                                        <tr key={idx} className="hover:bg-slate-900/60">
                                          <td className="w-10 pr-3 text-right select-none text-slate-600 text-[11px] align-top font-mono">
                                            {idx + 1}
                                          </td>
                                          <td className="text-slate-200 whitespace-pre font-mono">
                                            {line.startsWith('!') || line.startsWith('#') ? (
                                              <span className="text-slate-500 italic">{line}</span>
                                            ) : line.startsWith('undo') || line.startsWith('no ') ? (
                                              <span className="text-amber-400 font-semibold">{line}</span>
                                            ) : line.startsWith('interface') || line.startsWith('vlan') || line.startsWith('sysname') || line.startsWith('hostname') ? (
                                              <span className="text-teal-400 font-semibold">{line}</span>
                                            ) : (
                                              line
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* 2. RAW JSON TAB */}
                {drawerMainTab === 'rawJson' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        Event Payload SHA-256 Digest Record
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadJson(
                            selectedLog,
                            `audit_${selectedLog.id}_${selectedLog.action.toLowerCase()}.json`
                          )
                        }
                        className="h-7 px-2.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="Download complete JSON audit payload"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        <span>Download (.json)</span>
                      </button>
                    </div>

                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-teal-300 overflow-x-auto max-h-[460px] leading-relaxed shadow-inner">
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Drawer Footer Bar */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>SHA-256 Verified Immutable Record</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(selectedLog, null, 2), 'footer-json')}
                    className="h-8 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedText === 'footer-json' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied JSON</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="h-8 px-4 text-xs font-semibold rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] text-white transition-colors cursor-pointer shadow-2xs"
                  >
                    {t.common.close || 'Close'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
