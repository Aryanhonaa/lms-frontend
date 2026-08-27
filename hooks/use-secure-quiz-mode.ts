"use client";

import { useEffect, useRef, useState } from "react";
import {
  blockedShortcut,
  isEditableTarget,
  QUIZ_SECURITY_MESSAGES,
  type QuizSecurityEvent,
} from "@/lib/assessments/secure-quiz-policy";

const NOTICE_COOLDOWN_MS = 4000;
const SECURE_CLASS = "secure-quiz-active";

type RecordedEvent = {
  type: QuizSecurityEvent;
  at: number;
};

/**
 * Activates document-level quiz protections for the lifetime of an in-progress
 * attempt. Cleanup always removes listeners, the print shim, and the html class.
 *
 * Screenshot limitation: JavaScript cannot stop OS-level capture, snipping
 * tools, extensions, or another device photographing the screen. PrintScreen
 * is recorded only when the browser surfaces that key event.
 */
export function useSecureQuizMode(active: boolean) {
  const [notice, setNotice] = useState<{ type: QuizSecurityEvent; message: string } | null>(null);
  const eventsRef = useRef<RecordedEvent[]>([]);
  const lastNoticeAt = useRef<Partial<Record<QuizSecurityEvent, number>>>({});

  useEffect(() => {
    if (!active) {
      return;
    }

    const timers = new Set<number>();
    const record = (type: QuizSecurityEvent) => {
      eventsRef.current = [...eventsRef.current, { type, at: Date.now() }].slice(-50);
      const last = lastNoticeAt.current[type] ?? 0;
      if (Date.now() - last < NOTICE_COOLDOWN_MS) {
        return;
      }
      lastNoticeAt.current[type] = Date.now();
      setNotice({ type, message: QUIZ_SECURITY_MESSAGES[type] });
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        setNotice((current) => (current?.type === type ? null : current));
      }, NOTICE_COOLDOWN_MS + 800);
      timers.add(timer);
    };

    const block = (event: Event, type: QuizSecurityEvent) => {
      event.preventDefault();
      record(type);
    };

    const onCopy = (event: Event) => block(event, "COPY_ATTEMPT");
    const onCut = (event: Event) => block(event, "CUT_ATTEMPT");
    const onPaste = (event: Event) => block(event, "PASTE_ATTEMPT");
    const onContextMenu = (event: Event) => block(event, "CONTEXT_MENU_ATTEMPT");
    const onDragStart = (event: Event) => {
      if (!isEditableTarget(event.target)) {
        event.preventDefault();
      }
    };
    const onSelectStart = (event: Event) => {
      if (!isEditableTarget(event.target)) {
        event.preventDefault();
      }
    };
    const onDrop = (event: Event) => {
      if (isEditableTarget(event.target)) {
        block(event, "PASTE_ATTEMPT");
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const type = blockedShortcut(event, isEditableTarget(event.target));
      if (!type) {
        return;
      }
      event.preventDefault();
      record(type);
    };
    const onBeforePrint = (event: Event) => block(event, "PRINT_ATTEMPT");

    document.documentElement.classList.add(SECURE_CLASS);
    document.addEventListener("copy", onCopy, true);
    document.addEventListener("cut", onCut, true);
    document.addEventListener("paste", onPaste, true);
    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("dragstart", onDragStart, true);
    document.addEventListener("selectstart", onSelectStart, true);
    document.addEventListener("drop", onDrop, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("beforeprint", onBeforePrint);

    const originalPrint = window.print.bind(window);
    window.print = () => {
      record("PRINT_ATTEMPT");
    };

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
      timers.clear();
      setNotice(null);
      document.documentElement.classList.remove(SECURE_CLASS);
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("cut", onCut, true);
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("dragstart", onDragStart, true);
      document.removeEventListener("selectstart", onSelectStart, true);
      document.removeEventListener("drop", onDrop, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.print = originalPrint;
    };
  }, [active]);

  return {
    notice,
    dismissNotice: () => setNotice(null),
    events: eventsRef,
  };
}
