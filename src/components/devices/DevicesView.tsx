import React, { useState } from 'react';
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
  AlertCircle
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

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);

  // Modal Form State
  const [formHostname, setFormHostname] = useState('');
  const [formManagementIp, setFormManagementIp] = useState('');
  const [formVendor, setFormVendor] = useState<string>(''); // Default empty for required selection
  const [formSshPort, setFormSshPort] = useState<number>(22);
  const [formCredentialProfile, setFormCredentialProfile] = useState('NetDevOps Core Vault');
  const [formIsEveNg, setFormIsEveNg] = useState(false);
  const [formEveNodeId, setFormEveNodeId] = useState<number | ''>(1);
  const [formSiteLocation, setFormSiteLocation] = useState('');
  const [formNetworkRole, setFormNetworkRole] = useState<'Core' | 'Distribution' | 'Access' | 'Edge' | 'Border' | 'Firewall'>('Access');

  // Validation errors
  const [errors, setErrors] = useState<{
    hostname?: string;
    managementIp?: string;
    vendor?: string;
    eveNodeId?: string;
  }>({});

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Open modal for Adding
  const handleOpenAdd = () => {
    setEditingDeviceId(null);
    setFormHostname('');
    setFormManagementIp('');
    setFormVendor('');
    setFormSshPort(22);
    setFormCredentialProfile('NetDevOps Core Vault');
    setFormIsEveNg(false);
    setFormEveNodeId(1);
    setFormSiteLocation('');
    setFormNetworkRole('Access');
    setErrors({});
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEdit = (dev: Device) => {
    setEditingDeviceId(dev.id);
    setFormHostname(dev.hostname);
    setFormManagementIp(dev.managementIp);
    setFormVendor(dev.vendor);
    setFormSshPort(dev.sshPort);
    setFormCredentialProfile(dev.credentialProfile || 'NetDevOps Core Vault');
    setFormIsEveNg(dev.isEveNg);
    setFormEveNodeId(dev.eveNodeId || 1);
    setFormSiteLocation(dev.siteLocation);
    setFormNetworkRole(dev.networkRole);
    setErrors({});
    setIsModalOpen(true);
  };

  // Form Validation & Save
  const handleSaveDevice = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    // 1. Hostname validation
    if (!formHostname.trim()) {
      newErrors.hostname = t.devices.modal.hostnameRequired;
    }

    // 2. IPv4 Regex validation
    const ipv4Regex = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!formManagementIp.trim() || !ipv4Regex.test(formManagementIp.trim())) {
      newErrors.managementIp = t.devices.modal.mgmtIpInvalid;
    } else {
      // Check segment range 0-255
      const parts = formManagementIp.trim().split('.').map(Number);
      if (parts.some((p) => p < 0 || p > 255)) {
        newErrors.managementIp = t.devices.modal.mgmtIpInvalid;
      }
    }

    // 3. Vendor validation (must be explicitly selected)
    if (!formVendor || (formVendor !== 'cisco' && formVendor !== 'huawei')) {
      newErrors.vendor = t.devices.modal.vendorRequired;
    }

    // 4. EVE-NG Node ID if enabled
    if (formIsEveNg && (formEveNodeId === '' || formEveNodeId <= 0)) {
      newErrors.eveNodeId = 'Node ID must be a positive integer';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const deviceData: Device = {
      id: editingDeviceId || `dev-${Date.now()}`,
      hostname: formHostname.trim().toUpperCase(),
      managementIp: formManagementIp.trim(),
      vendor: formVendor as Vendor,
      sshPort: Number(formSshPort) || 22,
      credentialProfile: formCredentialProfile,
      isEveNg: formIsEveNg,
      eveNodeId: formIsEveNg ? Number(formEveNodeId) : undefined,
      siteLocation: formSiteLocation.trim() || 'Central Datacenter',
      networkRole: formNetworkRole,
      status: 'Online',
    };

    if (editingDeviceId) {
      onUpdateDevice(deviceData);
      showToast(t.devices.deviceUpdated);
    } else {
      onAddDevice(deviceData);
      showToast(t.devices.deviceAdded);
    }

    setIsModalOpen(false);
  };

  // Delete device
  const handleDelete = (id: string) => {
    if (window.confirm(t.devices.deleteConfirm)) {
      onDeleteDevice(id);
      showToast(t.devices.deviceDeleted);
    }
  };

  // Filtered devices
  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      d.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.managementIp.includes(searchQuery) ||
      d.siteLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.networkRole.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVendor = vendorFilter === 'all' || d.vendor === vendorFilter;
    const matchesRole = roleFilter === 'all' || d.networkRole === roleFilter;

    return matchesSearch && matchesVendor && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
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
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] text-white transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.devices.addDevice}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.devices.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
            />
          </div>

          {/* Vendor Filter */}
          <div className="flex items-center gap-2">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value as 'all' | Vendor)}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
            >
              <option value="all">{t.devices.filterVendor}</option>
              <option value="cisco">Cisco IOS-XE</option>
              <option value="huawei">Huawei VRP</option>
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
            >
              <option value="all">{t.devices.filterRole}</option>
              <option value="Core">Core</option>
              <option value="Distribution">Distribution</option>
              <option value="Access">Access</option>
              <option value="Edge">Edge</option>
              <option value="Border">Border</option>
              <option value="Firewall">Firewall</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing <strong>{filteredDevices.length}</strong> of <strong>{devices.length}</strong> devices
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
                <th className="px-4 py-3">{t.devices.tableEve}</th>
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
                filteredDevices.map((dev) => (
                  <tr
                    key={dev.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Hostname */}
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{dev.hostname}</span>
                      </div>
                    </td>

                    {/* Management IP */}
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                      {dev.managementIp}:{dev.sshPort}
                    </td>

                    {/* Vendor */}
                    <td className="px-4 py-3 font-medium">
                      {dev.vendor === 'cisco' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50">
                          Cisco IOS-XE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50">
                          Huawei VRP
                        </span>
                      )}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {dev.networkRole}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {dev.siteLocation}
                    </td>

                    {/* EVE-NG */}
                    <td className="px-4 py-3">
                      {dev.isEveNg ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#1F8A7A] dark:text-teal-400">
                          <Cpu className="w-3 h-3" />
                          <span>Node #{dev.eveNodeId}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Hardware</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            dev.status === 'Online' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span className={dev.status === 'Online' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
                          {dev.status}
                        </span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(dev)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                          title={t.common.edit}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(dev.id)}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 transition-colors"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Device Single Modal (2-Column Responsive Layout) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal 2-Column Form Body */}
            <form onSubmit={handleSaveDevice}>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Field 1: Hostname (Required) */}
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
                    <span className="text-[11px] text-red-500 mt-1 block flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.hostname}
                    </span>
                  )}
                </div>

                {/* Field 2: Management IP (Required, IPv4 Regex) */}
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
                    className={`w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden ${
                      errors.managementIp
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-[#1F8A7A]'
                    }`}
                  />
                  {errors.managementIp && (
                    <span className="text-[11px] text-red-500 mt-1 block flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.managementIp}
                    </span>
                  )}
                </div>

                {/* Field 3: Vendor Dropdown (Required, defaults to empty) */}
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
                    <option value="">{t.devices.modal.vendorSelect}</option>
                    <option value="cisco">Cisco IOS-XE</option>
                    <option value="huawei">Huawei VRP</option>
                  </select>
                  {errors.vendor && (
                    <span className="text-[11px] text-red-500 mt-1 block flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.vendor}
                    </span>
                  )}
                </div>

                {/* Field 4: SSH Port */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.devices.modal.sshPort}
                  </label>
                  <input
                    type="number"
                    value={formSshPort}
                    onChange={(e) => setFormSshPort(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                  />
                </div>

                {/* Field 5: Credential Profile */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.devices.modal.credProfile}
                  </label>
                  <select
                    value={formCredentialProfile}
                    onChange={(e) => setFormCredentialProfile(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                  >
                    <option value="NetDevOps Core Vault">NetDevOps Core Vault (Default)</option>
                    <option value="Regional Agg Vault">Regional Agg Vault</option>
                    <option value="Branch Perimeter Keys">Branch Perimeter Keys</option>
                    <option value="Factory OT Profile">Factory OT Profile</option>
                  </select>
                </div>

                {/* Field 6: Network Role */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.devices.modal.networkRole}
                  </label>
                  <select
                    value={formNetworkRole}
                    onChange={(e) => setFormNetworkRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                  >
                    <option value="Core">Core</option>
                    <option value="Distribution">Distribution</option>
                    <option value="Access">Access</option>
                    <option value="Edge">Edge</option>
                    <option value="Border">Border</option>
                    <option value="Firewall">Firewall</option>
                  </select>
                </div>

                {/* Field 7: Site Location */}
                <div className="md:col-span-2">
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

                {/* Field 8: EVE-NG Toggle + Node ID (revealed when checked) */}
                <div className="md:col-span-2 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsEveNg}
                      onChange={(e) => setFormIsEveNg(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1F8A7A] focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {t.devices.modal.isEveNg}
                    </span>
                  </label>

                  {formIsEveNg && (
                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700 max-w-xs">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {t.devices.modal.eveNodeId}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formEveNodeId}
                        onChange={(e) => setFormEveNodeId(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 3"
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-1 focus:ring-[#1F8A7A]"
                      />
                      {errors.eveNodeId && (
                        <span className="text-[11px] text-red-500 mt-1 block">
                          {errors.eveNodeId}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {t.devices.modal.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#1F8A7A] hover:bg-[#176f62] text-white transition-colors shadow-2xs"
                >
                  {t.devices.modal.saveBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
