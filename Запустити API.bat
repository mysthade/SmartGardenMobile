@echo off
cd /d "%~dp0"
powershell -NoExit -Command "Write-Host 'Smart Garden API starting on http://localhost:3001 ...' -ForegroundColor Green; pnpm --filter @smart-garden/api exec prisma generate; if ($LASTEXITCODE -eq 0) { pnpm --filter @smart-garden/api dev }"
