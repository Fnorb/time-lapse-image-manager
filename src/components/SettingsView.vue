<template>
  <div class="settings-view">
    <div class="container">
      <div>
        <h3>Settings</h3>

        <!-- Minimum brightness selection -->
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="minBrightnessOption"
            :checked="settings.minBrightnessChecked" :disabled="status === 'processing'"
            @change="onCheck($event.target.checked, 'min')" />
          <label class="form-check-label" for="minBrightnessOption">
            Remove images with brightness below
          </label>

          <input type="number" v-model="settings.minBrightnessValue" :disabled="status === 'processing'"
            @blur="validateField('minBrightness')" class="form-control-inline"
            :class="{ error: validationErrors.minBrightness }" @change="validateAllFields" />
          <span class="brightness-value">(0-100)</span>
          <span class="info-mark" v-tooltip="'Finds images that are too dark. 0 = black, 100 = white'">?</span>
        </div>

        <!-- Maximum brightness selection -->
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="maxBrightnessOption"
            :checked="settings.maxBrightnessChecked" :disabled="status === 'processing'"
            @change="onCheck($event.target.checked, 'max')" />
          <label class="form-check-label" for="maxBrightnessOption">
            Remove images with brightness above
          </label>
          <input type="number" v-model="settings.maxBrightnessValue" :disabled="status === 'processing'"
            @blur="validateField('maxBrightness')" class="form-control-inline"
            :class="{ error: validationErrors.maxBrightness }" @change="validateAllFields" />
          <span class="brightness-value">(0-100)</span>
          <span class="info-mark" v-tooltip="'Finds images that are too bright. 0 = black, 100 = white'">?</span>
        </div>
      </div>

      <!-- Fast mode option -->
      <div class="form-check">
        <input class="form-check-input" type="checkbox" id="fast" :checked="settings.fast"
          :disabled="status === 'processing'" @change="appStore.setSettings({ fast: $event.target.checked })" />
        <label class="form-check-label" for="fast">
          Fast mode
        </label>
        <span class="info-mark" v-tooltip="'Increases processing speed by sacrificing accuracy'">?</span>
      </div>
    </div>
  </div>
</template>

<script>
import { useAppStore } from '../stores/appStore';

export default {
  name: 'ActionBar',

  computed: {
    status() { return useAppStore().status; },
    validated() { return useAppStore().validated; },
    settings() { return useAppStore().settings; },
  },

  data() {
    return {
      appStore: useAppStore(),
      validationErrors: {
        minBrightness: false,
        maxBrightness: false,
      },
    }
  },

  methods: {
    /**
     * Update on checkbox toggle
     * @param {boolean} checked
     * @param {string} direction - 'min' or 'max' depending on the checked checkbox
     * @returns {void}
     */
    onCheck(checked, direction) {
      if (direction === 'min') {
        this.appStore.setSettings({ minBrightnessChecked: checked });
      } else if (direction === 'max') {
        this.appStore.setSettings({ maxBrightnessChecked: checked });
      }

      this.validateAllFields();
    },

    /**
     * Validates the values of all min and max filters
     * @returns {void}
     */
    validateAllFields() {
      const minBrightnessValid =
        !this.settings.minBrightnessChecked ||
        (this.settings.minBrightnessChecked && (this.settings.minBrightnessValue >= 0 && this.settings.minBrightnessValue <= 100));

      const maxBrightnessValid =
        !this.settings.maxBrightnessChecked ||
        (this.settings.maxBrightnessChecked && (this.settings.maxBrightnessValue >= 0 && this.settings.maxBrightnessValue <= 100));

      this.validated = minBrightnessValid && maxBrightnessValid;
      this.appStore.setValidated(minBrightnessValid && maxBrightnessValid);
    },

    /**
     * Validates the values of a specific field
     * @param {string} field - 'minBrightness' or 'maxBrightness'
     * @returns {void}
     */
    validateField(field) {
      const value = this.settings[field];
      const isChecked = this.settings[`${field}Check`];

      if (isChecked && (value < 0 || value > 100 || value === null || value === undefined)) {
        this.validationErrors[field] = true;
      } else {
        this.validationErrors[field] = false;
      }
    },
  },
};
</script>

<style scoped lang="stylus">
  // Settings View Styles
  .settings-view
    grid-area settings
    height 100%
    box-shadow 0px 10px 10px rgba(0, 0, 0, 0.1) inset
    position relative

    h3 
      margin-top 0
</style>