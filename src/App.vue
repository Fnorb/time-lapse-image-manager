<template>
  <div id="app">
    <h1>Welcome to TimeLapseImageManager</h1>
    <div class="container mt-5">
      <span
        class="question-mark"
        data-bs-toggle="tooltip"
        title="This is some dummy text for the info tooltip."
      >
        <u>?</u>
      </span>

      <p>Hover over the question mark for more information.</p>

      <!-- Button to open file dialog -->
      <button
        class="btn btn-primary mt-4"
        :disabled="isProcessing"
        @click="pickDirectory"
      >
        Pick Source Directory
      </button>

      <!-- Options Section -->
      <div class="mt-4">
        <h3>Options</h3>

        <!-- Remove Bright/Dark Images Option -->
        <div class="form-check mt-3">
          <input
            class="form-check-input"
            type="checkbox"
            id="brightnessOption"
            v-model="options.brightnessCheck"
            :disabled="isProcessing"
          />
          <label class="form-check-label" for="brightnessOption">
            Remove Bright/Dark Images
          </label>
        </div>

        <!-- Minimum and Maximum Brightness Inputs -->
        <div v-if="options.brightnessCheck" class="mt-3">
          <label for="minBrightness">Min Brightness (0-100):</label>
          <input
            type="number"
            id="minBrightness"
            v-model="options.minBrightness"
            :disabled="isProcessing"
            min="0"
            max="100"
            class="form-control"
          />
          <label for="maxBrightness" class="mt-2">Max Brightness (0-100):</label>
          <input
            type="number"
            id="maxBrightness"
            v-model="options.maxBrightness"
            :disabled="isProcessing"
            min="0"
            max="100"
            class="form-control"
          />
        </div>

        <!-- Rename Option -->
        <div class="form-check">
          <input
            class="form-check-input"
            type="checkbox"
            id="renameOption"
            v-model="options.rename"
            :disabled="isProcessing"
          />
          <label class="form-check-label" for="renameOption">
            Rename images in sequence (e.g., img-00001.jpg)
          </label>
        </div>
      </div>

      <!-- Start Button -->
      <button
        class="btn btn-success mt-4"
        :disabled="!canStart || isProcessing"
        @click="startProcessing"
      >
        {{ isProcessing ? currentTask : 'Start' }}
      </button>

      <!-- Status of processing -->
      <div v-if="processStatus" class="mt-4">
        <p>{{ processStatus }}</p>
      </div>

      <!-- Log Section -->
      <div class="mt-4">
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
import 'bootstrap/dist/css/bootstrap.min.css';
import * as bootstrap from 'bootstrap';

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
        rename: false, // Checkbox for renaming images
        brightnessCheck: false, // Checkbox for brightness check
        minBrightness: 20, // Minimum brightness value
        maxBrightness: 80, // Maximum brightness value
      },
      logs: [] // Array to hold log messages
    };
  },
  computed: {
    // Determine if the Start button should be enabled
    canStart() {
      return (
        this.directoryPath && 
        this.fileCount > 0 && 
        (this.options.rename || this.options.brightnessCheck) // Ensure at least one option is selected
      );
    },
  },
  mounted() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl));
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
      this.logMessage('Starting the processing...');

      // Clear the logs before starting the new process
      this.logs = [];

      try {
        // Listen for real-time file rename events from the backend
        window.electronAPI.onFileRenamed((message) => {
          this.logMessage(message); // Log each renamed file
        });
        window.electronAPI.onBrightnessChecked((message) => {
          this.logMessage(message); // Log each renamed file
        });

        // Listen for renaming completion
        window.electronAPI.onRenamingComplete((message) => {
          this.processStatus = message;
          this.logMessage(message); // Log renaming completion
          this.isProcessing = false; // Re-enable UI
        });

        // Listen for renaming failure events
        window.electronAPI.onRenamingFailed((message) => {
          this.processStatus = message;
          this.logMessage(message); // Log renaming failure
          this.isProcessing = false; // Re-enable UI
        });

        if (this.options.brightnessCheck) {
          this.currentTask = 'Removing Bright/Dark Images...'; // Update current task
          const result = await window.electronAPI.removeBrightnessImages(
            this.directoryPath,
            this.options.minBrightness,
            this.options.maxBrightness
          );
          if (result.success) {
            this.processStatus = `Removed ${result.removedCount} images due to brightness.`; // Success message
            this.logMessage(`Removed ${result.removedCount} images due to brightness.`);
          } else {
            this.processStatus = `Removal failed: ${result.error}`; // Error message
            this.logMessage(`Removal failed: ${result.error}`);
          }
        }

        if (this.options.rename) {
          this.currentTask = 'Renaming files...'; // Update current task
          const result = await window.electronAPI.renameFiles(this.directoryPath);
          
          // Log the entire result for debugging
          console.log('Rename result:', result);
          
          if (result.success) {
            this.processStatus = `Renamed ${result.renamedCount} files successfully.`; // Success message
          } else {
            this.processStatus = `Renaming failed: ${result.error || 'No files to rename'}`; // Error message
            this.logMessage(`Renaming failed: ${result.error || 'No files to rename'}`);
          }
        }

      } catch (error) {
        console.error('Failed to process files', error);
        this.processStatus = 'An unexpected error occurred during processing.'; // Error handling
        this.logMessage('An unexpected error occurred during processing.');
      } finally {
        this.currentTask = ''; // Clear current task
        // The UI will be re-enabled by event handlers when processing is done
      }
    }

  },
};
</script>

<style>
/* Log section styles */
.log-container {
  max-height: 300px; /* Limit the height */
  overflow-y: scroll; /* Enable vertical scrolling */
  border: 1px solid #ccc;
  padding: 10px;
  background-color: #f9f9f9;
  font-family: monospace;
}

.log-message {
  font-size: 14px;
  color: #333;
  margin-bottom: 0
}

.log-message:nth-child(odd) {
  background-color: #f1f1f1;
}

.log-message:nth-child(even) {
  background-color: #e7e7e7;
}
</style>
