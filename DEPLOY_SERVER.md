# Serverda yangilash (tergov.cdcgroup.uz)

GitHubga push qilingandan keyin serverda quyidagi buyruqlarni ketma-ket bajaring.

## 1. Serverni SSH orqali ulang

```bash
ssh root@tergov.cdcgroup.uz
# yoki
ssh your_user@SERVER_IP
```

## 2. Loyiha papkasiga o‘ting

```bash
cd /var/www/tergov
# Agar boshqa joyda clone qilgan bo‘lsangiz, o‘sha papkaga o‘ting
```

## 3. GitHubdan yangi o‘zgarishlarni oling

```bash
git pull origin main
```

## 4. O‘zgarishlar bo‘lsa, dependency o‘rnating

```bash
npm ci
# yoki
npm install
```

## 5. Production build yarating

```bash
npm run build
```

## 6. Nginx ishlatayotgan bo‘lsangiz

Build chiqishi `dist/` papkada. Nginx `root` shu papkaga yo‘naltirilgan bo‘lishi kerak, masalan:

```nginx
server {
    server_name tergov.cdcgroup.uz;
    root /var/www/tergov/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # OpenAI API proxy (Virtual Murabbiy, Bayonnoma, Whisper, TTS)
    location /api/openai/ {
        proxy_pass https://api.openai.com/;
        proxy_ssl_server_name on;
        proxy_set_header Host api.openai.com;
        proxy_set_header Authorization "Bearer YOUR_OPENAI_API_KEY";
        proxy_read_timeout 120s;
    }

    # ... ssl va boshqalar
}
```

`YOUR_OPENAI_API_KEY` o‘rniga `.env` dagi haqiqiy kalitni qo‘ying yoki `env` fayl orqali o‘qing.

Agar `root` boshqa joyda bo‘lsa, `dist` ichidagi fayllarni o‘sha joyga nusxalang:

```bash
sudo cp -r dist/* /usr/share/nginx/html/tergov/
# yoki o‘zingizning root papkangizga
```

## 7. Nginxni qayta yuklash (kerak bo‘lsa)

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Bitta qatorda (copy-paste uchun)

```bash
cd /var/www/tergov && git pull origin main && npm ci && npm run build && sudo systemctl reload nginx
```

---

## .env (API kalit) eslatma

Agar serverda `.env` yoki `.env.local` ishlatilsa, `git pull` ularni o‘zgartirmaydi. API kalitni alohida saqlang va kerak bo‘lsa qo‘lda tahrirlang:

```bash
# .env faylini yaratish yoki tahrirlash
nano /var/www/tergov/.env
# Keyingi qator qo'shing:
OPENAI_API_KEY=sk-your_key_here
```

Build dan keyin env o‘qiladi; Vite loyihalarda `.env` build vaqtida ishlatiladi.

Eslatma: API kalitingizni hech qachon GitHub kabi ommaviy repozitoriyalarga commit qilmang.

## Yangilangan deploy buyrug'i (API kalit bilan)

Serverga yangilash va API kalitni qo'llash uchun quyidagi ketma-ketlikni bajaring:

```bash
# 1. GitHubga push qiling
# 2. Serverga kirin va yangilang
ssh root@tergov.cdcgroup.uz

# 3. Loyiha papkasiga o'ting
cd /var/www/tergov

# 4. API kalitni o'rnating (aslini kiritishni unutmang)
nano .env
# Quyidagilarni kiriting:
# OPENAI_API_KEY=sk-your_key_here

# 5. Loyihadan yangiliklarni oling
git pull origin main

# 6. Dependency'ni o'rnating va build qiling
npm ci && npm run build

# 7. Nginxni qayta yuklang
sudo systemctl reload nginx
```

Yoki quyidagi bitta buyruqdan foydalaning (faqat agar .env allaqachon to'g'ri sozlangan bo'lsa):

```bash
cd /var/www/tergov && git pull origin main && npm ci && npm run build && sudo systemctl reload nginx
```
