# SmartGarden — сервер (API) + мобільний додаток в одному проєкті

Усе знаходиться в папці `SmartGardenMobile` (без сайту та без Docker). Залежність від сторонніх папок відсутня.

## Структура
* `app/`, `src/` — мобільний додаток (Expo / React Native)
* `server/` — бекенд API (NestJS + Prisma)
* `packages/` — спільні типи, валідація та API-клієнт

---

## 1. Підключення нової бази даних у хмарі (Neon — безкоштовно)
1. Зареєструйтеся на **https://neon.tech** та створіть проєкт `SmartGarden`.
2. Скопіюйте `DATABASE_URL` (`postgresql://...@...neon.tech/neondb?sslmode=require`).
3. Вставте його у **`server\.env`** у рядок `DATABASE_URL=...`.
4. Накотіть таблиці та каталог культур (94 культури):
   ```powershell
   pnpm --filter @smart-garden/api exec prisma migrate deploy
   pnpm --filter @smart-garden/api exec prisma db seed
   ```

---

## 2. Запуск локально на ПК (без Docker і без сайту)
1. Запустіть **`Запустити API.bat`** — сервер підніметься на `http://localhost:3001`.
2. У кореневому **`.env`** залиште `EXPO_PUBLIC_API_URL=` порожнім.
3. Запустіть додаток (`Запустити Smart Garden Mobile.bat` або `npm start`).

---

## 3. Деплой API в хмару (Render) та збірка `.apk`
1. Завантажте репозиторій на GitHub.
2. На **https://render.com** виберіть **New -> Blueprint** — Render автоматично підхопить `render.yaml` і розгорне `server/`.
3. Впишіть адресу задеплоєного API у **`.env`**:
   ```env
   EXPO_PUBLIC_API_URL=https://smart-garden-api.onrender.com
   ```
4. Зберіть `.apk` для Android:
   ```powershell
   npm i -g eas-cli
   eas login
   eas build -p android --profile preview
   ```

