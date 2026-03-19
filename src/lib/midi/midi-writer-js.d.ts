declare module "midi-writer-js" {
  export class Track {
    addEvent(event: NoteEvent | ProgramChangeEvent): this;
    addTrackName(name: string): this;
    setTempo(bpm: number): this;
    setTimeSignature(numerator: number, denominator: number): this;
  }

  export class NoteEvent {
    constructor(options: {
      pitch: (string | number)[];
      duration: string;
      velocity?: number;
      startTick?: number;
      wait?: string;
      channel?: number;
    });
  }

  export class ProgramChangeEvent {
    constructor(options: { instrument: number });
  }

  export class Writer {
    constructor(tracks: Track | Track[]);
    buildFile(): Uint8Array;
    dataUri(): string;
  }
}
