@echo off
chcp 65001 >nul
title Smart Garden - Android Emulator

set "EMU_DIR=%LOCALAPPDATA%\Android\Sdk\emulator"
set "AVD_NAME=Pixel_10_Pro_XL"
set "AVD_DIR=%USERPROFILE%\.android\avd\%AVD_NAME%.avd"

echo ===================================================
echo     Smart Garden - Android Emulator Launcher
echo ===================================================
echo.

tasklist /fi "imagename eq qemu-system-x86_64.exe" 2>nul | find /i "qemu" >nul
if not errorlevel 1 (
    echo [УВАГА] Емулятор %AVD_NAME% вже запущено у фоні!
    echo.
    echo 1 - Залишити як є (вийти)
    echo 2 - Примусово перезапустити (закрити завислий і запустити знову)
    echo.
    set /p choice="Оберіть дію (1 або 2, за замовчуванням 1): "
    if "%choice%"=="2" (
        echo Зупиняємо завислий процес...
        taskkill /f /im qemu-system-x86_64.exe >nul 2>&1
        taskkill /f /im emulator.exe >nul 2>&1
        timeout /t 2 >nul
        goto cleanup_and_start
    ) else (
        exit /b 0
    )
)

:cleanup_and_start
echo Очищення старих lock-файлів...
if exist "%AVD_DIR%\hardware-qemu.ini.lock" rmdir /s /q "%AVD_DIR%\hardware-qemu.ini.lock" >nul 2>&1
if exist "%AVD_DIR%\multiinstance.lock" del /f /q "%AVD_DIR%\multiinstance.lock" >nul 2>&1

echo Запуск емулятора %AVD_NAME%...
cd /d "%EMU_DIR%"
start "" "%EMU_DIR%\emulator.exe" -avd %AVD_NAME% -no-snapshot-load

echo.
echo [OK] Емулятор запускається! Вікно пристрою з'явиться за 10-30 секунд.
echo Зачекайте повного завантаження Android.
timeout /t 5 >nul
exit /b 0

