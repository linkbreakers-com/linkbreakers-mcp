import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const CALLBACK_PORT = Number(process.env.LINKBREAKERS_MCP_CALLBACK_PORT || 47823);
const CALLBACK_PATH = '/callback';
const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;

function storePath() {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(base, 'linkbreakers', 'mcp-oauth.json');
}

function readStore(serverUrl) {
  try {
    return JSON.parse(readFileSync(storePath(), 'utf8'))[serverUrl] ?? {};
  } catch {
    return {};
  }
}

function writeStore(serverUrl, patch) {
  const path = storePath();
  let all = {};
  try {
    all = JSON.parse(readFileSync(path, 'utf8'));
  } catch {}
  all[serverUrl] = { ...all[serverUrl], ...patch };
  for (const [key, value] of Object.entries(all[serverUrl])) {
    if (value === undefined) delete all[serverUrl][key];
  }
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(all, null, 2), { mode: 0o600 });
}

export function hasStoredTokens(serverUrl) {
  return Boolean(readStore(serverUrl).tokens);
}

export function openBrowser(url) {
  const [cmd, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
        : ['xdg-open', [url]];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
  } catch {}
}

export class FileOAuthProvider {
  constructor(serverUrl, version) {
    this.serverUrl = serverUrl;
    this.version = version;
    this.authorizationUrl = undefined;
    this._state = undefined;
    this._verifier = undefined;
  }

  get redirectUrl() {
    return `http://127.0.0.1:${CALLBACK_PORT}${CALLBACK_PATH}`;
  }

  get clientMetadata() {
    return {
      client_name: 'Linkbreakers MCP (stdio)',
      client_uri: 'https://linkbreakers.com',
      software_id: 'linkbreakers-mcp',
      software_version: this.version,
      redirect_uris: [this.redirectUrl],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    };
  }

  state() {
    this._state = randomBytes(16).toString('hex');
    return this._state;
  }

  clientInformation() {
    const info = readStore(this.serverUrl).clientInformation;
    if (info && info.redirect_uris && !info.redirect_uris.includes(this.redirectUrl)) return undefined;
    return info;
  }

  saveClientInformation(clientInformation) {
    writeStore(this.serverUrl, { clientInformation });
  }

  tokens() {
    return readStore(this.serverUrl).tokens;
  }

  saveTokens(tokens) {
    writeStore(this.serverUrl, { tokens });
  }

  redirectToAuthorization(authorizationUrl) {
    this.authorizationUrl = authorizationUrl.toString();
  }

  saveCodeVerifier(codeVerifier) {
    this._verifier = codeVerifier;
  }

  codeVerifier() {
    if (!this._verifier) throw new Error('no PKCE code verifier for this sign-in');
    return this._verifier;
  }

  invalidateCredentials(scope) {
    if (scope === 'all') writeStore(this.serverUrl, { clientInformation: undefined, tokens: undefined });
    if (scope === 'client') writeStore(this.serverUrl, { clientInformation: undefined });
    if (scope === 'tokens') writeStore(this.serverUrl, { tokens: undefined });
  }

  waitForCallback() {
    const expectedState = this._state;
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        const url = new URL(req.url || '/', this.redirectUrl);
        if (url.pathname !== CALLBACK_PATH) {
          res.writeHead(404).end();
          return;
        }
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const ok = code && (!expectedState || url.searchParams.get('state') === expectedState);
        res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          ok
            ? '<p>Linkbreakers is connected. You can close this tab and return to your MCP client.</p>'
            : `<p>Linkbreakers sign-in failed: ${error ? String(error).replace(/[<>&"]/g, '') : 'invalid callback'}.</p>`,
        );
        clearTimeout(timer);
        server.close();
        if (ok) resolve(code);
        else reject(new Error(`OAuth sign-in failed: ${error || 'invalid callback'}`));
      });
      const timer = setTimeout(() => {
        server.close();
        reject(new Error('OAuth sign-in timed out'));
      }, LOGIN_TIMEOUT_MS);
      server.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`could not listen for the OAuth callback on ${this.redirectUrl}: ${err.message}`));
      });
      server.listen(CALLBACK_PORT, '127.0.0.1');
    });
  }
}
