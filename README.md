# linkbreakers-mcp

Local stdio bridge to the hosted [Linkbreakers](https://linkbreakers.com) MCP server at `https://mcp.linkbreakers.com`, for MCP clients that can only start local (stdio) servers.

If your client supports remote MCP servers, connect it to `https://mcp.linkbreakers.com` directly instead. See the [setup guide](https://linkbreakers.com/help/article/mcp-server-setup).

Tools, resources and their schemas come from the hosted server: this package forwards every request unchanged, so it always matches what `https://mcp.linkbreakers.com` serves.

## Setup

```json
{
  "mcpServers": {
    "linkbreakers": {
      "command": "npx",
      "args": ["-y", "linkbreakers-mcp"]
    }
  }
}
```

### Authentication

On the first request, your browser opens the Linkbreakers sign-in. Once you approve, the tools appear. Tokens are stored in `~/.config/linkbreakers/mcp-oauth.json` and refreshed automatically.

The MCP server accepts OAuth only: dashboard API tokens are refused, so there
is nothing to paste. API tokens are for the REST API, the SDKs and the CLI.

| Variable | Default | Purpose |
| --- | --- | --- |
| `LINKBREAKERS_MCP_URL` | `https://mcp.linkbreakers.com` | Server to forward to |
| `LINKBREAKERS_MCP_CALLBACK_PORT` | `47823` | Local port for the OAuth redirect |

Requires Node.js 18 or later.

## Releases

Each API release dispatches `update-sdk` to this repo. The [release workflow](.github/workflows/release.yml) sets the package to the API version, checks that the server answers an MCP `initialize` over stdio, publishes to npm through trusted publishing and tags `v<version>`.

## License

MIT
