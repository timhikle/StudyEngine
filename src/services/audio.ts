import { NativeModules, Platform } from 'react-native';

const { SoundModule } = NativeModules;

let tierBActive = false;

export function playTierAAlert(): void {
  if (SoundModule?.playSystemSound) {
    SoundModule.playSystemSound('notification').catch(() => {});
  }
}

export function playTierBAlert(): void {
  tierBActive = true;
  if (SoundModule?.playRingtone) {
    SoundModule.playRingtone(true).catch(() => {});
  }
}

export function stopTierBAlert(): void {
  tierBActive = false;
  if (SoundModule?.stopRingtone) {
    SoundModule.stopRingtone().catch(() => {});
  }
}

export function isTierBActive(): boolean {
  return tierBActive;
}
