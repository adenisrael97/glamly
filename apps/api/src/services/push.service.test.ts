import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../repositories/push.repository", () => ({
  pushRepository: {
    listByUserId: vi.fn(),
    deleteById: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn(),
    deleteByEndpoint: vi.fn(),
  },
}));
vi.mock("../integrations/push", () => ({
  push: { send: vi.fn(), publicKey: vi.fn(() => "VAPID_PUB") },
}));

import { pushService } from "./push.service";
import { pushRepository } from "../repositories/push.repository";
import { push } from "../integrations/push";

const sub = (id: string) => ({ id, endpoint: `https://push/${id}`, p256dh: "p", auth: "a" });

beforeEach(() => vi.clearAllMocks());

describe("pushService.sendToUser", () => {
  it("fans out to every device and prunes only dead endpoints", async () => {
    vi.mocked(pushRepository.listByUserId).mockResolvedValue([
      sub("s1"),
      sub("s2"),
      sub("s3"),
    ] as never);
    vi.mocked(push.send).mockImplementation(async (target) => {
      if (target.endpoint.endsWith("s2")) return { status: "expired" };
      return { status: "sent" };
    });

    await pushService.sendToUser("user-1", { title: "Hi", body: "there" });

    expect(push.send).toHaveBeenCalledTimes(3);
    // Only the expired subscription (s2) is pruned.
    expect(pushRepository.deleteById).toHaveBeenCalledTimes(1);
    expect(pushRepository.deleteById).toHaveBeenCalledWith("s2");
  });

  it("does nothing when the user has no subscriptions", async () => {
    vi.mocked(pushRepository.listByUserId).mockResolvedValue([]);
    await pushService.sendToUser("user-1", { title: "Hi", body: "there" });
    expect(push.send).not.toHaveBeenCalled();
  });
});

describe("pushService.getVapidPublicKey", () => {
  it("exposes the integration's public key", () => {
    expect(pushService.getVapidPublicKey()).toEqual({ publicKey: "VAPID_PUB" });
  });
});
