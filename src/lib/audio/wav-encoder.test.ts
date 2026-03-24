import { describe, it, expect } from "vitest";
import { encodeWavHeader, float32ToWav } from "./wav-encoder";

describe("encodeWavHeader", () => {
  const numChannels = 1;
  const sampleRate = 44100;
  const bitsPerSample = 16;
  const dataLength = 88200; // 1 second of 16-bit mono at 44100 Hz

  it("produces a 44-byte header", () => {
    const header = encodeWavHeader(numChannels, sampleRate, bitsPerSample, dataLength);
    expect(header.byteLength).toBe(44);
  });

  it('starts with "RIFF" magic bytes', () => {
    const header = encodeWavHeader(numChannels, sampleRate, bitsPerSample, dataLength);
    const view = new DataView(header);
    const magic = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3),
    );
    expect(magic).toBe("RIFF");
  });

  it('contains "WAVE" format identifier at bytes 8-11', () => {
    const header = encodeWavHeader(numChannels, sampleRate, bitsPerSample, dataLength);
    const view = new DataView(header);
    const format = String.fromCharCode(
      view.getUint8(8),
      view.getUint8(9),
      view.getUint8(10),
      view.getUint8(11),
    );
    expect(format).toBe("WAVE");
  });

  it('contains "fmt " sub-chunk at bytes 12-15', () => {
    const header = encodeWavHeader(numChannels, sampleRate, bitsPerSample, dataLength);
    const view = new DataView(header);
    const fmt = String.fromCharCode(
      view.getUint8(12),
      view.getUint8(13),
      view.getUint8(14),
      view.getUint8(15),
    );
    expect(fmt).toBe("fmt ");
  });

  it('contains "data" sub-chunk at bytes 36-39', () => {
    const header = encodeWavHeader(numChannels, sampleRate, bitsPerSample, dataLength);
    const view = new DataView(header);
    const data = String.fromCharCode(
      view.getUint8(36),
      view.getUint8(37),
      view.getUint8(38),
      view.getUint8(39),
    );
    expect(data).toBe("data");
  });

  it("has correct file size at bytes 4-7 (dataLength + 36)", () => {
    const header = encodeWavHeader(numChannels, sampleRate, bitsPerSample, dataLength);
    const view = new DataView(header);
    // RIFF chunk size = file size - 8 = dataLength + 36
    expect(view.getUint32(4, true)).toBe(dataLength + 36);
  });

  it("has correct sample rate at bytes 24-27", () => {
    const header = encodeWavHeader(numChannels, sampleRate, bitsPerSample, dataLength);
    const view = new DataView(header);
    expect(view.getUint32(24, true)).toBe(44100);
  });

  it("has correct number of channels at bytes 22-23", () => {
    const header = encodeWavHeader(2, sampleRate, bitsPerSample, dataLength);
    const view = new DataView(header);
    expect(view.getUint16(22, true)).toBe(2);
  });

  it("has correct bits per sample at bytes 34-35", () => {
    const header = encodeWavHeader(numChannels, sampleRate, bitsPerSample, dataLength);
    const view = new DataView(header);
    expect(view.getUint16(34, true)).toBe(16);
  });

  it("has audio format = 1 (PCM) at bytes 20-21", () => {
    const header = encodeWavHeader(numChannels, sampleRate, bitsPerSample, dataLength);
    const view = new DataView(header);
    expect(view.getUint16(20, true)).toBe(1);
  });

  it("has correct byte rate at bytes 28-31", () => {
    const header = encodeWavHeader(numChannels, sampleRate, bitsPerSample, dataLength);
    const view = new DataView(header);
    // byteRate = sampleRate * numChannels * bitsPerSample / 8
    expect(view.getUint32(28, true)).toBe(44100 * 1 * 16 / 8);
  });

  it("has correct block align at bytes 32-33", () => {
    const header = encodeWavHeader(2, sampleRate, bitsPerSample, dataLength);
    const view = new DataView(header);
    // blockAlign = numChannels * bitsPerSample / 8
    expect(view.getUint16(32, true)).toBe(2 * 16 / 8);
  });

  it("has correct data chunk size at bytes 40-43", () => {
    const header = encodeWavHeader(numChannels, sampleRate, bitsPerSample, dataLength);
    const view = new DataView(header);
    expect(view.getUint32(40, true)).toBe(dataLength);
  });
});

describe("float32ToWav", () => {
  it("returns a Blob with audio/wav MIME type", () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const blob = float32ToWav(samples, 44100);
    expect(blob.type).toBe("audio/wav");
  });

  it("produces correct total size for mono audio", () => {
    const samples = new Float32Array(100);
    const blob = float32ToWav(samples, 44100);
    // 44 bytes header + 100 samples * 2 bytes (16-bit) = 244
    expect(blob.size).toBe(244);
  });

  it("handles stereo (2 channels)", () => {
    // Stereo: interleaved L,R,L,R... so 200 float32 values = 100 frames * 2 channels
    const samples = new Float32Array(200);
    const blob = float32ToWav(samples, 44100, 2);
    // 44 bytes header + 200 samples * 2 bytes = 444
    expect(blob.size).toBe(444);
  });

  it("produces valid WAV for empty samples (just header)", () => {
    const samples = new Float32Array(0);
    const blob = float32ToWav(samples, 44100);
    // Just the 44-byte header
    expect(blob.size).toBe(44);
  });

  it("clamps float values to [-1, 1] range", async () => {
    const samples = new Float32Array([2.0, -2.0]);
    const blob = float32ToWav(samples, 44100);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    // First sample at offset 44: clamped to 1.0 -> 32767
    expect(view.getInt16(44, true)).toBe(32767);
    // Second sample at offset 46: clamped to -1.0 -> -32768
    expect(view.getInt16(46, true)).toBe(-32768);
  });

  it("correctly converts float32 [-1,1] to int16 [-32768,32767]", async () => {
    const samples = new Float32Array([0, 1, -1, 0.5, -0.5]);
    const blob = float32ToWav(samples, 44100);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);

    // 0.0 -> 0
    expect(view.getInt16(44, true)).toBe(0);
    // 1.0 -> 32767
    expect(view.getInt16(46, true)).toBe(32767);
    // -1.0 -> -32768
    expect(view.getInt16(48, true)).toBe(-32768);
    // 0.5 -> Math.round(0.5 * 32767) = 16384
    expect(view.getInt16(50, true)).toBe(16384);
    // -0.5 -> Math.round(-0.5 * 32768) = -16384
    expect(view.getInt16(52, true)).toBe(-16384);
  });
});
