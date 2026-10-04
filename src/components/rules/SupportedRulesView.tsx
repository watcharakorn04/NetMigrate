import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  ArrowRightLeft,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Info
} from 'lucide-react';
import { CommandRule, Language } from '../../types';
import { translations } from '../../locales/translations';
import { SUPPORTED_RULES } from '../../data/mockData';

interface SupportedRulesViewProps {
  language: Language;
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
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.rules.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? t.rules.filterCategory : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>
            {t.rules.totalRules}: <strong>{filteredRules.length}</strong>
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
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
                filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Category */}
                    <td className="px-4 py-3 align-top">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {rule.category}
                      </span>
                    </td>

                    {/* Cisco Syntax */}
                    <td className="px-4 py-3 align-top font-mono text-slate-900 dark:text-slate-100">
                      <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 whitespace-pre font-mono text-[11px]">
                        {rule.ciscoSyntax}
                      </div>
                    </td>

                    {/* Direction */}
                    <td className="px-4 py-3 align-top text-center">
                      <div className="flex items-center justify-center p-1 text-slate-400">
                        {rule.direction === 'bidirectional' ? (
                          <span title="Bidirectional">
                            <ArrowRightLeft className="w-3.5 h-3.5 text-[#1F8A7A]" />
                          </span>
                        ) : (
                          <span title="One-way">
                            <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Huawei Syntax */}
                    <td className="px-4 py-3 align-top font-mono text-slate-900 dark:text-slate-100">
                      <div className={`p-1.5 rounded border whitespace-pre font-mono text-[11px] ${
                        rule.isSecuritySensitive
                          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800'
                      }`}>
                        {rule.huaweiSyntax}
                      </div>
                    </td>

                    {/* Notes & Invariants */}
                    <td className="px-4 py-3 align-top text-slate-500 dark:text-slate-400 leading-snug">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5 text-[11px]">
                        {rule.description}
                      </div>
                      {rule.notes && (
                        <div className="text-[11px] text-slate-400 flex items-start gap-1 mt-0.5">
                          <Info className="w-3 h-3 text-[#1F8A7A] shrink-0 mt-0.5" />
                          <span>{rule.notes}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
