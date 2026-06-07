/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { SessionStats } from "../types";
import { Flame, Hourglass, BellRing, RefreshCw, Sliders, CalendarClock } from "lucide-react";

interface SessionDashboardProps {
  stats: SessionStats;
  onResetStats: () => void;
  threshold: number;
  setThreshold: (t: number) => void;
  triggerDelay: number;
  setTriggerDelay: (d: number) => void;
}

export function SessionDashboard({
  stats,
  onResetStats,
  threshold,
  setThreshold,
  triggerDelay,
  setTriggerDelay
}: SessionDashboardProps) {
  // Helpers to Format duration in HH:MM:SS or MM:SS
  const formatDurationFull = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatDurationMinSec = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-5 w-full bg-[#12141C] rounded-2xl border border-gray-800 p-5 shadow-2xl" id="session-dashboard-container">
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Flame className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white font-sans tracking-tight uppercase">Active Focus Core</h2>
            <p className="text-[10px] text-gray-500 font-mono tracking-wider leading-none uppercase">REAL-TIME ANALYTIC HUD</p>
          </div>
        </div>

        <button
          onClick={onResetStats}
          className="p-1 px-3.5 rounded-lg bg-black border border-gray-800 hover:border-gray-705 text-gray-400 hover:text-white text-[10px] font-mono tracking-widest font-semibold transition-all cursor-pointer flex items-center gap-1.5"
          id="reset-stats-btn"
          title="Reset timer and incident records"
        >
          <RefreshCw className="w-3 h-3" /> RESET LABS
        </button>
      </div>

      {/* Grid of 4 beautiful statistics panels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" id="analytics-statistics-grid">
        {/* Total Focus */}
        <div className="bg-black/35 border border-gray-800/80 rounded-xl p-3.5 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-[9px] text-gray-500 uppercase tracking-widest font-bold font-sans">
            <Hourglass className="w-3 h-3 text-gray-400" /> Session Time
          </div>
          <div className="text-lg font-bold font-mono text-white tracking-tight leading-none mt-1">
            {formatDurationFull(stats.elapsedSeconds)}
          </div>
          <span className="text-[9px] text-gray-500 font-mono">Elapsed focus run</span>
        </div>

        {/* Current Active Streak */}
        <div className="bg-black/35 border border-gray-800/80 rounded-xl p-3.5 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-[9px] text-blue-400 uppercase tracking-widest font-bold font-sans">
            <Flame className="w-3 h-3 text-blue-400" /> Awake Streak
          </div>
          <div className="text-lg font-bold font-mono text-blue-400 tracking-tight leading-none mt-1">
            {formatDurationMinSec(stats.currentStreakSeconds)}
          </div>
          <span className="text-[9px] text-gray-550 font-mono">Continuous vigilant state</span>
        </div>

        {/* Longest Wake Streak */}
        <div className="bg-black/35 border border-gray-800/80 rounded-xl p-3.5 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-[9px] text-gray-500 uppercase tracking-widest font-bold font-sans">
            <CalendarClock className="w-3 h-3 text-gray-400" /> MAX AWAKE
          </div>
          <div className="text-lg font-bold font-mono text-white tracking-tight leading-none mt-1">
            {formatDurationMinSec(stats.longestStreakSeconds)}
          </div>
          <span className="text-[9px] text-gray-500 font-mono">Continuous record max</span>
        </div>

        {/* Doze Alerts sounded */}
        <div className="bg-black/35 border border-gray-800/80 rounded-xl p-3.5 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-[9px] text-red-400 uppercase tracking-widest font-bold font-sans">
            <BellRing className="w-3 h-3 text-red-500" /> DOZE ALERTS
          </div>
          <div className="text-lg font-bold font-mono text-red-400 tracking-tight leading-none mt-1">
            {stats.dozeCount}
          </div>
          <span className="text-[9px] text-gray-500 font-mono">
            {stats.lastAlarmTime ? `Last: ${stats.lastAlarmTime}` : "No doze incidents"}
          </span>
        </div>
      </div>

      {/* Threshold Slider and Delays Slider stacked (Calibration Deck) */}
      <div className="flex flex-col gap-4 bg-black/25 border border-gray-800/60 rounded-xl p-4 mt-1">
        <h4 className="text-xs font-semibold text-gray-300 font-mono tracking-wider uppercase flex items-center gap-1.5 leading-none">
          <Sliders className="w-4 h-4 text-blue-500 animate-pulse" /> Calibration Controls
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
          {/* Eye aspect ratio sensitivity */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label htmlFor="ear-threshold-slider" className="text-xs font-medium text-gray-400 font-sans">Sensitivity Threshold (EAR)</label>
              <span className="text-xs font-bold font-mono text-blue-400">{threshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              id="ear-threshold-slider"
              min="0.10"
              max="0.30"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="accent-blue-500 bg-gray-800 h-1.5 rounded-lg appearance-none cursor-pointer w-full"
            />
            <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
              If aspect ratio drops below this value, eye is registered as closed. Set higher if you wear glasses.
            </p>
          </div>

          {/* Trigger delay */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label htmlFor="trigger-delay-slider" className="text-xs font-medium text-gray-400 font-sans">Trigger Activation Delay</label>
              <span className="text-xs font-bold font-mono text-blue-400">{triggerDelay}ms</span>
            </div>
            <input
              type="range"
              id="trigger-delay-slider"
              min="300"
              max="2500"
              step="100"
              value={triggerDelay}
              onChange={(e) => setTriggerDelay(parseInt(e.target.value))}
              className="accent-blue-500 bg-gray-800 h-1.5 rounded-lg appearance-none cursor-pointer w-full"
            />
            <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
              Continuous duration to trip the siren. High delay checks reduce false triggers from natural micro blinks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
