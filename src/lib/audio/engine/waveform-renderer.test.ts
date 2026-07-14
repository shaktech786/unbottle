/**
 * MAIN-157: waveform-renderer tests.
 *
 * renderWaveform and StreamingWaveform are tested using a mock canvas 2D
 * context so the logic runs in Node without a real browser.
 */

import { describe, it, expect, vi } from "vitest";
import { renderWaveform, StreamingWaveform } from "./waveform-renderer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockCtx() {
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function makeBuffer(samples: number, value = 0.5): AudioBuffer {
  const data = new Float32Array(samples).fill(value);
  return {
    numberOfChannels: 1,
    length: samples,
    sampleRate: 44100,
    duration: samples / 44100,
    getChannelData: (_ch: number) => data,
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}

// ---------------------------------------------------------------------------
// renderWaveform — static
// ---------------------------------------------------------------------------

describe("renderWaveform", () => {
  it("calls stroke() once per render", () => {
    const ctx = makeMockCtx();
    const buf = makeBuffer(44100, 0.5);
    renderWaveform(buf, { ctx, width: 200, height: 80 });
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
  });

  it("fills background when background option is provided", () => {
    const ctx = makeMockCtx();
    const buf = makeBuffer(100);
    renderWaveform(buf, { ctx, width: 100, height: 40, background: "#111" });
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 40);
  });

  it("skips background fill when no background option", () => {
    const ctx = makeMockCtx();
    const buf = makeBuffer(100);
    renderWaveform(buf, { ctx, width: 100, height: 40 });
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it("calls moveTo and lineTo for each pixel column", () => {
    const ctx = makeMockCtx();
    const buf = makeBuffer(4000);
    const width = 100;
    renderWaveform(buf, { ctx, width, height: 60 });
    // At least one moveTo per pixel
    expect(ctx.moveTo).toHaveBeenCalledTimes(width);
    expect(ctx.lineTo).toHaveBeenCalledTimes(width);
  });

  it("respects startOffset and endOffset trim window", () => {
    const ctx1 = makeMockCtx();
    const ctx2 = makeMockCtx();
    const buf = makeBuffer(44100);
    renderWaveform(buf, { ctx: ctx1, width: 100, height: 60, startOffset: 0, endOffset: 1 });
    renderWaveform(buf, { ctx: ctx2, width: 100, height: 60, startOffset: 0.25, endOffset: 0.75 });
    // Both should render, the trim variant reads from a smaller window
    expect(ctx1.stroke).toHaveBeenCalled();
    expect(ctx2.stroke).toHaveBeenCalled();
  });

  it("uses custom color when provided", () => {
    const ctx = makeMockCtx();
    const buf = makeBuffer(100);
    renderWaveform(buf, { ctx, width: 50, height: 40, color: "#ff0000" });
    expect(ctx.strokeStyle).toBe("#ff0000");
  });
});

// ---------------------------------------------------------------------------
// StreamingWaveform — accumulator
// ---------------------------------------------------------------------------

describe("StreamingWaveform", () => {
  it("starts with 0 columns filled", () => {
    const sw = new StreamingWaveform(200, 512);
    expect(sw.columnsFilled).toBe(0);
  });

  it("push() accumulates peak columns", () => {
    const sw = new StreamingWaveform(200, 8);
    const chunk = new Float32Array(80);
    for (let i = 0; i < chunk.length; i++) chunk[i] = i % 2 === 0 ? 0.5 : -0.5;
    sw.push(chunk);
    // 80 samples / 8 samplesPerPixel = 10 columns
    expect(sw.columnsFilled).toBe(10);
  });

  it("push() handles partial chunks (pending buffering)", () => {
    const sw = new StreamingWaveform(200, 16);
    // Push 10 samples — not enough for one column of 16
    sw.push(new Float32Array(10).fill(0.3));
    expect(sw.columnsFilled).toBe(0);
    // Push another 10 — total 20, enough for 1 column
    sw.push(new Float32Array(10).fill(0.3));
    expect(sw.columnsFilled).toBe(1);
  });

  it("render() calls stroke()", () => {
    const sw = new StreamingWaveform(100, 16);
    sw.push(new Float32Array(160).fill(0.5));
    const ctx = makeMockCtx();
    sw.render(ctx, 100, 60);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("render() fills background when provided", () => {
    const sw = new StreamingWaveform(100, 16);
    const ctx = makeMockCtx();
    sw.render(ctx, 100, 60, "#6366f1", "#111");
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 60);
  });

  it("reset() clears accumulated peaks", () => {
    const sw = new StreamingWaveform(200, 8);
    sw.push(new Float32Array(80).fill(0.5));
    expect(sw.columnsFilled).toBeGreaterThan(0);
    sw.reset();
    expect(sw.columnsFilled).toBe(0);
  });
});
