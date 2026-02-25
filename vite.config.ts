import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

    console.log('🔐 Vite Build - API Key Status:');
    console.log('   Mode:', mode);
    console.log('   .env GEMINI_API_KEY:', apiKey ? '✅ Found' : '❌ NOT FOUND');

    return {
        server: {
            port: 3000,
            host: '0.0.0.0',
            hmr: {
                host: 'localhost',
                port: 3000,
            },
        },
        plugins: [tailwindcss(), react()],
        define: {
            'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
    };
});
