@echo off
title Smart Garden - Android Emulator
echo Запуск Android-емулятора Pixel 10 Pro XL...
start "" "%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe" -avd Pixel_10_Pro_XL
exit
