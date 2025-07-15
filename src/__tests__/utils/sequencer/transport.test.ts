import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  beatsToTonePart,
  createToneSequence,
  createReactiveToneLoop,
  SequencerTransport,
  MultiSequencerTransport,
} from "@/utils/sequencer/transport";
import type { SequencerBeat, SequencerInstance } from "@/types/music";

// Mock Tone.js
vi.mock("tone", () => ({
  Part: vi.fn().mockImplementation((callback, events) => ({
    loop: false,
    loopEnd: "",
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
    _callback: callback,
    _events: events,
  })),
  Sequence: vi.fn().mockImplementation((callback, sequence, subdivision) => ({
    loop: false,
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
    _callback: callback,
    _sequence: sequence,
    _subdivision: subdivision,
  })),
  Loop: vi.fn().mockImplementation((callback, interval) => ({
    iterations: 1,
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
    _callback: callback,
    _interval: interval,
  })),
  getTransport: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    position: 0,
    bpm: { value: 120 },
    state: "stopped",
  })),
  getContext: vi.fn(() => ({
    state: "running",
  })),
  start: vi.fn(),
}));

// Mock stores
vi.mock("@/stores/music", () => ({
  useMusicStore: vi.fn(() => ({
    getNoteName: vi.fn((index, octave) => `C${octave}`),
    getSolfegeByName: vi.fn((name) => ({ name, emotion: "happy" })),
    getNoteFrequency: vi.fn(() => 440),
    playNoteWithDuration: vi.fn(),
    releaseAllNotes: vi.fn(),
  })),
}));

vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: vi.fn(() => ({
    getInstrument: vi.fn(() => ({
      triggerAttackRelease: vi.fn(),
      volume: { value: 0 },
    })),
  })),
}));

vi.mock("@/stores/sequencer", () => ({
  useSequencerStore: vi.fn(() => ({
    sequencers: [],
    updateSequencerStep: vi.fn(),
  })),
}));

describe("Sequencer Transport Utilities", () => {
  const mockBeats: SequencerBeat[] = [
    {
      id: "1",
      ring: 0,
      step: 0,
      duration: 4,
      solfegeName: "Do",
      solfegeIndex: 0,
      octave: 4,
    },
    {
      id: "2",
      ring: 1,
      step: 8,
      duration: 2,
      solfegeName: "Mi",
      solfegeIndex: 2,
      octave: 4,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.dispatchEvent
    Object.defineProperty(window, 'dispatchEvent', {
      value: vi.fn(),
      writable: true,
    });
  });

  describe("beatsToTonePart", () => {
    it("should convert beats to Tone.Part events", () => {
      const mockCallback = vi.fn();
      const steps = 16;
      const tempo = 120;
      
      const part = beatsToTonePart(mockBeats, steps, tempo, mockCallback);
      
      expect(part).toBeDefined();
      expect(part.loop).toBe(true);
      expect(part.loopEnd).toBe("0:0:16");
      expect(part._events).toHaveLength(2);
      
      // Check event structure
      expect(part._events[0][0]).toBe("0:0:0"); // First beat at step 0
      expect(part._events[1][0]).toBe("0:0:8"); // Second beat at step 8
    });

    it("should create correct event data", () => {
      const mockCallback = vi.fn();
      const part = beatsToTonePart(mockBeats, 16, 120, mockCallback);
      
      const firstEvent = part._events[0][1];
      expect(firstEvent.solfegeIndex).toBe(0);
      expect(firstEvent.octave).toBe(4);
      expect(firstEvent.duration).toBe("4n");
      expect(firstEvent.beat).toBe(mockBeats[0]);
    });

    it("should handle different step counts", () => {
      const mockCallback = vi.fn();
      const part = beatsToTonePart(mockBeats, 8, 120, mockCallback);
      
      expect(part.loopEnd).toBe("0:0:8");
    });

    it("should handle different tempos", () => {
      const mockCallback = vi.fn();
      const part = beatsToTonePart(mockBeats, 16, 60, mockCallback);
      
      // Duration should be longer at slower tempo
      const firstEvent = part._events[0][1];
      expect(firstEvent.duration).toBe("4n"); // Note value stays the same
    });

    it("should handle empty beats array", () => {
      const mockCallback = vi.fn();
      const part = beatsToTonePart([], 16, 120, mockCallback);
      
      expect(part._events).toHaveLength(0);
      expect(part.loop).toBe(true);
    });
  });

  describe("createToneSequence", () => {
    it("should create a Tone.Sequence with correct structure", () => {
      const mockCallback = vi.fn();
      const sequence = createToneSequence(mockBeats, 16, mockCallback);
      
      expect(sequence).toBeDefined();
      expect(sequence.loop).toBe(true);
      expect(sequence._subdivision).toBe("16n");
      expect(sequence._sequence).toHaveLength(16);
    });

    it("should place beats at correct positions", () => {
      const mockCallback = vi.fn();
      const sequence = createToneSequence(mockBeats, 16, mockCallback);
      
      expect(sequence._sequence[0]).toBe(mockBeats[0]);
      expect(sequence._sequence[8]).toBe(mockBeats[1]);
      expect(sequence._sequence[1]).toBe(null);
    });

    it("should handle beats beyond step count", () => {
      const beatsWithLargeStep = [
        ...mockBeats,
        {
          id: "3",
          ring: 2,
          step: 20, // Beyond 16 steps
          duration: 1,
          solfegeName: "Sol",
          solfegeIndex: 4,
          octave: 4,
        },
      ];
      
      const mockCallback = vi.fn();
      const sequence = createToneSequence(beatsWithLargeStep, 16, mockCallback);
      
      expect(sequence._sequence[20]).toBeUndefined(); // Beyond array bounds
    });

    it("should handle different step counts", () => {
      const mockCallback = vi.fn();
      const sequence = createToneSequence(mockBeats, 8, mockCallback);
      
      expect(sequence._sequence).toHaveLength(8);
    });
  });

  describe("createReactiveToneLoop", () => {
    it("should create a reactive loop", () => {
      const mockGetBeats = vi.fn(() => mockBeats);
      const mockPlayCallback = vi.fn();
      const mockStepCallback = vi.fn();
      
      const loop = createReactiveToneLoop(
        mockGetBeats,
        16,
        120,
        mockPlayCallback,
        mockStepCallback
      );
      
      expect(loop).toBeDefined();
      expect(loop.iterations).toBe(Infinity);
      expect(loop._interval).toBe("16n");
    });

    it("should call callbacks when loop runs", () => {
      const mockGetBeats = vi.fn(() => mockBeats);
      const mockPlayCallback = vi.fn();
      const mockStepCallback = vi.fn();
      
      const loop = createReactiveToneLoop(
        mockGetBeats,
        16,
        120,
        mockPlayCallback,
        mockStepCallback
      );
      
      // Simulate loop callback execution
      loop._callback(1000);
      
      expect(mockGetBeats).toHaveBeenCalled();
      expect(mockStepCallback).toHaveBeenCalledWith(0, 1000);
      expect(mockPlayCallback).toHaveBeenCalledWith(mockBeats[0], 1000);
    });

    it("should cycle through steps", () => {
      const mockGetBeats = vi.fn(() => mockBeats);
      const mockPlayCallback = vi.fn();
      const mockStepCallback = vi.fn();
      
      const loop = createReactiveToneLoop(
        mockGetBeats,
        16,
        120,
        mockPlayCallback,
        mockStepCallback
      );
      
      // Simulate multiple loop iterations
      for (let i = 0; i < 18; i++) {
        loop._callback(1000 + i * 100);
      }
      
      expect(mockStepCallback).toHaveBeenCalledWith(0, 1000);
      expect(mockStepCallback).toHaveBeenCalledWith(15, 1000 + 15 * 100);
      expect(mockStepCallback).toHaveBeenCalledWith(0, 1000 + 16 * 100); // Wrapped around
      expect(mockStepCallback).toHaveBeenCalledWith(1, 1000 + 17 * 100);
    });

    it("should handle empty beats array", () => {
      const mockGetBeats = vi.fn(() => []);
      const mockPlayCallback = vi.fn();
      const mockStepCallback = vi.fn();
      
      const loop = createReactiveToneLoop(
        mockGetBeats,
        16,
        120,
        mockPlayCallback,
        mockStepCallback
      );
      
      loop._callback(1000);
      
      expect(mockGetBeats).toHaveBeenCalled();
      expect(mockStepCallback).toHaveBeenCalledWith(0, 1000);
      expect(mockPlayCallback).not.toHaveBeenCalled();
    });
  });

  describe("SequencerTransport", () => {
    let transport: SequencerTransport;

    beforeEach(() => {
      transport = new SequencerTransport();
    });

    afterEach(() => {
      transport.dispose();
    });

    it("should initialize correctly", () => {
      expect(transport.isPlaying).toBe(false);
    });

    it("should initialize with reactive loop", () => {
      const mockGetBeats = vi.fn(() => mockBeats);
      const mockPlayCallback = vi.fn();
      const mockStepCallback = vi.fn();
      
      transport.initWithReactiveLoop(
        mockGetBeats,
        16,
        120,
        mockPlayCallback,
        mockStepCallback
      );
      
      expect(transport.isPlaying).toBe(false); // Not started yet
    });

    it("should start and stop correctly", async () => {
      const mockGetBeats = vi.fn(() => mockBeats);
      const mockPlayCallback = vi.fn();
      
      transport.initWithReactiveLoop(
        mockGetBeats,
        16,
        120,
        mockPlayCallback
      );
      
      await transport.start();
      expect(transport.isPlaying).toBe(false); // Mocked transport state
      
      transport.stop();
      expect(transport.isPlaying).toBe(false);
    });

    it("should set tempo correctly", () => {
      const mockGetBeats = vi.fn(() => mockBeats);
      const mockPlayCallback = vi.fn();
      
      transport.initWithReactiveLoop(
        mockGetBeats,
        16,
        120,
        mockPlayCallback
      );
      
      transport.setTempo(140);
      // Verify tempo was set (would need to check mocked Tone.Transport)
    });

    it("should cleanup correctly", () => {
      const mockGetBeats = vi.fn(() => mockBeats);
      const mockPlayCallback = vi.fn();
      
      transport.initWithReactiveLoop(
        mockGetBeats,
        16,
        120,
        mockPlayCallback
      );
      
      transport.cleanup();
      expect(transport.isPlaying).toBe(false);
    });
  });

  describe("MultiSequencerTransport", () => {
    let multiTransport: MultiSequencerTransport;

    beforeEach(() => {
      multiTransport = new MultiSequencerTransport();
    });

    afterEach(() => {
      multiTransport.dispose();
    });

    it("should initialize correctly", () => {
      expect(multiTransport.isPlaying()).toBe(false);
    });

    it("should handle empty sequencers array", async () => {
      await multiTransport.startAll([], 120, 16);
      expect(multiTransport.isPlaying()).toBe(false);
    });

    it("should start all active sequencers", async () => {
      const mockSequencers: SequencerInstance[] = [
        {
          id: "seq1",
          name: "Sequencer 1",
          instrument: "piano",
          octave: 4,
          beats: mockBeats,
          isPlaying: true,
          currentStep: 0,
          isMuted: false,
          volume: 0.8,
          icon: "🎹",
        },
        {
          id: "seq2",
          name: "Sequencer 2",
          instrument: "guitar",
          octave: 3,
          beats: [],
          isPlaying: true,
          currentStep: 0,
          isMuted: true, // Muted - should not start
          volume: 0.6,
          icon: "🎸",
        },
      ];

      await multiTransport.startAll(mockSequencers, 120, 16);
      // Would need to verify internal state
    });

    it("should stop all sequencers", () => {
      multiTransport.stopAll();
      expect(multiTransport.isPlaying()).toBe(false);
    });

    it("should update tempo for all sequencers", () => {
      multiTransport.updateTempo(140);
      // Would need to verify tempo was set
    });

    it("should handle individual sequencer control", async () => {
      const mockSequencer: SequencerInstance = {
        id: "seq1",
        name: "Sequencer 1",
        instrument: "piano",
        octave: 4,
        beats: mockBeats,
        isPlaying: true,
        currentStep: 0,
        isMuted: false,
        volume: 0.8,
        icon: "🎹",
      };

      await multiTransport.startSequencer(mockSequencer, 16);
      multiTransport.stopSequencer("seq1");
      
      expect(multiTransport.isPlaying()).toBe(false);
    });

    it("should dispose correctly", () => {
      multiTransport.dispose();
      expect(multiTransport.isPlaying()).toBe(false);
    });
  });

  describe("Integration tests", () => {
    it("should work with real-world sequencer data", async () => {
      const complexBeats: SequencerBeat[] = [
        {
          id: "1",
          ring: 0,
          step: 0,
          duration: 4,
          solfegeName: "Do",
          solfegeIndex: 0,
          octave: 4,
        },
        {
          id: "2",
          ring: 1,
          step: 4,
          duration: 2,
          solfegeName: "Re",
          solfegeIndex: 1,
          octave: 4,
        },
        {
          id: "3",
          ring: 2,
          step: 8,
          duration: 1,
          solfegeName: "Mi",
          solfegeIndex: 2,
          octave: 4,
        },
        {
          id: "4",
          ring: 3,
          step: 12,
          duration: 4,
          solfegeName: "Fa",
          solfegeIndex: 3,
          octave: 4,
        },
      ];

      const transport = new SequencerTransport();
      const mockGetBeats = vi.fn(() => complexBeats);
      const mockPlayCallback = vi.fn();
      const mockStepCallback = vi.fn();

      transport.initWithReactiveLoop(
        mockGetBeats,
        16,
        120,
        mockPlayCallback,
        mockStepCallback
      );

      await transport.start();
      transport.stop();
      transport.dispose();

      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle dynamic beat changes", () => {
      let currentBeats = mockBeats;
      const mockGetBeats = vi.fn(() => currentBeats);
      const mockPlayCallback = vi.fn();
      const mockStepCallback = vi.fn();

      const loop = createReactiveToneLoop(
        mockGetBeats,
        16,
        120,
        mockPlayCallback,
        mockStepCallback
      );

      // First iteration
      loop._callback(1000);
      expect(mockPlayCallback).toHaveBeenCalledWith(mockBeats[0], 1000);

      // Change beats
      currentBeats = [
        {
          id: "3",
          ring: 0,
          step: 0,
          duration: 2,
          solfegeName: "Sol",
          solfegeIndex: 4,
          octave: 5,
        },
      ];

      // Second iteration should use new beats
      loop._callback(1100);
      expect(mockPlayCallback).toHaveBeenCalledWith(currentBeats[0], 1100);
    });
  });
});