const { spawn } = require('node:child_process');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const root = path.join(__dirname, '..');

async function isTranslationApiReady(url) {
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/api/health`, {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok && (await response.json()).ok === true;
  } catch {
    return false;
  }
}

async function isAccountApiReady(url) {
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/api/auth/session`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await response.json();
    // A signed-out response proves the auth routes and private database work.
    return (response.status === 401 && data.error === 'authSignInRequired') ||
      (response.ok && typeof data.user?.id === 'string');
  } catch { return false; }
}

async function isChatApiReady(url) {
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/api/health`, { signal: AbortSignal.timeout(1000) });
    return response.ok && (await response.json()).capabilities?.ragChat === true;
  } catch { return false; }
}

async function main() {
  // Match Expo's development env precedence without printing credentials.
  const dotenv = require('dotenv');
  const fs = require('node:fs');
  for (const name of ['.env.development.local', '.env.local', '.env.development', '.env']) {
    const file = path.join(root, name);
    if (fs.existsSync(file)) {
      const values = dotenv.parse(fs.readFileSync(file));
      for (const [key, value] of Object.entries(values)) process.env[key] ??= value;
    }
  }

  const children = new Set();
  let stopping = false;
  const stop = (code) => {
    if (stopping) return;
    stopping = true;
    for (const child of children) child.kill('SIGTERM');
    process.exitCode = code;
  };
  process.once('SIGINT', () => stop(0));
  process.once('SIGTERM', () => stop(0));

  function launch(args, env = process.env) {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
    children.add(child);
    child.once('error', error => { console.error(error.message); stop(1); });
    child.once('exit', code => { children.delete(child); stop(code ?? 1); });
    return child;
  }

  try {
    const configuredApi = process.env.EXPO_PUBLIC_TRANSLATION_API_URL;
    const apiUrl = configuredApi || 'http://localhost:3001';
    if (!(await isTranslationApiReady(apiUrl))) {
      if (configuredApi) {
        throw new Error('The configured translation API is unavailable. Start it or correct EXPO_PUBLIC_TRANSLATION_API_URL.');
      }
      // The client's default is port 3001, regardless of unrelated shell PORT values.
      launch([path.join(root, 'server/index.js')], { ...process.env, PORT: '3001' });
      const deadline = Date.now() + 10000;
      while (!stopping && !(await isTranslationApiReady(apiUrl))) {
        if (Date.now() >= deadline) throw new Error('Translation API did not become ready. Check the server error above.');
        await delay(150);
      }
    }
    if (!stopping && !(await isAccountApiReady(process.env.EXPO_PUBLIC_AUTH_API_URL || apiUrl))) {
      throw new Error('The account API is unavailable or outdated. Restart the API with npm run server and check EXPO_PUBLIC_AUTH_API_URL. A translation-only server cannot support sign-in.');
    }
    if (!stopping && !(await isChatApiReady(process.env.EXPO_PUBLIC_AUTH_API_URL || apiUrl))) {
      throw new Error('The running API lacks RAG chat. Restart it with npm run server.');
    }
    if (!stopping) {
      launch([require.resolve('expo/bin/cli'), 'start', ...process.argv.slice(2)]);
    }
  } catch (error) {
    console.error(error.message);
    stop(1);
  }
}

if (require.main === module) void main();
module.exports = { isTranslationApiReady, isAccountApiReady, isChatApiReady, main };
