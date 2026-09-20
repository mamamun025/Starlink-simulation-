/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { SatelliteInstance } from './Satellite3D';

export interface MarkerConfig {
  id: string;
  label: string;
  tag: string;
  detail: string;
  colorHex: string;
  glowColor: string;
  offsetX: number;
  offsetY: number;
}

export const MARKER_CONFIGS: Record<string, MarkerConfig> = {
  userTerminal: {
    id: 'userTerminal',
    label: 'Dishy Terminal #1',
    tag: 'Phased-Array • Ku/Ka',
    detail: 'Rockies Outpost (Elev. 3,100m ASL)',
    colorHex: '#00e5ff',
    glowColor: 'rgba(0, 229, 255, 0.4)',
    offsetX: 32,
    offsetY: -38,
  },
  userTerminal2: {
    id: 'userTerminal2',
    label: 'Dishy Terminal #2',
    tag: 'Phased-Array • Ku/Ka',
    detail: 'Northern Basin Ridge (Elev. 2,450m ASL)',
    colorHex: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    offsetX: 32,
    offsetY: 34,
  },
  activeSat: {
    id: 'activeSat',
    label: 'Starlink Sat (Active)',
    tag: 'LEO 550km Orbit',
    detail: 'Downlink/Uplink Ku-Band',
    colorHex: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    offsetX: 34,
    offsetY: -42,
  },
  laserLink: {
    id: 'laserLink',
    label: 'Space Laser Link (ISL)',
    tag: 'Optical Crosslink',
    detail: '100 Gbps Inter-Satellite Mesh',
    colorHex: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    offsetX: 28,
    offsetY: -40,
  },
  relaySat: {
    id: 'relaySat',
    label: 'Starlink Sat (Relay)',
    tag: 'Laser Mesh Node',
    detail: 'Feeder Sat to Gateway',
    colorHex: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.4)',
    offsetX: 32,
    offsetY: -38,
  },
  groundGateway: {
    id: 'groundGateway',
    label: 'Ground Gateway Station',
    tag: 'Ka-Band Radomes',
    detail: 'Phoenix Teleport (33.5°N)',
    colorHex: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    offsetX: 32,
    offsetY: -42,
  },
  approachingSat: {
    id: 'approachingSat',
    label: 'Next Satellite',
    tag: 'Handover Target',
    detail: 'Ascending Orbital Track',
    colorHex: '#818cf8',
    glowColor: 'rgba(129, 140, 248, 0.4)',
    offsetX: 32,
    offsetY: -36,
  },
  fiberGrid: {
    id: 'fiberGrid',
    label: 'Terrestrial Fiber Grid',
    tag: 'Tier-1 Internet Backbone',
    detail: 'Dallas / Regional Internet Exchange',
    colorHex: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    offsetX: 30,
    offsetY: 28,
  },
};

export class TrackingMarkersManager {
  private container: HTMLDivElement;
  private markerElements: Map<string, HTMLElement> = new Map();
  private isVisible = true;
  private tempCamForward = new THREE.Vector3();
  private tempVec = new THREE.Vector3();
  private tempRayDir = new THREE.Vector3();

  constructor(parentContainer: HTMLDivElement) {
    this.container = document.createElement('div');
    this.container.id = 'scene-tracking-markers-overlay';
    this.container.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 25;
      user-select: none;
    `;
    parentContainer.appendChild(this.container);

    this.initMarkerElements();
  }

  public setVisible(visible: boolean) {
    this.isVisible = visible;
    this.container.style.display = visible ? 'block' : 'none';
  }

  private initMarkerElements() {
    Object.values(MARKER_CONFIGS).forEach((cfg) => {
      const wrapper = document.createElement('div');
      wrapper.id = `marker-${cfg.id}`;
      wrapper.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        display: none;
        will-change: transform, opacity;
        pointer-events: auto;
      `;

      // Construct high-tech aerospace callout
      wrapper.innerHTML = `
        <div style="position: relative;">
          <!-- Reticle crosshair / anchor dot on object -->
          <div style="
            position: absolute;
            left: -6px;
            top: -6px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 1.5px solid ${cfg.colorHex};
            background: rgba(2, 6, 23, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 10px ${cfg.glowColor};
          ">
            <div style="
              width: 4px;
              height: 4px;
              border-radius: 50%;
              background: ${cfg.colorHex};
            "></div>
          </div>

          <!-- Connecting diagonal leader line (SVG) -->
          <svg style="
            position: absolute;
            left: 0;
            top: 0;
            width: 80px;
            height: 80px;
            pointer-events: none;
            overflow: visible;
          ">
            <polyline
              points="0,0 ${cfg.offsetX * 0.4},${cfg.offsetY * 0.6} ${cfg.offsetX},${cfg.offsetY}"
              fill="none"
              stroke="${cfg.colorHex}"
              stroke-width="1.2"
              stroke-dasharray="2,2"
              opacity="0.8"
            />
          </svg>

          <!-- Glass Callout Badge -->
          <div style="
            position: absolute;
            left: ${cfg.offsetX}px;
            top: ${cfg.offsetY}px;
            transform: translateY(-50%);
            padding: 4px 9px;
            background: rgba(2, 6, 23, 0.88);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(51, 65, 85, 0.7);
            border-left: 2.5px solid ${cfg.colorHex};
            border-radius: 6px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
            white-space: nowrap;
            color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.02em; color: #ffffff;">
                ${cfg.label}
              </span>
              <span style="
                font-size: 9px;
                font-weight: 600;
                padding: 1px 4px;
                border-radius: 3px;
                background: rgba(15, 23, 42, 0.8);
                color: ${cfg.colorHex};
                border: 0.5px solid ${cfg.colorHex}40;
              ">
                ${cfg.tag}
              </span>
            </div>
            <div style="font-size: 9.5px; color: #94a3b8; margin-top: 1px;">
              ${cfg.detail}
            </div>
          </div>
        </div>
      `;

      this.container.appendChild(wrapper);
      this.markerElements.set(cfg.id, wrapper);
    });
  }

  public update(
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    positions: {
      userTerminal?: THREE.Vector3 | null;
      userTerminal2?: THREE.Vector3 | null;
      activeSat?: SatelliteInstance | null;
      laserLink?: THREE.Vector3 | null;
      relaySat?: SatelliteInstance | null;
      groundGateway?: THREE.Vector3 | null;
      approachingSat?: SatelliteInstance | null;
      fiberGrid?: THREE.Vector3 | null;
    }
  ) {
    if (!this.isVisible) return;

    camera.getWorldDirection(this.tempCamForward);
    const camPos = camera.position;
    const earthRadius = 100;

    // Helper projection & occlusion test
    const projectAndCheck = (pos3D: THREE.Vector3 | null | undefined): { x: number; y: number; visible: boolean } => {
      if (!pos3D) return { x: 0, y: 0, visible: false };

      // 1. Frustum forward check
      this.tempVec.subVectors(pos3D, camPos);
      if (this.tempVec.dot(this.tempCamForward) <= 0.1) {
        return { x: 0, y: 0, visible: false };
      }

      // 2. Earth occlusion
      const distFromCenter = pos3D.length();

      if (distFromCenter <= earthRadius + 2.0) {
        // Ground object: check horizon normal
        const normal = pos3D.clone().normalize();
        const toCam = camPos.clone().sub(pos3D).normalize();
        if (normal.dot(toCam) < 0.08) {
          return { x: 0, y: 0, visible: false };
        }
      } else {
        // Space object: ray-sphere intersection with Earth
        this.tempRayDir.subVectors(pos3D, camPos).normalize();
        const tca = -camPos.dot(this.tempRayDir);
        if (tca > 0) {
          const camDist2 = camPos.lengthSq();
          const d2 = camDist2 - tca * tca;
          const sphereR2 = (earthRadius * 0.985) * (earthRadius * 0.985);
          if (d2 < sphereR2) {
            const thc = Math.sqrt(sphereR2 - d2);
            const t0 = tca - thc;
            const targetDist = camPos.distanceTo(pos3D);
            if (t0 > 0 && t0 < targetDist * 0.98) {
              return { x: 0, y: 0, visible: false };
            }
          }
        }
      }

      // 3. Project to Normalized Device Coordinates (NDC)
      this.tempVec.copy(pos3D).project(camera);
      if (this.tempVec.z > 1.0) {
        return { x: 0, y: 0, visible: false };
      }

      const screenX = (this.tempVec.x * 0.5 + 0.5) * width;
      const screenY = (-(this.tempVec.y * 0.5) + 0.5) * height;

      // Viewport margin check
      const margin = 20;
      if (screenX < margin || screenX > width - margin || screenY < margin || screenY > height - margin) {
        return { x: screenX, y: screenY, visible: false };
      }

      return { x: screenX, y: screenY, visible: true };
    };

    // User Terminals
    this.updateMarker('userTerminal', projectAndCheck(positions.userTerminal));
    this.updateMarker('userTerminal2', projectAndCheck(positions.userTerminal2));

    // Active Satellite
    const activeSatPos = positions.activeSat ? positions.activeSat.mesh.position : null;
    this.updateMarker('activeSat', projectAndCheck(activeSatPos));

    // Space Laser Link
    this.updateMarker('laserLink', projectAndCheck(positions.laserLink));

    // Relay Satellite
    const relaySatPos =
      positions.relaySat && positions.relaySat !== positions.activeSat
        ? positions.relaySat.mesh.position
        : null;
    this.updateMarker('relaySat', projectAndCheck(relaySatPos));

    // Ground Gateway
    this.updateMarker('groundGateway', projectAndCheck(positions.groundGateway));

    // Approaching Satellite
    const nextSatPos =
      positions.approachingSat &&
      positions.approachingSat !== positions.activeSat &&
      positions.approachingSat !== positions.relaySat
        ? positions.approachingSat.mesh.position
        : null;
    this.updateMarker('approachingSat', projectAndCheck(nextSatPos));

    // Terrestrial Fiber Grid
    this.updateMarker('fiberGrid', projectAndCheck(positions.fiberGrid));
  }

  private updateMarker(id: string, projected: { x: number; y: number; visible: boolean }) {
    const el = this.markerElements.get(id);
    if (!el) return;

    if (!projected.visible) {
      el.style.display = 'none';
      return;
    }

    el.style.display = 'block';
    el.style.transform = `translate3d(${projected.x}px, ${projected.y}px, 0)`;
  }

  public dispose() {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    this.markerElements.clear();
  }
}
