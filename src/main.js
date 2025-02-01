import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import FloatingVue from 'floating-vue'
import 'floating-vue/dist/style.css'

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(FloatingVue)
app.mount('#app');