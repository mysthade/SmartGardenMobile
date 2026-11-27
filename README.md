# Smart Garden Mobile

Мобільний додаток на **Expo / React Native** для планування саду, розміщення рослин на грядках, обліку догляду, завдань, проблем, фотографій та врожаю. У цьому ж репозиторії містяться вбудований бекенд на **NestJS** (`server/`) і спільні пакети (`packages/`).

## Основні можливості

- **Сади та зони**: створення садів і зон (`BED`, `FIELD`, `GREENHOUSE`, `ORCHARD`, `FLOWERBED`, `OTHER`) з розмірами в метрах.
- **Візуальний редактор зон**: розміщення та перетягування рослин по сітці (`0.25 м`), масштабування, undo/redo, міні-карта, вільне розміщення по всій площі включно з крайніми верхніми та нижніми рядками.
- **Картка рослини**:
  - **Деталі та проблеми**: опис, статус, фіксація проблем.
  - **Догляд та завдання**: планування та відмітка виконання завдань догляду.
  - **Фотографії**: зйомка з камери або вибір із галереї, стиснення та збереження мініатюр, перегляд і видалення (до 2 фото на рослину).
- **Облік урожаю**: фіксація зборів, якості, приміток та перегляд запасів/підсумків.
- **Офлайн-підтримка**: визначення відсутності мережі, банери/екрани стану з'єднання та збереження токенів автентифікації без втрати сесії.

## Структура репозиторію

```text
SmartGardenMobile/
├── app/                   # Екрани та маршрути Expo Router
├── src/                   # Компоненти, хуки, Zustand-стори, API-клієнт, теми
│   ├── features/
│   │   ├── zone-editor/   # Редактор планування зон (Canvas, PlantMarker, store)
│   │   ├── plants/        # Вкладки рослини (Догляд, Завдання, Проблеми, Фотографії)
│   │   ├── harvests/      # Модалки та облік урожаю
│   │   └── network/       # Обробка офлайн-стану
│   └── lib/               # API-клієнт, resolveAssetUrl, форматування помилок
├── server/                # Вбудований NestJS + Prisma бекенд (@smart-garden/api)
│   ├── prisma/            # Схема БД та міграції
│   └── src/
│       ├── attachments/   # Ендпоінти вкладень (/attachments, /plants/:plantId/attachments)
│       └── storage/       # S3-сховище з автоматичним fallback на локальний диск (server/uploads)
├── packages/              # Спільні workspace-пакети
│   ├── api-client/        # @smart-garden/api-client
│   ├── types/             # @smart-garden/types
│   ├── validation/        # @smart-garden/validation (Zod-схеми та геометрія зон)
│   └── config/            # @smart-garden/config
├── Запустити API.bat      # Збірка та запуск локального API на Windows
└── Запустити додаток.bat  # Запуск Expo dev-сервера на Windows
```

## Вимоги

- **Node.js** 20+
- **pnpm** 9+
- База даних **PostgreSQL** (наприклад, Neon)
- Для запуску на телефоні: **Expo Go** (або Android-емулятор)

## Швидкий старт

### 1. Встановлення залежностей

```bash
pnpm install
```

### 2. Налаштування бекенду (`server/.env`)

Створіть `server/.env` на основі `server/.env.example` (якщо є) і вкажіть рядок підключення до PostgreSQL та секрети:

```env
NODE_ENV=development
API_PORT=3001
API_URL=http://localhost:3001
DATABASE_URL=postgresql://...
REDIS_URL=memory
AUTO_VERIFY_EMAIL=true
```

Застосуйте міграції Prisma та зберіть спільні пакети й сервер:

```bash
pnpm --filter @smart-garden/types build
pnpm --filter @smart-garden/validation build
pnpm --filter @smart-garden/api-client build
pnpm --filter @smart-garden/api exec prisma migrate deploy
pnpm --filter @smart-garden/api build
```

### 3. Запуск API

На Windows можна скористатися `Запустити API.bat` або командою:

```bash
pnpm --filter @smart-garden/api exec node dist/main.js
```

API слухає порт `3001` (`0.0.0.0:3001`). У мобільному додатку адреса сервера визначається автоматично з `hostUri` Expo (наприклад `http://192.168.0.104:3001` для фізичного телефону або `http://10.0.2.2:3001` для Android-емулятора), або задається через `EXPO_PUBLIC_API_URL`.

### 4. Запуск мобільного додатку

На Windows можна скористатися `Запустити додаток.bat` або командою:

```bash
npx expo start
```

## Завантаження фотографій і сховище

- Якщо налаштований S3/MinIO (`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`), сервер генерує presigned URLs для S3.
- Якщо S3/MinIO недоступний (або задано `STORAGE_DRIVER=local`), `StorageService` автоматично перемикається на локальне сховище в `server/uploads/` і видає підписані HMAC-SHA256 посилання (`/api/v1/storage/upload` та `/api/v1/storage/object`).
- Мобільний клієнт зчитує локальні `file://` / `content://` URI через `XMLHttpRequest` (`responseType = 'blob'`) та резолвить `localhost`-посилання через `resolveAssetUrl` на актуальний `API_BASE_URL`, щоб фото завантажувались і відображались на фізичному Android-пристрої.

## Перевірка та тести

```bash
# Тести мобільного додатку
npm test -- --no-coverage

# Перевірка типів TypeScript
npm run typecheck

# Перевірка ESLint
npm run lint

# Збірка бекенду
pnpm --filter @smart-garden/api build
```

