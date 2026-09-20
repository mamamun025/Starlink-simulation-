/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

import { Constellation3D } from './Constellation3D';
import { Earth3D } from './Earth3D';
import { TransmissionBeams3D } from './TransmissionBeams3D';
import { TrackingMarkersManager } from './TrackingMarkers';
import { RoutingMode } from './InternetTopologyView';

interface StarlinkCanvasProps {
  onPhaseChange?: (phase: number) => void;
  targetPhase?: number | null;
  showLabels?: boolean;
  isPaused?: boolean;
  playbackSpeed?: number;
  loopStep?: boolean;
  routingMode?: RoutingMode;
}

export const StarlinkCanvas: React.FC<StarlinkCanvasProps> = ({
  onPhaseChange,
  targetPhase,
  showLabels = true,
  isPaused = false,
  playbackSpeed = 1.0,
  loopStep = false,
  routingMode = 'laser-mesh',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const masterTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const trackingManagerRef = useRef<TrackingMarkersManager | null>(null);
  const beamsRef = useRef<TransmissionBeams3D | null>(null);
  const lastReportedPhaseRef = useRef<number>(1);
  const onPhaseChangeRef = useRef(onPhaseChange);

  const isPausedRef = useRef(isPaused);
  const playbackSpeedRef = useRef(playbackSpeed);
  const loopStepRef = useRef(loopStep);
  const routingModeRef = useRef<RoutingMode>(routingMode);

  useEffect(() => {
    routingModeRef.current = routingMode;
    if (beamsRef.current) {
      beamsRef.current.routingMode = routingMode;
    }
  }, [routingMode]);

  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange;
  }, [onPhaseChange]);

  useEffect(() => {
    trackingManagerRef.current?.setVisible(showLabels);
  }, [showLabels]);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (masterTimelineRef.current) {
      if (isPaused) {
        masterTimelineRef.current.pause();
      } else {
        masterTimelineRef.current.play();
      }
    }
  }, [isPaused]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
    if (masterTimelineRef.current) {
      masterTimelineRef.current.timeScale(playbackSpeed);
    }
  }, [playbackSpeed]);

  useEffect(() => {
    loopStepRef.current = loopStep;
  }, [loopStep]);

  useEffect(() => {
    if (targetPhase && masterTimelineRef.current) {
      const times = [0.0, 18.0, 36.0, 54.0];
      const targetTime = times[targetPhase - 1] ?? 0;
      masterTimelineRef.current.seek(targetTime);
      if (isPausedRef.current) {
        masterTimelineRef.current.pause();
      } else {
        masterTimelineRef.current.play();
      }
      lastReportedPhaseRef.current = targetPhase;
      onPhaseChangeRef.current?.(targetPhase);
    }
  }, [targetPhase]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Three.js Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02050c); // Deep cosmic void

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 2000);
    camera.position.set(0, 120, 240);

    // 2. WebGL Renderer with High-Precision Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92; // Controlled, high-contrast, non-glaring exposure
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 3. Post-Processing Pipeline (Subtle, crisp UnrealBloomPass for lasers & pulses)
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // High threshold (0.92) and low strength (0.18) so scenes never flash or overwhelm
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.18, // Calm, restrained bloom (down from 0.38)
      0.18, // Tight radius
      0.92  // Strict threshold
    );
    composer.addPass(bloomPass);

    // 4. Interactive OrbitControls (user can drag/zoom/inspect anytime)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.0;
    controls.minDistance = 5.0;
    controls.maxDistance = 550.0;

    let isUserInteracting = false;
    let interactionTimeout: ReturnType<typeof setTimeout> | null = null;

    controls.addEventListener('start', () => {
      isUserInteracting = true;
      if (interactionTimeout) clearTimeout(interactionTimeout);
    });

    controls.addEventListener('end', () => {
      if (interactionTimeout) clearTimeout(interactionTimeout);
      // Smoothly return to cinematic sequence after 2.5 seconds of inactivity
      interactionTimeout = setTimeout(() => {
        isUserInteracting = false;
      }, 2500);
    });

    // 5. Space Lighting & Sun with Realistic Terminator
    const sunPos = new THREE.Vector3(280, 110, 180);
    const sunDir = sunPos.clone().normalize();
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.15); // Gentle, realistic sunlight
    sunLight.position.copy(sunPos);
    scene.add(sunLight);

    // Deep space ambient fill
    const ambientLight = new THREE.AmbientLight(0x060e1d, 0.08);
    scene.add(ambientLight);

    // Soft rim fill
    const rimFill = new THREE.DirectionalLight(0x1e3a8a, 0.12);
    rimFill.position.set(-200, -80, -120);
    scene.add(rimFill);

    // 6. Deep-Space Celestial Starfield & Milky Way Galactic Plane
    const starCount = 5500;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const dist = 600 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPositions[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = dist * Math.cos(phi);

      const colRand = Math.random();
      if (colRand < 0.2) {
        // Hot Blue OB Stars
        starColors[i * 3] = 0.55;
        starColors[i * 3 + 1] = 0.75;
        starColors[i * 3 + 2] = 1.0;
      } else if (colRand < 0.35) {
        // Cool Red/Orange M-Giants
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.65;
        starColors[i * 3 + 2] = 0.35;
      } else if (colRand < 0.5) {
        // Warm Solar G-type
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.92;
        starColors[i * 3 + 2] = 0.75;
      } else {
        // Bright White A/F stars
        const b = 0.7 + Math.random() * 0.3;
        starColors[i * 3] = b;
        starColors[i * 3 + 1] = b;
        starColors[i * 3 + 2] = b;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Milky Way Galactic Core Nebula Particle Band
    const mwCount = 2800;
    const mwGeo = new THREE.BufferGeometry();
    const mwPositions = new Float32Array(mwCount * 3);
    const mwColors = new Float32Array(mwCount * 3);

    for (let i = 0; i < mwCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 700 + Math.random() * 200;
      const spread = (Math.random() - 0.5) * 85;
      const dist = Math.sqrt(radius * radius - spread * spread);

      // Inclined galactic plane
      const rawX = Math.cos(angle) * dist;
      const rawY = spread;
      const rawZ = Math.sin(angle) * dist;

      // Rotate 35 degrees to tilt the Milky Way
      const tilt = 0.6;
      mwPositions[i * 3] = rawX;
      mwPositions[i * 3 + 1] = rawY * Math.cos(tilt) - rawZ * Math.sin(tilt);
      mwPositions[i * 3 + 2] = rawY * Math.sin(tilt) + rawZ * Math.cos(tilt);

      const c = Math.random();
      if (c < 0.4) {
        // Cosmic dust cloud (soft indigo/purple)
        mwColors[i * 3] = 0.35;
        mwColors[i * 3 + 1] = 0.42;
        mwColors[i * 3 + 2] = 0.65;
      } else {
        // Golden galactic core starlight
        mwColors[i * 3] = 0.85;
        mwColors[i * 3 + 1] = 0.78;
        mwColors[i * 3 + 2] = 0.62;
      }
    }
    mwGeo.setAttribute('position', new THREE.BufferAttribute(mwPositions, 3));
    mwGeo.setAttribute('color', new THREE.BufferAttribute(mwColors, 3));
    const mwMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const mwField = new THREE.Points(mwGeo, mwMat);
    scene.add(mwField);

    // Anamorphic Solar Glare Lens Flare
    const flareGeo = new THREE.PlaneGeometry(36, 1.2);
    const flareMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const solarFlare = new THREE.Mesh(flareGeo, flareMat);
    solarFlare.position.set(280 * 0.7, 110 * 0.7, 180 * 0.7);
    scene.add(solarFlare);

    // 7. Core 3D Modules: Earth, Constellation, Transmission Beams
    const earth = new Earth3D();
    scene.add(earth.group);

    const constellation = new Constellation3D();
    scene.add(constellation.group);

    const beams = new TransmissionBeams3D();
    beams.routingMode = routingModeRef.current;
    beamsRef.current = beams;
    scene.add(beams.group);

    // 8. Scripted Cinematic Animation State
    const cinematicState = {
      phase: 1, // 1: Uplink, 2: Space Routing, 3: Downlink, 4: Handover
      transponderGlow: 0.1,
      orbitSpinSpeed: 1.0,
      handoverProgress: 0,
      fov: 42,
    };

    // 9. Master GSAP 4-Phase Cinematic Timeline (36s seamless loop)
    const masterTimeline = gsap.timeline({
      repeat: -1,
      defaults: { ease: 'power2.inOut' },
    });
    masterTimeline.timeScale(playbackSpeedRef.current);
    if (isPausedRef.current) {
      masterTimeline.pause();
    }
    masterTimelineRef.current = masterTimeline;
    onPhaseChangeRef.current?.(1);

    masterTimeline
      // === PHASE 1: Uplink (Macro to Micro Ground View) === (0s - 18s)
      .to(cinematicState, {
        duration: 18.0,
        phase: 1,
        transponderGlow: 0.1,
        handoverProgress: 0,
        fov: 42,
        ease: 'sine.inOut',
      })
      // === PHASE 2: Space Routing & Optical Intersatellite Links (LEO Orbital View) === (18s - 36s)
      .to(cinematicState, {
        duration: 4.0,
        phase: 2,
        transponderGlow: 0.5, // Crisp transponder indicator
        fov: 44,
        ease: 'power2.out',
      })
      .to(cinematicState, {
        duration: 14.0,
        transponderGlow: 0.25,
        ease: 'sine.inOut',
      })
      // === PHASE 3: Downlink to Ground Gateway (Global Scale View) === (36s - 54s)
      .to(cinematicState, {
        duration: 18.0,
        phase: 3,
        transponderGlow: 0.1,
        fov: 46,
        ease: 'power2.inOut',
      })
      // === PHASE 4: The Loop / Handover (Cinematic Wide Angle 360 Flyby) === (54s - 72s)
      .to(cinematicState, {
        duration: 18.0,
        phase: 4,
        handoverProgress: 1.0,
        transponderGlow: 0.15,
        fov: 48,
        ease: 'sine.inOut',
      });

    // 10. Main Animation Loop (60 FPS)
    const trackingManager = new TrackingMarkersManager(container);
    trackingManagerRef.current = trackingManager;
    trackingManager.setVisible(showLabels);

    let animationFrameId: number;
    let lastTime = performance.now();
    let simTime = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const rawDelta = Math.min((now - lastTime) * 0.001, 0.1);
      lastTime = now;

      const currentSpeed = playbackSpeedRef.current;
      const isCurrentlyPaused = isPausedRef.current;
      const delta = isCurrentlyPaused ? 0 : rawDelta * currentSpeed;
      simTime += delta;

      // If loopStep is enabled, loop continuously within the active step's 18.0s duration
      if (loopStepRef.current && masterTimeline) {
        const t = masterTimeline.time();
        const curStep = Math.min(4, Math.floor((t % 72.0) / 18.0) + 1);
        const stepStart = (curStep - 1) * 18.0;
        const stepEnd = curStep * 18.0;
        if ((t % 72.0) >= stepEnd - 0.08) {
          masterTimeline.seek(stepStart);
        }
      }

      // Report active phase in the cinematic sequence
      const t = masterTimeline.time() % 72.0;
      const curPhase = t < 18.0 ? 1 : t < 36.0 ? 2 : t < 54.0 ? 3 : 4;
      if (curPhase !== lastReportedPhaseRef.current) {
        lastReportedPhaseRef.current = curPhase;
        onPhaseChangeRef.current?.(curPhase);
      }

      // 1. Update Earth, Rotations, and Radiating Fiber Pulses
      earth.update(delta, cinematicState.orbitSpinSpeed);

      // Get world coordinates of User Terminals and Ground Gateway
      const userPos = earth.getUserTerminalWorldPosition();
      const user2Pos = earth.getUser2TerminalWorldPosition();
      const gatewayPos = earth.getGatewayWorldPosition();

      // 2. Update Starlink Satellite Constellation
      const constState = constellation.update(delta, cinematicState.orbitSpinSpeed, userPos, gatewayPos);
      const activeSat = constState.activeSat;
      const nextSat = constState.nextSat;
      const gatewaySat = constState.activeGatewaySat;

      // 3. User Phased-Array Dish Beam Steering
      if (activeSat) {
        earth.steerDishToward(activeSat.mesh.position);
      }

      // Update satellite transponder glow
      constellation.setTransponderGlow(activeSat, cinematicState.transponderGlow);

      // 4. Update Transmission Beams, Wavefront Rings, Laser Ray, and Traveling Packets
      beams.update(
        simTime,
        userPos,
        gatewayPos,
        activeSat,
        nextSat,
        gatewaySat,
        cinematicState.phase,
        cinematicState.handoverProgress,
        user2Pos
      );

      // 5. Compute Scripted Cinematic Camera Position based on Active Phase
      let targetCamPos = new THREE.Vector3();
      let targetLookAt = new THREE.Vector3();

      if (cinematicState.phase === 1) {
        // === Phase 1: Macro Ground View with True Mountain Elevation Perspective ===
        // Frame both Dishy #1 (Rockies Outpost) and Dishy #2 (Northern Ridge Station) with expansive regional perspective
        const midGround = userPos.clone().lerp(user2Pos, 0.5);
        const dishNormal = midGround.clone().normalize();
        const tangent = new THREE.Vector3(0, 1, 0).cross(dishNormal).normalize();
        const bitangent = dishNormal.clone().cross(tangent).normalize();

        const camOffset = dishNormal.clone().multiplyScalar(26.0)
          .add(tangent.clone().multiplyScalar(40.0))
          .add(bitangent.clone().multiplyScalar(24.0));

        targetCamPos = midGround.clone().add(camOffset);
        targetLookAt = midGround.clone().add(dishNormal.clone().multiplyScalar(5.0));
      } else if (cinematicState.phase === 2) {
        // === Phase 2: Space Routing & LEO Orbital View ===
        // Clear orbital perspective (~24 units from satellite) framing solar arrays, transponder, and green laser links
        if (activeSat) {
          const satPos = activeSat.mesh.position;
          const satDir = satPos.clone().normalize();
          const tangent = new THREE.Vector3(0, 1, 0).cross(satDir).normalize();

          targetCamPos = satPos.clone()
            .add(satDir.clone().multiplyScalar(16.0))
            .add(tangent.clone().multiplyScalar(20.0));

          if (gatewaySat) {
            targetLookAt = satPos.clone().lerp(gatewaySat.mesh.position, 0.25);
          } else {
            targetLookAt = satPos.clone();
          }
        } else {
          targetCamPos.set(0, 140, 160);
          targetLookAt.set(0, 0, 0);
        }
      } else if (cinematicState.phase === 3) {
        // === Phase 3: Downlink to Ground Gateway (Continental Elevation & Curvature View) ===
        // Framed high above gateway station (~82 units) showing the continental curvature, elevation drop to lowlands, amber downlink, and fiber lines
        const gwNormal = gatewayPos.clone().normalize();
        const sideOffset = new THREE.Vector3(0, 1, 0).cross(gwNormal).normalize();

        targetCamPos = gatewayPos.clone()
          .add(gwNormal.clone().multiplyScalar(68.0))
          .add(sideOffset.clone().multiplyScalar(46.0));

        targetLookAt = gatewayPos.clone().add(gwNormal.clone().multiplyScalar(3.0));
      } else {
        // === Phase 4: Handover & Cinematic 360-Degree Wide Angle Orbital Sweep ===
        // Slow, majestic orbital sweep around Earth showing the constellation mesh and orbit rings
        const angle = simTime * 0.05;
        const radius = 240;
        const height = 100 + Math.sin(simTime * 0.06) * 20;

        targetCamPos.set(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        );
        targetLookAt.set(0, 15, 0);
      }

      // 6. Smooth Camera Transition (GSAP/Scripted vs User Interaction)
      if (!isUserInteracting) {
        camera.position.lerp(targetCamPos, 0.022);
        controls.target.lerp(targetLookAt, 0.025);
        camera.fov = THREE.MathUtils.lerp(camera.fov, cinematicState.fov, 0.025);
        camera.updateProjectionMatrix();
        controls.update();
      } else {
        controls.update();
      }

      // 7. Update Dynamic 3D Tracking Markers (marking what is what as they move)
      let laserMidpoint: THREE.Vector3 | null = null;
      if (activeSat && gatewaySat && activeSat !== gatewaySat && cinematicState.phase === 2) {
        laserMidpoint = activeSat.mesh.position.clone().lerp(gatewaySat.mesh.position, 0.5);
      }

      // Orient solar flare to camera and modulate subtle bloom intensity
      solarFlare.quaternion.copy(camera.quaternion);
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      const sunDirNorm = sunDir.clone().normalize();
      const sunAlignment = THREE.MathUtils.clamp(camDir.dot(sunDirNorm), 0, 1);
      (solarFlare.material as THREE.MeshBasicMaterial).opacity = Math.pow(sunAlignment, 5) * 0.12;

      trackingManager.update(camera, width, height, {
        userTerminal: userPos,
        userTerminal2: user2Pos,
        activeSat,
        laserLink: laserMidpoint,
        relaySat: gatewaySat,
        groundGateway: gatewayPos,
        approachingSat: nextSat,
        fiberGrid: earth.getPrimaryFiberHubWorldPosition(),
      });

      // 8. Render with Post-Processing Bloom
      composer.render();
    };

    animate();

    // 11. Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      composer.setSize(width, height);
      bloomPass.resolution.set(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      masterTimeline.kill();
      controls.dispose();
      renderer.dispose();
      trackingManager.dispose();
      trackingManagerRef.current = null;
      if (interactionTimeout) clearTimeout(interactionTimeout);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="starlink-canvas-container"
      className="relative w-full h-full cursor-grab active:cursor-grabbing bg-black select-none overflow-hidden"
    />
  );
};
