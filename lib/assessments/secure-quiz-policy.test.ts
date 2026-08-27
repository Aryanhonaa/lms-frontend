import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blockedShortcut, isEditableTarget, QUIZ_SECURITY_MESSAGES } from "./secure-quiz-policy";

describe("secure quiz policy", () => {
  it("blocks copy, cut, paste, print, save, and view-source shortcuts", () => {
    const base = { ctrlKey: true, metaKey: false, shiftKey: false };
    assert.equal(blockedShortcut({ ...base, key: "c" }, false), "COPY_ATTEMPT");
    assert.equal(blockedShortcut({ ...base, key: "x" }, true), "CUT_ATTEMPT");
    assert.equal(blockedShortcut({ ...base, key: "v" }, true), "PASTE_ATTEMPT");
    assert.equal(blockedShortcut({ ...base, key: "p" }, false), "PRINT_ATTEMPT");
    assert.equal(blockedShortcut({ ...base, key: "s" }, false), "PRINT_ATTEMPT");
    assert.equal(blockedShortcut({ ...base, key: "u" }, false), "COPY_ATTEMPT");
    assert.equal(blockedShortcut({ ...base, key: "a" }, false), "COPY_ATTEMPT");
  });

  it("allows select-all inside answer fields and does not block typing keys", () => {
    const base = { ctrlKey: true, metaKey: false, shiftKey: false };
    assert.equal(blockedShortcut({ ...base, key: "a" }, true), null);
    assert.equal(blockedShortcut({ key: "ArrowRight", ctrlKey: false, metaKey: false, shiftKey: false }, false), null);
    assert.equal(blockedShortcut({ key: "Tab", ctrlKey: false, metaKey: false, shiftKey: false }, false), null);
    assert.equal(blockedShortcut({ key: "Enter", ctrlKey: false, metaKey: false, shiftKey: false }, true), null);
    assert.equal(blockedShortcut({ key: "a", ctrlKey: false, metaKey: false, shiftKey: false }, true), null);
  });

  it("treats PrintScreen as a capture signal and Cmd modifiers like Ctrl", () => {
    assert.equal(
      blockedShortcut({ key: "PrintScreen", ctrlKey: false, metaKey: false, shiftKey: false }, false),
      "SCREEN_CAPTURE_DETECTED",
    );
    assert.equal(blockedShortcut({ key: "c", ctrlKey: false, metaKey: true, shiftKey: false }, false), "COPY_ATTEMPT");
  });

  it("has a warning message for every tracked event", () => {
    for (const key of Object.keys(QUIZ_SECURITY_MESSAGES) as Array<keyof typeof QUIZ_SECURITY_MESSAGES>) {
      assert.ok(QUIZ_SECURITY_MESSAGES[key].length > 8);
    }
  });
});

describe("isEditableTarget", () => {
  it("returns false for non-elements", () => {
    assert.equal(isEditableTarget(null), false);
  });
});
