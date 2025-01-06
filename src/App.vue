<template>
  <div id="app">
    <h1>Welcome to TimeLapseImageManager</h1>
    <div class="container mt-5">
      <!-- Underlined Question Mark Icon with Tooltip -->
      <span
        class="question-mark"
        data-bs-toggle="tooltip"
        title="This is some dummy text for the info tooltip."
      >
        <u>?</u>
      </span>

      <p>Hover over the question mark for more information.</p>

      <!-- Button to open file dialog -->
      <button class="btn btn-primary mt-4" @click="pickDirectory">
        Pick Source Directory
      </button>

      <!-- Display the number of files -->
      <div v-if="fileCount !== null" class="mt-4">
        <p>{{ fileCount }} files located.</p>
      </div>
    </div>
  </div>
</template>

<script>
// Ensure that bootstrap's JavaScript is imported
import 'bootstrap/dist/css/bootstrap.min.css';
import * as bootstrap from 'bootstrap';

export default {
  name: 'App',
  data() {
    return {
      fileCount: null, // To store the number of files in the directory
    };
  },
  mounted() {
    // Initialize all tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  },
  methods: {
    async pickDirectory() {
      try {
        // Communicate with the main process to open the directory picker
        const fileCount = await window.electronAPI.openDirectory();
        this.fileCount = fileCount; // Set the file count to display
      } catch (error) {
        console.error('Failed to pick directory or count files', error);
      }
    },
  },
};
</script>

<style>
/* Add custom styles here */
</style>