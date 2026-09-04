@echo off
rem [Aufgabe: Bedienung] Startet den oertlichen Vorschau-Server und
rem oeffnet das Spiel im Standardbrowser. Nichts davon geht ins Netz.
cd /d "%~dp0"
start "" http://127.0.0.1:8144/
node werkzeuge/vorschau.mjs
