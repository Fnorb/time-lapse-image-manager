import { defineStore } from 'pinia';

export const useAppStore = defineStore('status', {
  state: () => ({
    status: 'settings',
    directoryPath: null,
    fileCount: null,
    validated: false,
    flaggedCount: null,
    settings: {
      fast: false,
      minBrightnessChecked: false,
      minBrightnessValue: 20,
      maxBrightnessChecked: false,
      maxBrightnessValue: 80,
    },
  }),

  actions: {
    setStatus(newStatus) { this.status = newStatus; },
    setDirectoryPath(newDirectoryPath) { this.directoryPath = newDirectoryPath; },
    setFileCount(newFileCount) { this.fileCount = newFileCount; },
    setFlaggedCount(newFlaggedCount) { this.flaggedCount = newFlaggedCount; },
    setSettings(newSettings) { this.settings = { ...this.settings, ...newSettings }; },
    setValidated(newValidated) { this.validated = newValidated; },
    resetStatus() {
      this.status = 'settings';
    },
  },
});
