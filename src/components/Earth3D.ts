/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {
  createCloudsTexture,
  createEarthNormalTexture,
  createEarthRoughnessTexture,
  createEarthTexture,
  createNightLightsTexture,
  createPhasedArrayTexture,
} from '../utils/textures';

export const EARTH_RADIUS = 100;
export const LEO_ORBIT_RADIUS = 109; // ~550km altitude proportionally

export class Earth3D {
  public group: THREE.Group;
  public earthMesh: THREE.Mesh;
  public cloudsMesh: THREE.Mesh;
  public atmosphereMesh: THREE.Mesh;
  public dishGroup: THREE.Group;
  public dishAimHead: THREE.Group;
  public dish2Group: THREE.Group;
  public dish2AimHead: THREE.Group;
  public gatewayGroup: THREE.Group;
  public fiberLinesGroup: THREE.Group;
  public fiberPulses: THREE.Points;

  // Geographic coordinates for Ground Terminals (User Dishes) & Gateway Earth Station
  public userLat = 39.5; // Colorado / Rockies mountain region (Terminal #1 Outpost Peak)
  public userLon = -105.0;

  public user2Lat = 44.2; // Northern Intermountain Ridge Station (Terminal #2 Summit Outpost)
  public user2Lon = -113.6;

  public gatewayLat = 33.5; // Arizona gateway
  public gatewayLon = -112.0;

  // Regional hubs for fiber network
  public hubCoordinates = [
    { lat: 32.8, lon: -97.0 }, // Dallas, TX
    { lat: 34.0, lon: -118.2 }, // Los Angeles, CA
    { lat: 37.7, lon: -122.4 }, // San Francisco, CA
    { lat: 39.7, lon: -104.9 }, // Denver, CO
  ];

  private fiberPulseData: { curve: THREE.CatmullRomCurve3; speed: number }[] = [];

  constructor() {
    this.group = new THREE.Group();

    // 1. Earth Sphere with Authentic High-Resolution NASA Blue Marble & Ocean Specular Reflections
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const textureLoader = new THREE.TextureLoader();

    // Authentic NASA Blue Marble Day map
    const earthTex = textureLoader.load(
      '/textures/earth_day_2048.jpg',
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
      },
      undefined,
      () => {
        // Fallback to procedural if network fails
        earthMat.map = createEarthTexture();
        earthMat.needsUpdate = true;
      }
    );
    earthTex.colorSpace = THREE.SRGBColorSpace;

    // Authentic NASA Specular map (shiny water, diffuse continents)
    const specularTex = textureLoader.load(
      '/textures/earth_specular_2048.jpg',
      undefined,
      undefined,
      () => {
        earthMat.specularMap = createEarthRoughnessTexture();
        earthMat.needsUpdate = true;
      }
    );

    // Authentic NASA Normal Elevation Bump map (Tangent-space SRTM continental relief)
    const normalTex = createEarthNormalTexture();

    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTex,
      specularMap: specularTex,
      specular: new THREE.Color(0x2d4460), // Natural ocean sun glint
      shininess: 24,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(0.85, 0.85),
    });
    this.earthMesh = new THREE.Mesh(earthGeo, earthMat);
    this.earthMesh.receiveShadow = true;
    this.earthMesh.castShadow = true;
    this.group.add(this.earthMesh);

    // 2. Earth Night Lights Layer (NASA Black Marble City Lights on Night Side)
    const nightGeo = new THREE.SphereGeometry(EARTH_RADIUS + 0.12, 64, 64);
    const nightTex = textureLoader.load(
      '/textures/earth_lights_2048.png',
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
      },
      undefined,
      () => {
        // Fallback
      }
    );
    nightTex.colorSpace = THREE.SRGBColorSpace;

    const sunDir = new THREE.Vector3(280, 110, 180).normalize();
    const nightMat = new THREE.ShaderMaterial({
      uniforms: {
        nightTex: { value: nightTex },
        sunDirection: { value: sunDir },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D nightTex;
        uniform vec3 sunDirection;
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          float sunDot = dot(vNormal, sunDirection);
          // Only show city lights on the unlit night side of Earth
          float nightIntensity = smoothstep(0.1, -0.2, sunDot);
          vec4 lights = texture2D(nightTex, vUv);
          gl_FragColor = vec4(lights.rgb * 1.5, lights.r * nightIntensity * 0.85);
        }
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const nightMesh = new THREE.Mesh(nightGeo, nightMat);
    this.earthMesh.add(nightMesh);

    // 3. Clouds Sphere (Authentic NASA Cloud Layer)
    const cloudsGeo = new THREE.SphereGeometry(EARTH_RADIUS + 0.5, 48, 48);
    const cloudsTex = textureLoader.load('/textures/earth_clouds_1024.png');
    const cloudsMat = new THREE.MeshPhongMaterial({
      map: cloudsTex,
      transparent: true,
      opacity: 0.38,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    this.cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    this.group.add(this.cloudsMesh);

    // 4. Physical Atmosphere Glow (Rayleigh scattering + Mie sunset terminator glow)
    const atmoGeo = new THREE.SphereGeometry(EARTH_RADIUS + 2.2, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: sunDir },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float rim = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.2);

          // Sunlight incident angle on Earth limb
          float sunDot = dot(vWorldNormal, sunDirection);

          // Rayleigh blue for daytime limb
          vec3 rayleighBlue = vec3(0.18, 0.58, 1.0);
          // Mie sunset golden-crimson along the terminator boundary
          vec3 mieSunset = vec3(1.0, 0.42, 0.12);

          // Terminator transition band (where sun rises/sets over horizon)
          float terminator = 1.0 - smoothstep(0.0, 0.28, abs(sunDot - 0.04));
          float dayFactor = smoothstep(-0.1, 0.25, sunDot);

          vec3 finalColor = mix(rayleighBlue, mieSunset, terminator * 0.7);
          float alpha = rim * (0.35 * dayFactor + 0.55 * terminator);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    this.atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
    this.group.add(this.atmosphereMesh);

    // 5. Build Primary User Terminal (Dishy #1) on Outpost Rooftop
    const { dishRoot, aimHead } = this.createDetailedDishModel();
    this.dishGroup = dishRoot;
    this.dishAimHead = aimHead;
    const userPos = this.latLonToVector3(this.userLat, this.userLon, EARTH_RADIUS);
    this.dishGroup.position.copy(userPos);
    this.dishGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), userPos.clone().normalize());
    this.earthMesh.add(this.dishGroup);

    // 5b. Build Nearby Second User Terminal (Dishy #2) on Adjacent Summit Station
    const { dishRoot: dishRoot2, aimHead: aimHead2 } = this.createNearbyDishModel();
    this.dish2Group = dishRoot2;
    this.dish2AimHead = aimHead2;
    const user2Pos = this.latLonToVector3(this.user2Lat, this.user2Lon, EARTH_RADIUS);
    this.dish2Group.position.copy(user2Pos);
    this.dish2Group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), user2Pos.clone().normalize());
    this.earthMesh.add(this.dish2Group);

    // 6. Build Ground Gateway Station (Radomes)
    this.gatewayGroup = this.createGatewayModel();
    const gatewayPos = this.latLonToVector3(this.gatewayLat, this.gatewayLon, EARTH_RADIUS);
    this.gatewayGroup.position.copy(gatewayPos);
    this.gatewayGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), gatewayPos.clone().normalize());
    this.earthMesh.add(this.gatewayGroup);

    // 7. Radiating Terrestrial Fiber Backbone Network
    this.fiberLinesGroup = new THREE.Group();
    this.earthMesh.add(this.fiberLinesGroup);

    const { linesGroup, pulsesMesh, pulseCurves } = this.createRadiatingFiberNetwork(gatewayPos);
    this.fiberLinesGroup.add(linesGroup);
    this.fiberPulses = pulsesMesh;
    this.fiberLinesGroup.add(this.fiberPulses);
    this.fiberPulseData = pulseCurves;
  }

  public latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }

  public getUserTerminalWorldPosition(): THREE.Vector3 {
    const target = new THREE.Vector3();
    if (this.dishAimHead) {
      this.dishAimHead.getWorldPosition(target);
    } else {
      this.dishGroup.getWorldPosition(target);
    }
    return target;
  }

  public getUser2TerminalWorldPosition(): THREE.Vector3 {
    const target = new THREE.Vector3();
    if (this.dish2AimHead) {
      this.dish2AimHead.getWorldPosition(target);
    } else if (this.dish2Group) {
      this.dish2Group.getWorldPosition(target);
    }
    return target;
  }

  public getGatewayWorldPosition(): THREE.Vector3 {
    const target = new THREE.Vector3();
    this.gatewayGroup.getWorldPosition(target);
    return target;
  }

  public getPrimaryFiberHubWorldPosition(): THREE.Vector3 {
    const hub = this.hubCoordinates[0];
    const localPos = this.latLonToVector3(hub.lat, hub.lon, EARTH_RADIUS);
    return localPos.applyMatrix4(this.earthMesh.matrixWorld);
  }

  /**
   * Electronically/mechanically steers both user dishes toward the target satellite
   */
  public steerDishToward(targetWorldPos: THREE.Vector3) {
    if (this.dishAimHead && this.dishGroup) {
      const dishWorld = new THREE.Vector3();
      this.dishAimHead.getWorldPosition(dishWorld);
      const dir = targetWorldPos.clone().sub(dishWorld).normalize();
      const invQuat = this.dishGroup.getWorldQuaternion(new THREE.Quaternion()).invert();
      const localDir = dir.clone().applyQuaternion(invQuat);
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), localDir);
      this.dishAimHead.quaternion.slerp(targetQuat, 0.12);
    }

    if (this.dish2AimHead && this.dish2Group) {
      const dish2World = new THREE.Vector3();
      this.dish2AimHead.getWorldPosition(dish2World);
      const dir2 = targetWorldPos.clone().sub(dish2World).normalize();
      const invQuat2 = this.dish2Group.getWorldQuaternion(new THREE.Quaternion()).invert();
      const localDir2 = dir2.clone().applyQuaternion(invQuat2);
      const targetQuat2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), localDir2);
      this.dish2AimHead.quaternion.slerp(targetQuat2, 0.12);
    }
  }

  private createDetailedDishModel(): { dishRoot: THREE.Group; aimHead: THREE.Group } {
    const dishRoot = new THREE.Group();

    // 1. Alpine Mountain Peak & Ridge Terrain Base (Elevated Colorado Rockies ~3,100m)
    // Multi-tiered rock formation displaying authentic geological elevation step-up
    const mountainBaseGeo = new THREE.CylinderGeometry(4.2, 5.8, 1.2, 28);
    const mountainBaseMat = new THREE.MeshStandardMaterial({
      color: 0x334139, // Rocky granite & alpine shale
      roughness: 0.95,
      metalness: 0.1,
      flatShading: true,
    });
    const mountainBase = new THREE.Mesh(mountainBaseGeo, mountainBaseMat);
    mountainBase.position.y = 0.6;
    dishRoot.add(mountainBase);

    // Mid-tier jagged alpine shelf
    const shelfGeo = new THREE.CylinderGeometry(2.8, 4.0, 0.9, 24);
    const shelfMat = new THREE.MeshStandardMaterial({
      color: 0x475549, // Alpine moss & rock outcrop
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
    });
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.y = 1.6;
    dishRoot.add(shelf);

    // Summit Knoll with snow dusted peak
    const summitGeo = new THREE.CylinderGeometry(2.0, 2.7, 0.6, 20);
    const summitMat = new THREE.MeshStandardMaterial({
      color: 0xdde5ed, // Dusted alpine ridge snow & granite
      roughness: 0.85,
      metalness: 0.15,
      flatShading: true,
    });
    const summit = new THREE.Mesh(summitGeo, summitMat);
    summit.position.y = 2.3;
    dishRoot.add(summit);

    // Elevation Contour Ring (Technical aerospace datum indicator showing 3,100m ASL contour)
    const contourGeo = new THREE.RingGeometry(4.4, 4.6, 36);
    const contourMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const contour = new THREE.Mesh(contourGeo, contourMat);
    contour.rotation.x = -Math.PI / 2;
    contour.position.y = 0.05;
    dishRoot.add(contour);

    // Miniature evergreen conifer trees descending the mountain slope
    const treeGeo = new THREE.ConeGeometry(0.35, 1.1, 8);
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x142b1a, roughness: 0.9 });
    const treeCoords = [
      { x: -2.4, y: 1.4, z: -1.6 },
      { x: -2.8, y: 1.2, z: 1.0 },
      { x: 2.3, y: 1.4, z: -1.8 },
      { x: 2.6, y: 1.2, z: 1.5 },
      { x: -1.4, y: 2.4, z: 1.4 },
      { x: 1.6, y: 2.4, z: -1.2 },
    ];
    treeCoords.forEach((tc) => {
      const tree = new THREE.Mesh(treeGeo, treeMat);
      tree.position.set(tc.x, tc.y, tc.z);
      dishRoot.add(tree);
    });

    // 2. Mountain Outpost Building / Cabin on the summit
    const cabinGeo = new THREE.BoxGeometry(2.0, 1.0, 1.6);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x47392b, // Dark timber wood
      roughness: 0.85,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.y = 2.9;
    dishRoot.add(cabin);

    // Pitched Gable Roof
    const roofGeo = new THREE.ConeGeometry(1.6, 0.7, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Slate dark roof tiles
      roughness: 0.6,
      metalness: 0.2,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.75;
    dishRoot.add(roof);

    // Stone Chimney
    const chimneyGeo = new THREE.BoxGeometry(0.3, 0.9, 0.3);
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
    chimney.position.set(0.65, 3.9, 0.35);
    dishRoot.add(chimney);

    // 3. Phased-Array Mounting Mast & Dual-Axis Servo Gimbal on rooftop
    const mastGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.2, 16);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0, 4.5, 0);
    dishRoot.add(mast);

    // Motorized Servo Actuator Housing
    const actuatorGeo = new THREE.BoxGeometry(0.26, 0.24, 0.26);
    const actuatorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.3 });
    const actuator = new THREE.Mesh(actuatorGeo, actuatorMat);
    actuator.position.set(0, 4.95, 0);
    dishRoot.add(actuator);

    // Status Indicator LED on Mast
    const ledGeo = new THREE.SphereGeometry(0.04, 12, 12);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0.12, 4.7, 0);
    dishRoot.add(led);

    // 4. Steerable Dish Aiming Head (gimbal / motorized base)
    const aimHead = new THREE.Group();
    aimHead.position.set(0, 5.1, 0);
    dishRoot.add(aimHead);

    // Gimbal hub
    const hubGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    aimHead.add(hub);

    // Phased Array Dish Face ("Dishy")
    const phasedTex = createPhasedArrayTexture();
    const dishGeo = new THREE.CylinderGeometry(0.74, 0.74, 0.08, 32);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.35,
      map: phasedTex,
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0, 0.1, 0);
    aimHead.add(dish);

    // Thermal Radome Snow-Melt Heat Glow (subtle warm micro-sheen on the phased array face)
    const thermalGeo = new THREE.RingGeometry(0.1, 0.7, 32);
    const thermalMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
    });
    const thermalMesh = new THREE.Mesh(thermalGeo, thermalMat);
    thermalMesh.rotation.x = Math.PI / 2;
    thermalMesh.position.set(0, 0.15, 0);
    aimHead.add(thermalMesh);

    // Pulsing Cyan LED Halo Ring (glowing status rim - subtle)
    const ringGeo = new THREE.RingGeometry(0.72, 0.78, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.15, 0);
    aimHead.add(ring);

    // Ground Beacon Aura (subtle ground locator ring)
    const beaconGeo = new THREE.RingGeometry(1.6, 2.0, 32);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.1,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.rotation.x = -Math.PI / 2;
    beacon.position.y = 0.62;
    dishRoot.add(beacon);

    return { dishRoot, aimHead };
  }

  private createNearbyDishModel(): { dishRoot: THREE.Group; aimHead: THREE.Group } {
    const dishRoot = new THREE.Group();

    // 1. Neighboring Alpine Knoll Summit & Terrain (Elev. 2,940m ASL)
    const knollGeo = new THREE.CylinderGeometry(2.4, 3.8, 1.0, 24);
    const knollMat = new THREE.MeshStandardMaterial({
      color: 0x2d3732, // Rocky alpine granite
      roughness: 0.94,
      metalness: 0.08,
      flatShading: true,
    });
    const knoll = new THREE.Mesh(knollGeo, knollMat);
    knoll.position.y = 0.5;
    dishRoot.add(knoll);

    // Upper shelf
    const shelfGeo = new THREE.CylinderGeometry(1.6, 2.4, 0.7, 20);
    const shelfMat = new THREE.MeshStandardMaterial({
      color: 0x3f4c42, // Alpine scrub & rock outcrop
      roughness: 0.9,
      flatShading: true,
    });
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.y = 1.35;
    dishRoot.add(shelf);

    // Elevation Datum Contour Ring (Cyan/Sky-blue technical indicator showing 2,940m ASL contour)
    const contourGeo = new THREE.RingGeometry(2.8, 3.0, 32);
    const contourMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
    });
    const contour = new THREE.Mesh(contourGeo, contourMat);
    contour.rotation.x = -Math.PI / 2;
    contour.position.y = 0.05;
    dishRoot.add(contour);

    // Evergreen conifer trees descending the slope
    const treeGeo = new THREE.ConeGeometry(0.3, 0.95, 8);
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x142b1a, roughness: 0.9 });
    const pine1 = new THREE.Mesh(treeGeo, treeMat);
    pine1.position.set(-1.6, 1.0, -1.0);
    dishRoot.add(pine1);
    const pine2 = new THREE.Mesh(treeGeo, treeMat);
    pine2.position.set(1.4, 0.9, 1.1);
    dishRoot.add(pine2);

    // 2. Solar Photovoltaic Power Station & Telemetry Enclosure
    // Weatherproof outdoor aluminum battery / inverter enclosure
    const boxGeo = new THREE.BoxGeometry(0.7, 0.55, 0.5);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(-0.85, 1.95, -0.4);
    dishRoot.add(box);

    // Solar Panel Array (2 angled PV panels)
    const panelGeo = new THREE.BoxGeometry(1.1, 0.04, 0.65);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Deep blue-black photovoltaic cell
      metalness: 0.8,
      roughness: 0.2,
    });
    const solarPanel = new THREE.Mesh(panelGeo, panelMat);
    solarPanel.position.set(-0.85, 2.35, 0.3);
    solarPanel.rotation.x = 0.45; // 25-degree tilt towards the sun
    dishRoot.add(solarPanel);

    // Solar panel frame stand
    const frameGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(-0.85, 2.0, 0.3);
    dishRoot.add(frame);

    // 3. Phased-Array Heavy Duty Quadpod & Mast
    const quadpodBaseGeo = new THREE.CylinderGeometry(0.45, 0.6, 0.12, 4);
    const quadpodMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const quadpod = new THREE.Mesh(quadpodBaseGeo, quadpodMat);
    quadpod.rotation.y = Math.PI / 4;
    quadpod.position.set(0.4, 1.76, -0.1);
    dishRoot.add(quadpod);

    const mastGeo = new THREE.CylinderGeometry(0.065, 0.065, 1.1, 16);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0.4, 2.3, -0.1);
    dishRoot.add(mast);

    // Motorized Actuator Housing
    const actuatorGeo = new THREE.BoxGeometry(0.24, 0.22, 0.24);
    const actuatorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.3 });
    const actuator = new THREE.Mesh(actuatorGeo, actuatorMat);
    actuator.position.set(0.4, 2.8, -0.1);
    dishRoot.add(actuator);

    // Status Indicator LED on Mast
    const ledGeo = new THREE.SphereGeometry(0.04, 12, 12);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0.52, 2.45, -0.1);
    dishRoot.add(led);

    // 4. Steerable Dish Aiming Head (motorized gimbal base)
    const aimHead = new THREE.Group();
    aimHead.position.set(0.4, 2.95, -0.1);
    dishRoot.add(aimHead);

    // Gimbal hub
    const hubGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    aimHead.add(hub);

    // Phased Array Dish Face ("Dishy #2")
    const phasedTex = createPhasedArrayTexture();
    const dishGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.075, 32);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.35,
      map: phasedTex,
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0, 0.09, 0);
    aimHead.add(dish);

    // Thermal Radome Snow-Melt Heat Glow
    const thermalGeo = new THREE.RingGeometry(0.1, 0.68, 32);
    const thermalMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
    });
    const thermalMesh = new THREE.Mesh(thermalGeo, thermalMat);
    thermalMesh.rotation.x = Math.PI / 2;
    thermalMesh.position.set(0, 0.14, 0);
    aimHead.add(thermalMesh);

    // Pulsing Sky-Blue Status Halo Ring
    const ringGeo = new THREE.RingGeometry(0.7, 0.76, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.14, 0);
    aimHead.add(ring);

    // Ground Beacon Locator Ring
    const beaconGeo = new THREE.RingGeometry(1.4, 1.8, 32);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.1,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.rotation.x = -Math.PI / 2;
    beacon.position.y = 0.52;
    dishRoot.add(beacon);

    return { dishRoot, aimHead };
  }

  private createGatewayModel(): THREE.Group {
    const group = new THREE.Group();

    // Concrete station pad
    const padGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.35, 32);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.18;
    group.add(pad);

    // 4 Geodesic Tracking Radomes (white domes tracking satellites)
    const domeGeo = new THREE.SphereGeometry(0.65, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.15,
      metalness: 0.2,
    });

    const offsets = [
      { x: -1.0, z: -1.0 },
      { x: 1.0, z: -1.0 },
      { x: -1.0, z: 1.0 },
      { x: 1.0, z: 1.0 },
    ];

    offsets.forEach((off) => {
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.set(off.x, 0.35, off.z);
      group.add(dome);

      // Pedestal
      const pedGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.35, 16);
      const pedMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 });
      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.set(off.x, 0.18, off.z);
      group.add(ped);
    });

    // Gateway identifier ring (Amber/Gold)
    const ringGeo = new THREE.RingGeometry(2.2, 2.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b, // Amber/Gold
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);

    return group;
  }

  private createRadiatingFiberNetwork(gatewayPos: THREE.Vector3): {
    linesGroup: THREE.Group;
    pulsesMesh: THREE.Points;
    pulseCurves: { curve: THREE.CatmullRomCurve3; speed: number }[];
  } {
    const linesGroup = new THREE.Group();
    const pulseCurves: { curve: THREE.CatmullRomCurve3; speed: number }[] = [];

    this.hubCoordinates.forEach((hub) => {
      const hubPos = this.latLonToVector3(hub.lat, hub.lon, EARTH_RADIUS);
      const points: THREE.Vector3[] = [];
      const segments = 32;

      for (let i = 0; i <= segments; i++) {
        const alpha = i / segments;
        const p = new THREE.Vector3().lerpVectors(gatewayPos, hubPos, alpha);
        p.normalize().multiplyScalar(EARTH_RADIUS + 0.12);
        points.push(p);
      }

      const curve = new THREE.CatmullRomCurve3(points);
      pulseCurves.push({ curve, speed: 0.25 + Math.random() * 0.1 });

      const splinePoints = curve.getPoints(60);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(splinePoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xf59e0b, // Amber fiber glow
        transparent: true,
        opacity: 0.35, // Softened from 0.65
      });
      const line = new THREE.Line(lineGeo, lineMat);
      linesGroup.add(line);

      // Terminal hub node
      const nodeGeo = new THREE.SphereGeometry(0.2, 12, 12);
      const nodeMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7 });
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.copy(hubPos);
      linesGroup.add(node);
    });

    // Calm, spaced-out fiber data pulses
    const totalPulses = 12; // Down from 36
    const pulsePositions = new Float32Array(totalPulses * 3);
    const pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));

    const pulseMat = new THREE.PointsMaterial({
      color: 0xfbbf24, // Warm golden amber
      size: 0.8,
      transparent: true,
      opacity: 0.65, // Softened from 0.95
      blending: THREE.AdditiveBlending,
    });
    const pulsesMesh = new THREE.Points(pulseGeo, pulseMat);

    return { linesGroup, pulsesMesh, pulseCurves };
  }

  public update(delta: number, simSpeed: number = 1.0) {
    // Slow, realistic Earth rotation
    this.earthMesh.rotation.y += delta * 0.004 * simSpeed;
    // Differential cloud layer drift
    this.cloudsMesh.rotation.y += delta * 0.0055 * simSpeed;

    // Animate glowing data pulses along radiating fiber lines
    const positions = this.fiberPulses.geometry.attributes.position.array as Float32Array;
    const totalPulses = positions.length / 3;
    const time = performance.now() * 0.0006 * simSpeed;

    const numBranches = this.fiberPulseData.length;
    const pulsesPerBranch = Math.floor(totalPulses / numBranches);

    for (let b = 0; b < numBranches; b++) {
      const { curve, speed } = this.fiberPulseData[b];
      for (let p = 0; p < pulsesPerBranch; p++) {
        const idx = b * pulsesPerBranch + p;
        const progress = (time * speed + p / pulsesPerBranch) % 1.0;
        const point = curve.getPoint(progress);

        positions[idx * 3] = point.x;
        positions[idx * 3 + 1] = point.y;
        positions[idx * 3 + 2] = point.z;
      }
    }
    this.fiberPulses.geometry.attributes.position.needsUpdate = true;
  }
}
