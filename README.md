# Image Processing App -TimeLapse Tidy

## To-Do List
- [ ] Improve renaming function to handle existing file conflicts.
- [ ] Add parallel processing for better performance.
    - [ ] Optimize progress bar for non-linear workflows.
- [ ] Add filter that finds images with unusual contrast values.
- [ ] Support additional image formats (e.g., PNG, BMP).

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
- **App.vue**: Frontend
- **ProgressBar.vue**: Progress Bar component for visual feedback.
- **global.styl**: styles for the App.vue
- **fonts.style**: Font importing.
- **index.js**: Electron backend for image processing, filtering, renaming and deleting.
- **.env**: Various variables to configure the backend.
- **README.MD**: This file.

## Technologies Used
- **Vue.js**
- **Electron**
- **Sharp**
- **Stylus**



## License
This project is licensed under the MIT License.