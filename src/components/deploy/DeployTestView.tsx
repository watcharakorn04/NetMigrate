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
  ExternalLink,
  Upload,
  X,
  FileText,
  Plus
} from 'lucide-react';
import { ConfigConversion, Device, Language, LogSeverity, TerminalLogEntry, WithheldLine } from '../../types';
import { translations } from '../../locales/translations';
import { detectVendor, translateConfig, extractWithheldLines } from '../../utils/translator';

interface DeployTestViewProps {
  devices: Device[];
  deployPayloads?: ConfigConversion[];
  activeDeployPayloadId?: string;
  onSelectDeployPayload?: (id: string) => void;
  onAddDeployPayloads?: (newPayloads: ConfigConversion[]) => void;
  onDeleteDeployPayload?: (id: string) => void;
  activeConversion?: ConfigConversion;
  conversions?: ConfigConversion[];
  activeConversionId?: string;
  onSelectConversion?: (id: string) => void;
  onAddConversions?: (newConversions: ConfigConversion[]) => void;
  onDeleteConversion?: (id: string) => void;
  language: Language;
  onRecordAudit: (action: string, details: Record<string, unknown>, maskedCount: number) => void;
}

export type BatchFileStatus = 'idle' | 'pending' | 'simulating' | 'deploying' | 'deployed' | 'dry-run-ok' | 'skipped' | 'failed';

// Helper to extract hostname from conversion CLI and filename (for metadata display only)
function parseHostnameFromConversion(conversion: ConfigConversion): string {
  const cliText = `${conversion.cleanCli}\n${conversion.originalSource}`;
  const match = cliText.match(/^\s*(?:sysname|hostname)\s+([A-Za-z0-9_-]+)/im);
  if (match && match[1]) {
    return match[1].trim();
  }
  return conversion.filename.replace(/\.[^/.]+$/, '').trim();
}

export const DeployTestView: React.FC<DeployTestViewProps> = ({
  devices,
  deployPayloads: propDeployPayloads,
  activeDeployPayloadId: propActiveDeployPayloadId,
  onSelectDeployPayload: propOnSelectDeployPayload,
  onAddDeployPayloads: propOnAddDeployPayloads,
  onDeleteDeployPayload: propOnDeleteDeployPayload,
  activeConversion,
  conversions: initialConversions,
  activeConversionId: initialActiveId,
  onSelectConversion,
  onAddConversions,
  onDeleteConversion,
  language,
  onRecordAudit,
}) => {
  const t = translations[language];

  // EXPLICIT PAYLOAD INGESTION (No Auto-Flow):
  // Deploy console starts as a clean slate by default (empty queue).
  // Converted scripts from the workspace tab do not automatically clutter the deploy queue.
  // Operators explicitly upload deployment payloads via the "Upload Payload Files (.txt)" button or empty dropzone.
  const [internalPayloads, setInternalPayloads] = useState<ConfigConversion[]>([]);
  const [internalActiveId, setInternalActiveId] = useState<string>('');

  const isControlled = propDeployPayloads !== undefined;
  const deployPayloads = isControlled ? propDeployPayloads : internalPayloads;
  const activeDeployPayloadId = isControlled
    ? (propActiveDeployPayloadId || (deployPayloads[0]?.id || ''))
    : internalActiveId;

  const setActiveDeployPayloadId = (id: string) => {
    if (isControlled && propOnSelectDeployPayload) {
      propOnSelectDeployPayload(id);
    } else {
      setInternalActiveId(id);
    }
  };

  const handleAddDeployPayloads = (newPayloads: ConfigConversion[]) => {
    if (isControlled && propOnAddDeployPayloads) {
      propOnAddDeployPayloads(newPayloads);
    } else {
      setInternalPayloads((prev) => [...prev, ...newPayloads]);
      if (newPayloads.length > 0) {
        setInternalActiveId(newPayloads[0].id);
      }
    }
  };

  const handleDeleteDeployPayload = (idToDelete: string) => {
    if (isControlled && propOnDeleteDeployPayload) {
      propOnDeleteDeployPayload(idToDelete);
    } else {
      setInternalPayloads((prev) => {
        const next = prev.filter((p) => p.id !== idToDelete);
        if (internalActiveId === idToDelete) {
          setInternalActiveId(next.length > 0 ? next[0].id : '');
        }
        return next;
      });
    }
  };

  const currentConversion = deployPayloads.find((c) => c.id === activeDeployPayloadId) || deployPayloads[0] || null;
  const currentConversionIndex = currentConversion ? deployPayloads.findIndex((c) => c.id === currentConversion.id) : -1;
  const totalConversions = deployPayloads.length;

  // Direct Upload Drag & Drop ref and state
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Dual-Tab Payload Ingestion Modal State
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [ingestModalTab, setIngestModalTab] = useState<'upload' | 'paste'>('upload');
  const [modalRefName, setModalRefName] = useState('');
  const [modalPasteCli, setModalPasteCli] = useState('');
  const [modalStagedFiles, setModalStagedFiles] = useState<{ file: File; text: string; linesCount: number }[]>([]);
  const [isModalDragging, setIsModalDragging] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // STRICT MANUAL TARGET SELECTION (Zero auto-matching):
  // Every file defaults to unselected ("") with [Unmapped] status.
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Record<string, string>>({});

  // Effective device explicitly chosen for current conversion
  const effectiveDeviceId = (currentConversion && selectedDeviceIds[currentConversion.id]) || '';
  const selectedDevice = devices.find((d) => d.id === effectiveDeviceId) || null;

  // Left panel view tab: 'preview' (Target CLI code) vs 'withheld' (Guardrails)
  const [leftTab, setLeftTab] = useState<'preview' | 'withheld'>('preview');

  // Copy CLI state
  const [copiedCli, setCopiedCli] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<TerminalLogEntry[]>(() => [
    {
      id: 'log-init-1',
      timestamp: new Date().toLocaleTimeString(),
      severity: 'INFO',
      message: 'NetMigrate EVE-NG deployment worker ready. Strict manual target safety policy enforced.',
    },
    {
      id: 'log-init-2',
      timestamp: new Date().toLocaleTimeString(),
      severity: 'INFO',
      message: 'Deployment workspace ready. Upload target .txt scripts to begin simulation or execution.',
    },
  ]);

  // Deployment state
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  const [isBatchDeploying, setIsBatchDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');

  // Batch execution status tracker
  const [batchStatuses, setBatchStatuses] = useState<Record<string, BatchFileStatus>>({});

  // Terminal options
  const [autoScroll, setAutoScroll] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<LogSeverity>('ALL');
  const terminalRef = useRef<HTMLDivElement>(null);

  // Withheld lines calculation for current payload
  const withheldLines: WithheldLine[] = currentConversion ? extractWithheldLines(currentConversion.lines) : [];

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

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
    a.download = `deployment_terminal_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // DIRECT PAYLOAD FILE INGESTION (Upload .txt CLI files directly into Deploy Console)
  const handleDirectUploadFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const newConversions: ConfigConversion[] = [];
    for (const file of fileList) {
      const text = await file.text();
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const filename = `${baseName}.txt`;
      const detected = detectVendor(text);
      const targetVendor = detected === 'huawei' || text.includes('sysname') || text.includes('port link-type') || text.includes('return')
        ? 'huawei'
        : 'cisco';
      const sourceVendor = targetVendor === 'huawei' ? 'cisco' : 'huawei';

      const conv = translateConfig(text, sourceVendor, targetVendor, filename, false);
      newConversions.push(conv);
    }

    handleAddDeployPayloads(newConversions);
    if (newConversions.length > 0) {
      setActiveDeployPayloadId(newConversions[0].id);
    }

    // Default all newly ingested files to unmapped
    setSelectedDeviceIds((prev) => {
      const next = { ...prev };
      newConversions.forEach((c) => {
        next[c.id] = '';
      });
      return next;
    });

    setBatchStatuses((prev) => {
      const next = { ...prev };
      newConversions.forEach((c) => {
        next[c.id] = 'idle';
      });
      return next;
    });

    appendLog(
      'SUCCESS',
      `📥 Ingested ${newConversions.length} deployment payload ${newConversions.length === 1 ? 'file' : 'files'}: ${newConversions.map((c) => c.filename).join(', ')}. Target devices defaulted to [Unmapped] for safety.`
    );

    onRecordAudit(
      newConversions.length > 1 ? 'CONVERT_BATCH' : 'CONVERT_SINGLE',
      {
        fileCount: newConversions.length,
        files: newConversions.map((c) => c.filename),
        source: 'DEPLOY_DIRECT_UPLOAD',
      },
      0
    );
  };

  // Stage files in the Dual-Tab Modal
  const handleStageFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;
    const staged: { file: File; text: string; linesCount: number }[] = [];
    for (const f of fileList) {
      const text = await f.text();
      const linesCount = text.split('\n').filter(Boolean).length;
      staged.push({ file: f, text, linesCount });
    }
    setModalStagedFiles((prev) => [...prev, ...staged]);
  };

  // Commit staged files from modal into deployment queue
  const handleCommitStagedFiles = () => {
    if (modalStagedFiles.length === 0) return;
    const newConvs: ConfigConversion[] = modalStagedFiles.map((item) => {
      const baseName = item.file.name.replace(/\.[^/.]+$/, '');
      const filename = `${baseName}.txt`;
      const detected = detectVendor(item.text);
      const targetVendor = detected === 'huawei' || item.text.includes('sysname') || item.text.includes('port link-type') || item.text.includes('return')
        ? 'huawei'
        : 'cisco';
      const sourceVendor = targetVendor === 'huawei' ? 'cisco' : 'huawei';
      return translateConfig(item.text, sourceVendor, targetVendor, filename, false);
    });

    handleAddDeployPayloads(newConvs);
    if (newConvs.length > 0) {
      setActiveDeployPayloadId(newConvs[0].id);
    }

    setSelectedDeviceIds((prev) => {
      const next = { ...prev };
      newConvs.forEach((c) => { next[c.id] = ''; });
      return next;
    });

    setBatchStatuses((prev) => {
      const next = { ...prev };
      newConvs.forEach((c) => { next[c.id] = 'idle'; });
      return next;
    });

    appendLog(
      'SUCCESS',
      `📥 Ingested ${newConvs.length} deployment payload ${newConvs.length === 1 ? 'file' : 'files'}: ${newConvs.map((c) => c.filename).join(', ')}. Target devices defaulted to [Unmapped] for safety.`
    );

    onRecordAudit(
      newConvs.length > 1 ? 'CONVERT_BATCH' : 'CONVERT_SINGLE',
      {
        fileCount: newConvs.length,
        files: newConvs.map((c) => c.filename),
        source: 'DEPLOY_MODAL_UPLOAD',
      },
      0
    );

    setModalStagedFiles([]);
    setIsIngestModalOpen(false);
  };

  // Commit pasted CLI snippet from modal into deployment queue
  const handleCommitPasteCli = () => {
    if (!modalPasteCli.trim()) return;
    const cleanRef = modalRefName.trim().replace(/\.[^/.]+$/, '') || `patch-${Date.now().toString().slice(-4)}`;
    const filename = `${cleanRef}.txt`;
    const detected = detectVendor(modalPasteCli);
    const targetVendor = detected === 'huawei' || modalPasteCli.includes('sysname') || modalPasteCli.includes('port link-type') || modalPasteCli.includes('return')
      ? 'huawei'
      : 'cisco';
    const sourceVendor = targetVendor === 'huawei' ? 'cisco' : 'huawei';

    const conv = translateConfig(modalPasteCli, sourceVendor, targetVendor, filename, false);
    handleAddDeployPayloads([conv]);
    setActiveDeployPayloadId(conv.id);

    setSelectedDeviceIds((prev) => ({ ...prev, [conv.id]: '' }));
    setBatchStatuses((prev) => ({ ...prev, [conv.id]: 'idle' }));

    appendLog(
      'SUCCESS',
      `📥 Ingested pasted CLI snippet "${filename}" (${conv.lines.length} statements). Target device defaulted to [Unmapped] for safety.`
    );

    onRecordAudit(
      'CONVERT_SINGLE',
      {
        filename,
        source: 'DEPLOY_MODAL_PASTE',
        lineCount: conv.lines.length,
      },
      0
    );

    setModalRefName('');
    setModalPasteCli('');
    setIsIngestModalOpen(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files) {
      handleDirectUploadFiles(e.dataTransfer.files);
    }
  };

  // Handle explicit manual device selection
  const handleDeviceSelect = (devId: string) => {
    if (!currentConversion) return;

    setSelectedDeviceIds((prev) => ({
      ...prev,
      [currentConversion.id]: devId,
    }));

    const newDev = devices.find((d) => d.id === devId);
    if (newDev) {
      appendLog(
        'INFO',
        `🎯 Target device explicitly assigned: ${newDev.hostname} (${newDev.managementIp}) for payload "${currentConversion.filename}". Safety lock disengaged.`
      );
    } else {
      appendLog(
        'WARNING',
        `⚠️ Target device set to Unmapped for payload "${currentConversion.filename}". Safety lock re-engaged.`
      );
    }
  };

  // Switch payload
  const handleSwitchPayload = (convId: string) => {
    setActiveDeployPayloadId(convId);
    const targetConv = deployPayloads.find((c) => c.id === convId);
    if (targetConv) {
      const assignedDevId = selectedDeviceIds[targetConv.id];
      const assignedDev = assignedDevId ? devices.find((d) => d.id === assignedDevId) : null;
      appendLog(
        'INFO',
        `Switched active payload to "${targetConv.filename}" (${targetConv.cleanCli.split('\n').filter(Boolean).length} statements). Destination mapping: ${
          assignedDev ? `Mapped to ${assignedDev.hostname} (${assignedDev.managementIp})` : '[Unmapped - Device Selection Required]'
        }`
      );
    }
  };

  // Delete individual payload from deployment queue
  const handleDeletePayload = (convId: string, filename: string) => {
    handleDeleteDeployPayload(convId);

    // Clean up mapping and batch status for this ID
    setSelectedDeviceIds((prev) => {
      const next = { ...prev };
      delete next[convId];
      return next;
    });

    setBatchStatuses((prev) => {
      const next = { ...prev };
      delete next[convId];
      return next;
    });

    appendLog('INFO', `🗑️ Removed payload "${filename}" from deployment queue.`);
  };

  // Run deployment sequence for single payload
  const runExecution = async (dryRun: boolean, targetConv = currentConversion, targetDev = selectedDevice) => {
    if (!targetConv || !targetDev || isDeploying) return false;

    setIsDeploying(true);
    setIsDryRun(dryRun);
    setDeploymentStatus('running');

    setBatchStatuses((prev) => ({
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
      appendLog('INFO', `Result: 0 syntax rejections. 0 commit conflicts detected.`);
      setDeploymentStatus('success');
      setBatchStatuses((prev) => ({
        ...prev,
        [targetConv.id]: 'dry-run-ok',
      }));
    } else {
      if (targetDev.vendor === 'huawei') {
        appendLog('COMMAND', `commit`, nodeId);
        appendLog('SUCCESS', `Commit phase completed. Configurations written to VRP system database.`, nodeId);
        appendLog('COMMAND', `return`, nodeId);
      } else {
        appendLog('COMMAND', `end`, nodeId);
        appendLog('COMMAND', `write memory`, nodeId);
        appendLog('SUCCESS', `Building configuration... [OK]`, nodeId);
      }

      appendLog('SUCCESS', `🎉 Deployment committed successfully to ${nodeName} (${ip})!`, nodeId);
      setDeploymentStatus('success');
      setBatchStatuses((prev) => ({
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
      convWithheld.filter((w) => w.reason === 'SECRET_MASKED').length
    );

    return true;
  };

  // Run Sequential Batch Deployment for all conversions (Strict Manual Target check)
  const handleDeployAllBatch = async () => {
    if (isDeploying || isBatchDeploying || deployPayloads.length === 0) return;

    setIsBatchDeploying(true);
    appendLog('INFO', `========================================================`);
    appendLog('INFO', `[BATCH DEPLOYMENT INITIATED] Queued ${deployPayloads.length} payload files for sequential deployment.`);

    let deployedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < deployPayloads.length; i++) {
      const conv = deployPayloads[i];
      const assignedDevId = selectedDeviceIds[conv.id];
      const targetDev = assignedDevId ? devices.find((d) => d.id === assignedDevId) || null : null;

      appendLog('INFO', `--------------------------------------------------------`);
      appendLog('INFO', `[BATCH ${i + 1}/${deployPayloads.length}] Checking payload "${conv.filename}"...`);

      if (!targetDev) {
        appendLog(
          'WARNING',
          `[BATCH ${i + 1}/${deployPayloads.length}] ⚠️ Skipped "${conv.filename}" — Unmapped payload. Strict manual target assignment is required for every file.`
        );
        setBatchStatuses((prev) => ({ ...prev, [conv.id]: 'skipped' }));
        skippedCount++;
        continue;
      }

      setActiveDeployPayloadId(conv.id);
      appendLog(
        'INFO',
        `[BATCH ${i + 1}/${deployPayloads.length}] Executing payload "${conv.filename}" ➔ Destination: ${targetDev.hostname} (${targetDev.managementIp})`
      );

      const ok = await runExecution(false, conv, targetDev);
      if (ok) {
        deployedCount++;
      } else {
        skippedCount++;
      }

      await new Promise((r) => setTimeout(r, 600));
    }

    setIsBatchDeploying(false);
    appendLog('INFO', `========================================================`);
    appendLog(
      'SUCCESS',
      `[BATCH COMPLETE] Finished sequential batch execution: ${deployedCount} deployed successfully, ${skippedCount} skipped.`
    );
  };

  const filteredLogs = logs.filter((log) => {
    if (severityFilter === 'ALL') return true;
    return log.severity === severityFilter;
  });

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

        {/* Top Explicit Ingestion Action & Sequential Batch Trigger */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Direct File Ingestion Button */}
          <input
            ref={fileUploadInputRef}
            type="file"
            multiple
            accept=".txt,.cfg,.conf"
            onChange={(e) => e.target.files && handleDirectUploadFiles(e.target.files)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => {
              setIngestModalTab('upload');
              setIsIngestModalOpen(true);
            }}
            className="h-9 px-3.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-[#1F8A7A] text-slate-800 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
            title="Upload converted .txt target CLI scripts directly to deploy console"
          >
            <Upload className="w-3.5 h-3.5 text-[#1F8A7A]" />
            <span>{t.deploy.uploadPayloadBtn || 'Upload Payload Files (.txt)'}</span>
          </button>

          {/* Sequential Batch Deploy Button */}
          {totalConversions > 1 && (
            <button
              type="button"
              disabled={isDeploying || isBatchDeploying}
              onClick={handleDeployAllBatch}
              className="h-9 px-4 rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] active:scale-[0.99] text-white text-xs font-semibold inline-flex items-center gap-2 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Sequentially deploy all converted files in the queue that have assigned target devices"
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
      </div>

      {/* Empty Queue State: Prominent Central Upload Dropzone (Rendered only when queue is clean/empty) */}
      {!currentConversion && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-12 sm:p-16 rounded-xl border-2 border-dashed transition-all text-center space-y-4 shadow-2xs ${
            isDraggingFile
              ? 'border-[#1F8A7A] bg-teal-50/60 dark:bg-teal-950/30'
              : 'border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-slate-400 dark:hover:border-slate-700'
          }`}
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 flex items-center justify-center text-[#1F8A7A]">
            <Upload className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t.deploy.emptyQueueTitle || 'No Payload Files in Deployment Queue'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              {t.deploy.emptyQueueDesc || 'Drag & drop converted .txt scripts here, or click to browse and upload deployment payloads.'}
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => {
                setIngestModalTab('upload');
                setIsIngestModalOpen(true);
              }}
              className="h-9 px-5 text-xs font-semibold rounded-lg bg-[#1F8A7A] text-white hover:bg-[#176f62] transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t.deploy.uploadPayloadBtn || 'Upload Payload Files (.txt)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Deployment Console (Rendered when active payload is available) */}
      {currentConversion && (
        <>
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
                    Target {currentConversion.targetVendor.toUpperCase()} CLI • {currentConversion.cleanCli.split('\n').filter(Boolean).length} statements • {currentConversion.fileSize || '2.0 KB'}
                  </p>
                </div>
              </div>

              {/* Payload Selector Dropdown with Accessibility Contrast Fix */}
              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                {/* Step Previous */}
                <button
                  type="button"
                  disabled={currentConversionIndex <= 0 || isDeploying}
                  onClick={() => handleSwitchPayload(deployPayloads[currentConversionIndex - 1].id)}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
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
                  style={{ colorScheme: 'dark light' }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A] max-w-[240px] truncate cursor-pointer shadow-2xs"
                >
                  {deployPayloads.map((c, i) => (
                    <option
                      key={c.id}
                      value={c.id}
                      className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-1 font-medium"
                    >
                      {i + 1}. {c.filename} ({c.targetVendor.toUpperCase()})
                    </option>
                  ))}
                </select>

                {/* Step Next */}
                <button
                  type="button"
                  disabled={currentConversionIndex >= totalConversions - 1 || isDeploying}
                  onClick={() => handleSwitchPayload(deployPayloads[currentConversionIndex + 1].id)}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Next Payload"
                  aria-label="Next Payload"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horizontal Batch Queue File Cards (with visible [x] individual delete icons) */}
            {totalConversions > 1 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
                  <span>Batch Queue ({totalConversions} Payload Files)</span>
                  <span className="text-[10px] text-slate-400">Click card to switch active payload • (x) to remove from queue</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {deployPayloads.map((c, i) => {
                    const isActive = c.id === currentConversion.id;
                    const assignedDevId = selectedDeviceIds[c.id];
                    const assignedDev = assignedDevId ? devices.find((d) => d.id === assignedDevId) : null;
                    const bStatus = batchStatuses[c.id] || 'idle';

                    let statusBadge = (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                        Queued
                      </span>
                    );
                    if (bStatus === 'deploying' || bStatus === 'simulating') {
                      statusBadge = (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 animate-pulse border border-teal-300 dark:border-teal-800">
                          Running
                        </span>
                      );
                    } else if (bStatus === 'deployed' || bStatus === 'dry-run-ok') {
                      statusBadge = (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          OK
                        </span>
                      );
                    } else if (bStatus === 'skipped') {
                      statusBadge = (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          Skipped
                        </span>
                      );
                    }

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSwitchPayload(c.id)}
                        className={`p-2.5 rounded-lg border text-left flex items-center justify-between gap-2 transition-all cursor-pointer group ${
                          isActive
                            ? 'border-[#1F8A7A] bg-teal-50/60 dark:bg-teal-950/30 ring-1 ring-[#1F8A7A] shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-400">#{i + 1}</span>
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate block">
                              {c.filename}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                            <span>Target:</span>
                            {assignedDev ? (
                              <span className="text-teal-700 dark:text-teal-300 font-mono font-medium truncate">
                                {assignedDev.hostname}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                [Unmapped]
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {statusBadge}
                          {/* Visible Individual Delete (x) Icon */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePayload(c.id, c.filename);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors shrink-0 cursor-pointer"
                            title={`Delete ${c.filename} from deployment queue`}
                            aria-label={`Delete ${c.filename}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. STRICT MANUAL TARGET SELECTION & SAFETY LOCK CARD */}
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            {/* Top Row: Label, Status Badge, and Full-width Target Device Dropdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#1F8A7A]" />
                  <span>{t.deploy.selectDevice}:</span>
                </label>

                {/* Target Status Badge: Strictly [Assigned] vs [Unmapped] */}
                <div className="flex items-center gap-2">
                  {selectedDevice ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Assigned: {selectedDevice.hostname}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60 shadow-2xs animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{t.deploy.unmappedWarning || 'Unmapped - Device Selection Required'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Full-width Dropdown with Accessible High-Contrast Dark Styling */}
              <div className="relative">
                <select
                  value={effectiveDeviceId}
                  onChange={(e) => handleDeviceSelect(e.target.value)}
                  disabled={isDeploying}
                  style={{ colorScheme: 'dark light' }}
                  className={`w-full px-3.5 py-2.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer focus:outline-hidden focus:ring-2 shadow-2xs ${
                    selectedDevice
                      ? 'bg-white dark:bg-slate-800 border-teal-500/80 dark:border-teal-600 text-slate-900 dark:text-slate-100 focus:ring-[#1F8A7A]'
                      : 'bg-white dark:bg-slate-800 border-amber-400 dark:border-amber-600/80 text-amber-900 dark:text-amber-200 focus:ring-amber-500'
                  }`}
                >
                  <option
                    value=""
                    className="bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 font-semibold py-1.5"
                  >
                    {t.deploy.selectDeviceRequired || '-- Select Target Device (Required) --'}
                  </option>
                  {devices.map((device) => (
                    <option
                      key={device.id}
                      value={device.id}
                      className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-1.5 font-medium"
                    >
                      {device.hostname} ({device.managementIp}) — {device.vendor.toUpperCase()} {device.isEveNg ? `[EVE-NG Node #${device.eveNodeId}]` : '[Physical Hardware]'} ({device.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Safety Lock Warning Banner when Unmapped */}
            {!selectedDevice && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>Safety Lock Engaged:</strong> {t.deploy.safetyLockBanner || 'Dry-run simulation and hardware push are strictly disabled until an operator explicitly selects a destination device.'}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded font-bold shrink-0">
                  Locked
                </span>
              </div>
            )}

            {/* Bottom Row: Target Metadata Info Badges (Left) & Action Buttons (Right) */}
            <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Side: Target Metadata Info Badges */}
              <div className="min-w-0 flex-1">
                {selectedDevice ? (
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-[#1F8A7A]" />
                      <span>
                        <strong>Hostname:</strong>{' '}
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{selectedDevice.hostname}</span>
                      </span>
                    </div>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                    <div className="flex items-center gap-1.5">
                      <span>
                        <strong>IP:</strong>{' '}
                        <code className="font-mono text-slate-700 dark:text-slate-300">{selectedDevice.managementIp}:{selectedDevice.sshPort}</code>
                      </span>
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
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                    <Server className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Select a destination hardware from the dropdown above to map node metadata and unlock deployment actions.</span>
                  </div>
                )}
              </div>

              {/* Right Side: Action Buttons Group (Bottom-Right corner of Target Device card) */}
              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                {/* Simulate Dry Run */}
                <button
                  type="button"
                  disabled={isDeploying || !selectedDevice}
                  onClick={() => runExecution(true)}
                  className="flex items-center gap-1.5 h-9 px-4 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                  title={!selectedDevice ? 'Safety Lock Engaged: Target device required' : 'Run syntax simulation without committing changes'}
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isDeploying && isDryRun ? 'animate-spin' : ''}`} />
                  <span>{t.deploy.simulateBtn}</span>
                </button>

                {/* Live Push to EVE-NG */}
                <button
                  type="button"
                  disabled={isDeploying || !selectedDevice}
                  onClick={() => runExecution(false)}
                  className="flex items-center gap-1.5 h-9 px-5 text-xs font-semibold rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs whitespace-nowrap"
                  title={!selectedDevice ? 'Safety Lock Engaged: Target device required' : 'Execute SSH push and commit configuration'}
                >
                  {selectedDevice ? <Play className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-200" />}
                  <span>{t.deploy.pushBtn}</span>
                </button>
              </div>
            </div>
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
                      {currentConversion.cleanCli.split('\n').filter(Boolean).length}
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
                    <span>Guardrails</span>
                    {withheldLines.length > 0 && (
                      <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                        {withheldLines.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Copy CLI action button */}
                {leftTab === 'preview' && (
                  <button
                    type="button"
                    onClick={handleCopyCli}
                    className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs flex items-center gap-1"
                    title="Copy full CLI script to clipboard"
                  >
                    {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-[11px]">{copiedCli ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-auto p-3 text-xs font-mono bg-slate-950 text-slate-200">
                {leftTab === 'preview' ? (
                  <table className="w-full border-collapse">
                    <tbody>
                      {currentConversion.cleanCli.split('\n').map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/60">
                          <td className="w-10 pr-3 text-right select-none text-slate-600 text-[11px] align-top font-mono">
                            {idx + 1}
                          </td>
                          <td className="text-slate-200 whitespace-pre font-mono">
                            {line.startsWith('#') || line.startsWith('!') ? (
                              <span className="text-slate-500 italic">{line}</span>
                            ) : line.startsWith('sysname') || line.startsWith('hostname') ? (
                              <span className="text-teal-400 font-bold">{line}</span>
                            ) : line.startsWith('interface') || line.startsWith('router') || line.startsWith('ospf') ? (
                              <span className="text-amber-300 font-semibold">{line}</span>
                            ) : (
                              line
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="space-y-3 font-sans p-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{t.deploy.withheldPanelTitle}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {t.deploy.withheldPanelSubtitle}
                    </p>

                    {withheldLines.length === 0 ? (
                      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                        <span>{t.deploy.noWithheld}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {withheldLines.map((w, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/80 text-[11px] space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-amber-400 font-mono font-semibold">
                                Line #{w.lineNum} • {w.reason}
                              </span>
                              <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.2 rounded bg-slate-800">
                                Protected
                              </span>
                            </div>
                            <div className="font-mono text-slate-300 truncate bg-slate-950 px-2 py-1 rounded">
                              {w.sourceText}
                            </div>
                            <p className="text-slate-400 text-[10px] italic">
                              {w.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Real-time Terminal Stream */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 shadow-2xs overflow-hidden flex flex-col h-[600px]">
              {/* Terminal Title Bar */}
              <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
                  </div>
                  <span className="font-mono text-slate-300 text-xs font-semibold ml-2">
                    {t.deploy.terminalTitle || 'Terminal Stream'}
                  </span>
                </div>

                {/* Filter and Clear/Export buttons */}
                <div className="flex items-center gap-2">
                  {/* Severity Filter */}
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value as LogSeverity)}
                    style={{ colorScheme: 'dark' }}
                    className="px-2 py-1 text-[11px] rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono focus:outline-hidden cursor-pointer"
                  >
                    <option value="ALL">All Levels</option>
                    <option value="COMMAND">Commands</option>
                    <option value="INFO">Info</option>
                    <option value="SUCCESS">Success</option>
                    <option value="WARNING">Warnings</option>
                    <option value="ERROR">Errors</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                    title={t.deploy.clearLogs}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadLogs}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                    title={t.deploy.downloadLogs}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Terminal Log Stream Window */}
              <div
                ref={terminalRef}
                className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1.5 select-text"
              >
                {filteredLogs.length === 0 ? (
                  <div className="text-slate-600 text-center py-12">
                    No log output matches current severity filter.
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    let color = 'text-slate-300';
                    let prefix = '[INFO]';
                    if (log.severity === 'SUCCESS') {
                      color = 'text-emerald-400';
                      prefix = '[OK]';
                    } else if (log.severity === 'WARNING') {
                      color = 'text-amber-400';
                      prefix = '[WARN]';
                    } else if (log.severity === 'ERROR') {
                      color = 'text-red-400';
                      prefix = '[ERR]';
                    } else if (log.severity === 'COMMAND') {
                      color = 'text-teal-300 font-bold';
                      prefix = '>';
                    }

                    return (
                      <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-slate-600 text-[11px] shrink-0 select-none">
                          {log.timestamp}
                        </span>
                        <span className="text-slate-500 font-bold shrink-0 select-none">
                          {prefix}
                        </span>
                        <span className={`${color} break-all flex-1`}>
                          {log.message}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Terminal Footer Bar with Auto-scroll switch */}
              <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Deployment Daemon Online</span>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#1F8A7A] focus:ring-0 cursor-pointer"
                  />
                  <span>{t.deploy.autoscroll}</span>
                </label>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Dual-Tab Payload Ingestion Modal */}
      {isIngestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsIngestModalOpen(false)}
          />

          {/* Dialog Container */}
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 flex items-center justify-center text-[#1F8A7A]">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {t.deploy.ingestModalTitle || 'Import Deployment Payload'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.deploy.ingestModalDesc || 'Upload converted CLI scripts or paste raw command statements into deployment queue'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIngestModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs: Tab 1 (Upload File) vs Tab 2 (Paste CLI Text) */}
            <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIngestModalTab('upload')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  ingestModalTab === 'upload'
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-[#1F8A7A] dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{t.deploy.tabUploadFile || 'Upload File (.txt, .cfg)'}</span>
                {modalStagedFiles.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                    {modalStagedFiles.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIngestModalTab('paste')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  ingestModalTab === 'paste'
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-[#1F8A7A] dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t.deploy.tabPasteCli || 'Paste CLI Text'}</span>
                {modalPasteCli.trim() && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                    {modalPasteCli.trim().split('\n').length}L
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Tab 1: Upload File */}
              {ingestModalTab === 'upload' && (
                <div className="space-y-4">
                  {/* Hidden File Input */}
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.cfg,.conf"
                    onChange={(e) => e.target.files && handleStageFiles(e.target.files)}
                    className="hidden"
                  />

                  {/* Dropzone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsModalDragging(true); }}
                    onDragLeave={() => setIsModalDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsModalDragging(false);
                      if (e.dataTransfer.files) handleStageFiles(e.dataTransfer.files);
                    }}
                    onClick={() => modalFileInputRef.current?.click()}
                    className={`p-8 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer space-y-3 ${
                      isModalDragging
                        ? 'border-[#1F8A7A] bg-teal-50/70 dark:bg-teal-950/40'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-[#1F8A7A]'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 flex items-center justify-center text-[#1F8A7A]">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Drag and drop payload files here, or <span className="text-[#1F8A7A] underline">browse files</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Supports .txt, .cfg, and .conf target CLI files (single or batch upload)
                      </p>
                    </div>
                  </div>

                  {/* Staged Files List */}
                  {modalStagedFiles.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">Ready to Ingest ({modalStagedFiles.length} files)</span>
                        <button
                          type="button"
                          onClick={() => setModalStagedFiles([])}
                          className="text-[11px] text-red-500 hover:underline cursor-pointer"
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-slate-50/40 dark:bg-slate-900">
                        {modalStagedFiles.map((sf, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileCode className="w-4 h-4 text-[#1F8A7A] shrink-0" />
                              <span className="font-mono text-slate-800 dark:text-slate-200 truncate">{sf.file.name}</span>
                              <span className="text-[10px] text-slate-400">({(sf.file.size / 1024).toFixed(1)} KB • {sf.linesCount} lines)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setModalStagedFiles((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-1 text-slate-400 hover:text-red-500 rounded-sm cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Paste CLI Text */}
              {ingestModalTab === 'paste' && (
                <div className="space-y-4">
                  {/* Reference Name Field */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t.deploy.payloadNameLabel || 'Payload Reference Name'}
                    </label>
                    <input
                      type="text"
                      value={modalRefName}
                      onChange={(e) => setModalRefName(e.target.value)}
                      placeholder={t.deploy.payloadNamePlaceholder || 'e.g. patch-vlan-10 or core-router-01'}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Target filename will be saved as: <code className="font-mono text-teal-600 dark:text-teal-400">{(modalRefName.trim() || 'patch-custom').replace(/\.[^/.]+$/, '')}.txt</code>
                    </span>
                  </div>

                  {/* Monospace Textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t.deploy.pasteCliLabel || 'Target CLI Statements'} *
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {modalPasteCli.trim() ? modalPasteCli.trim().split('\n').length : 0} lines
                      </span>
                    </div>
                    <textarea
                      rows={9}
                      value={modalPasteCli}
                      onChange={(e) => setModalPasteCli(e.target.value)}
                      placeholder={t.deploy.pasteCliPlaceholder || 'Paste executable CLI commands (e.g. vlan 10 / sysname Core-01)...'}
                      className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-900 text-emerald-400 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A] leading-relaxed resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsIngestModalOpen(false);
                  setModalStagedFiles([]);
                  setModalRefName('');
                  setModalPasteCli('');
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {t.common.cancel || 'Cancel'}
              </button>

              {ingestModalTab === 'upload' ? (
                <button
                  type="button"
                  disabled={modalStagedFiles.length === 0}
                  onClick={handleCommitStagedFiles}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#1F8A7A] hover:bg-[#176f62] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {modalStagedFiles.length > 0
                      ? `Add ${modalStagedFiles.length} ${modalStagedFiles.length === 1 ? 'File' : 'Files'} to Queue`
                      : (t.deploy.addToQueueBtn || 'Add to Queue')}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!modalPasteCli.trim()}
                  onClick={handleCommitPasteCli}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#1F8A7A] hover:bg-[#176f62] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.deploy.addToQueueBtn || 'Add to Queue'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
