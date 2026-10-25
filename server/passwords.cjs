const { randomBytes, pbkdf2: pbkdf2Callback, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const pbkdf2 = promisify(pbkdf2Callback);
const scrypt = promisify(scryptCallback);
const ITERATIONS = 600000;
const PREFIX = `pbkdf2-sha256$${ITERATIONS}$`;
const legacyOptions = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };
const isLegacyHash = value => typeof value === 'string' && /^[0-9a-f]{128}$/.test(value);

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await pbkdf2(password, salt, ITERATIONS, 32, 'sha256');
  return { salt: salt.toString('hex'), password_hash: PREFIX + hash.toString('hex') };
}

async function verifyPassword(password, account) {
  const saltValid = typeof account?.salt === 'string' && /^[0-9a-f]{32}$/.test(account.salt);
  if (saltValid && isLegacyHash(account.password_hash)) {
    // Historical scrypt records used the hexadecimal salt string as input.
    const hash = await scrypt(password, account.salt, 64, legacyOptions);
    return timingSafeEqual(hash, Buffer.from(account.password_hash, 'hex'));
  }
  const encoded = account?.password_hash;
  const valid = saltValid && typeof encoded === 'string' && encoded.startsWith(PREFIX) && /^[0-9a-f]{64}$/.test(encoded.slice(PREFIX.length));
  // Unknown accounts and malformed records still incur the current hashing cost.
  const hash = await pbkdf2(password, valid ? Buffer.from(account.salt, 'hex') : Buffer.alloc(16), ITERATIONS, 32, 'sha256');
  const expected = valid ? Buffer.from(encoded.slice(PREFIX.length), 'hex') : Buffer.alloc(32);
  return timingSafeEqual(hash, expected) && valid;
}
module.exports = { hashPassword, verifyPassword, isLegacyHash };
