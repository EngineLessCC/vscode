@echo off
setlocal
call yarn config set ignore-engines true
call yarn --force
call yarn run gulp vscode-win32-x64 --openssl-legacy-provider