# linkbreakers-mcp

**An MCP server that lets AI agents create and track QR codes.** Connect Claude, Cursor, VS Code or any MCP client to [Linkbreakers](https://linkbreakers.com/mcp?utm_source=github&utm_content=linkbreakers-mcp) and your agent can create a dynamic QR code and its short link, style the code, put a lead capture form between the scan and the destination and read back every scan: device, country, city and time, visitors and analytics.

```bash
npx -y linkbreakers-mcp
```

Sign in with OAuth on the first request, nothing to paste. Works on every Linkbreakers plan, Free included.

What an agent can ask for, and the tools it uses:

| Ask | Tools |
| --- | --- |
| "Make a QR code for our spring poster that opens example.com/spring" | `links_create` |
| "Make one code per store from this list" | `links_create_bulk` |
| "Make the code navy with rounded dots" | `qrcodedesigns_update` |
| "Ask for an email before the redirect" | `workflow_steps_create` |
| "Who scanned the poster this week, and from where?" | `events_list`, `visitors_list` |
| "How many scans did the workspace get?" | `metrics_workspace` |

In clients that render MCP Apps (Claude, ChatGPT), `links_create`, `links_get`, `visitors_list` and `metrics_workspace` answer with an interactive card.

## How it works

This package is a local stdio bridge to the hosted server at `https://mcp.linkbreakers.com`, for MCP clients that can only start local (stdio) servers. If your client supports remote MCP servers, connect it to `https://mcp.linkbreakers.com` directly instead. See the [setup guide](https://linkbreakers.com/help/article/mcp-server-setup?utm_source=github&utm_content=linkbreakers-mcp).

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
