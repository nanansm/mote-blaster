import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'

function getKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET ?? 'fallback-key-do-not-use-in-production'
  return createHash('sha256').update(secret).digest()
}

/** Encrypt plaintext with AES-256-GCM. Returns "ivHex:authTagHex:ciphertextHex". */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv  = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

/** Decrypt a value produced by encrypt(). */
export function decrypt(ciphertext: string): string {
  const key   = getKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted value format')
  const [ivHex, tagHex, encHex] = parts
  const iv      = Buffer.from(ivHex,  'hex')
  const authTag = Buffer.from(tagHex, 'hex')
  const enc     = Buffer.from(encHex, 'hex')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
