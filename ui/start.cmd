@echo off
setlocal
pushd "%~dp0" || exit /b 1

rem Open the browser when the server prints its ready URL.
powershell.exe -NoProfile -Command ^
    "$ErrorActionPreference = 'Stop';" ^
    "npm.cmd run start | ForEach-Object {" ^
    "    Write-Output $_;" ^
    "    if ($_ -match '^Connecta UI: (http://localhost:\d+/home\.html)$') {" ^
    "        $url = $Matches[1];" ^
    "        try { Start-Process -FilePath $url }" ^
    "        catch { Write-Warning ('Could not open the browser. Open ' + $url) }" ^
    "    }" ^
    "};" ^
    "exit $LASTEXITCODE"

set "result=%errorlevel%"
popd
if not "%result%"=="0" pause
exit /b %result%
