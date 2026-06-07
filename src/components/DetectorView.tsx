/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AppStatus } from "../types";
import { Video, Eye, EyeOff, ShieldAlert } from "lucide-react";

interface DetectorViewProps {
  status: AppStatus;
  faceDetected: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  leftEAR: number;
  rightEAR: number;
  threshold: number;
  triggerDelay: number;
  isClosedRef: React.MutableRefObject<boolean>;
  onStart: () => void;
  onStop: () => void;
  errorMsg: string | null;
}

export function DetectorView({
  status,
  faceDetected,
  videoRef,
  canvasRef,
  leftEAR,
  rightEAR,
  threshold,
  triggerDelay,
  isClosedRef,
  onStart,
  onStop,
  errorMsg
}: DetectorViewProps) {
  // Map raw EAR values (approx 0.0 to 0.4) to a 0-100% scale for the gauges
  const getEarPercentage = (ear: number) => {
    return Math.min(100, Math.max(0, (ear / 0.38) * 100));
  };

  const leftPct = getEarPercentage(leftEAR);
  const rightPct = getEarPercentage(rightEAR);
  const thresholdPct = getEarPercentage(threshold);

  const isLeftClosed = leftEAR < threshold && leftEAR > 0;
  const isRightClosed = rightEAR < threshold && rightEAR > 0;
  const bothClosed = isLeftClosed && isRightClosed;

  return (
    <div className="flex flex-col gap-5 w-full bg-[#12141C] rounded-2xl border border-gray-800 p-5 shadow-2xl" id="detector-view-container">
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status === AppStatus.MONITORING ? 'bg-blue-500/10 text-blue-400 animate-pulse font-bold' : 'bg-gray-800/60 text-gray-400'}`}>
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white font-sans tracking-tight uppercase">Eye Monitor Chamber</h2>
            <p className="text-[10px] text-gray-500 font-mono tracking-wider leading-none uppercase">
              {status === AppStatus.MONITORING 
                ? (bothClosed ? "CRITICAL: APERTURE DISRUPTION" : faceDetected ? "VIGILANT TRACKER ACTIVE" : "CALIBRATING TARGET LOCK...")
                : "CAMERA MONITOR STANDBY"}
            </p>
          </div>
        </div>

        <div>
          {status === AppStatus.MONITORING ? (
            <button
              onClick={onStop}
              className="px-4 py-1.5 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-600 hover:text-white transition-all text-xs font-mono tracking-wider font-semibold cursor-pointer"
              id="stop-monitor-btn"
            >
              SHUT DOWN FEED
            </button>
          ) : (
            <button
              onClick={onStart}
              disabled={status === AppStatus.LOADING}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans font-semibold hover:scale-[1.02] transform transition-all text-xs tracking-widest cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.25)] disabled:opacity-50 disabled:pointer-events-none"
              id="start-monitor-btn"
            >
              ENGAGE CAMERA MONITOR
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-950/30 border border-red-800/50 rounded-xl flex items-start gap-3" id="detector-error-box">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-red-400 font-mono">CRITICAL ACCESS ERROR</h4>
            <p className="text-xs text-red-300/80 mt-1 leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Main viewport */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-gray-800 shadow-inner flex items-center justify-center group" id="viewport-container">
        {status === AppStatus.MONITORING ? (
          <>
            {/* Real video stream */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              playsInline
              muted
              autoPlay
            />
            {/* Real-time canvas telemetry overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
            />

            {!faceDetected && (
              <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-3 animate-fade-in">
                <div className="w-12 h-12 rounded-full border-2 border-gray-850 border-t-blue-500 animate-spin flex items-center justify-center" />
                <p className="text-xs text-blue-400 font-mono tracking-widest uppercase">Target lock pending...</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-xs gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center">
              <EyeOff className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">FEED OFFLINE</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Unlock targeting monitor by pressing the action item above. Local machine vision detects face mesh vector aperture levels securely.
              </p>
            </div>
          </div>
        )}

        {/* Floating live hud indicators */}
        {status === AppStatus.MONITORING && faceDetected && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-2 rounded-lg bg-[#0F1115]/90 backdrop-blur-md border border-gray-800 pointer-events-none">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isLeftClosed ? "bg-red-500 animate-ping" : "bg-green-500"}`} />
                <span className="text-[9px] font-mono text-gray-300">LEFT EYE: {Math.round(leftPCT(leftPct))}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isRightClosed ? "bg-red-500 animate-ping" : "bg-green-500"}`} />
                <span className="text-[9px] font-mono text-gray-300">RIGHT EYE: {Math.round(rightPCT(rightPct))}%</span>
              </div>
            </div>
            <div className="text-[9px] font-mono text-gray-550">
              ACTIVATION INERTIA: {triggerDelay}ms DELAY
            </div>
          </div>
        )}
      </div>

      {/* Reactive Twin Eye Metrics */}
      <div className="grid grid-cols-2 gap-4 mt-1" id="eye-metric-gauges-container">
        {/* Left Eye widget */}
        <div className="bg-[#191D28]/35 border border-gray-800/65 rounded-xl p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300 font-sans flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-500" /> Left Eye
            </span>
            <span className="text-xs font-mono text-gray-400">
              {leftEAR > 0 ? leftEAR.toFixed(3) : "—"} <span className="text-[10px] text-gray-600">EAR</span>
            </span>
          </div>

          <div className="relative h-6 bg-gray-950 rounded-lg border border-gray-850 overflow-hidden flex items-center">
            {/* Calibrated Threshold indicator vertical line */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 opacity-70"
              style={{ left: `${thresholdPct}%` }}
              title={`Threshold: ${threshold.toFixed(2)}`}
            />

            {/* Live measurement filling */}
            <div
              className={`h-full opacity-80 transition-all duration-75 ${isLeftClosed ? "bg-red-500/20 border-r-2 border-red-500" : "bg-blue-500/20 border-r-2 border-blue-550"}`}
              style={{ width: `${leftPct}%` }}
            />

            <div className="absolute inset-x-3 flex justify-between items-center pointer-events-none">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest leading-none">
                {isLeftClosed ? "CLOSED" : "SAFE"}
              </span>
              <span className="text-[10px] font-mono font-semibold text-gray-400">
                {Math.round(leftPct)}%
              </span>
            </div>
          </div>
        </div>

        {/* Right Eye widget */}
        <div className="bg-[#191D28]/35 border border-gray-800/65 rounded-xl p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300 font-sans flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-500" /> Right Eye
            </span>
            <span className="text-xs font-mono text-gray-400">
              {rightEAR > 0 ? rightEAR.toFixed(3) : "—"} <span className="text-[10px] text-gray-600">EAR</span>
            </span>
          </div>

          <div className="relative h-6 bg-gray-950 rounded-lg border border-gray-850 overflow-hidden flex items-center">
            {/* Calibrated Threshold indicator vertical line */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 opacity-70"
              style={{ left: `${thresholdPct}%` }}
              title={`Threshold: ${threshold.toFixed(2)}`}
            />

            {/* Live measurement filling */}
            <div
              className={`h-full opacity-80 transition-all duration-75 ${isRightClosed ? "bg-red-500/20 border-r-2 border-red-500" : "bg-blue-500/20 border-r-2 border-blue-550"}`}
              style={{ width: `${rightPct}%` }}
            />

            <div className="absolute inset-x-3 flex justify-between items-center pointer-events-none">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest leading-none">
                {isRightClosed ? "CLOSED" : "SAFE"}
              </span>
              <span className="text-[10px] font-mono font-semibold text-gray-400">
                {Math.round(rightPct)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple fallback helper safely bound inside scope
function leftPCT(val: number) {
  return isNaN(val) ? 0 : val;
}
function rightPCT(val: number) {
  return isNaN(val) ? 0 : val;
}
