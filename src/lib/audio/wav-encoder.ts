/**
 * Pure WAV encoder utilities.
 *
 * Produces 16-bit PCM WAV files from Float32Array sample data.
 * All multi-byte values are written in little-endian order per the
 * RIFF/WAV specification.
 */

/**
 * Write an ASCII string into a DataView at the given offset.
 */
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Encode a 44-byte WAV header for PCM audio.
 *
 * Layout (all multi-byte integers are little-endian):
 *
 *  Offset  Size  Description
 *  ------  ----  -----------
 *   0       4    "RIFF"
 *   4       4    File size - 8 (i.e. dataLength + 36)
 *   8       4    "WAVE"
 *  12       4    "fmt "
 *  16       4    fmt chunk size (16 for PCM)
 *  20       2    Audio format (1 = PCM)
 *  22       2    Number of channels
 *  24       4    Sample rate
 *  28       4    Byte rate (sampleRate * numChannels * bitsPerSample / 8)
 *  32       2    Block align (numChannels * bitsPerSample / 8)
 *  34       2    Bits per sample
 *  36       4    "data"
 *  40       4    Data chunk size (dataLength)
 */
export function encodeWavHeader(
  numChannels: number,
  sampleRate: number,
  bitsPerSample: number,
  dataLength: number,
): ArrayBuffer {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, dataLength + 36, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // sub-chunk size (PCM = 16)
  view.setUint16(20, 1, true); // audio format (PCM = 1)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  return buffer;
}

/**
 * Convert a Float32Array of samples (range [-1, 1]) to a 16-bit PCM WAV Blob.
 *
 * For stereo audio, samples should be interleaved: [L, R, L, R, ...].
 *
 * @param samples     - Float32 sample data
 * @param sampleRate  - Sample rate in Hz (e.g. 44100)
 * @param numChannels - Number of channels (default 1 for mono)
 * @returns WAV Blob with "audio/wav" MIME type
 */
export function float32ToWav(
  samples: Float32Array,
  sampleRate: number,
  numChannels: number = 1,
): Blob {
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataLength = samples.length * bytesPerSample;

  const header = encodeWavHeader(numChannels, sampleRate, bitsPerSample, dataLength);

  // Convert float32 [-1, 1] to int16 [-32768, 32767]
  const pcmBuffer = new ArrayBuffer(dataLength);
  const pcmView = new DataView(pcmBuffer);

  for (let i = 0; i < samples.length; i++) {
    // Clamp to [-1, 1]
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    // Convert: positive maps to [0, 32767], negative maps to [-32768, 0]
    const int16 = clamped < 0
      ? Math.round(clamped * 32768)
      : Math.round(clamped * 32767);
    pcmView.setInt16(i * bytesPerSample, int16, true);
  }

  return new Blob([header, pcmBuffer], { type: "audio/wav" });
}
