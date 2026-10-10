#!/usr/bin/env node
import { main } from '../lib/proxy.js';

main().catch((err) => {
  process.stderr.write(`linkbreakers-mcp: ${err.message}\n`);
  process.exit(1);
});
