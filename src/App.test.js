import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import App from '../src/App.vue';

// Mock Electron API (Including onImageStatus to avoid errors)
global.window = {
  electronAPI: {
    processImages: vi.fn().mockResolvedValue({ success: true }),
    onImageStatus: vi.fn(), // Added to prevent TypeError
  },
};

describe('App.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); // Initialize Pinia store
  });

  test('renders without crashing', () => {
    const wrapper = mount(App, {
      global: {
        stubs: ['ActionBar', 'SettingsView', 'ProgressBar'], // Stub child components
      },
    });

    expect(wrapper.exists()).toBe(true);
  });
});
