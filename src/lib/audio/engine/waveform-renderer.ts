/**
 * Waveform rendering utilities (MAIN-157).
 *
 * Two use-cases:
 *  1. Static render — draw an AudioBuffer's channel data onto a canvas.
 *  2. Streaming render — push incremental Float32Array chunks in real-time
 *     (used during recording) and draw what's been captured so far.
 */

// ---------------------------------------------------------------------------
// Static render
// ---------------------------------------------------------------------------

export interface WaveformRenderOptions {
  /** Canvas 2D context to draw into (caller handles sizing). */
  ctx: CanvasRenderingContext2D;
  /** Width in logical pixels (ctx already scaled for DPR). */
  width: number;
  /** Height in logical pixels. */
  height: number;
  /** Waveform colour. Default "#6366f1". */
  color?: string;
  /** Background fill. Pass "transparent" or undefined to skip. */
  background?: string;
  /** Index of the channel to render (default 0). */
  channel?: number;
  /**
   * Optional trim window: fraction [0,1] of the full buffer.
   * startOffset defaults to 0, endOffset to 1.
   */
  startOffset?: number;
  endOffset?: number;
}

/**
 * Draw a static waveform from an AudioBuffer into a canvas 2D context.
 */
export function renderWaveform(
  buffer: AudioBuffer,
  opts: WaveformRenderOptions,
): void {
  const {
    ctx,
    width,
    height,
    color = "#6366f1",
    background,
    channel = 0,
    startOffset = 0,
    endOffset = 1,
  } = opts;

  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }

  const data = buffer.getChannelData(channel);
  const totalSamples = data.length;

  const startSample = Math.floor(startOffset * totalSamples);
  const endSample = Math.floor(endOffset * totalSamples);
  const windowSamples = Math.max(1, endSample - startSample);

  const samplesPerPixel = windowSamples / width;
  const mid = height / 2;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;

  for (let x = 0; x < width; x++) {
    const sStart = Math.floor(startSample + x * samplesPerPixel);
    const sEnd = Math.min(totalSamples, Math.floor(sStart + samplesPerPixel));
    let min = 0;
    let max = 0;
    for (let i = sStart; i < sEnd; i++) {
      const v = data[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const y1 = mid - max * mid;
    const y2 = mid - min * mid;
    ctx.moveTo(x + 0.5, y1);
    ctx.lineTo(x + 0.5, y2);
  }
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Streaming waveform accumulator
// ---------------------------------------------------------------------------

/**
 * Accumulates PCM chunks from a live recording and renders an approximate
 * waveform based on peak data.
 */
export class StreamingWaveform {
  /** One peak value per x-pixel column accumulated so far. */
  private peaks: { min: number; max: number }[] = [];
  /** Excess samples that haven't yet been added to a peak slot. */
  private pending: Float32Array = new Float32Array(0);
  private samplesPerPixel: number;

  constructor(
    /** Target render width in pixels — determines resolution of peaks[]. */
    private readonly pixelWidth: number,
    /** Approximate samples per pixel at the target BPM/zoom. */
    samplesPerPixel = 512,
  ) {
    this.samplesPerPixel = samplesPerPixel;
  }

  /**
   * Push a new chunk of raw PCM samples (from AnalyserNode.getFloatTimeDomainData).
   */
  push(chunk: Float32Array): void {
    // Concatenate pending with new chunk
    const merged = new Float32Array(this.pending.length + chunk.length);
    merged.set(this.pending, 0);
    merged.set(chunk, this.pending.length);

    let offset = 0;
    while (offset + this.samplesPerPixel <= merged.length) {
      const slice = merged.subarray(offset, offset + this.samplesPerPixel);
      let min = 0;
      let max = 0;
      for (let i = 0; i < slice.length; i++) {
        if (slice[i] < min) min = slice[i];
        if (slice[i] > max) max = slice[i];
      }
      this.peaks.push({ min, max });
      offset += this.samplesPerPixel;
    }

    this.pending = merged.slice(offset);
  }

  /**
   * Draw the accumulated peaks onto a canvas 2D context.
   */
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    color = "#6366f1",
    background?: string,
  ): void {
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }

    const mid = height / 2;
    const n = Math.min(this.peaks.length, width);
    const scale = n < width ? width / Math.max(1, n) : 1;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    for (let i = 0; i < n; i++) {
      const x = Math.floor(i * scale) + 0.5;
      const { min, max } = this.peaks[i];
      const y1 = mid - max * mid;
      const y2 = mid - min * mid;
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    }
    ctx.stroke();
  }

  get columnsFilled(): number {
    return this.peaks.length;
  }

  reset(): void {
    this.peaks = [];
    this.pending = new Float32Array(0);
  }
}
