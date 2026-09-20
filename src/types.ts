/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CameraPreset =
  | 'dish'
  | 'satellite'
  | 'laser'
  | 'gateway'
  | 'handoff'
  | 'orbit';

export type StepId = 'dish' | 'satellite' | 'laser' | 'gateway' | 'handoff' | 'orbit';

export interface StepInfo {
  id: StepId;
  stepNumber: number;
  title: string;
  subtitle: string;
  detail: string;
}

export interface ScreenLabel {
  text: string;
  subtext?: string;
  x: number;
  y: number;
  visible: boolean;
  color?: string;
}

export interface VisualLayers {
  rfBeams: boolean;
  spaceLasers: boolean;
  orbitTracks: boolean;
  dataPackets: boolean;
  atmosphere: boolean;
  clouds: boolean;
}

export interface TelemetryState {
  currentPhase: number;
  activeSatId: string;
  nextSatId: string;
  elevationAngle: number; // degrees
  beamSteerAngle: number; // degrees off bore-sight
  pingMs: number;
  dataRateGbps: number;
  laserLinkActive: boolean;
  handoffProgress: number; // 0 to 1
  orbitAltitudeKm: number;
  orbitSpeedKmh: number;
  packetStage: 'uplink' | 'laser' | 'downlink' | 'fiber' | 'return';
}
