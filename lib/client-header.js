// The Linkbreakers-Client header the bridge sends to the MCP server:
//   mcp-bridge/<version> (node <version>; <platform>; client=<name> <version>)
// The client part names the MCP client on the other side of stdio, from its
// initialize, so the server can count the end client and not just the bridge.
// Nothing about the user or the machine beyond the OS family.

const PLATFORMS = { darwin: 'darwin', linux: 'linux', win32: 'windows' };

function clean(value, max) {
  return String(value ?? '')
    .replace(/[^A-Za-z0-9 ._+-]/g, '')
    .trim()
    .slice(0, max);
}

export function clientHeader(version, endClient) {
  const platform = PLATFORMS[process.platform] ?? 'other';
  const details = [`node ${process.versions.node}`, platform];
  const name = clean(endClient?.name, 40);
  if (name) {
    const clientVersion = clean(endClient?.version, 24).replace(/ /g, '');
    details.push(`client=${name}${clientVersion ? ` ${clientVersion}` : ''}`);
  }
  return `mcp-bridge/${clean(version, 24) || 'unknown'} (${details.join('; ')})`;
}
