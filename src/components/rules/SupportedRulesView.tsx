import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  ArrowRightLeft,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Info,
  X
} from 'lucide-react';
import { CommandRule, Language } from '../../types';
import { translations } from '../../locales/translations';
import { SUPPORTED_RULES } from '../../data/mockData';

interface SupportedRulesViewProps {
  language: Language;
}

// Category badge color accents helper
function getCategoryBadgeStyle(category: string): string {
  switch (category) {
    case 'Routing (OSPF/BGP/Static)':
      return 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/80';
    case 'Security & ACL':
      return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80';
    case 'Interface':
      return 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200/80 dark:border-cyan-800/80';
    case 'VLAN & Trunking':
      return 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/80';
    case 'Link Aggregation':
      return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80';
    case 'STP':
      return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/80';
    case 'Management & AAA':
      return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80';
    case 'System':
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
}

// Convert literal \n or escaped line breaks into actual newlines for rendering
function formatCliSyntax(text: string): string {
  if (!text) return '';
  return text.replace(/\\n/g, '\n');
}

export const SupportedRulesView: React.FC<SupportedRulesViewProps> = ({ language }) => {
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    'all',
    'System',
    'Interface',
    'VLAN & Trunking',
    'STP',
    'Link Aggregation',
    'Routing (OSPF/BGP/Static)',
    'Security & ACL',
    'Management & AAA',
  ];

  const filteredRules = SUPPORTED_RULES.filter((rule) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      rule.ciscoSyntax.toLowerCase().includes(q) ||
      rule.huaweiSyntax.toLowerCase().includes(q) ||
      rule.description.toLowerCase().includes(q) ||
      (rule.notes && rule.notes.toLowerCase().includes(q));

    const matchesCategory =
      selectedCategory === 'all' || rule.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t.rules.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {t.rules.subtitle}
        </p>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.rules.searchPlaceholder}
              className="w-full pl-9 pr-9 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ colorScheme: 'dark light' }}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A] cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? t.rules.filterCategory : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Rules Counter Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>
            {language === 'th' ? (
              <>
                แสดง <strong>{filteredRules.length}</strong> จากทั้งหมด <strong>{SUPPORTED_RULES.length}</strong> กฎมาตรฐานที่รองรับ
              </>
            ) : (
              <>
                Showing <strong>{filteredRules.length}</strong> of <strong>{SUPPORTED_RULES.length}</strong> standardized rules
              </>
            )}
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Deterministic Verified Invariants</span>
          </span>
        </div>
      </div>

      {/* Rules Reference Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">{t.rules.tableCategory}</th>
                <th className="px-4 py-3">{t.rules.tableCisco}</th>
                <th className="px-4 py-3 text-center">{t.rules.tableDirection}</th>
                <th className="px-4 py-3">{t.rules.tableHuawei}</th>
                <th className="px-4 py-3">{t.rules.tableNotes}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    No rules found matching your query.
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => {
                  const isSecurityMasked =
                    rule.isSecuritySensitive || rule.huaweiSyntax.includes('[MASKED]');

                  return (
                    <tr
                      key={rule.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Category Badge with Contextual Color Accents */}
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap shadow-2xs ${getCategoryBadgeStyle(
                            rule.category
                          )}`}
                        >
                          {rule.category}
                        </span>
                      </td>

                      {/* Cisco Syntax (Multi-line newline preserved) */}
                      <td className="px-4 py-3 align-top font-mono text-slate-900 dark:text-slate-100">
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 whitespace-pre-wrap font-mono text-[11px] leading-relaxed shadow-2xs">
                          {formatCliSyntax(rule.ciscoSyntax)}
                        </div>
                      </td>

                      {/* Direction with Amber Accent for One-Way Security Vault Rules */}
                      <td className="px-4 py-3 align-top text-center">
                        <div className="flex items-center justify-center p-1">
                          {rule.direction === 'bidirectional' ? (
                            <span title="Bidirectional Deterministic Mapping">
                              <ArrowRightLeft className="w-3.5 h-3.5 text-[#1F8A7A]" />
                            </span>
                          ) : isSecurityMasked ? (
                            <span title="One-way Security Vault Masking (Guarded Secret)">
                              <ArrowRight className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                            </span>
                          ) : (
                            <span title="One-way Translation">
                              <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Huawei Syntax (Multi-line newline preserved & Security styling) */}
                      <td className="px-4 py-3 align-top font-mono text-slate-900 dark:text-slate-100">
                        <div
                          className={`p-2 rounded-lg border whitespace-pre-wrap font-mono text-[11px] leading-relaxed shadow-2xs ${
                            rule.isSecuritySensitive
                              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 font-semibold'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800'
                          }`}
                        >
                          {formatCliSyntax(rule.huaweiSyntax)}
                        </div>
                      </td>

                      {/* Notes & Invariants */}
                      <td className="px-4 py-3 align-top text-slate-500 dark:text-slate-400 leading-snug">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5 text-[11px]">
                          {rule.description}
                        </div>
                        {rule.notes && (
                          <div className="text-[11px] text-slate-400 flex items-start gap-1 mt-1">
                            <Info className="w-3 h-3 text-[#1F8A7A] shrink-0 mt-0.5" />
                            <span>{rule.notes}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
