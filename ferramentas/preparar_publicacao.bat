@echo off
rem Monta a pasta "publicar" com o site pronto para o dominio gomeseng.eng.br.
rem Nao envia nada para a internet: so prepara os arquivos para subir por FTP.
setlocal
cd /d "%~dp0.."
python -X utf8 ferramentas\preparar_publicacao.py
echo.
pause
