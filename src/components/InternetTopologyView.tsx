/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Network,
  X,
  Radio,
  Share2,
  Server,
  Cpu,
  Layers,
  Globe,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';

export type RoutingMode = 'laser-mesh' | 'bent-pipe';

interface PacketInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhase: number;
  routingMode: RoutingMode;
  onRoutingModeChange: (mode: RoutingMode) => void;
  playbackSpeed: number;
}

interface ProtocolLayer {
  layer: string;
  name: string;
  protocol: string;
  payload: string;
  color: string;
}

export const InternetTopologyView: React.FC<PacketInspectorProps> = ({
  isOpen,
  onClose,
  currentPhase,
  routingMode,
  onRoutingModeChange,
  playbackSpeed,
}) => {
  const [activeTab, setActiveTab] = useState<'flow' | 'bgp' | 'tcpip'>('flow');

  if (!isOpen) return null;

  // Real-world Internet AS topology for Starlink (SpaceX)
  const starlinkASN = 'AS14593';
  const starlinkSubnet = '98.97.0.0/17';
  const destinationServer = '1.1.1.1 (Cloudflare Anycast, AS13335)';

  const hops = [
    {
      id: 'hop-1',
      title: 'Hop 1: User Terminal (CPE)',
      node: 'Dishy Phased-Array (192.168.100.1)',
      layer: 'Layer 2/3 Encapsulation',
      details:
        'Local router encapsulates customer IPv4/IPv6 packet into Starlink proprietary radio frames using Ku/Ka band Orthogonal Frequency-Division Multiplexing (OFDM). Carrier-Grade NAT (CGNAT) applied.',
      active: currentPhase === 1,
      accent: 'text-cyan-400 border-cyan-500/50 bg-cyan-950/30',
      badge: 'Ku/Ka Phased Array',
    },
    {
      id: 'hop-2',
      title:
        routingMode === 'laser-mesh'
          ? 'Hop 2: LEO Laser Mesh (ISL Routing)'
          : 'Hop 2: LEO Satellite (Bent-Pipe Transponder)',
      node:
        routingMode === 'laser-mesh'
          ? 'SpaceX Starlink v2 Mini Constellation (Laser Crosslink)'
          : 'SpaceX Starlink Satellite (Single-hop RF Relay)',
      layer:
        routingMode === 'laser-mesh'
          ? 'Layer 3 Intersatellite Optical Mesh (SDN Routing)'
          : 'Layer 1/2 Frequency Translation (Ku-Uplink → Ka-Downlink)',
      details:
        routingMode === 'laser-mesh'
          ? 'Space Optical Intersatellite Links (ISLs) operating at 100+ Gbps per channel route traffic across orbital planes using shortest-path optical latency routing (c in vacuum vs 0.67c in terrestrial glass).'
          : 'Satellite acts as a direct microwave transponder without onboard routing table lookup, mirroring the Ku uplink beam directly down to the nearest regional gateway on Ka-band frequencies.',
      active: currentPhase === 2,
      accent:
        routingMode === 'laser-mesh'
          ? 'text-emerald-400 border-emerald-500/50 bg-emerald-950/30'
          : 'text-sky-400 border-sky-500/50 bg-sky-950/30',
      badge: routingMode === 'laser-mesh' ? '100 Gbps Laser Link' : 'Ku/Ka Transponder',
    },
    {
      id: 'hop-3',
      title: 'Hop 3: Ground Gateway Teleport',
      node: 'SpaceX Gateway Earth Station (Phoenix Teleport)',
      layer: 'Physical Gateway Termination',
      details:
        'Cluster of 1.5-meter tracking radomes receives high-gain Ka-band carrier, demodulates RF wave into Gigabit Ethernet frames, and injects data directly into dedicated SpaceX terrestrial fiber links.',
      active: currentPhase === 3,
      accent: 'text-amber-400 border-amber-500/50 bg-amber-950/30',
      badge: 'Ka-Band Radome Array',
    },
    {
      id: 'hop-4',
      title: 'Hop 4: Point of Presence (PoP) & BGP Peer',
      node: 'SpaceX AS14593 Edge Router (Los Angeles Equinix IBX LA3)',
      layer: 'Autonomous System Edge (BGP Border Gateway Protocol)',
      details:
        'Packets arrive at the regional Starlink Internet Exchange PoP. eBGP border routers peer with Tier 1 transit providers (Lumen, Cogent, Telia) and Anycast CDNs (Cloudflare, Google, Fastly) at zero loss.',
      active: currentPhase === 3 || currentPhase === 4,
      accent: 'text-purple-400 border-purple-500/50 bg-purple-950/30',
      badge: 'BGP AS14593 Edge',
    },
    {
      id: 'hop-5',
      title: 'Hop 5: Destination Public Internet Host',
      node: 'Target Host: 1.1.1.1 (AS13335 Cloudflare Core)',
      layer: 'Layer 7 Application Response & Return Trip',
      details:
        'DNS/HTTP request handled with total round-trip latency under 24–35ms. Return packets route inversely back through AS14593 edge, through the Gateway teleport, up to the passing satellite, and down to the user dish.',
      active: currentPhase === 4,
      accent: 'text-indigo-400 border-indigo-500/50 bg-indigo-950/30',
      badge: 'Global Anycast CDN',
    },
  ];

  const packetLayers: ProtocolLayer[] = [
    {
      layer: 'L7 Application',
      name: 'DNS / TLS 1.3 / HTTPS',
      protocol: 'HTTPS / DoH',
      payload: 'GET /dns-query?name=cloudflare.com [HTTP/3 QUIC]',
      color: 'border-pink-500/60 text-pink-300 bg-pink-950/30',
    },
    {
      layer: 'L4 Transport',
      name: 'TCP / UDP (QUIC)',
      protocol: 'UDP (Port 443) / TCP Window 65535',
      payload: 'Source Port: 52140 → Dest Port: 443 | ACK: 0x8F3A10C2',
      color: 'border-indigo-500/60 text-indigo-300 bg-indigo-950/30',
    },
    {
      layer: 'L3 Network',
      name: 'IPv4 / IPv6 (Starlink CGNAT)',
      protocol: 'IP Protocol 0x11 (UDP) / TTL: 58',
      payload: 'Src: 98.97.42.18 (AS14593) → Dst: 1.1.1.1 (AS13335)',
      color: 'border-cyan-500/60 text-cyan-300 bg-cyan-950/30',
    },
    {
      layer: 'L2 Space Link',
      name: 'Starlink Phased-Array Radio Frame',
      protocol: 'Proprietary SpaceX Adaptive Modulation & Coding',
      payload: 'Modulation: 64-QAM • Bandwidth: 250 MHz • BER: < 10⁻⁹',
      color: 'border-emerald-500/60 text-emerald-300 bg-emerald-950/30',
    },
    {
      layer: 'L1 Physical',
      name: 'Microwave Ku/Ka & Optical Laser',
      protocol: 'Ku: 10.7-12.7 GHz Downlink / Ka: 27.5-30.0 GHz Feeder',
      payload: 'ISL Optical Wavelength: 1550 nm DWDM • Power: -4.2 dBm',
      color: 'border-amber-500/60 text-amber-300 bg-amber-950/30',
    },
  ];

  return (
    <div
      id="internet-packet-inspector-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm select-none"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl text-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-slate-100 tracking-wide">
                  Internet Packet Flow & BGP Routing Inspector
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                  AS14593
                </span>
              </div>
              <p className="text-xs text-slate-400">
                True end-to-end TCP/IP telemetry: User Terminal → LEO Satellite → Ground Gateway → Global Internet
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close Inspector (Esc)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector & Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-800/60 bg-slate-900/30">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
            <button
              onClick={() => setActiveTab('flow')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'flow'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Hop-by-Hop Flow</span>
            </button>
            <button
              onClick={() => setActiveTab('bgp')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'bgp'
                  ? 'bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>BGP & Autonomous Systems</span>
            </button>
            <button
              onClick={() => setActiveTab('tcpip')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'tcpip'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>TCP/IP & Space Frame</span>
            </button>
          </div>

          {/* Architecture Switcher: Laser-Mesh vs Bent-Pipe */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Architecture:</span>
            <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <button
                onClick={() => onRoutingModeChange('laser-mesh')}
                title="Space Laser Mesh (Optical Intersatellite Links)"
                className={`px-2.5 py-1 rounded-md transition-all ${
                  routingMode === 'laser-mesh'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Laser Mesh (ISL)
              </button>
              <button
                onClick={() => onRoutingModeChange('bent-pipe')}
                title="Traditional Bent-Pipe Transponder (Single Hop)"
                className={`px-2.5 py-1 rounded-md transition-all ${
                  routingMode === 'bent-pipe'
                    ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bent-Pipe
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh]">
          {activeTab === 'flow' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Current Cinematic Phase: <strong className="text-white">Phase {currentPhase}</strong></span>
                <span>Speed: <strong className="text-amber-300">{playbackSpeed}x</strong></span>
              </div>

              {hops.map((hop, index) => (
                <div
                  key={hop.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    hop.active
                      ? `${hop.accent} shadow-md`
                      : 'border-slate-800/70 bg-slate-900/30 text-slate-400 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">{hop.title}</span>
                      {hop.active && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-400/20 text-cyan-300 animate-pulse">
                          <Zap className="w-2.5 h-2.5" /> Active Flow
                        </span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-slate-700/60 bg-slate-900 text-slate-300">
                      {hop.badge}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-300 mb-1">{hop.node}</div>
                  <div className="text-[11px] font-medium text-slate-400 mb-1.5">{hop.layer}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{hop.details}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'bgp' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-purple-400" />
                    Starlink Autonomous System Specification (AS14593)
                  </span>
                  <span className="text-[11px] font-mono text-purple-400">RFC 4271 BGP-4</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Starlink operates as an independent Tier 2 Internet Service Provider registered with ARIN, RIPE, and APNIC under <strong>AS14593</strong>. Customer IP prefixes are announced to global peers via Border Gateway Protocol (BGP-4) peering fabrics at major carrier hotels.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Autonomous System Details
                  </span>
                  <ul className="text-xs space-y-1 font-mono text-slate-400">
                    <li><strong className="text-slate-200">Origin ASN:</strong> AS14593 (SpaceX Starlink)</li>
                    <li><strong className="text-slate-200">Allocated Prefixes:</strong> ~1,840 IPv4 / 28 IPv6</li>
                    <li><strong className="text-slate-200">Typical Subnet:</strong> 98.97.0.0/17, 143.244.32.0/19</li>
                    <li><strong className="text-slate-200">IPv6 Deployment:</strong> Native /56 Delegated Prefix</li>
                    <li><strong className="text-slate-200">CGNAT Range:</strong> 100.64.0.0/10 (RFC 6598)</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    BGP Internet Peering Fabric
                  </span>
                  <ul className="text-xs space-y-1 font-mono text-slate-400">
                    <li><strong className="text-slate-200">Major IXPs:</strong> Any2West, Equinix LA/NY/CHI, DE-CIX</li>
                    <li><strong className="text-slate-200">Tier 1 Transit:</strong> Lumen (AS3356), Cogent (AS174)</li>
                    <li><strong className="text-slate-200">Direct CDN Peers:</strong> Cloudflare (AS13335), Google (AS15169)</li>
                    <li><strong className="text-slate-200">BGP Path:</strong> AS14593 → AS13335 (1 hop to 1.1.1.1)</li>
                    <li><strong className="text-slate-200">Routing Policy:</strong> Hot-Potato / Nearest Regional PoP</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-800 flex items-start gap-2 text-xs text-slate-400">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Why Latency is ~25ms:</strong> By combining LEO low orbital distance (~550 km) with low-altitude microwave propagation and direct BGP interconnects at the gateway's regional metro point of presence, Starlink achieves latencies comparable to terrestrial DSL and cable.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'tcpip' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Each packet traversing Starlink passes through classical OSI/DoD protocol stacks, wrapped in space-link RF modulation over the air:
              </div>

              {packetLayers.map((layer, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border ${layer.color} space-y-1`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-100">{layer.layer}: {layer.name}</span>
                    <span className="text-[10px] font-mono opacity-80">{layer.protocol}</span>
                  </div>
                  <div className="text-xs font-mono bg-black/40 px-2 py-1 rounded border border-white/5 overflow-x-auto text-slate-300">
                    {layer.payload}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/80 bg-slate-900/50 text-xs text-slate-400">
          <span>SpaceX Autonomous System AS14593 Protocol Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 font-medium transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
