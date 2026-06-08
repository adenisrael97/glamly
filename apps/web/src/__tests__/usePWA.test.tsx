import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── Service Worker stub ───────────────────────────────────────────────────────
// jsdom doesn't expose serviceWorker. We stub it once in beforeAll and never
// remove it mid-test so cleanup functions can always call removeEventListener.

const swEventListeners: Record<string, ((e: unknown) => void)[]> = {};

const mockSWRegistration = {
  waiting: null as null | { postMessage: ReturnType<typeof vi.fn> },
  installing: null as null | { state: string; addEventListener: ReturnType<typeof vi.fn> },
  addEventListener: vi.fn((evt: string, cb: (e: unknown) => void) => {
    swEventListeners[evt] = swEventListeners[evt] ?? [];
    swEventListeners[evt]!.push(cb);
  }),
};

// Capture the listeners the hook attaches to navigator.serviceWorker so tests can
// fire them (controllerchange, message).
const swListeners: Record<string, ((e: unknown) => void)[]> = {};
const captureAddEventListener = (evt: string, cb: (e: unknown) => void) => {
  swListeners[evt] = swListeners[evt] ?? [];
  swListeners[evt]!.push(cb);
};
function fireSWEvent(evt: string, payload?: unknown) {
  (swListeners[evt] ?? []).forEach((cb) => cb(payload));
}

const reloadMock = vi.fn();

const mockServiceWorker = {
  ready: Promise.resolve(mockSWRegistration),
  controller: null as unknown,
  addEventListener: vi.fn(captureAddEventListener),
  removeEventListener: vi.fn(),
};

// Stub globals once for all tests in this file.
vi.stubGlobal("navigator", {
  onLine: true,
  serviceWorker: mockServiceWorker,
  standalone: false,
});

vi.stubGlobal("matchMedia", vi.fn(() => ({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})));

// jsdom's window.location.reload is a non-configurable no-op that warns; replace
// the whole location object once so the hook's reload is observable.
Object.defineProperty(window, "location", {
  configurable: true,
  value: {
    reload: reloadMock,
    href: "http://localhost/",
    origin: "http://localhost",
    pathname: "/",
    search: "",
    assign: vi.fn(),
    replace: vi.fn(),
  },
});

import { usePWA } from "@/hooks/usePWA";

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(swListeners)) delete swListeners[key];
  mockSWRegistration.waiting = null;
  mockSWRegistration.installing = null;
  mockSWRegistration.addEventListener = vi.fn();
  mockServiceWorker.addEventListener = vi.fn(captureAddEventListener);
  mockServiceWorker.removeEventListener = vi.fn();
  mockServiceWorker.controller = null;
  // Reset the stored ready promise to pick up fresh registration state.
  mockServiceWorker.ready = Promise.resolve(mockSWRegistration);
  reloadMock.mockClear();
});

describe("usePWA", () => {
  it("initialises with isOnline=true when navigator.onLine is true", () => {
    const { result } = renderHook(() => usePWA());
    expect(result.current.isOnline).toBe(true);
  });

  it("initialises with installable=false (no beforeinstallprompt fired yet)", () => {
    const { result } = renderHook(() => usePWA());
    expect(result.current.installable).toBe(false);
  });

  it("transitions isOnline to false when the offline event fires", () => {
    const { result } = renderHook(() => usePWA());
    expect(result.current.isOnline).toBe(true);

    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(result.current.isOnline).toBe(false);
  });

  it("transitions isOnline to true after offline → online", () => {
    const { result } = renderHook(() => usePWA());

    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(result.current.isOnline).toBe(false);

    act(() => { window.dispatchEvent(new Event("online")); });
    expect(result.current.isOnline).toBe(true);
  });

  it("sets installable=true when beforeinstallprompt fires", () => {
    const { result } = renderHook(() => usePWA());

    const fakePromptEvent = Object.assign(new Event("beforeinstallprompt"), {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    act(() => { window.dispatchEvent(fakePromptEvent); });

    expect(result.current.installable).toBe(true);
  });

  it("clears installable when appinstalled fires", () => {
    const { result } = renderHook(() => usePWA());

    const fakePromptEvent = Object.assign(new Event("beforeinstallprompt"), {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    act(() => { window.dispatchEvent(fakePromptEvent); });
    expect(result.current.installable).toBe(true);

    act(() => { window.dispatchEvent(new Event("appinstalled")); });
    expect(result.current.installable).toBe(false);
  });

  it("promptInstall returns false when no deferred prompt exists", async () => {
    const { result } = renderHook(() => usePWA());
    const accepted = await result.current.promptInstall();
    expect(accepted).toBe(false);
  });

  it("promptInstall returns true when user accepts", async () => {
    const { result } = renderHook(() => usePWA());

    const fakePromptEvent = Object.assign(new Event("beforeinstallprompt"), {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    act(() => { window.dispatchEvent(fakePromptEvent); });

    const accepted = await act(async () => result.current.promptInstall());
    expect(accepted).toBe(true);
  });

  it("syncedOfflineRequest starts as false", () => {
    const { result } = renderHook(() => usePWA());
    expect(result.current.syncedOfflineRequest).toBe(false);
  });

  it("sets syncedOfflineRequest=true on a SYNC_COMPLETE message from the SW", () => {
    const { result } = renderHook(() => usePWA());
    act(() => { fireSWEvent("message", { data: { type: "SYNC_COMPLETE" } }); });
    expect(result.current.syncedOfflineRequest).toBe(true);
  });

  // ── Silent auto-update (controllerchange → guarded reload) ──────────────────

  it("reloads once when a new SW takes control of an already-controlled page", () => {
    mockServiceWorker.controller = {}; // page was controlled by an older worker
    renderHook(() => usePWA());
    act(() => { fireSWEvent("controllerchange"); });
    expect(reloadMock).toHaveBeenCalledTimes(1);
    // A second controllerchange must not reload again (loop guard).
    act(() => { fireSWEvent("controllerchange"); });
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("does NOT reload on the first-ever SW taking control (no prior controller)", () => {
    mockServiceWorker.controller = null; // uncontrolled page → first install
    renderHook(() => usePWA());
    act(() => { fireSWEvent("controllerchange"); });
    expect(reloadMock).not.toHaveBeenCalled();
  });
});
