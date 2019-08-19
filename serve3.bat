setlocal
set port=8089
start /b python -m http.server %port%
start "" "http://localhost:%port%/index.html"
pause
