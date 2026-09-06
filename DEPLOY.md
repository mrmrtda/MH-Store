# MH Store — نشر سريع

## Render / Railway / VPS
- Runtime: Node.js 20+
- Build/Install: `npm install`
- Start: `npm start`
- Port: استخدم `PORT` الذي توفره المنصة، والسيرفر يقرأه تلقائياً.

## Environment variables
ضع:
- `NODE_ENV=production`
- `ADMIN_USER=admin`
- `ADMIN_PASS=` كلمة مرور قوية جداً
- `PORT=` اختياري

## Persistent storage
المشروع يستخدم SQLite داخل `data/mh.sqlite` ويخزن الصور داخل `uploads/`.
عند النشر على منصة ذات filesystem مؤقت، فعّل Persistent Disk/Volume للمجلدين:
- `/app/data`
- `/app/uploads`

للتوسع الحقيقي متعدد الخوادم، انقل قاعدة البيانات إلى PostgreSQL والصور إلى Object Storage/CDN.

## WhatsApp
ابحث داخل `public/index.html` عن رقم WhatsApp placeholder واستبدله برقم المتجر بصيغة دولية بدون +، أو اربطه لاحقاً بـ WhatsApp Business API.

## الدفع اليدوي
المتجر حالياً يسجل:
- ZainCash + رفع الإيصال
- تحويل حساب/بطاقة + رفع الإيصال
- WhatsApp

لا توجد معالجة Visa/Mastercard تلقائية في هذه النسخة. للدفع المباشر بالبطاقة، اربط Payment Gateway معتمد عبر hosted checkout/API وwebhook.

## أمان قبل الإطلاق
- غيّر ADMIN_PASS.
- فعّل HTTPS.
- لا تضع بيانات البطاقات أو CVV داخل الموقع.
- اعمل نسخاً احتياطية لقاعدة البيانات.
- استخدم دومين المتجر.
