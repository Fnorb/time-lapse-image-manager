<template>
  <div class="action-bar">

    <!-- Top row action button -->
    <div class="select-button" v-if="status === 'settings'">
      <button class="btn btn-primary" :disabled="status === 'processing'" @click="pickDirectory">Select Folder</button>
      <div class="text-output path" v-if="directoryPath">{{ directoryPath }}</div>
      <div class="text-output" v-if="directoryPath">{{ fileCount }} files</div>
    </div>

    <h1>TimeLapseTidy</h1>

    <!-- List of action buttons generated depending on the current status -->
    <div class="action-buttons">
      <button v-for="(button, index) in visibleActionBarButtons" :key="index" class="btn" :class="button.class"
        :disabled="button.disabled" @click="this.$emit(button.event)">
        {{ button.label }}
      </button>
    </div>
  </div>
</template>

<script>
import { useAppStore } from '../stores/appStore';

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
    visibleActionBarButtons() { return this.actionBarButtons.filter((button) => button.visible); },

    /**
     * List of action buttons, describing when which button should be generated and what it should do
     * @returns {array}
     */
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
          visible: (this.status === "confirmationDeleteFlagged" && this.flaggedCount > 0) || this.status === "confirmationDeleteHalf",
          disabled: false,
          event: 'cancelResult',
          class: "btn-primary",
        },
      ];
    },

    /**
     * Determines whether the start button should be clickabl
     * @returns {boolean}
     */
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
    /**
     * Lets the user select a source directory
     * @returns {void}
     */
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

<style scoped lang="stylus">
  // action bar Styles
  .action-bar
    position relative
    display grid
    grid-template-areas "select headline" "actions actions"
    grid-template-columns auto min-content
    grid-template-rows auto
    background-color colorPalette.actionBarBG
    row-gap buttonGap
    padding buttonGap * 2 buttonGap * 4 buttonGap * 2 buttonGap * 4

    .select-button
    .action-buttons
      grid-area select
      display flex
      gap buttonGap
      align-items center
      &.action-buttons
        grid-area actions

    h1
      grid-area headline
      margin 0
      font-size 2rem
      color colorPalette.font
</style>
