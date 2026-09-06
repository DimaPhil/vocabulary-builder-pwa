import {
  authenticate,
  configuredUsers,
  SESSION_SECONDS,
  signSession,
  verifySession,
} from "@/api/_auth";
import {
  configureStorageUser,
  databaseName,
  storageKey,
} from "@/lib/storage/userScope";

describe("authentication", () => {
  beforeEach(() => {
    process.env.VOCAB_AUTH_SECRET = "test-secret-that-is-long-enough";
    process.env.VOCAB_USERS_JSON = JSON.stringify([
      { username: "dima", password: "test-password", displayName: "Dima" },
    ]);
  });

  it("authenticates configured users and rejects bad passwords", async () => {
    expect(configuredUsers()).toHaveLength(1);
    await expect(authenticate("dima", "test-password")).resolves.toEqual({
      username: "dima",
      displayName: "Dima",
    });
    await expect(authenticate("dima", "wrong")).resolves.toBeNull();
  });

  it("signs long-lived sessions and rejects tampering or expiration", async () => {
    const now = Date.UTC(2026, 8, 5);
    const token = await signSession(
      { username: "dima", displayName: "Dima" },
      now,
    );

    await expect(verifySession(token, now + 1_000)).resolves.toEqual({
      username: "dima",
      displayName: "Dima",
    });
    await expect(verifySession(`${token}x`, now + 1_000)).resolves.toBeNull();
    await expect(
      verifySession(token, now + SESSION_SECONDS * 1_000),
    ).resolves.toBeNull();
  });

  it("preserves Dima's existing storage and scopes later accounts", () => {
    configureStorageUser("dima");
    expect(databaseName()).toBe("vocabulary-builder");
    expect(storageKey("filters")).toBe("filters");

    configureStorageUser("anna");
    expect(databaseName()).toBe("vocabulary-builder-anna");
    expect(storageKey("filters")).toBe("anna:filters");

    configureStorageUser("dima");
  });
});
