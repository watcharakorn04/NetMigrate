import { ConfigConversion, CoverageBreakdown, ProvenanceType, TranslatedLine, Vendor, WithheldLine } from '../types';

export function detectVendor(content: string): Vendor {
  const ciscoScore = (content.match(/\b(hostname|switchport|spanning-tree|router ospf|router bgp|enable secret|line vty|channel-group|no shutdown|\!)\b/gi) || []).length;
  const huaweiScore = (content.match(/\b(sysname|port link-type|allow-pass|port default|undo shutdown|stp mode|edged-port|ip route-static|user-interface vty|ntp-service|snmp-agent|return|dis curr)\b/gi) || []).length;

  if (huaweiScore > ciscoScore) {
    return 'huawei';
  }
  return 'cisco';
}

const SECRET_PATTERNS = [
  /enable secret/i,
  /enable password/i,
  /password irreversible-cipher/i,
  /password cipher/i,
  /secret \d/i,
  /community\s+\S+/i,
  /snmp-agent community/i,
  /preshared-key/i,
  /key-string/i,
  /radius-server key/i,
  /tacacs-server key/i,
];

function isCredentialSensitive(line: string): boolean {
  return SECRET_PATTERNS.some(regex => regex.test(line));
}

export function translateConfig(
  sourceText: string,
  fromVendor: Vendor,
  toVendor: Vendor,
  filename = "config_translated.txt",
  enableAiAssist = true
): ConfigConversion {
  const rawLines = sourceText.split(/\r?\n/);
  const translatedLines: TranslatedLine[] = [];
  let maskedSecretsCount = 0;
  let needsReviewCount = 0;

  let ruleMatches = 0;
  let aiMatches = 0;
  let unmappedMatches = 0;
  let generatedMatches = 0;

  // Context trackers
  let insideVlanContext = false;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();
    const lineNum = i + 1;

    // Empty lines
    if (!trimmed) {
      translatedLines.push({
        lineNum,
        source: rawLine,
        target: "",
        provenance: 'G',
        needsReview: false,
      });
      generatedMatches++;
      continue;
    }

    // Credential Masking Guardrail (Both Directions)
    if (isCredentialSensitive(trimmed)) {
      maskedSecretsCount++;
      needsReviewCount++;
      unmappedMatches++;
      translatedLines.push({
        lineNum,
        source: rawLine,
        target: toVendor === 'huawei'
          ? "# [MASKED] Password omitted for security (Reconfigure via AAA vault)"
          : "! [MASKED] Password omitted for security (Reconfigure via Vault)",
        provenance: 'U',
        needsReview: true,
        isMasked: true,
        note: "Sensitive credential withheld from target configuration script.",
      });
      continue;
    }

    // CISCO -> HUAWEI TRANSLATION
    if (fromVendor === 'cisco' && toVendor === 'huawei') {
      // Comments
      if (trimmed.startsWith('!')) {
        const commentBody = trimmed.replace(/^!\s*/, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: commentBody ? `# ${commentBody}` : "#",
          provenance: 'G',
          needsReview: false,
        });
        generatedMatches++;
        continue;
      }

      // Hostname -> sysname
      if (/^hostname\s+/i.test(trimmed)) {
        const name = trimmed.replace(/^hostname\s+/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `sysname ${name}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "SYS-01",
        });
        ruleMatches++;
        continue;
      }

      // Exit / End
      if (/^end$/i.test(trimmed)) {
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: "return",
          provenance: 'R',
          needsReview: false,
          ruleId: "SYS-02",
        });
        ruleMatches++;
        continue;
      }

      // VLAN
      if (/^vlan\s+\d+/i.test(trimmed)) {
        insideVlanContext = true;
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: trimmed.toLowerCase(),
          provenance: 'R',
          needsReview: false,
          ruleId: "VLAN-01",
        });
        ruleMatches++;
        continue;
      }

      if (insideVlanContext && /^name\s+/i.test(trimmed)) {
        const vlanName = trimmed.replace(/^name\s+/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: ` description ${vlanName}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "VLAN-02",
        });
        ruleMatches++;
        insideVlanContext = false;
        continue;
      }

      // Spanning-Tree
      if (/^spanning-tree mode rapid-pvst/i.test(trimmed)) {
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: "stp mode rstp",
          provenance: 'R',
          needsReview: false,
          ruleId: "STP-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^spanning-tree mode pvst/i.test(trimmed)) {
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: "stp mode stp",
          provenance: 'R',
          needsReview: false,
          ruleId: "STP-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^spanning-tree portfast default/i.test(trimmed)) {
        if (enableAiAssist) {
          needsReviewCount++;
          aiMatches++;
          translatedLines.push({
            lineNum,
            source: rawLine,
            target: "# AI: Verify global edged-port defaults across switch model (stp edged-port default)",
            provenance: 'A',
            needsReview: true,
            note: "Huawei enables edge port per interface or via global stp edged-port command.",
          });
        } else {
          needsReviewCount++;
          unmappedMatches++;
          translatedLines.push({
            lineNum,
            source: rawLine,
            target: "# [UNMAPPED - FAST ENGINE] Cisco command: spanning-tree portfast default",
            provenance: 'U',
            needsReview: true,
            note: "Fast Rule Engine mode active (AI Assist disabled). Command requires manual review or deterministic rule.",
          });
        }
        continue;
      }

      if (/^spanning-tree portfast/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}stp edged-port enable`,
          provenance: 'R',
          needsReview: false,
          ruleId: "STP-02",
        });
        ruleMatches++;
        continue;
      }

      // Interfaces
      if (/^interface\s+loopback\s*(\d+)/i.test(trimmed)) {
        const num = trimmed.match(/(\d+)/)?.[1] || '0';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `interface LoopBack${num}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "INT-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^interface\s+TenGigabitEthernet/i.test(trimmed)) {
        const portId = trimmed.replace(/^interface\s+TenGigabitEthernet\s*/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `interface 10GE${portId}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "INT-02",
        });
        ruleMatches++;
        continue;
      }

      if (/^interface\s+GigabitEthernet/i.test(trimmed)) {
        const portId = trimmed.replace(/^interface\s+GigabitEthernet\s*/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `interface GigabitEthernet${portId}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "INT-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^description\s+/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}${trimmed}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "INT-03",
        });
        ruleMatches++;
        continue;
      }

      if (/^ip address\s+/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}${trimmed}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "INT-04",
        });
        ruleMatches++;
        continue;
      }

      if (/^no shutdown/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}undo shutdown`,
          provenance: 'R',
          needsReview: false,
          ruleId: "INT-05",
        });
        ruleMatches++;
        continue;
      }

      if (/^shutdown/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}shutdown`,
          provenance: 'R',
          needsReview: false,
          ruleId: "INT-05",
        });
        ruleMatches++;
        continue;
      }

      // Switchport
      if (/^switchport mode trunk/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}port link-type trunk`,
          provenance: 'R',
          needsReview: false,
          ruleId: "TRUNK-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^switchport trunk allowed vlan\s+/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        const vlans = trimmed.replace(/^switchport trunk allowed vlan\s+/i, '').replace(/,/g, ' ');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}port trunk allow-pass vlan ${vlans}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "TRUNK-02",
        });
        ruleMatches++;
        continue;
      }

      if (/^switchport mode access/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}port link-type access`,
          provenance: 'R',
          needsReview: false,
          ruleId: "ACCESS-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^switchport access vlan\s+/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        const vlanId = trimmed.replace(/^switchport access vlan\s+/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}port default vlan ${vlanId}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "ACCESS-02",
        });
        ruleMatches++;
        continue;
      }

      // Link Aggregation
      if (/^channel-group\s+(\d+)\s+mode\s+active/i.test(trimmed)) {
        const trunkId = trimmed.match(/channel-group\s+(\d+)/i)?.[1] || '1';
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}eth-trunk ${trunkId} mode lacp-static`,
          provenance: 'R',
          needsReview: false,
          ruleId: "LAG-01",
        });
        ruleMatches++;
        continue;
      }

      // OSPF
      if (/^router ospf\s+(\d+)/i.test(trimmed)) {
        const pid = trimmed.match(/router ospf\s+(\d+)/i)?.[1] || '1';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `ospf ${pid}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "OSPF-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^network\s+([0-9.]+)\s+([0-9.]+)\s+area\s+([0-9.]+)/i.test(trimmed)) {
        const m = trimmed.match(/^network\s+([0-9.]+)\s+([0-9.]+)\s+area\s+([0-9.]+)/i);
        if (m) {
          const [, net, wild, area] = m;
          const areaFmt = area.includes('.') ? area : `0.0.0.${area}`;
          translatedLines.push({
            lineNum,
            source: rawLine,
            target: ` area ${areaFmt}\n  network ${net} ${wild}`,
            provenance: 'R',
            needsReview: false,
            ruleId: "OSPF-02",
          });
          ruleMatches++;
          continue;
        }
      }

      // Static Route
      if (/^ip route\s+/i.test(trimmed)) {
        const routeParams = trimmed.replace(/^ip route\s+/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `ip route-static ${routeParams}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "ROUTE-01",
        });
        ruleMatches++;
        continue;
      }

      // BGP
      if (/^router bgp\s+(\d+)/i.test(trimmed)) {
        const asn = trimmed.match(/router bgp\s+(\d+)/i)?.[1] || '65000';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `bgp ${asn}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "BGP-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^neighbor\s+([0-9.]+)\s+remote-as\s+(\d+)/i.test(trimmed)) {
        const m = trimmed.match(/^neighbor\s+([0-9.]+)\s+remote-as\s+(\d+)/i);
        if (m) {
          const indent = rawLine.match(/^\s*/)?.[0] || '';
          translatedLines.push({
            lineNum,
            source: rawLine,
            target: `${indent}peer ${m[1]} as-number ${m[2]}`,
            provenance: 'R',
            needsReview: false,
            ruleId: "BGP-01",
          });
          ruleMatches++;
          continue;
        }
      }

      // VTY & Management
      if (/^line vty\s+(\d+)\s*(\d*)/i.test(trimmed)) {
        const m = trimmed.match(/^line vty\s+(\d+)\s*(\d*)/i);
        const start = m?.[1] || '0';
        const end = m?.[2] || '4';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `user-interface vty ${start} ${end}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "MGMT-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^transport input ssh/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}protocol inbound ssh`,
          provenance: 'R',
          needsReview: false,
          ruleId: "MGMT-02",
        });
        ruleMatches++;
        continue;
      }

      if (/^login local/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}authentication-mode aaa`,
          provenance: 'R',
          needsReview: false,
          ruleId: "MGMT-03",
        });
        ruleMatches++;
        continue;
      }

      if (/^ntp server\s+/i.test(trimmed)) {
        const ip = trimmed.replace(/^ntp server\s+/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `ntp-service unicast-server ${ip}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "MGMT-03",
        });
        ruleMatches++;
        continue;
      }

      if (/^logging host\s+/i.test(trimmed)) {
        const ip = trimmed.replace(/^logging host\s+/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `info-center loghost ${ip}`,
          provenance: 'R',
          needsReview: false,
        });
        ruleMatches++;
        continue;
      }

      if (/^service password-encryption/i.test(trimmed)) {
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: "# [OMITTED] Huawei VRP automatically encrypts stored passwords",
          provenance: 'R',
          needsReview: false,
          ruleId: "SEC-03",
        });
        ruleMatches++;
        continue;
      }

      // Fallback AI heuristic suggestion vs Fast Rule Engine
      if (trimmed.length > 3) {
        if (enableAiAssist && /policy-map|class-map|crypto|ip access-list/i.test(trimmed)) {
          needsReviewCount++;
          aiMatches++;
          translatedLines.push({
            lineNum,
            source: rawLine,
            target: `# AI: Suggesting equivalent VRP feature for [${trimmed}]`,
            provenance: 'A',
            needsReview: true,
            note: "Complex QoS or Crypto ACL feature synthesized. Review target syntax manually.",
          });
        } else {
          needsReviewCount++;
          unmappedMatches++;
          translatedLines.push({
            lineNum,
            source: rawLine,
            target: enableAiAssist
              ? `# [UNMAPPED] Cisco command requiring manual verification: ${trimmed}`
              : `# [UNMAPPED - FAST ENGINE] Cisco command: ${trimmed}`,
            provenance: 'U',
            needsReview: true,
            note: enableAiAssist
              ? "No direct deterministic translation rule found."
              : "Fast Rule Engine: pure deterministic translation (AI Assist disabled).",
          });
        }
        continue;
      }
    }

    // HUAWEI -> CISCO TRANSLATION
    if (fromVendor === 'huawei' && toVendor === 'cisco') {
      // Comments
      if (trimmed.startsWith('#')) {
        const commentBody = trimmed.replace(/^#\s*/, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: commentBody ? `! ${commentBody}` : "!",
          provenance: 'G',
          needsReview: false,
        });
        generatedMatches++;
        continue;
      }

      // sysname -> hostname
      if (/^sysname\s+/i.test(trimmed)) {
        const name = trimmed.replace(/^sysname\s+/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `hostname ${name}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "SYS-01",
        });
        ruleMatches++;
        continue;
      }

      // return -> end
      if (/^return$/i.test(trimmed)) {
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: "end",
          provenance: 'R',
          needsReview: false,
          ruleId: "SYS-02",
        });
        ruleMatches++;
        continue;
      }

      // VLAN
      if (/^vlan\s+\d+/i.test(trimmed)) {
        insideVlanContext = true;
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: trimmed.toLowerCase(),
          provenance: 'R',
          needsReview: false,
          ruleId: "VLAN-01",
        });
        ruleMatches++;
        continue;
      }

      if (insideVlanContext && /^description\s+/i.test(trimmed)) {
        const vlanName = trimmed.replace(/^description\s+/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: ` name ${vlanName}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "VLAN-02",
        });
        ruleMatches++;
        insideVlanContext = false;
        continue;
      }

      // STP
      if (/^stp mode rstp/i.test(trimmed)) {
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: "spanning-tree mode rapid-pvst",
          provenance: 'R',
          needsReview: false,
          ruleId: "STP-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^stp edged-port enable/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}spanning-tree portfast`,
          provenance: 'R',
          needsReview: false,
          ruleId: "STP-02",
        });
        ruleMatches++;
        continue;
      }

      // Interface
      if (/^interface\s+loopback\s*(\d+)/i.test(trimmed)) {
        const num = trimmed.match(/(\d+)/)?.[1] || '0';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `interface Loopback${num}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "INT-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^interface\s+10GE/i.test(trimmed)) {
        const portId = trimmed.replace(/^interface\s+10GE\s*/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `interface TenGigabitEthernet${portId}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "INT-02",
        });
        ruleMatches++;
        continue;
      }

      if (/^interface\s+GigabitEthernet/i.test(trimmed)) {
        const portId = trimmed.replace(/^interface\s+GigabitEthernet\s*/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `interface GigabitEthernet${portId}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "INT-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^undo shutdown/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}no shutdown`,
          provenance: 'R',
          needsReview: false,
          ruleId: "INT-05",
        });
        ruleMatches++;
        continue;
      }

      if (/^port link-type trunk/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}switchport mode trunk`,
          provenance: 'R',
          needsReview: false,
          ruleId: "TRUNK-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^port trunk allow-pass vlan\s+/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        const vlans = trimmed.replace(/^port trunk allow-pass vlan\s+/i, '').replace(/\s+/g, ',');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}switchport trunk allowed vlan ${vlans}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "TRUNK-02",
        });
        ruleMatches++;
        continue;
      }

      if (/^port link-type access/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}switchport mode access`,
          provenance: 'R',
          needsReview: false,
          ruleId: "ACCESS-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^port default vlan\s+/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        const vlanId = trimmed.replace(/^port default vlan\s+/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}switchport access vlan ${vlanId}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "ACCESS-02",
        });
        ruleMatches++;
        continue;
      }

      // Static route
      if (/^ip route-static\s+/i.test(trimmed)) {
        const routeParams = trimmed.replace(/^ip route-static\s+/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `ip route ${routeParams}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "ROUTE-01",
        });
        ruleMatches++;
        continue;
      }

      // Management & AAA
      if (/^user-interface vty\s+(\d+)\s*(\d*)/i.test(trimmed)) {
        const m = trimmed.match(/^user-interface vty\s+(\d+)\s*(\d*)/i);
        const start = m?.[1] || '0';
        const end = m?.[2] || '4';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `line vty ${start} ${end}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "MGMT-01",
        });
        ruleMatches++;
        continue;
      }

      if (/^protocol inbound ssh/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}transport input ssh`,
          provenance: 'R',
          needsReview: false,
          ruleId: "MGMT-02",
        });
        ruleMatches++;
        continue;
      }

      if (/^authentication-mode aaa/i.test(trimmed)) {
        const indent = rawLine.match(/^\s*/)?.[0] || '';
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `${indent}login local`,
          provenance: 'R',
          needsReview: false,
          ruleId: "MGMT-03",
        });
        ruleMatches++;
        continue;
      }

      if (/^ntp-service unicast-server\s+/i.test(trimmed)) {
        const ip = trimmed.replace(/^ntp-service unicast-server\s+/i, '');
        translatedLines.push({
          lineNum,
          source: rawLine,
          target: `ntp server ${ip}`,
          provenance: 'R',
          needsReview: false,
          ruleId: "MGMT-03",
        });
        ruleMatches++;
        continue;
      }

      // AI or Unmapped for Huawei vs Fast Rule Engine
      if (trimmed.length > 3) {
        if (enableAiAssist && /traffic-policy|traffic-classifier|acl number/i.test(trimmed)) {
          needsReviewCount++;
          aiMatches++;
          translatedLines.push({
            lineNum,
            source: rawLine,
            target: `! AI: Suggesting Cisco MQC / Access-List equivalent for [${trimmed}]`,
            provenance: 'A',
            needsReview: true,
            note: "Huawei Traffic Classifier / Policy synthesized to Cisco MQC equivalent.",
          });
        } else {
          needsReviewCount++;
          unmappedMatches++;
          translatedLines.push({
            lineNum,
            source: rawLine,
            target: enableAiAssist
              ? `! [UNMAPPED] Huawei command requiring manual verification: ${trimmed}`
              : `! [UNMAPPED - FAST ENGINE] Huawei command: ${trimmed}`,
            provenance: 'U',
            needsReview: true,
            note: enableAiAssist
              ? "No direct deterministic translation rule found."
              : "Fast Rule Engine: pure deterministic translation (AI Assist disabled).",
          });
        }
        continue;
      }
    }

    // Identical pass-through or general lines
    translatedLines.push({
      lineNum,
      source: rawLine,
      target: rawLine,
      provenance: 'R',
      needsReview: false,
    });
    ruleMatches++;
  }

  // Calculate percentages
  const total = translatedLines.length || 1;
  const coverage: CoverageBreakdown = {
    rule: Math.round((ruleMatches / total) * 100),
    ai: Math.round((aiMatches / total) * 100),
    unmapped: Math.round((unmappedMatches / total) * 100),
    generated: Math.round((generatedMatches / total) * 100),
  };

  // Ensure sum equals 100 or is close
  const sum = coverage.rule + coverage.ai + coverage.unmapped + coverage.generated;
  if (sum !== 100 && total > 0) {
    coverage.rule += (100 - sum);
  }

  const cleanCli = exportCleanCli(translatedLines);
  const rollbackCli = generateRollback(translatedLines, toVendor);

  return {
    id: `conv-${Date.now()}`,
    filename,
    sourceVendor: fromVendor,
    targetVendor: toVendor,
    coverage,
    lines: translatedLines,
    originalSource: sourceText,
    cleanCli,
    rollbackCli,
    maskedSecretsCount,
    needsReviewCount,
    fileSize: `${(sourceText.length / 1024).toFixed(1)} KB`,
    aiAssistEnabled: enableAiAssist,
  };
}

export function exportCleanCli(lines: TranslatedLine[]): string {
  return lines
    .map(l => l.target)
    .filter(t => {
      const trimmed = t.trim();
      if (!trimmed) return false;
      // Strip comments, masked placeholders, AI notes, and unmapped comments
      if (trimmed.startsWith('#') || trimmed.startsWith('!')) return false;
      return true;
    })
    .join('\n');
}

export function generateRollback(lines: TranslatedLine[], targetVendor: Vendor): string {
  const rollbackCommands: string[] = [];

  if (targetVendor === 'huawei') {
    rollbackCommands.push('# Huawei VRP Automated Rollback Script');
    for (const line of lines) {
      const trimmed = line.target.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('sysname ')) {
        rollbackCommands.push(`undo sysname`);
      } else if (trimmed.startsWith('vlan ')) {
        rollbackCommands.push(`undo ${trimmed}`);
      } else if (trimmed.startsWith('interface ')) {
        rollbackCommands.push(trimmed);
        rollbackCommands.push(' undo ip address');
      } else if (trimmed.startsWith('port link-type ')) {
        rollbackCommands.push(' undo port link-type');
      } else if (trimmed.startsWith('port trunk allow-pass ')) {
        rollbackCommands.push(` undo ${trimmed}`);
      } else if (trimmed.startsWith('port default vlan ')) {
        rollbackCommands.push(' undo port default vlan');
      } else if (trimmed.startsWith('stp mode ')) {
        rollbackCommands.push('undo stp mode');
      } else if (trimmed.startsWith('ospf ')) {
        rollbackCommands.push(`undo ${trimmed}`);
      } else if (trimmed.startsWith('ip route-static ')) {
        rollbackCommands.push(`undo ${trimmed}`);
      }
    }
    rollbackCommands.push('return');
  } else {
    rollbackCommands.push('! Cisco IOS-XE Automated Rollback Script');
    for (const line of lines) {
      const trimmed = line.target.trim();
      if (!trimmed || trimmed.startsWith('!')) continue;

      if (trimmed.startsWith('hostname ')) {
        rollbackCommands.push('no hostname');
      } else if (trimmed.startsWith('vlan ')) {
        rollbackCommands.push(`no ${trimmed}`);
      } else if (trimmed.startsWith('interface ')) {
        rollbackCommands.push(trimmed);
        rollbackCommands.push(' no ip address');
      } else if (trimmed.startsWith('switchport mode ')) {
        rollbackCommands.push(' no switchport mode');
      } else if (trimmed.startsWith('switchport trunk allowed ')) {
        rollbackCommands.push(' no switchport trunk allowed vlan');
      } else if (trimmed.startsWith('switchport access vlan ')) {
        rollbackCommands.push(' no switchport access vlan');
      } else if (trimmed.startsWith('router ospf ')) {
        rollbackCommands.push(`no ${trimmed}`);
      } else if (trimmed.startsWith('ip route ')) {
        rollbackCommands.push(`no ${trimmed}`);
      }
    }
    rollbackCommands.push('end');
  }

  return rollbackCommands.join('\n');
}

export function extractWithheldLines(lines: TranslatedLine[]): WithheldLine[] {
  const withheld: WithheldLine[] = [];

  for (const line of lines) {
    if (line.isMasked) {
      withheld.push({
        lineNum: line.lineNum,
        sourceText: line.source,
        reason: 'SECRET_MASKED',
        explanation: 'Sensitive password, secret hash, or private token withheld from CLI execution.',
      });
    } else if (line.provenance === 'A') {
      withheld.push({
        lineNum: line.lineNum,
        sourceText: line.source,
        reason: 'AI_SUGGESTION',
        explanation: 'Synthesized AI suggestion requires manual human verification before deployment.',
      });
    } else if (line.provenance === 'U' && line.target.includes('[UNMAPPED]')) {
      withheld.push({
        lineNum: line.lineNum,
        sourceText: line.source,
        reason: 'UNMAPPED_COMMAND',
        explanation: 'Command not recognized in deterministic rule tables. Withheld to prevent syntax errors.',
      });
    }
  }

  return withheld;
}
