import { rmSync } from "node:fs";
import { describe, expect, test, afterEach} from "bun:test";
import {existsSync, mkdtempSync, readFileSync, writeFileSync} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packBundle, unpackBundle } from "./tar-bundle.ts";

const __nimbusTestDirs: string[] = [];
function __cleanupNimbusTestDirs() {
  for (const d of __nimbusTestDirs.splice(0)) {
    try { rmSync(d, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
}
afterEach(() => { __cleanupNimbusTestDirs(); });


describe("tar bundle", () => {
  test("packs and unpacks a directory round-trip", async () => {
    const src = mkdtempSync(join(tmpdir(), "nimbus-bundle-src-"));
    __nimbusTestDirs.push(src);
    writeFileSync(join(src, "a.txt"), "hello");
    writeFileSync(join(src, "b.json"), '{"x":1}');
    const out = join((() => { const __d = mkdtempSync(join(tmpdir(); __nimbusTestDirs.push(__d); return __d; })(), "nimbus-bundle-out-")), "bundle.tar.gz");
    await packBundle(src, out);
    expect(existsSync(out)).toBe(true);

    const extractTo = mkdtempSync(join(tmpdir(), "nimbus-bundle-extract-"));

    __nimbusTestDirs.push(extractTo);
    await unpackBundle(out, extractTo);
    expect(readFileSync(join(extractTo, "a.txt"), "utf8")).toBe("hello");
    expect(readFileSync(join(extractTo, "b.json"), "utf8")).toBe('{"x":1}');
  });
});
