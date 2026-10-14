@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
title Smart Garden Mobile - Expo dev server

rem =====================================================================
rem  Запуск мобільного застосунку Smart Garden (Expo + Metro)
rem  Порти: Metro 8081, API 3001 (Docker).
rem  Відкрийте http://localhost:8081 у браузері або відскануйте QR у Expo Go.
rem =====================================================================

cd /d "%~dp0"

if not exist "node_modules\expo" (
  echo [1/4] Встановлення залежностей ^(pnpm install^)...
  call pnpm install
  if errorlevel 1 (
    echo ПОМИЛКА: не вдалося встановити залежності.
    pause
    exit /b 1
  )
) else (
  echo [1/4] Залежності вже встановлені. Пропускаю.
)

echo [2/4] Збірка workspace-пакетів ^(types, validation, api-client^)...
call pnpm --filter @smart-garden/types build
call pnpm --filter @smart-garden/validation build
call pnpm --filter @smart-garden/api-client build
if errorlevel 1 (
  echo ПОМИЛКА: не вдалося зібрати workspace-пакети.
  pause
  exit /b 1
)

echo [3/4] Перевірка Docker-бекенду ^(API на 3001^)...
docker ps --format "{{.Names}}" | findstr /i "smart-garden-api" >nul 2>&1
if errorlevel 1 (
  echo Docker-контейнери не запущені. Спробую запустити...
  where docker >nul 2>&1
  if errorlevel 1 (
    echo ПОМИЛКА: Docker не знайдено в PATH. Бекенд недоступний.
    echo Ви все одно можете переглянути інтерфейс, але вхід не працюватиме.
  ) else (
    if exist "..\docker-compose.yml" (
      docker compose -f ..\docker-compose.yml up -d
    ) else if exist "docker-compose.yml" (
      docker compose -f docker-compose.yml up -d
    ) else (
      echo ПОПЕРЕДЖЕННЯ: docker-compose.yml не знайдено поруч. Пропускаю запуск бекенду.
    )
  )
) else (
  echo Бекенд вже запущений.
)

echo [4/4] Запуск Metro ^(експорт на http://localhost:8081^)...
echo.
echo ---------------------------------------------------------------
echo  Відкрийте у браузерi:  http://localhost:8081
echo  Для телефона: скануйте QR-код у застосунку Expo Go.
echo  Щоб зупинити: натисніть Ctrl+C у цьому вікні.
echo ---------------------------------------------------------------
echo.

call pnpm exec expo start --port 8081
