<template>
  <div class="action-bar">
    <div class="select-button" v-if="status === 'settings'">
      <button class="btn btn-primary" :disabled="status === 'processing'" @click="pickDirectory">Select Folder</button>
      <div class="text-output path" v-if="directoryPath">{{ directoryPath }}/----</div>
      <div class="text-output" v-if="directoryPath">{{ fileCount }} files</div>
    </div>

    <h1>TimeLapseTidy</h1>      

    <div class="action-buttons">
      <button
        v-for="(button, index) in visibleActionBarButtons"
        :key="index"
        class="btn"
        :class="button.class"
        :disabled="button.disabled"
        @click="this.$emit(button.event)"
      >
        {{ button.label }}
      </button>
    </div>
  </div>
</template>

<script>
import { useAppStore } from '@/stores/appStore';

export default {
  name: 'ActionBar',
  computed: {
    status() { return useAppStore().status; },
    fileCount() { return useAppStore().fileCount; },
    flaggedCount() { return useAppStore().flaggedCount; },
    directoryPath() { return useAppStore().directoryPath; },
    validated() { return useAppStore().validated; },
    options() { return useAppStore().settings; },
    settings() { return useAppStore().settings; },

    visibleActionBarButtons() {
      return this.actionBarButtons.filter((button) => button.visible);
    },
    actionBarButtons() {
      return [
        {
          label: 'Start',
          visible: this.status === 'settings',
          disabled: !this.canStartProcessing,
          event: 'startProcessing',
          class: 'btn-primary',
        },
        {
          label: 'Rename Files',
          visible: this.status === 'settings',
          disabled: !this.directoryPath,
          event: 'startRenaming',
          class: 'btn-secondary margin-left',
        },
        {
          label: 'Delete Half Images',
          visible: this.status === 'settings',
          disabled: !this.directoryPath,
          event: 'confirmDeleteHalf',
          class: 'btn-danger',
        },
        {
          label: 'Cancel',
          visible: this.status === 'processing',
          disabled: false,
          event: 'cancelProcessing',
          class: 'btn-primary',
        },
        {
          label: 'OK',
          visible: this.status === 'confirmationDeleteHalf',
          disabled: false,
          event: 'deleteHalfOfImages',
          class: 'btn-primary',
        },
        {
          label: 'OK',
          visible: this.status === 'result' || this.status === 'resultDeleted' || this.status === 'resultDeletedHalf' || this.status === "resultRenamed" || this.status === "confirmationDeleteFlagged" && this.flaggedCount === 0,
          //visible: ['result', 'resultDeleted', 'resultDeletedHalf', 'resultRenamed'].includes(this.status) || this.status === 'confirmationDeleteFlagged' && this.flaggedCount === 0,
          disabled: false,
          event: 'cancelResult',
          class: 'btn-primary',
        },
        
        {
          label: "Delete Files",
          visible: this.status === "confirmationDeleteFlagged" && this.flaggedCount > 0,
          disabled: false,
          event: 'deleteFlaggedFiles',
          class: "btn-primary",
        },
        {
          label: "Cancel",
          visible: this.status === "confirmationDeleteFlagged" && this.flaggedCount > 0,
          disabled: false,
          event: 'cancelResult',
          class: "btn-primary",
        },

      ];
    },

    canStartProcessing() {
      return (
        this.validated &&
        this.directoryPath &&
        (this.settings.minBrightnessChecked || 
        this.settings.maxBrightnessChecked)
      );
    },
  },
  data() {
    return {
      appStore: useAppStore(),
    };
  },
  methods: {
    async pickDirectory() {
      try {
        const { fileCount, directoryPath } = await window.electronAPI.openDirectory();
        this.appStore.setFileCount(fileCount);
        this.appStore.setDirectoryPath(directoryPath);
      } catch (error) {
        console.error('Failed to pick directory or count files', error);
      }
    },
  },
};
</script>

<style lang="stylus">
@import 'normalize.css'

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
