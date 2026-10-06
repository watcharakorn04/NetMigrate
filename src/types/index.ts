export type Vendor = 'cisco' | 'huawei';
export type ProvenanceType = 'R' | 'A' | 'U' | 'G';

export interface TranslatedLine {
  lineNum: number;
  source: string;
  target: string;
  provenance: ProvenanceType;
  needsReview: boolean;
  ruleId?: string;
  note?: string;
  isMasked?: boolean;
}

export interface CoverageBreakdown {
  rule: number;
  ai: number;
  unmapped: number;
  generated: number;
}

export interface ConfigConversion {
  id: string;
  filename: string;
  sourceVendor: Vendor;
  targetVendor: Vendor;
  coverage: CoverageBreakdown;
  lines: TranslatedLine[];
  originalSource: string;
  cleanCli: string;
  rollbackCli: string;
  maskedSecretsCount: number;
  needsReviewCount: number;
  fileSize?: string;
  aiAssistEnabled?: boolean;
}

export interface Device {
  id: string;
  hostname: string;
  managementIp: string;
  vendor: Vendor;
  sshPort: number;
  credentialProfile?: string;
  isEveNg: boolean;
  eveNodeId?: number;
  siteLocation: string;
  networkRole: 'Core' | 'Distribution' | 'Access' | 'Edge' | 'Border' | 'Firewall';
  status: 'Online' | 'Offline' | 'Deploying' | 'Unreachable';
  environmentType?: 'physical' | 'eveng';
  description?: string;
  rackUnit?: string;
  serialNumber?: string;
  eveServerUrl?: string;
  eveLabName?: string;
  telnetPort?: number;
  qemuTemplate?: string;
  lastTestedAt?: string;
  latencyMs?: number;
  baselineConfig?: string;
  baselineConfigUpdatedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  username: string;
  action:
    | 'CONVERT_SINGLE'
    | 'CONVERT_BATCH'
    | 'SEND_TO_DEPLOY'
    | 'DEPLOY_EVENG'
    | 'DEPLOY_DRY_RUN'
    | 'DEPLOY_PUSH'
    | 'GENERATE_ROLLBACK'
    | 'ADD_DEVICE'
    | 'EDIT_DEVICE'
    | 'DELETE_DEVICE'
    | 'EXPORT_CLEAN_CLI'
    | string;
  sourceVendor?: Vendor | string;
  targetVendor?: Vendor | string;
  maskedSecretsCount: number;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  details?: Record<string, unknown>;
}

export interface CommandRule {
  id: string;
  category: 'System' | 'Interface' | 'VLAN & Trunking' | 'STP' | 'Routing (OSPF/BGP/Static)' | 'Security & ACL' | 'Management & AAA' | 'Link Aggregation';
  ciscoSyntax: string;
  huaweiSyntax: string;
  direction: 'bidirectional' | 'cisco-to-huawei' | 'huawei-to-cisco';
  provenance: ProvenanceType;
  description: string;
  notes?: string;
  isSecuritySensitive?: boolean;
}

export type LogSeverity = 'ALL' | 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'COMMAND';

export interface TerminalLogEntry {
  id: string;
  timestamp: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'COMMAND';
  message: string;
  nodeId?: number;
}

export type Language = 'en' | 'th';
export type ThemeMode = 'dark' | 'light';

export interface WithheldLine {
  lineNum: number;
  sourceText: string;
  reason: 'SECRET_MASKED' | 'AI_SUGGESTION' | 'UNMAPPED_COMMAND' | 'COMMENT_LINE';
  explanation: string;
}

export interface UserProfile {
  fullName: string;
  username: string;
  email: string;
  phone: string;
}
