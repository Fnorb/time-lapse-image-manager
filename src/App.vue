<template>
  <div class="app-container">

    <ActionBar @startProcessing="handleStartProcessing" @startRenaming="handleStartRenaming"
      @confirmDeleteHalf="handleConfirmDeleteHalf" @cancelProcessing="handleCancelProcessing"
      @cancelResult="handleCancelResult" @deleteFlaggedFiles="handleDeleteFlaggedFiles"
      @deleteHalfOfImages="handleDeleteHalfOfImages" />

    <div class="content">
      <!-- Settings -->
      <SettingsView v-if="status === 'settings'" />

      <!-- Image analysis output with progress bar -->
      <div class="processOutput"
        v-if="['processing', 'result', 'confirmationDeleteFlagged', 'renaming'].includes(status)">
        <div v-if="status === 'renaming'">
          <div class="result">Renaming files<span class="dots"></span></div>
        </div>
        <ProgressBar v-else :imageBrightnesses="imageBrightnesses" :imageStatuses="imageStatuses"
          :imagesTotal="fileCount"></ProgressBar>
      </div>

      <!-- Error view -->
      <div class="processError" v-if="status === 'error'">
        <div>ERROR: {{ error.message }}</div>
        <div v-if="error.filename !== ''">FILE: {{ error.filename }}</div>
      </div>

      <!-- Delete flagged files -->
      <div class="confirmation" v-if="status === 'confirmationDeleteFlagged'">
        {{ this.flaggedCount }} of {{ result.processedCount }} files flagged for deletion.
      </div>

      <!-- Delete every 2nd file -->
      <div class="confirmation" v-if="status === 'confirmationDeleteHalf'">
        Delete every second file in the target directory?
      </div>

      <!-- Deletion result -->
      <div class="result" v-if="status === 'resultDeletedHalf' || status === 'resultDeleted'">
        {{ result.deleteCount }} {{ result.deleteCount === 1 ? 'file' : 'files' }} deleted.
      </div>

      <!-- Renamed result -->
      <div class="result" v-if="status === 'resultRenamed'">
        All files in target directory renamed.
      </div>
    </div>
  </div>
</template>

<script>
import { useAppStore } from './stores/appStore';
import ActionBar from './components/ActionBar.vue';
import ProgressBar from './components/ProgressBar.vue';
import SettingsView from './components/SettingsView.vue';

export default {
  name: 'App',

  components: {
    ActionBar,
    ProgressBar,
    SettingsView,
  },

  data() {
    const appStore = useAppStore();
    return {
      appStore,
      imageStatuses: [],
      imageBrightnesses: [],
      error: {
        message: '',
        filename: '',
      },
      result: {
        totalCount: -1,
        deleteCount: -1,
        resultStatus: 'none'

      },
      currentTask: '',
      cancelProcessingRequested: false,
    };
  },

  computed: {
    status() { return useAppStore().status; },
    fileCount() { return useAppStore().fileCount; },
    flaggedCount() { return useAppStore().flaggedCount; },
    directoryPath() { return useAppStore().directoryPath; },
    settings() { return useAppStore().settings; },

    visibleActionBarButtons() {
      return this.actionBarButtons.filter((button) => button.visible);
    },
  },

  methods: {
    /**
     * Sets the view to query for user confirmation to delete every 2nd file
     * @returns {void}
     */
    handleConfirmDeleteHalf() {
      this.appStore.setStatus("confirmationDeleteHalf");
    },

    /**
     * Starts the image analysis process
     * @returns {void}
     */
    async handleStartProcessing() {
      this.imageStatuses = [];
      this.imageBrightnesses = [];
      this.appStore.setStatus("processing");
      this.cancelProcessingRequested = false;

      // transmit the selected settings to the backend and start the process
      const payload = {
        directoryPath: this.directoryPath,
        settings: {
          minBrightness: this.settings.minBrightnessChecked ? this.settings.minBrightnessValue : undefined,
          maxBrightness: this.settings.maxBrightnessChecked ? this.settings.maxBrightnessValue : undefined,
          fast: this.settings.fast,
        },
      };


      let processOutcome = 'byProcessCompleted';

      try {
        this.currentTask = 'Processing Images...';
        const result = await window.electronAPI.processImages(payload);

        if (result.success) {
          this.appStore.setFlaggedCount(result.flaggedCount);
          this.result.totalCount = result.totalCount
          this.appStore.setStatus("confirmationDeleteFlagged");
        } else {
          this.error.message = result.error;
          this.error.filename = result.filename;
          this.appStore.setStatus("error");
          processOutcome = 'byError';
        }

      } catch (error) {
        processOutcome = 'byError';
      } finally {
        this.currentTask = '';

        if (processOutcome === 'byProcessCompleted') {
          // console.log('Process completed successfully!');
        } else if (processOutcome === 'byError') {
          // console.log('An error occurred during processing.');
          this.appStore.setStatus("error");
        }

        if (this.cancelProcessingRequested) {
          processOutcome = 'byUserCancel';
          this.appStore.setStatus("settings");
          //console.log('Processing was canceled by the user.');
        }
      }
    },

    /**
     * resets most of the app on cancel
     * @returns {void}
     */
    handleCancelResult() {
      this.result.totalCount = -1;
      this.appStore.setFlaggedCount(-1);
      this.result.deleteCount = -1;
      this.result.resultStatus = "none";
      this.appStore.setStatus("settings");
      this.updateFileCount();
    },

    /**
     * Updates the count of the files in the source directory
     * @returns {void}
     */
    async updateFileCount() {
      try {
        if (this.directoryPath) {
          const fileCount = await window.electronAPI.getFileCount(this.directoryPath);
          this.appStore.setFileCount(fileCount.fileCount);
        } else {
          console.warn("Directory path not available.");
        }
      } catch (error) {
        console.error('Failed to update file count:', error);
      }
    },

    /**
     * Deletes the flagged files
     * @returns {void}
     */
    async handleDeleteFlaggedFiles() {
      this.appStore.setStatus("processing");
      try {
        const result = await window.electronAPI.deleteFlaggedFiles();

        if (result.success) {
          this.result.deleteCount = result.deleteCount
          this.appStore.setStatus("resultDeleted");
          // this.updateFileCount();
        } else {
          this.error.message = result.error;
          this.error.filename = result.filename;
          this.appStore.setStatus("error");
        }

      } catch (error) {
        // this.processStatus = 'An unexpected error occurred during deletion.';
      } finally {
        this.currentTask = '';
      }
    },

    /**
     * Cancels the image analysis process
     * @returns {void}
     */
    handleCancelProcessing() {
      this.cancelProcessingRequested = true;
      window.electronAPI.cancelProcessing();
    },

    /**
     * Deletes every 2nd image
     * @returns {void}
     */
    async handleDeleteHalfOfImages() {
      this.appStore.setStatus("deleting");

      try {
        const result = await window.electronAPI.deleteHalfOfImages(this.directoryPath);

        if (result.success) {
          this.appStore.setStatus("resultDeletedHalf");
          this.result.deleteCount = result.deleteCount;
        } else {
          // this.processStatus = `Deletion failed: ${result.error || 'No files to delete'}`;
        }
      } catch (error) {
        console.error('Failed to delete files', error);
      }
    },

    /**
     * Tells the electron backend to rename files
     * @returns {void}
     */
    async handleStartRenaming() {
      this.appStore.setStatus("renaming");

      try {
        const result = await window.electronAPI.renameFiles(this.directoryPath);

        if (result.success) {
          this.appStore.setStatus("resultRenamed");
        } else {
          console.log(`Renaming failed: ${result.error}`);
        }

      } catch (error) {
        console.error('Failed to rename files', error);
      }
    },

    /**
     * Catches data from the backend with information on processed images
     * @param {string} file - Filepath
     * @param {string} status - 'failed' | 'passed', depending on whether the file passed all filters or didn't
     * @param {number} averageBrightess - Value of 0 to 100 describing the images average brightness
     * @returns {void}
     */
    onImageStatus(file, status, averageBrightess) {
      this.imageStatuses = [...this.imageStatuses, status];
      this.imageBrightnesses = [...this.imageBrightnesses, averageBrightess];
    },
  },

  /**
   * Listens for information from the backend about processed images
   * @returns {void}
   */
  mounted() {
    window.electronAPI.onImageStatus(this.onImageStatus);
  },

  /** 
   * Ensures that no listeners remain on unmount
   * @returns {void}
   **/
  beforeUnmount() {
    window.electronAPI.removeImageStatusListener();
  },
};
</script>


<style lang="stylus">
  @import 'normalize.css'

  .form-check
    margin-bottom 1rem

  .form-control-inline
    width 80px
    display inline-block
    margin-left 10px
</style>
