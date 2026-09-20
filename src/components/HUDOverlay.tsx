/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sliders,
  Radio,
  Zap,
  Layers,
  Sparkles,
  Wifi,
  Activity,
  Compass,
} from 'lucide-react';
import { CameraPreset, ScreenLabel, TelemetryState, VisualLayers } from '../types';
import { STARLINK_STEPS } from '../constants/steps';

interface HUDOverlayProps {
  cameraPreset: CameraPreset;
  simSpeed: number;
  isPlaying: boolean;
  layers: VisualLayers;
  autoTour: boolean;
  tourProgress: number;
  screenLabels: ScreenLabel[];
  telemetry: TelemetryState;
  onCameraPresetChange: (preset: CameraPreset) => void;
  onTogglePlay: () => void;
  onToggleAutoTour: () => void;
  onToggleLayer: (layerKey: keyof VisualLayers) => void;
}

export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  cameraPreset,
  isPlaying,
  layers,
  autoTour,
  screenLabels,
  telemetry,
  onCameraPresetChange,
  onTogglePlay,
  onToggleAutoTour,
  onToggleLayer,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  // Find active step info
  const currentStepIndex = STARLINK_STEPS.findIndex((s) => s.id === cameraPreset);
  const activeStep = STARLINK_STEPS[currentStepIndex] || STARLINK_STEPS[0];

  const handlePrevStep = () => {
    const prevIdx = (currentStepIndex - 1 + STARLINK_STEPS.length) % STARLINK_STEPS.length;
    onCameraPresetChange(STARLINK_STEPS[prevIdx].id);
  };

  const handleNextStep = () => {
    const nextIdx = (currentStepIndex + 1) % STARLINK_STEPS.length;
    onCameraPresetChange(STARLINK_STEPS[nextIdx].id);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onCameraPresetChange(e.target.value as CameraPreset);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none font-sans overflow-hidden">
      {/* 1. Live 3D Projected Screen Pins (Pointing directly at objects in 3D space) */}
      <div className="absolute inset-0 pointer-events-none">
        {screenLabels.map((lbl, idx) => (
          <div
            key={`${lbl.text}-${idx}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-150 ease-out"
            style={{
              left: `${lbl.x}px`,
              top: `${lbl.y}px`,
            }}
          >
            <div className="relative flex flex-col items-center group">
              {/* Pulsing Target Dot */}
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-cyan-400/50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300 border border-white" />
              </div>

              {/* Connecting leader line */}
              <div className="w-px h-3 bg-gradient-to-b from-cyan-400/80 to-transparent" />

              {/* Callout Card */}
              <div className="backdrop-blur-md bg-slate-950/85 border border-cyan-500/40 rounded-lg px-2.5 py-1 shadow-[0_0_15px_rgba(6,182,212,0.3)] text-center whitespace-nowrap">
                <div className="text-[11px] font-bold tracking-wider text-cyan-200">
                  {lbl.text}
                </div>
                {lbl.subtext && (
                  <div className="text-[9px] text-slate-300 font-mono">
                    {lbl.subtext}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Top Bar: Single-line Concise Header */}
      <header className="w-full flex justify-center pointer-events-auto">
        <div className="w-full max-w-4xl backdrop-blur-xl bg-slate-950/85 border border-slate-700/80 rounded-xl px-3 sm:px-4 py-2 shadow-2xl flex items-center justify-between gap-3 text-xs sm:text-sm">
          {/* Left / Center: Step Badge + Title + One-line Summary */}
          <div className="flex items-center gap-2.5 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              STEP {activeStep.stepNumber}/6
            </span>
            <span className="shrink-0 font-bold text-slate-100 tracking-wide">
              {activeStep.title.replace(/^\d+\.\s*/, '')}
            </span>
            <span className="text-slate-500 hidden md:inline">•</span>
            <span className="text-slate-300 font-normal truncate hidden sm:inline" title={activeStep.detail}>
              {activeStep.detail}
            </span>
          </div>

          {/* Right: Live Telemetry Chips */}
          <div className="flex items-center gap-2 text-xs font-mono shrink-0">
            <div className="flex items-center gap-1 text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded-md border border-cyan-800/60">
              <Compass className="w-3 h-3" />
              <span>{telemetry.elevationAngle}°</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-800/60">
              <Wifi className="w-3 h-3" />
              <span>{telemetry.pingMs}ms</span>
            </div>
            <div className="hidden lg:flex items-center gap-1 text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-800/60">
              <Activity className="w-3 h-3" />
              <span>550 KM</span>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Bottom Compact Controls with Step Dropdown Menu */}
      <footer className="w-full flex flex-col items-center gap-2 pointer-events-auto max-w-2xl mx-auto">
        {/* Layer settings popover if toggled */}
        {showSettings && (
          <div className="backdrop-blur-xl bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-center gap-2 text-xs shadow-2xl mb-1">
            <span className="text-slate-400 font-mono text-[11px] mr-1">LAYERS:</span>
            <button
              id="toggle-rf-layer"
              type="button"
              onClick={() => onToggleLayer('rfBeams')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                layers.rfBeams
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'text-slate-400 border-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              RF Beams
            </button>
            <button
              id="toggle-lasers-layer"
              type="button"
              onClick={() => onToggleLayer('spaceLasers')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                layers.spaceLasers
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'text-slate-400 border-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Space Lasers
            </button>
            <button
              id="toggle-orbit-layer"
              type="button"
              onClick={() => onToggleLayer('orbitTracks')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                layers.orbitTracks
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                  : 'text-slate-400 border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Orbit Rings
            </button>
            <button
              id="toggle-atmosphere-layer"
              type="button"
              onClick={() => onToggleLayer('atmosphere')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                layers.atmosphere
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                  : 'text-slate-400 border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Atmosphere
            </button>
          </div>
        )}

        {/* Compact Single-Row Control Bar with Step Dropdown */}
        <div className="w-full backdrop-blur-xl bg-slate-950/90 border border-slate-800 rounded-2xl p-2 sm:p-2.5 flex items-center justify-between gap-2 shadow-2xl">
          {/* Left: Previous Button */}
          <button
            id="btn-prev-step"
            type="button"
            onClick={handlePrevStep}
            className="flex items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-850 border border-slate-700/60 transition-all shrink-0"
            title="Previous step"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Prev</span>
          </button>

          {/* Center: Step Selector Dropdown & Playback Controls */}
          <div className="flex items-center gap-2 flex-1 max-w-md justify-center min-w-0">
            {/* Step Selection Dropdown */}
            <div className="relative flex-1 min-w-[150px] max-w-[260px]">
              <select
                id="step-dropdown-select"
                value={cameraPreset}
                onChange={handleSelectChange}
                className="w-full appearance-none bg-slate-900/90 hover:bg-slate-850 text-slate-200 text-xs sm:text-sm font-medium py-2 pl-3 pr-8 rounded-xl border border-slate-700/70 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/40 cursor-pointer transition-all truncate"
              >
                {STARLINK_STEPS.map((step) => (
                  <option key={step.id} value={step.id} className="bg-slate-950 text-slate-200">
                    Step {step.stepNumber}: {step.title.replace(/^\d+\.\s*/, '')}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Play/Pause Button */}
            <button
              id="btn-play-pause"
              type="button"
              onClick={onTogglePlay}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isPlaying
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isPlaying ? 'Pause simulation' : 'Resume simulation'}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Play</span>
                </>
              )}
            </button>

            {/* Auto-Tour Toggle */}
            <button
              id="btn-auto-tour"
              type="button"
              onClick={onToggleAutoTour}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border transition-all shrink-0 ${
                autoTour
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
              title="Automatically advance through all stages"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  autoTour ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                }`}
              />
              <span className="hidden md:inline">Auto-Tour: {autoTour ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Right: Layers and Next Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="btn-settings-toggle"
              type="button"
              onClick={() => setShowSettings((prev) => !prev)}
              className={`p-2 rounded-xl border transition-all ${
                showSettings
                  ? 'bg-slate-800 text-cyan-400 border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
              title="Toggle visual layers"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              id="btn-next-step"
              type="button"
              onClick={handleNextStep}
              className="flex items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-850 border border-slate-700/60 transition-all"
              title="Next step"
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
