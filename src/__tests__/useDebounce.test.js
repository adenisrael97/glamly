import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello"));
    expect(result.current).toBe("hello");
  });

  it("does not update before the delay elapses", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 350), {
      initialProps: { value: "first" },
    });

    rerender({ value: "second" });
    act(() => vi.advanceTimersByTime(200));

    expect(result.current).toBe("first");
  });

  it("updates after the delay elapses", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 350), {
      initialProps: { value: "first" },
    });

    rerender({ value: "second" });
    act(() => vi.advanceTimersByTime(350));

    expect(result.current).toBe("second");
  });

  it("resets the timer on each value change (debounce semantics)", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 350), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    act(() => vi.advanceTimersByTime(200));

    rerender({ value: "c" });
    act(() => vi.advanceTimersByTime(200));

    // Only 400ms total but the last change was 200ms ago — should not have fired
    expect(result.current).toBe("a");

    act(() => vi.advanceTimersByTime(150));
    expect(result.current).toBe("c");
  });

  it("respects a custom delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 1000), {
      initialProps: { value: "x" },
    });

    rerender({ value: "y" });
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe("x");

    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe("y");
  });
});
