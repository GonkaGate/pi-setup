#!/usr/bin/env node

import process from "node:process";
import { main, renderCliEntrypointError } from "../dist/cli.js";

main().catch((error) => {
  const rendered = renderCliEntrypointError(error);

  if (rendered.stderrText !== undefined) {
    process.stderr.write(rendered.stderrText);
  }

  process.exitCode = rendered.exitCode;
});
