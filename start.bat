@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 Запуск Tez Jumush приложения...
echo.

:: Проверка Docker
echo 📋 Проверка Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker не установлен или не запущен!
    echo.
    echo 🔧 Попытка запуска Docker Desktop...
    
    :: Попытка запуска Docker Desktop
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" >nul 2>&1
    
    echo ⏳ Ожидание запуска Docker Desktop (это может занять 1-2 минуты)...
    timeout /t 30 /nobreak >nul
    
    :: Повторная проверка
    docker --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Docker Desktop не удалось запустить автоматически!
        echo.
        echo 📋 Ручной запуск:
        echo    1. Откройте Docker Desktop из меню Пуск
        echo    2. Дождитесь полного запуска (иконка в трее станет зеленой)
        echo    3. Запустите start.bat снова
        echo.
        echo 🔗 Скачать Docker Desktop: https://www.docker.com/products/docker-desktop/
        pause
        exit /b 1
    )
)
echo ✅ Docker найден и работает

:: Проверка состояния Docker daemon
echo 🔍 Проверка состояния Docker daemon...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ Docker daemon не отвечает, ожидание...
    timeout /t 10 /nobreak >nul
    
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Docker daemon недоступен!
        echo    Убедитесь, что Docker Desktop полностью запущен
        pause
        exit /b 1
    )
)
echo ✅ Docker daemon работает

:: Проверка Docker Compose
echo 📋 Проверка Docker Compose...
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose не найден!
    echo    Установите Docker Compose или используйте 'docker compose'
    pause
    exit /b 1
)
echo ✅ Docker Compose найден

:: Остановка существующих контейнеров
echo.
echo 🧹 Очистка предыдущих контейнеров...
docker-compose down >nul 2>&1

:: Удаление неиспользуемых образов (опционально)
echo 🗑️ Очистка неиспользуемых образов...
docker image prune -f >nul 2>&1 || echo ⚠️ Не удалось очистить образы (это нормально)

:: Сборка и запуск контейнеров
echo.
echo 🔨 Сборка и запуск контейнеров...
docker-compose up -d --build

if %errorlevel% neq 0 (
    echo ❌ Ошибка при запуске контейнеров!
    echo.
    echo 📋 Проверка логов:
    docker-compose logs
    pause
    exit /b 1
)

echo ✅ Контейнеры запущены

:: Ожидание готовности сервисов
echo.
echo ⏳ Ожидание готовности сервисов...
timeout /t 5 /nobreak

:: Проверка состояния контейнеров
echo 📊 Проверка состояния контейнеров...
docker-compose ps

:: Проверка доступности API
echo.
echo 🔍 Проверка доступности API...
for /l %%i in (1,1,30) do (
    powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:8000/health' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Backend API доступен
        goto :api_ready
    )
    echo Ожидание API... (%%i/30)
    timeout /t 2 /nobreak >nul
)

echo ⚠️ Backend API не отвечает, но контейнеры запущены

:api_ready
echo.
echo ✅ Приложение запущено!
echo.
echo 🌐 Доступные сервисы:
echo    📱 Frontend (Expo): http://localhost:19000
echo    🔧 Backend API: http://localhost:8000
echo    📚 API Docs: http://localhost:8000/docs
echo    🗄️ PostgreSQL: localhost:5432
echo    🔴 Redis: localhost:6379
echo.
echo 📱 Для тестирования на телефоне:
echo    1. Установите Expo Go из App Store/Google Play
echo    2. Откройте http://localhost:19000 в браузере
echo    3. Отсканируйте QR-код в Expo Go
echo.
echo 🛠️ Полезные команды:
echo    - Остановить: docker-compose down
echo    - Перезапустить: docker-compose restart
echo    - Логи: docker-compose logs -f
echo    - Статус: docker-compose ps
echo.
echo Нажмите любую клавишу для просмотра логов (Ctrl+C для выхода)...
pause >nul

:: Показ логов
echo.
echo 📋 Логи приложения:
echo ========================================
docker-compose logs -f
