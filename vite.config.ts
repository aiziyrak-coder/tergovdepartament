import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';

export default defineConfig(({ mode }) => {
    // Try to read .env file directly
    let apiKey = '';
    let loginUser = 'admin';
    let loginPassword = '123';
    
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const envMatch = envContent.match(/GEMINI_API_KEY\s*=\s*(.+)/);
            const userMatch = envContent.match(/LOGIN_USER\s*=\s*(.+)/);
            const passMatch = envContent.match(/LOGIN_PASSWORD\s*=\s*(.+)/);
            
            if (envMatch) apiKey = envMatch[1].trim();
            if (userMatch) loginUser = userMatch[1].trim();
            if (passMatch) loginPassword = passMatch[1].trim();
        }
    } catch (e) {
        console.warn('Could not read .env file:', e);
    }
    
    // Fallback to loadEnv if direct read failed
    if (!apiKey) {
        const env = loadEnv(mode, process.cwd(), '');
        apiKey = env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    }
    
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
        'process.env.LOGIN_USER': JSON.stringify(loginUser),
        'process.env.LOGIN_PASSWORD': JSON.stringify(loginPassword),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
