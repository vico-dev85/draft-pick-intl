// Sound & TTS utility for Draft Board and Waiting Room
// All sounds are in /public/sounds/ and played via HTML5 Audio
// TTS uses the browser's built-in SpeechSynthesis API (Hebrew)

const SOUND_BASE = "/sounds/";

// Mute state — persists in sessionStorage so a page refresh within
// the same tab keeps the user's choice
const MUTE_KEY = "kohot_sound_muted";

export function isMuted(): boolean {
  return sessionStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(muted: boolean): void {
  if (muted) {
    sessionStorage.setItem(MUTE_KEY, "1");
  } else {
    sessionStorage.removeItem(MUTE_KEY);
  }
}

export function toggleMute(): boolean {
  const newState = !isMuted();
  setMuted(newState);
  return newState;
}

// Volume levels per sound category (0.0–1.0)
// Keeps crowd sounds subtle even when the phone is loud
const VOLUME_MAP: Record<string, number> = {
  crowd: 0.25,
  "captain-enter": 0.5,
  drumroll: 0.5,
  reveal: 0.6,
  whistle: 0.65,
  ding: 0.75,
};
const DEFAULT_VOLUME = 0.8;

function getVolume(name: string): number {
  for (const [key, vol] of Object.entries(VOLUME_MAP)) {
    if (name.startsWith(key)) return vol;
  }
  return DEFAULT_VOLUME;
}

// Pre-loaded audio cache to avoid loading delays during gameplay
const audioCache = new Map<string, HTMLAudioElement>();

function getAudio(name: string): HTMLAudioElement {
  let audio = audioCache.get(name);
  if (!audio) {
    audio = new Audio(`${SOUND_BASE}${name}`);
    audioCache.set(name, audio);
  }
  return audio;
}

// Preload all sounds (call once on page mount)
export function preloadSounds(): void {
  const files = [
    "ding.mp3", "drumroll.mp3", "reveal.mp3", "whistle.mp3",
    "crowd1.mp3", "crowd2.mp3", "crowd3.mp3", "crowd4.mp3",
    "captain-enter.mp3",
  ];
  files.forEach((f) => {
    const audio = getAudio(f);
    audio.load();
  });
}

export function playSound(name: string): HTMLAudioElement | null {
  if (isMuted()) return null;
  try {
    const audio = getAudio(name);
    audio.volume = getVolume(name);
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Autoplay blocked — user hasn't interacted yet, silently ignore
    });
    return audio;
  } catch {
    return null;
  }
}

export function stopSound(name: string): void {
  const audio = audioCache.get(name);
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

// Crowd sounds — pick random, never same as last
let lastCrowdIndex = -1;

export function playRandomCrowd(): void {
  if (isMuted()) return;
  let idx = Math.floor(Math.random() * 4) + 1;
  if (idx === lastCrowdIndex) {
    idx = (idx % 4) + 1;
  }
  lastCrowdIndex = idx;
  playSound(`crowd${idx}.mp3`);
}

// Hebrew TTS
export function speak(text: string): void {
  if (isMuted()) return;
  if (!("speechSynthesis" in window)) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "he-IL";
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Try to find a Hebrew voice
  const voices = window.speechSynthesis.getVoices();
  const hebrewVoice = voices.find((v) => v.lang.startsWith("he"));
  if (hebrewVoice) {
    utterance.voice = hebrewVoice;
  }

  window.speechSynthesis.speak(utterance);
}

// Combined: play sound, then TTS after a delay
export function playSoundThenSpeak(
  soundName: string,
  text: string,
  delayMs = 500
): void {
  if (isMuted()) return;
  playSound(soundName);
  setTimeout(() => speak(text), delayMs);
}
