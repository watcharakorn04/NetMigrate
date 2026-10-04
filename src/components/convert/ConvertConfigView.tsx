import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  ArrowRightLeft,
  FileCode,
  Download,
  Copy,
  Check,
  AlertTriangle,
  ShieldAlert,
  Info,
  RotateCcw,
  Sparkles,
  FileArchive,
  Layers,
  CheckCircle2,
  X,
  FileText,
  SlidersHorizontal
} from 'lucide-react';
import JSZip from 'jszip';
import { ConfigConversion, Language, TranslatedLine, Vendor } from '../../types';
import { translations } from '../../locales/translations';
import {
  detectVendor,
  translateConfig,
  generateRollback,
  exportCleanCli
} from '../../utils/translator';
import {
  SAMPLE_CISCO_CORE_CFG,
  SAMPLE_CISCO_BRANCH_CFG,
  SAMPLE_HUAWEI_VRP_CFG
} from '../../data/mockData';

interface ConvertConfigViewProps {
  conversions: ConfigConversion[];
  activeConversionId: string;
  onSelectConversion: (id: string) => void;
  onAddConversions: (newConversions: ConfigConversion[]) => void;
  onUpdateConversion?: (updatedConversion: ConfigConversion) => void;
  language: Language;
  onRecordAudit: (action: string, details: Record<string, unknown>, maskedCount: number) => void;
}

export const ConvertConfigView: React.FC<ConvertConfigViewProps> = ({
  conversions,
  activeConversionId,
  onSelectConversion,
  onAddConversions,
  onUpdateConversion,
  language,
  onRecordAudit,
}) => {
  const t = translations[language];

  // Active conversion
  const activeConversion = conversions.find((c) => c.id === activeConversionId) || conversions[0];

  // Source and Target Vendor overrides
  const [sourceVendor, setSourceVendor] = useState<Vendor>(activeConversion ? activeConversion.sourceVendor : 'cisco');
  const [targetVendor, setTargetVendor] = useState<Vendor>(activeConversion ? activeConversion.targetVendor : 'huawei');
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inspector modal for line provenance
  const [selectedLine, setSelectedLine] = useState<TranslatedLine | null>(null);

  // Rollback modal
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [cleanExportModalOpen, setCleanExportModalOpen] = useState(false);

  // Copy feedback
  const [copiedTarget, setCopiedTarget] = useState(false);
  const [copiedClean, setCopiedClean] = useState(false);
  const [copiedRollback, setCopiedRollback] = useState(false);

  // Scroll sync refs
  const sourceScrollRef = useRef<HTMLDivElement>(null);
  const targetScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  // Sync scroll between panes
  const handleScroll = (source: 'source' | 'target') => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;

    if (source === 'source' && sourceScrollRef.current && targetScrollRef.current) {
      targetScrollRef.current.scrollTop = sourceScrollRef.current.scrollTop;
    } else if (source === 'target' && sourceScrollRef.current && targetScrollRef.current) {
      sourceScrollRef.current.scrollTop = targetScrollRef.current.scrollTop;
    }

    setTimeout(() => {
      isSyncingScroll.current = false;
    }, 50);
  };

  // Sync vendors when active conversion changes
  useEffect(() => {
    if (activeConversion) {
      setSourceVendor(activeConversion.sourceVendor);
      setTargetVendor(activeConversion.targetVendor);
      setAutoDetectEnabled(true);
    }
  }, [activeConversionId]);

  // Handle file uploads
  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newConversions: ConfigConversion[] = [];

    for (const file of fileArray) {
      const text = await file.text();
      let src = sourceVendor;
      let tgt = targetVendor;

      if (autoDetectEnabled) {
        src = detectVendor(text);
        tgt = src === 'cisco' ? 'huawei' : 'cisco';
      }

      const conversion = translateConfig(text, src, tgt, file.name);
      newConversions.push(conversion);
    }

    onAddConversions(newConversions);
    if (newConversions.length > 0) {
      onSelectConversion(newConversions[0].id);
      setSourceVendor(newConversions[0].sourceVendor);
      setTargetVendor(newConversions[0].targetVendor);
    }

    const totalMasked = newConversions.reduce((sum, c) => sum + c.maskedSecretsCount, 0);
    onRecordAudit(
      newConversions.length > 1 ? 'CONVERT_BATCH' : 'CONVERT_SINGLE',
      {
        fileCount: newConversions.length,
        files: newConversions.map((c) => c.filename),
        sourceVendor: newConversions[0].sourceVendor,
        targetVendor: newConversions[0].targetVendor,
      },
      totalMasked
    );
  };

  // Drag handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Preset loaders
  const loadPreset = (presetType: 'core' | 'branch' | 'huawei' | 'security') => {
    let rawText = '';
    let name = '';
    let src: Vendor = 'cisco';
    let tgt: Vendor = 'huawei';

    switch (presetType) {
      case 'core':
        rawText = SAMPLE_CISCO_CORE_CFG;
        name = 'cisco-core-switch.cfg';
        src = 'cisco';
        tgt = 'huawei';
        break;
      case 'branch':
        rawText = SAMPLE_CISCO_BRANCH_CFG;
        name = 'cisco-branch-router.cfg';
        src = 'cisco';
        tgt = 'huawei';
        break;
      case 'huawei':
        rawText = SAMPLE_HUAWEI_VRP_CFG;
        name = 'huawei-vrp-aggregation.cfg';
        src = 'huawei';
        tgt = 'cisco';
        break;
      case 'security':
        rawText = `! Security Sensitive Edge Gateway
hostname SEC-GW-01
enable secret 5 $1$99Xp$k9912zB7.secretHash
username root privilege 15 secret 5 $1$abc$pwd123
snmp-server community EnterpriseVault ro
radius-server key 7 0822455D0A16
interface GigabitEthernet0/0/0
 ip address 10.10.10.1 255.255.255.0
 no shutdown
end`;
        name = 'security-creds-demo.cfg';
        src = 'cisco';
        tgt = 'huawei';
        break;
    }

    const conversion = translateConfig(rawText, src, tgt, name);
    onAddConversions([conversion]);
    onSelectConversion(conversion.id);
    setSourceVendor(src);
    setTargetVendor(tgt);
    setAutoDetectEnabled(true);

    onRecordAudit(
      'CONVERT_SINGLE',
      {
        filename: name,
        preset: presetType,
        sourceVendor: src,
        targetVendor: tgt,
      },
      conversion.maskedSecretsCount
    );
  };

  // Detected vendor dynamically computed from active conversion
  const detectedVendor: Vendor = activeConversion ? detectVendor(activeConversion.originalSource) : 'cisco';
  const isManualOverride = sourceVendor !== detectedVendor || !autoDetectEnabled;

  // Change source vendor manually
  const handleSourceVendorChange = (newSrc: Vendor) => {
    setSourceVendor(newSrc);
    const newTgt = newSrc === 'cisco' ? 'huawei' : 'cisco';
    setTargetVendor(newTgt);
    setAutoDetectEnabled(newSrc === detectedVendor);

    if (activeConversion && onUpdateConversion) {
      const retranslated = {
        ...translateConfig(
          activeConversion.originalSource,
          newSrc,
          newTgt,
          activeConversion.filename
        ),
        id: activeConversion.id,
      };
      onUpdateConversion(retranslated);
    }
  };

  // Change target vendor manually
  const handleTargetVendorChange = (newTgt: Vendor) => {
    setTargetVendor(newTgt);
    const newSrc = newTgt === 'cisco' ? 'huawei' : 'cisco';
    setSourceVendor(newSrc);
    setAutoDetectEnabled(newSrc === detectedVendor);

    if (activeConversion && onUpdateConversion) {
      const retranslated = {
        ...translateConfig(
          activeConversion.originalSource,
          newSrc,
          newTgt,
          activeConversion.filename
        ),
        id: activeConversion.id,
      };
      onUpdateConversion(retranslated);
    }
  };

  // Reset back to AI-detected vendor or re-trigger auto-detection
  const handleResetToAutoDetect = () => {
    if (!activeConversion) return;
    const detected = detectVendor(activeConversion.originalSource);
    const tgt = detected === 'cisco' ? 'huawei' : 'cisco';

    setSourceVendor(detected);
    setTargetVendor(tgt);
    setAutoDetectEnabled(true);

    if (onUpdateConversion) {
      const retranslated = {
        ...translateConfig(
          activeConversion.originalSource,
          detected,
          tgt,
          activeConversion.filename
        ),
        id: activeConversion.id,
      };
      onUpdateConversion(retranslated);
    }
  };

  // Re-translate when direction is changed
  const handleDirectionSwap = () => {
    const newSrc = targetVendor;
    const newTgt = sourceVendor;
    setSourceVendor(newSrc);
    setTargetVendor(newTgt);
    setAutoDetectEnabled(newSrc === detectedVendor);

    if (activeConversion && onUpdateConversion) {
      const retranslated = {
        ...translateConfig(
          activeConversion.originalSource,
          newSrc,
          newTgt,
          activeConversion.filename
        ),
        id: activeConversion.id,
      };
      onUpdateConversion(retranslated);
    }
  };

  // Download all as ZIP using JSZip
  const handleDownloadZip = async () => {
    if (conversions.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder('netmigrate_batch_translations');

    conversions.forEach((conv) => {
      const cleanName = conv.filename.replace(/\.[^/.]+$/, '');
      const targetExt = conv.targetVendor === 'huawei' ? '.vrp.cfg' : '.ios.cfg';

      // 1. Full annotated translation
      const fullContent = conv.lines.map((l) => l.target).join('\n');
      folder?.file(`${cleanName}_translated${targetExt}`, fullContent);

      // 2. Clean CLI
      folder?.file(`${cleanName}_clean_executable${targetExt}`, conv.cleanCli);

      // 3. Rollback script
      folder?.file(`${cleanName}_rollback.cfg`, conv.rollbackCli);
    });

    // Add batch summary manifest
    const summary = {
      project: "NetMigrate Consolidated Batch Export",
      generatedAt: new Date().toISOString(),
      totalFiles: conversions.length,
      files: conversions.map((c) => ({
        filename: c.filename,
        sourceVendor: c.sourceVendor,
        targetVendor: c.targetVendor,
        coverage: c.coverage,
        maskedSecretsCount: c.maskedSecretsCount,
      })),
    };
    folder?.file("batch_manifest.json", JSON.stringify(summary, null, 2));

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netmigrate_batch_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download single file
  const handleDownloadSingle = () => {
    if (!activeConversion) return;
    const targetText = activeConversion.lines.map((l) => l.target).join('\n');
    const blob = new Blob([targetText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_${activeConversion.filename}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy target text
  const handleCopyTarget = () => {
    if (!activeConversion) return;
    const targetText = activeConversion.lines.map((l) => l.target).join('\n');
    navigator.clipboard.writeText(targetText);
    setCopiedTarget(true);
    setTimeout(() => setCopiedTarget(false), 2000);
  };

  // Copy clean CLI
  const handleCopyClean = () => {
    if (!activeConversion) return;
    navigator.clipboard.writeText(activeConversion.cleanCli);
    setCopiedClean(true);
    setTimeout(() => setCopiedClean(false), 2000);
  };

  // Copy rollback CLI
  const handleCopyRollback = () => {
    if (!activeConversion) return;
    navigator.clipboard.writeText(activeConversion.rollbackCli);
    setCopiedRollback(true);
    setTimeout(() => setCopiedRollback(false), 2000);
  };

  // Helper for provenance badge styling
  const renderProvenanceBadge = (type: string) => {
    switch (type) {
      case 'R':
        return (
          <span
            className="w-5 h-5 flex items-center justify-center rounded text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800"
            title="[R] Rule Engine: Deterministic exact match"
          >
            R
          </span>
        );
      case 'A':
        return (
          <span
            className="w-5 h-5 flex items-center justify-center rounded text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40"
            title="[A] AI Suggestion: Synthesized equivalent feature"
          >
            A
          </span>
        );
      case 'U':
        return (
          <span
            className="w-5 h-5 flex items-center justify-center rounded text-[11px] font-mono font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40"
            title="[U] Unmapped / Masked: Review required"
          >
            U
          </span>
        );
      case 'G':
        return (
          <span
            className="w-5 h-5 flex items-center justify-center rounded text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40"
            title="[G] Generated: System structure or comments"
          >
            G
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Top Header & Workflows */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 min-w-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.convert.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t.convert.subtitle}
          </p>
        </div>

        {/* Quick Sample Presets */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-xs text-slate-400 font-medium mr-1 leading-none">{t.convert.sampleConfigs}:</span>
          <button
            type="button"
            onClick={() => loadPreset('core')}
            className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#1F8A7A] hover:text-[#1F8A7A] transition-colors inline-flex items-center leading-none whitespace-nowrap cursor-pointer"
          >
            Cisco Core
          </button>
          <button
            type="button"
            onClick={() => loadPreset('branch')}
            className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#1F8A7A] hover:text-[#1F8A7A] transition-colors inline-flex items-center leading-none whitespace-nowrap cursor-pointer"
          >
            Branch BGP
          </button>
          <button
            type="button"
            onClick={() => loadPreset('huawei')}
            className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#1F8A7A] hover:text-[#1F8A7A] transition-colors inline-flex items-center leading-none whitespace-nowrap cursor-pointer"
          >
            Huawei VRP
          </button>
          <button
            type="button"
            onClick={() => loadPreset('security')}
            className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-red-500 hover:text-red-500 transition-colors inline-flex items-center leading-none whitespace-nowrap cursor-pointer"
          >
            Masking Demo
          </button>
        </div>
      </div>

      {/* Drag & Drop Upload Zone + Batch Queue Bar */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-5 rounded-xl border-2 border-dashed transition-all overflow-hidden ${
          isDragging
            ? 'border-[#1F8A7A] bg-teal-50/50 dark:bg-teal-950/20'
            : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-[#1F8A7A] shrink-0 border border-teal-100 dark:border-teal-900">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {t.convert.uploadTitle}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                {t.convert.uploadSubtitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".cfg,.txt,.conf"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-10 min-h-[40px] px-5 text-xs font-semibold rounded-lg bg-[#1F8A7A] text-white hover:bg-[#176f62] transition-colors shadow-2xs inline-flex items-center leading-none whitespace-nowrap cursor-pointer"
            >
              {t.convert.browseFiles}
            </button>
          </div>
        </div>

        {/* Batch Queue Tabs (When multiple files are present) */}
        {conversions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0 py-0.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap leading-none">
                  {t.convert.batchFiles} ({conversions.length}):
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {conversions.map((conv) => {
                  const isActive = conv.id === activeConversion.id;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => onSelectConversion(conv.id)}
                      className={`min-h-[38px] py-1.5 px-3 flex items-center gap-2 rounded-lg text-xs font-medium transition-all border leading-normal cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-xs font-semibold'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:text-slate-900 dark:hover:text-slate-100 shadow-2xs'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5 shrink-0 text-[#1F8A7A]" />
                      <span className="leading-normal max-w-[180px] sm:max-w-[220px] truncate inline-block pb-0.5" title={conv.filename}>
                        {conv.filename}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold uppercase leading-none tracking-wide shrink-0 ${
                          isActive
                            ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {conv.sourceVendor === 'cisco' ? 'Cisco' : 'Huawei'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Batch Download ZIP Button */}
            {conversions.length > 1 && (
              <button
                type="button"
                onClick={handleDownloadZip}
                className="h-9 min-h-[36px] flex items-center gap-1.5 px-3.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#1F8A7A] hover:text-[#1F8A7A] transition-colors shrink-0 shadow-2xs leading-none whitespace-nowrap self-start sm:self-auto cursor-pointer"
              >
                <FileArchive className="w-3.5 h-3.5 text-[#1F8A7A] shrink-0" />
                <span className="leading-none">{t.convert.downloadZip}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Control Bar: Vendor Selection, Direction Swap, Export Actions */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Vendor Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-none">
                {t.convert.sourceVendor}:
              </label>
              <select
                value={sourceVendor}
                onChange={(e) => handleSourceVendorChange(e.target.value as Vendor)}
                className="h-9 min-h-[36px] px-3 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A] cursor-pointer"
              >
                <option value="cisco">{t.common.cisco}</option>
                <option value="huawei">{t.common.huawei}</option>
              </select>
            </div>

            {/* Swap Button */}
            <button
              onClick={handleDirectionSwap}
              className="w-9 h-9 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#1F8A7A] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              title={t.convert.swapVendors}
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-none">
                {t.convert.targetVendor}:
              </label>
              <select
                value={targetVendor}
                onChange={(e) => handleTargetVendorChange(e.target.value as Vendor)}
                className="h-9 min-h-[36px] px-3 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A] cursor-pointer"
              >
                <option value="huawei">{t.common.huawei}</option>
                <option value="cisco">{t.common.cisco}</option>
              </select>
            </div>

            {/* Auto-detect / Manual Override Interactive Status Badge */}
            {isManualOverride ? (
              /* Manual Override State */
              <button
                type="button"
                onClick={handleResetToAutoDetect}
                className="h-9 min-h-[36px] flex items-center gap-2 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-normal whitespace-nowrap cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all group shadow-2xs"
                title={
                  language === 'th'
                    ? `คลิกเพื่อรีเซ็ตกลับเป็น ${detectedVendor === 'cisco' ? 'Cisco' : 'Huawei'} ที่ตรวจพบอัตโนมัติ`
                    : `Click to reset to detected ${detectedVendor === 'cisco' ? 'Cisco' : 'Huawei'}`
                }
              >
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400 group-hover:rotate-45 transition-transform" />
                  <span className="font-semibold leading-normal inline-block pb-0.5">
                    {language === 'th' ? 'กำหนดเอง' : 'Manual Override'}
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/70 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 font-normal group-hover:underline flex items-center gap-1 leading-normal pb-0.5">
                  <RotateCcw className="w-2.5 h-2.5 shrink-0" />
                  <span>{language === 'th' ? 'คลิกเพื่อรีเซ็ต' : 'Click to Reset'}</span>
                </span>
              </button>
            ) : (
              /* Auto-Detect Normal State */
              <button
                type="button"
                onClick={handleResetToAutoDetect}
                className="h-9 min-h-[36px] flex items-center gap-1.5 px-3 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900 text-[11px] text-[#1F8A7A] dark:text-teal-400 font-medium leading-normal whitespace-nowrap cursor-pointer hover:bg-teal-100/70 dark:hover:bg-teal-900/60 hover:border-teal-300 dark:hover:border-teal-800 transition-all group shadow-2xs"
                title={language === 'th' ? 'คลิกเพื่อตรวจจับอัตโนมัติอีกครั้ง' : 'Click to re-trigger auto-detection'}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#1F8A7A] dark:text-teal-400 group-hover:scale-110 transition-transform" />
                <span className="leading-normal inline-block pb-0.5">
                  {t.common.autoDetect}: {detectedVendor === 'cisco' ? 'Cisco Detected' : 'Huawei Detected'}
                </span>
              </button>
            )}
          </div>

          {/* Action Buttons with fixed heights and leading-none */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRollbackModalOpen(true)}
              className="h-9 min-h-[36px] flex items-center gap-1.5 px-3.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors leading-none whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="leading-none">{t.convert.generateRollback}</span>
            </button>

            <button
              onClick={() => setCleanExportModalOpen(true)}
              className="h-9 min-h-[36px] flex items-center gap-1.5 px-3.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors leading-none whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-[#1F8A7A] shrink-0" />
              <span className="leading-none">{t.convert.cleanExport}</span>
            </button>

            <button
              onClick={handleCopyTarget}
              className="h-9 min-h-[36px] flex items-center gap-1.5 px-3.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors leading-none whitespace-nowrap"
            >
              {copiedTarget ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="leading-none">{t.common.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span className="leading-none">{t.convert.copyOutput}</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadSingle}
              className="h-9 min-h-[36px] flex items-center gap-1.5 px-4 text-xs font-semibold rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] text-white transition-colors shadow-2xs leading-none whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none">{t.convert.downloadSingle}</span>
            </button>
          </div>
        </div>

        {/* Coverage Strip Summary */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {t.convert.coverageSummary} ({activeConversion.filename})
            </span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-600 dark:bg-slate-400" />
                <span>{t.convert.ruleCoverage}: <strong>{activeConversion.coverage.rule}%</strong></span>
              </span>
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                <span>{t.convert.aiCoverage}: <strong>{activeConversion.coverage.ai}%</strong></span>
              </span>
              <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-red-500" />
                <span>{t.convert.unmappedCoverage}: <strong>{activeConversion.coverage.unmapped}%</strong></span>
              </span>
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" />
                <span>{t.convert.generatedCoverage}: <strong>{activeConversion.coverage.generated}%</strong></span>
              </span>
            </div>
          </div>

          {/* Multi-segment Progress Bar */}
          <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${activeConversion.coverage.rule}%` }}
              className="bg-slate-600 dark:bg-slate-400 transition-all duration-500"
              title={`Rule Engine: ${activeConversion.coverage.rule}%`}
            />
            <div
              style={{ width: `${activeConversion.coverage.ai}%` }}
              className="bg-amber-500 transition-all duration-500"
              title={`AI Suggestion: ${activeConversion.coverage.ai}%`}
            />
            <div
              style={{ width: `${activeConversion.coverage.unmapped}%` }}
              className="bg-red-500 transition-all duration-500"
              title={`Unmapped/Masked: ${activeConversion.coverage.unmapped}%`}
            />
            <div
              style={{ width: `${activeConversion.coverage.generated}%` }}
              className="bg-blue-500 transition-all duration-500"
              title={`Generated: ${activeConversion.coverage.generated}%`}
            />
          </div>

          {/* Security Masking Warning if any */}
          {activeConversion.maskedSecretsCount > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>{activeConversion.maskedSecretsCount} credentials masked:</strong> {t.convert.withheldAlert}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Side-by-Side Diff View */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {/* Pane Titles */}
        <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 flex items-center justify-between border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>{t.convert.sourcePane} ({activeConversion.sourceVendor.toUpperCase()})</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">{activeConversion.lines.length} lines</span>
          </div>

          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1F8A7A]" />
              <span>{t.convert.targetPane} ({activeConversion.targetVendor.toUpperCase()})</span>
            </div>
            {activeConversion.needsReviewCount > 0 ? (
              <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-mono font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {activeConversion.needsReviewCount} {t.convert.needsReviewAlert}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t.convert.statusOk}
              </span>
            )}
          </div>
        </div>

        {/* Dual Code View with synchronized scrolling */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 font-mono text-xs">
          {/* Left Pane: Source CLI */}
          <div
            ref={sourceScrollRef}
            onScroll={() => handleScroll('source')}
            className="h-[520px] overflow-y-auto overflow-x-auto bg-slate-50/50 dark:bg-slate-950/60 p-2"
          >
            {activeConversion.lines.map((line) => (
              <div
                key={`src-${line.lineNum}`}
                className="flex items-stretch hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xs group transition-colors leading-relaxed"
              >
                {/* Line number */}
                <span className="w-10 shrink-0 text-right pr-3 select-none text-slate-400 dark:text-slate-600 text-[11px]">
                  {line.lineNum}
                </span>
                {/* Source text */}
                <span className="text-slate-800 dark:text-slate-200 whitespace-pre font-mono">
                  {line.source || ' '}
                </span>
              </div>
            ))}
          </div>

          {/* Right Pane: Target CLI with Provenance Gutter */}
          <div
            ref={targetScrollRef}
            onScroll={() => handleScroll('target')}
            className="h-[520px] overflow-y-auto overflow-x-auto bg-white dark:bg-slate-900 p-2"
          >
            {activeConversion.lines.map((line) => {
              const hasAlert = line.needsReview;
              return (
                <div
                  key={`tgt-${line.lineNum}`}
                  onClick={() => setSelectedLine(line)}
                  className={`flex items-center hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xs cursor-pointer group transition-colors leading-relaxed ${
                    hasAlert ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''
                  }`}
                >
                  {/* Line Number */}
                  <span className="w-10 shrink-0 text-right pr-2 select-none text-slate-400 dark:text-slate-600 text-[11px]">
                    {line.lineNum}
                  </span>

                  {/* Left Gutter: Provenance Badge [R], [A], [U], [G] */}
                  <span className="w-6 shrink-0 flex items-center justify-center">
                    {renderProvenanceBadge(line.provenance)}
                  </span>

                  {/* Red Alert Dot for needsReview */}
                  <span className="w-3 shrink-0 flex items-center justify-center">
                    {hasAlert ? (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-red-500"
                        title={t.convert.unmappedTooltip}
                      />
                    ) : null}
                  </span>

                  {/* Target text */}
                  <span
                    className={`whitespace-pre font-mono pl-1 ${
                      line.isMasked
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : line.provenance === 'A'
                        ? 'text-amber-700 dark:text-amber-300'
                        : line.provenance === 'U'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {line.target || ' '}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Gutter Legend Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex flex-wrap items-center gap-4 text-slate-500 dark:text-slate-400 text-[11px]">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{t.convert.lineLegend}:</span>
            <span className="flex items-center gap-1.5">
              {renderProvenanceBadge('R')}
              <span>{t.convert.legendR}</span>
            </span>
            <span className="flex items-center gap-1.5">
              {renderProvenanceBadge('A')}
              <span>{t.convert.legendA}</span>
            </span>
            <span className="flex items-center gap-1.5">
              {renderProvenanceBadge('U')}
              <span>{t.convert.legendU}</span>
            </span>
            <span className="flex items-center gap-1.5">
              {renderProvenanceBadge('G')}
              <span>{t.convert.legendG}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Info className="w-3.5 h-3.5" />
            <span>Click any line to inspect provenance & rules</span>
          </div>
        </div>
      </div>

      {/* Line Provenance Inspector Modal */}
      {selectedLine && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {t.convert.lineDetail}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  {t.convert.lineNum} {selectedLine.lineNum}
                </span>
              </div>
              <button
                onClick={() => setSelectedLine(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Source CLI Command
                </label>
                <pre className="p-3 rounded-lg bg-slate-100 dark:bg-slate-950 font-mono text-slate-800 dark:text-slate-200 overflow-x-auto">
                  {selectedLine.source || '(empty line)'}
                </pre>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Target Translated Output
                </label>
                <pre className="p-3 rounded-lg bg-slate-100 dark:bg-slate-950 font-mono text-slate-800 dark:text-slate-200 overflow-x-auto">
                  {selectedLine.target || '(empty line)'}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Engine Provenance</span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    {renderProvenanceBadge(selectedLine.provenance)}
                    <span>
                      {selectedLine.provenance === 'R'
                        ? 'Deterministic Rule'
                        : selectedLine.provenance === 'A'
                        ? 'AI Suggestion'
                        : selectedLine.provenance === 'U'
                        ? 'Unmapped / Masked'
                        : 'System Generated'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Audit Status</span>
                  <span
                    className={`font-semibold ${
                      selectedLine.needsReview
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {selectedLine.needsReview ? 'Manual Review Flagged' : 'Audit Verified OK'}
                  </span>
                </div>
              </div>

              {selectedLine.note && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300">
                  <span className="font-semibold block mb-0.5">NetDevOps Note:</span>
                  <span>{selectedLine.note}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLine(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Export Modal */}
      {cleanExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {t.convert.cleanExport} — {activeConversion.filename}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t.convert.cleanExportDesc}
                </p>
              </div>
              <button
                onClick={() => setCleanExportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="relative">
                <textarea
                  readOnly
                  rows={16}
                  value={activeConversion.cleanCli}
                  className="w-full p-3 font-mono text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 select-all"
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {activeConversion.cleanCli.split('\n').filter(Boolean).length} pure executable statements
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyClean}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  {copiedClean ? (
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
                  onClick={() => setCleanExportModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                >
                  {t.common.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rollback Script Modal */}
      {rollbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                  <span>{t.convert.generateRollback} — {activeConversion.filename}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Inverse commands generated to cleanly revert changes on {activeConversion.targetVendor.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setRollbackModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <textarea
                readOnly
                rows={16}
                value={activeConversion.rollbackCli}
                className="w-full p-3 font-mono text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 select-all"
              />
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {activeConversion.rollbackCli.split('\n').filter(Boolean).length} rollback directives
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyRollback}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  {copiedRollback ? (
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
                  onClick={() => setRollbackModalOpen(false)}
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
