import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coveredTerms, highlightSegments, keyTerms } from "./grading";

describe("grading helpers", () => {
  it("pulls distinctive terms from a marking guide", () => {
    const terms = keyTerms("Phishing emails create urgency so that the victim acts before thinking. Urgent tone.");
    assert.deepEqual(terms, ["phishing", "emails", "create", "urgency", "victim", "acts", "thinking", "tone"]);
  });

  it("matches word variants in the trainee answer", () => {
    const covered = coveredTerms("They phish people by making it urgent.", ["phishing", "urgency", "victim"]);
    assert.deepEqual([...covered].sort(), ["phishing", "urgency"]);
  });

  it("splits text into highlighted and plain segments without losing characters", () => {
    const text = "Attackers use urgency, always.";
    const segments = highlightSegments(text, ["urgency"]);
    assert.equal(segments.map((segment) => segment.text).join(""), text);
    assert.deepEqual(
      segments.filter((segment) => segment.hit).map((segment) => segment.text),
      ["urgency"],
    );
  });
});
