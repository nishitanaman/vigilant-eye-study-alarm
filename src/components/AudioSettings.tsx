/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AlarmTone } from "../types";
import { Volume2, VolumeX, Flame, Settings, ShieldAlert, BadgeAlert } from "lucide-react";
import { audioSynth } from "../utils/audio";

interface AudioSettingsProps {
  volume: number;
  setVolume: (v: number) => void;
  toneType: AlarmTone;
  setToneType: (t: AlarmTone) => void;
  strictMode: boolean;
  setStrictMode: (s: boolean) => void;
}

export function AudioSettings({
  volume,
  setVolume,
  toneType,
  setToneType,
  strictMode,
  setStrictMode
}: AudioSettingsProps) {
  const [isTesting, setIsTesting] = useState(false);

  const toggleTest = () => {
    if (isTesting) {
      audioSynth.stop();
      setIsTesting(false);
    } else {
      audioSynth.initCtx();
      audioSynth.setVolume(volume);
      audioSynth.start(toneType);
      setIsTesting(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (isTesting) {
      audioSynth.setVolume(v);
    }
  };

  const selectTone = (tone: AlarmTone) => {
    setToneType(tone);
    if (isTesting) {
      audioSynth.start(tone);
    }
  };

  // Turn off test tone if settings unmount
  React.useEffect(() => {
    return () => {
      audioSynth.stop();
    };
  }, []);

  return (
    <div className="flex flex-col gap-5 w-full bg-[#12141C] rounded-2xl border border-gray-800 p-5 shadow-2xl" id="audio-settings-container">
      <div className="flex items-center gap-3 border-b border-gray-800/80 pb-4">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white font-sans tracking-tight uppercase">Response Subsystem</h2>
          <p className="text-[10px] text-gray-500 font-mono tracking-wider leading-none uppercase">ALARM & SYNTH CONFIGURATION</p>
        </div>
      </div>

      {/* Scream tone types */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-semibold text-gray-300 font-sans uppercase tracking-wider">Alarm Audio Profile</label>
        <div className="grid grid-cols-2 gap-2" id="tone-selector-grid">
          {[
            { id: AlarmTone.SIREN, name: "Industrial Siren", desc: "Dual modulated oscillator" },
            { id: AlarmTone.SQUEAL, name: "Piercing Screecher", desc: "Detuned psychoacoustic squeal" },
            { id: AlarmTone.PULSE, name: "Strobe Warning", desc: "Rapid 1.2kHz sound pulse" },
            { id: AlarmTone.SWEEP, name: "Meltdown Sweep", desc: "Rising frequency laser blast" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => selectTone(item.id)}
              className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.01] cursor-pointer ${
                toneType === item.id
                  ? "bg-blue-600/10 border-blue-500/50 text-blue-400 font-bold"
                  : "bg-black/40 border-gray-800 text-gray-400 hover:border-gray-700 hover:bg-black/60"
              }`}
            >
              <div className="text-xs font-semibold font-sans">{item.name}</div>
              <div className="text-[10px] text-gray-500 font-mono mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Volume knob / slider */}
      <div className="flex flex-col gap-2 bg-black/35 border border-gray-800/50 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400 font-sans flex items-center gap-1.5 uppercase tracking-wider">
            {volume === 0 ? <VolumeX className="w-4 h-4 text-gray-500" /> : <Volume2 className="w-4 h-4 text-blue-550" />}
            Scream Amplitude Range
          </span>
          <span className="text-[10px] font-mono font-bold text-blue-400">{Math.round(volume * 100)}%</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="1.0"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 accent-blue-500 bg-gray-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Extreme strict mode and test toggle button */}
      <div className="flex flex-col gap-3">
        {/* Strict wake up toggle */}
        <div className="flex items-start justify-between bg-black/35 border border-gray-800/50 rounded-xl p-3.5 gap-4">
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="strict-mode-toggle"
              checked={strictMode}
              onChange={(e) => setStrictMode(e.target.checked)}
              className="mt-1 accent-blue-500 h-4 w-4 bg-gray-800 border-gray-750 rounded cursor-pointer"
            />
            <label htmlFor="strict-mode-toggle" className="cursor-pointer">
              <span className="text-xs font-semibold text-gray-200 font-sans flex items-center gap-1.5 leading-none uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5 text-blue-500 animate-pulse" /> Strict Wake-Up Protocol
              </span>
              <p className="text-[10px] text-gray-400 font-sans mt-1 leading-relaxed">
                Requires holding a puzzle button for 3 seconds to silence alarms. Strobes your browser window. Inhibits self-healing snoozing.
              </p>
            </label>
          </div>
        </div>

        {/* Test alarm trigger */}
        <button
          onClick={toggleTest}
          className={`w-full py-2.5 rounded-xl border font-sans font-semibold text-xs tracking-widest transition-all hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-2 ${
            isTesting
              ? "bg-red-600 hover:bg-red-500 text-white border-red-500 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.4)]"
              : "bg-black hover:bg-gray-900 text-gray-300 border-gray-800"
          }`}
          id="test-alarm-trigger-btn"
        >
          {isTesting ? (
            <>
              <VolumeX className="w-4 h-4 animate-bounce" /> SILENCE TEST SOUND
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" /> COMPREHENSIVE SIREN TEST
            </>
          )}
        </button>
      </div>
    </div>
  );
}
