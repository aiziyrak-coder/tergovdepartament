import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const openrouterKey = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || '';
    const groqKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY || '';
    const geminiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

    console.log('🔐 Vite Build - API Key Status:');
    console.log('   Mode:', mode);
    console.log('   OPENROUTER_API_KEY:', openrouterKey ? '✅ Found' : '❌ NOT FOUND');
    console.log('   GROQ_API_KEY:', groqKey ? '✅ Found' : '❌ NOT FOUND');
    console.log('   GEMINI_API_KEY:', geminiKey ? '✅ Found' : '❌ NOT FOUND (audio will use Groq fallback)');

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
            'process.env.OPENROUTER_API_KEY': JSON.stringify(openrouterKey),
            'process.env.GROQ_API_KEY': JSON.stringify(groqKey),
            'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
    };
});
