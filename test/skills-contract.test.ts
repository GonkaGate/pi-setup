import assert from "node:assert/strict";
import test from "node:test";
import {
  assertMatchesAll,
  assertMirroredSkillDirectory,
  readText,
} from "./contract-helpers.js";

test("mirrored skill assets stay aligned across .agents and .claude", () => {
  assertMirroredSkillDirectory("pi-setup-development");
});

test("AGENTS documents the mirrored skill pack", () => {
  const agents = readText("AGENTS.md");

  assertMatchesAll(agents, [
    /\.agents\/skills\//,
    /\.claude\/skills\//,
    /mirrored/i,
    /pi-setup-development/,
  ]);
});

test("repo skill documents the current Pi setup contract", () => {
  const skill = readText(".agents/skills/pi-setup-development/SKILL.md");

  assert.match(skill, /@gonkagate\/pi-setup/);
  assert.match(skill, /~\/\.pi\/agent\/models\.json/);
  assert.match(skill, /GONKAGATE_API_KEY/);
  assert.match(skill, /providers\.gonkagate/);
  assert.match(skill, /configured/);
  assert.match(skill, /verified/);
  assert.match(skill, /backup/i);
  assert.match(skill, /auth\.json/);
  assert.match(skill, /shell profiles/);
  assert.match(skill, /\.env/);
  assert.match(skill, /arbitrary custom base URLs/);
  assert.match(skill, /arbitrary custom model ids/);
  assert.match(skill, /default live GonkaGate\/Pi verification/);
  assert.doesNotMatch(skill, /opencode/);
  assert.doesNotMatch(
    skill,
    /setup (verifies|validates|checks) (live )?(GonkaGate|Pi)/i,
  );
});
