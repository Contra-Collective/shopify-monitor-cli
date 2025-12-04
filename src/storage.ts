import * as fs from 'fs';
import * as path from 'path';
import { MonitorState } from './types';

const DEFAULT_STATE_FILE = 'shopify-monitor-state.json';

export class StateManager {
  private stateFile: string;

  constructor(stateFile?: string) {
    this.stateFile = stateFile || path.join(process.cwd(), DEFAULT_STATE_FILE);
  }

  loadState(): MonitorState {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading state file:', error);
    }

    return {
      lastChecked: new Date().toISOString(),
      seenEntries: []
    };
  }

  saveState(state: MonitorState): void {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving state file:', error);
      throw error;
    }
  }

  addSeenEntry(entryId: string): void {
    const state = this.loadState();
    if (!state.seenEntries.includes(entryId)) {
      state.seenEntries.push(entryId);
      state.lastChecked = new Date().toISOString();
      this.saveState(state);
    }
  }

  addSeenEntries(entryIds: string[]): void {
    const state = this.loadState();
    const newEntries = entryIds.filter(id => !state.seenEntries.includes(id));
    if (newEntries.length > 0) {
      state.seenEntries.push(...newEntries);
      state.lastChecked = new Date().toISOString();
      this.saveState(state);
    }
  }

  getSeenEntries(): string[] {
    return this.loadState().seenEntries;
  }

  clearState(): void {
    const initialState: MonitorState = {
      lastChecked: new Date().toISOString(),
      seenEntries: []
    };
    this.saveState(initialState);
  }
}
