import { useRef, useCallback } from "react";
import { playSound, speak, isMuted } from "@/lib/sounds";

type AnnouncementPriority = 1 | 2 | 3 | 4 | 5 | 6;

interface Announcement {
  priority: AnnouncementPriority;
  sound?: string;
  ttsText?: string;
  ttsDelay?: number;
}

export function useAnnouncementQueue() {
  const queueRef = useRef<Announcement[]>([]);
  const isPlayingRef = useRef(false);

  const processNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const item = queueRef.current.shift()!;

    if (isMuted()) {
      // Skip this item, process next
      setTimeout(processNext, 50);
      return;
    }

    if (item.sound && item.ttsText) {
      // Play sound, then TTS after delay
      playSound(item.sound);
      const delay = item.ttsDelay ?? 500;
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(item.ttsText!);
        utterance.lang = "he-IL";
        const voices = window.speechSynthesis.getVoices();
        const hebrewVoice = voices.find((v) => v.lang.startsWith("he"));
        if (hebrewVoice) utterance.voice = hebrewVoice;
        utterance.onend = () => setTimeout(processNext, 300);
        utterance.onerror = () => setTimeout(processNext, 300);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        // Fallback timeout in case onend never fires
        setTimeout(() => {
          if (isPlayingRef.current) processNext();
        }, 4000);
      }, delay);
    } else if (item.sound) {
      playSound(item.sound);
      setTimeout(processNext, 1000);
    } else if (item.ttsText) {
      const utterance = new SpeechSynthesisUtterance(item.ttsText);
      utterance.lang = "he-IL";
      const voices = window.speechSynthesis.getVoices();
      const hebrewVoice = voices.find((v) => v.lang.startsWith("he"));
      if (hebrewVoice) utterance.voice = hebrewVoice;
      utterance.onend = () => setTimeout(processNext, 300);
      utterance.onerror = () => setTimeout(processNext, 300);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setTimeout(() => {
        if (isPlayingRef.current) processNext();
      }, 3500);
    } else {
      processNext();
    }
  }, []);

  const enqueue = useCallback(
    (announcement: Announcement) => {
      // Insert in priority order (lower number = higher priority)
      const idx = queueRef.current.findIndex(
        (a) => a.priority > announcement.priority
      );
      if (idx === -1) {
        queueRef.current.push(announcement);
      } else {
        queueRef.current.splice(idx, 0, announcement);
      }

      if (!isPlayingRef.current) {
        processNext();
      }
    },
    [processNext]
  );

  const clear = useCallback(() => {
    queueRef.current = [];
    window.speechSynthesis.cancel();
    isPlayingRef.current = false;
  }, []);

  return { enqueue, clear };
}
