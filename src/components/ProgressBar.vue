<template>
    <div class="progress-bar-container">
      <canvas ref="progressCanvas"></canvas>
    </div>
  </template>
  
  <script>
  export default {
    name: 'ProgressBar',
    props: {
        imageStatuses: Array,
        imageBrightnesses: Array,
        imagesTotal: Number,
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
            lastBarCount: -1,
        }
    },
    mounted() {
        const canvas = this.$refs.progressCanvas;
        const context = canvas.getContext("2d");
        this.canvas = canvas;
        this.ctx = context;
        
        if (!this.listenersSet) { window.addEventListener('resize', this.updateProgressBarDimensions); }
        
        this.updateProgressBarDimensions();
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

        processNewData() {
            this.barData = [];
            this.barWidth = this.canvas.width / this.imagesTotal;
            let luminosity = 50;

            if (this.imagesTotal <= this.canvas.width) {
                for (let i = 0; i <= this.imageStatuses.length; i++) {
                    if (this.imageStatuses[i] === 'passed') {
                        luminosity = 25 + (this.imageBrightnesses[i] / 2);
                        this.barData.push(`hsl(${ this.huePassed }, 100%, ${ luminosity }%)`);
                    } else if (this.imageStatuses[i] === 'failed') {
                        luminosity = 25 + (this.imageBrightnesses[i] / 2);
                        this.barData.push(`hsl(${ this.hueFailed }, 100%, ${ luminosity }%)`);
                    }
                }

                this.drawProgressBar();
            } else {
                let barCounter = 0;
                let barAverage = 0;
                let brightnessAverage = [];
                for (let i = 0; i <= this.imageStatuses.length; i++) {
                    if (this.imageStatuses[i] === 'passed') {
                        barAverage += 1;
                        brightnessAverage.push(this.imageBrightnesses[i]);
                    } else if (this.imageStatuses[i] === 'failed') {
                        barAverage -= 1;
                        brightnessAverage.push(this.imageBrightnesses[i]);
                    }
                    barCounter++;

                    if (barCounter * this.barWidth > 1) {
                        if (barAverage >= 0) {
                            luminosity = 25 + ((brightnessAverage.reduce((acc, curr) => acc + curr, 0)) / brightnessAverage.length) / 2;
                            this.barData.push(`hsl(${ this.huePassed }, 100%, ${ luminosity }%)`);
                        } else {
                            luminosity = 25 + ((brightnessAverage.reduce((acc, curr) => acc + curr, 0)) / brightnessAverage.length) / 2;
                            this.barData.push(`hsl(${ this.hueFailed }, 100%, ${ luminosity }%)`);
                        }

                        barCounter = 0;
                        barAverage = 0;
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

            for (let i = 0; i <= this.barData.length; i++) {
                this.ctx.fillStyle = this.barData[i];
                this.ctx.fillRect(barWidth * i, 0, barWidth, this.canvas.height);
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
    background-color #444444
    height 100%
  </style>