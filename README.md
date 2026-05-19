# Acceso Elemental · C.P.M. Marcos Redondo

Aplicación de escritorio para la gestión de las **Pruebas de Acceso a Enseñanzas Elementales** del Conservatorio Profesional de Música Marcos Redondo (Ciudad Real).

> **Privacidad:** Esta aplicación almacena todos los datos de forma local en el equipo del usuario. No se envía ninguna información a servidores externos.

---

## Características

- **Gestión de solicitudes** de admisión para 1º, 2º, 3º y 4º curso.
- **Filtros y ordenación** por nombre, apellidos, fecha de nacimiento, curso, especialidad y estado de exclusión.
- **Validación automática** de edad según el curso solicitado.
- **Detección de duplicados** al registrar nuevas solicitudes.
- **Histórico por curso escolar**: permite consultar y gestionar datos de cursos anteriores en modo solo lectura.
- **Generación de PDFs**:
  - Listados provisional y definitivo (sobre membrete oficial).
  - Actas de evaluación (2º–4º).
  - Tribunales de 1º curso (con asignación automática o manual de alumnos).
- **Configuración de tribunales**: edición de día, hora, aula y miembros del tribunal con sincronización por filas.
- **Exportación/Importación** de datos en formato JSON.

---

## Tecnologías

- [Electron](https://www.electronjs.org/) (aplicación de escritorio)
- HTML5, CSS3 y JavaScript vanilla (interfaz)
- [pdf-lib](https://pdf-lib.js.org/) (manipulación de PDFs)

---

## Instalación y uso

### Requisitos

- [Node.js](https://nodejs.org/) (v18 o superior)
- [pnpm](https://pnpm.io/) (recomendado) o npm

### Clonar y ejecutar

```bash
git clone https://github.com/JesusCardenas72/AccesoElemental.git
cd AccesoElemental
pnpm install
pnpm start
```

### Generar versión portable (Windows)

```bash
pnpm run build
```

El ejecutable portable se generará en la carpeta `Portable/`.

---

## Estructura del proyecto

```
.
├── main.js                 # Proceso principal de Electron
├── preload.js              # Preload seguro para IPC
├── conservatorio_form.html # Interfaz de usuario
├── lib.js / lib.mjs        # Utilidades y helpers
├── public/                 # Logos y fuentes
├── scripts/                # Scripts de empaquetado
├── test/                   # Tests unitarios
└── package.json            # Configuración y dependencias
```

---

## Persistencia de datos

Los datos se almacenan localmente en la carpeta de usuario de la aplicación Electron (`%APPDATA%/Acceso Elemental · CPM Marcos Redondo/` en Windows), en archivos JSON separados por curso escolar:

- `solicitudes_XX-XX.json` → solicitudes de admisión
- `tribunales1_XX-XX.json` → configuración de tribunales de 1º curso

Además, al cerrar la aplicación se crea automáticamente una copia de respaldo (`SolicitudesAdmision.backup.json`) en la carpeta de trabajo.

---

## Licencia

Este proyecto es de uso interno del C.P.M. Marcos Redondo.

---

## Autor

**Jesús Cárdenas** · C.P.M. Marcos Redondo
