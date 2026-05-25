@echo off
chcp 65001 >nul
title 健康守护者 · 演示启动器
cd /d "%~dp0"

echo.
echo  ============================================
echo    健康守护者 · 移动端演示启动器
echo  ============================================
echo.

REM 检查 Metro 是否已运行
curl -s -o nul --connect-timeout 1 http://localhost:8081 2>nul
if errorlevel 1 (
    echo  [1/3] Metro 服务未运行，正在启动 ...
    start "健康守护者 Metro - 关闭此窗口即停止演示" cmd /k "echo. & echo  Metro 正在运行，关闭此窗口即停止演示 & echo. & npm run web"
    echo  [2/3] 等待 Metro 完成首次编译 ^(约 10-15 秒^) ...
    set /a waited=0
    :wait_loop
    timeout /t 2 /nobreak >nul
    set /a waited+=2
    curl -s -o nul --connect-timeout 1 http://localhost:8081 2>nul
    if errorlevel 1 (
        if %waited% LSS 40 (
            echo       ^(已等待 %waited% 秒^)
            goto wait_loop
        ) else (
            echo  [!] 启动超时，请手动检查 Metro 窗口的错误信息
            pause
            exit /b 1
        )
    )
    echo  [3/3] Metro 已就绪
) else (
    echo  [1/2] Metro 已在运行
    echo  [2/2] 直接打开预览
)

echo.
echo  正在打开预览页面 ...
start "" "%cd%\mobile-preview.html"

echo.
echo  ============================================
echo    演示已启动
echo  ============================================
echo.
echo    手机框内是真实运行的 App
echo    任意邮箱 + 8 位以上密码即可登录
echo    或直接点 "登录账号" 用预填演示账号进入
echo.
echo    关闭浏览器和 Metro 窗口即可结束演示
echo.

timeout /t 6 /nobreak >nul
exit /b 0
