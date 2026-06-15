import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_CLIPBOARD_MIRROR_POLICY,
  resolveClipboardMirrorPolicy,
} from "../clipboard-policy.js";

describe("clipboard mirror policy resolver", () => {
  it("defaults missing clipboard mirror policy to all", () => {
    assert.deepEqual(resolveClipboardMirrorPolicy(undefined), {
      policy: DEFAULT_CLIPBOARD_MIRROR_POLICY,
    });
  });

  it("accepts all supported clipboard mirror policy values", () => {
    assert.deepEqual(resolveClipboardMirrorPolicy("all"), { policy: "all" });
    assert.deepEqual(resolveClipboardMirrorPolicy("yank"), { policy: "yank" });
    assert.deepEqual(resolveClipboardMirrorPolicy("never"), {
      policy: "never",
    });
  });

  it("normalizes clipboard mirror policy casing and whitespace", () => {
    assert.deepEqual(resolveClipboardMirrorPolicy("YANK"), { policy: "yank" });
    assert.deepEqual(resolveClipboardMirrorPolicy(" never "), {
      policy: "never",
    });
  });

  it("falls back to all and reports invalid clipboard mirror strings", () => {
    const result = resolveClipboardMirrorPolicy("delete");

    assert.equal(result.policy, "all");
    assert.match(result.warning ?? "", /delete/);
    assert.match(result.warning ?? "", /all, yank, never/);
  });

  it("escapes invalid clipboard mirror strings in warnings", () => {
    const result = resolveClipboardMirrorPolicy("delete\n\x1b[31m");

    assert.equal(result.policy, "all");
    assert.equal((result.warning ?? "").includes("\n"), false);
    assert.equal((result.warning ?? "").includes("\x1b"), false);
    assert.match(result.warning ?? "", /"delete\\n\\u001b\[31m"/);
  });

  it("falls back to all and reports non-string clipboard mirror values safely", () => {
    const result = resolveClipboardMirrorPolicy({ mode: "yank" });

    assert.equal(result.policy, "all");
    assert.match(result.warning ?? "", /object/);
    assert.match(result.warning ?? "", /all, yank, never/);
  });
});
