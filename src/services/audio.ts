import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  'The package \'react-native-sound\' doesn\'t seem to be linked. Make sure: \n\n' +
  '- You rebuilt the app after installing\n' +
  '- You are not using Expo Go\n';

interface SoundModule {
  playSystemSound?: (soundName: string) => Promise<void>;
  playRingtone?: (loop: boolean) => Promise<void>;
  stopRingtone?: () => Promise<void>;
}

function getSoundModule(): SoundModule {
  if (Platform.OS === 'android') {
    const module = NativeModules.RNSound || NativeModules.SoundModule || {};
    if (module.playSystemSound) {
      return module;
    }
  }
  return {};
}

const soundModule = getSoundModule();

let tierBActive = false;
let tierBTimer: ReturnType<typeof setInterval> | null = null;

export function playTierAAlert(): void {
  const module = soundModule;
  if (module.playSystemSound) {
    module.playSystemSound('ringtone').catch(() => {
      playFallbackTierA();
    });
    setTimeout(() => {
      module.stopRingtone?.().catch(() => {});
    }, 3000);
  } else {
    playFallbackTierA();
  }
}

export function playTierBAlert(): void {
  tierBActive = true;
  const module = soundModule;
  if (module.playRingtone) {
    module.playRingtone(true).catch(() => playFallbackTierB());
  } else {
    playFallbackTierB();
  }
}

export function stopTierBAlert(): void {
  tierBActive = false;
  if (tierBTimer) {
    clearInterval(tierBTimer);
    tierBTimer = null;
  }
  const module = soundModule;
  if (module.stopRingtone) {
    module.stopRingtone().catch(() => {});
  }
}

export function isTierBActive(): boolean {
  return tierBActive;
}

function playFallbackTierA(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 3);
}

function playFallbackTierB(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  let playing = true;
  tierBActive = true;

  function beep() {
    if (!playing || !tierBActive) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  }

  beep();
  tierBTimer = setInterval(beep, 1500);

  const originalStop = stopTierBAlert;
  const originalStopTierB = function () {
    playing = false;
    originalStop();
  };
  (global as any).__tierBStop = originalStopTierB;
}

let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_audioCtx) {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) _audioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  return _audioCtx;
}
