/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { SatelliteInstance } from './Satellite3D';
import { RoutingMode } from './InternetTopologyView';

export class TransmissionBeams3D {
  public group: THREE.Group;
  public routingMode: RoutingMode = 'laser-mesh';

  // 1. Phased Array Microwave Cones
  private uplinkCone: THREE.Mesh;
  private uplinkCone2: THREE.Mesh;
  private handoffCone: THREE.Mesh;
  private downlinkCone: THREE.Mesh;

  // 2. Wavefront concentric pulses (visualizing phased array electromagnetic pulses)
  private uplinkRingsGroup: THREE.Group;
  private uplinkRings: THREE.Mesh[] = [];

  private downlinkRingsGroup: THREE.Group;
  private downlinkRings: THREE.Mesh[] = [];

  // 3. Space Laser Visual Beam (glowing emerald cylinder with UnrealBloom)
  private laserCylinder: THREE.Mesh;
  private laserCoreBeam: THREE.Line;

  // 4. Traveling Data Packet Particles
  private packetParticles: THREE.Points;
  private numPackets = 24; // Calm, clean, spaced-out data pulses (down from 72)

  constructor() {
    this.group = new THREE.Group();

    // Standard beam geometry oriented along Z
    const coneGeo = new THREE.CylinderGeometry(0.2, 2.4, 1, 32, 1, true);
    coneGeo.translate(0, 0.5, 0); // Origin at source
    coneGeo.rotateX(Math.PI / 2); // Align along Z

    // 1. Uplink Cone (Soft, calm translucent Electric Cyan RF Beam)
    const uplinkMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.09, // Soft, calm atmosphere
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.uplinkCone = new THREE.Mesh(coneGeo, uplinkMat);
    this.group.add(this.uplinkCone);

    // 1b. Uplink Cone #2 (Neighboring User Terminal #2, soft cyan-blue)
    const uplinkMat2 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.uplinkCone2 = new THREE.Mesh(coneGeo.clone(), uplinkMat2);
    this.group.add(this.uplinkCone2);

    // Side-Lobes / Grating Lobes Group (subtle, non-distracting)
    const sideLobeGeo = new THREE.ConeGeometry(0.8, 2.2, 16, 1, true);
    sideLobeGeo.translate(0, 1.1, 0);
    sideLobeGeo.rotateX(Math.PI / 2);
    const sideLobeMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.02, // Barely perceptible
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sideLobe1 = new THREE.Mesh(sideLobeGeo, sideLobeMat);
    this.group.add(sideLobe1);

    // Handoff Secondary Beam Cone (for incoming satellite during Phase 4 Make-Before-Break)
    const handoffMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.handoffCone = new THREE.Mesh(coneGeo.clone(), handoffMat);
    this.group.add(this.handoffCone);

    // Gateway Downlink Cone (Soft Gold / Amber RF Beam)
    const downlinkMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.09, // Soft, non-flashy
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.downlinkCone = new THREE.Mesh(coneGeo.clone(), downlinkMat);
    this.group.add(this.downlinkCone);

    // 2. Uplink Wavefront Rings (Gentle, spaced constructive interference wavefronts)
    this.uplinkRingsGroup = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(0.38, 0.44, 32); // Fine clean rings
    for (let i = 0; i < 4; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      this.uplinkRings.push(ring);
      this.uplinkRingsGroup.add(ring);
    }
    this.group.add(this.uplinkRingsGroup);

    // Downlink Wavefront Rings (Calm amber pulses descending to gateway)
    this.downlinkRingsGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo.clone(), ringMat);
      this.downlinkRings.push(ring);
      this.downlinkRingsGroup.add(ring);
    }
    this.group.add(this.downlinkRingsGroup);

    // 3. Space Laser Link (Soft, elegant collimated optical beam)
    const laserGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 16, 1, true);
    laserGeo.translate(0, 0.5, 0);
    laserGeo.rotateX(Math.PI / 2);

    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x10b981, // Softer Emerald Green ISL sheath
      transparent: true,
      opacity: 0.4, // Reduced from 0.75
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.laserCylinder = new THREE.Mesh(laserGeo, laserMat);
    this.group.add(this.laserCylinder);

    // Central core optical ray
    const coreRayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 1),
    ]);
    const coreRayMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7, // Softened from 0.98
      blending: THREE.AdditiveBlending,
    });
    this.laserCoreBeam = new THREE.Line(coreRayGeo, coreRayMat);
    this.group.add(this.laserCoreBeam);

    // 4. Data Packets (Smooth, gentle traveling light beads)
    const packetPositions = new Float32Array(this.numPackets * 3);
    const packetColors = new Float32Array(this.numPackets * 3);
    const packetGeo = new THREE.BufferGeometry();
    packetGeo.setAttribute('position', new THREE.BufferAttribute(packetPositions, 3));
    packetGeo.setAttribute('color', new THREE.BufferAttribute(packetColors, 3));

    const packetMat = new THREE.PointsMaterial({
      size: 1.2, // Reduced from 1.8 for clean, elegant appearance
      vertexColors: true,
      transparent: true,
      opacity: 0.75, // Softened from 0.95
      blending: THREE.AdditiveBlending,
    });
    this.packetParticles = new THREE.Points(packetGeo, packetMat);
    this.group.add(this.packetParticles);
  }

  public update(
    time: number,
    dishPos: THREE.Vector3,
    gatewayPos: THREE.Vector3,
    activeSat: SatelliteInstance | null,
    nextSat: SatelliteInstance | null,
    gatewaySat: SatelliteInstance | null,
    phase: number, // 1 to 4
    handoffProgress: number,
    dish2Pos?: THREE.Vector3
  ) {
    // 1. Orient & Scale Uplink Beam Cone: Dish -> Active Satellite
    if (activeSat) {
      this.orientBeam(this.uplinkCone, dishPos, activeSat.mesh.position, 2.2);
      this.uplinkCone.visible = true;

      // Animate concentric wavefront rings along the beam
      const dir = activeSat.mesh.position.clone().sub(dishPos);
      const beamLength = dir.length();
      const normDir = dir.clone().normalize();

      this.uplinkRings.forEach((ring, i) => {
        const offset = (time * 0.15 + i / this.uplinkRings.length) % 1.0;
        const pos = dishPos.clone().add(normDir.clone().multiplyScalar(offset * beamLength));
        ring.position.copy(pos);
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normDir);

        const scale = 0.6 + offset * 2.5;
        ring.scale.set(scale, scale, scale);

        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = (1.0 - offset) * 0.28;
      });
      this.uplinkRingsGroup.visible = true;
    } else {
      this.uplinkCone.visible = false;
      this.uplinkRingsGroup.visible = false;
    }

    // 1b. Orient & Scale Uplink Beam Cone for Nearby Dishy #2
    if (activeSat && dish2Pos) {
      this.orientBeam(this.uplinkCone2, dish2Pos, activeSat.mesh.position, 2.0);
      this.uplinkCone2.visible = true;
    } else {
      this.uplinkCone2.visible = false;
    }

    // 2. Orient Handoff Secondary Beam Cone (Phase 4 active handover)
    if (nextSat && (phase === 4 || handoffProgress > 0.05)) {
      this.orientBeam(this.handoffCone, dishPos, nextSat.mesh.position, 2.2);
      const handoffMat = this.handoffCone.material as THREE.MeshBasicMaterial;
      const opacity = phase === 4 ? 0.45 : THREE.MathUtils.lerp(0.0, 0.45, handoffProgress);
      handoffMat.opacity = opacity;
      this.handoffCone.visible = true;
    } else {
      this.handoffCone.visible = false;
    }

    // 3. Orient Downlink Beam Cone: Gateway Satellite -> Ground Gateway Radomes
    if (gatewaySat) {
      this.orientBeam(this.downlinkCone, gatewaySat.mesh.position, gatewayPos, 2.2);
      this.downlinkCone.visible = true;

      // Downlink wavefront rings descending from satellite to ground
      const dir = gatewayPos.clone().sub(gatewaySat.mesh.position);
      const beamLength = dir.length();
      const normDir = dir.clone().normalize();

      this.downlinkRings.forEach((ring, i) => {
        const offset = (time * 0.15 + i / this.downlinkRings.length) % 1.0;
        const pos = gatewaySat.mesh.position.clone().add(normDir.clone().multiplyScalar(offset * beamLength));
        ring.position.copy(pos);
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normDir);

        const scale = 0.5 + offset * 2.5;
        ring.scale.set(scale, scale, scale);

        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = (1.0 - offset) * 0.28;
      });
      this.downlinkRingsGroup.visible = true;
    } else {
      this.downlinkCone.visible = false;
      this.downlinkRingsGroup.visible = false;
    }

    // 4. Orient Space Laser Link: Active Sat <---> Gateway Sat (Only in laser-mesh mode)
    if (this.routingMode === 'laser-mesh' && activeSat && gatewaySat && activeSat !== gatewaySat) {
      this.orientBeam(this.laserCylinder, activeSat.mesh.position, gatewaySat.mesh.position, 0.08);
      this.laserCylinder.visible = true;

      // Update core ray line geometry
      const rayPos = this.laserCoreBeam.geometry.attributes.position as THREE.BufferAttribute;
      rayPos.setXYZ(0, activeSat.mesh.position.x, activeSat.mesh.position.y, activeSat.mesh.position.z);
      rayPos.setXYZ(1, gatewaySat.mesh.position.x, gatewaySat.mesh.position.y, gatewaySat.mesh.position.z);
      rayPos.needsUpdate = true;
      this.laserCoreBeam.visible = true;
    } else {
      this.laserCylinder.visible = false;
      this.laserCoreBeam.visible = false;
    }

    // 5. Animate Full Loop Data Packet Pulses
    this.updateDataPackets(time, dishPos, gatewayPos, activeSat, nextSat, gatewaySat, phase, dish2Pos);
  }

  private orientBeam(mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3, baseRadius: number) {
    const dir = to.clone().sub(from);
    const length = dir.length();

    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
    mesh.scale.set(baseRadius, baseRadius, length);
  }

  private updateDataPackets(
    time: number,
    dishPos: THREE.Vector3,
    gatewayPos: THREE.Vector3,
    activeSat: SatelliteInstance | null,
    nextSat: SatelliteInstance | null,
    gatewaySat: SatelliteInstance | null,
    phase: number,
    dish2Pos?: THREE.Vector3
  ) {
    if (!activeSat) return;

    const positions = this.packetParticles.geometry.attributes.position.array as Float32Array;
    const colors = this.packetParticles.geometry.attributes.color.array as Float32Array;

    const sat1Pos = activeSat.mesh.position;
    // In bent-pipe mode, sat1 downlinks directly to ground gateway (single-hop transponder)
    const sat2Pos = this.routingMode === 'laser-mesh'
      ? (gatewaySat ? gatewaySat.mesh.position : sat1Pos)
      : sat1Pos;
    const nextPos = nextSat ? nextSat.mesh.position : sat1Pos;

    const packetsPerStage = this.numPackets / 4;

    for (let i = 0; i < this.numPackets; i++) {
      const stage = Math.floor(i / packetsPerStage);
      const stageIdx = i % packetsPerStage;
      const speed = 0.12; // Ultra calm, visible particle glide
      const progress = (time * speed + stageIdx / packetsPerStage) % 1.0;

      let p = new THREE.Vector3();
      let cr = 1, cg = 1, cb = 1;

      if (stage === 0) {
        // Stage 0: Uplink (Dishes -> Sat1, Electric Cyan & Sky Blue RF)
        // If in phase 4 (handover), half of packets stream to nextSat
        if (phase === 4 && stageIdx % 2 === 1) {
          p.lerpVectors(dishPos, nextPos, progress);
          cr = 0.5; cg = 0.55; cb = 1.0;
        } else if (dish2Pos && stageIdx % 2 === 1) {
          // Packet streams up from nearby Dishy #2
          p.lerpVectors(dish2Pos, sat1Pos, progress);
          cr = 0.22; cg = 0.74; cb = 1.0; // Sky Blue
        } else {
          p.lerpVectors(dishPos, sat1Pos, progress);
          cr = 0.0; cg = 0.95; cb = 1.0; // Electric Cyan
        }
      } else if (stage === 1) {
        if (this.routingMode === 'laser-mesh') {
          // Stage 1: Space Optical Laser Link (Sat1 -> Sat2, Emerald Green)
          p.lerpVectors(sat1Pos, sat2Pos, progress);
          cr = 0.06; cg = 1.0; cb = 0.45; // Emerald Laser
        } else {
          // Bent-Pipe: Direct onboard microwave transponder frequency translation
          p.lerpVectors(sat1Pos, sat2Pos, progress);
          cr = 0.38; cg = 0.74; cb = 0.98; // Sky Blue Transponder
        }
      } else if (stage === 2) {
        // Stage 2: Downlink (Sat2 -> Ground Gateway, Golden Amber RF)
        p.lerpVectors(sat2Pos, gatewayPos, progress);
        cr = 1.0; cg = 0.7; cb = 0.08; // Golden Amber
      } else {
        // Stage 3: Return Response Loop (Gateway -> Sat2 -> Sat1 -> Dish)
        if (progress < 0.33) {
          p.lerpVectors(gatewayPos, sat2Pos, progress * 3);
          cr = 1.0; cg = 0.8; cb = 0.2;
        } else if (progress < 0.66) {
          p.lerpVectors(sat2Pos, sat1Pos, (progress - 0.33) * 3);
          cr = this.routingMode === 'laser-mesh' ? 0.2 : 0.4;
          cg = 1.0;
          cb = this.routingMode === 'laser-mesh' ? 0.6 : 0.9;
        } else {
          p.lerpVectors(sat1Pos, dishPos, (progress - 0.66) * 3);
          cr = 0.1; cg = 0.9; cb = 1.0;
        }
      }

      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      colors[i * 3] = cr;
      colors[i * 3 + 1] = cg;
      colors[i * 3 + 2] = cb;
    }

    this.packetParticles.geometry.attributes.position.needsUpdate = true;
    this.packetParticles.geometry.attributes.color.needsUpdate = true;
  }
}
