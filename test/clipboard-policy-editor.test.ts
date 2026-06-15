import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createEditorWithSpy, sendKeys } from "./harness.js";

function nextImmediate(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

async function nextClipboardDrain(): Promise<void> {
  await nextImmediate();
  await nextImmediate();
}

describe("clipboard mirror policy", () => {
  it("all clipboard mirror policy mirrors mutation and yank writes", async () => {
    const { editor, clipboardWrites } = createEditorWithSpy("foo bar");
    editor.setClipboardMirrorPolicy("all");

    sendKeys(editor, ["d", "w", "y", "w"]);
    await nextImmediate();

    assert.equal(editor.getRegister(), "bar");
    assert.deepEqual(clipboardWrites, ["foo ", "bar"]);
  });

  it("all clipboard mirror policy mirrors change writes", async () => {
    const { editor, clipboardWrites } = createEditorWithSpy("foo bar");
    editor.setClipboardMirrorPolicy("all");

    sendKeys(editor, ["c", "w"]);
    await nextImmediate();

    assert.equal(editor.getRegister(), "foo ");
    assert.deepEqual(clipboardWrites, ["foo "]);
  });

  it("yank clipboard mirror policy skips delete writes but updates the register", () => {
    const { editor, clipboardWrites } = createEditorWithSpy("foo bar");
    editor.setClipboardMirrorPolicy("yank");

    sendKeys(editor, ["d", "w"]);

    assert.equal(editor.getRegister(), "foo ");
    assert.deepEqual(clipboardWrites, []);
  });

  it("yank clipboard mirror policy skips change writes but updates the register", () => {
    const { editor, clipboardWrites } = createEditorWithSpy("foo bar");
    editor.setClipboardMirrorPolicy("yank");

    sendKeys(editor, ["c", "w"]);

    assert.equal(editor.getRegister(), "foo ");
    assert.deepEqual(clipboardWrites, []);
  });

  it("yank clipboard mirror policy skips mutation writes", async () => {
    const { editor, clipboardWrites } = createEditorWithSpy("foo bar");
    editor.setClipboardMirrorPolicy("yank");

    sendKeys(editor, ["d", "w", "y", "w", "c", "w"]);
    await nextImmediate();

    assert.equal(editor.getRegister(), "bar");
    assert.deepEqual(clipboardWrites, ["bar"]);
  });

  it("never clipboard mirror policy keeps mutation and yank writes internal", () => {
    const { editor, clipboardWrites } = createEditorWithSpy("foo bar");
    editor.setClipboardMirrorPolicy("never");

    sendKeys(editor, ["y", "y"]);

    assert.equal(editor.getRegister(), "foo bar\n");
    assert.deepEqual(clipboardWrites, []);

    sendKeys(editor, ["d", "w"]);

    assert.equal(editor.getRegister(), "foo ");
    assert.deepEqual(clipboardWrites, []);
  });

  it("never clipboard mirror policy keeps change writes internal", () => {
    const { editor, clipboardWrites } = createEditorWithSpy("foo bar");
    editor.setClipboardMirrorPolicy("never");

    sendKeys(editor, ["c", "w"]);

    assert.equal(editor.getRegister(), "foo ");
    assert.deepEqual(clipboardWrites, []);
  });

  for (const scenario of [
    {
      policy: "all" as const,
      write: ["d", "w"],
      put: ["P"],
      expectedText: "foo bar",
      expectedClipboardWrites: ["foo "],
    },
    {
      policy: "yank" as const,
      write: ["d", "w"],
      put: ["P"],
      expectedText: "foo bar",
      expectedClipboardWrites: [],
    },
    {
      policy: "yank" as const,
      write: ["y", "w"],
      put: ["P"],
      expectedText: "foo foo bar",
      expectedClipboardWrites: ["foo "],
    },
    {
      policy: "never" as const,
      write: ["d", "w"],
      put: ["P"],
      expectedText: "foo bar",
      expectedClipboardWrites: [],
    },
    {
      policy: "never" as const,
      write: ["y", "w"],
      put: ["P"],
      expectedText: "foo foo bar",
      expectedClipboardWrites: [],
    },
  ]) {
    it(`${scenario.policy} clipboard mirror policy chooses the expected put source after ${scenario.write.join("")}`, async () => {
      const { editor, clipboardWrites } = createEditorWithSpy("foo bar");
      let systemClipboard = "SYS";
      editor.setClipboardMirrorPolicy(scenario.policy);
      editor.setClipboardFn((text) => {
        clipboardWrites.push(text);
        systemClipboard = text;
      });
      editor.setClipboardReadFn(() => systemClipboard);

      sendKeys(editor, scenario.write);
      await nextClipboardDrain();
      sendKeys(editor, scenario.put);

      assert.equal(editor.getText(), scenario.expectedText);
      assert.deepEqual(clipboardWrites, scenario.expectedClipboardWrites);
    });
  }

  for (const policy of ["all", "yank", "never"] as const) {
    it(`${policy} clipboard mirror policy keeps empty no-op writes from pinning put to the register`, () => {
      const { editor } = createEditorWithSpy("ab");
      editor.setClipboardMirrorPolicy(policy);
      editor.setClipboardReadFn(() => "SYS");

      sendKeys(editor, ["$", "D", "p"]);

      assert.equal(editor.getText(), "abSYS");
      assert.equal(editor.getRegister(), "");
    });

    it(`${policy} clipboard mirror policy keeps p reading OS clipboard`, () => {
      const { editor } = createEditorWithSpy("ab");
      editor.setClipboardMirrorPolicy(policy);
      editor.setRegister("shadow");
      editor.setClipboardReadFn(() => "SYS");

      sendKeys(editor, ["p"]);

      assert.equal(editor.getText(), "aSYSb");
      assert.equal(editor.getRegister(), "shadow");
    });

    it(`${policy} clipboard mirror policy keeps P reading OS clipboard`, () => {
      const { editor } = createEditorWithSpy("ab");
      editor.setClipboardMirrorPolicy(policy);
      editor.setRegister("shadow");
      editor.setClipboardReadFn(() => "SYS");

      sendKeys(editor, ["P"]);

      assert.equal(editor.getText(), "SYSab");
      assert.equal(editor.getRegister(), "shadow");
    });
  }
});
