import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpError, ResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { FileOAuthProvider, hasStoredTokens, openBrowser } from './oauth.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const SERVER_URL = new URL(process.env.LINKBREAKERS_MCP_URL || 'https://mcp.linkbreakers.com');
const TOKEN = process.env.LINKBREAKERS_API_TOKEN?.trim();
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
const AUTH_REQUIRED = -32001;
const DEFAULT_CAPABILITIES = { tools: { listChanged: true }, resources: { listChanged: true } };

const log = (message) => process.stderr.write(`linkbreakers-mcp: ${message}\n`);

export async function main() {
  const oauth = TOKEN ? undefined : new FileOAuthProvider(SERVER_URL.href, version);
  let server;
  let remote;
  let connecting;
  let signIn;

  const transportOptions = TOKEN
    ? { requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } } }
    : { authProvider: oauth };

  async function connectRemote(transport = new StreamableHTTPClientTransport(SERVER_URL, transportOptions)) {
    const client = new Client({ name: 'linkbreakers-mcp', version }, { capabilities: {} });
    client.fallbackNotificationHandler = async (notification) => {
      await server?.notification(notification).catch(() => {});
    };
    client.onclose = () => {
      if (remote === client) remote = undefined;
    };
    try {
      await client.connect(transport);
    } catch (err) {
      if (oauth && err instanceof UnauthorizedError && oauth.authorizationUrl) startSignIn(transport);
      throw err;
    }
    return client;
  }

  function startSignIn(transport) {
    if (signIn) return;
    const url = oauth.authorizationUrl;
    const callback = oauth.waitForCallback();
    log(`sign in to Linkbreakers to continue: ${url}`);
    openBrowser(url);
    signIn = callback
      .then((code) => transport.finishAuth(code))
      .then(() => connectRemote())
      .then(async (client) => {
        remote = client;
        log('signed in to Linkbreakers');
        await server.sendToolListChanged().catch(() => {});
        await server.sendResourceListChanged().catch(() => {});
      })
      .catch((err) => log(err.message))
      .finally(() => {
        signIn = undefined;
      });
  }

  function authError() {
    const url = oauth?.authorizationUrl;
    return new McpError(
      AUTH_REQUIRED,
      TOKEN
        ? 'Linkbreakers rejected LINKBREAKERS_API_TOKEN. Create a workspace API token at https://app.linkbreakers.com, or unset it to sign in with OAuth.'
        : `Linkbreakers sign-in required. Finish the OAuth sign-in opened in your browser${url ? ` (${url})` : ''}, or set LINKBREAKERS_API_TOKEN to a workspace API token. Tools appear once you are signed in.`,
    );
  }

  async function ensureRemote() {
    if (remote) return remote;
    if (signIn) throw authError();
    connecting ??= connectRemote().finally(() => {
      connecting = undefined;
    });
    try {
      remote = await connecting;
      return remote;
    } catch (err) {
      if (err instanceof UnauthorizedError || err?.code === 401) throw authError();
      throw new McpError(-32603, `Could not reach ${SERVER_URL.href}: ${err.message}`);
    }
  }

  if (TOKEN || hasStoredTokens(SERVER_URL.href)) {
    try {
      remote = await connectRemote();
    } catch (err) {
      log(`could not connect yet (${err.message}); retrying on the first request`);
    }
  }

  server = new Server(
    { name: 'linkbreakers-mcp', title: 'Linkbreakers MCP', version, websiteUrl: 'https://linkbreakers.com' },
    {
      capabilities: remote?.getServerCapabilities() ?? DEFAULT_CAPABILITIES,
      instructions: remote?.getInstructions(),
    },
  );

  server.fallbackRequestHandler = async (request, extra) => {
    const client = await ensureRemote();
    const progressToken = request.params?._meta?.progressToken;
    return client.request({ method: request.method, params: request.params }, ResultSchema, {
      signal: extra.signal,
      timeout: REQUEST_TIMEOUT_MS,
      resetTimeoutOnProgress: true,
      onprogress:
        progressToken === undefined
          ? undefined
          : (progress) =>
              server.notification({ method: 'notifications/progress', params: { ...progress, progressToken } }).catch(() => {}),
    });
  };

  server.fallbackNotificationHandler = async (notification) => {
    await remote?.notification(notification).catch(() => {});
  };

  server.onclose = async () => {
    await remote?.close().catch(() => {});
    process.exit(0);
  };

  await server.connect(new StdioServerTransport());
}
