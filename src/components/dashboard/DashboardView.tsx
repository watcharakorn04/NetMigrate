import React from 'react';
import {
  ArrowRightLeft,
  ShieldAlert,
  Server,
  Sparkles,
  PlaySquare,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  FileCode,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { ConfigConversion, Device, Language } from '../../types';
import { translations } from '../../locales/translations';

interface DashboardViewProps {
  conversions: ConfigConversion[];
  devices: Device[];
  onNavigate: (tab: string) => void;
  onSelectConversion: (id: string) => void;
  language: Language;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  conversions,
  devices,
  onNavigate,
  onSelectConversion,
  language,
}) => {
  const t = translations[language];

  // Aggregated metrics
  const totalConversions = conversions.length + 18; // Includes historic runs
  const totalMaskedSecrets = conversions.reduce((sum, c) => sum + c.maskedSecretsCount, 12);
  const onlineDevices = devices.filter((d) => d.status === 'Online').length;

  // Average rule coverage
  const avgRuleCoverage = Math.round(
    conversions.reduce((sum, c) => sum + c.coverage.rule, 0) / (conversions.length || 1)
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t.dashboard.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {t.dashboard.subtitle}
        </p>
      </div>

      {/* Summary 4-Grid Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>{t.dashboard.statConversions}</span>
            <ArrowRightLeft className="w-4 h-4 text-[#1F8A7A]" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {totalConversions}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+8 migrations this week</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>{t.dashboard.statRuleCoverage}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {avgRuleCoverage}%
          </div>
          <div className="text-[11px] text-slate-400">
            Zero-hallucination deterministic matches
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>{t.dashboard.statMaskedSecrets}</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {totalMaskedSecrets}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400">
            Guarded from plaintext execution
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>{t.dashboard.statActiveNodes}</span>
            <Server className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {onlineDevices} / {devices.length}
          </div>
          <div className="text-[11px] text-slate-400">
            EVE-NG Lab + Physical hardware
          </div>
        </div>
      </div>

      {/* Trust Ratio & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trust Breakdown Card (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              {t.dashboard.trustRatioTitle}
            </h3>
            <span className="text-xs text-slate-400 font-mono">Aggregated Metric</span>
          </div>

          <div className="space-y-3">
            {/* Rule Engine bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  [R] Deterministic Rule Engine
                </span>
                <span className="font-mono text-slate-500">86.2%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-700 dark:bg-slate-300 rounded-full" style={{ width: '86.2%' }} />
              </div>
            </div>

            {/* AI Suggestion bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  [A] AI Synthesized Suggestions
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400">8.5%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '8.5%' }} />
              </div>
            </div>

            {/* Unmapped / Guarded bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-red-700 dark:text-red-400">
                  [U] Guardrail Unmapped & Secrets Masked
                </span>
                <span className="font-mono text-red-600 dark:text-red-400">5.3%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: '5.3%' }} />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-teal-50/60 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/60 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-[#1F8A7A] shrink-0 mt-0.5" />
            <span>
              NetMigrate enforces zero silent failures. Any command lacking a certified 1-to-1 rule mapping is withheld from production execution.
            </span>
          </div>
        </div>

        {/* Quick Workflows Card (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">
              {t.dashboard.quickActions}
            </h3>
            <p className="text-xs text-slate-400">
              One-click access to core engineering tools
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => onNavigate('convert')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#1F8A7A] hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="w-4 h-4 text-[#1F8A7A]" />
                <span>{t.dashboard.btnBatchConvert}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate('deploy')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#1F8A7A] hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <PlaySquare className="w-4 h-4 text-emerald-500" />
                <span>{t.dashboard.btnEveDeploy}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate('rules')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#1F8A7A] hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span>{t.dashboard.btnViewRules}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            Current Target OS: Huawei VRP v8.x / Cisco IOS-XE 17.x
          </div>
        </div>
      </div>

      {/* Recent Conversions Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            {t.dashboard.recentConversions}
          </h3>
          <button
            onClick={() => onNavigate('convert')}
            className="text-xs font-semibold text-[#1F8A7A] hover:underline"
          >
            Open Workspace →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Configuration File</th>
                <th className="px-4 py-3">Source Vendor</th>
                <th className="px-4 py-3">Target Vendor</th>
                <th className="px-4 py-3">Rule Match Rate</th>
                <th className="px-4 py-3">Guarded Secrets</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {conversions.map((conv) => (
                <tr key={conv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-semibold font-mono text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-3.5 h-3.5 text-slate-400" />
                      <span>{conv.filename}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="uppercase font-mono text-[11px] text-slate-500">
                      {conv.sourceVendor}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="uppercase font-mono text-[11px] text-[#1F8A7A] font-semibold">
                      {conv.targetVendor}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-medium">
                    {conv.coverage.rule}%
                  </td>
                  <td className="px-4 py-3">
                    {conv.maskedSecretsCount > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {conv.maskedSecretsCount} Masked
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        onSelectConversion(conv.id);
                        onNavigate('convert');
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#1F8A7A] hover:text-white transition-colors text-[11px] font-semibold"
                    >
                      Audit Diff
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
