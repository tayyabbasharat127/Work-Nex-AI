/**
 * AES-256-GCM encryption for credentials at rest (biometric integration
 * DB/API passwords and keys). Requires ENCRYPTION_KEY in .env — a 32-byte
 * key, base64-encoded. Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
const crypto = require('crypto');
const { config } = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended for GCM

const getKey = () => {
  const raw = config.encryptionKey;
  if (!raw) throw new Error('ENCRYPTION_KEY is not set — required to store integration credentials');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes (generate with crypto.randomBytes(32))');
  return key;
};

/**
 * @param {string} plaintext
 * @returns {string} "iv:authTag:ciphertext", all base64 — safe to store as a single text column
 */
const encrypt = (plaintext) => {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((buf) => buf.toString('base64')).join(':');
};

/**
 * @param {string} stored - the "iv:authTag:ciphertext" string from encrypt()
 * @returns {string|null}
 */
const decrypt = (stored) => {
  if (!stored) return null;
  const [ivB64, authTagB64, ciphertextB64] = stored.split(':');
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error('Malformed encrypted value');

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
};

module.exports = { encrypt, decrypt };
