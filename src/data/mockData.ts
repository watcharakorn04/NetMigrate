import { ConfigConversion, Device, AuditLog, CommandRule } from '../types';

export const SAMPLE_CISCO_CORE_CFG = `! Cisco IOS-XE Core Switch Configuration
hostname SW-CORE-BKK
!
enable secret 5 $1$mER8$hx5rJllBRiT6UWGQ1KnqI.
service password-encryption
!
vlan 10
 name Management
vlan 20
 name Servers-Prod
vlan 30
 name Users-Office
!
spanning-tree mode rapid-pvst
spanning-tree portfast default
!
interface Loopback0
 description Router-ID Loopback
 ip address 10.255.255.1 255.255.255.255
 no shutdown
!
interface GigabitEthernet0/0/1
 description Uplink to Perimeter FW
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
 no shutdown
!
interface GigabitEthernet0/0/2
 description Access Port to Web Server
 switchport mode access
 switchport access vlan 20
 spanning-tree portfast
 no shutdown
!
interface TenGigabitEthernet1/0/1
 description Inter-Switch Link to SW-DIST-01
 channel-group 1 mode active
 no shutdown
!
router ospf 1
 router-id 10.255.255.1
 network 10.255.255.1 0.0.0.0 area 0
 network 10.10.0.0 0.0.255.255 area 0
!
ip route 0.0.0.0 0.0.0.0 10.10.0.254
!
username netadmin privilege 15 secret 5 $1$k9Q3$mJ08.w79Xz1VbPnK01.
line vty 0 4
 transport input ssh
 login local
!
ntp server 10.1.1.10
snmp-server community NetMonitor542 ro
!
end`;

export const SAMPLE_CISCO_BRANCH_CFG = `! Cisco IOS-XE Branch Edge Router
hostname RT-BRANCH-CNX-01
!
enable secret 5 $1$7gA2$vB5xLmnOP99qW.
!
interface GigabitEthernet0/0/0
 description WAN Primary Provider A
 ip address 203.144.10.2 255.255.255.252
 no shutdown
!
interface GigabitEthernet0/0/1
 description LAN Gateway for Staff
 ip address 192.168.50.1 255.255.255.0
 no shutdown
!
ip access-list extended ACL-BRANCH-IN
 permit tcp any host 203.144.10.2 eq 22
 permit icmp any any
 deny ip any any
!
router bgp 65010
 bgp router-id 203.144.10.2
 neighbor 203.144.10.1 remote-as 64512
 neighbor 203.144.10.1 description ISP-UPLINK
 network 192.168.50.0 mask 255.255.255.0
!
logging host 192.168.50.250
!
end`;

export const SAMPLE_HUAWEI_VRP_CFG = `# Huawei VRP Aggregation Switch Configuration
sysname SW-AGG-PHUKET-01
#
vlan 100
 description DMZ-Farm
vlan 200
 description Database-Cluster
#
stp mode rstp
#
interface LoopBack0
 description Management Loopback
 ip address 10.254.254.1 255.255.255.255
#
interface GigabitEthernet0/0/1
 description Connection to Hypervisor Node
 port link-type trunk
 port trunk allow-pass vlan 100 200
 undo shutdown
#
interface GigabitEthernet0/0/2
 description Legacy Storage Portal
 port link-type access
 port default vlan 200
 stp edged-port enable
 undo shutdown
#
ip route-static 0.0.0.0 0.0.0.0 10.254.1.254
#
aaa
 local-user admin password irreversible-cipher $1a$12345$abcdEFGH
 local-user admin service-type ssh terminal
 local-user admin privilege level 15
#
user-interface vty 0 4
 authentication-mode aaa
 protocol inbound ssh
#
ntp-service unicast-server 10.1.1.10
#
return`;

export const INITIAL_CONVERSIONS: ConfigConversion[] = [
  {
    id: "conv-001",
    filename: "sw-core-bkk.cfg",
    sourceVendor: "cisco",
    targetVendor: "huawei",
    fileSize: "2.4 KB",
    coverage: { rule: 85, ai: 10, unmapped: 5, generated: 0 },
    maskedSecretsCount: 2,
    needsReviewCount: 2,
    originalSource: SAMPLE_CISCO_CORE_CFG,
    cleanCli: `sysname SW-CORE-BKK
vlan 10
 description Management
vlan 20
 description Servers-Prod
vlan 30
 description Users-Office
stp mode rstp
interface LoopBack0
 description Router-ID Loopback
 ip address 10.255.255.1 255.255.255.255
 undo shutdown
interface GigabitEthernet0/0/1
 description Uplink to Perimeter FW
 port link-type trunk
 port trunk allow-pass vlan 10 20 30
 undo shutdown
interface GigabitEthernet0/0/2
 description Access Port to Web Server
 port link-type access
 port default vlan 20
 stp edged-port enable
 undo shutdown
interface Eth-Trunk 1
 mode lacp-static
 undo shutdown
ospf 1 router-id 10.255.255.1
 area 0.0.0.0
  network 10.255.255.1 0.0.0.0
  network 10.10.0.0 0.0.255.255
ip route-static 0.0.0.0 0.0.0.0 10.10.0.254
user-interface vty 0 4
 protocol inbound ssh
ntp-service unicast-server 10.1.1.10
return`,
    rollbackCli: `undo sysname SW-CORE-BKK
undo vlan 10
undo vlan 20
undo vlan 30
interface LoopBack0
 undo ip address
interface GigabitEthernet0/0/1
 undo port trunk allow-pass vlan 10 20 30
 undo port link-type
interface GigabitEthernet0/0/2
 undo port default vlan
 undo port link-type
undo ospf 1
undo ip route-static 0.0.0.0 0.0.0.0 10.10.0.254
return`,
    lines: [
      { lineNum: 1, source: "! Cisco IOS-XE Core Switch Configuration", target: "# Huawei VRP Migrated Configuration", provenance: "G", needsReview: false },
      { lineNum: 2, source: "hostname SW-CORE-BKK", target: "sysname SW-CORE-BKK", provenance: "R", needsReview: false, ruleId: "SYS-01" },
      { lineNum: 3, source: "!", target: "#", provenance: "G", needsReview: false },
      { lineNum: 4, source: "enable secret 5 $1$mER8$hx5rJllBRiT6UWGQ1KnqI.", target: "# [MASKED] Password omitted for security (Reconfigure via AAA)", provenance: "U", needsReview: true, isMasked: true, note: "Plaintext/hashed credentials withheld from target script" },
      { lineNum: 5, source: "service password-encryption", target: "# [OMITTED] Huawei VRP automatically encrypts stored passwords", provenance: "R", needsReview: false, ruleId: "SEC-03" },
      { lineNum: 6, source: "!", target: "#", provenance: "G", needsReview: false },
      { lineNum: 7, source: "vlan 10", target: "vlan 10", provenance: "R", needsReview: false, ruleId: "VLAN-01" },
      { lineNum: 8, source: " name Management", target: " description Management", provenance: "R", needsReview: false, ruleId: "VLAN-02" },
      { lineNum: 9, source: "vlan 20", target: "vlan 20", provenance: "R", needsReview: false, ruleId: "VLAN-01" },
      { lineNum: 10, source: " name Servers-Prod", target: " description Servers-Prod", provenance: "R", needsReview: false, ruleId: "VLAN-02" },
      { lineNum: 11, source: "vlan 30", target: "vlan 30", provenance: "R", needsReview: false, ruleId: "VLAN-01" },
      { lineNum: 12, source: " name Users-Office", target: " description Users-Office", provenance: "R", needsReview: false, ruleId: "VLAN-02" },
      { lineNum: 13, source: "!", target: "#", provenance: "G", needsReview: false },
      { lineNum: 14, source: "spanning-tree mode rapid-pvst", target: "stp mode rstp", provenance: "R", needsReview: false, ruleId: "STP-01" },
      { lineNum: 15, source: "spanning-tree portfast default", target: "# AI: Verify global edged-port defaults across switch model", provenance: "A", needsReview: true, note: "Huawei handles edge port per interface or via stp edged-port default" },
      { lineNum: 16, source: "!", target: "#", provenance: "G", needsReview: false },
      { lineNum: 17, source: "interface Loopback0", target: "interface LoopBack0", provenance: "R", needsReview: false, ruleId: "INT-01" },
      { lineNum: 18, source: " description Router-ID Loopback", target: " description Router-ID Loopback", provenance: "R", needsReview: false, ruleId: "INT-03" },
      { lineNum: 19, source: " ip address 10.255.255.1 255.255.255.255", target: " ip address 10.255.255.1 255.255.255.255", provenance: "R", needsReview: false, ruleId: "INT-04" },
      { lineNum: 20, source: " no shutdown", target: " undo shutdown", provenance: "R", needsReview: false, ruleId: "INT-05" },
      { lineNum: 21, source: "!", target: "#", provenance: "G", needsReview: false },
      { lineNum: 22, source: "interface GigabitEthernet0/0/1", target: "interface GigabitEthernet0/0/1", provenance: "R", needsReview: false, ruleId: "INT-01" },
      { lineNum: 23, source: " description Uplink to Perimeter FW", target: " description Uplink to Perimeter FW", provenance: "R", needsReview: false, ruleId: "INT-03" },
      { lineNum: 24, source: " switchport mode trunk", target: " port link-type trunk", provenance: "R", needsReview: false, ruleId: "TRUNK-01" },
      { lineNum: 25, source: " switchport trunk allowed vlan 10,20,30", target: " port trunk allow-pass vlan 10 20 30", provenance: "R", needsReview: false, ruleId: "TRUNK-02" },
      { lineNum: 26, source: " no shutdown", target: " undo shutdown", provenance: "R", needsReview: false, ruleId: "INT-05" },
      { lineNum: 27, source: "!", target: "#", provenance: "G", needsReview: false },
      { lineNum: 28, source: "interface GigabitEthernet0/0/2", target: "interface GigabitEthernet0/0/2", provenance: "R", needsReview: false, ruleId: "INT-01" },
      { lineNum: 29, source: " description Access Port to Web Server", target: " description Access Port to Web Server", provenance: "R", needsReview: false, ruleId: "INT-03" },
      { lineNum: 30, source: " switchport mode access", target: " port link-type access", provenance: "R", needsReview: false, ruleId: "ACCESS-01" },
      { lineNum: 31, source: " switchport access vlan 20", target: " port default vlan 20", provenance: "R", needsReview: false, ruleId: "ACCESS-02" },
      { lineNum: 32, source: " spanning-tree portfast", target: " stp edged-port enable", provenance: "R", needsReview: false, ruleId: "STP-02" },
      { lineNum: 33, source: " no shutdown", target: " undo shutdown", provenance: "R", needsReview: false, ruleId: "INT-05" },
      { lineNum: 34, source: "!", target: "#", provenance: "G", needsReview: false },
      { lineNum: 35, source: "interface TenGigabitEthernet1/0/1", target: "interface 10GE1/0/1", provenance: "R", needsReview: false, ruleId: "INT-02" },
      { lineNum: 36, source: " description Inter-Switch Link to SW-DIST-01", target: " description Inter-Switch Link to SW-DIST-01", provenance: "R", needsReview: false, ruleId: "INT-03" },
      { lineNum: 37, source: " channel-group 1 mode active", target: " eth-trunk 1 mode lacp-static", provenance: "R", needsReview: false, ruleId: "LAG-01" },
      { lineNum: 38, source: " no shutdown", target: " undo shutdown", provenance: "R", needsReview: false, ruleId: "INT-05" },
      { lineNum: 39, source: "!", target: "#", provenance: "G", needsReview: false },
      { lineNum: 40, source: "router ospf 1", target: "ospf 1 router-id 10.255.255.1", provenance: "R", needsReview: false, ruleId: "OSPF-01" },
      { lineNum: 41, source: " router-id 10.255.255.1", target: "# (Consolidated into OSPF process header)", provenance: "R", needsReview: false, ruleId: "OSPF-02" },
      { lineNum: 42, source: " network 10.255.255.1 0.0.0.0 area 0", target: " area 0.0.0.0\\n  network 10.255.255.1 0.0.0.0", provenance: "R", needsReview: false, ruleId: "OSPF-03" },
      { lineNum: 43, source: " network 10.10.0.0 0.0.255.255 area 0", target: "  network 10.10.0.0 0.0.255.255", provenance: "R", needsReview: false, ruleId: "OSPF-03" },
      { lineNum: 44, source: "!", target: "#", provenance: "G", needsReview: false },
      { lineNum: 45, source: "ip route 0.0.0.0 0.0.0.0 10.10.0.254", target: "ip route-static 0.0.0.0 0.0.0.0 10.10.0.254", provenance: "R", needsReview: false, ruleId: "ROUTE-01" },
      { lineNum: 46, source: "!", target: "#", provenance: "G", needsReview: false },
      { lineNum: 47, source: "username netadmin privilege 15 secret 5 $1$k9Q3$mJ08.w79Xz1VbPnK01.", target: "# [MASKED] Local user credentials withheld for security vault setup", provenance: "U", needsReview: true, isMasked: true },
      { lineNum: 48, source: "line vty 0 4", target: "user-interface vty 0 4", provenance: "R", needsReview: false, ruleId: "MGMT-01" },
      { lineNum: 49, source: " transport input ssh", target: " protocol inbound ssh", provenance: "R", needsReview: false, ruleId: "MGMT-02" },
      { lineNum: 50, source: " login local", target: " authentication-mode aaa", provenance: "R", needsReview: false, ruleId: "MGMT-03" },
      { lineNum: 51, source: "!", target: "#", provenance: "G", needsReview: false },
      { lineNum: 52, source: "ntp server 10.1.1.10", target: "ntp-service unicast-server 10.1.1.10", provenance: "R", needsReview: false, ruleId: "MGMT-04" },
      { lineNum: 53, source: "snmp-server community NetMonitor542 ro", target: "# [MASKED] SNMP community string withheld from plain script", provenance: "U", needsReview: true, isMasked: true },
      { lineNum: 54, source: "!", target: "#", provenance: "G", needsReview: false },
      { lineNum: 55, source: "end", target: "return", provenance: "R", needsReview: false, ruleId: "SYS-02" }
    ]
  },
  {
    id: "conv-002",
    filename: "rt-branch-cnx.cfg",
    sourceVendor: "cisco",
    targetVendor: "huawei",
    fileSize: "1.8 KB",
    coverage: { rule: 90, ai: 5, unmapped: 5, generated: 0 },
    maskedSecretsCount: 1,
    needsReviewCount: 1,
    originalSource: SAMPLE_CISCO_BRANCH_CFG,
    cleanCli: `sysname RT-BRANCH-CNX-01
interface GigabitEthernet0/0/0
 description WAN Primary Provider A
 ip address 203.144.10.2 255.255.255.252
 undo shutdown
interface GigabitEthernet0/0/1
 description LAN Gateway for Staff
 ip address 192.168.50.1 255.255.255.0
 undo shutdown
acl number 3001
 rule 5 permit tcp source any destination 203.144.10.2 0 destination-port eq 22
 rule 10 permit icmp
 rule 15 deny ip
bgp 65010
 router-id 203.144.10.2
 peer 203.144.10.1 as-number 64512
 peer 203.144.10.1 description ISP-UPLINK
 network 192.168.50.0 255.255.255.0
info-center loghost 192.168.50.250
return`,
    rollbackCli: `undo sysname RT-BRANCH-CNX-01
interface GigabitEthernet0/0/0
 undo ip address
interface GigabitEthernet0/0/1
 undo ip address
undo acl number 3001
undo bgp 65010
return`,
    lines: [
      { lineNum: 1, source: "! Cisco IOS-XE Branch Edge Router", target: "# Huawei VRP Migrated Configuration", provenance: "G", needsReview: false },
      { lineNum: 2, source: "hostname RT-BRANCH-CNX-01", target: "sysname RT-BRANCH-CNX-01", provenance: "R", needsReview: false, ruleId: "SYS-01" },
      { lineNum: 3, source: "enable secret 5 $1$7gA2$vB5xLmnOP99qW.", target: "# [MASKED] Secret withheld", provenance: "U", needsReview: true, isMasked: true },
      { lineNum: 4, source: "interface GigabitEthernet0/0/0", target: "interface GigabitEthernet0/0/0", provenance: "R", needsReview: false, ruleId: "INT-01" },
      { lineNum: 5, source: " ip address 203.144.10.2 255.255.255.252", target: " ip address 203.144.10.2 255.255.255.252", provenance: "R", needsReview: false, ruleId: "INT-04" },
      { lineNum: 6, source: " no shutdown", target: " undo shutdown", provenance: "R", needsReview: false, ruleId: "INT-05" },
      { lineNum: 7, source: "interface GigabitEthernet0/0/1", target: "interface GigabitEthernet0/0/1", provenance: "R", needsReview: false, ruleId: "INT-01" },
      { lineNum: 8, source: " ip address 192.168.50.1 255.255.255.0", target: " ip address 192.168.50.1 255.255.255.0", provenance: "R", needsReview: false, ruleId: "INT-04" },
      { lineNum: 9, source: " no shutdown", target: " undo shutdown", provenance: "R", needsReview: false, ruleId: "INT-05" },
      { lineNum: 10, source: "bgp 65010", target: "bgp 65010", provenance: "R", needsReview: false, ruleId: "BGP-01" },
      { lineNum: 11, source: "end", target: "return", provenance: "R", needsReview: false, ruleId: "SYS-02" }
    ]
  },
  {
    id: "conv-003",
    filename: "sw-dist-rayong-99.cfg",
    sourceVendor: "cisco",
    targetVendor: "huawei",
    fileSize: "1.2 KB",
    coverage: { rule: 80, ai: 10, unmapped: 10, generated: 0 },
    maskedSecretsCount: 1,
    needsReviewCount: 1,
    originalSource: `hostname SW-DIST-RAYONG-99\nvlan 500\n name OT-Industrial-Sensors\ninterface GigabitEthernet1/0/1\n switchport mode access\n switchport access vlan 500\n no shutdown\nend`,
    cleanCli: `sysname SW-DIST-RAYONG-99
vlan 500
 description OT-Industrial-Sensors
interface GigabitEthernet1/0/1
 port link-type access
 port default vlan 500
 undo shutdown
return`,
    rollbackCli: `undo sysname SW-DIST-RAYONG-99
undo vlan 500
return`,
    lines: [
      { lineNum: 1, source: "hostname SW-DIST-RAYONG-99", target: "sysname SW-DIST-RAYONG-99", provenance: "R", needsReview: false, ruleId: "SYS-01" },
      { lineNum: 2, source: "vlan 500", target: "vlan 500", provenance: "R", needsReview: false, ruleId: "VLAN-01" },
      { lineNum: 3, source: " name OT-Industrial-Sensors", target: " description OT-Industrial-Sensors", provenance: "R", needsReview: false, ruleId: "VLAN-02" },
      { lineNum: 4, source: "interface GigabitEthernet1/0/1", target: "interface GigabitEthernet1/0/1", provenance: "R", needsReview: false, ruleId: "INT-01" },
      { lineNum: 5, source: "end", target: "return", provenance: "R", needsReview: false, ruleId: "SYS-02" }
    ]
  }
];

export const INITIAL_DEVICES: Device[] = [
  {
    id: "dev-001",
    hostname: "SW-CORE-BKK-01",
    managementIp: "192.168.10.1",
    vendor: "cisco",
    sshPort: 22,
    credentialProfile: "NetDevOps Core Vault",
    isEveNg: true,
    environmentType: "eveng",
    eveNodeId: 3,
    eveServerUrl: "http://192.168.1.100",
    eveLabName: "DC-Core-Migration.unl",
    telnetPort: 32769,
    qemuTemplate: "c1000v-universalk9-16.12",
    siteLocation: "BKK Data Center",
    networkRole: "Core",
    description: "Bangkok Primary Core Switch (Virtual Lab Node)",
    status: "Online",
    lastTestedAt: "2 mins ago",
    latencyMs: 3,
    baselineConfigUpdatedAt: "Oct 02, 2026 14:15",
    baselineConfig: `! Cisco IOS-XE Baseline Running Config
hostname SW-CORE-BKK-01
!
ip routing
!
vlan 10,20,30,99
!
interface Loopback0
 description Management & Router ID
 ip address 10.255.255.1 255.255.255.255
 no shutdown
!
interface GigabitEthernet0/0/1
 description Trunk to Dist-Switch-01
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
 no shutdown
!
router ospf 1
 router-id 10.255.255.1
 network 10.255.255.1 0.0.0.0 area 0
 network 10.10.0.0 0.0.255.255 area 0
!
line vty 0 4
 transport input ssh
 login local
!
end`,
  },
  {
    id: "dev-002",
    hostname: "SW-AGG-PHUKET-01",
    managementIp: "192.168.20.1",
    vendor: "huawei",
    sshPort: 22,
    credentialProfile: "Regional Agg Vault",
    isEveNg: true,
    environmentType: "eveng",
    eveNodeId: 5,
    eveServerUrl: "http://192.168.1.100",
    eveLabName: "DC-Core-Migration.unl",
    telnetPort: 32771,
    qemuTemplate: "huawei-vrp-ce6800-v8",
    siteLocation: "Phuket Campus Hub",
    networkRole: "Distribution",
    description: "Phuket Regional Aggregation Router (Virtual Lab Node)",
    status: "Online",
    lastTestedAt: "10 mins ago",
    latencyMs: 12,
    baselineConfigUpdatedAt: "Sep 28, 2026 11:30",
    baselineConfig: `# Huawei VRP Baseline Running Config
sysname SW-AGG-PHUKET-01
#
vlan batch 100 200
#
interface LoopBack0
 description Management Loopback
 ip address 10.254.254.1 255.255.255.255
#
interface GigabitEthernet0/0/1
 description Link to Hypervisor Farm
 port link-type trunk
 port trunk allow-pass vlan 100 200
 undo shutdown
#
ospf 1 router-id 10.254.254.1
 area 0.0.0.0
  network 10.254.254.1 0.0.0.0
#
user-interface vty 0 4
 authentication-mode aaa
 protocol inbound ssh
#
return`,
  },
  {
    id: "dev-003",
    hostname: "RT-BRANCH-CNX-01",
    managementIp: "10.50.1.1",
    vendor: "cisco",
    sshPort: 22,
    credentialProfile: "Branch Perimeter Keys",
    isEveNg: false,
    environmentType: "physical",
    rackUnit: "Rack B-02, U14",
    serialNumber: "FCW2145A88X",
    siteLocation: "Chiang Mai Branch",
    networkRole: "Edge",
    description: "Chiang Mai Branch Perimeter Physical Gateway",
    status: "Online",
    lastTestedAt: "1 hour ago",
    latencyMs: 24
  },
  {
    id: "dev-004",
    hostname: "SW-ACC-RAYONG-02",
    managementIp: "172.16.4.15",
    vendor: "huawei",
    sshPort: 2222,
    credentialProfile: "Factory OT Profile",
    isEveNg: false,
    environmentType: "physical",
    rackUnit: "Rack OT-1, U08",
    serialNumber: "HW-S5720-9941K",
    siteLocation: "Rayong Plant OT",
    networkRole: "Access",
    description: "Rayong Plant Industrial Access Switch (Physical)",
    status: "Offline",
    lastTestedAt: "Yesterday",
    latencyMs: 0
  },
  {
    id: "dev-005",
    hostname: "BORDER-GW-BKK-01",
    managementIp: "192.168.10.254",
    vendor: "cisco",
    sshPort: 22,
    credentialProfile: "Core Tier 1 SSH",
    isEveNg: true,
    environmentType: "eveng",
    eveNodeId: 1,
    eveServerUrl: "http://192.168.1.100",
    eveLabName: "DC-Core-Migration.unl",
    telnetPort: 32767,
    qemuTemplate: "cisco-csr1000v",
    siteLocation: "BKK Data Center",
    networkRole: "Border",
    description: "BKK Internet Border Gateway (Virtual Lab)",
    status: "Online",
    lastTestedAt: "Just now",
    latencyMs: 2
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log-101",
    timestamp: "2026-10-02 14:30:00",
    username: "admin_user",
    action: "CONVERT_BATCH",
    sourceVendor: "cisco",
    targetVendor: "huawei",
    maskedSecretsCount: 4,
    status: "SUCCESS",
    details: {
      fileCount: 3,
      targetScope: "3 Payloads (sw-core-bkk, rt-branch, dist-rack)",
      filename: "sw-core-bkk-01.txt",
      executionTimeMs: 142,
      averageRuleCoverage: "94.2%",
      deterministicRulesApplied: 28,
      aiAssistedLines: 4,
      withheldCount: 4,
      sourceSnippet: `! Cisco IOS-XE Source Configuration
hostname SW-CORE-BKK-01
!
enable secret 9 $9$K1rZ2m... [MASKED SECRET]
username admin privilege 15 secret 9 $9$8jX... [MASKED SECRET]
!
vlan 10,20,30,99
!
interface GigabitEthernet0/0/1
 description Trunk Link to Aggregation
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30,99
 no shutdown
!
interface Vlan10
 description Corporate Data Gateway
 ip address 10.10.10.1 255.255.255.0
 no shutdown
!
router ospf 1
 router-id 10.255.255.1
 network 10.10.10.0 0.0.0.255 area 0
!
line vty 0 4
 transport input ssh
!
end`,
      targetSnippet: `# Huawei VRP Converted Target Configuration
sysname SW-CORE-BKK-01
#
# [Security Guardrail] enable secret withheld for security
# [Security Guardrail] username admin secret withheld
#
vlan batch 10 20 30 99
#
interface GigabitEthernet0/0/1
 description Trunk Link to Aggregation
 port link-type trunk
 port trunk allow-pass vlan 10 20 30 99
 undo shutdown
#
interface Vlanif10
 description Corporate Data Gateway
 ip address 10.10.10.1 255.255.255.0
 undo shutdown
#
ospf 1 router-id 10.255.255.1
 area 0.0.0.0
  network 10.10.10.0 0.0.0.255
#
user-interface vty 0 4
 authentication-mode aaa
 protocol inbound ssh
#
return`,
      notes: "Deterministic translation verified. Passwords and HMAC hashes withheld from plaintext export."
    }
  },
  {
    id: "log-102",
    timestamp: "2026-10-02 13:15:22",
    username: "admin_user",
    action: "DEPLOY_EVENG",
    sourceVendor: "cisco",
    targetVendor: "huawei",
    maskedSecretsCount: 0,
    status: "SUCCESS",
    details: {
      targetScope: "SW-CORE-BKK-01",
      hostname: "SW-CORE-BKK-01",
      managementIp: "192.168.10.1",
      sshPort: 22,
      environmentType: "eveng",
      eveNodeId: 1,
      eveLabName: "DC-Core-Migration.unl",
      commitStatus: "COMMITTED",
      linesExecuted: 32,
      withheldCount: 2,
      payloadSnippet: `# Huawei VRP Executable Script
sysname SW-CORE-BKK-01
vlan batch 10 20 30 99
interface GigabitEthernet0/0/1
 description Uplink to Spine
 port link-type trunk
 port trunk allow-pass vlan 10 20 30 99
 undo shutdown
interface Vlanif10
 description Management Gateway
 ip address 192.168.10.1 255.255.255.0
 undo shutdown
return`,
      rollbackSnippet: `# Compensating Rollback Commands
sysname Device_Default
undo vlan batch 10 20 30 99
interface GigabitEthernet0/0/1
 undo port trunk allow-pass vlan 10 20 30 99
 port link-type access
interface Vlanif10
 undo ip address
 shutdown
return`,
      terminalLogs: [
        { timestamp: "13:15:22", severity: "INFO", message: "Connecting to EVE-NG virtual node ID #1 at 192.168.10.1:22..." },
        { timestamp: "13:15:23", severity: "SUCCESS", message: "SSH handshake and RSA host key verified successfully." },
        { timestamp: "13:15:23", severity: "COMMAND", message: "> system-view" },
        { timestamp: "13:15:24", severity: "COMMAND", message: "> sysname SW-CORE-BKK-01" },
        { timestamp: "13:15:24", severity: "COMMAND", message: "> vlan batch 10 20 30 99" },
        { timestamp: "13:15:25", severity: "COMMAND", message: "> interface GigabitEthernet0/0/1" },
        { timestamp: "13:15:25", severity: "COMMAND", message: "> port link-type trunk" },
        { timestamp: "13:15:26", severity: "COMMAND", message: "> port trunk allow-pass vlan 10 20 30 99" },
        { timestamp: "13:15:27", severity: "SUCCESS", message: "Configuration committed into VRP candidate configuration." },
        { timestamp: "13:15:28", severity: "SUCCESS", message: "All 32 statements executed. Exit code: 0 OK." }
      ]
    }
  },
  {
    id: "log-103",
    timestamp: "2026-10-02 11:05:18",
    username: "net_architect",
    action: "EDIT_DEVICE",
    sourceVendor: "cisco",
    targetVendor: "-",
    maskedSecretsCount: 0,
    status: "SUCCESS",
    details: {
      targetScope: "SW-CORE-BKK-01",
      deviceId: "dev-001",
      hostname: "SW-CORE-BKK-01",
      environmentType: "eveng",
      vendor: "cisco",
      diff: [
        { property: "Management IP", previous: "192.168.10.254", updated: "192.168.10.1" },
        { property: "SSH Port", previous: "2222", updated: "22" },
        { property: "Network Role", previous: "Distribution", updated: "Core" },
        { property: "EVE-NG Node ID", previous: "2", updated: "1" }
      ],
      notes: "Updated device address schema and reassigned node to primary core role."
    }
  },
  {
    id: "log-104",
    timestamp: "2026-10-01 17:40:10",
    username: "audit_bot",
    action: "GENERATE_ROLLBACK",
    sourceVendor: "cisco",
    targetVendor: "huawei",
    maskedSecretsCount: 1,
    status: "SUCCESS",
    details: {
      targetScope: "RT-BRANCH-CNX-01",
      filename: "rt-branch-cnx-01.txt",
      rollbackCommandsGenerated: 16,
      targetPlatform: "Huawei VRP v8",
      targetSnippet: `# Auto-generated Rollback Script for RT-BRANCH-CNX-01
sysname Branch_Old
undo interface LoopBack0
undo ospf 1
interface GigabitEthernet0/0/1
 undo ip address
 shutdown
return`
    }
  },
  {
    id: "log-105",
    timestamp: "2026-10-01 14:10:05",
    username: "admin_user",
    action: "DEPLOY_DRY_RUN",
    sourceVendor: "cisco",
    targetVendor: "huawei",
    maskedSecretsCount: 0,
    status: "SUCCESS",
    details: {
      targetScope: "SW-AGG-PHUKET-01",
      hostname: "SW-AGG-PHUKET-01",
      managementIp: "192.168.20.1",
      environmentType: "eveng",
      eveNodeId: 2,
      dryRun: true,
      syntaxVerified: true,
      linesSimulated: 24,
      payloadSnippet: `# Huawei VRP Executable Script
sysname SW-AGG-PHUKET-01
vlan batch 100 200
interface LoopBack0
 description Management Loopback
 ip address 10.254.254.1 255.255.255.255
interface GigabitEthernet0/0/1
 description Link to Hypervisor Farm
 port link-type trunk
 port trunk allow-pass vlan 100 200
 undo shutdown
return`,
      rollbackSnippet: `# Compensating Rollback Commands
sysname Device_Default
undo vlan batch 100 200
undo interface LoopBack0
interface GigabitEthernet0/0/1
 undo port trunk allow-pass vlan 100 200
 port link-type access
return`,
      terminalLogs: [
        { timestamp: "14:10:05", severity: "INFO", message: "Starting dry-run syntax verification on node SW-AGG-PHUKET-01..." },
        { timestamp: "14:10:06", severity: "INFO", message: "Validating VLAN batch syntax against VRP v8 parser..." },
        { timestamp: "14:10:07", severity: "SUCCESS", message: "Dry-run syntax passed without errors. Configuration not committed to hardware." }
      ]
    }
  },
  {
    id: "log-106",
    timestamp: "2026-10-01 09:20:45",
    username: "net_architect",
    action: "ADD_DEVICE",
    sourceVendor: "cisco",
    targetVendor: "-",
    maskedSecretsCount: 0,
    status: "SUCCESS",
    details: {
      targetScope: "RT-BRANCH-CNX-01",
      deviceId: "dev-003",
      hostname: "RT-BRANCH-CNX-01",
      managementIp: "10.50.1.1",
      vendor: "cisco",
      sshPort: 22,
      environmentType: "physical",
      rackUnit: "Rack B-02, U14",
      serialNumber: "FCW2145A88X",
      siteLocation: "Chiang Mai Branch",
      networkRole: "Edge",
      description: "Chiang Mai Branch Perimeter Physical Gateway"
    }
  },
  {
    id: "log-107",
    timestamp: "2026-09-30 18:00:12",
    username: "sec_compliance",
    action: "DELETE_DEVICE",
    sourceVendor: "huawei",
    targetVendor: "-",
    maskedSecretsCount: 0,
    status: "WARNING",
    details: {
      targetScope: "SW-DECOMMISSION-09",
      deviceId: "dev-099",
      hostname: "SW-DECOMMISSION-09",
      managementIp: "172.16.99.1",
      vendor: "huawei",
      environmentType: "physical",
      siteLocation: "Legacy DC Zone C",
      notes: "Decommissioned hardware purged from active inventory per Q3 review."
    }
  }
];

export const SUPPORTED_RULES: CommandRule[] = [
  {
    id: "SYS-01",
    category: "System",
    ciscoSyntax: "hostname <NAME>",
    huaweiSyntax: "sysname <NAME>",
    direction: "bidirectional",
    provenance: "R",
    description: "Configures system identification and prompt naming across the network OS.",
    notes: "Both accept alphanumeric strings and hyphens up to 64 characters."
  },
  {
    id: "SYS-02",
    category: "System",
    ciscoSyntax: "end",
    huaweiSyntax: "return",
    direction: "bidirectional",
    provenance: "R",
    description: "Exits from configuration mode back to privileged / user executive view.",
    notes: "Essential terminating command for CLI scripts."
  },
  {
    id: "INT-01",
    category: "Interface",
    ciscoSyntax: "interface GigabitEthernet<slot>/<port>",
    huaweiSyntax: "interface GigabitEthernet<slot>/<port>",
    direction: "bidirectional",
    provenance: "R",
    description: "Standard 1G RJ45 or SFP port configuration context.",
    notes: "Huawei also accepts abbreviation GE<slot>/<port>."
  },
  {
    id: "INT-02",
    category: "Interface",
    ciscoSyntax: "interface TenGigabitEthernet<slot>/<port>",
    huaweiSyntax: "interface 10GE<slot>/<port>",
    direction: "bidirectional",
    provenance: "R",
    description: "10G optical SFP+ interface naming translation.",
    notes: "Direct syntax conversion with slot index mapping preservation."
  },
  {
    id: "INT-03",
    category: "Interface",
    ciscoSyntax: "description <TEXT>",
    huaweiSyntax: "description <TEXT>",
    direction: "bidirectional",
    provenance: "R",
    description: "Interface purpose and circuit label annotation.",
    notes: "Spaces allowed without quotes on both vendors."
  },
  {
    id: "INT-04",
    category: "Interface",
    ciscoSyntax: "ip address <IP> <MASK>",
    huaweiSyntax: "ip address <IP> <MASK>",
    direction: "bidirectional",
    provenance: "R",
    description: "Assigns IPv4 address and subnet mask to L3 interface or SVI.",
    notes: "Huawei also accepts CIDR prefix length (e.g. /24)."
  },
  {
    id: "INT-05",
    category: "Interface",
    ciscoSyntax: "no shutdown / shutdown",
    huaweiSyntax: "undo shutdown / shutdown",
    direction: "bidirectional",
    provenance: "R",
    description: "Enables or administratively disables port transmission.",
    notes: "Cisco uses 'no', Huawei uses 'undo' for negating directives."
  },
  {
    id: "VLAN-01",
    category: "VLAN & Trunking",
    ciscoSyntax: "vlan <ID>",
    huaweiSyntax: "vlan <ID>",
    direction: "bidirectional",
    provenance: "R",
    description: "Instantiates 802.1Q broadcast domain / VLAN ID.",
    notes: "Valid range 1-4094."
  },
  {
    id: "VLAN-02",
    category: "VLAN & Trunking",
    ciscoSyntax: "name <VLAN_NAME>",
    huaweiSyntax: "description <VLAN_NAME>",
    direction: "bidirectional",
    provenance: "R",
    description: "Friendly name identifier assigned to VLAN.",
    notes: "Cisco uses 'name', Huawei uses 'description' inside vlan context."
  },
  {
    id: "TRUNK-01",
    category: "VLAN & Trunking",
    ciscoSyntax: "switchport mode trunk",
    huaweiSyntax: "port link-type trunk",
    direction: "bidirectional",
    provenance: "R",
    description: "Sets switchport to tag multiple 802.1Q VLANs.",
    notes: "Crucial difference: 'switchport mode' vs 'port link-type'."
  },
  {
    id: "TRUNK-02",
    category: "VLAN & Trunking",
    ciscoSyntax: "switchport trunk allowed vlan <LIST>",
    huaweiSyntax: "port trunk allow-pass vlan <LIST>",
    direction: "bidirectional",
    provenance: "R",
    description: "Permits specific VLAN IDs to traverse 802.1Q trunk link.",
    notes: "Cisco uses comma/hyphen; Huawei uses space-delimited numbers."
  },
  {
    id: "ACCESS-01",
    category: "VLAN & Trunking",
    ciscoSyntax: "switchport mode access",
    huaweiSyntax: "port link-type access",
    direction: "bidirectional",
    provenance: "R",
    description: "Sets switchport to untagged end-host delivery.",
    notes: "Untagged frames only."
  },
  {
    id: "ACCESS-02",
    category: "VLAN & Trunking",
    ciscoSyntax: "switchport access vlan <ID>",
    huaweiSyntax: "port default vlan <ID>",
    direction: "bidirectional",
    provenance: "R",
    description: "Binds untagged access port to a specific PVID / VLAN ID.",
    notes: "Deterministic mapping."
  },
  {
    id: "STP-01",
    category: "STP",
    ciscoSyntax: "spanning-tree mode rapid-pvst",
    huaweiSyntax: "stp mode rstp",
    direction: "bidirectional",
    provenance: "R",
    description: "Configures Rapid Spanning Tree Protocol (802.1w).",
    notes: "Huawei RSTP operates globally; PVST+ instances require MSTP or VBST mode."
  },
  {
    id: "STP-02",
    category: "STP",
    ciscoSyntax: "spanning-tree portfast",
    huaweiSyntax: "stp edged-port enable",
    direction: "bidirectional",
    provenance: "R",
    description: "Bypasses listening/learning state directly to forwarding for edge hosts.",
    notes: "Direct functional equivalent."
  },
  {
    id: "LAG-01",
    category: "Link Aggregation",
    ciscoSyntax: "channel-group <ID> mode active",
    huaweiSyntax: "eth-trunk <ID>\n mode lacp-static",
    direction: "bidirectional",
    provenance: "R",
    description: "Binds physical interface into 802.3ad dynamic LACP bundle.",
    notes: "Huawei requires creating interface Eth-Trunk before binding ports."
  },
  {
    id: "ROUTE-01",
    category: "Routing (OSPF/BGP/Static)",
    ciscoSyntax: "ip route <PREFIX> <MASK> <NEXT_HOP>",
    huaweiSyntax: "ip route-static <PREFIX> <MASK> <NEXT_HOP>",
    direction: "bidirectional",
    provenance: "R",
    description: "Installs static routing entry into FIB.",
    notes: "Direct keyword swap 'ip route' vs 'ip route-static'."
  },
  {
    id: "OSPF-01",
    category: "Routing (OSPF/BGP/Static)",
    ciscoSyntax: "router ospf <PID> / router-id <RID>",
    huaweiSyntax: "ospf <PID> router-id <RID>",
    direction: "bidirectional",
    provenance: "R",
    description: "Initializes OSPF process instance and assigns 32-bit Router ID.",
    notes: "Huawei bundles router-id directly onto process statement line."
  },
  {
    id: "OSPF-02",
    category: "Routing (OSPF/BGP/Static)",
    ciscoSyntax: "network <IP> <WILDCARD> area <AREA>",
    huaweiSyntax: "area <AREA>\n network <IP> <WILDCARD>",
    direction: "bidirectional",
    provenance: "R",
    description: "Advertises interface subnets into designated OSPF area.",
    notes: "Huawei nests network statements under explicit area sub-hierarchy."
  },
  {
    id: "BGP-01",
    category: "Routing (OSPF/BGP/Static)",
    ciscoSyntax: "neighbor <IP> remote-as <ASN>",
    huaweiSyntax: "peer <IP> as-number <ASN>",
    direction: "bidirectional",
    provenance: "R",
    description: "Configures BGP neighbor peering relationship.",
    notes: "Cisco 'neighbor ... remote-as', Huawei 'peer ... as-number'."
  },
  {
    id: "SEC-01",
    category: "Security & ACL",
    ciscoSyntax: "enable secret <HASH>",
    huaweiSyntax: "# [MASKED] Password withheld for security vault",
    direction: "cisco-to-huawei",
    provenance: "U",
    description: "Privileged executive password hash.",
    notes: "Intentionally withheld by guardrail. Never translated across different cipher algorithms.",
    isSecuritySensitive: true
  },
  {
    id: "SEC-02",
    category: "Security & ACL",
    ciscoSyntax: "username <USER> secret <HASH>",
    huaweiSyntax: "# [MASKED] Local credentials withheld for security vault",
    direction: "cisco-to-huawei",
    provenance: "U",
    description: "Local user authentication database entry.",
    notes: "Must be provisioned through secure enterprise credentials profile.",
    isSecuritySensitive: true
  },
  {
    id: "MGMT-01",
    category: "Management & AAA",
    ciscoSyntax: "line vty <START> <END>",
    huaweiSyntax: "user-interface vty <START> <END>",
    direction: "bidirectional",
    provenance: "R",
    description: "Configures virtual teletype terminal lines for remote access.",
    notes: "Direct syntax translation."
  },
  {
    id: "MGMT-02",
    category: "Management & AAA",
    ciscoSyntax: "transport input ssh",
    huaweiSyntax: "protocol inbound ssh",
    direction: "bidirectional",
    provenance: "R",
    description: "Restricts remote management access solely to encrypted SSH.",
    notes: "Prevents insecure Telnet sessions."
  },
  {
    id: "MGMT-03",
    category: "Management & AAA",
    ciscoSyntax: "ntp server <IP>",
    huaweiSyntax: "ntp-service unicast-server <IP>",
    direction: "bidirectional",
    provenance: "R",
    description: "Designates external Network Time Protocol synchronization source.",
    notes: "Direct syntax mapping."
  }
];
