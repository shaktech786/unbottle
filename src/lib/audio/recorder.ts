export type RecordingFormat = "webm" | "wav";

/**
 * Browser-based audio recorder wrapping MediaRecorder.
 *
 * Usage:
 *   const recorder = new AudioRecorder();
 *   await recorder.start();           // requests mic permission
 *   const blob = await recorder.stop();
 *   const analyser = recorder.getAnalyser();
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private format: RecordingFormat;

  constructor(format: RecordingFormat = "webm") {
    this.format = format;
  }

  /** True when actively recording. */
  get isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  /**
   * Request microphone permission and begin recording.
   * Throws if the user denies permission or if MediaRecorder is unsupported.
   */
  async start(): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("AudioRecorder is only available in the browser");
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("getUserMedia is not supported in this browser");
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Wire up an AnalyserNode for real-time waveform data.
    this.audioContext = new AudioContext();
    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.sourceNode.connect(this.analyserNode);

    const mimeType = this.getMimeType();
    this.chunks = [];

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100); // collect data every 100ms
  }

  /**
   * Stop recording and return the captured audio as a Blob.
   */
  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        reject(new Error("Recorder is not active"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.getMimeType();
        const blob = new Blob(this.chunks, { type: mimeType });
        this.cleanup();
        resolve(blob);
      };

      this.mediaRecorder.onerror = (event) => {
        this.cleanup();
        reject(
          new Error(
            `Recording error: ${(event as ErrorEvent).message || "unknown"}`,
          ),
        );
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Returns the AnalyserNode for waveform / FFT visualization.
   * Only available while recording.
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * Convert a Blob to an ArrayBuffer.
   */
  static async blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return blob.arrayBuffer();
  }

  /**
   * Convert an ArrayBuffer to an AudioBuffer for analysis.
   */
  static async decodeAudio(buffer: ArrayBuffer): Promise<AudioBuffer> {
    const ctx = new AudioContext();
    try {
      return await ctx.decodeAudioData(buffer);
    } finally {
      await ctx.close();
    }
  }

  // ── private ───────────────────────────────────────────────

  private getMimeType(): string {
    if (this.format === "webm") {
      // Prefer opus codec when available
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        return "audio/webm;codecs=opus";
      }
      return "audio/webm";
    }
    // WAV is not natively supported by MediaRecorder in most browsers.
    // Fall back to webm if wav is requested but unsupported.
    if (MediaRecorder.isTypeSupported("audio/wav")) {
      return "audio/wav";
    }
    return "audio/webm";
  }

  private cleanup(): void {
    // Stop all mic tracks
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    // Disconnect analyser graph
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.analyserNode = null;

    // Close the scratch AudioContext
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }

    this.mediaRecorder = null;
  }
}
