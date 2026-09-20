/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { createPhasedArrayTexture, createSolarPanelTexture } from '../utils/textures';

export interface SatelliteInstance {
  id: string;
  mesh: THREE.Group;
  planeIndex: number;
  indexInPlane: number;
  orbitalAngle: number; // in radians
  speed: number;
  ionPlume: THREE.Mesh;
  laserTerminals: THREE.Mesh[];
  phasedAntenna: THREE.Mesh;
  transponderCore: THREE.Mesh;
  isActive: boolean;
  isNextActive: boolean;
}

export class SatelliteFactory {
  private static solarTexture: THREE.CanvasTexture | null = null;
  private static phasedTexture: THREE.CanvasTexture | null = null;

  public static createSatelliteMesh(id: string): {
    group: THREE.Group;
    ionPlume: THREE.Mesh;
    laserTerminals: THREE.Mesh[];
    phasedAntenna: THREE.Mesh;
    transponderCore: THREE.Mesh;
  } {
    if (!this.solarTexture) this.solarTexture = createSolarPanelTexture();
    if (!this.phasedTexture) this.phasedTexture = createPhasedArrayTexture();

    const group = new THREE.Group();
    group.name = `sat_${id}`;

    // 1. Satellite Bus (Main flat-panel chassis with telemetry avionics)
    const busGeo = new THREE.BoxGeometry(2.4, 0.25, 1.2);
    const busMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.88,
      roughness: 0.2,
    });
    const bus = new THREE.Mesh(busGeo, busMat);
    group.add(bus);

    // Star Tracker optical navigation camera on zenith deck
    const starTrackerGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.18, 12);
    const starTrackerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
    const starTracker = new THREE.Mesh(starTrackerGeo, starTrackerMat);
    starTracker.position.set(0.4, 0.2, 0);
    group.add(starTracker);

    // 2. Underside: Phased Array Antenna (Earth-facing Nadir deck with Ku/Ka feeds)
    const antennaGeo = new THREE.PlaneGeometry(2.1, 0.95);
    const antennaMat = new THREE.MeshStandardMaterial({
      map: this.phasedTexture,
      roughness: 0.2,
      metalness: 0.75,
      side: THREE.DoubleSide,
    });
    const phasedAntenna = new THREE.Mesh(antennaGeo, antennaMat);
    phasedAntenna.rotation.x = Math.PI / 2;
    phasedAntenna.position.y = -0.13;
    group.add(phasedAntenna);

    // 3. Starlink V2 Mini Dual Articulating Solar Wings (Port and Starboard wings)
    const panelGeo = new THREE.PlaneGeometry(1.5, 4.8);
    const panelMat = new THREE.MeshStandardMaterial({
      map: this.solarTexture,
      roughness: 0.15,
      metalness: 0.92,
      side: THREE.DoubleSide,
    });
    const boomGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.65, 12);
    const boomMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });

    // Port Solar Wing (+Z)
    const portWing = new THREE.Group();
    const portPanel = new THREE.Mesh(panelGeo, panelMat);
    portPanel.rotation.x = Math.PI / 2;
    portPanel.position.z = 3.0;
    portWing.add(portPanel);
    const portBoom = new THREE.Mesh(boomGeo, boomMat);
    portBoom.rotation.x = Math.PI / 2;
    portBoom.position.z = 0.65;
    portWing.add(portBoom);
    group.add(portWing);

    // Starboard Solar Wing (-Z)
    const starboardWing = new THREE.Group();
    const starboardPanel = new THREE.Mesh(panelGeo, panelMat);
    starboardPanel.rotation.x = Math.PI / 2;
    starboardPanel.position.z = -3.0;
    starboardWing.add(starboardPanel);
    const starboardBoom = new THREE.Mesh(boomGeo, boomMat);
    starboardBoom.rotation.x = Math.PI / 2;
    starboardBoom.position.z = -0.65;
    starboardWing.add(starboardBoom);
    group.add(starboardWing);

    // 4. Hall-Effect Argon Ion Thruster (Rear Engine)
    const engineGeo = new THREE.CylinderGeometry(0.18, 0.25, 0.35, 16);
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.92,
      roughness: 0.25,
    });
    const engine = new THREE.Mesh(engineGeo, engineMat);
    engine.rotation.z = Math.PI / 2;
    engine.position.x = -1.35;
    group.add(engine);

    // Dual-layer Ion Plasma Exhaust Plume (Dense core + outer cyan glow)
    const plumeGroup = new THREE.Group();
    const plumeGeo = new THREE.ConeGeometry(0.24, 1.4, 16);
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const ionPlume = new THREE.Mesh(plumeGeo, plumeMat);
    ionPlume.rotation.z = -Math.PI / 2;
    ionPlume.position.x = -2.1;
    group.add(ionPlume);

    // Inner hot turquoise plasma core
    const corePlumeGeo = new THREE.ConeGeometry(0.12, 0.9, 12);
    const corePlumeMat = new THREE.MeshBasicMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const corePlume = new THREE.Mesh(corePlumeGeo, corePlumeMat);
    corePlume.rotation.z = -Math.PI / 2;
    corePlume.position.x = -1.8;
    group.add(corePlume);

    // 5. Optical Space Laser (ISL) Articulated Gimbal Turrets
    const laserTerminals: THREE.Mesh[] = [];
    const turretBaseGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.14, 12);
    const turretBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85 });

    const laserGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const laserMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Laser aperture emerald glow
      emissive: 0x059669,
      emissiveIntensity: 1.4,
      metalness: 0.9,
      roughness: 0.1,
    });

    // Front ISL gimbal turret
    const frontTurret = new THREE.Mesh(turretBaseGeo, turretBaseMat);
    frontTurret.position.set(1.22, 0.0, 0.3);
    group.add(frontTurret);
    const frontLaser = new THREE.Mesh(laserGeo, laserMat);
    frontLaser.position.set(1.24, 0.1, 0.3);
    group.add(frontLaser);
    laserTerminals.push(frontLaser);

    // Rear ISL gimbal turret
    const backTurret = new THREE.Mesh(turretBaseGeo, turretBaseMat);
    backTurret.position.set(-1.22, 0.0, -0.3);
    group.add(backTurret);
    const backLaser = new THREE.Mesh(laserGeo, laserMat);
    backLaser.position.set(-1.24, 0.1, -0.3);
    group.add(backLaser);
    laserTerminals.push(backLaser);

    // 6. Transponder Signal Core (lights up when RF data packets arrive)
    const coreGeo = new THREE.OctahedronGeometry(0.22, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00d2ff,
      emissiveIntensity: 0.5,
      metalness: 0.2,
      roughness: 0.1,
    });
    const transponderCore = new THREE.Mesh(coreGeo, coreMat);
    transponderCore.position.set(0, 0.22, 0);
    group.add(transponderCore);

    // Transponder Core Protective Housing Ring
    const ringGeo = new THREE.TorusGeometry(0.3, 0.04, 12, 24);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 });
    const coreRing = new THREE.Mesh(ringGeo, ringMat);
    coreRing.rotation.x = Math.PI / 2;
    coreRing.position.set(0, 0.2, 0);
    group.add(coreRing);

    // 7. Navigation strobe beacon (blinking red/green/white)
    const strobeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const strobeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const strobe = new THREE.Mesh(strobeGeo, strobeMat);
    strobe.position.set(1.2, 0.15, -0.5);
    strobe.name = 'strobe';
    group.add(strobe);

    // Scale satellite down to appropriate 3D scene size
    group.scale.set(0.65, 0.65, 0.65);

    return {
      group,
      ionPlume,
      laserTerminals,
      phasedAntenna,
      transponderCore,
    };
  }
}
