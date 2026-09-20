/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Target, Play, Pause, Repeat, Mountain, Network } from 'lucide-react';
import { StarlinkCanvas } from './components/StarlinkCanvas';
import { InternetTopologyView, RoutingMode } from './components/InternetTopologyView';

interface StepInfo {
  step: number;
  title: string;
  detail: string;
  dotColor: string;
  badgeBg: string;
  ringColor: string;
}

const STEPS: StepInfo[] = [
  {
    step: 1,
    title: 'Phased-Array Uplink',
    detail: 'Dual User Terminals → Satellite',
    dotColor: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
    badgeBg: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60',
    ringColor: 'border-cyan-500/40',
  },
  {
    step: 2,
    title: 'Space Laser Routing',
    detail: 'Inter-Satellite Optical Mesh',
    dotColor: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
    badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
    ringColor: 'border-emerald-500/40',
  },
  {
    step: 3,
    title: 'Gateway Downlink & Fiber',
    detail: 'Satellite → Ground Station Radomes',
    dotColor: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
    badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
    ringColor: 'border-amber-500/40',
  },
  {
    step: 4,
    title: 'Beam Handover & Constellation Loop',
    detail: 'Seamless Handshake to Rising Satellite',
    dotColor: 'bg-sky-400 shadow-[0_0_8px_#38bdf8]',
    badgeBg: 'bg-sky-950/80 text-sky-300 border-sky-800/60',
    ringColor: 'border-sky-500/40',
  },
];

const SPEED_OPTIONS = [0.1, 0.25, 0.5, 1.0];

export default function App() {
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [targetPhase, setTargetPhase] = useState<number | null>(null);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.5);
  const [loopStep, setLoopStep] = useState<boolean>(false);
  const [showPacketInspector, setShowPacketInspector] = useState<boolean>(false);
  const [routingMode, setRoutingMode] = useState<RoutingMode>('laser-mesh');

  const handleSelectStep = (stepNumber: number) => {
    setTargetPhase(stepNumber);
    setCurrentPhase(stepNumber);
  };

  const handlePrev = () => {
    const prev = currentPhase <= 1 ? 4 : currentPhase - 1;
    handleSelectStep(prev);
  };

  const handleNext = () => {
    const next = currentPhase >= 4 ? 1 : currentPhase + 1;
    handleSelectStep(next);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const prev = currentPhase <= 1 ? 4 : currentPhase - 1;
        handleSelectStep(prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const next = currentPhase >= 4 ? 1 : currentPhase + 1;
        handleSelectStep(next);
      } else if (e.key === '[' || e.key === '-') {
        setPlaybackSpeed((s) => (s <= 0.15 ? 0.1 : s <= 0.35 ? 0.1 : s <= 0.75 ? 0.25 : 0.5));
      } else if (e.key === ']' || e.key === '=' || e.key === '+') {
        setPlaybackSpeed((s) => (s <= 0.15 ? 0.25 : s <= 0.35 ? 0.5 : 1.0));
      } else if (e.key >= '1' && e.key <= '4') {
        handleSelectStep(parseInt(e.key, 10));
      } else if (e.key === 'i' || e.key === 'I') {
        setShowPacketInspector((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowPacketInspector(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPhase]);

  const activeStep = STEPS[currentPhase - 1] || STEPS[0];

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D WebGL Canvas */}
      <StarlinkCanvas
        onPhaseChange={setCurrentPhase}
        targetPhase={targetPhase}
        showLabels={showLabels}
        isPaused={isPaused}
        playbackSpeed={playbackSpeed}
        loopStep={loopStep}
        routingMode={routingMode}
      />

      {/* Single-Line Step Indicator Bar & Playback Controls */}
      <div className="fixed top-4 inset-x-0 z-30 flex justify-center px-3 pointer-events-none">
        <div
          id="single-line-step-indicator"
          className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-800/90 shadow-2xl shadow-black/80 text-xs sm:text-sm text-slate-200 select-none whitespace-nowrap max-w-[calc(100vw-24px)] overflow-hidden transition-all duration-300"
        >
          {/* Play / Pause Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            aria-label={isPaused ? 'Resume animation (Space)' : 'Pause animation (Space)'}
            title={isPaused ? 'Resume animation (Space)' : 'Pause this step (Space)'}
            className={`p-1 sm:p-1.5 rounded-full transition-all focus:outline-none flex items-center justify-center shrink-0 ${
              isPaused
                ? 'bg-amber-400 text-slate-950 font-bold shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            {isPaused ? (
              <Play className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Pause className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          {/* Previous Step Button */}
          <button
            onClick={handlePrev}
            aria-label="Previous step (Left Arrow)"
            title="Previous step (Left Arrow)"
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors focus:outline-none"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Glowing Status Dot */}
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${activeStep.dotColor} ${
              isPaused ? 'opacity-80' : 'animate-pulse'
            }`}
          />

          {/* Step Pill */}
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold border ${activeStep.badgeBg} shrink-0`}
          >
            {isPaused ? 'Paused' : `Step ${activeStep.step} of 4`}
          </span>

          {/* Step Title */}
          <span className="font-semibold text-slate-100 tracking-wide">
            {activeStep.title}
          </span>

          {/* Step Sub-Detail (Desktop / Tablet) */}
          <span className="hidden lg:inline text-slate-400 font-normal text-xs">
            ({activeStep.detail})
          </span>

          {/* Direct Step Jump Buttons (1, 2, 3, 4) */}
          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-800/80 shrink-0">
            {STEPS.map((s) => (
              <button
                key={s.step}
                onClick={() => handleSelectStep(s.step)}
                title={`Jump to Step ${s.step}: ${s.title}`}
                className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full text-[10px] sm:text-[11px] font-medium transition-all ${
                  currentPhase === s.step
                    ? 'bg-white text-slate-950 font-bold scale-105 shadow-sm shadow-white/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {s.step}
              </button>
            ))}
          </div>

          {/* Next Step Button */}
          <button
            onClick={handleNext}
            aria-label="Next step (Right Arrow)"
            title="Next step (Right Arrow)"
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors focus:outline-none"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Explicit Speed / Slow Down Controls (High Discoverability) */}
          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-800/80 shrink-0">
            <span className="hidden xl:inline text-[10px] text-slate-400 font-medium mr-0.5">Speed:</span>
            {[
              { val: 0.1, label: '0.1x', title: 'Ultra Slow / Study (0.1x)' },
              { val: 0.25, label: '0.25x', title: 'Slow Motion (0.25x)' },
              { val: 0.5, label: '0.5x', title: 'Steady Pace (0.5x - Default)' },
              { val: 1.0, label: '1x', title: 'Normal Speed (1.0x)' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setPlaybackSpeed(opt.val)}
                title={opt.title}
                className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-medium transition-all ${
                  playbackSpeed === opt.val
                    ? opt.val <= 0.5
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-400/30'
                      : 'bg-white text-slate-950 font-bold shadow-sm shadow-white/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Loop Step Toggle Button */}
          <button
            onClick={() => setLoopStep(!loopStep)}
            title={
              loopStep
                ? 'Step looping ON: Repeats current step continuously'
                : 'Click to loop and stay on this step'
            }
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium transition-all border shrink-0 ${
              loopStep
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/70 shadow-[0_0_8px_rgba(99,102,241,0.25)]'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Repeat className="w-3 h-3" />
            <span className="hidden md:inline">{loopStep ? 'Looping' : 'Loop'}</span>
          </button>

          {/* Toggle 3D Labels Button */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            title={showLabels ? 'Hide 3D object markers' : 'Show 3D object markers'}
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium transition-all border shrink-0 ${
              showLabels
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/70'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Target className="w-3 h-3" />
            <span className="hidden xs:inline">{showLabels ? 'Markers' : 'Off'}</span>
          </button>

          {/* Internet Packet Flow / Routing Inspector Button */}
          <button
            onClick={() => setShowPacketInspector(true)}
            title="Open Interactive Internet Packet Flow & BGP Routing Inspector"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium transition-all border shrink-0 bg-blue-950/80 text-blue-300 border-blue-600/70 hover:bg-blue-900/80 hover:text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]"
          >
            <Network className="w-3 h-3 text-blue-400" />
            <span className="font-semibold">Routing Inspector</span>
          </button>

          {/* Elevation Datum Badge (Phase 1/3) */}
          <div className="hidden lg:flex items-center gap-1 pl-1.5 border-l border-slate-800/80 text-[10px] text-slate-400 shrink-0">
            <Mountain className="w-3 h-3 text-emerald-400" />
            <span>
              {currentPhase === 1 ? 'Terminal: 3,100m ASL' : currentPhase === 3 ? 'Gateway: 340m ASL' : 'LEO Orbit: 550km'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Internet Packet Flow / Routing Inspector Modal */}
      <InternetTopologyView
        isOpen={showPacketInspector}
        onClose={() => setShowPacketInspector(false)}
        currentPhase={currentPhase}
        routingMode={routingMode}
        onRoutingModeChange={setRoutingMode}
        playbackSpeed={playbackSpeed}
      />
    </main>
  );
}
