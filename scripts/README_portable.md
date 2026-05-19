# Crear un EXE portable (guía rápida)

- Requisitos: Windows con `IExpress` (incluido en la mayoría de instalaciones de Windows).
- Objetivo: generar un único `.exe` autoextraíble que lance la aplicación incluida en `Portable/win-unpacked`.

Pasos automatizados:

1. Ejecuta el script PowerShell para preparar los archivos:

```powershell
cd "$(Join-Path $PWD 'scripts')"
.
\create_portable.ps1
```

2. El script copiará todo a `portable_build` y generará `portable_package.sed` en la raíz del repositorio.

3. Para crear el EXE automáticamente (puede pedir privilegios), ejecuta desde PowerShell:

```powershell
iexpress /N portable_package.sed
```

Nota: si `iexpress /N` no funciona en tu máquina, abre `iexpress.exe` (Inicio → ejecutar `iexpress`) y elige "Create new Self Extraction Directive file". Usa la plantilla `portable_package.sed` como guía y en la sección "Files" añade todos los archivos de `portable_build`. Como programa a ejecutar tras la extracción, usa `run_app.bat`.

Resultado esperado:

- Un único EXE en `dist\AccesoElemental_Portable.exe` que, al ejecutarse, extrae el contenido y lanza la aplicación.

Consideraciones:

- IExpress empaqueta todo en un EXE pero no cifra ni protege el contenido. Para firmar el EXE considera usar firmas digitales posteriormente.
- Si prefieres SFX con 7-Zip (más control sobre compresión), puedo preparar un script que descarga `7za.exe` y genera un SFX concatenado.
