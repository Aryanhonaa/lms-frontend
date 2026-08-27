/**
 * Best-effort quiz integrity helpers.
 *
 * Ordinary browsers cannot reliably stop OS-level screenshots, snipping tools,
 * extensions, or another device photographing the screen. These helpers only
 * classify preventable in-page extraction actions.
 */

export type QuizSecurityEvent =
  | "COPY_ATTEMPT"
  | "CUT_ATTEMPT"
  | "PASTE_ATTEMPT"
  | "CONTEXT_MENU_ATTEMPT"
  | "PRINT_ATTEMPT"
  | "SCREEN_CAPTURE_DETECTED";

export const QUIZ_SECURITY_MESSAGES: Record<QuizSecurityEvent, string> = {
  COPY_ATTEMPT: "Copying is disabled during this quiz.",
  CUT_ATTEMPT: "Cutting is disabled during this quiz.",
  PASTE_ATTEMPT: "Pasting is disabled during this quiz. Please enter your answer manually.",
  CONTEXT_MENU_ATTEMPT: "The shortcut menu is disabled during this quiz.",
  PRINT_ATTEMPT: "Printing is disabled during this quiz.",
  SCREEN_CAPTURE_DETECTED: "Please do not capture or share quiz content.",
};

export function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function blockedShortcut(
  event: { key: string; code?: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
  editable: boolean,
): QuizSecurityEvent | null {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key === "PrintScreen" || event.code === "PrintScreen") {
    return "SCREEN_CAPTURE_DETECTED";
  }

  const modified = event.ctrlKey || event.metaKey;
  if (!modified) {
    return null;
  }

  if (key === "c") {
    return "COPY_ATTEMPT";
  }
  if (key === "x") {
    return "CUT_ATTEMPT";
  }
  if (key === "v") {
    return "PASTE_ATTEMPT";
  }
  if (key === "p" || key === "s") {
    return "PRINT_ATTEMPT";
  }
  if (key === "u") {
    return "COPY_ATTEMPT";
  }
  if (key === "a" && !editable) {
    return "COPY_ATTEMPT";
  }
  return null;
}
