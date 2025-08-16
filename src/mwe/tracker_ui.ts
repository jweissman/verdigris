/**
 * Tracker UI - Minimal interface for the tracker
 * No inline JS, just clean module code
 */

import { Tracker } from "../audio/tracker";
import { SynthEngine } from "../audio/synth_engine";

class TrackerUI {
  private tracker: Tracker;
  private engine: SynthEngine;
  private isPlaying: boolean = false;
  private currentStep: number = 0;
  private displayUpdateTimer: number | null = null;
  private currentPattern: any = null;

  constructor() {
    this.engine = new SynthEngine();
    this.tracker = new Tracker(this.engine);
    this.init();
  }

  private init(): void {
    const playBtn = document.getElementById("play");
    const stopBtn = document.getElementById("stop");
    const clearBtn = document.getElementById("clear");
    const loadBtn = document.getElementById("load-pattern");
    const loadSongBtn = document.getElementById("load-song");
    const songSelect = document.getElementById(
      "song-select",
    ) as HTMLSelectElement;
    const bpmInput = document.getElementById("bpm") as HTMLInputElement;
    const patternInput = document.getElementById(
      "pattern-dsl",
    ) as HTMLInputElement;

    if (playBtn) playBtn.addEventListener("click", () => this.play());
    if (stopBtn) stopBtn.addEventListener("click", () => this.stop());
    if (clearBtn) clearBtn.addEventListener("click", () => this.clear());
    if (loadBtn)
      loadBtn.addEventListener("click", () => this.loadPatternFromDSL());
    if (loadSongBtn)
      loadSongBtn.addEventListener("click", () => this.loadSongFromLibrary());

    if (bpmInput) {
      bpmInput.addEventListener("input", (e) => {
        const bpm = parseInt((e.target as HTMLInputElement).value);
        this.engine.setBPM(bpm);
        const display = document.getElementById("bpm-display");
        if (display) display.textContent = bpm.toString();
      });
    }

    this.loadPatternFromDSL();
  }

  private play(): void {
    if (!this.currentPattern) {
      this.loadPatternFromDSL();
    }

    this.isPlaying = true;
    this.currentStep = 0;

    if (this.currentPattern) {
      this.tracker.playPattern(this.currentPattern.id);
    }

    this.startDisplayUpdate();
  }

  private stop(): void {
    this.isPlaying = false;
    this.tracker.stop();
    this.stopDisplayUpdate();
    this.updateDisplay();
  }

  private clear(): void {
    const input = document.getElementById("pattern-dsl") as HTMLInputElement;
    if (input) input.value = "";
    this.currentPattern = null;
    this.renderPattern(null);
  }

  private async loadSongFromLibrary(): Promise<void> {
    const songSelect = document.getElementById(
      "song-select",
    ) as HTMLSelectElement;
    const selectedSong = songSelect.value;

    if (!selectedSong) {
      this.updateStatus("No song selected");
      return;
    }

    try {
      const response = await fetch(`../assets/songs/${selectedSong}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load song: ${response.statusText}`);
      }

      const songData = await response.json();
      this.loadSongData(songData);
      this.updateStatus(`Loaded: ${songData.name}`);
    } catch (error) {
      console.error("Error loading song:", error);
      this.updateStatus("Failed to load song");
    }
  }

  private loadSongData(songData: any): void {
    this.currentPattern = {
      id: songData.id,
      name: songData.name,
      length: songData.length,
      tracks: songData.tracks,
    };

    if (songData.meta?.bpm) {
      const bpmInput = document.getElementById("bpm") as HTMLInputElement;
      if (bpmInput) {
        bpmInput.value = songData.meta.bpm.toString();
        this.engine.setBPM(songData.meta.bpm);
      }
    }

    this.updatePatternDisplay();
    this.renderPattern(this.currentPattern);
  }

  private updatePatternDisplay(): void {
    this.updateStatus(
      `Pattern: ${this.currentPattern?.name || "None"} (${this.currentPattern?.length || 0} steps)`,
    );
  }

  private updateStatus(message: string): void {
    const statusEl = document.getElementById("status");
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  private loadPatternFromDSL(): void {
    const input = document.getElementById("pattern-dsl") as HTMLInputElement;
    if (!input) return;

    const dsl = input.value || "bass: C2 ... E2 ... / lead: C4 E4 G4 C5";

    try {
      this.currentPattern = Tracker.parsePatternDSL(dsl);
      this.renderPattern(this.currentPattern);
    } catch (error) {
      console.error("Failed to parse pattern:", error);
    }
  }

  private renderPattern(pattern: any): void {
    const display = document.getElementById("tracker-display");
    if (!display) return;

    display.innerHTML = "";

    if (!pattern) {
      display.innerHTML = "<div>No pattern loaded</div>";
      return;
    }

    const header = document.createElement("div");
    header.className = "pattern-row";

    const stepHeader = document.createElement("div");
    stepHeader.className = "step-num";
    stepHeader.textContent = "#";
    header.appendChild(stepHeader);

    pattern.tracks.forEach((track: any, i: number) => {
      const trackHeader = document.createElement("div");
      trackHeader.className = "track track-header";
      trackHeader.textContent = `CH${track.channel}`;
      header.appendChild(trackHeader);
    });

    display.appendChild(header);

    for (let step = 0; step < pattern.length; step++) {
      const row = document.createElement("div");
      row.className = "pattern-row";
      row.id = `step-${step}`;

      const stepNum = document.createElement("div");
      stepNum.className = "step-num";
      stepNum.textContent = step.toString().padStart(2, "0");
      row.appendChild(stepNum);

      pattern.tracks.forEach((track: any, trackIndex: number) => {
        const cell = document.createElement("div");
        cell.className = "track note-cell";
        cell.id = `cell-${trackIndex}-${step}`;

        const note = track.notes[step];
        if (note) {
          cell.textContent = note.note || "---";
        } else {
          cell.textContent = "---";
        }

        row.appendChild(cell);
      });

      display.appendChild(row);
    }
  }

  private startDisplayUpdate(): void {
    if (this.displayUpdateTimer) return;

    this.displayUpdateTimer = setInterval(() => {
      this.updateDisplay();
    }, 50) as any; // Update at 20 FPS
  }

  private stopDisplayUpdate(): void {
    if (this.displayUpdateTimer) {
      clearInterval(this.displayUpdateTimer);
      this.displayUpdateTimer = null;
    }
  }

  private updateDisplay(): void {
    if (!this.isPlaying || !this.currentPattern) return;

    const pos = this.engine.getCurrentPosition();
    this.currentStep = pos.step % this.currentPattern.length;

    const posDisplay = document.getElementById("position");
    if (posDisplay) {
      const bar = Math.floor(pos.bar);
      const beat = pos.step % 16;
      posDisplay.textContent = `${bar.toString().padStart(2, "0")}:${beat.toString().padStart(2, "0")}`;
    }

    const rows = document.querySelectorAll(".pattern-row");
    rows.forEach((row, i) => {
      if (i === 0) return; // Skip header

      const stepIndex = i - 1;
      const cells = row.querySelectorAll(".note-cell");

      cells.forEach((cell) => {
        cell.classList.remove("playing");
        if (stepIndex === this.currentStep) {
          cell.classList.add("playing");
        }
      });
    });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    (window as any).trackerUI = new TrackerUI();
  });
}
