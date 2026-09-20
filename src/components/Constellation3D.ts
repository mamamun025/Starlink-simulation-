/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { EARTH_RADIUS, LEO_ORBIT_RADIUS } from './Earth3D';
import { SatelliteFactory, SatelliteInstance } from './Satellite3D';
import { createHexCellTexture } from '../utils/textures';

export interface ConstellationState {
  activeSat: SatelliteInstance | null;
  nextSat: SatelliteInstance | null;
  activeGatewaySat: SatelliteInstance | null;
  elevationAngle: number;
  beamSteerAngle: number;
  handoffProgress: number;
  laserLinkedPair: [SatelliteInstance, SatelliteInstance] | null;
}

export class Constellation3D {
  public group: THREE.Group;
  public satellites: SatelliteInstance[] = [];
  public orbitLinesGroup: THREE.Group;
  public laserBeamsGroup: THREE.Group;
  public laserBeamLines: THREE.LineSegments;
  public hexFootprintMesh: THREE.Mesh;

  private numPlanes = 5;
  private satsPerPlane = 8;
  private inclination = 53 * (Math.PI / 180); // 53 degree inclination of Starlink shell
  private orbitSpeed = 0.035; // Gentle, majestic orbital velocity

  // Handoff state tracking
  private currentActiveSatIndex = -1;
  private currentNextSatIndex = -1;
  private handoffTimer = 0;

  constructor() {
    this.group = new THREE.Group();
    this.orbitLinesGroup = new THREE.Group();
    this.laserBeamsGroup = new THREE.Group();
    this.group.add(this.orbitLinesGroup);
    this.group.add(this.laserBeamsGroup);

    this.createConstellation();
    this.laserBeamLines = this.createLaserLinesMesh();
    this.laserBeamsGroup.add(this.laserBeamLines);

    // Dynamic Hexagonal Coverage Cell Footprint on Earth's surface
    const hexTex = createHexCellTexture();
    const footprintGeo = new THREE.PlaneGeometry(18, 18);
    const footprintMat = new THREE.MeshBasicMaterial({
      map: hexTex,
      transparent: true,
      opacity: 0.25, // Gentle, tactical ground projection (down from 0.8)
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.hexFootprintMesh = new THREE.Mesh(footprintGeo, footprintMat);
    this.hexFootprintMesh.visible = false;
    this.group.add(this.hexFootprintMesh);
  }

  private createConstellation() {
    let satCounter = 1;

    for (let p = 0; p < this.numPlanes; p++) {
      // Longitude of Ascending Node (RAAN) spaced around globe
      const raan = (p / this.numPlanes) * Math.PI * 2;

      // 1. Draw orbital path ring
      const orbitCurve = new THREE.EllipseCurve(
        0, 0,
        LEO_ORBIT_RADIUS, LEO_ORBIT_RADIUS,
        0, 2 * Math.PI,
        false,
        0
      );
      const points = orbitCurve.getPoints(120);
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(
        points.map((pt) => new THREE.Vector3(pt.x, 0, pt.y))
      );
      const orbitMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.18,
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);

      // Rotate orbit plane to 53 degrees inclination and appropriate RAAN
      orbitLine.rotation.z = this.inclination;
      orbitLine.rotation.y = raan;
      this.orbitLinesGroup.add(orbitLine);

      // 2. Populate satellites in this plane
      for (let s = 0; s < this.satsPerPlane; s++) {
        // Stagger satellites evenly in true anomaly
        const angle = (s / this.satsPerPlane) * Math.PI * 2 + (p * 0.4);
        const satId = `STARLINK-${satCounter.toString().padStart(3, '0')}`;
        satCounter++;

        const { group, ionPlume, laserTerminals, phasedAntenna, transponderCore } =
          SatelliteFactory.createSatelliteMesh(satId);

        const instance: SatelliteInstance = {
          id: satId,
          mesh: group,
          planeIndex: p,
          indexInPlane: s,
          orbitalAngle: angle,
          speed: this.orbitSpeed + (Math.random() - 0.5) * 0.002,
          ionPlume,
          laserTerminals,
          phasedAntenna,
          transponderCore,
          isActive: false,
          isNextActive: false,
        };

        this.satellites.push(instance);
        this.group.add(group);
      }
    }
  }

  private createLaserLinesMesh(): THREE.LineSegments {
    // Inter-satellite laser lines buffer
    // Connect each satellite to its neighbor in the same plane + cross-plane link
    const maxLaserPairs = this.satellites.length * 2;
    const positions = new Float32Array(maxLaserPairs * 6);
    const colors = new Float32Array(maxLaserPairs * 6);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.LineSegments(geo, mat);
  }

  public update(
    delta: number,
    simSpeed: number,
    userPos: THREE.Vector3,
    gatewayPos: THREE.Vector3
  ): ConstellationState {
    const time = performance.now() * 0.001;

    // 1. Move all satellites along their Keplerian orbits
    this.satellites.forEach((sat) => {
      sat.orbitalAngle += delta * sat.speed * simSpeed;

      const raan = (sat.planeIndex / this.numPlanes) * Math.PI * 2;

      // Position along circular orbit in plane coordinates
      const unrotated = new THREE.Vector3(
        LEO_ORBIT_RADIUS * Math.cos(sat.orbitalAngle),
        0,
        LEO_ORBIT_RADIUS * Math.sin(sat.orbitalAngle)
      );

      // Rotate by inclination then RAAN
      unrotated.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.inclination);
      unrotated.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

      sat.mesh.position.copy(unrotated);

      // 2. Orient satellite:
      // Nadir: belly (phased antenna) faces Earth center (0, 0, 0)
      const toEarth = new THREE.Vector3(0, 0, 0).sub(sat.mesh.position).normalize();

      // Velocity tangent vector
      const nextAngle = sat.orbitalAngle + 0.01;
      const nextPos = new THREE.Vector3(
        LEO_ORBIT_RADIUS * Math.cos(nextAngle),
        0,
        LEO_ORBIT_RADIUS * Math.sin(nextAngle)
      );
      nextPos.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.inclination);
      nextPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
      const velocityDir = nextPos.sub(unrotated).normalize();

      // Look direction: forward velocity, with down pointing towards Earth
      const m = new THREE.Matrix4();
      const right = new THREE.Vector3().crossVectors(toEarth, velocityDir).normalize();
      const up = new THREE.Vector3().crossVectors(velocityDir, right).normalize();
      m.makeBasis(velocityDir, up, right);
      sat.mesh.quaternion.setFromRotationMatrix(m);

      // Animate ion thruster plume flicker
      const plumeScale = 0.8 + Math.sin(time * 18 + sat.orbitalAngle * 5) * 0.25;
      sat.ionPlume.scale.set(plumeScale, plumeScale, plumeScale * 1.2);
    });

    // 3. Find candidates for User Terminal connection
    // Calculate elevation angle from user dish
    const userUp = userPos.clone().normalize();
    const visibleSats: { sat: SatelliteInstance; elevation: number; dist: number }[] = [];

    this.satellites.forEach((sat) => {
      const satPos = sat.mesh.position;
      const toSat = satPos.clone().sub(userPos);
      const dist = toSat.length();
      const toSatNorm = toSat.clone().normalize();

      // Elevation angle = 90 - angle from zenith (userUp)
      const zenithCos = userUp.dot(toSatNorm);
      const elevationDeg = 90 - (Math.acos(Math.max(-1, Math.min(1, zenithCos))) * 180) / Math.PI;

      if (elevationDeg > 20) {
        visibleSats.push({ sat, elevation: elevationDeg, dist });
      }
    });

    // Sort by elevation (highest in sky is best)
    visibleSats.sort((a, b) => b.elevation - a.elevation);

    let activeSat: SatelliteInstance | null = null;
    let nextSat: SatelliteInstance | null = null;
    let currentElevation = 0;

    if (visibleSats.length > 0) {
      activeSat = visibleSats[0].sat;
      currentElevation = visibleSats[0].elevation;

      if (visibleSats.length > 1) {
        nextSat = visibleSats[1].sat;
      } else {
        // Fallback: next satellite in the same plane
        const planeSats = this.satellites.filter((s) => s.planeIndex === activeSat!.planeIndex);
        const nextIdx = (activeSat.indexInPlane + 1) % planeSats.length;
        nextSat = planeSats[nextIdx];
      }
    } else {
      // If no satellite directly overhead, pick closest satellite
      let minDist = Infinity;
      this.satellites.forEach((sat) => {
        const d = sat.mesh.position.distanceTo(userPos);
        if (d < minDist) {
          minDist = d;
          activeSat = sat;
        }
      });
      currentElevation = 35;
    }

    // Reset status flags
    this.satellites.forEach((s) => {
      s.isActive = s === activeSat;
      s.isNextActive = s === nextSat;
    });

    // 4. Calculate beam steering angle from dish zenith
    const activeSatPos = activeSat ? activeSat.mesh.position : new THREE.Vector3(0, LEO_ORBIT_RADIUS, 0);
    const toActive = activeSatPos.clone().sub(userPos).normalize();
    const steerCos = userUp.dot(toActive);
    const steerAngle = Math.acos(Math.max(-1, Math.min(1, steerCos))) * (180 / Math.PI);

    // Handoff progress calculation (simulated hysteresis when sat drops towards 25° horizon)
    let handoffProg = 0;
    if (currentElevation < 40) {
      handoffProg = THREE.MathUtils.clamp((40 - currentElevation) / 15, 0, 1);
    }

    // 5. Find Gateway Satellite (closest satellite to ground gateway station)
    let activeGatewaySat: SatelliteInstance | null = null;
    let minGwDist = Infinity;
    this.satellites.forEach((sat) => {
      // Gateway wants a satellite slightly different than user sat to demonstrate space laser routing
      if (sat !== activeSat) {
        const d = sat.mesh.position.distanceTo(gatewayPos);
        if (d < minGwDist) {
          minGwDist = d;
          activeGatewaySat = sat;
        }
      }
    });

    // 6. Update Inter-Satellite Laser Link Lines
    this.updateLaserLinks(activeSat, activeGatewaySat, time);

    // 7. Update Hexagonal Coverage Ground Footprint under Active Satellite
    if (activeSat) {
      const nadir = activeSat.mesh.position.clone().normalize().multiplyScalar(EARTH_RADIUS + 0.18);
      this.hexFootprintMesh.position.copy(nadir);
      this.hexFootprintMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nadir.clone().normalize());
      this.hexFootprintMesh.visible = true;
    } else {
      this.hexFootprintMesh.visible = false;
    }

    return {
      activeSat,
      nextSat,
      activeGatewaySat,
      elevationAngle: currentElevation,
      beamSteerAngle: steerAngle,
      handoffProgress: handoffProg,
      laserLinkedPair: activeSat && activeGatewaySat ? [activeSat, activeGatewaySat] : null,
    };
  }

  private updateLaserLinks(
    activeSat: SatelliteInstance | null,
    gatewaySat: SatelliteInstance | null,
    time: number
  ) {
    const posAttr = this.laserBeamLines.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.laserBeamLines.geometry.attributes.color as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    const colArray = colAttr.array as Float32Array;

    let pairIndex = 0;

    // A. Intra-plane links (satellites in the same orbital train talking to fore/aft neighbor)
    for (let p = 0; p < this.numPlanes; p++) {
      const planeSats = this.satellites.filter((s) => s.planeIndex === p);
      for (let i = 0; i < planeSats.length; i++) {
        const s1 = planeSats[i];
        const s2 = planeSats[(i + 1) % planeSats.length];

        const idx = pairIndex * 6;
        posArray[idx] = s1.mesh.position.x;
        posArray[idx + 1] = s1.mesh.position.y;
        posArray[idx + 2] = s1.mesh.position.z;

        posArray[idx + 3] = s2.mesh.position.x;
        posArray[idx + 4] = s2.mesh.position.y;
        posArray[idx + 5] = s2.mesh.position.z;

        // Faint laser green/cyan ambient link - calm, steady subtle glow
        const pulse = 0.16 + 0.04 * Math.sin(time * 0.5 + i);
        colArray[idx] = 0.03;
        colArray[idx + 1] = 0.35 * pulse;
        colArray[idx + 2] = 0.65 * pulse;

        colArray[idx + 3] = 0.03;
        colArray[idx + 4] = 0.35 * pulse;
        colArray[idx + 5] = 0.65 * pulse;

        pairIndex++;
      }
    }

    // B. High-intensity ACTIVE Cross-Plane Laser Link between user's satellite and gateway's satellite!
    if (activeSat && gatewaySat) {
      const idx = pairIndex * 6;
      posArray[idx] = activeSat.mesh.position.x;
      posArray[idx + 1] = activeSat.mesh.position.y;
      posArray[idx + 2] = activeSat.mesh.position.z;

      posArray[idx + 3] = gatewaySat.mesh.position.x;
      posArray[idx + 4] = gatewaySat.mesh.position.y;
      posArray[idx + 5] = gatewaySat.mesh.position.z;

      // Clean, refined emerald laser (non-glaring)
      colArray[idx] = 0.05;
      colArray[idx + 1] = 0.65;
      colArray[idx + 2] = 0.35;

      colArray[idx + 3] = 0.05;
      colArray[idx + 4] = 0.65;
      colArray[idx + 5] = 0.35;

      pairIndex++;
    }

    // Zero out remaining buffer
    for (let i = pairIndex * 6; i < posArray.length; i++) {
      posArray[i] = 0;
      colArray[i] = 0;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public setTransponderGlow(activeSat: SatelliteInstance | null, glowIntensity: number) {
    this.satellites.forEach((sat) => {
      if (sat.transponderCore) {
        const mat = sat.transponderCore.material as THREE.MeshStandardMaterial;
        if (sat === activeSat) {
          mat.emissiveIntensity = 0.4 + glowIntensity * 2.8;
          mat.emissive.setHex(glowIntensity > 0.2 ? 0x67e8f9 : 0x00d2ff);
        } else {
          mat.emissiveIntensity = 0.25;
          mat.emissive.setHex(0x00d2ff);
        }
      }
    });
  }
}

