import { Soundboard } from '../audio/soundboard.js';

class SoundboardUI {
  private soundboard: Soundboard;
  private editingPad = -1;
  
  constructor() {
    this.soundboard = new Soundboard();
    this.init();
  }
  
  private init(): void {
    this.soundboard.init();
    this.renderGrid();
    this.bindControls();
    this.bindKeyboard();
    this.updateStatus('Soundboard ready!');
  }
  
  private renderGrid(): void {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (let i = 0; i < 16; i++) {
      const pad = document.createElement('div');
      pad.className = 'pad';
      pad.dataset.index = i.toString();
      
      const padData = this.soundboard.getPad(i);
      
      const name = document.createElement('div');
      name.className = 'pad-name';
      name.textContent = padData ? padData.name.toUpperCase() : 'EMPTY';
      
      const freq = document.createElement('div');
      freq.className = 'pad-freq';
      if (padData) {
        freq.textContent = padData.frequencies.length > 1 
          ? `${padData.frequencies[0]}+${padData.frequencies.length-1}`
          : `${padData.frequencies[0]}Hz`;
      } else {
        freq.textContent = '---';
      }
      
      pad.appendChild(name);
      pad.appendChild(freq);
      
      // Left click to play
      pad.addEventListener('click', (e) => {
        e.preventDefault();
        this.playPad(i);
      });
      
      // Right click to edit
      pad.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.editPad(i);
      });
      
      grid.appendChild(pad);
    }
  }
  
  private bindControls(): void {
    // Volume control
    const volumeSlider = document.getElementById('volume') as HTMLInputElement;
    const volumeDisplay = document.getElementById('volume-display');
    
    if (volumeSlider && volumeDisplay) {
      volumeSlider.addEventListener('input', (e) => {
        const volume = parseInt((e.target as HTMLInputElement).value) / 100;
        this.soundboard.setMasterVolume(volume);
        volumeDisplay.textContent = `${(e.target as HTMLInputElement).value}%`;
      });
    }
    
    // Preset buttons
    const drumBtn = document.getElementById('drum-preset');
    const combatBtn = document.getElementById('combat-preset');
    const editBtn = document.getElementById('edit-toggle');
    
    drumBtn?.addEventListener('click', () => this.loadDrumPreset());
    combatBtn?.addEventListener('click', () => this.loadCombatPreset());
    editBtn?.addEventListener('click', () => this.toggleEditPanel());
    
    // Edit panel
    const saveBtn = document.getElementById('edit-save');
    const clearBtn = document.getElementById('edit-clear');
    
    saveBtn?.addEventListener('click', () => this.saveEdit());
    clearBtn?.addEventListener('click', () => this.clearPad());
  }
  
  private bindKeyboard(): void {
    const keyMap: Record<string, number> = {
      '1': 0, '2': 1, '3': 2, '4': 3,
      '5': 4, '6': 5, '7': 6, '8': 7,
      '9': 8, '0': 9, 'q': 10, 'w': 11,
      'e': 12, 'r': 13, 't': 14, 'y': 15
    };
    
    document.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      
      const key = e.key.toLowerCase();
      if (keyMap.hasOwnProperty(key)) {
        this.playPad(keyMap[key]);
      }
    });
  }
  
  private playPad(index: number): void {
    const success = this.soundboard.playPad(index);
    if (success) {
      const pad = document.querySelector(`[data-index="${index}"]`);
      pad?.classList.add('playing');
      setTimeout(() => pad?.classList.remove('playing'), 150);
      
      const padData = this.soundboard.getPad(index);
      this.updateStatus(`♪ ${padData?.name || 'unknown'}`);
    } else {
      this.updateStatus('Empty pad');
    }
  }
  
  private editPad(index: number): void {
    this.editingPad = index;
    const padData = this.soundboard.getPad(index);
    
    const editPadNum = document.getElementById('edit-pad-num');
    const editName = document.getElementById('edit-name') as HTMLInputElement;
    const editFreq = document.getElementById('edit-freq') as HTMLInputElement;
    const editDur = document.getElementById('edit-dur') as HTMLInputElement;
    const editWave = document.getElementById('edit-wave') as HTMLSelectElement;
    const editPanel = document.getElementById('edit-panel');
    
    if (editPadNum) editPadNum.textContent = index.toString();
    if (editName) editName.value = padData ? padData.name : '';
    if (editFreq) editFreq.value = padData ? padData.frequencies.join(',') : '';
    if (editDur) editDur.value = padData ? padData.duration.toString() : '0.1';
    if (editWave) editWave.value = padData ? padData.waveform : 'sine';
    
    editPanel?.classList.add('show');
    this.updateStatus(`Editing pad ${index}`);
  }
  
  private saveEdit(): void {
    if (this.editingPad < 0) return;
    
    const editName = document.getElementById('edit-name') as HTMLInputElement;
    const editFreq = document.getElementById('edit-freq') as HTMLInputElement;
    const editDur = document.getElementById('edit-dur') as HTMLInputElement;
    const editWave = document.getElementById('edit-wave') as HTMLSelectElement;
    const editPanel = document.getElementById('edit-panel');
    
    const name = editName?.value.trim() || `pad-${this.editingPad}`;
    const freqStr = editFreq?.value.trim() || '';
    const duration = parseFloat(editDur?.value || '0.1') || 0.1;
    const waveform = editWave?.value as 'sine' | 'square' | 'triangle' | 'sawtooth' || 'sine';
    
    if (!freqStr) {
      this.updateStatus('Need frequencies');
      return;
    }
    
    const frequencies = freqStr.split(',').map(f => parseFloat(f.trim())).filter(f => !isNaN(f) && f > 0);
    if (frequencies.length === 0) {
      this.updateStatus('Invalid frequencies');
      return;
    }
    
    const success = this.soundboard.setPad(this.editingPad, name, frequencies, duration, waveform, 0.7);
    if (success) {
      this.renderGrid();
      this.updateStatus(`Saved pad ${this.editingPad}`);
      editPanel?.classList.remove('show');
      this.editingPad = -1;
    } else {
      this.updateStatus('Save failed');
    }
  }
  
  private clearPad(): void {
    if (this.editingPad < 0) return;
    
    this.soundboard.clearPad(this.editingPad);
    this.renderGrid();
    this.updateStatus(`Cleared pad ${this.editingPad}`);
    
    const editPanel = document.getElementById('edit-panel');
    editPanel?.classList.remove('show');
    this.editingPad = -1;
  }
  
  private toggleEditPanel(): void {
    const panel = document.getElementById('edit-panel');
    if (panel?.classList.contains('show')) {
      panel.classList.remove('show');
      this.editingPad = -1;
      this.updateStatus('Edit mode off');
    } else {
      this.updateStatus('Right-click pad to edit');
    }
  }
  
  private loadDrumPreset(): void {
    const kick = this.soundboard.createKick();
    const snare = this.soundboard.createSnare();
    const hihat = this.soundboard.createHihat();
    
    this.soundboard.setPad(0, kick.name, kick.frequencies, kick.duration, kick.waveform, kick.volume);
    this.soundboard.setPad(1, snare.name, snare.frequencies, snare.duration, snare.waveform, snare.volume);
    this.soundboard.setPad(2, hihat.name, hihat.frequencies, hihat.duration, hihat.waveform, hihat.volume);
    this.soundboard.setPad(3, 'crash', [4000, 8000], 0.2, 'square', 0.5);
    
    this.soundboard.setPad(4, 'kick2', [50, 70], 0.12, 'triangle', 0.7);
    this.soundboard.setPad(5, 'snare2', [250, 500], 0.06, 'sawtooth', 0.5);
    this.soundboard.setPad(6, 'hat2', [10000], 0.02, 'square', 0.2);
    this.soundboard.setPad(7, 'ride', [3000, 6000], 0.15, 'triangle', 0.4);
    
    this.renderGrid();
    this.updateStatus('Loaded drum kit');
  }
  
  private loadCombatPreset(): void {
    // Reset to default combat sounds
    this.soundboard = new Soundboard();
    this.soundboard.init();
    
    const volumeSlider = document.getElementById('volume') as HTMLInputElement;
    const volume = volumeSlider ? parseInt(volumeSlider.value) / 100 : 0.7;
    this.soundboard.setMasterVolume(volume);
    
    this.renderGrid();
    this.updateStatus('Loaded combat sounds');
  }
  
  private updateStatus(message: string): void {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
      setTimeout(() => {
        statusEl.textContent = 'Ready • Click pads to play • Right-click to edit';
      }, 2000);
    }
  }
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new SoundboardUI();
});