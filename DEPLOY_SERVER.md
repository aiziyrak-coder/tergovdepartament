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
    # ... ssl, proxy va boshqalar
}
```

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

Agar serverda `.env` yoki `.env.production` ishlatilsa, `git pull` ularni o‘zgartirmaydi. API kalitni alohida saqlang va kerak bo‘lsa qo‘lda tahrirlang:

```bash
nano .env.production
# GEMINI_API_KEY=... yoki API_KEY=...
```

Build dan keyin env o‘qiladi; Vite loyihalarda `.env.production` build vaqtida ishlatiladi.
