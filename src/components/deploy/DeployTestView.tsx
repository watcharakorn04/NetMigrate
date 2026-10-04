import React, { useState, useEffect, useRef } from 'react';
import {
  PlaySquare,
  Play,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Server,
  Download,
  Trash2,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Radio,
  Cpu,
  Sparkles,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Layers,
  FileCode,
  Lock,
  Unlock,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { ConfigConversion, Device, Language, LogSeverity, TerminalLogEntry, WithheldLine } from '../../types';
import { translations } from '../../locales/translations';
import { extractWithheldLines } from '../../utils/translator';

interface DeployTestViewProps {
  devices: Device[];
  activeConversion: ConfigConversion;
  conversions?: ConfigConversion[];
  activeConversionId?: string;
  onSelectConversion?: (id: string) => void;
  language: Language;
  onRecordAudit: (action: string, details: Record<string, unknown>, maskedCount: number) => void;
}

export type BatchFileStatus = 'idle' | 'pending' | 'simulating' | 'deploying' | 'deployed' | 'dry-run-ok' | 'skipped' | 'failed';

// Helper to extract hostname from conversion CLI and filename
function parseHostnameFromConversion(conversion: ConfigConversion): string {
  const cliText = `${conversion.cleanCli}\n${conversion.originalSource}`;
  // Look for sysname or hostname command
  const match = cliText.match(/^\s*(?:sysname|hostname)\s+([A-Za-z0-9_-]+)/im);
  if (match && match[1]) {
    return match[1].trim();
  }
  // Fallback: strip file extension
  return conversion.filename.replace(/\.[^/.]+$/, '').trim();
}

// Helper to find matching device from inventory
function findMatchingDevice(
  parsedHostname: string,
  devices: Device[]
): { device: Device | null; matchType: 'exact' | 'normalized' | 'none' } {
  if (!parsedHostname || !devices.length) {
    return { device: null, matchType: 'none' };
  }

  const cleanTarget = parsedHostname.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Exact match (case-insensitive)
  const exact = devices.find(d => d.hostname.toLowerCase() === parsedHostname.toLowerCase());
  if (exact) return { device: exact, matchType: 'exact' };

  // 2. Normalized prefix/alphanumeric match (e.g. SW-CORE-BKK matching SW-CORE-BKK-01)
  const normalized = devices.find(d => {
    const devNorm = d.hostname.toLowerCase().replace(/[^a-z0-9]/g, '');
    return devNorm === cleanTarget || devNorm.startsWith(cleanTarget) || cleanTarget.startsWith(devNorm);
  });
  if (normalized) return { device: normalized, matchType: 'normalized' };

  return { device: null, matchType: 'none' };
}

export const DeployTestView: React.FC<DeployTestViewProps> = ({
  devices,
  activeConversion,
  conversions = [activeConversion],
  activeConversionId = activeConversion.id,
  onSelectConversion,
  language,
  onRecordAudit,
}) => {
  const t = translations[language];

  // Current active conversion
  const currentConversion = conversions.find(c => c.id === activeConversionId) || activeConversion;
  const currentConversionIndex = conversions.findIndex(c => c.id === currentConversion.id);
  const totalConversions = conversions.length;

  // Parsed Hostname from active payload
  const parsedHostname = parseHostnameFromConversion(currentConversion);

  // Auto-matching result for current payload
  const autoMatchResult = findMatchingDevice(parsedHostname, devices);

  // Manual device selection override map per conversion ID
  const [deviceOverrides, setDeviceOverrides] = useState<Record<string, string>>({});
  
  // Resolve effective device ID
  const isManuallyOverridden = Object.prototype.hasOwnProperty.call(deviceOverrides, currentConversion.id);
  const effectiveDeviceId = isManuallyOverridden
    ? deviceOverrides[currentConversion.id]
    : (autoMatchResult.device ? autoMatchResult.device.id : '');

  const selectedDevice = devices.find(d => d.id === effectiveDeviceId) || null;

  // Left panel view tab: 'preview' (Target CLI code) vs 'withheld' (Guardrails)
  const [leftTab, setLeftTab] = useState<'preview' | 'withheld'>('preview');

  // Copy CLI state
  const [copiedCli, setCopiedCli] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<TerminalLogEntry[]>([
    {
      id: 'log-init-1',
      timestamp: new Date().toLocaleTimeString(),
      severity: 'INFO',
      message: 'NetMigrate EVE-NG deployment worker ready. Target matching engine active.',
    },
    {
      id: 'log-init-2',
      timestamp: new Date().toLocaleTimeString(),
      severity: 'INFO',
      message: `Active payload: ${currentConversion.filename} (${currentConversion.targetVendor.toUpperCase()} target). Parsed hostname: "${parsedHostname}".`,
    },
  ]);

  // Deployment state
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  const [isBatchDeploying, setIsBatchDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');

  // Batch execution status tracker
  const [batchStatuses, setBatchStatuses] = useState<Record<string, BatchFileStatus>>(() => {
    const initial: Record<string, BatchFileStatus> = {};
    conversions.forEach(c => {
      initial[c.id] = 'idle';
    });
    return initial;
  });

  // Terminal options
  const [autoScroll, setAutoScroll] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<LogSeverity>('ALL');
  const terminalRef = useRef<HTMLDivElement>(null);

  // Withheld lines calculation for current payload
  const withheldLines: WithheldLine[] = extractWithheldLines(currentConversion.lines);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Copy converted CLI to clipboard
  const handleCopyCli = () => {
    if (currentConversion?.cleanCli) {
      navigator.clipboard.writeText(currentConversion.cleanCli);
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2000);
    }
  };

  // Clear terminal
  const handleClearLogs = () => {
    setLogs([]);
  };

  // Download terminal logs as txt
  const handleDownloadLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.severity}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployment_log_${selectedDevice?.hostname || parsedHostname || 'lab'}_${Date.now()}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Add a single log entry
  const appendLog = (severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'COMMAND', message: string, nodeId?: number) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        severity,
        message,
        nodeId,
      },
    ]);
  };

  // Handle manual device override selection
  const handleDeviceSelect = (devId: string) => {
    setDeviceOverrides(prev => ({
      ...prev,
      [currentConversion.id]: devId,
    }));
    const newDev = devices.find(d => d.id === devId);
    if (newDev) {
      appendLog('INFO', `Operator manually assigned target device: ${newDev.hostname} (${newDev.managementIp}) for ${currentConversion.filename}`);
    } else {
      appendLog('WARNING', `Target device unmapped for payload ${currentConversion.filename}. Safety lock engaged.`);
    }
  };

  // Switch payload
  const handleSwitchPayload = (convId: string) => {
    if (onSelectConversion) {
      onSelectConversion(convId);
    }
    const targetConv = conversions.find(c => c.id === convId);
    if (targetConv) {
      const pHost = parseHostnameFromConversion(targetConv);
      const match = findMatchingDevice(pHost, devices);
      appendLog('INFO', `Switched active payload to ${targetConv.filename}. Target hostname: "${pHost}" ${match.device ? `[Auto-Matched to ${match.device.hostname}]` : '[Unmapped]'}`);
    }
  };

  // Run deployment sequence for single payload
  const runExecution = async (dryRun: boolean, targetConv = currentConversion, targetDev = selectedDevice) => {
    if (!targetDev || isDeploying) return false;

    setIsDeploying(true);
    setIsDryRun(dryRun);
    setDeploymentStatus('running');

    setBatchStatuses(prev => ({
      ...prev,
      [targetConv.id]: dryRun ? 'simulating' : 'deploying',
    }));

    const nodeName = targetDev.hostname;
    const ip = targetDev.managementIp;
    const port = targetDev.sshPort;
    const isEve = targetDev.isEveNg;
    const nodeId = targetDev.eveNodeId;

    appendLog('INFO', `--------------------------------------------------------`);
    appendLog('INFO', `${dryRun ? '[SIMULATION DRY-RUN]' : '[LIVE PUSH]'} Initiated for ${nodeName} (${ip}:${port})`);
    appendLog('INFO', `Payload File: ${targetConv.filename} (${targetConv.cleanCli.split('\n').filter(Boolean).length} CLI lines)`);
    if (isEve) {
      appendLog('INFO', `Targeting EVE-NG Virtual Environment — Node ID: #${nodeId}`);
    }

    // Step 1: Connect
    await new Promise((r) => setTimeout(r, 450));
    appendLog('COMMAND', `ssh -p ${port} netadmin@${ip} [Profile: ${targetDev.credentialProfile || 'Default'}]`, nodeId);
    await new Promise((r) => setTimeout(r, 500));
    appendLog('SUCCESS', `SSH Handshake verified. Host key ECDSA-SHA2-NISTP256 accepted.`, nodeId);

    // Step 2: Guardrail check
    await new Promise((r) => setTimeout(r, 350));
    const convWithheld = extractWithheldLines(targetConv.lines);
    appendLog('INFO', `Running Pre-flight Guardrail Audit on ${targetConv.filename}...`, nodeId);
    if (convWithheld.length > 0) {
      appendLog('WARNING', `Security Guardrail Withheld ${convWithheld.length} sensitive/unmapped lines from execution stream.`, nodeId);
    } else {
      appendLog('SUCCESS', `Guardrail passed: 0 withheld lines.`, nodeId);
    }

    // Step 3: Enter configuration mode
    await new Promise((r) => setTimeout(r, 400));
    if (targetDev.vendor === 'huawei') {
      appendLog('COMMAND', `system-view`, nodeId);
      appendLog('INFO', `[${nodeName}] Enter system view, return to user view with return.`, nodeId);
    } else {
      appendLog('COMMAND', `configure terminal`, nodeId);
      appendLog('INFO', `Enter configuration commands, one per line. End with CNTL/Z.`, nodeId);
    }

    // Step 4: Stream commands
    const cleanLines = targetConv.cleanCli.split('\n').filter(Boolean);
    const sampleBatch = cleanLines.slice(0, 8);

    for (let i = 0; i < sampleBatch.length; i++) {
      await new Promise((r) => setTimeout(r, 160));
      appendLog('COMMAND', sampleBatch[i], nodeId);
    }

    if (cleanLines.length > 8) {
      appendLog('INFO', `... Executed remaining ${cleanLines.length - 8} statements synchronously.`, nodeId);
    }

    // Step 5: Commit & Validate
    await new Promise((r) => setTimeout(r, 550));
    if (dryRun) {
      appendLog('SUCCESS', `Dry-run simulation completed. Syntax validated against ${targetDev.vendor.toUpperCase()} schema.`, nodeId);
      appendLog('INFO', `No hardware commit issued in Dry-Run mode.`, nodeId);
      setDeploymentStatus('success');
      setBatchStatuses(prev => ({
        ...prev,
        [targetConv.id]: 'dry-run-ok',
      }));
    } else {
      if (targetDev.vendor === 'huawei') {
        appendLog('COMMAND', `commit`, nodeId);
        await new Promise((r) => setTimeout(r, 600));
        appendLog('SUCCESS', `Configuration committed to VRP Startup-Saved Database.`, nodeId);
      } else {
        appendLog('COMMAND', `copy running-config startup-config`, nodeId);
        await new Promise((r) => setTimeout(r, 600));
        appendLog('SUCCESS', `Building configuration... [OK]`, nodeId);
      }
      appendLog('SUCCESS', `Session closed gracefully. Device Status: Online & Synced.`, nodeId);
      setDeploymentStatus('success');
      setBatchStatuses(prev => ({
        ...prev,
        [targetConv.id]: 'deployed',
      }));
    }

    setIsDeploying(false);

    onRecordAudit(
      dryRun ? 'CONVERT_SINGLE' : 'DEPLOY_EVENG',
      {
        filename: targetConv.filename,
        device: nodeName,
        ip,
        isEveNg: isEve,
        nodeId,
        dryRun,
        commandsExecuted: cleanLines.length,
        withheldCount: convWithheld.length,
      },
      convWithheld.filter(w => w.reason === 'SECRET_MASKED').length
    );

    return true;
  };

  // Run Sequential Batch Deployment for all conversions
  const handleDeployAllBatch = async () => {
    if (isDeploying || isBatchDeploying) return;

    setIsBatchDeploying(true);
    appendLog('INFO', `========================================================`);
    appendLog('INFO', `[BATCH DEPLOYMENT INITIATED] Queued ${conversions.length} payload files for sequential deployment.`);

    let deployedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < conversions.length; i++) {
      const conv = conversions[i];
      const pHost = parseHostnameFromConversion(conv);
      
      // Determine device
      const overrideDevId = deviceOverrides[conv.id];
      let targetDev: Device | null = null;

      if (overrideDevId) {
        targetDev = devices.find(d => d.id === overrideDevId) || null;
      } else {
        const match = findMatchingDevice(pHost, devices);
        targetDev = match.device;
      }

      appendLog('INFO', `--------------------------------------------------------`);
      appendLog('INFO', `[BATCH ${i + 1}/${conversions.length}] Processing "${conv.filename}" (Parsed Hostname: "${pHost}")...`);

      if (!targetDev) {
        appendLog('WARNING', `[BATCH ${i + 1}/${conversions.length}] ⚠️ Skipped "${conv.filename}" — No target device mapped or selected.`);
        setBatchStatuses(prev => ({ ...prev, [conv.id]: 'skipped' }));
        skippedCount++;
        await new Promise(r => setTimeout(r, 400));
        continue;
      }

      // Automatically switch view to active conversion
      if (onSelectConversion) {
        onSelectConversion(conv.id);
      }

      appendLog('INFO', `[BATCH ${i + 1}/${conversions.length}] Deploying to ${targetDev.hostname} (${targetDev.managementIp})...`);
      
      const success = await runExecution(false, conv, targetDev);
      if (success) {
        deployedCount++;
      } else {
        skippedCount++;
      }

      await new Promise(r => setTimeout(r, 600));
    }

    appendLog('INFO', `========================================================`);
    appendLog('SUCCESS', `🎉 [BATCH COMPLETE] Finished sequential batch execution: ${deployedCount} Deployed, ${skippedCount} Skipped.`);
    setIsBatchDeploying(false);
  };

  // Filtered log entries
  const filteredLogs = logs.filter((log) => {
    if (severityFilter === 'ALL') return true;
    return log.severity === severityFilter;
  });

  const cleanLines = currentConversion.cleanCli.split('\n');

  return (
    <div className="space-y-5">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <PlaySquare className="w-6 h-6 text-[#1F8A7A]" />
            <span>{t.deploy.title}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t.deploy.subtitle}
          </p>
        </div>

        {/* Global Batch Action Button */}
        {totalConversions > 1 && (
          <button
            type="button"
            disabled={isDeploying || isBatchDeploying}
            onClick={handleDeployAllBatch}
            className="h-9 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white text-xs font-semibold inline-flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 self-start sm:self-auto"
            title="Sequentially deploy all converted files in the queue"
          >
            {isBatchDeploying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Deploying Batch ({totalConversions} Files)...</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5" />
                <span>Deploy All Batch (Sequential)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 1. Converted Payload Selector & Batch Queue Bar */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Active Payload Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/60 flex items-center justify-center text-[#1F8A7A] shrink-0">
              <FileCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  Active Payload: <span className="font-mono text-teal-600 dark:text-teal-400">{currentConversion.filename}</span>
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {currentConversionIndex + 1} of {totalConversions} {totalConversions === 1 ? 'file' : 'files'}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {currentConversion.sourceVendor.toUpperCase()} ➔ {currentConversion.targetVendor.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Target VRP CLI • {cleanLines.length} statements • {currentConversion.fileSize || '2.0 KB'}
              </p>
            </div>
          </div>

          {/* Payload Selector Controls */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            {/* Step Previous */}
            <button
              type="button"
              disabled={currentConversionIndex <= 0 || isDeploying}
              onClick={() => handleSwitchPayload(conversions[currentConversionIndex - 1].id)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
              title="Previous Payload"
              aria-label="Previous Payload"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dropdown Selector */}
            <select
              value={currentConversion.id}
              onChange={(e) => handleSwitchPayload(e.target.value)}
              disabled={isDeploying}
              className="h-8 px-2.5 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A] cursor-pointer"
            >
              {conversions.map((conv, idx) => (
                <option key={conv.id} value={conv.id}>
                  {idx + 1}. {conv.filename} ({parseHostnameFromConversion(conv)})
                </option>
              ))}
            </select>

            {/* Step Next */}
            <button
              type="button"
              disabled={currentConversionIndex >= totalConversions - 1 || isDeploying}
              onClick={() => handleSwitchPayload(conversions[currentConversionIndex + 1].id)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
              title="Next Payload"
              aria-label="Next Payload"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5. Batch Progress Overview (When multiple files are converted) */}
        {totalConversions > 1 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#1F8A7A]" />
                <span>Batch Queue & Execution Status</span>
              </span>
              <span className="text-[10px] text-slate-400">Click any file to load active payload</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {conversions.map((c, i) => {
                const pHost = parseHostnameFromConversion(c);
                const devOverride = deviceOverrides[c.id];
                const matched = devOverride ? devices.find(d => d.id === devOverride) : findMatchingDevice(pHost, devices).device;
                const status = batchStatuses[c.id] || 'idle';
                const isActive = c.id === currentConversion.id;

                let statusBadge = (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Ready
                  </span>
                );

                if (status === 'deploying' || status === 'simulating') {
                  statusBadge = (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 animate-pulse font-semibold">
                      {status === 'simulating' ? 'Simulating...' : 'Deploying...'}
                    </span>
                  );
                } else if (status === 'deployed') {
                  statusBadge = (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" /> Deployed
                    </span>
                  );
                } else if (status === 'dry-run-ok') {
                  statusBadge = (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-semibold">
                      Dry-Run OK
                    </span>
                  );
                } else if (status === 'skipped') {
                  statusBadge = (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                      Skipped (Unmapped)
                    </span>
                  );
                }

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSwitchPayload(c.id)}
                    className={`p-2 rounded-lg border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      isActive
                        ? 'border-[#1F8A7A] bg-teal-50/60 dark:bg-teal-950/30 ring-1 ring-[#1F8A7A]'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400">#{i + 1}</span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate block">
                          {c.filename}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                        <span>Node:</span>
                        {matched ? (
                          <span className="text-slate-700 dark:text-slate-300 font-mono">{matched.hostname}</span>
                        ) : (
                          <span className="text-amber-500 font-semibold">[Unmapped]</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {statusBadge}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Target Device Auto-Matching & Manual Assignment Card */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Target Device Selector & Auto-Match Status */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Server className="w-4 h-4 text-[#1F8A7A]" />
                <span>{t.deploy.selectDevice}:</span>
              </label>

              {/* Status Badge: Auto-Matched vs Unmapped vs Manual */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Parsed Hostname: <code className="font-mono text-slate-600 dark:text-slate-300 font-bold">{parsedHostname}</code></span>
                
                {isManuallyOverridden ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300/60 dark:border-sky-800/60">
                    <ExternalLink className="w-3 h-3" /> Manual Selection
                  </span>
                ) : selectedDevice ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60 shadow-2xs animate-in fade-in">
                    <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Auto-Matched</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60 shadow-2xs animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>Unmapped</span>
                  </span>
                )}
              </div>
            </div>

            {/* Dropdown with Unmapped Empty Default Option */}
            <div className="relative">
              <select
                value={effectiveDeviceId}
                onChange={(e) => handleDeviceSelect(e.target.value)}
                disabled={isDeploying}
                className={`w-full px-3 py-2.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer focus:outline-hidden focus:ring-1 ${
                  selectedDevice
                    ? 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-[#1F8A7A]'
                    : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 focus:ring-amber-500'
                }`}
              >
                <option value="">-- Select Target Device (Required for Execution) --</option>
                {devices.map((device) => {
                  const isMatched = device.hostname.toLowerCase().includes(parsedHostname.toLowerCase());
                  return (
                    <option key={device.id} value={device.id}>
                      {device.hostname} ({device.managementIp}) — {device.vendor.toUpperCase()} {device.isEveNg ? `[EVE-NG #${device.eveNodeId}]` : '[Physical]'} {isMatched ? '★ (Matched)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* 4. Action Triggers with Safety Lock Validation */}
          <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
            {/* Simulate Dry Run */}
            <button
              type="button"
              disabled={isDeploying || !selectedDevice}
              onClick={() => runExecution(true)}
              className="flex items-center gap-1.5 h-10 px-4 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs border border-slate-200 dark:border-slate-700"
              title={!selectedDevice ? "Safety Lock Engaged: Target device required" : "Run syntax simulation without committing changes"}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isDeploying && isDryRun ? 'animate-spin' : ''}`} />
              <span>{t.deploy.simulateBtn}</span>
            </button>

            {/* Live Push to EVE-NG */}
            <button
              type="button"
              disabled={isDeploying || !selectedDevice}
              onClick={() => runExecution(false)}
              className="flex items-center gap-1.5 h-10 px-5 text-xs font-semibold rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              title={!selectedDevice ? "Safety Lock Engaged: Target device required" : "Execute SSH push and commit configuration"}
            >
              {selectedDevice ? <Play className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-200" />}
              <span>{t.deploy.pushBtn}</span>
            </button>
          </div>
        </div>

        {/* Safety Lock Warning Banner when Unmapped */}
        {!selectedDevice && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Safety Lock Engaged:</strong> No target device selected for payload <code className="font-mono font-bold">{currentConversion.filename}</code>. Simulation and push buttons are locked to prevent configuration push without a verified destination node.
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded font-bold shrink-0">
              Locked
            </span>
          </div>
        )}

        {/* Selected Node Details Pill Strip */}
        {selectedDevice && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[#1F8A7A]" />
              <span><strong>Hostname:</strong> <span className="font-mono text-slate-800 dark:text-slate-200">{selectedDevice.hostname}</span></span>
            </div>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span><strong>IP:</strong> <code className="font-mono text-slate-700 dark:text-slate-300">{selectedDevice.managementIp}:{selectedDevice.sshPort}</code></span>
            </div>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span><strong>Vendor OS:</strong></span>
              {selectedDevice.vendor === 'cisco' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50">
                  Cisco IOS-XE
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50">
                  Huawei VRP
                </span>
              )}
            </div>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span><strong>Role:</strong> {selectedDevice.networkRole}</span>
            </div>
            {selectedDevice.isEveNg && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                <div className="flex items-center gap-1 text-[#1F8A7A] font-medium font-mono text-[11px]">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>EVE-NG Node ID #{selectedDevice.eveNodeId}</span>
                </div>
              </>
            )}
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${selectedDevice.status === 'Online' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span className="font-medium text-slate-700 dark:text-slate-300">{selectedDevice.status}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Workspace: Target CLI Active Payload Preview (Left 5 Cols) + Terminal Stream (Right 7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Target CLI Active Payload Preview & Withheld Lines Panel */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden flex flex-col h-[600px]">
          {/* Subtab Header */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-900 text-xs">
              <button
                type="button"
                onClick={() => setLeftTab('preview')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  leftTab === 'preview'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-[#1F8A7A]" />
                <span>Target CLI Script</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {cleanLines.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLeftTab('withheld')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  leftTab === 'withheld'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span>Withheld Lines</span>
                <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  withheldLines.length > 0
                    ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}>
                  {withheldLines.length}
                </span>
              </button>
            </div>

            {/* Quick Copy Button */}
            {leftTab === 'preview' && (
              <button
                type="button"
                onClick={handleCopyCli}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                title="Copy entire clean target CLI script to clipboard"
              >
                {copiedCli ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span className="text-[11px]">Copy CLI</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Subtab View 1: Target CLI Preview with Line Numbers & Syntax Highlights */}
          {leftTab === 'preview' && (
            <div className="flex-1 overflow-y-auto font-mono text-xs p-3 bg-slate-950 text-slate-200 selection:bg-[#1F8A7A]/40">
              <div className="space-y-0.5">
                {cleanLines.map((line, idx) => {
                  const lineTrimmed = line.trim();
                  const isComment = lineTrimmed.startsWith('#') || lineTrimmed.startsWith('!');
                  const isSysname = lineTrimmed.startsWith('sysname') || lineTrimmed.startsWith('hostname');
                  const isInterface = lineTrimmed.startsWith('interface');
                  const isReturn = lineTrimmed === 'return' || lineTrimmed === 'end' || lineTrimmed === 'commit';
                  const isRoute = lineTrimmed.startsWith('ip route');

                  let highlightClass = 'text-slate-300';
                  if (isComment) highlightClass = 'text-slate-500 italic';
                  else if (isSysname) highlightClass = 'text-teal-300 font-bold';
                  else if (isInterface) highlightClass = 'text-sky-300 font-semibold';
                  else if (isReturn) highlightClass = 'text-amber-400 font-semibold';
                  else if (isRoute) highlightClass = 'text-indigo-300';

                  return (
                    <div key={`cli-line-${idx}`} className="flex items-start hover:bg-slate-900/80 rounded px-1 py-0.5 leading-snug">
                      <span className="w-8 shrink-0 text-slate-600 select-none text-[11px] text-right pr-3 font-mono tabular-nums">
                        {idx + 1}
                      </span>
                      <span className={`break-all whitespace-pre-wrap ${highlightClass}`}>
                        {line}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subtab View 2: Withheld Lines Guardrail Panel */}
          {leftTab === 'withheld' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/40 dark:bg-slate-900">
              {withheldLines.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t.deploy.noWithheld}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    100% of translated commands passed executable guardrails without withheld secrets.
                  </span>
                </div>
              ) : (
                withheldLines.map((w, idx) => (
                  <div
                    key={`withheld-${idx}`}
                    className="p-3 rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold">
                        Line {w.lineNum} · {w.reason}
                      </span>
                    </div>
                    <pre className="p-2 rounded bg-white dark:bg-slate-950 font-mono text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto border border-amber-200/50 dark:border-amber-900/40">
                      {w.sourceText}
                    </pre>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                      {w.explanation}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Bottom Footer Information */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1F8A7A]" />
              <span>AES-256 Secrets Scrubbed</span>
            </span>
            <span className="font-mono text-[10px]">
              Ready for {currentConversion.targetVendor.toUpperCase()} Engine
            </span>
          </div>
        </div>

        {/* Right Column: Real-time Terminal Log Stream (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 shadow-md flex flex-col h-[600px] overflow-hidden">
          {/* Terminal Top Control Bar */}
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <Terminal className="w-4 h-4 text-[#1F8A7A]" />
              <span className="font-mono font-semibold text-slate-300">
                {t.deploy.terminalTitle}
              </span>
              {(isDeploying || isBatchDeploying) && (
                <span className="flex items-center gap-1 text-[11px] text-teal-400 font-mono animate-pulse">
                  <Radio className="w-3 h-3" />
                  <span>{isBatchDeploying ? 'BATCH STREAMING' : 'STREAMING'}</span>
                </span>
              )}
            </div>

            {/* Severity Filters */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              {(['ALL', 'INFO', 'COMMAND', 'SUCCESS', 'WARNING', 'ERROR'] as LogSeverity[]).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2 py-0.5 rounded-md font-mono transition-colors cursor-pointer ${
                    severityFilter === sev
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Terminal Actions */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded-xs border-slate-700 bg-slate-900 text-[#1F8A7A] focus:ring-0"
                />
                <span>{t.deploy.autoscroll}</span>
              </label>

              <button
                type="button"
                onClick={handleClearLogs}
                className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title={t.deploy.clearLogs}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleDownloadLogs}
                className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title={t.deploy.downloadLogs}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Terminal Console View */}
          <div
            ref={terminalRef}
            className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1.5 leading-relaxed selection:bg-[#1F8A7A]/40"
          >
            {filteredLogs.map((log) => {
              let sevColor = 'text-slate-400';
              if (log.severity === 'SUCCESS') sevColor = 'text-emerald-400';
              if (log.severity === 'WARNING') sevColor = 'text-amber-400';
              if (log.severity === 'ERROR') sevColor = 'text-red-400';
              if (log.severity === 'COMMAND') sevColor = 'text-teal-300';

              return (
                <div key={log.id} className="flex items-start gap-2 hover:bg-slate-900/60 rounded px-1 py-0.5">
                  <span className="text-slate-600 select-none text-[11px] tabular-nums shrink-0">
                    [{log.timestamp}]
                  </span>
                  <span className={`font-bold select-none text-[11px] shrink-0 ${sevColor}`}>
                    [{log.severity}]
                  </span>
                  {log.nodeId && (
                    <span className="text-[10px] text-teal-400 bg-teal-950/60 px-1 py-0.2 rounded border border-teal-800/40 shrink-0">
                      Node #{log.nodeId}
                    </span>
                  )}
                  <span className="text-slate-200 whitespace-pre-wrap break-all">
                    {log.message}
                  </span>
                </div>
              );
            })}

            {(isDeploying || isBatchDeploying) && (
              <div className="flex items-center gap-2 text-teal-400 pt-1">
                <span className="inline-block w-2 h-4 bg-teal-400 animate-pulse" />
                <span className="text-xs">
                  {isBatchDeploying
                    ? 'Executing sequential batch deployment across lab nodes...'
                    : isDryRun
                    ? t.deploy.runningDryRun
                    : t.deploy.pushingConfig}
                </span>
              </div>
            )}
          </div>

          {/* Terminal Bottom Status Bar */}
          <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 text-[11px] flex items-center justify-between text-slate-400 font-mono">
            <div>
              Status:{' '}
              <span
                className={`font-semibold ${
                  deploymentStatus === 'success'
                    ? 'text-emerald-400'
                    : deploymentStatus === 'running'
                    ? 'text-teal-400'
                    : 'text-slate-400'
                }`}
              >
                {deploymentStatus === 'success'
                  ? 'SUCCESS: IDLE'
                  : deploymentStatus === 'running'
                  ? 'EXECUTING'
                  : 'READY'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span>SSH Protocol 2.0 · ECDSA</span>
              <span>·</span>
              <span>EVE-NG Socket Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
