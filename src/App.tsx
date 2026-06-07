/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AppStatus, AlarmTone, SessionStats } from "./types";
import { useFaceDetector } from "./hooks/useFaceDetector";
import { DetectorView } from "./components/DetectorView";
import { SessionDashboard } from "./components/SessionDashboard";
import { AudioSettings } from "./components/AudioSettings";
import { audioSynth } from "./utils/audio";
import { 
  Flame, 
  Moon, 
  ShieldAlert, 
  Fingerprint, 
  FileSpreadsheet, 
  Sparkles, 
  Coffee,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface IncidentLog {
  id: string;
  time: string;
  event: string;
  details: string;
}

export default function App() {
  const {
    status,
    setStatus,
    errorMsg,
    setErrorMsg,
    faceDetected,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    lastResultRef
  } = useFaceDetector();

  // Calibration/Sensitivity
  const [threshold, setThreshold] = useState<number>(0.20);
  const [triggerDelay, setTriggerDelay] = useState<number>(800);

  // Audio configuration
  const [volume, setVolume] = useState<number>(0.5);
  const [toneType, setToneType] = useState<AlarmTone>(AlarmTone.SIREN);
  const [strictMode, setStrictMode] = useState<boolean>(false);

  // Session Statistics
  const [stats, setStats] = useState<SessionStats>({
    elapsedSeconds: 0,
    dozeCount: 0,
    currentStreakSeconds: 0,
    longestStreakSeconds: 0,
    lastAlarmTime: null
  });

  // Incident log tracking
  const [logs, setLogs] = useState<IncidentLog[]>([]);

  // Real-time eye values synced at throttled levels to prevent react layout thrashing
  const [leftEAR, setLeftEAR] = useState<number>(0);
  const [rightEAR, setRightEAR] = useState<number>(0);

  // Core alarm state
  const [isAlarmRinging, setIsAlarmRinging] = useState<boolean>(false);
  const isAlarmRingingRef = useRef<boolean>(false);

  // Refs for checking interval bindings
  const thresholdRef = useRef(threshold);
  const triggerDelayRef = useRef(triggerDelay);
  const toneTypeRef = useRef(toneType);
  const strictModeRef = useRef(strictMode);

  // Strict mode hold scanner stats
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const holdIntervalRef = useRef<number | null>(null);

  // Synced Live Clock for the midnight study vibe
  const [clockTime, setClockTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setClockTime(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync state variables to refs to prevent interval tear-downs while active
  useEffect(() => { thresholdRef.current = threshold; }, [threshold]);
  useEffect(() => { triggerDelayRef.current = triggerDelay; }, [triggerDelay]);
  useEffect(() => { toneTypeRef.current = toneType; }, [toneType]);
  useEffect(() => { strictModeRef.current = strictMode; }, [strictMode]);

  // Handle volume changes immediately in audio class
  useEffect(() => {
    audioSynth.setVolume(volume);
  }, [volume]);

  // Clean trigger loops on alarm shutdowns
  const silenceAlarm = useCallback(() => {
    if (!isAlarmRingingRef.current) return;
    isAlarmRingingRef.current = false;
    setIsAlarmRinging(false);
    audioSynth.stop();

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [
      {
        id: Date.now().toString(),
        time: timestamp,
        event: "COGNIZANCE VERIFIED",
        details: "Alarm manually/auto silenced. Awake streak resumed."
      },
      ...prev
    ]);
  }, []);

  const triggerAlarm = useCallback(() => {
    if (isAlarmRingingRef.current) return;
    isAlarmRingingRef.current = true;
    setIsAlarmRinging(true);
    
    audioSynth.initCtx();
    audioSynth.setVolume(volume);
    audioSynth.start(toneTypeRef.current);

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [
      {
        id: Date.now().toString(),
        time: timestamp,
        event: "EYE CLOSURE SIREN",
        details: `Eye aspect ratio collapsed. Alarm tone type: ${toneTypeRef.current}.`
      },
      ...prev
    ]);

    setStats(prev => ({
      ...prev,
      dozeCount: prev.dozeCount + 1,
      currentStreakSeconds: 0,
      lastAlarmTime: timestamp
    }));
  }, [volume]);

  // Active Surveillance tracking mechanism
  useEffect(() => {
    if (status !== AppStatus.MONITORING) {
      if (isAlarmRingingRef.current) {
        silenceAlarm();
      }
      return;
    }

    // Cumulative stats increments (1Hz ticks)
    const statsTick = setInterval(() => {
      setStats(prev => {
        const nextStreak = prev.currentStreakSeconds + 1;
        return {
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
          currentStreakSeconds: nextStreak,
          longestStreakSeconds: Math.max(prev.longestStreakSeconds, nextStreak)
        };
      });
    }, 1000);

    // Blindingly fast assessment clock (50ms cycles)
    let closedTriggerTime: number | null = null;
    const apertureTick = setInterval(() => {
      const lastResult = lastResultRef.current;

      setLeftEAR(lastResult.leftEAR);
      setRightEAR(lastResult.rightEAR);

      if (!lastResult.faceDetected) {
        closedTriggerTime = null;
        return;
      }

      const isLeftClosed = lastResult.leftEAR < thresholdRef.current && lastResult.leftEAR > 0;
      const isRightClosed = lastResult.rightEAR < thresholdRef.current && lastResult.rightEAR > 0;
      const bothEyesClosed = isLeftClosed && isRightClosed;

      if (bothEyesClosed) {
        if (closedTriggerTime === null) {
          closedTriggerTime = Date.now();
        } else if (Date.now() - closedTriggerTime >= triggerDelayRef.current) {
          triggerAlarm();
        }
      } else {
        closedTriggerTime = null;
        // Standard (Non-Strict Mode) auto-silencing when user wakes up (opens eyes)
        if (isAlarmRingingRef.current && !strictModeRef.current) {
          silenceAlarm();
        }
      }
    }, 50);

    return () => {
      clearInterval(statsTick);
      clearInterval(apertureTick);
    };
  }, [status, lastResultRef, triggerAlarm, silenceAlarm]);

  // Strict Hold Scanner controls
  const handleHoldStart = () => {
    setIsHolding(true);
    const start = Date.now();
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, (elapsed / 3000) * 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        if (holdIntervalRef.current) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = null;
        }
        setIsHolding(false);
        setHoldProgress(0);
        silenceAlarm();
      }
    }, 50) as any;
  };

  const handleHoldEnd = () => {
    setIsHolding(false);
    setHoldProgress(0);
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const handleResetStats = () => {
    setStats({
      elapsedSeconds: 0,
      dozeCount: 0,
      currentStreakSeconds: 0,
      longestStreakSeconds: 0,
      lastAlarmTime: null
    });
    setLogs([]);
  };

  // Safe manual audio engine test release
  const handleStartMonitor = () => {
    audioSynth.initCtx(); // authorize audio elements inside gesture
    startCamera();
  };

  const handleStopMonitor = () => {
    stopCamera();
    setStatus(AppStatus.READY);
    if (isAlarmRingingRef.current) {
      silenceAlarm();
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-gray-200 flex flex-col antialiased selection:bg-blue-600/30 selection:text-blue-400" id="main-application-frame">
      {/* Visual Header */}
      <header className="border-b border-gray-800 bg-[#12141C]/90 sticky top-0 z-40 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)]">
              <Moon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold font-display tracking-wider text-white">VIGILANT<span className="text-blue-500">EYE</span> STUDY ALARM</h1>
              <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">SECURE LOCAL MACHINE VISION GUARDIAN</p>
            </div>
          </div>

          <div className="flex items-center gap-5 self-end sm:self-auto bg-black/40 border border-gray-800 px-4 py-1.5 rounded-xl">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status === AppStatus.MONITORING ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-[9px] font-mono tracking-widest text-gray-550 uppercase">SYSTEM FEED:</span>
            </div>
            <span className="text-xs font-bold font-mono text-blue-400 tracking-wider">
              {clockTime || "00:00:00"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Focus Canvas Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5" id="main-study-shield-grid">
        
        {/* LEFT COLUMN (Camera view & interactive parameters) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <DetectorView
            status={status}
            faceDetected={faceDetected}
            videoRef={videoRef}
            canvasRef={canvasRef}
            leftEAR={leftEAR}
            rightEAR={rightEAR}
            threshold={threshold}
            triggerDelay={triggerDelay}
            isClosedRef={useRef(false)}
            onStart={handleStartMonitor}
            onStop={handleStopMonitor}
            errorMsg={errorMsg}
          />

          {/* Interactive Incident registries/logs */}
          <div className="bg-[#12141C] rounded-2xl border border-gray-800 p-5 flex flex-col gap-3 flex-1 min-h-[220px]" id="logs-panel">
            <div className="flex items-center gap-2 border-b border-gray-850 pb-3 justify-between">
              <span className="text-xs font-semibold text-gray-300 font-mono tracking-wider uppercase flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-400" /> Security Telemetry Logs
              </span>
              <span className="text-[10px] font-mono text-gray-550">{logs.length} EVENTS REGISTERED</span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px] pr-1" id="logs-list">
              {logs.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {logs.map((log) => (
                    <div 
                      key={log.id} 
                      className={`p-3 bg-black/20 border-l-2 ${
                        log.event.includes("COGNIZANCE") ? "border-green-500 bg-green-500/5 text-green-400" : "border-blue-500 bg-blue-500/5 text-blue-400"
                      } rounded-r-xl border-t border-b border-r border-gray-850/80 flex items-start gap-3 transition-all`}
                    >
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-900 border border-gray-800 px-1.5 py-0.5 rounded leading-none mt-0.5">
                        {log.time}
                      </span>
                      <div className="flex-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                          {log.event}
                        </span>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed font-sans">{log.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500 gap-2">
                  <Coffee className="w-8 h-8 text-gray-700 animate-pulse" />
                  <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">STABILITY STATUS: NOMINAL</p>
                  <p className="text-[10px] leading-relaxed max-w-xs font-sans">
                    All dozing incidents, system triggers, and snooze cycles will be recorded here in memory for inspection.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (HUD and synthesizer options) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <SessionDashboard
            stats={stats}
            onResetStats={handleResetStats}
            threshold={threshold}
            setThreshold={setThreshold}
            triggerDelay={triggerDelay}
            setTriggerDelay={setTriggerDelay}
          />

          <AudioSettings
            volume={volume}
            setVolume={setVolume}
            toneType={toneType}
            setToneType={setToneType}
            strictMode={strictMode}
            setStrictMode={setStrictMode}
          />

          {/* Quick Guidance Deck */}
          <div className="bg-[#12141C] rounded-2xl border border-gray-800 p-4.5 flex gap-3.5 items-start">
            <HelpCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-sans">Vigilance Recommendation</h4>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                Aim for adequate room context. Make sure your face is well-lit: bright highlights assist the browser detector in evaluating vertical eye ratios. If blinks trigger false matches, calibrate options.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* NON-STRICT MODE WARNING FLOATER */}
      <AnimatePresence>
        {isAlarmRinging && !strictMode && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 inset-x-4 max-w-md mx-auto z-50 bg-red-950 border border-red-500 rounded-2xl p-4.5 shadow-[0_10px_35px_rgba(239,68,68,0.3)] flex items-center justify-between gap-4"
            id="audio-standard-ringing-floater"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 bg-red-500/10 text-red-400 rounded-xl animate-pulse">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-xs font-bold font-sans text-white uppercase tracking-wider">DOZING STATE WARNING</h4>
                <p className="text-[10px] text-red-300 mt-0.5 font-sans leading-none">Wake up! Open your eyes to self-heal.</p>
              </div>
            </div>
            <button
              onClick={silenceAlarm}
              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-sans font-medium text-xs tracking-wider transition-all cursor-pointer"
            >
              SILENCE SIREN
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STRICT SHIELD FULL PAGE STROBE & INTERACTION GATE */}
      <AnimatePresence>
        {isAlarmRinging && strictMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-pulse-red"
            id="strict-alarm-overlay"
          >
            {/* Ambient scan-line */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.1)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-50 scan-line" />

            <div className="max-w-md w-full bg-zinc-950/95 border-2 border-red-500/80 rounded-2xl p-8 flex flex-col items-center text-center gap-6 shadow-[0_0_50px_rgba(239,68,68,0.4)] relative z-10">
              <div className="w-16 h-16 rounded-full bg-red-950 border-2 border-red-500 flex items-center justify-center animate-ping text-red-500">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-lg font-bold font-display tracking-tight text-white uppercase">EYE APERTURE COLLAPSED</h2>
                <p className="text-xs font-mono text-red-400 mt-1 bg-red-950/50 border border-red-900 px-3 py-1 rounded-md">
                  STRICT STUDY SECURITY ACTIVE
                </p>
                <p className="text-xs text-zinc-400 font-sans mt-3 leading-relaxed">
                  The alarm is playing at maximum configured resonance. Your focus record states that wakefulness has lapsed. Prove cognizance to reset the alert cascade.
                </p>
              </div>

              {/* Hold to prove cognizance scanner pad */}
              <div className="w-full flex flex-col gap-2.5 items-center bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none">Cerebral Verification Touchpoint</span>
                
                <button
                  onMouseDown={handleHoldStart}
                  onMouseUp={handleHoldEnd}
                  onMouseLeave={handleHoldEnd}
                  onTouchStart={handleHoldStart}
                  onTouchEnd={handleHoldEnd}
                  onTouchCancel={handleHoldEnd}
                  className={`w-28 h-28 rounded-full border-2 flex items-center justify-center transition-all transform active:scale-95 cursor-pointer relative overflow-hidden select-none ${
                    isHolding 
                      ? "bg-red-950 border-red-500 text-red-400" 
                      : "bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-500"
                  }`}
                  id="strict-scanner-pad-btn"
                >
                  {/* Growing round overlay */}
                  <div 
                    className="absolute inset-0 bg-red-500/10 pointer-events-none transition-all duration-75"
                    style={{ transform: `scale(${holdProgress / 100})` }}
                  />
                  <Fingerprint className={`w-12 h-12 relative z-10 ${isHolding ? "animate-pulse" : ""}`} />
                </button>

                <div className="w-full mt-2">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 leading-none mb-1">
                    <span>COGNIZANCE ASSESSMENT</span>
                    <span>{Math.round(holdProgress)}% SECURED</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-950 rounded-full border border-zinc-900 overflow-hidden">
                    <div 
                      className="h-full bg-red-500 transition-all duration-75"
                      style={{ width: `${holdProgress}%` }}
                    />
                  </div>
                </div>

                <p className="text-[10.5px] text-zinc-500 font-sans leading-relaxed text-center mt-1">
                  {isHolding ? "HOLD CONTINUOUSLY — DO NOT RELEASE" : "HOLD DOWN TOUCHPOINT STABLY FOR 3 SECONDS"}
                </p>
              </div>

              {/* Absolute manual emergency override (just to ensure user gets unstuck if hold fails) */}
              <button
                onClick={silenceAlarm}
                className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 uppercase tracking-widest cursor-pointer underline hover:no-underline"
              >
                Manual Release override
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
