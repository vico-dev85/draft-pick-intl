import { useRef, useCallback } from "react";
import { playSound, speak, isMuted, splitByScript } from "@/lib/sounds";

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
        // speak() handles mixed-script splitting (Hebrew names + English template)
        window.speechSynthesis.cancel();
        speak(item.ttsText!);
        // Wait for all utterances to finish, then process next
        const checkDone = () => {
          if (!window.speechSynthesis.speaking) {
            setTimeout(processNext, 300);
          } else {
            setTimeout(checkDone, 200);
          }
        };
        setTimeout(checkDone, 500);
        // Fallback timeout in case speech never ends
        setTimeout(() => {
          if (isPlayingRef.current) processNext();
        }, 4000);
      }, delay);
    } else if (item.sound) {
      playSound(item.sound);
      setTimeout(processNext, 1000);
    } else if (item.ttsText) {
      window.speechSynthesis.cancel();
      speak(item.ttsText);
      const checkDone = () => {
        if (!window.speechSynthesis.speaking) {
          setTimeout(processNext, 300);
        } else {
          setTimeout(checkDone, 200);
        }
      };
      setTimeout(checkDone, 500);
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
