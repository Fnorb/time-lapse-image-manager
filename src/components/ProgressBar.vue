<template>
    <div class="progress-bar-container">
        <canvas ref="progressCanvas"></canvas>
        <div class="display"  :class="{ 'completed': imagesTotal === imageBrightnesses.length }" v-if="showDisplay">
            <div>Processed: {{ imageStatuses.length }} / {{ imagesTotal }}</div>
            <div>Passed: <span class="passed">{{ passedCount }}</span></div>
            <div>Failed: <span class="failed">{{ failedCount }}</span></div>
            <div v-if="this.timeAverage && imagesTotal != imageBrightnesses.length">Time left: <span class="time">{{ timeLeft }}</span></div>
        </div>
    </div>
</template>
  
  <script>
  export default {
    name: 'ProgressBar',
    props: {
        imageStatuses: Array,
        imageBrightnesses: Array,
        imagesTotal: Number,
        showDisplay: {
            type: Boolean,
            default: true,
        }
    },
    watch: {
        imageStatuses() {
            this.processNewData();
        },
    },
    data() {
        return {
            canvas: null,
            ctx: null,
            listenersSet: false,
            updateCanvas: true,
            barData: [],
            barWidth: 0,
            huePassed: 120,
            hueFailed: 0,
            failedCount: -1,
            passedCount: -1,
            lastBarCount: -1,
            luminosityRange: 50,
            timeAverage: 0,
            timeLastFile: null,
        }
    },
    mounted() {
        const canvas = this.$refs.progressCanvas;
        const context = canvas.getContext("2d");
        this.canvas = canvas;
        this.ctx = context;
        
        if (!this.listenersSet) {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer); 
            resizeTimer = setTimeout(() => {
                this.updateProgressBarDimensions();
            }, 200); 
        });
        this.listenersSet = true; 
    }
        
        this.updateProgressBarDimensions();
    },

    computed: {
        timeLeft() {
            const ms = (this.imagesTotal - this.imageStatuses.length) * this.timeAverage;
            const days = Math.floor(ms / (24 * 60 * 60 * 1000)); // 1 day = 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
            const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)); // 1 hour = 60 minutes * 60 seconds * 1000 milliseconds
            const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000)); // 1 minute = 60 seconds * 1000 milliseconds
            const seconds = Math.floor((ms % (60 * 1000)) / 1000); // 1 second = 1000 milliseconds

            let timeString = '';
            if (days > 0) {
                timeString += `${days}d `;
            }
            if (hours > 0 || days > 0) {
                timeString += `${hours}h `;
            }
            if (minutes > 0 || hours > 0 || days > 0) {
                timeString += `${minutes}m `;
            }
            timeString += `${seconds}s`;

            return timeString.trim();
        },
    },

    methods: {
        updateProgressBarDimensions() {
            this.canvas.width = 0;
            this.canvas.height = 0;
            const container = this.canvas.parentElement;
            const contentHeight = container.offsetHeight
            const contentWidth = container.offsetWidth;
            this.canvas.height = contentHeight;
            this.canvas.width = contentWidth;
        },

        updateTime() {
            const now = Date.now();
            if (this.timeLastFile) {
                const diff = now - this.timeLastFile;
                this.timeAverage += (diff - this.timeAverage) / this.imageStatuses?.length;
            }
            this.timeLastFile = now;
        },

        processNewData() {
            this.updateTime();
            this.passedCount = 0;
            this.failedCount = 0;
            this.barData = [];
            this.barWidth = this.canvas.width / this.imagesTotal;
            let luminosity = 50;
            this.lastBarCount = -1;

            if (this.imagesTotal <= this.canvas.width) {
                for (let i = 0; i <= this.imageStatuses.length; i++) {
                    if (this.imageStatuses[i] === 'passed') {
                        this.passedCount++;
                        luminosity = 50 - (this.luminosityRange / 2) + ((this.imageBrightnesses[i] / 100) * this.luminosityRange);
                        this.barData.push(`hsl(${ this.huePassed }, 100%, ${ luminosity }%)`);
                    } else if (this.imageStatuses[i] === 'failed') {
                        this.failedCount++;
                        luminosity = 50 - (this.luminosityRange / 2) + ((this.imageBrightnesses[i] / 100) * this.luminosityRange);
                        this.barData.push(`hsl(${ this.hueFailed }, 100%, ${ luminosity }%)`);
                    }
                }

                this.drawProgressBar();
            } else {
                let barAverage = 0;
                let barSum = 0;
                let brightnessAverage = [];
                for (let i = 0; i <= this.imageStatuses.length; i++) {
                    if (this.imageStatuses[i] === 'passed') {
                        this.passedCount++;
                        barAverage += 1;
                        brightnessAverage.push(this.imageBrightnesses[i]);
                    } else if (this.imageStatuses[i] === 'failed') {
                        this.failedCount++;
                        barAverage -= 1;
                        brightnessAverage.push(this.imageBrightnesses[i]);
                    }
                    barSum += this.barWidth;

                    if (barSum >= 1) {
                        if (barAverage >= 0) {
                            luminosity = 50 - (this.luminosityRange / 2) + (brightnessAverage.reduce((acc, curr) => acc + curr, 0) / brightnessAverage.length) * (this.luminosityRange / 100);
                            this.barData.push(`hsl(${ this.huePassed }, 100%, ${ luminosity }%)`);
                        } else {
                            luminosity = 50 - (this.luminosityRange / 2) + (brightnessAverage.reduce((acc, curr) => acc + curr, 0) / brightnessAverage.length) * (this.luminosityRange / 100);
                            this.barData.push(`hsl(${ this.hueFailed }, 100%, ${ luminosity }%)`);
                        }

                        barAverage = 0;
                        barSum--;
                        brightnessAverage = [];
                    } 
                }

                if (this.barData.length > this.lastBarCount) {
                    this.lastBarCount = this.barData.length;
                    this.drawProgressBar();
                }
            }
        },

        drawProgressBar() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = "#444c"; 
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            let barWidth = this.barWidth;

            if (this.imagesTotal > this.canvas.width) { barWidth = 1; }

            for (let i = 0; i < this.barData.length; i++) {
                this.ctx.fillStyle = this.barData[i];
                this.ctx.fillRect(Math.ceil(barWidth * i), 0, Math.ceil(barWidth), this.canvas.height);
                if (this.imagesTotal === this.imageBrightnesses.length) {
                    // console.log("barWidth: ", barWidth, " canvas width: ", this.canvas.width, " data: ", this.barData.length, " rect: ", barWidth * i, 0, barWidth, this.canvas.height, ' with: ', i, this.barData[i])
                }
            }

            this.addHighlight(this.ctx, barWidth * this.barData.length, this.canvas.width, this.canvas.height);
        },

        addHighlight(ctx, xPos, canvasWidth, rectHeight) {
            const highlightWidth = Math.floor(canvasWidth * 0.05);

            const visibleStart = Math.max(0, xPos - highlightWidth);
            const visibleWidth = highlightWidth - (visibleStart - (xPos - highlightWidth));

            const gradientLight = ctx.createLinearGradient(
                xPos - highlightWidth,
                0,
                xPos,
                0
            );
            gradientLight.addColorStop(0, 'rgba(255, 255, 255, 0)');
            gradientLight.addColorStop(1, 'rgba(255, 255, 255, .5)');
            ctx.fillStyle = gradientLight;
            ctx.fillRect(visibleStart, 0, visibleWidth, rectHeight);

            const gradientShadow = ctx.createLinearGradient(
                xPos,
                0,
                xPos + highlightWidth / 3,
                0
            );
            gradientShadow.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
            gradientShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradientShadow;
            ctx.fillRect(xPos, 0, highlightWidth / 3, rectHeight);
        },
    },
  };
  </script>
  
 
<style scoped lang="stylus">
// ==============================
// Container for the progress bar
// ==============================
.progress-bar-container
  width 100%
  height 100%
  position relative

  canvas
    background-color #444444
    height 100%

// ==============================
// Display box that overlays the canvas
// ==============================
.display
    position absolute
    border-radius 10px
    top 20px
    left 20px
    background-color rgba(0, 0, 0, 0.5)
    color #ffffff
    padding 5px 30px
    transition top 0.5s

    &.completed
        top 60px

    .passed
        color rgb(0, 200, 0) // Green for passed
    .failed
        color rgb(200, 0, 0) // Red for failed
</style>