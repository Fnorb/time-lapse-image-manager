<template>
  <div class="app-container">
    <div class="footer">
      <div class="selectButton" v-if="status === 'config'">
        <!--<button class="btn btn-primary" :disabled="status === 'processing'" @click="pickDirectory">Select Directory</button>
        <div class="text-output path" v-if="directoryPath">{{ directoryPath }}</div>
        <div class="text-output" v-if="directoryPath">{{ fileCount }} files</div>-->
        <div class="selectButton" v-if="status === 'config'">
          <button class="btn btn-primary" :disabled="status === 'processing'" @click="pickDirectory">Select Folder</button>
          <div class="text-output path" v-if="directoryPath">{{ directoryPath }}</div>
          <div class="text-output" v-if="directoryPath">{{ fileCount }} files</div>
        </div>
      </div>

      <h1>TimeLapseTidy</h1>      

      <div class="actionButtons">
        <div class="actionButtons">
          <button
            v-for="(button, index) in visibleFooterButtons"
            :key="index"
            class="btn"
            :class="button.class"
            :disabled="button.disabled"
            @click="button.onClick"
          >
            {{ button.label }}
          </button>
        </div>
        
      </div>      
    </div>

    <div class="content">
      <!-- CONFIG VIEW -->

      <div class="config" v-if="status === 'config'">
        <div class="container">
          <!-- Settings Section -->
          <div>
            <h3>Settings</h3>
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
              <span class="info-mark" v-tooltip="'Finds images that are too dark. 0 = black, 100 = white'">?</span>
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
              <span class="info-mark" v-tooltip="'Finds images that are too bright. 0 = black, 100 = white'">?</span>
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
              <span class="info-mark" v-tooltip="'Flags images that have a different contrast level'">?</span>
            </div>
          </div>

          <!-- Fast Mode -->
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="fast"
              v-model="options.fast"
              :disabled="status === 'processing'"
            />
            <label class="form-check-label" for="fast">
              Fast mode
            </label>
            <span class="info-mark" v-tooltip="'Increases processing speed by sacrificing accuracy'">?</span>
          </div>
        </div>
      </div>

      <!-- PROCESSING VIEW -->
      <div class="processOutput" v-if="['processing', 'result', 'confirmationDeleteFlagged', 'resultDeleted'].includes(status)">
          <div v-if="['Renaming files', 'Deleting files'].includes(processStatus)">
            <div class="result">{{ processStatus }} <span class="dots"></span></div>
          </div>
          <ProgressBar v-else :imageBrightnesses="imageBrightnesses" :imageStatuses="imageStatuses" :imagesTotal="fileCount"></ProgressBar>
      </div>

      <!-- ERROR VIEW -->
      <div class="processError" v-if="status === 'error'">
        <div>ERROR: {{ error.message }}</div>
        <div v-if="error.filename !== ''">FILE: {{ error.filename }}</div>
      </div>

      <!-- CONFIRMATION DELETE FLAGGED VIEW -->
      <div class="confirmation" v-if="status === 'confirmationDeleteFlagged'">
        {{  result.flaggedCount }} of {{  result.processedCount }} files flagged for deletion.
      </div>

      <!-- CONFIRMATION DELETE HALF VIEW -->
      <div class="confirmation" v-if="status === 'confirmationDeleteHalf'">
        Delete every second file in the target directory?
      </div>

      <!-- RESULT DELETED -->
      <div class="result" v-if="status === 'resultDeleted'">
        {{ result.deleteCount }} {{ result.deleteCount === 1 ? 'file' : 'files' }} deleted.
      </div>
      
      <!-- RESULT RENAMED -->
      <div class="result" v-if="status === 'resultRenamed'">
        All files in target directory renamed.
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
        fast: false,
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

    visibleFooterButtons() {
      return this.footerButtons.filter((button) => button.visible);
    },

    footerButtons() {
      return [
        // Config View
        {
          label: "Start",
          visible: this.status === "config",
          disabled: !this.canStartProcessing,
          onClick: this.startProcessing,
          class: "btn-primary",
        },
        {
          label: "Rename Files",
          visible: this.status === "config",
          disabled: !this.directoryPath,
          onClick: this.startRenaming,
          class: "btn-secondary margin-left",
        },
        {
          label: "Delete Half Images",
          visible: this.status === "config",
          disabled: !this.directoryPath,
          onClick: this.confirmDeleteHalf,
          class: "btn-danger",
        },

        // Process View
        {
          label: "Cancel",
          visible: this.status === "processing",
          disabled: false,
          onClick: this.cancelProcessing,
          class: "btn-primary",
        },

        // Delete Half
        {
          label: "OK",
          visible: this.status === "confirmationDeleteHalf",
          disabled: false,
          onClick: this.deleteHalfOfImages,
          class: "btn-primary",
        },
        {
          label: "Cancel",
          visible: this.status === "confirmationDeleteHalf",
          disabled: false,
          onClick: this.cancelResult,
          class: "btn-primary",
        },

        // Delete Flagged
        {
          label: "Delete Files",
          visible: this.status === "confirmationDeleteFlagged" && this.result.flaggedCount > 0,
          disabled: false,
          onClick: this.deleteFlaggedFiles,
          class: "btn-primary",
        },
        {
          label: "Cancel",
          visible: this.status === "confirmationDeleteFlagged" && this.result.flaggedCount > 0,
          disabled: false,
          onClick: this.cancelResult,
          class: "btn-primary",
        },

        // Result Renamed
        {
          label: "OK",
          visible: this.status === "resultRenamed" || (this.status === "confirmationDeleteFlagged" && this.result.flaggedCount <= 0),
          disabled: false,
          onClick: this.cancelResult,
          class: "btn-primary",
        },

        // OK and back to Config
        {
          label: "OK",
          visible: this.status === "result" || this.status === "resultDeleted",
          disabled: false,
          onClick: this.cancelResult,
          class: "btn-primary",
        },
      ];
    },
  },
  methods: {
    confirmDeleteHalf() {
      this.status = "confirmationDeleteHalf";
    },

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
          const fileCount = await window.electronAPI.getFileCount(this.directoryPath);
          this.fileCount = fileCount.fileCount;
        } else {
          console.warn("Directory path not available.");
        }
      } catch (error) {
        console.error('Failed to update file count:', error);
      }
    },

    async pickDirectory() {
      try {
        const { fileCount, directoryPath } = await window.electronAPI.openDirectory();
        this.fileCount = fileCount;
        this.directoryPath = directoryPath;
        this.processStatus = null;
      } catch (error) {
        console.error('Failed to pick directory or count files', error);
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
          this.result.deleteCount = result.deleteCount
          this.status = "resultDeleted";
        } else {
          this.processStatus = `Deletion failed: ${result.error}`;
          this.error.message = result.error;
          this.error.filename = result.filename;
          this.status = "error";
        }

      } catch (error) {
        this.processStatus = 'An unexpected error occurred during deletion.';
      } finally {
        this.currentTask = '';
      }
    },

    async startProcessing() {
      if (!this.validateAllFields()) {
        return;
      }

      this.imageStatuses = [];
      this.imageBrightnesses = [];
      this.status = 'processing';
      this.processStatus = "Filtering files...";
      this.cancelProcessingRequested = false;

      const payload = {
        directoryPath: this.directoryPath,
        options: {
          minBrightness: this.options.minBrightnessCheck ? this.options.minBrightness : undefined,
          maxBrightness: this.options.maxBrightnessCheck ? this.options.maxBrightness : undefined,
          neighborDifference: this.options.neighborDifferenceCheck ? this.options.neighborDifference : undefined,
          fast: this.options.fast,
        },
      };

      let processOutcome = 'byProcessCompleted';

      try {
        this.currentTask = 'Processing Images...';

        const result = await window.electronAPI.processImages(payload);

        if (result.success) {
          this.result.flaggedCount = result.flaggedCount
          this.result.totalCount = result.totalCount
          this.status = "confirmationDeleteFlagged"
          this.processStatus = `Processed ${result.totalCount} images successfully.`;
        } else {
          this.processStatus = `Processing failed: ${result.error}`;
          this.error.message = result.error;
          this.error.filename = result.filename;
          this.status = "error";
          processOutcome = 'byError'; 
        }

      } catch (error) {
        this.processStatus = 'An unexpected error occurred during processing.';
        processOutcome = 'byError';
      } finally {
        this.currentTask = '';

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
      window.electronAPI.cancelProcessing(); 
    },

    validateAllFields() {
      let valid = true;

      if (this.options.minBrightnessCheck && (this.options.minBrightness < 0 || this.options.minBrightness > 100)) {
        valid = false;
      }

      if (this.options.maxBrightnessCheck && (this.options.maxBrightness < 0 || this.options.maxBrightness > 100)) {
        valid = false;
      }

      if (this.options.neighborDifferenceCheck && (this.options.neighborDifference < 0 || this.options.neighborDifference > 100)) {
        valid = false;
      }

      return valid;
    },

    async deleteHalfOfImages() {
      this.status = 'processing';
      this.processStatus = "Deleting files";
   
      try {
        const result = await window.electronAPI.deleteHalfOfImages(this.directoryPath);

        if (result.success) {
          this.processStatus = `Deleted ${result.deleteCount} files successfully.`;
          this.status = "resultDeleted";
          this.result.deleteCount = result.deleteCount;
        } else {
          this.processStatus = `Deletion failed: ${result.error || 'No files to delete'}`;
        }
      } catch (error) {
        console.error('Failed to delete files', error);
        this.processStatus = 'An unexpected error occurred during deletion.';
      }
    },

    async startRenaming() {
      this.status = 'processing';
      this.processStatus = "Renaming files";
    
      try {
        const result = await window.electronAPI.renameFiles(this.directoryPath);

        if (result.success) {
          this.processStatus = `Renamed ${result.renamedCount} files successfully.`;
        } else {
          this.processStatus = `Renaming failed: ${result.error || 'No files to rename'}`;
        }
      } catch (error) {
        console.error('Failed to rename files', error);
        this.processStatus = 'An unexpected error occurred during renaming.';
      } finally {
        this.status = 'resultRenamed';
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
@import './assets/styles/fonts.styl'
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
