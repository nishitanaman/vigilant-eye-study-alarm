/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AlarmTone {
  SIREN = "SIREN",
  SQUEAL = "SQUEAL",
  PULSE = "PULSE",
  SWEEP = "SWEEP"
}

export enum AppStatus {
  IDLE = "IDLE",
  LOADING = "LOADING",
  READY = "READY",
  MONITORING = "MONITORING",
  ALARMING = "ALARMING",
  ERROR = "ERROR"
}

export interface AppSettings {
  threshold: number;      // Eye Aspect Ratio (EAR) vertical threshold below which eye is closed
  triggerDelay: number;   // How long eyes must remain closed before alarm trigger (ms)
  volume: number;         // Synth volume (0-1)
  toneType: AlarmTone;    // Audio oscillator routine name
  strictMode: boolean;    // Continuous scream with screen strobe
}

export interface SessionStats {
  elapsedSeconds: number;
  dozeCount: number;
  currentStreakSeconds: number;
  longestStreakSeconds: number;
  lastAlarmTime: string | null;
}
