<template>
  <div class="app-container">
    <div class="header">
      <h1>TimeLapseTidy</h1>
    </div>

    <div class="config">
      <!-- Config Section -->
      <div class="container">

        <!-- Button to open file dialog -->
        <button
          class="btn btn-primary"
          :disabled="isProcessing"
          @click="pickDirectory"
        >
          Pick Source Directory
        </button>

        <!-- Options Section -->
        <div>
          <h3>Options</h3>

          <!-- Minimum Brightness Option -->
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="minBrightnessOption"
              v-model="options.minBrightnessCheck"
              :disabled="isProcessing"
            />
            <label class="form-check-label" for="minBrightnessOption">
              Remove Images with Minimum Brightness Below Value
            </label>
            <span v-tooltip="'Set a minimum brightness threshold to remove dark images.'">?</span>
            <input
              type="number"
              v-model="options.minBrightness"
              :disabled="isProcessing"
              min="0"
              max="100"
              class="form-control-inline"
            />
            <span class="brightness-value">(0-100)</span>
          </div>

          <!-- Maximum Brightness Option -->
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="maxBrightnessOption"
              v-model="options.maxBrightnessCheck"
              :disabled="isProcessing"
            />
            <label class="form-check-label" for="maxBrightnessOption">
              Remove Images with Maximum Brightness Above Value
            </label>
            <span v-tooltip="'Set a maximum brightness threshold to remove overly bright images.'">?</span>
            <input
              type="number"
              v-model="options.maxBrightness"
              :disabled="isProcessing"
              min="0"
              max="100"
              class="form-control-inline"
            />
            <span class="brightness-value">(0-100)</span>
          </div>

          <!-- Difference from Neighbors Option -->
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="neighborDifferenceOption"
              v-model="options.neighborDifferenceCheck"
              :disabled="isProcessing"
            />
            <label class="form-check-label" for="neighborDifferenceOption">
              Remove Images with Difference from Neighbors Above Value
            </label>
            <span v-tooltip="'Set a threshold for image difference between neighbors to remove sudden changes.'">?</span>
            <input
              type="number"
              v-model="options.neighborDifference"
              :disabled="isProcessing"
              min="0"
              max="100"
              class="form-control-inline"
            />
            <span class="brightness-value">(0-100)</span>
          </div>

        </div>

        <!-- Start Processing Brightness Check -->
        <button
          class="btn btn-success"
          :disabled="!canStartBrightnessCheck || isProcessing"
          @click="startProcessing"
        >
          {{ isProcessing ? currentTask : 'Start Processing' }}
        </button>

        <!-- Rename Button -->
        <button
          class="btn btn-secondary"
          :disabled="!directoryPath || isProcessing"
          @click="startRenaming"
        >
          Rename Files
        </button>

        <!-- Status of processing -->
        <div v-if="processStatus">
          <p>{{ processStatus }}</p>
        </div>
      </div>
    </div>

    <div class="output">
      <!-- Log Section -->
      <div>
        <h4>Log</h4>
        <div class="log-container" ref="logContainer">
          <p v-for="(log, index) in logs" :key="index" class="log-message">
            {{ log }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      fileCount: null, // To store the number of files in the directory
      directoryPath: null, // To store the selected directory path
      processStatus: null, // To display processing status
      isProcessing: false, // Indicates if the process is running
      currentTask: '', // Indicates the current task being performed
      options: {
        minBrightnessCheck: false, // Checkbox for minimum brightness check
        minBrightness: 20, // Minimum brightness value
        maxBrightnessCheck: false, // Checkbox for maximum brightness check
        maxBrightness: 80, // Maximum brightness value
        neighborDifferenceCheck: false, // Checkbox for neighbor difference check
        neighborDifference: 20, // Neighbor difference value
      },
      logs: [] // Array to hold log messages
    };
  },
  computed: {
    // Determine if the Processing button should be enabled
    canStartProcessing() {
      return (
        this.directoryPath &&
        this.fileCount > 0 &&
        (this.options.minBrightnessCheck || this.options.maxBrightnessCheck || this.options.neighborDifferenceCheck)
      );
    },
  },
  methods: {
    // Log method to add log messages
    logMessage(message) {
      this.logs.push(message);
      this.$nextTick(() => {
        const logContainer = this.$refs.logContainer;
        logContainer.scrollTop = logContainer.scrollHeight; // Scroll to bottom
      });
    },

    async pickDirectory() {
      try {
        const { fileCount, directoryPath } = await window.electronAPI.openDirectory();
        this.fileCount = fileCount;
        this.directoryPath = directoryPath;
        this.processStatus = null; // Reset status
        this.logMessage(`Opened directory with ${fileCount} files.`);
      } catch (error) {
        console.error('Failed to pick directory or count files', error);
        this.logMessage('Error opening directory.');
      }
    },

    async startProcessing() {
      this.isProcessing = true; // Disable UI
      this.processStatus = null; // Clear status
      this.logMessage('Starting processing...');

      // Clear the logs before starting the new process
      this.logs = [];

      try {
        this.currentTask = 'Processing Images...'; // Update current task
        const result = await window.electronAPI.processImages(
          this.directoryPath,
          this.options.minBrightnessCheck ? this.options.minBrightness : undefined,
          this.options.maxBrightnessCheck ? this.options.maxBrightness : undefined,
          this.options.neighborDifferenceCheck ? this.options.neighborDifference : undefined
        );
        if (result.success) {
          this.processStatus = `Processed ${result.processedCount} images successfully.`; // Success message
          this.logMessage(`Processed ${result.processedCount} images successfully.`);
        } else {
          this.processStatus = `Processing failed: ${result.error}`; // Error message
          this.logMessage(`Processing failed: ${result.error}`);
        }
      } catch (error) {
        console.error('Failed to process images', error);
        this.processStatus = 'An unexpected error occurred during processing.'; // Error handling
        this.logMessage('An unexpected error occurred during processing.');
      } finally {
        this.currentTask = ''; // Clear current task
        this.isProcessing = false; // Re-enable UI
      }
    },

    async startRenaming() {
      this.isProcessing = true; // Disable UI
      this.processStatus = null; // Clear status
      this.logMessage('Starting renaming process...');

      try {
        const result = await window.electronAPI.renameFiles(this.directoryPath);

        if (result.success) {
          this.processStatus = `Renamed ${result.renamedCount} files successfully.`; // Success message
          this.logMessage(`Renamed ${result.renamedCount} files successfully.`);
        } else {
          this.processStatus = `Renaming failed: ${result.error || 'No files to rename'}`; // Error message
          this.logMessage(`Renaming failed: ${result.error || 'No files to rename'}`);
        }
      } catch (error) {
        console.error('Failed to rename files', error);
        this.processStatus = 'An unexpected error occurred during renaming.'; // Error handling
        this.logMessage('An unexpected error occurred during renaming.');
      } finally {
        this.isProcessing = false; // Re-enable UI
      }
    },
  },
};
</script>

<style lang="stylus">
@import 'normalize.css'
@import './assets/styles/global.styl'

.v-tooltip__content
  visibility visible !important
  opacity 1 !important
  position absolute !important
  z-index 9999 !important

.form-check
  margin-bottom: 1rem

.form-control-inline
  width: 80px
  display: inline-block
  margin-left: 10px

.brightness-value
  margin-left: 5px
  font-size: 0.9rem
  color: gray
</style>
