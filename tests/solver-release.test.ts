import { expect, test } from "bun:test";
import { resolveCoreVersion } from "../scripts/check-solver-release";

test("release gate respects the actual 0.0.x caret dependency, not latest core", () => {
  expect(resolveCoreVersion(["0.0.2056", "0.0.2072"], "^0.0.2056")).toBe("0.0.2056");
  expect(resolveCoreVersion(["0.0.2056", "0.0.2072"], "^0.0.2072")).toBe("0.0.2072");
  expect(resolveCoreVersion(["0.0.2072-beta.1"], ">=0.0.2072-0")).toBeUndefined();
});
