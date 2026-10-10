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

- **OAuth (default):** on the first request, your browser opens the Linkbreakers sign-in. Once you approve, the tools appear. Tokens are stored in `~/.config/linkbreakers/mcp-oauth.json` and refreshed automatically.
- **API token:** set `LINKBREAKERS_API_TOKEN` to a workspace API token from the [dashboard](https://app.linkbreakers.com) to skip the browser.

```json
{
  "mcpServers": {
    "linkbreakers": {
      "command": "npx",
      "args": ["-y", "linkbreakers-mcp"],
      "env": { "LINKBREAKERS_API_TOKEN": "your-workspace-token" }
    }
  }
}
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `LINKBREAKERS_API_TOKEN` | unset | Workspace API token, sent as a bearer token |
| `LINKBREAKERS_MCP_URL` | `https://mcp.linkbreakers.com` | Server to forward to |
| `LINKBREAKERS_MCP_CALLBACK_PORT` | `47823` | Local port for the OAuth redirect |

Requires Node.js 18 or later.

## Releases

Each API release dispatches `update-sdk` to this repo. The [release workflow](.github/workflows/release.yml) sets the package to the API version, checks that the server answers an MCP `initialize` over stdio, publishes to npm through trusted publishing and tags `v<version>`.

## License

MIT
