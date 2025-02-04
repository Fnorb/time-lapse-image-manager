# Image Processing App -TimeLapse Tidy

## To-Do List
- [ ] Add parallel processing for better performance.
    - [ ] Optimize progress bar for non-linear workflows.
- [ ] Add filter that finds images with unusual contrast values.

## Installation
1. Clone the repository: `git clone https://github.com/Fnorb/time-lapse-image-manager`
2. Install dependencies: `npm install`
3. Run the frontend: `npm run serve`
4. Start the Electron app: `npm run electron-start`

## Features
- Rename images to maintain sequence.
- Filter images by brightness range.
- Delete half of the images for faster processing.
- "Fast Mode" increases processing speed by sacrificing accuracy.

## How It Works
1. Select a folder containing images.
2. Start either the general rename / remove half of images process, or configure the image filter and run that by clicking on start.
3. In case of the latter, you'll get visual feedback and information on the brightness values of the images and which images fail or pass the filters.

## Important Files Overview:
- **index.js**: Electron backend for image processing, filtering, renaming and deleting
- **preload.js**: handles the communication between backend and frontend
- **vue.config.js**: general vue configuration file
- **.env**: variables to configure the backend
- **README.MD**: this file
- **/src/main.js**: frontend initialisation
- **/src/App.vue**: frontend
- **/src/stores/appStore.js**: Pinia store for handling cross-component data
- **/src/components/ProgressBar.vue**: progress Bar component for visual feedback
- **/src/components/SettingsView.vue**: settings component where users adjust filter settings
- **/src/components/ActionBar.vue**: component to handle the different action buttons and minor associated functions
- **/src/assets/styles/global.styl**: styles for the App.vue
- **/src/assets/styles/fonts.styl**: font importing
- **/src/assets/styles/theme.styl**: general theme settings such as colors and margins

## Technologies Used
- **Vue.js**
- **Electron**
- **Sharp**
- **Stylus**

## License
This project is licensed under the MIT License.