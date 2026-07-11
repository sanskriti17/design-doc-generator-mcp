#!/usr/bin/env node
const major = Number(process.versions.node.split(".")[0]);
if (Number.isNaN(major) || major < 18) {
  console.error(
    `design-doc-generator-mcp requires Node.js 18 or newer (found ${process.version}). ` +
      "Please upgrade Node and try again: https://nodejs.org"
  );
  process.exit(1);
}

import("../dist/index.js");
