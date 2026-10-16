// The device cookie: which device is asking, for the quota.
//
// The server gives each device a random id and signs it (HMAC-SHA256 with `JEV_COOKIE_SECRET`,
// server-only). A cookie the server didn't sign (none, a made-up or edited one) is a new device: it
// gets a fresh id, signed, as on a first visit. So a script can't choose its own ids, and each fresh
// id it's given is a device new to its network today, which the network's daily cap on devices bounds.

/** The cookie's name. */
export const DEVICE_COOKIE = "jev_device"
/** The only path the cookie is sent to: the decision endpoint. */
export const DEVICE_COOKIE_PATH = "/api/decide"

/** A secret shorter than this counts as missing. 32 random bytes as hex is 64 characters. */
export const MIN_SECRET_CHARS = 32

const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** A signed cookie value: the id, a dot, then its HMAC-SHA256 in hex. */
const SIGNED = /^([0-9a-f-]{36})\.([0-9a-f]{64})$/

/** Signs device ids, and checks the ones that come back. */
export interface DeviceSigner {
  /** The cookie value for a device id: the id and its signature. */
  sign(id: string): Promise<string>
  /** The id a cookie value carries, if this server signed it. Null for anything else. */
  verify(value: string): Promise<string | null>
}

const encoder = new TextEncoder()

/** What's signed: the id under the cookie's name, so a signature made for anything else never fits. */
function signedText(id: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(`${DEVICE_COOKIE}:${id}`)
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

export function deviceSigner(secret: string): DeviceSigner {
  let key: Promise<CryptoKey> | null = null
  const hmacKey = () =>
    (key ??= crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]))
  return {
    async sign(id) {
      const signature = await crypto.subtle.sign("HMAC", await hmacKey(), signedText(id))
      return `${id}.${toHex(new Uint8Array(signature))}`
    },
    async verify(value) {
      const parts = SIGNED.exec(value)
      if (!parts || !DEVICE_ID.test(parts[1])) return null
      // Web Crypto compares the signature itself, in constant time
      const ok = await crypto.subtle.verify("HMAC", await hmacKey(), fromHex(parts[2]), signedText(parts[1]))
      return ok ? parts[1] : null
    },
  }
}

type Env = Record<string, string | undefined>

let fromEnv: { secret: string; signer: DeviceSigner } | null = null
let devSigner: DeviceSigner | null = null

/**
 * The deployment's signer, keyed by `JEV_COOKIE_SECRET`. Without the secret (or with one too short
 * to be one): null on Vercel, so decisions rest there rather than counting quotas by ids anyone could
 * make up; on a developer's machine, a signer with a random secret of this process's own (after a
 * restart its old cookies are new devices, which only resets local counts).
 */
export function deviceSignerFromEnv(env: Env = process.env): DeviceSigner | null {
  const secret = (env.JEV_COOKIE_SECRET ?? "").trim()
  if (secret.length >= MIN_SECRET_CHARS) {
    if (fromEnv?.secret !== secret) fromEnv = { secret, signer: deviceSigner(secret) }
    return fromEnv.signer
  }
  if (env.VERCEL) return null
  devSigner ??= deviceSigner(toHex(crypto.getRandomValues(new Uint8Array(32))))
  return devSigner
}

/** The request's device cookie as it was sent (the first one, if there are several). */
function cookieValue(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? ""
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=")
    if (name === DEVICE_COOKIE) return rest.join("=").trim()
  }
  return null
}

/** The device the request's cookie names, if this server signed it. Null: a new device. */
export async function deviceFrom(request: Request, signer: DeviceSigner): Promise<string | null> {
  const value = cookieValue(request)
  return value === null ? null : signer.verify(value)
}

/** The Set-Cookie value for a signed device id: a year, this endpoint only, never readable by scripts. */
export function deviceCookie(signed: string, secure: boolean): string {
  return `${DEVICE_COOKIE}=${signed}; Path=${DEVICE_COOKIE_PATH}; Max-Age=31536000; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`
}

/**
 * Who's asking: the device a signed cookie names, or else a new device with a fresh id and the
 * signed cookie to give it (`setCookie`).
 */
export async function identifyDevice(request: Request, signer: DeviceSigner): Promise<{ device: string; setCookie: string | null }> {
  const known = await deviceFrom(request, signer)
  if (known) return { device: known, setCookie: null }
  const device = crypto.randomUUID()
  const secure = new URL(request.url).protocol === "https:"
  return { device, setCookie: deviceCookie(await signer.sign(device), secure) }
}
