<template>
  <div class="app-container">
    <div class="header">
      <h1>TimeLapseTidy</h1>
    </div>

    <div class="footer">
      <div class="selectButton" v-if="status === 'config'">
        <button class="btn btn-primary" :disabled="status === 'processing'" @click="pickDirectory">Select Directory</button>
        <div class="text-output path" v-if="directoryPath">{{ directoryPath }}</div>
        <div class="text-output" v-if="directoryPath">{{ fileCount }} files</div>
      </div>

      <div class="actionButtons">
        <button
        class="btn"
        v-if="getFooterButtonLabel('left') !== ''" 
        :disabled="getFooterButtonDisabled('left')" 
        v-text="getFooterButtonLabel('left')"
        @click="handleFooterButtonClick('left')"
        >
      </button>

      <button
        class="btn" 
        :disabled="getFooterButtonDisabled('right')" 
        v-if="getFooterButtonLabel('right') !== ''" 
        v-text="getFooterButtonLabel('right')"
        @click="handleFooterButtonClick('right')"
        >
      </button>
      </div>      
    </div>

    <div class="content">
      <!-- CONFIG VIEW -->

      <div class="config" v-if="status === 'config'">
        <div class="container">
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
                :disabled="status === 'processing'"
              />
              <label class="form-check-label" for="minBrightnessOption">
                Remove images with brightness below
              </label>
              <input
                type="number"
                v-model="options.minBrightness"
                :disabled="status === 'processing'"
                @blur="validateField('minBrightness')"
                class="form-control-inline"
                :class="{ error: validationErrors.minBrightness }"
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
                :disabled="status === 'processing'"
              />
              <label class="form-check-label" for="maxBrightnessOption">
                Remove images with brightness above
              </label>
              <input
                type="number"
                v-model="options.maxBrightness"
                :disabled="status === 'processing'"
                @blur="validateField('maxBrightness')"
                class="form-control-inline"
                :class="{ error: validationErrors.maxBrightness }"
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
                :disabled="status === 'processing'"
              />
              <label class="form-check-label" for="neighborDifferenceOption">
                Remove Images with Difference from Neighbors Above Value
              </label>
              <input
                type="number"
                v-model="options.neighborDifference"
                :disabled="status === 'processing'"
                @blur="validateField('neighborDifference')"
                class="form-control-inline"
                :class="{ error: validationErrors.neighborDifference }"
              />
              <span class="brightness-value">(0-100)</span>
            </div>
          </div>
  
          <!-- Status of processing -->
          <div v-if="processStatus">
            <p>{{ processStatus }}</p>
          </div>
        </div>
      </div>

      <!-- PROCESSING VIEW -->
      <div class="processOutput" v-if="status === 'processing' || status === 'result'">
        <ProgressBar :imageBrightnesses="imageBrightnesses" :imageStatuses="imageStatuses" :imagesTotal="fileCount"></ProgressBar>
      </div>

      <!-- ERROR VIEW -->
      <div class="processError" v-if="status === 'error'">
        <div>ERROR: {{ error.message }}</div>
        <div v-if="error.filename !== ''">FILE: {{ error.filename }}</div>
      </div>

      <!-- RESULT VIEW -->
      <div class="result" v-if="status === 'result'">
        <div v-if="result.resultStatus === 'query'">
          {{  result.flaggedCount }} of {{  result.processedCount }} files flagged for deletion.
        </div>
        <div v-if="result.resultStatus === 'result'">
          {{ result.deleteCount }} files deleted.
        </div>
      </div>

      <!-- LOG VIEW -->
      <div class="output" v-if="status === 'log'">
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
  </div>
</template>
<script>
import ProgressBar from './components/ProgressBar.vue';

export default {
  name: 'App',
  components: {
    ProgressBar,
  },
  data() {
    return {
      fileCount: null,
      directoryPath: null,
      processStatus: null,
      status: 'config',
      imageStatuses: [],
      imageBrightnesses: [],
      error: {
        message: '',
        filename: '',
      },
      result: {
        totalCount: -1,
        flaggedCount: -1,
        deleteCount: -1,
        resultStatus: 'none'

      },
      currentTask: '',
      options: {
        minBrightnessCheck: false,
        minBrightness: 20,
        maxBrightnessCheck: false,
        maxBrightness: 80,
        neighborDifferenceCheck: false,
        neighborDifference: 20,
      },
      validationErrors: {
        minBrightness: false,
        maxBrightness: false,
        neighborDifference: false,
      },
      logOutput: false,
      logs: [],
      cancelProcessingRequested: false,
    };
  },
  computed: {
    canStartProcessing() {
      return (
        this.directoryPath &&
        (this.options.minBrightnessCheck || 
        this.options.maxBrightnessCheck || 
        this.options.neighborDifferenceCheck)
      );
    },
  },
  methods: {
    getFooterButtonLabel(button) {
      const labels = {
        left: {
          config: "Start",
          processing: "Cancel",
          error: "OK",
          result: "Delete files",
          resultOK: "OK",
        },
        right: {
          config: "Rename files",
          result: "Cancel",
        },
      };

      if (this.status === 'result' && this.result.resultStatus === 'result') {
        if (button === 'left') {
          return labels.left.resultOK;
        }
        if (button === 'right') {
          return '';
        }
      }

      return labels[button]?.[this.status] || '';
    },

    getFooterButtonDisabled(button) {
      return (
        (button === 'right' && !this.directoryPath) ||
        (button === 'left' && this.status === 'config' && !this.canStartProcessing) || 
        (button === 'left' && this.status === 'result' && this.result.flaggedCount === 0)
      );
    },

    handleFooterButtonClick(button) {
      switch (this.status) {
        case 'config':
          if (button === 'left') { this.startProcessing(); }
          else if (button === 'right') { this.startRenaming(); }
          break;

        case 'processing':
        case 'error':
          if (button === 'left') { 
            this.cancelResult();
            this.cancelProcessing();
          }
          break;

        case 'result':
          if (this.result.resultStatus === 'result') {
            if (button === 'left') {
              this.cancelResult(); // Execute cancelResult for left button when resultStatus === 'result'
            }
          } else {
            if (button === 'left') {
              this.deleteFlaggedFiles(); // Default behavior for 'result' status without 'resultStatus === result'
            } 
            else if (button === 'right') { 
              this.cancelResult(); 
            }
          }
          break;

        default:
          console.warn('Unexpected status:', this.status);
          break;
      }
    },

    cancelResult() {
      this.result.totalCount = -1;
      this.result.flaggedCount = -1;
      this.result.deleteCount = -1;
      this.result.resultStatus = "none";
      this.status = 'config';
      this.updateFileCount();
    },

    async updateFileCount() {
      try {
        if (this.directoryPath) {
          // Call your method to count files in the directory (you need to implement this on the backend side)
          const fileCount = await window.electronAPI.getFileCount(this.directoryPath);
          console.log(fileCount)
          this.fileCount = fileCount.fileCount;
        } else {
          console.warn("Directory path not available.");
        }
      } catch (error) {
        console.error('Failed to update file count:', error);
      }
    },

    logMessage(message) {
      if (this.logOutput) {
        this.logs.push(message);
        this.$nextTick(() => {
          const logContainer = this.$refs.logContainer;
          logContainer.scrollTop = logContainer.scrollHeight;
        });
      }
    },

    async pickDirectory() {
      try {
        const { fileCount, directoryPath } = await window.electronAPI.openDirectory();
        this.fileCount = fileCount;
        this.directoryPath = directoryPath;
        this.processStatus = null;
        this.logMessage(`Opened directory with ${fileCount} files.`);
      } catch (error) {
        console.error('Failed to pick directory or count files', error);
        this.logMessage('Error opening directory.');
      }
    },

    validateField(field) {
      const value = this.options[field];
      const isChecked = this.options[`${field}Check`];

      if (isChecked && (value < 0 || value > 100 || value === null || value === undefined)) {
        this.validationErrors[field] = true;
      } else {
        this.validationErrors[field] = false;
      }
    },

    async deleteFlaggedFiles() {
      this.status = 'processing';
      try {
        const result = await window.electronAPI.deleteFlaggedFiles();

        if (result.success) {
          this.result.resultStatus = "result"
          this.result.deleteCount = result.deleteCount
        } else {
          this.processStatus = `Deletion failed: ${result.error}`;
          this.logMessage(`Deletion failed: ${result.error}`);
          this.error.message = result.error;
          this.error.filename = result.filename;
          this.status = "error";
        }

      } catch (error) {
        this.processStatus = 'An unexpected error occurred during deletion.';
        this.logMessage('An unexpected error occurred during deletion.');
      } finally {
        this.currentTask = '';
        this.status = "result";
      }
    },

    async startProcessing() {
      if (!this.validateAllFields()) {
        this.logMessage("Validation failed. Please correct the errors before proceeding.");
        return;
      }

      this.imageStatuses = [];
      this.status = 'processing';
      this.processStatus = null;
      this.logMessage('Starting processing...');
      this.cancelProcessingRequested = false;

      const payload = {
        directoryPath: this.directoryPath,
        options: {
          minBrightness: this.options.minBrightnessCheck ? this.options.minBrightness : undefined,
          maxBrightness: this.options.maxBrightnessCheck ? this.options.maxBrightness : undefined,
          neighborDifference: this.options.neighborDifferenceCheck ? this.options.neighborDifference : undefined,
        },
      };

      let processOutcome = 'byProcessCompleted';

      try {
        this.currentTask = 'Processing Images...';

        const result = await window.electronAPI.processImages(payload);

        if (result.success) {
          this.result.flaggedCount = result.flaggedCount
          this.result.totalCount = result.totalCount
          this.result.resultStatus = "query"
          this.processStatus = `Processed ${result.totalCount} images successfully.`;
          this.logMessage(`Processed ${result.totalCount} images successfully.`);
        } else {
          this.processStatus = `Processing failed: ${result.error}`;
          this.logMessage(`Processing failed: ${result.error}`);
          this.error.message = result.error;
          this.error.filename = result.filename;
          this.status = "error";
          processOutcome = 'byError'; 
        }

      } catch (error) {
        this.processStatus = 'An unexpected error occurred during processing.';
        this.logMessage('An unexpected error occurred during processing.');
        processOutcome = 'byError';
      } finally {
        this.currentTask = '';
        console.log("status is result")
        this.status = 'result';

        if (processOutcome === 'byProcessCompleted') {
          console.log('Process completed successfully!');
        } else if (processOutcome === 'byError') {
          console.log('An error occurred during processing.');
          this.status = 'error';
        }

        if (this.cancelProcessingRequested) {
          processOutcome = 'byUserCancel';
          this.status = 'config';
          console.log('Processing was canceled by the user.');
        }
      }
    },

    cancelProcessing() {
      this.cancelProcessingRequested = true;
      this.processStatus = 'Processing has been canceled.';
      this.logMessage('Processing has been canceled.');
      window.electronAPI.cancelProcessing(); 
    },

    validateAllFields() {
      let valid = true;

      if (this.options.minBrightnessCheck && (this.options.minBrightness < 0 || this.options.minBrightness > 100)) {
        this.logMessage("Minimum brightness must be between 0 and 100.");
        valid = false;
      }

      if (this.options.maxBrightnessCheck && (this.options.maxBrightness < 0 || this.options.maxBrightness > 100)) {
        this.logMessage("Maximum brightness must be between 0 and 100.");
        valid = false;
      }

      if (this.options.neighborDifferenceCheck && (this.options.neighborDifference < 0 || this.options.neighborDifference > 100)) {
        this.logMessage("Neighbor difference must be between 0 and 100.");
        valid = false;
      }

      return valid;
    },

    async startRenaming() {
      this.status = 'processing';
      this.processStatus = null;
      this.logMessage('Starting renaming process...');

      try {
        const result = await window.electronAPI.renameFiles(this.directoryPath);

        if (result.success) {
          this.processStatus = `Renamed ${result.renamedCount} files successfully.`;
          this.logMessage(`Renamed ${result.renamedCount} files successfully.`);
        } else {
          this.processStatus = `Renaming failed: ${result.error || 'No files to rename'}`;
          this.logMessage(`Renaming failed: ${result.error || 'No files to rename'}`);
        }
      } catch (error) {
        console.error('Failed to rename files', error);
        this.processStatus = 'An unexpected error occurred during renaming.';
        this.logMessage('An unexpected error occurred during renaming.');
      } finally {
        this.status = 'result';
      }
    },

    watchCheckbox(field) {
      if (this.options[`${field}Check`]) {
        this.validateField(field);
      } else {
        this.validationErrors[field] = false;
      }
    },

    onImageStatus(file, status, averageBrightess) {
      this.logMessage(`Image: ${file} - Status: ${status}`);
      this.imageStatuses = [...this.imageStatuses, status];
      this.imageBrightnesses = [...this.imageBrightnesses, averageBrightess];
    },
  },
  mounted() {
    window.electronAPI.onImageStatus(this.onImageStatus);
  },
  beforeUnmount() {
    window.electronAPI.removeImageStatusListener();
  },
  watch: {
    'options.minBrightnessCheck'() {
      this.watchCheckbox('minBrightness');
    },
    'options.maxBrightnessCheck'() {
      this.watchCheckbox('maxBrightness');
    },
    'options.neighborDifferenceCheck'() {
      this.watchCheckbox('neighborDifference');
    },
  },
};
</script>


<style lang="stylus">
@import 'normalize.css'
@import './assets/styles/global.styl'

.error {
  border: 2px solid red;
  background-color: #ffe6e6;
}

.form-check {
  margin-bottom: 1rem;
}

.form-control-inline {
  width: 80px;
  display: inline-block;
  margin-left: 10px;
}

.brightness-value {
  margin-left: 5px;
  font-size: 0.9rem;
  color: gray;
}
</style>
