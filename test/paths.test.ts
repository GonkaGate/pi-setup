import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import test from "node:test";
import { InstallError } from "../src/install/errors.js";
import {
  posixPlatformPath,
  win32PlatformPath,
} from "../src/install/platform-path.js";
import {
  resolveDefaultPiModelsPath as resolveInstallDefaultPiModelsPath,
  resolveHomeDirectory,
  resolveInstallPath as resolveInstallPathWithOptions,
} from "../src/install/paths.js";
import {
  resolveDefaultPiModelsPath,
  resolveInstallPath,
} from "../src/paths.js";

test("resolves Pi models path under the current user home", () => {
  assert.equal(
    resolveDefaultPiModelsPath({ HOME: "/tmp/user" }),
    join("/tmp/user", ".pi", "agent", "models.json"),
  );
});

test("expands home-relative custom config path", () => {
  assert.equal(
    resolveInstallPath("~/custom/models.json", { HOME: "/tmp/user" }),
    join("/tmp/user", "custom", "models.json"),
  );
});

test("resolves plain custom config path against cwd", () => {
  assert.equal(resolveInstallPath("models.json", {}), resolve("models.json"));
});

test("install path resolver supports POSIX home paths", () => {
  assert.equal(
    resolveInstallDefaultPiModelsPath({
      env: { HOME: "/home/pi" },
      pathApi: posixPlatformPath,
    }),
    "/home/pi/.pi/agent/models.json",
  );
});

test("install path resolver supports native Windows home paths", () => {
  assert.equal(
    resolveInstallDefaultPiModelsPath({
      env: { USERPROFILE: "C:\\Users\\Pi" },
      pathApi: win32PlatformPath,
    }),
    "C:\\Users\\Pi\\.pi\\agent\\models.json",
  );
});

test("install path resolver supports Windows drive and homepath fallback", () => {
  assert.equal(
    resolveHomeDirectory({ HOMEDRIVE: "D:", HOMEPATH: "\\Users\\Pi" }),
    "D:\\Users\\Pi",
  );
});

test("install path resolver expands Git Bash-style home paths on Windows", () => {
  assert.equal(
    resolveInstallPathWithOptions("~/custom/models.json", {
      env: { HOME: "C:/Users/Pi" },
      pathApi: win32PlatformPath,
    }),
    "C:\\Users\\Pi\\custom\\models.json",
  );
  assert.equal(
    resolveInstallPathWithOptions("~\\custom\\models.json", {
      env: { USERPROFILE: "C:\\Users\\Pi" },
      pathApi: win32PlatformPath,
    }),
    "C:\\Users\\Pi\\custom\\models.json",
  );
});

test("install path resolver rejects missing home with a typed error", () => {
  assert.throws(
    () =>
      resolveInstallDefaultPiModelsPath({
        env: {},
        pathApi: posixPlatformPath,
      }),
    (error: unknown) =>
      error instanceof InstallError && error.errorCode === "missing_home",
  );
});

test("install path resolver resolves relative custom config paths against cwd", () => {
  assert.equal(
    resolveInstallPathWithOptions("models.json", {
      cwd: "/repo",
      env: { HOME: "/home/pi" },
      pathApi: posixPlatformPath,
    }),
    "/repo/models.json",
  );
  assert.equal(
    resolveInstallPathWithOptions("models.json", {
      cwd: "C:\\repo",
      env: { USERPROFILE: "C:\\Users\\Pi" },
      pathApi: win32PlatformPath,
    }),
    "C:\\repo\\models.json",
  );
});
