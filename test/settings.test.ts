import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  readPiVimBooleanSetting,
  readPiVimClipboardMirrorSetting,
  readPiVimModeColors,
} from "../settings.js";

describe("piVim mode color settings reader", () => {
  it("returns undefined when mode colors are missing", () => {
    assert.equal(readPiVimModeColors(undefined, undefined), undefined);
    assert.equal(readPiVimModeColors({ piVim: {} }, { piVim: {} }), undefined);
  });

  it("reads partial mode color settings", () => {
    assert.deepEqual(
      readPiVimModeColors(
        { piVim: { modeColors: { insert: " borderMuted " } } },
        {},
      ),
      { insert: "borderMuted" },
    );
  });

  it("reads all three mode color settings", () => {
    assert.deepEqual(
      readPiVimModeColors(
        {
          piVim: {
            modeColors: {
              insert: "muted",
              normal: "primary",
              ex: "warning",
            },
          },
        },
        {},
      ),
      { insert: "muted", normal: "primary", ex: "warning" },
    );
  });

  it("drops non-string mode color leaves", () => {
    assert.deepEqual(
      readPiVimModeColors(
        {
          piVim: { modeColors: { insert: "muted", normal: 42, ex: "warning" } },
        },
        {},
      ),
      { insert: "muted", ex: "warning" },
    );
  });

  it("drops malformed mode color tokens", () => {
    assert.deepEqual(
      readPiVimModeColors(
        {
          piVim: {
            modeColors: {
              insert: "red;evil",
              normal: "_bad",
              ex: "warn-ing_1",
            },
          },
        },
        {},
      ),
      { ex: "warn-ing_1" },
    );
  });

  it("lets project modeColors override global as a setting", () => {
    assert.deepEqual(
      readPiVimModeColors(
        {
          piVim: {
            modeColors: {
              insert: "globalInsert",
              normal: "globalNormal",
              ex: "globalEx",
            },
          },
        },
        { piVim: { modeColors: { ex: "projectEx" } } },
      ),
      { ex: "projectEx" },
    );
  });

  it("does not fall back to global modeColors when project leaves are invalid", () => {
    assert.deepEqual(
      readPiVimModeColors(
        {
          piVim: {
            modeColors: {
              insert: "globalInsert",
              normal: "globalNormal",
              ex: "globalEx",
            },
          },
        },
        {
          piVim: {
            modeColors: {
              insert: "projectInsert",
              normal: 42,
              ex: "red;evil",
            },
          },
        },
      ),
      { insert: "projectInsert" },
    );
  });

  it("treats malformed project modeColors as an override", () => {
    assert.equal(
      readPiVimModeColors(
        { piVim: { modeColors: { insert: "globalInsert" } } },
        { piVim: { modeColors: null } },
      ),
      undefined,
    );
  });
});

describe("piVim boolean settings reader", () => {
  it("returns undefined when boolean setting is missing", () => {
    assert.equal(
      readPiVimBooleanSetting(undefined, undefined, "syncBorderColorWithMode"),
      undefined,
    );
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: {} },
        { piVim: {} },
        "syncBorderColorWithMode",
      ),
      undefined,
    );
  });

  it("reads true and false boolean settings", () => {
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: { syncBorderColorWithMode: true } },
        {},
        "syncBorderColorWithMode",
      ),
      true,
    );
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: { syncBorderColorWithMode: false } },
        {},
        "syncBorderColorWithMode",
      ),
      false,
    );
  });

  it("ignores invalid boolean settings", () => {
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: { syncBorderColorWithMode: "true" } },
        {},
        "syncBorderColorWithMode",
      ),
      undefined,
    );
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: { syncBorderColorWithMode: 1 } },
        {},
        "syncBorderColorWithMode",
      ),
      undefined,
    );
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: { syncBorderColorWithMode: null } },
        {},
        "syncBorderColorWithMode",
      ),
      undefined,
    );
  });

  it("lets project boolean settings override global", () => {
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: { syncBorderColorWithMode: true } },
        { piVim: { syncBorderColorWithMode: false } },
        "syncBorderColorWithMode",
      ),
      false,
    );
  });

  it("treats invalid project boolean settings as an override", () => {
    assert.equal(
      readPiVimBooleanSetting(
        { piVim: { syncBorderColorWithMode: true } },
        { piVim: { syncBorderColorWithMode: "false" } },
        "syncBorderColorWithMode",
      ),
      undefined,
    );
  });
});

describe("piVim clipboard mirror settings reader", () => {
  it("returns undefined when global and project settings are missing", () => {
    assert.equal(
      readPiVimClipboardMirrorSetting(undefined, undefined),
      undefined,
    );
    assert.equal(readPiVimClipboardMirrorSetting(null, null), undefined);
    assert.equal(readPiVimClipboardMirrorSetting("bad", 42), undefined);
  });

  it("reads global piVim clipboardMirror when project setting is missing", () => {
    assert.equal(
      readPiVimClipboardMirrorSetting(
        { piVim: { clipboardMirror: "yank" } },
        {},
      ),
      "yank",
    );
  });

  it("lets project piVim clipboardMirror override global", () => {
    assert.equal(
      readPiVimClipboardMirrorSetting(
        { piVim: { clipboardMirror: "never" } },
        { piVim: { clipboardMirror: "all" } },
      ),
      "all",
    );
  });

  it("treats invalid project clipboardMirror as an override instead of falling back to global", () => {
    assert.equal(
      readPiVimClipboardMirrorSetting(
        { piVim: { clipboardMirror: "yank" } },
        { piVim: { clipboardMirror: null } },
      ),
      null,
    );
  });

  it("treats malformed project piVim settings as an override instead of falling back to global", () => {
    assert.equal(
      readPiVimClipboardMirrorSetting(
        { piVim: { clipboardMirror: "yank" } },
        { piVim: "bad" },
      ),
      "bad",
    );
  });
});
