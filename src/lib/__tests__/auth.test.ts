import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock jose
const mockSign = vi.fn();
vi.mock("jose", () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: mockSign,
  })),
  jwtVerify: vi.fn(),
}));

// Mock next/headers
const mockCookieSet = vi.fn();
const mockCookieGet = vi.fn();
const mockCookieDelete = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockImplementation(() =>
    Promise.resolve({
      set: mockCookieSet,
      get: mockCookieGet,
      delete: mockCookieDelete,
    })
  ),
}));

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSign.mockResolvedValue("mock-jwt-token");
  });

  test("creates a JWT with correct payload", async () => {
    const { createSession } = await import("../auth");
    const { SignJWT } = await import("jose");

    await createSession("user-123", "test@example.com");

    expect(SignJWT).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        email: "test@example.com",
        expiresAt: expect.any(Date),
      })
    );
  });

  test("configures JWT with HS256 algorithm and 7 day expiration", async () => {
    const { createSession } = await import("../auth");
    const { SignJWT } = await import("jose");

    await createSession("user-123", "test@example.com");

    const mockInstance = (SignJWT as any).mock.results[0].value;
    expect(mockInstance.setProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
    expect(mockInstance.setExpirationTime).toHaveBeenCalledWith("7d");
    expect(mockInstance.setIssuedAt).toHaveBeenCalled();
  });

  test("sets auth cookie with correct options", async () => {
    const { createSession } = await import("../auth");

    await createSession("user-123", "test@example.com");

    expect(mockCookieSet).toHaveBeenCalledWith(
      "auth-token",
      "mock-jwt-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        expires: expect.any(Date),
      })
    );
  });

  test("sets cookie expiration to 7 days from now", async () => {
    const { createSession } = await import("../auth");

    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();

    const cookieOptions = mockCookieSet.mock.calls[0][2];
    const expiresTime = cookieOptions.expires.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresTime).toBeGreaterThanOrEqual(before + sevenDaysMs);
    expect(expiresTime).toBeLessThanOrEqual(after + sevenDaysMs);
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when no auth cookie exists", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const { getSession } = await import("../auth");
    const result = await getSession();

    expect(result).toBeNull();
    expect(mockCookieGet).toHaveBeenCalledWith("auth-token");
  });

  test("returns null when cookie has no value", async () => {
    mockCookieGet.mockReturnValue({ value: undefined });

    const { getSession } = await import("../auth");
    const result = await getSession();

    expect(result).toBeNull();
  });

  test("returns session payload when JWT verification succeeds", async () => {
    const mockPayload = {
      userId: "user-123",
      email: "test@example.com",
      expiresAt: new Date(),
    };

    mockCookieGet.mockReturnValue({ value: "valid-token" });

    const { jwtVerify } = await import("jose");
    (jwtVerify as any).mockResolvedValue({ payload: mockPayload });

    const { getSession } = await import("../auth");
    const result = await getSession();

    expect(result).toEqual(mockPayload);
    expect(jwtVerify).toHaveBeenCalled();
    expect((jwtVerify as any).mock.calls[0][0]).toBe("valid-token");
  });

  test("returns null when JWT verification fails", async () => {
    mockCookieGet.mockReturnValue({ value: "invalid-token" });

    const { jwtVerify } = await import("jose");
    (jwtVerify as any).mockRejectedValue(new Error("Invalid token"));

    const { getSession } = await import("../auth");
    const result = await getSession();

    expect(result).toBeNull();
  });
});
