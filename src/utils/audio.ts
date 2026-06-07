/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlarmTone } from "../types";

class AlarmSynthesizer {
  private ctx: AudioContext | null = null;
  private mainGain: GainNode | null = null;
  private activeNodes: { oscillators: OscillatorNode[]; intervals: number[] } | null = null;

  initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.warn("Web Audio API not supported in this browser.");
        return;
      }
      this.ctx = new AudioCtx();
      this.mainGain = this.ctx.createGain();
      this.mainGain.gain.value = 0.5; // default volume
      this.mainGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setVolume(volume: number) {
    this.initCtx();
    if (this.mainGain && this.ctx) {
      // Clamp volume between 0 and 1
      const v = Math.max(0, Math.min(1, volume));
      this.mainGain.gain.setValueAtTime(v, this.ctx.currentTime);
    }
  }

  start(toneType: AlarmTone) {
    this.initCtx();
    if (!this.ctx || !this.mainGain) return;
    if (this.activeNodes) this.stop();

    const oscillators: OscillatorNode[] = [];
    const intervals: number[] = [];
    const now = this.ctx.currentTime;

    if (toneType === AlarmTone.SIREN) {
      // Modulated frequency siren (Rapid screaming ups and downs)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const modulationGain = this.ctx.createGain();
      
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(800, now);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(4.0, now); // 4Hz speed

      modulationGain.gain.setValueAtTime(400, now); // Amplitude of 400Hz frequency swing

      osc2.connect(modulationGain);
      modulationGain.connect(osc1.frequency);
      osc1.connect(this.mainGain);

      osc1.start(now);
      osc2.start(now);

      oscillators.push(osc1, osc2);
    } else if (toneType === AlarmTone.SQUEAL) {
      // High-frequency shrieking scream (detuned for horrifying beat frequency)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(2500, now);

      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(2508, now); // Beating detuned frequency

      osc1.connect(this.mainGain);
      osc2.connect(this.mainGain);

      osc1.start(now);
      osc2.start(now);

      oscillators.push(osc1, osc2);

      let direction = 1;
      let freq = 2500;
      const interval = setInterval(() => {
        if (!this.ctx) return;
        freq += direction * 70;
        if (freq > 3000) direction = -1;
        if (freq < 1500) direction = 1;
        const t = this.ctx.currentTime;
        osc1.frequency.setValueAtTime(freq, t);
        osc2.frequency.setValueAtTime(freq + 8, t);
      }, 30);

      intervals.push(interval as any);
    } else if (toneType === AlarmTone.PULSE) {
      // Strobe warning pulse beep
      const osc = this.ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(1200, now);
      
      const pulseGain = this.ctx.createGain();
      pulseGain.connect(this.mainGain);
      osc.connect(pulseGain);

      osc.start(now);
      oscillators.push(osc);

      let state = true;
      const interval = setInterval(() => {
        if (!this.ctx) return;
        state = !state;
        pulseGain.gain.setValueAtTime(state ? 1.0 : 0.0, this.ctx.currentTime);
      }, 100);

      intervals.push(interval as any);
    } else if (toneType === AlarmTone.SWEEP) {
      // Low-to-high repeated laser warning sweep
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, now);
      osc.connect(this.mainGain);

      osc.start(now);
      oscillators.push(osc);

      let freq = 100;
      const interval = setInterval(() => {
        if (!this.ctx) return;
        freq += 120;
        if (freq > 1800) {
          freq = 100;
        }
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      }, 40);

      intervals.push(interval as any);
    }

    this.activeNodes = { oscillators, intervals };
  }

  stop() {
    if (this.activeNodes) {
      this.activeNodes.oscillators.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
      this.activeNodes.intervals.forEach(interval => clearInterval(interval));
      this.activeNodes = null;
    }
  }
}

export const audioSynth = new AlarmSynthesizer();
