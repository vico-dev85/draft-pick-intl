// Sound & TTS utility for Draft Board and Waiting Room
// All sounds are in /public/sounds/ and played via HTML5 Audio
// TTS uses the browser's built-in SpeechSynthesis API (English)

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
  crowd: 0.15,
  "captain-enter": 0.4,
  drumroll: 0.4,
  reveal: 0.5,
  whistle: 0.35,
  ding: 0.6,
};
const DEFAULT_VOLUME = 0.5;

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

// Detect dominant script in text to pick the right TTS language.
// If player names are Hebrew but UI is English, TTS needs "he" for names.
export function detectTtsLang(text: string, fallback: string): string {
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;

  const total = hebrewChars + arabicChars + latinChars;
  if (total === 0) return fallback;

  if (hebrewChars / total > 0.3) return "he";
  if (arabicChars / total > 0.3) return "ar";
  return fallback;
}

// Split text into segments by script so each part gets the right TTS voice.
// e.g. "דוד picked יוסי" → [{text:"דוד", lang:"he"}, {text:"picked", lang:"en"}, {text:"יוסי", lang:"he"}]
export function splitByScript(text: string, fallbackLang: string): Array<{ text: string; lang: string }> {
  const segments: Array<{ text: string; lang: string }> = [];
  let current = "";
  let currentLang = fallbackLang;

  for (const char of text) {
    let charLang: string;
    if (/[\u0590-\u05FF]/.test(char)) charLang = "he";
    else if (/[\u0600-\u06FF]/.test(char)) charLang = "ar";
    else if (/[a-zA-Z]/.test(char)) charLang = fallbackLang;
    else {
      // spaces, punctuation — stay with current segment
      current += char;
      continue;
    }

    if (charLang !== currentLang && current.trim()) {
      segments.push({ text: current.trim(), lang: currentLang });
      current = char;
      currentLang = charLang;
    } else {
      current += char;
      currentLang = charLang;
    }
  }
  if (current.trim()) {
    segments.push({ text: current.trim(), lang: currentLang });
  }
  return segments;
}

// TTS — splits mixed-script text so Hebrew names get a Hebrew voice
// and English template words get an English voice.
export function speak(text: string, lang?: string): void {
  if (isMuted()) return;
  if (!("speechSynthesis" in window)) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Resolve UI language: explicit param → i18next → fallback "en"
  let uiLang = lang || "en";
  try {
    const stored = localStorage.getItem("draftpick_lang");
    if (!lang && stored) uiLang = stored;
  } catch {
    // localStorage unavailable — keep fallback
  }

  const voices = window.speechSynthesis.getVoices();
  const segments = splitByScript(text, uiLang);

  // If all segments are the same language, speak as one utterance
  const uniqueLangs = new Set(segments.map((s) => s.lang));
  if (uniqueLangs.size <= 1) {
    const activeLang = segments[0]?.lang || uiLang;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = activeLang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    const matchedVoice = voices.find((v) => v.lang.startsWith(activeLang));
    if (matchedVoice) utterance.voice = matchedVoice;
    window.speechSynthesis.speak(utterance);
    return;
  }

  // Mixed scripts — chain utterances so each segment uses the right voice
  for (const seg of segments) {
    const utterance = new SpeechSynthesisUtterance(seg.text);
    utterance.lang = seg.lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    const matchedVoice = voices.find((v) => v.lang.startsWith(seg.lang));
    if (matchedVoice) utterance.voice = matchedVoice;
    window.speechSynthesis.speak(utterance);
  }
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
