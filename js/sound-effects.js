/**
 * EcoTraffic UrbanAI | Web Audio Procedural Sound Synthesizer
 * ==========================================================
 * Synthesizes city traffic ambiances, emergency vehicle sirens,
 * engine revs, and signal chime alerts without any audio files.
 * 
 * Author: Tareq Ali (@Tareq0001)
 */

class CityAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;
    this.sirenOsc1 = null;
    this.sirenOsc2 = null;
    this.sirenGain = null;
    this.isSirenPlaying = false;
  }

  init() {
    if (this.isInitialized) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.isInitialized = true;
  }

  ensureContext() {
    if (!this.isInitialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playSignalChangeChime() {
    if (this.isMuted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.08); // A6

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  playIncidentAlert() {
    if (this.isMuted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;

    // Dual low warning pulse
    [150, 110].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + idx * 0.09);
      gain.gain.setValueAtTime(0.22, t + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.09 + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.09);
      osc.stop(t + idx * 0.09 + 0.22);
    });
  }

  startEmergencySiren() {
    if (this.isMuted || this.isSirenPlaying) return;
    this.ensureContext();
    this.isSirenPlaying = true;

    const t = this.ctx.currentTime;
    this.sirenOsc1 = this.ctx.createOscillator();
    this.sirenGain = this.ctx.createGain();

    this.sirenOsc1.type = 'triangle';
    this.sirenOsc1.frequency.setValueAtTime(650, t);

    // LFO to modulate siren pitch (Wail effect)
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(1.8, t); // 1.8 Hz cycle
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(300, t); // Depth of 300Hz

    lfo.connect(lfoGain);
    lfoGain.connect(this.sirenOsc1.frequency);

    this.sirenGain.gain.setValueAtTime(0.12, t);

    this.sirenOsc1.connect(this.sirenGain);
    this.sirenGain.connect(this.ctx.destination);

    lfo.start(t);
    this.sirenOsc1.start(t);
    this.sirenLfo = lfo;
  }

  stopEmergencySiren() {
    if (!this.isSirenPlaying) return;
    if (this.sirenGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.sirenGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      setTimeout(() => {
        if (this.sirenOsc1) {
          try { this.sirenOsc1.stop(); this.sirenOsc1.disconnect(); } catch (e) {}
        }
        if (this.sirenLfo) {
          try { this.sirenLfo.stop(); this.sirenLfo.disconnect(); } catch (e) {}
        }
        this.isSirenPlaying = false;
      }, 250);
    } else {
      this.isSirenPlaying = false;
    }
  }

  playVehicleClick() {
    if (this.isMuted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.04);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.isSirenPlaying) {
      this.stopEmergencySiren();
    }
    return this.isMuted;
  }
}
