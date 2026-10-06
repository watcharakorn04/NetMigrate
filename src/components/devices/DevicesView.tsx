import React, { useState, useRef } from 'react';
import {
  Server,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Cpu,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  AlertTriangle,
  HardDrive,
  Activity,
  Layers,
  ShieldCheck,
  Clock,
  Terminal,
  RefreshCw,
  ExternalLink,
  Zap,
  Radio,
  Sliders,
  ChevronRight,
  Info,
  FileText,
  FileCode,
  Upload,
  Copy,
  Download,
  Check,
} from 'lucide-react';
import { Device, Language, Vendor } from '../../types';
import { translations } from '../../locales/translations';

interface DevicesViewProps {
  devices: Device[];
  onAddDevice: (device: Device) => void;
  onUpdateDevice: (device: Device) => void;
  onDeleteDevice: (id: string) => void;
  language: Language;
}

interface ActivityLogItem {
  id: string;
  timestamp: string;
  type: 'PING' | 'DEPLOY' | 'SSH' | 'SYSTEM' | 'BACKUP';
  message: string;
  success: boolean;
}

export const DevicesView: React.FC<DevicesViewProps> = ({
  devices,
  onAddDevice,
  onUpdateDevice,
  onDeleteDevice,
  language,
}) => {
  const t = translations[language];

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<'all' | Vendor>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [envFilter, setEnvFilter] = useState<'all' | 'physical' | 'eveng'>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);

  // Form State
  const [formEnvType, setFormEnvType] = useState<'physical' | 'eveng'>('physical');
  const [formHostname, setFormHostname] = useState('');
  const [formManagementIp, setFormManagementIp] = useState('');
  const [formVendor, setFormVendor] = useState<string>(''); // Default empty for required selection
  const [formSshPort, setFormSshPort] = useState<number>(22);
  const [formCredentialProfile, setFormCredentialProfile] = useState('NetDevOps Core Vault');
  const [formSiteLocation, setFormSiteLocation] = useState('');
  const [formNetworkRole, setFormNetworkRole] = useState<'Core' | 'Distribution' | 'Access' | 'Edge' | 'Border' | 'Firewall'>('Access');
  const [formDescription, setFormDescription] = useState('');

  // Physical-specific form fields
  const [formRackUnit, setFormRackUnit] = useState('');
  const [formSerialNumber, setFormSerialNumber] = useState('');

  // EVE-NG specific form fields
  const [formEveServerUrl, setFormEveServerUrl] = useState('http://192.168.1.100');
  const [formEveLabName, setFormEveLabName] = useState('DC-Core-Migration.unl');
  const [formEveNodeId, setFormEveNodeId] = useState<number | ''>(1);
  const [formTelnetPort, setFormTelnetPort] = useState<number | ''>(32769);
  const [formQemuTemplate, setFormQemuTemplate] = useState('c1000v-universalk9-16.12');

  // Baseline / Running Config Backup form fields
  const [formBaselineConfig, setFormBaselineConfig] = useState('');
  const [formBaselineUpdatedAt, setFormBaselineUpdatedAt] = useState('');
  const [baselineInputMode, setBaselineInputMode] = useState<'upload' | 'paste'>('upload');
  const [isDraggingBaseline, setIsDraggingBaseline] = useState(false);
  const baselineFileInputRef = useRef<HTMLInputElement>(null);

  // Form Validation errors
  const [errors, setErrors] = useState<{
    hostname?: string;
    managementIp?: string;
    vendor?: string;
    eveNodeId?: string;
  }>({});

  // Slide-over Drawer State
  const [selectedDrawerDevice, setSelectedDrawerDevice] = useState<Device | null>(null);
  const [drawerTab, setDrawerTab] = useState<'profile' | 'baseline'>('profile');
  const [isTestingConnection, setIsTestingConnection] = useState<string | null>(null); // device ID being tested
  const [copiedBaseline, setCopiedBaseline] = useState(false);
  const drawerUploadVersionInputRef = useRef<HTMLInputElement>(null);

  // Safety Delete Confirmation Modal State
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  // Dynamic Activity Logs for Drawer
  const [deviceActivityLogs, setDeviceActivityLogs] = useState<Record<string, ActivityLogItem[]>>({
    'dev-001': [
      { id: 'log-1', timestamp: '2 mins ago', type: 'SSH', message: 'SSH handshake verified on 192.168.10.1:22 (RTT: 3ms)', success: true },
      { id: 'log-1b', timestamp: 'Oct 02, 2026', type: 'BACKUP', message: 'Running config baseline backup synchronized (28 statements)', success: true },
      { id: 'log-2', timestamp: 'Yesterday', type: 'DEPLOY', message: 'EVE-NG Node #3 config synchronized via REST API', success: true },
      { id: 'log-3', timestamp: '3 days ago', type: 'SYSTEM', message: 'Device provisioned in inventory', success: true },
    ],
    'dev-002': [
      { id: 'log-4', timestamp: '10 mins ago', type: 'PING', message: 'ICMP echo reply received (RTT: 12ms)', success: true },
      { id: 'log-4b', timestamp: 'Sep 28, 2026', type: 'BACKUP', message: 'VRP baseline running config archived (24 statements)', success: true },
      { id: 'log-5', timestamp: 'Oct 02, 2026', type: 'DEPLOY', message: 'Huawei VRP CE6800 template mapped to EVE Node #5', success: true },
    ],
    'dev-003': [
      { id: 'log-6', timestamp: '1 hour ago', type: 'SSH', message: 'SSH TCP connection established (RTT: 24ms)', success: true },
      { id: 'log-7', timestamp: 'Oct 01, 2026', type: 'SYSTEM', message: 'Hardware registered in Rack B-02, U14', success: true },
    ],
    'dev-004': [
      { id: 'log-8', timestamp: 'Yesterday', type: 'PING', message: 'Ping timeout: 172.16.4.15 unreachable on factory OT VLAN', success: false },
    ],
    'dev-005': [
      { id: 'log-9', timestamp: 'Just now', type: 'SSH', message: 'Border gateway loopback 192.168.10.254 reachable (RTT: 2ms)', success: true },
    ],
  });

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Open modal for Adding
  const handleOpenAdd = () => {
    setEditingDeviceId(null);
    setFormEnvType('physical');
    setFormHostname('');
    setFormManagementIp('');
    setFormVendor('');
    setFormSshPort(22);
    setFormCredentialProfile('NetDevOps Core Vault');
    setFormSiteLocation('');
    setFormNetworkRole('Access');
    setFormDescription('');
    setFormRackUnit('');
    setFormSerialNumber('');
    setFormEveServerUrl('http://192.168.1.100');
    setFormEveLabName('DC-Core-Migration.unl');
    setFormEveNodeId(1);
    setFormTelnetPort(32769);
    setFormQemuTemplate('c1000v-universalk9-16.12');
    setFormBaselineConfig('');
    setFormBaselineUpdatedAt('');
    setBaselineInputMode('upload');
    setErrors({});
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEdit = (dev: Device) => {
    setEditingDeviceId(dev.id);
    const isEve = dev.isEveNg || dev.environmentType === 'eveng';
    setFormEnvType(isEve ? 'eveng' : 'physical');
    setFormHostname(dev.hostname);
    setFormManagementIp(dev.managementIp);
    setFormVendor(dev.vendor);
    setFormSshPort(dev.sshPort || 22);
    setFormCredentialProfile(dev.credentialProfile || 'NetDevOps Core Vault');
    setFormSiteLocation(dev.siteLocation || '');
    setFormNetworkRole(dev.networkRole || 'Access');
    setFormDescription(dev.description || '');
    setFormRackUnit(dev.rackUnit || '');
    setFormSerialNumber(dev.serialNumber || '');
    setFormEveServerUrl(dev.eveServerUrl || 'http://192.168.1.100');
    setFormEveLabName(dev.eveLabName || 'DC-Core-Migration.unl');
    setFormEveNodeId(dev.eveNodeId || 1);
    setFormTelnetPort(dev.telnetPort || 32769);
    setFormQemuTemplate(dev.qemuTemplate || 'c1000v-universalk9-16.12');
    setFormBaselineConfig(dev.baselineConfig || '');
    setFormBaselineUpdatedAt(dev.baselineConfigUpdatedAt || '');
    setBaselineInputMode(dev.baselineConfig ? 'paste' : 'upload');
    setErrors({});
    setIsModalOpen(true);
  };

  // File Upload handler for baseline config in modal
  const handleBaselineFileUpload = async (files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;
    try {
      const text = await file.text();
      setFormBaselineConfig(text);
      setFormBaselineUpdatedAt(new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }));
      showToast(`Baseline config loaded: ${file.name} (${text.split('\n').length} lines)`);
    } catch {
      showToast('Failed to read config file');
    }
  };

  // Form Validation & Save
  const handleSaveDevice = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    // 1. Hostname validation
    if (!formHostname.trim()) {
      newErrors.hostname = t.devices.modal.hostnameRequired;
    }

    // 2. IPv4 Regex validation for Management IP
    const ipv4Regex = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!formManagementIp.trim() || !ipv4Regex.test(formManagementIp.trim())) {
      newErrors.managementIp = t.devices.modal.mgmtIpInvalid;
    } else {
      const parts = formManagementIp.trim().split('.').map(Number);
      if (parts.some((p) => p < 0 || p > 255)) {
        newErrors.managementIp = t.devices.modal.mgmtIpInvalid;
      }
    }

    // 3. Vendor validation (must be explicitly selected)
    if (!formVendor || (formVendor !== 'cisco' && formVendor !== 'huawei')) {
      newErrors.vendor = t.devices.modal.vendorRequired;
    }

    // 4. EVE-NG Node ID if EVE-NG selected
    if (formEnvType === 'eveng' && (formEveNodeId === '' || Number(formEveNodeId) <= 0)) {
      newErrors.eveNodeId = 'Node ID must be a positive integer';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const isEve = formEnvType === 'eveng';

    const deviceData: Device = {
      id: editingDeviceId || `dev-${Date.now()}`,
      hostname: formHostname.trim().toUpperCase(),
      managementIp: formManagementIp.trim(),
      vendor: formVendor as Vendor,
      sshPort: Number(formSshPort) || 22,
      credentialProfile: formCredentialProfile,
      environmentType: formEnvType,
      isEveNg: isEve,
      eveNodeId: isEve ? Number(formEveNodeId) || 1 : undefined,
      eveServerUrl: isEve ? formEveServerUrl.trim() : undefined,
      eveLabName: isEve ? formEveLabName.trim() : undefined,
      telnetPort: isEve && formTelnetPort !== '' ? Number(formTelnetPort) : undefined,
      qemuTemplate: isEve ? formQemuTemplate.trim() : undefined,
      rackUnit: !isEve ? formRackUnit.trim() : undefined,
      serialNumber: !isEve ? formSerialNumber.trim() : undefined,
      description: formDescription.trim(),
      siteLocation: formSiteLocation.trim() || (isEve ? 'Virtual Lab Cluster' : 'Central Datacenter'),
      networkRole: formNetworkRole,
      status: editingDeviceId ? (devices.find((d) => d.id === editingDeviceId)?.status || 'Online') : 'Online',
      lastTestedAt: editingDeviceId ? devices.find((d) => d.id === editingDeviceId)?.lastTestedAt : 'Just added',
      latencyMs: editingDeviceId ? devices.find((d) => d.id === editingDeviceId)?.latencyMs : 5,
      baselineConfig: formBaselineConfig.trim() || undefined,
      baselineConfigUpdatedAt: formBaselineConfig.trim() ? (formBaselineUpdatedAt || 'Just now') : undefined,
    };

    if (editingDeviceId) {
      onUpdateDevice(deviceData);
      showToast(t.devices.deviceUpdated);
      // Sync selected drawer device if it's currently open
      if (selectedDrawerDevice?.id === editingDeviceId) {
        setSelectedDrawerDevice(deviceData);
      }
    } else {
      onAddDevice(deviceData);
      showToast(t.devices.deviceAdded);
    }

    setIsModalOpen(false);
  };

  // Perform Live Connection Test
  const handleTestConnection = async (dev: Device) => {
    setIsTestingConnection(dev.id);

    // Simulate probe latency (800ms)
    await new Promise((resolve) => setTimeout(resolve, 800));

    const isSuccess = dev.status !== 'Offline' || Math.random() > 0.3;
    const latency = isSuccess ? Math.floor(Math.random() * 20) + 2 : 0;
    const newStatus: Device['status'] = isSuccess ? 'Online' : 'Unreachable';

    const updatedDev: Device = {
      ...dev,
      status: newStatus,
      lastTestedAt: 'Just now',
      latencyMs: latency,
    };

    onUpdateDevice(updatedDev);
    if (selectedDrawerDevice?.id === dev.id) {
      setSelectedDrawerDevice(updatedDev);
    }

    // Append to live activity log
    const logItem: ActivityLogItem = {
      id: `test-${Date.now()}`,
      timestamp: 'Just now',
      type: dev.isEveNg ? 'DEPLOY' : 'SSH',
      message: isSuccess
        ? `Probe successful: ${dev.managementIp}:${dev.sshPort} reachable via TCP handshake (RTT: ${latency}ms)`
        : `Connection failed: ${dev.managementIp}:${dev.sshPort} timed out after 3000ms`,
      success: isSuccess,
    };

    setDeviceActivityLogs((prev) => ({
      ...prev,
      [dev.id]: [logItem, ...(prev[dev.id] || [])].slice(0, 10),
    }));

    setIsTestingConnection(null);
    showToast(isSuccess ? `${dev.hostname}: ${t.devices.pingSuccess} (${latency}ms)` : `${dev.hostname}: ${t.devices.pingFailed}`);
  };

  // Copy Baseline Config to Clipboard
  const handleCopyBaseline = () => {
    if (selectedDrawerDevice?.baselineConfig) {
      navigator.clipboard.writeText(selectedDrawerDevice.baselineConfig);
      setCopiedBaseline(true);
      setTimeout(() => setCopiedBaseline(false), 2000);
      showToast('Baseline config copied to clipboard');
    }
  };

  // Download Baseline Config as .txt
  const handleDownloadBaseline = () => {
    if (!selectedDrawerDevice?.baselineConfig) return;
    const blob = new Blob([selectedDrawerDevice.baselineConfig], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedDrawerDevice.hostname.toLowerCase()}_baseline.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${selectedDrawerDevice.hostname.toLowerCase()}_baseline.txt`);
  };

  // Upload New Version directly from Detail Drawer
  const handleDrawerUploadNewVersion = async (files: FileList | File[]) => {
    if (!selectedDrawerDevice) return;
    const file = files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const updatedTimestamp = new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const updatedDev: Device = {
        ...selectedDrawerDevice,
        baselineConfig: text,
        baselineConfigUpdatedAt: updatedTimestamp,
      };

      onUpdateDevice(updatedDev);
      setSelectedDrawerDevice(updatedDev);

      // Log activity
      const logItem: ActivityLogItem = {
        id: `backup-${Date.now()}`,
        timestamp: 'Just now',
        type: 'BACKUP',
        message: `Updated baseline running config backup from ${file.name} (${text.split('\n').length} lines)`,
        success: true,
      };

      setDeviceActivityLogs((prev) => ({
        ...prev,
        [selectedDrawerDevice.id]: [logItem, ...(prev[selectedDrawerDevice.id] || [])].slice(0, 10),
      }));

      showToast(`Uploaded new baseline backup for ${selectedDrawerDevice.hostname}`);
    } catch {
      showToast('Failed to parse uploaded backup file');
    }
  };

  // Confirm Purge Device from Inventory
  const handleConfirmDelete = () => {
    if (!deviceToDelete) return;
    const id = deviceToDelete.id;
    onDeleteDevice(id);
    if (selectedDrawerDevice?.id === id) {
      setSelectedDrawerDevice(null);
    }
    setDeviceToDelete(null);
    showToast(t.devices.deviceDeleted);
  };

  // Filtered devices calculation
  const filteredDevices = devices.filter((d) => {
    const isEve = d.isEveNg || d.environmentType === 'eveng';
    const matchesSearch =
      d.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.managementIp.includes(searchQuery) ||
      (d.siteLocation && d.siteLocation.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.networkRole && d.networkRole.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.rackUnit && d.rackUnit.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.serialNumber && d.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesVendor = vendorFilter === 'all' || d.vendor === vendorFilter;
    const matchesRole = roleFilter === 'all' || d.networkRole === roleFilter;
    const matchesEnv =
      envFilter === 'all' ||
      (envFilter === 'eveng' && isEve) ||
      (envFilter === 'physical' && !isEve);

    return matchesSearch && matchesVendor && matchesRole && matchesEnv;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-bottom-3 border border-slate-700/50">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.devices.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t.devices.subtitle}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] active:scale-[0.99] text-white transition-all shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.devices.addDevice}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="relative md:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.devices.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
            />
          </div>

          {/* Environment Filter */}
          <div className="md:col-span-2">
            <select
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
            >
              <option value="all" className="bg-slate-800 text-slate-100">{t.devices.filterEnv || 'All Environments'}</option>
              <option value="physical" className="bg-slate-800 text-slate-100">{t.devices.envPhysical || 'Physical Hardware'}</option>
              <option value="eveng" className="bg-slate-800 text-slate-100">{t.devices.envVirtual || 'EVE-NG Virtual Node'}</option>
            </select>
          </div>

          {/* Vendor Filter */}
          <div className="md:col-span-2">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value as 'all' | Vendor)}
              className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
            >
              <option value="all" className="bg-slate-800 text-slate-100">{t.devices.filterVendor}</option>
              <option value="cisco" className="bg-slate-800 text-slate-100">Cisco IOS-XE</option>
              <option value="huawei" className="bg-slate-800 text-slate-100">Huawei VRP</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="md:col-span-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
            >
              <option value="all" className="bg-slate-800 text-slate-100">{t.devices.filterRole}</option>
              <option value="Core" className="bg-slate-800 text-slate-100">Core</option>
              <option value="Distribution" className="bg-slate-800 text-slate-100">Distribution</option>
              <option value="Access" className="bg-slate-800 text-slate-100">Access</option>
              <option value="Edge" className="bg-slate-800 text-slate-100">Edge</option>
              <option value="Border" className="bg-slate-800 text-slate-100">Border</option>
              <option value="Firewall" className="bg-slate-800 text-slate-100">Firewall</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredDevices.length}</strong> of{' '}
            <strong className="text-slate-800 dark:text-slate-200">{devices.length}</strong> devices
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
            Tip: Click any row to view slide-over device profile, health, and baseline config
          </span>
        </div>
      </div>

      {/* Responsive Devices Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">{t.devices.tableHostname}</th>
                <th className="px-4 py-3">{t.devices.tableIp}</th>
                <th className="px-4 py-3">{t.devices.tableVendor}</th>
                <th className="px-4 py-3">{t.devices.tableRole}</th>
                <th className="px-4 py-3">{t.devices.tableLocation}</th>
                <th className="px-4 py-3">{t.devices.tableEnvironmentNode || 'ENVIRONMENT / NODE'}</th>
                <th className="px-4 py-3">{t.devices.tableStatus}</th>
                <th className="px-4 py-3 text-right">{t.devices.tableActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No devices match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => {
                  const isEve = dev.isEveNg || dev.environmentType === 'eveng';
                  const isTesting = isTestingConnection === dev.id;

                  return (
                    <tr
                      key={dev.id}
                      onClick={() => {
                        setSelectedDrawerDevice(dev);
                        setDrawerTab('profile');
                      }}
                      className={`hover:bg-teal-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                        selectedDrawerDevice?.id === dev.id ? 'bg-teal-50/60 dark:bg-slate-800/80' : ''
                      }`}
                    >
                      {/* Hostname */}
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isEve
                              ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-900'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {isEve ? <Cpu className="w-3.5 h-3.5" /> : <HardDrive className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-slate-900 dark:text-slate-100 block">
                                {dev.hostname}
                              </span>
                              {dev.baselineConfig && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono bg-teal-50 dark:bg-teal-950/60 text-[#1F8A7A] dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60" title="Baseline config stored">
                                  CFG
                                </span>
                              )}
                            </div>
                            {dev.description && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[180px] block">
                                {dev.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Management IP */}
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span>{dev.managementIp}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">:{dev.sshPort || 22}</span>
                        </div>
                      </td>

                      {/* Vendor OS */}
                      <td className="px-4 py-3 font-medium">
                        {dev.vendor === 'cisco' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50">
                            Cisco IOS-XE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50">
                            Huawei VRP
                          </span>
                        )}
                      </td>

                      {/* Network Role */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {dev.networkRole}
                        </span>
                      </td>

                      {/* Site Location */}
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                        {dev.siteLocation || 'Central DC'}
                      </td>

                      {/* Environment / Node Badging (Physical vs EVE-NG) */}
                      <td className="px-4 py-3">
                        {isEve ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                            <Cpu className="w-3 h-3" />
                            <span>EVE Node #{dev.eveNodeId || 1}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <Server className="w-3 h-3 text-slate-400" />
                            <span>{dev.rackUnit ? dev.rackUnit.split(',')[0] : 'Physical'}</span>
                          </span>
                        )}
                      </td>

                      {/* Live Status Indicator */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-medium">
                          {isTesting ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-teal-600 dark:text-teal-400" />
                          ) : (
                            <span
                              className={`w-2 h-2 rounded-full ${
                                dev.status === 'Online'
                                  ? 'bg-emerald-500 animate-pulse'
                                  : dev.status === 'Unreachable'
                                  ? 'bg-amber-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                          )}
                          <span
                            className={
                              dev.status === 'Online'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : dev.status === 'Unreachable'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }
                          >
                            {isTesting ? 'Pinging...' : dev.status}
                          </span>
                          {dev.latencyMs && dev.status === 'Online' && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              ({dev.latencyMs}ms)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quick Action Icons: Edit, Test Ping, Delete */}
                      <td className="px-4 py-3 text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Live Test Ping Action */}
                          <button
                            type="button"
                            disabled={isTesting}
                            onClick={() => handleTestConnection(dev)}
                            className="p-1.5 rounded-md hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                            title={t.devices.testPing || 'Test Ping / Live Reachability'}
                          >
                            <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-bounce text-teal-500' : ''}`} />
                          </button>

                          {/* Edit Action */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(dev)}
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title={t.common.edit}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Action (opens safety modal) */}
                          <button
                            type="button"
                            onClick={() => setDeviceToDelete(dev)}
                            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title={t.common.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Device Detail Drawer (Right-Hand Slide Panel with Tabs) */}
      {selectedDrawerDevice && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedDrawerDevice(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    selectedDrawerDevice.isEveNg || selectedDrawerDevice.environmentType === 'eveng'
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-[#1F8A7A] border border-teal-200 dark:border-teal-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}>
                    {selectedDrawerDevice.isEveNg || selectedDrawerDevice.environmentType === 'eveng' ? (
                      <Cpu className="w-4 h-4" />
                    ) : (
                      <Server className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                      {selectedDrawerDevice.hostname}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {selectedDrawerDevice.vendor === 'cisco' ? 'Cisco IOS-XE' : 'Huawei VRP'}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {selectedDrawerDevice.networkRole}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDrawerDevice(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Top Navigation Sub-Tabs: Profile vs Baseline Config */}
              <div className="px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDrawerTab('profile')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    drawerTab === 'profile'
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-[#1F8A7A] dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{t.devices.profileTab || 'Profile & Health'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerTab('baseline')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    drawerTab === 'baseline'
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-[#1F8A7A] dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t.devices.baselineTab || 'Baseline Config'}</span>
                  {selectedDrawerDevice.baselineConfig ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                      {selectedDrawerDevice.baselineConfig.split('\n').length}L
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                      Empty
                    </span>
                  )}
                </button>
              </div>

              {/* Drawer Body Tab 1: Profile & Diagnostics */}
              {drawerTab === 'profile' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                  {/* Health & Live Status Card */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Operational Health
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          selectedDrawerDevice.status === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`} />
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {selectedDrawerDevice.status}
                        </span>
                        {selectedDrawerDevice.latencyMs ? (
                          <span className="text-[11px] text-slate-400">({selectedDrawerDevice.latencyMs}ms)</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Last Health Probe</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {selectedDrawerDevice.lastTestedAt || 'Just now'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Response Latency</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {selectedDrawerDevice.latencyMs ? `${selectedDrawerDevice.latencyMs} ms` : 'N/A (Offline)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Environment Architecture */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-[#1F8A7A]" />
                      <span>Environment Architecture</span>
                    </h4>

                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Environment Type</span>
                        {selectedDrawerDevice.isEveNg || selectedDrawerDevice.environmentType === 'eveng' ? (
                          <span className="px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px]">
                            EVE-NG Virtual Node
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px]">
                            Physical Hardware
                          </span>
                        )}
                      </div>

                      {/* Environment-specific details */}
                      {selectedDrawerDevice.isEveNg || selectedDrawerDevice.environmentType === 'eveng' ? (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-400">EVE-NG Server:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {selectedDrawerDevice.eveServerUrl || 'http://192.168.1.100'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Lab Topology File:</span>
                            <span className="font-mono text-teal-600 dark:text-teal-400">
                              {selectedDrawerDevice.eveLabName || 'DC-Core-Migration.unl'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Node ID:</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              #{selectedDrawerDevice.eveNodeId || 1}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Console Telnet Port:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {selectedDrawerDevice.telnetPort || 32769}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">QEMU Template:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {selectedDrawerDevice.qemuTemplate || 'c1000v-universalk9-16.12'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Rack / Unit Location:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {selectedDrawerDevice.rackUnit || 'Rack A-04, U12'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Hardware Serial Number:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {selectedDrawerDevice.serialNumber || 'FTX2418B09K'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Network & Access Profile */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Radio className="w-3.5 h-3.5 text-[#1F8A7A]" />
                      <span>Network & Access Profile</span>
                    </h4>

                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Management IP:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {selectedDrawerDevice.managementIp}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">SSH Port:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {selectedDrawerDevice.sshPort || 22}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Credential Profile:</span>
                        <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          <span>{selectedDrawerDevice.credentialProfile || 'NetDevOps Core Vault'}</span>
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Site Location:</span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {selectedDrawerDevice.siteLocation || 'Central DC'}
                        </span>
                      </div>
                      {selectedDrawerDevice.description && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400 block mb-0.5">Operator Notes:</span>
                          <p className="text-slate-600 dark:text-slate-400 italic">
                            {selectedDrawerDevice.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 3: Diagnostic & Telemetry Activity Stream */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-[#1F8A7A]" />
                        <span>Live Diagnostic Stream</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Last 10 events</span>
                    </h4>

                    <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 space-y-2 font-mono text-[11px] max-h-48 overflow-y-auto">
                      {(deviceActivityLogs[selectedDrawerDevice.id] || [
                        { id: '1', timestamp: 'Just now', type: 'SSH', message: 'No prior diagnostic logs recorded', success: true }
                      ]).map((log) => (
                        <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-slate-500 text-[10px] shrink-0 mt-0.5">[{log.timestamp}]</span>
                          <span className={log.success ? 'text-emerald-400' : 'text-red-400'}>
                            {log.success ? '✓' : '✗'}
                          </span>
                          <span className="text-slate-300 break-words flex-1">
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Drawer Body Tab 2: Baseline Config Viewer */}
              {drawerTab === 'baseline' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs flex flex-col">
                  {/* Hidden Input for Upload New Version */}
                  <input
                    ref={drawerUploadVersionInputRef}
                    type="file"
                    accept=".txt,.cfg,.conf"
                    onChange={(e) => e.target.files && handleDrawerUploadNewVersion(e.target.files)}
                    className="hidden"
                  />

                  {/* Header Card with Clean Inline Status Badge and Upload New Version Button */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                      <div className="flex items-center gap-2 shrink-0">
                        <FileText className="w-4 h-4 text-[#1F8A7A]" />
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {t.devices.baselineConfigTitle || 'Baseline Config Backup'}
                        </span>
                      </div>
                      {selectedDrawerDevice.baselineConfigUpdatedAt ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-200/80 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-600/60 whitespace-nowrap">
                          <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                          <span>Updated {selectedDrawerDevice.baselineConfigUpdatedAt}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          No backup recorded
                        </span>
                      )}
                    </div>

                    {/* Primary Single Action: Upload New Version */}
                    <button
                      type="button"
                      onClick={() => drawerUploadVersionInputRef.current?.click()}
                      className="h-8 px-3 rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
                      title="Upload a newer baseline config backup file"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{t.devices.uploadNewVersion || 'Upload New Version'}</span>
                    </button>
                  </div>

                  {/* Dark Monospace Code Viewer with Code-Attached Action Toolbar */}
                  {selectedDrawerDevice.baselineConfig ? (
                    <div className="flex-1 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col min-h-[350px]">
                      {/* Code Viewer Toolbar: Filename on Left, Statements & Copy/Download on Right */}
                      <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 text-[11px] text-slate-400 flex-wrap sm:flex-nowrap">
                        {/* Left Side: Active Config Filename */}
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCode className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span
                            className="font-mono font-medium text-slate-200 text-xs truncate"
                            title={`${selectedDrawerDevice.hostname.toLowerCase()}_running_config.txt`}
                          >
                            {selectedDrawerDevice.hostname.toLowerCase()}_running_config.txt
                          </span>
                        </div>

                        {/* Right Side: Statement Count Badge and Compact Copy / Download Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700/80">
                            {selectedDrawerDevice.baselineConfig.split('\n').length} statements
                          </span>

                          <div className="h-3.5 w-px bg-slate-800" aria-hidden="true" />

                          {/* Copy CLI */}
                          <button
                            type="button"
                            onClick={handleCopyBaseline}
                            className="h-7 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Copy baseline CLI statements to clipboard"
                          >
                            {copiedBaseline ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-400" />
                                <span>{t.devices.copyCli || 'Copy CLI'}</span>
                              </>
                            )}
                          </button>

                          {/* Download (.txt) */}
                          <button
                            type="button"
                            onClick={handleDownloadBaseline}
                            className="h-7 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Download baseline script as .txt"
                          >
                            <Download className="w-3 h-3 text-slate-400" />
                            <span>{t.devices.downloadBaseline || 'Download (.txt)'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-auto p-3 font-mono text-xs text-slate-300">
                        <table className="w-full border-collapse">
                          <tbody>
                            {selectedDrawerDevice.baselineConfig.split('\n').map((line, idx) => (
                              <tr key={idx} className="hover:bg-slate-900/60">
                                <td className="w-10 pr-3 text-right select-none text-slate-600 text-[11px] align-top font-mono">
                                  {idx + 1}
                                </td>
                                <td className="text-slate-200 whitespace-pre font-mono">
                                  {line.startsWith('!') || line.startsWith('#') ? (
                                    <span className="text-slate-500 italic">{line}</span>
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
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-center space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          {t.devices.noBaselineConfig || 'No baseline configuration stored for this device yet.'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                          Upload the running-config backup or edit the device to paste the baseline statements.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => drawerUploadVersionInputRef.current?.click()}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] text-white transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{t.devices.uploadBaselineBtn || 'Upload Baseline Config (.txt, .cfg)'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Drawer Footer Actions */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => setDeviceToDelete(selectedDrawerDevice)}
                  className="px-3.5 py-2 rounded-lg border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.common.delete}</span>
                </button>

                <div className="flex items-center gap-2">
                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedDrawerDevice)}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{t.common.edit}</span>
                  </button>

                  {/* Test Connection Button */}
                  <button
                    type="button"
                    disabled={isTestingConnection === selectedDrawerDevice.id}
                    onClick={() => handleTestConnection(selectedDrawerDevice)}
                    className="px-4 py-2 rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] active:scale-[0.99] text-white text-xs font-semibold inline-flex items-center gap-2 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {isTestingConnection === selectedDrawerDevice.id ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{t.devices.testingConnection || 'Probing...'}</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>{t.devices.testConnection || 'Test Connection'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Device Modal with Physical vs EVE-NG Segmentation and Baseline Config Ingestion */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
              <div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                  {editingDeviceId ? t.devices.modal.titleEdit : t.devices.modal.titleAdd}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t.devices.modal.desc}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveDevice}>
              <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
                {/* 1. Environment Type Segmented Selector (Physical vs EVE-NG) */}
                <div>
                  <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-2">
                    {t.devices.modal.envType || 'Environment Architecture *'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormEnvType('physical')}
                      className={`p-3.5 rounded-xl border-2 flex items-center gap-3 text-left transition-all cursor-pointer ${
                        formEnvType === 'physical'
                          ? 'border-[#1F8A7A] bg-teal-50/50 dark:bg-teal-950/20 text-[#1F8A7A]'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        formEnvType === 'physical' ? 'bg-[#1F8A7A] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold block text-slate-900 dark:text-slate-100">
                          {t.devices.modal.physicalType || 'Physical Hardware'}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Bare-metal switch, router, or firewall rack unit
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormEnvType('eveng')}
                      className={`p-3.5 rounded-xl border-2 flex items-center gap-3 text-left transition-all cursor-pointer ${
                        formEnvType === 'eveng'
                          ? 'border-[#1F8A7A] bg-teal-50/50 dark:bg-teal-950/20 text-[#1F8A7A]'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        formEnvType === 'eveng' ? 'bg-[#1F8A7A] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold block text-slate-900 dark:text-slate-100">
                          {t.devices.modal.virtualType || 'EVE-NG Virtual Node'}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Emulated QEMU/IOL instance in EVE lab
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Common Device Identification Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Hostname */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t.devices.modal.hostname}
                    </label>
                    <input
                      type="text"
                      value={formHostname}
                      onChange={(e) => {
                        setFormHostname(e.target.value);
                        if (errors.hostname) setErrors((prev) => ({ ...prev, hostname: undefined }));
                      }}
                      placeholder={t.devices.modal.hostnamePlaceholder}
                      className={`w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden ${
                        errors.hostname
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-[#1F8A7A]'
                      }`}
                    />
                    {errors.hostname && (
                      <span className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.hostname}
                      </span>
                    )}
                  </div>

                  {/* Vendor OS (Required, Defaults to empty) */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t.devices.modal.vendor}
                    </label>
                    <select
                      value={formVendor}
                      onChange={(e) => {
                        setFormVendor(e.target.value);
                        if (errors.vendor) setErrors((prev) => ({ ...prev, vendor: undefined }));
                      }}
                      className={`w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-slate-100 focus:outline-hidden ${
                        errors.vendor
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-[#1F8A7A]'
                      }`}
                    >
                      <option value="" className="bg-slate-800 text-slate-100">{t.devices.modal.vendorSelect}</option>
                      <option value="cisco" className="bg-slate-800 text-slate-100">Cisco IOS-XE</option>
                      <option value="huawei" className="bg-slate-800 text-slate-100">Huawei VRP</option>
                    </select>
                    {errors.vendor && (
                      <span className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.vendor}
                      </span>
                    )}
                  </div>

                  {/* Network Role */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t.devices.modal.networkRole}
                    </label>
                    <select
                      value={formNetworkRole}
                      onChange={(e) => setFormNetworkRole(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                    >
                      <option value="Core" className="bg-slate-800 text-slate-100">Core</option>
                      <option value="Distribution" className="bg-slate-800 text-slate-100">Distribution</option>
                      <option value="Access" className="bg-slate-800 text-slate-100">Access</option>
                      <option value="Edge" className="bg-slate-800 text-slate-100">Edge</option>
                      <option value="Border" className="bg-slate-800 text-slate-100">Border</option>
                      <option value="Firewall" className="bg-slate-800 text-slate-100">Firewall</option>
                    </select>
                  </div>

                  {/* Site Location */}
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t.devices.modal.siteLocation}
                    </label>
                    <input
                      type="text"
                      value={formSiteLocation}
                      onChange={(e) => setFormSiteLocation(e.target.value)}
                      placeholder={t.devices.modal.sitePlaceholder}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                    />
                  </div>
                </div>

                {/* Dynamic Section: Physical Hardware Fields (Clean Symmetrical 2x2 Grid) */}
                {formEnvType === 'physical' && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700/80 pb-2">
                      <HardDrive className="w-4 h-4 text-[#1F8A7A]" />
                      <span>Physical Hardware Parameters</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Management IP */}
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          {t.devices.modal.mgmtIp}
                        </label>
                        <input
                          type="text"
                          value={formManagementIp}
                          onChange={(e) => {
                            setFormManagementIp(e.target.value);
                            if (errors.managementIp) setErrors((prev) => ({ ...prev, managementIp: undefined }));
                          }}
                          placeholder={t.devices.modal.mgmtIpPlaceholder}
                          className={`w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden ${
                            errors.managementIp
                              ? 'border-red-500 ring-1 ring-red-500'
                              : 'border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-[#1F8A7A]'
                          }`}
                        />
                        {errors.managementIp && (
                          <span className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.managementIp}
                          </span>
                        )}
                      </div>

                      {/* SSH Port */}
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          {t.devices.modal.sshPort}
                        </label>
                        <input
                          type="number"
                          value={formSshPort}
                          onChange={(e) => setFormSshPort(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                        />
                      </div>

                      {/* Rack / Unit Location */}
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          {t.devices.modal.rackUnit || 'Rack / Unit Location'}
                        </label>
                        <input
                          type="text"
                          value={formRackUnit}
                          onChange={(e) => setFormRackUnit(e.target.value)}
                          placeholder={t.devices.modal.rackUnitPlaceholder || 'e.g. Rack A-04, U12'}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                        />
                      </div>

                      {/* Hardware Serial Number */}
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          {t.devices.modal.serialNumber || 'Hardware Serial Number'}
                        </label>
                        <input
                          type="text"
                          value={formSerialNumber}
                          onChange={(e) => setFormSerialNumber(e.target.value)}
                          placeholder={t.devices.modal.serialNumberPlaceholder || 'e.g. FCW2145A88X'}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Dynamic Section: EVE-NG Virtual Node Fields */}
                {formEnvType === 'eveng' && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-teal-50/30 dark:bg-teal-950/20 space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-semibold border-b border-teal-200 dark:border-teal-900 pb-2">
                      <Cpu className="w-4 h-4 text-[#1F8A7A]" />
                      <span>EVE-NG Virtual Node Parameters</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* EVE-NG Server IP / URL */}
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          {t.devices.modal.eveServerUrl || 'EVE-NG Server IP / URL'}
                        </label>
                        <input
                          type="text"
                          value={formEveServerUrl}
                          onChange={(e) => setFormEveServerUrl(e.target.value)}
                          placeholder={t.devices.modal.eveServerUrlPlaceholder || 'e.g. http://192.168.1.100'}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                        />
                      </div>

                      {/* Lab File Name / UUID */}
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          {t.devices.modal.eveLabName || 'Lab File Name / UUID'}
                        </label>
                        <input
                          type="text"
                          value={formEveLabName}
                          onChange={(e) => setFormEveLabName(e.target.value)}
                          placeholder={t.devices.modal.eveLabNamePlaceholder || 'e.g. DC-Core-Migration.unl'}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                        />
                      </div>

                      {/* EVE Node ID (Required) */}
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          {t.devices.modal.eveNodeId}
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={formEveNodeId}
                          onChange={(e) => {
                            setFormEveNodeId(e.target.value === '' ? '' : Number(e.target.value));
                            if (errors.eveNodeId) setErrors((prev) => ({ ...prev, eveNodeId: undefined }));
                          }}
                          placeholder="e.g. 3"
                          className={`w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden ${
                            errors.eveNodeId
                              ? 'border-red-500 ring-1 ring-red-500'
                              : 'border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-[#1F8A7A]'
                          }`}
                        />
                        {errors.eveNodeId && (
                          <span className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.eveNodeId}
                          </span>
                        )}
                      </div>

                      {/* Console Telnet Port */}
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          {t.devices.modal.telnetPort || 'Console Telnet Port'}
                        </label>
                        <input
                          type="number"
                          value={formTelnetPort}
                          onChange={(e) => setFormTelnetPort(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="e.g. 32769"
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                        />
                      </div>

                      {/* QEMU Image Template */}
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          {t.devices.modal.qemuTemplate || 'QEMU Image Template'}
                        </label>
                        <input
                          type="text"
                          value={formQemuTemplate}
                          onChange={(e) => setFormQemuTemplate(e.target.value)}
                          placeholder={t.devices.modal.qemuTemplatePlaceholder || 'e.g. c1000v-universalk9-16.12'}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                        />
                      </div>

                      {/* Virtual Node Management IP */}
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          {t.devices.modal.mgmtIp}
                        </label>
                        <input
                          type="text"
                          value={formManagementIp}
                          onChange={(e) => {
                            setFormManagementIp(e.target.value);
                            if (errors.managementIp) setErrors((prev) => ({ ...prev, managementIp: undefined }));
                          }}
                          placeholder={t.devices.modal.mgmtIpPlaceholder}
                          className={`w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden ${
                            errors.managementIp
                              ? 'border-red-500 ring-1 ring-red-500'
                              : 'border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-[#1F8A7A]'
                          }`}
                        />
                        {errors.managementIp && (
                          <span className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.managementIp}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Description & Operator Notes */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.devices.modal.description || 'Description & Notes'}
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder={t.devices.modal.descriptionPlaceholder || 'e.g. Primary Core Switch in DC Zone A'}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                  />
                </div>

                {/* Baseline / Running Config Backup (.txt, .cfg) (Optional) */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#1F8A7A]" />
                      <span>{t.devices.modal.baselineConfigLabel || 'Baseline / Running Config Backup (.txt, .cfg) (Optional)'}</span>
                    </label>
                    {formBaselineConfig && (
                      <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                        {formBaselineConfig.split('\n').length} lines ({(formBaselineConfig.length / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>

                  {/* Mode Tabs: Upload File vs Paste CLI Text */}
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-2">
                    <button
                      type="button"
                      onClick={() => setBaselineInputMode('upload')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        baselineInputMode === 'upload'
                          ? 'bg-[#1F8A7A] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{t.devices.modal.baselineUploadTab || 'Upload File'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBaselineInputMode('paste')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        baselineInputMode === 'paste'
                          ? 'bg-[#1F8A7A] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>{t.devices.modal.baselinePasteTab || 'Paste CLI Text'}</span>
                    </button>
                    {formBaselineConfig && (
                      <button
                        type="button"
                        onClick={() => { setFormBaselineConfig(''); setFormBaselineUpdatedAt(''); }}
                        className="ml-auto text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Clear Config</span>
                      </button>
                    )}
                  </div>

                  {/* Mode 1: File Dropzone */}
                  {baselineInputMode === 'upload' && (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingBaseline(true); }}
                      onDragLeave={() => setIsDraggingBaseline(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingBaseline(false);
                        if (e.dataTransfer.files) handleBaselineFileUpload(e.dataTransfer.files);
                      }}
                      onClick={() => baselineFileInputRef.current?.click()}
                      className={`p-4 rounded-lg border-2 border-dashed text-center cursor-pointer transition-colors ${
                        isDraggingBaseline
                          ? 'border-[#1F8A7A] bg-teal-50 dark:bg-teal-950/20'
                          : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <input
                        ref={baselineFileInputRef}
                        type="file"
                        accept=".txt,.cfg,.conf"
                        onChange={(e) => e.target.files && handleBaselineFileUpload(e.target.files)}
                        className="hidden"
                      />
                      <Upload className="w-5 h-5 mx-auto text-slate-400 dark:text-slate-500 mb-1" />
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {formBaselineConfig ? 'Replace backup file (.txt, .cfg)' : (t.devices.modal.baselineFileDrop || 'Drop backup file here or click to browse')}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Supports Cisco IOS-XE (.cfg, .txt) and Huawei VRP (.cfg, .txt) running-config backups
                      </p>
                    </div>
                  )}

                  {/* Mode 2: Paste Raw CLI Text with line count */}
                  {baselineInputMode === 'paste' && (
                    <div className="space-y-1.5">
                      <textarea
                        rows={5}
                        value={formBaselineConfig}
                        onChange={(e) => {
                          setFormBaselineConfig(e.target.value);
                          setFormBaselineUpdatedAt(new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
                        }}
                        placeholder={t.devices.modal.baselinePastePlaceholder || 'Paste running configuration statements here (e.g. sysname SW-01 / hostname RT-01)...'}
                        className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                      />
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Line count: {formBaselineConfig ? formBaselineConfig.split('\n').length : 0} lines</span>
                        <span>{formBaselineConfig.length} characters</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {t.devices.modal.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] active:scale-[0.99] text-white transition-all shadow-2xs cursor-pointer"
                >
                  {t.devices.modal.saveBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal for Purging Device */}
      {deviceToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/80 border border-red-200 dark:border-red-900 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t.devices.confirmDeleteTitle || 'Confirm Purge Device'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently remove{' '}
              <strong className="font-mono text-slate-900 dark:text-slate-100">
                {deviceToDelete.hostname}
              </strong>{' '}
              ({deviceToDelete.managementIp}) from the fleet inventory? All associated credentials and lab mappings will be unlinked.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeviceToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {t.devices.modal.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge Device</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
