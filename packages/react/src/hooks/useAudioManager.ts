/**
 * useAudioManager - Manages game audio channels
 *
 * Handles three audio channels:
 * - Music: Background music (loops, crossfades between tracks)
 * - Sound: Sound effects (one-shots from pendingSounds array)
 * - Voice: Dialogue voice (one at a time, from dialogue.voice)
 *
 * Watches snapshot for audio cues and plays them automatically
 */

import { useEffect, useRef, useState } from "react";
import type { Snapshot } from "@doodle-engine/core";

export interface AudioManagerOptions {
  /** Base URL for audio assets */
  audioBasePath?: string;
  /** Master volume (0-1) */
  masterVolume?: number;
  /** Music volume (0-1) */
  musicVolume?: number;
  /** Sound effects volume (0-1) */
  soundVolume?: number;
  /** Voice volume (0-1) */
  voiceVolume?: number;
  /** Music crossfade duration in ms */
  crossfadeDuration?: number;
}

export interface AudioManagerControls {
  /** Set master volume */
  setMasterVolume: (volume: number) => void;
  /** Set music volume */
  setMusicVolume: (volume: number) => void;
  /** Set sound volume */
  setSoundVolume: (volume: number) => void;
  /** Set voice volume */
  setVoiceVolume: (volume: number) => void;
  /** Stop all audio */
  stopAll: () => void;
}

/**
 * Audio manager hook
 * Watches snapshot for audio changes and manages playback
 */
export function useAudioManager(
  snapshot: Snapshot,
  options: AudioManagerOptions = {},
): AudioManagerControls {
  const {
    audioBasePath = "/audio",
    masterVolume: initialMaster = 1.0,
    musicVolume: initialMusic = 0.7,
    soundVolume: initialSound = 0.8,
    voiceVolume: initialVoice = 1.0,
    crossfadeDuration = 1000,
  } = options;

  // Volume state
  const [masterVolume, setMasterVolume] = useState(initialMaster);
  const [musicVolume, setMusicVolume] = useState(initialMusic);
  const [soundVolume, setSoundVolume] = useState(initialSound);
  const [voiceVolume, setVoiceVolume] = useState(initialVoice);

  // Audio elements
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentMusicTrack = useRef<string | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);

  // Initialize audio elements
  useEffect(() => {
    const musicAudio = new Audio();
    musicAudio.loop = true;
    musicAudioRef.current = musicAudio;

    const voiceAudio = new Audio();
    voiceAudioRef.current = voiceAudio;

    return () => {
      // Cleanup on unmount
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      musicAudio.pause();
      voiceAudio.pause();
      musicAudio.src = "";
      voiceAudio.src = "";
    };
  }, []);

  // Update music when snapshot.music changes
  useEffect(() => {
    const musicAudio = musicAudioRef.current;
    if (!musicAudio) return;

    const newTrack = snapshot.music;

    if (newTrack !== currentMusicTrack.current) {
      currentMusicTrack.current = newTrack;

      if (!newTrack) {
        // Fade out and stop
        fadeOut(musicAudio, crossfadeDuration);
      } else {
        // Crossfade to new track
        const trackPath = `${audioBasePath}/music/${newTrack}`;
        crossfadeMusic(musicAudio, trackPath, crossfadeDuration);
      }
    }

    // Update volume
    musicAudio.volume = masterVolume * musicVolume;
  }, [
    snapshot.music,
    masterVolume,
    musicVolume,
    audioBasePath,
    crossfadeDuration,
  ]);

  // Play voice when dialogue.voice changes
  useEffect(() => {
    const voiceAudio = voiceAudioRef.current;
    if (!voiceAudio) return;

    const voiceFile = snapshot.dialogue?.voice;

    if (voiceFile) {
      voiceAudio.pause();
      voiceAudio.currentTime = 0;
      voiceAudio.src = `${audioBasePath}/voice/${voiceFile}`;
      voiceAudio.volume = masterVolume * voiceVolume;
      voiceAudio.play().catch((error) => {
        console.warn("Voice playback failed:", error);
      });
    }
  }, [snapshot.dialogue?.voice, masterVolume, voiceVolume, audioBasePath]);

  // Play sound effects from pendingSounds
  useEffect(() => {
    if (snapshot.pendingSounds.length === 0) return;

    snapshot.pendingSounds.forEach((soundFile) => {
      const soundAudio = new Audio(`${audioBasePath}/sfx/${soundFile}`);
      soundAudio.volume = masterVolume * soundVolume;
      soundAudio.play().catch((error) => {
        console.warn("Sound playback failed:", error);
      });
    });
  }, [snapshot.pendingSounds, masterVolume, soundVolume, audioBasePath]);

  // Helper: Crossfade to new music track
  const crossfadeMusic = (
    audio: HTMLAudioElement,
    newTrackPath: string,
    duration: number,
  ) => {
    // Fade out current track
    fadeOut(audio, duration / 2).then(() => {
      // Load and play new track
      audio.src = newTrackPath;
      audio.load();
      audio.volume = 0;

      audio
        .play()
        .then(() => {
          // Fade in new track
          fadeIn(audio, duration / 2, masterVolume * musicVolume);
        })
        .catch((error) => {
          console.warn("Music playback failed:", error);
        });
    });
  };

  // Helper: Fade out audio
  const fadeOut = (
    audio: HTMLAudioElement,
    duration: number,
  ): Promise<void> => {
    return new Promise((resolve) => {
      const startVolume = audio.volume;
      const steps = 20;
      const stepDuration = duration / steps;
      const volumeDecrement = startVolume / steps;

      let step = 0;
      const interval = setInterval(() => {
        step++;
        audio.volume = Math.max(0, startVolume - volumeDecrement * step);

        if (step >= steps) {
          clearInterval(interval);
          audio.pause();
          audio.currentTime = 0;
          resolve();
        }
      }, stepDuration);

      fadeIntervalRef.current = interval as unknown as number;
    });
  };

  // Helper: Fade in audio
  const fadeIn = (
    audio: HTMLAudioElement,
    duration: number,
    targetVolume: number,
  ) => {
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeIncrement = targetVolume / steps;

    let step = 0;
    const interval = setInterval(() => {
      step++;
      audio.volume = Math.min(targetVolume, volumeIncrement * step);

      if (step >= steps) {
        clearInterval(interval);
      }
    }, stepDuration);

    fadeIntervalRef.current = interval as unknown as number;
  };

  // Stop all audio
  const stopAll = () => {
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current.currentTime = 0;
    }
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.currentTime = 0;
    }
  };

  return {
    setMasterVolume,
    setMusicVolume,
    setSoundVolume,
    setVoiceVolume,
    stopAll,
  };
}
