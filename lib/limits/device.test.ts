// @vitest-environment node
import { describe, expect, it } from "vitest"

import {
  DEVICE_COOKIE,
  deviceCookie,
  deviceFrom,
  deviceSigner,
  deviceSignerFromEnv,
  identifyDevice,
  MIN_SECRET_CHARS,
} from "@/lib/limits/device"

// The device cookie (STACK.md: Security & data, layer 4): issued and signed by the server, so a
// cookie it didn't sign is a new device.

const SECRET = "test-cookie-secret-0123456789abcdef"
const OTHER_SECRET = "test-other-cookie-secret-0123456789"
const ID = "0b2f5c1e-4a7d-4c3e-9f10-123456789abc"

function withCookie(cookie: string | null, url = "https://jev.test/api/decide"): Request {
  return new Request(url, { method: "POST", headers: cookie === null ? {} : { cookie } })
}

describe("signing a device id", () => {
  const signer = deviceSigner(SECRET)

  it("signs an id, and reads back the id from what it signed", async () => {
    const value = await signer.sign(ID)
    expect(value).toMatch(new RegExp(`^${ID}\\.[0-9a-f]{64}$`))
    expect(await signer.verify(value)).toBe(ID)
    // the same id signs the same way every time, on every instance with the same secret
    expect(await deviceSigner(SECRET).sign(ID)).toBe(value)
  })

  it("never puts the secret in the cookie", async () => {
    expect(await signer.sign(ID)).not.toContain(SECRET)
  })

  it("takes nothing it didn't sign: an unsigned id, a made-up signature, another secret's, another id's", async () => {
    const value = await signer.sign(ID)
    const sig = value.split(".")[1]
    const otherId = "1b2f5c1e-4a7d-4c3e-9f10-123456789abc"
    // an unsigned id, as cookies were before signing
    expect(await signer.verify(ID)).toBeNull()
    // a made-up signature of the right shape
    expect(await signer.verify(`${ID}.${"0".repeat(64)}`)).toBeNull()
    // one flipped digit
    const flipped = `${sig.slice(0, -1)}${sig.endsWith("0") ? "1" : "0"}`
    expect(await signer.verify(`${ID}.${flipped}`)).toBeNull()
    // signed by a server with another secret
    expect(await signer.verify(await deviceSigner(OTHER_SECRET).sign(ID))).toBeNull()
    // this id's signature on another id
    expect(await signer.verify(`${otherId}.${sig}`)).toBeNull()
  })

  it.each([
    ["empty", ""],
    ["no signature", `${ID}.`],
    ["a short signature", `${ID}.${"a".repeat(63)}`],
    ["a long signature", `${ID}.${"a".repeat(65)}`],
    ["capitals", `${ID.toUpperCase()}.${"a".repeat(64)}`],
    ["not an id", `${"z".repeat(36)}.${"a".repeat(64)}`],
    ["dashes in the wrong places", `${"0".repeat(32)}----.${"a".repeat(64)}`],
    ["something trailing", `${ID}.${"a".repeat(64)};x`],
  ])("refuses a value of the wrong shape without checking it: %s", async (_why, value) => {
    expect(await signer.verify(value)).toBeNull()
  })
})

describe("the secret", () => {
  const long = "test-" + "k".repeat(MIN_SECRET_CHARS)

  it("signs with JEV_COOKIE_SECRET, so every instance knows every other's cookies", async () => {
    const a = deviceSignerFromEnv({ JEV_COOKIE_SECRET: long, VERCEL: "1" })
    expect(a).not.toBeNull()
    const value = await a!.sign(ID)
    expect(await deviceSigner(long).verify(value)).toBe(ID)
  })

  it("is off on Vercel without one, or with one too short to be a secret: the co-pilot fails closed", () => {
    expect(deviceSignerFromEnv({ VERCEL: "1" })).toBeNull()
    expect(deviceSignerFromEnv({ VERCEL: "1", JEV_COOKIE_SECRET: "   " })).toBeNull()
    expect(deviceSignerFromEnv({ VERCEL: "1", JEV_COOKIE_SECRET: "x".repeat(MIN_SECRET_CHARS - 1) })).toBeNull()
  })

  it("uses a secret of its own on a developer's machine, the same one for the whole process", async () => {
    const a = deviceSignerFromEnv({})
    const b = deviceSignerFromEnv({})
    expect(a).not.toBeNull()
    expect(await b!.verify(await a!.sign(ID))).toBe(ID)
    // a random one: the cookies it signs aren't any fixed secret's
    expect(await deviceSigner(SECRET).verify(await a!.sign(ID))).toBeNull()
  })
})

describe("who's asking", () => {
  const signer = deviceSigner(SECRET)

  it("knows a device by the cookie it signed, among others", async () => {
    const value = await signer.sign(ID)
    expect(await deviceFrom(withCookie(`a=1; ${DEVICE_COOKIE}=${value}; b=2`), signer)).toBe(ID)
    expect(await identifyDevice(withCookie(`${DEVICE_COOKIE}=${value}`), signer)).toEqual({ device: ID, setCookie: null })
  })

  it("gives a first-time visitor a fresh id, signed, in a cookie the page's scripts can't read", async () => {
    const { device, setCookie } = await identifyDevice(withCookie(null), signer)
    expect(device).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(setCookie).toMatch(new RegExp(`^${DEVICE_COOKIE}=${device}\\.[0-9a-f]{64}; `))
    expect(setCookie).toContain("HttpOnly")
    expect(setCookie).toContain("Secure")
    expect(setCookie).toContain("SameSite=Lax")
    expect(setCookie).toContain("Path=/api/decide")
    expect(setCookie).toContain("Max-Age=31536000")
    // and the cookie it gave is the one it knows next time
    const value = setCookie!.split(";")[0].slice(DEVICE_COOKIE.length + 1)
    expect(await deviceFrom(withCookie(`${DEVICE_COOKIE}=${value}`), signer)).toBe(device)
  })

  it("treats a cookie it didn't sign as a new device, with a fresh id it signs", async () => {
    for (const value of [ID, `${ID}.${"0".repeat(64)}`, await deviceSigner(OTHER_SECRET).sign(ID), "nonsense"]) {
      const { device, setCookie } = await identifyDevice(withCookie(`${DEVICE_COOKIE}=${value}`), signer)
      expect(device, value).not.toBe(ID)
      expect(setCookie, value).toMatch(new RegExp(`^${DEVICE_COOKIE}=${device}\\.[0-9a-f]{64}; `))
    }
  })

  it("only marks the cookie Secure over https", () => {
    expect(deviceCookie(`${ID}.${"a".repeat(64)}`, false)).not.toContain("Secure")
    expect(deviceCookie(`${ID}.${"a".repeat(64)}`, true)).toContain("Secure")
  })
})
