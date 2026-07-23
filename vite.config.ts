import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const openaiKey =
        env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        env.VITE_OPENAI_API_KEY ||
        '';
    const loginUser = env.LOGIN_USER || process.env.LOGIN_USER || 'admin';
    const loginPassword = env.LOGIN_PASSWORD || process.env.LOGIN_PASSWORD || '123';

    console.log('🔐 Vite Build - API Key Status:');
    console.log('   Mode:', mode);
    console.log('   OPENAI_API_KEY:', openaiKey ? '✅ Found (ChatGPT / GPT-4o)' : '❌ NOT FOUND — .env ga qo\'ying');
    console.log('   Models: gpt-4o · whisper-1 · dall-e-3');
    console.log('   Proxy: /api/openai → https://api.openai.com');

    return {
        server: {
            port: 3000,
            host: '0.0.0.0',
            hmr: {
                host: 'localhost',
                port: 3000,
            },
            proxy: {
                '/api/openai': {
                    target: 'https://api.openai.com',
                    changeOrigin: true,
                    secure: true,
                    rewrite: (p) => p.replace(/^\/api\/openai/, ''),
                    configure: (proxy) => {
                        proxy.on('proxyReq', (proxyReq) => {
                            if (openaiKey) {
                                proxyReq.setHeader('Authorization', `Bearer ${openaiKey}`);
                            }
                        });
                    },
                },
            },
        },
        preview: {
            port: 3000,
            host: '0.0.0.0',
            proxy: {
                '/api/openai': {
                    target: 'https://api.openai.com',
                    changeOrigin: true,
                    secure: true,
                    rewrite: (p) => p.replace(/^\/api\/openai/, ''),
                    configure: (proxy) => {
                        proxy.on('proxyReq', (proxyReq) => {
                            if (openaiKey) {
                                proxyReq.setHeader('Authorization', `Bearer ${openaiKey}`);
                            }
                        });
                    },
                },
            },
        },
        plugins: [tailwindcss(), react()],
        define: {
            'process.env.LOGIN_USER': JSON.stringify(loginUser),
            'process.env.LOGIN_PASSWORD': JSON.stringify(loginPassword),
            __OPENAI_CONFIGURED__: JSON.stringify(Boolean(openaiKey)),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
    };
});
