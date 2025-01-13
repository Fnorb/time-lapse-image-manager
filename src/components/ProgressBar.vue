<template>
    <div class="progress-bar-container">
      <canvas ref="progressCanvas"></canvas>
    </div>
  </template>
  
  <script>
  export default {
    name: 'ProgressBar',
    props: {
        imageStatuses: Array, // Accept the statuses array from the parent
        imagesTotal: Number, // Accept the statuses array from the parent
    },
    watch: {
        imageStatuses() {
            console.log("IMAGE STATUS CHANGED")
            this.drawProgressBar(); // Re-draw whenever the status changes
        },
    },
    mounted() {
        console.log("init progress")
        console.log("imagecount: ", this.imagesTotal)
        const canvas = this.$refs.progressCanvas;
        const context = canvas.getContext("2d");

        // Set the canvas resolution
        const container = canvas.parentElement;
        canvas.width = this.imagesTotal; // 1 pixel per image
        canvas.height = container.offsetHeight; // Full container height
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Clear and prepare the canvas
        context.fillStyle = "#cccccc"; // Grey for unprocessed
        context.fillRect(0, 0, canvas.width, canvas.height);

        console.log("MOUNTED, DRAWING")
        this.drawProgressBar(); // Draw initially
    },

    methods: {
        drawProgressBar() {
            const canvas = this.$refs.progressCanvas;

            // Set the canvas resolution
            const container = canvas.parentElement;
            canvas.width = this.imagesTotal; // 1 pixel per image
            canvas.height = container.offsetHeight - 80; // Full container height

            const ctx = canvas.getContext('2d');
            const rectHeight = canvas.height;

            let currentStatus = this.imageStatuses[0];
            let currentLength = 1;
            let xPos = 0;

            for (let i = 1; i <= this.imageStatuses.length; i++) {
                if (this.imageStatuses[i] === currentStatus) {
                    currentLength++;
                } else {
                    ctx.fillStyle = this.getColorForStatus(currentStatus);
                    ctx.fillRect(xPos, 0, currentLength, rectHeight);
                    xPos += currentLength;
                    currentStatus = this.imageStatuses[i];
                    currentLength = 1;
                }
            }

            // Add highlight rectangle
            this.addHighlight(ctx, xPos, canvas.width, rectHeight);
        },

        addHighlight(ctx, xPos, canvasWidth, rectHeight) {
            // Light-up rectangle
            const highlightWidth = Math.floor(canvasWidth * 0.05);
            const gradientLight = ctx.createLinearGradient(xPos - highlightWidth, 0, xPos, 0);
            gradientLight.addColorStop(0, 'rgba(255, 255, 255, 0)');
            gradientLight.addColorStop(1, 'rgba(255, 255, 255, .3)');
            ctx.fillStyle = gradientLight;
            ctx.fillRect(Math.max(0, xPos - highlightWidth), 0, highlightWidth, rectHeight);

            // Shadow rectangle
            const gradientShadow = ctx.createLinearGradient(xPos, 0, xPos + highlightWidth / 3, 0);
            gradientShadow.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
            gradientShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradientShadow;
            ctx.fillRect(xPos, 0, highlightWidth / 3, rectHeight);
        },

        getColorForStatus(status) {
        switch (status) {
            case 'passed':
            return 'green';
            case 'failed':
            return 'red';
            case 'unprocessed':
            return 'grey';
            default:
            return 'grey';
        }
        },
    },
  };
  </script>
  
  <style scoped lang="stylus">
  .progress-bar-container
    width 100%
    height 100%
  
  canvas
    display block
    height 100%
    width 100%
    background-color #444444
  </style>