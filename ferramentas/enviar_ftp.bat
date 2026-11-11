@echo off
rem Monta o pacote do site e envia por FTP para a hospedagem.
rem Pede servidor, usuario e senha na hora; a senha nao fica salva em lugar nenhum.
setlocal
cd /d "%~dp0.."
python -X utf8 ferramentas\preparar_publicacao.py
if errorlevel 1 goto fim
echo.
python -X utf8 ferramentas\enviar_ftp.py
:fim
echo.
pause
