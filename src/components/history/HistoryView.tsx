import React, { useState } from 'react';
import {
  History,
  Search,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Copy,
  Check
} from 'lucide-react';
import { AuditLog, Language } from '../../types';
import { translations } from '../../locales/translations';

interface HistoryViewProps {
  logs: AuditLog[];
  language: Language;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ logs, language }) => {
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const filteredLogs = logs.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.username.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.timestamp.includes(q) ||
      (l.sourceVendor && l.sourceVendor.toLowerCase().includes(q)) ||
      (l.targetVendor && l.targetVendor.toLowerCase().includes(q))
    );
  });

  const handleCopyJson = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t.history.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {t.history.subtitle}
        </p>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.history.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
          />
        </div>
      </div>

      {/* Audit Trail Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">{t.history.tableTimestamp}</th>
                <th className="px-4 py-3">{t.history.tableUser}</th>
                <th className="px-4 py-3">{t.history.tableAction}</th>
                <th className="px-4 py-3">{t.history.tableVendors}</th>
                <th className="px-4 py-3">{t.history.tableMasked}</th>
                <th className="px-4 py-3">{t.history.tableStatus}</th>
                <th className="px-4 py-3 text-right">{t.history.tableDetails}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No audit records match your query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Timestamp */}
                    <td className="px-4 py-3 font-mono text-slate-500 tabular-nums">
                      {log.timestamp}
                    </td>

                    {/* User */}
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {log.username}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {log.action}
                      </span>
                    </td>

                    {/* Vendor Path */}
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 uppercase">
                      {log.sourceVendor || '-'} → {log.targetVendor || '-'}
                    </td>

                    {/* Masked */}
                    <td className="px-4 py-3 font-mono tabular-nums">
                      {log.maskedSecretsCount > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          {log.maskedSecretsCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[11px]">
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
                            <span className="text-red-700 dark:text-red-400">ERROR</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Action: View JSON */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors"
                      >
                        <FileJson className="w-3 h-3 text-[#1F8A7A]" />
                        <span>{t.common.viewJson}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Detail JSON Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {t.history.modalTitle} — {selectedLog.id}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Logged at {selectedLog.timestamp} by {selectedLog.username}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <pre className="p-4 rounded-lg bg-slate-950 font-mono text-xs text-teal-300 overflow-x-auto max-h-[380px]">
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                SHA-256 Verified Immutable Record
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t.common.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t.common.copy}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                >
                  {t.common.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
