const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

const {
  PDFDocument, rgb, StandardFonts,
  pushGraphicsState, popGraphicsState,
  moveTo, lineTo, closePath, clip, endPath
} = require('pdf-lib');

/* ── Logger a fichero ── */
let _logStream = null;
function getLogStream() {
  if (_logStream) return _logStream;
  try {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    _logStream = fs.createWriteStream(path.join(logsDir, 'app.log'), { flags: 'a', encoding: 'utf-8' });
  } catch { _logStream = null; }
  return _logStream;
}
function logLine(level, msg) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`;
  try { getLogStream()?.write(line); } catch {}
  if (level === 'ERROR') console.error('[ERROR]', msg);
}
const logger = {
  info:  msg => logLine('INFO',  msg),
  warn:  msg => logLine('WARN',  msg),
  error: msg => logLine('ERROR', msg),
};

/* ── Escritura atómica + backups rotativos ── */
function rotateBackups(filePath, maxBackups = 3) {
  if (!fs.existsSync(filePath)) return;
  try {
    for (let i = maxBackups; i >= 1; i--) {
      const dst = `${filePath}.bak${i}`;
      const src = i === 1 ? filePath : `${filePath}.bak${i - 1}`;
      if (i === maxBackups) { try { fs.unlinkSync(dst); } catch {} }
      if (fs.existsSync(src)) {
        if (i === 1) fs.copyFileSync(src, dst);
        else fs.renameSync(src, dst);
      }
    }
  } catch (e) { logger.warn(`rotateBackups(${path.basename(filePath)}): ${e.message}`); }
}

function writeAtomic(filePath, jsonStr) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, jsonStr, 'utf-8');
  fs.renameSync(tmp, filePath);
}

/* ── Helpers de curso escolar ── */
function getCursoActual() {
  const hoy = new Date();
  const mes = hoy.getMonth();
  const anio = hoy.getFullYear();
  const anioInicio = (mes >= 8) ? anio + 1 : anio;
  const anioSig = anioInicio + 1;
  return `${String(anioInicio).slice(2)}-${String(anioSig).slice(2)}`;
}

function esCursoActual(cursoStr) {
  return cursoStr === getCursoActual();
}

function getCursoDesdeFilename(name) {
  const m = name.match(/^solicitudes_(\d{2}-\d{2})\.json$/i);
  return m ? m[1] : null;
}

function getCursoDesdeTribFilename(name) {
  const m = name.match(/^tribunales1_(\d{2}-\d{2})\.json$/i);
  return m ? m[1] : null;
}

function listarCursosDisponibles() {
  const userData = app.getPath('userData');
  try {
    const files = fs.readdirSync(userData);
    const cursos = files
      .map(f => getCursoDesdeFilename(f))
      .filter(Boolean)
      .sort();
    // Siempre asegurar que el curso actual esté presente
    const actual = getCursoActual();
    if (!cursos.includes(actual)) cursos.push(actual);
    return cursos;
  } catch { return [getCursoActual()]; }
}

// Archivos de datos: persiste en la carpeta de usuario de la app
const PREFS_FILE = path.join(app.getPath('userData'), 'prefs.json');
const CURSO_ACTIVO_FILE = path.join(app.getPath('userData'), 'curso_activo.json');

function dataFile(curso) {
  return path.join(app.getPath('userData'), `solicitudes_${curso}.json`);
}
function tribunalesFile(curso) {
  return path.join(app.getPath('userData'), `tribunales1_${curso}.json`);
}

function loadPrefs() {
  try {
    if (fs.existsSync(PREFS_FILE)) return JSON.parse(fs.readFileSync(PREFS_FILE, 'utf-8'));
  } catch (e) { logger.warn(`loadPrefs: ${e.message}`); }
  return {};
}

function savePrefs(patch) {
  try {
    const current = loadPrefs();
    fs.writeFileSync(PREFS_FILE, JSON.stringify({ ...current, ...patch }, null, 2), 'utf-8');
  } catch (e) { logger.error(`savePrefs: ${e.message}`); }
}

function loadCursoActivo() {
  try {
    if (fs.existsSync(CURSO_ACTIVO_FILE)) {
      const d = JSON.parse(fs.readFileSync(CURSO_ACTIVO_FILE, 'utf-8'));
      if (d.curso) return d.curso;
    }
  } catch (e) { logger.warn(`loadCursoActivo: ${e.message}`); }
  return getCursoActual();
}

function saveCursoActivo(curso) {
  try {
    fs.writeFileSync(CURSO_ACTIVO_FILE, JSON.stringify({ curso }, null, 2), 'utf-8');
  } catch (e) { logger.error(`saveCursoActivo: ${e.message}`); }
}

/* ── Migración: del archivo único viejo al formato por curso ── */
function migrarSiNecesario() {
  const viejo = path.join(app.getPath('userData'), 'solicitudes.json');
  if (!fs.existsSync(viejo)) return;
  try {
    const data = JSON.parse(fs.readFileSync(viejo, 'utf-8'));
    const cursoStr = data.cursoCombinado || getCursoActual();
    const nuevo = dataFile(cursoStr);
    if (!fs.existsSync(nuevo)) {
      fs.writeFileSync(nuevo, JSON.stringify(data, null, 2), 'utf-8');
    }
    // Renombrar el viejo como backup
    fs.renameSync(viejo, viejo + '.migrado.backup');
  } catch (e) { logger.warn(`migrarSiNecesario: ${e.message}`); }
}

let cursoActivo = loadCursoActivo();

function createWindow() {
  const prefs = loadPrefs();
  const win = new BrowserWindow({
    width:  prefs.width  || 1060,
    height: prefs.height || 820,
    minWidth:  700,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'C.P.M. Marcos Redondo · Pruebas de Acceso EE',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true
  });

  win.loadFile('conservatorio_form.html');

  // Recargar la ventana con F5 o Ctrl+R (solo en desarrollo, no empaquetado)
  win.webContents.on('before-input-event', (event, input) => {
    if ((input.key === 'F5') || (input.control && input.key.toLowerCase() === 'r')) {
      win.reload();
      event.preventDefault();
    }
  });

  win.on('close', () => {
    const [w, h] = win.getSize();
    savePrefs({ width: w, height: h });
  });
}

app.whenReady().then(() => {
  migrarSiNecesario();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Copia de respaldo del JSON de datos del curso activo al salir
app.on('before-quit', () => {
  try {
    const f = dataFile(cursoActivo);
    if (!fs.existsSync(f)) return;
    const backupDir = app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname;
    const backupFile = path.join(backupDir, `SolicitudesAdmision.backup.json`);
    fs.copyFileSync(f, backupFile);
    logger.info(`before-quit: backup guardado en ${backupFile}`);
  } catch (e) { logger.warn(`before-quit backup: ${e.message}`); }
});

/* ── IPC: preferencias de interfaz ── */
ipcMain.handle('leer-prefs',    ()        => loadPrefs());
ipcMain.handle('guardar-prefs', (_, patch) => { savePrefs(patch); return { ok: true }; });

/* ── IPC: curso escolar ── */
ipcMain.handle('get-curso-actual', () => getCursoActual());

ipcMain.handle('listar-cursos', () => {
  const cursos = listarCursosDisponibles();
  return { cursos, actual: getCursoActual() };
});

ipcMain.handle('leer-curso-activo', () => {
  return { curso: cursoActivo, esActual: esCursoActual(cursoActivo) };
});

ipcMain.handle('cambiar-curso-activo', (_, curso) => {
  if (!/^\d{2}-\d{2}$/.test(curso)) return { ok: false, error: 'Curso inválido' };
  cursoActivo = curso;
  saveCursoActivo(curso);
  return { ok: true, curso, esActual: esCursoActual(curso) };
});

/* ── IPC: leer datos del curso activo ── */
ipcMain.handle('leer-json', () => {
  try {
    const f = dataFile(cursoActivo);
    if (!fs.existsSync(f)) return null;
    return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch { return null; }
});

/* ── IPC: guardado automático del curso activo ── */
ipcMain.handle('guardar-json', (_, data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    logger.error('guardar-json: payload no es un objeto');
    return { ok: false, error: 'Datos inválidos' };
  }
  if (data.solicitudes !== undefined && !Array.isArray(data.solicitudes)) {
    logger.error('guardar-json: solicitudes no es un array');
    return { ok: false, error: 'Datos inválidos' };
  }
  try {
    const f = dataFile(cursoActivo);
    rotateBackups(f);
    writeAtomic(f, JSON.stringify(data, null, 2));
    return { ok: true };
  } catch (e) {
    logger.error(`guardar-json: ${e.message}`);
    return { ok: false, error: e.message };
  }
});

/* ── IPC: importar desde un JSON externo ── */
ipcMain.handle('importar-json', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Importar solicitudes desde JSON',
    filters: [{ name: 'Archivo JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (!filePaths || !filePaths[0]) return null;
  try {
    return JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
  } catch { return null; }
});

/* ── Helpers compartidos de generación PDF ── */

function buildPreviewHtml(pdfUrl, nombreSugerido) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden}
body{background:#525659;display:flex;flex-direction:column;font-family:-apple-system,'Segoe UI',Arial,sans-serif}
.bar{background:#323639;padding:8px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0;border-bottom:1px solid #111}
.bar .title{flex:1;font-size:12px;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
button{padding:5px 18px;border-radius:4px;font-size:13px;cursor:pointer;border:1px solid transparent;font-weight:500}
.save{background:#1a73e8;color:#fff}.save:hover{background:#1557b0}
.cancel{background:transparent;color:#ccc;border-color:#666}.cancel:hover{background:#444;color:#fff}
embed{flex:1;width:100%}
</style>
</head><body>
  <div class="bar">
    <span class="title">Vista previa · ${nombreSugerido}</span>
    <button class="cancel" onclick="window.electronPreview.cancel()">Cancelar</button>
    <button class="save"   onclick="window.electronPreview.save()">Guardar PDF</button>
  </div>
  <embed src="${pdfUrl}" type="application/pdf">
</body></html>`;
}

async function renderHtmlToPdf(html, tmpPrefix, pdfOptions) {
  const tmpFile = path.join(os.tmpdir(), `${tmpPrefix}_${Date.now()}.html`);
  fs.writeFileSync(tmpFile, html, 'utf-8');
  const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
  await win.loadFile(tmpFile);
  let buffer;
  try {
    buffer = await win.webContents.printToPDF(pdfOptions);
  } finally {
    win.close();
    try { fs.unlinkSync(tmpFile); } catch (e) { logger.warn(`renderHtmlToPdf unlink: ${e.message}`); }
  }
  return buffer;
}

async function mostrarPreviewYGuardar(outputBytes, nombreSugerido, { winWidth = 880, winHeight = 720, dialogTitle = 'Guardar PDF' } = {}) {
  const ts = Date.now();
  const tmpPreviewPdf  = path.join(os.tmpdir(), `preview_${ts}.pdf`);
  const tmpPreviewHtml = path.join(os.tmpdir(), `preview_${ts}.html`);
  fs.writeFileSync(tmpPreviewPdf, Buffer.from(outputBytes));
  const pdfUrl = 'file:///' + tmpPreviewPdf.replace(/\\/g, '/');
  fs.writeFileSync(tmpPreviewHtml, buildPreviewHtml(pdfUrl, nombreSugerido), 'utf-8');

  const mainWin    = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
  const previewWin = new BrowserWindow({
    width: winWidth, height: winHeight,
    title: `Vista previa · ${nombreSugerido}`,
    parent: mainWin || undefined,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload-preview.js'), contextIsolation: true, nodeIntegration: false }
  });
  previewWin.loadFile(tmpPreviewHtml);

  const accion = await new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const actionHandler = (_, action) => { previewWin.close(); finish(action); };
    ipcMain.once('preview-action', actionHandler);
    previewWin.on('closed', () => { ipcMain.removeListener('preview-action', actionHandler); finish('cancel'); });
  });

  try { fs.unlinkSync(tmpPreviewPdf);  } catch (e) { logger.warn(`preview unlink pdf: ${e.message}`); }
  try { fs.unlinkSync(tmpPreviewHtml); } catch (e) { logger.warn(`preview unlink html: ${e.message}`); }

  if (accion !== 'save') return null;

  const { filePath } = await dialog.showSaveDialog({
    title: dialogTitle,
    defaultPath: nombreSugerido,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (!filePath) return null;

  let intentos = 0;
  while (true) {
    try {
      fs.writeFileSync(filePath, Buffer.from(outputBytes));
      return filePath;
    } catch (e) {
      if ((e.code === 'EBUSY' || e.code === 'EACCES') && intentos < 5) {
        intentos++;
        const { response } = await dialog.showMessageBox({
          type: 'warning', title: 'Archivo en uso', message: 'No se puede guardar el PDF',
          detail: `El archivo "${path.basename(filePath)}" está abierto en el visor de PDF.\n\nCiérralo y pulsa Reintentar.`,
          buttons: ['Reintentar', 'Cancelar'], defaultId: 0, cancelId: 1
        });
        if (response === 1) return null;
      } else {
        logger.error(`mostrarPreviewYGuardar write: ${e.message}`);
        throw e;
      }
    }
  }
}

/* ── IPC: generar PDF de listado provisional/definitivo ── */
ipcMain.handle('generar-listado', async (_, { html, nombreSugerido }) => {
  try {
    const contentPdfBuffer = await renderHtmlToPdf(html, 'listado', {
      pageSize: 'A4', printBackground: true, displayHeaderFooter: false,
      margins: { marginType: 'custom', top: 1.61, bottom: 1.46, left: 0.87, right: 0.87 }
    });

    const templateBytes = fs.readFileSync(path.join(__dirname, 'Oficio.pdf'));
    const templateDoc   = await PDFDocument.load(templateBytes);
    const contentDoc    = await PDFDocument.load(contentPdfBuffer);
    const outputDoc     = await PDFDocument.create();
    const [tplPage]     = templateDoc.getPages();
    const { width, height } = tplPage.getSize();
    const totalPages    = contentDoc.getPageCount();
    const font          = await outputDoc.embedFont(StandardFonts.Helvetica);
    // Área útil entre cabecera y pie del oficio
    const CLIP_TOP    = height - 115;
    const CLIP_BOTTOM = 104;

    for (let i = 0; i < totalPages; i++) {
      const [bgPage] = await outputDoc.copyPages(templateDoc, [0]);
      outputDoc.addPage(bgPage);
      const page = outputDoc.getPages()[i];
      const embeddedContent = await outputDoc.embedPage(contentDoc.getPages()[i]);
      page.pushOperators(pushGraphicsState(), moveTo(0, CLIP_BOTTOM), lineTo(width, CLIP_BOTTOM), lineTo(width, CLIP_TOP), lineTo(0, CLIP_TOP), closePath(), clip(), endPath());
      page.drawPage(embeddedContent, { x: 0, y: 0, width, height });
      page.pushOperators(popGraphicsState());
      const texto = `${i + 1} / ${totalPages}`;
      const textW = font.widthOfTextAtSize(texto, 8);
      page.drawText(texto, { x: (width - textW) / 2, y: 16, size: 8, font, color: rgb(0.25, 0.25, 0.25) });
    }

    const outputBytes = await outputDoc.save();
    const filePath = await mostrarPreviewYGuardar(outputBytes, nombreSugerido, { dialogTitle: 'Guardar listado PDF' });
    if (!filePath) return { ok: false };
    shell.openPath(filePath);
    return { ok: true };
  } catch (e) {
    logger.error(`generar-listado: ${e.message}`);
    return { ok: false, error: e.message };
  }
});

/* ── IPC: generar PDF de actas de evaluación ── */
ipcMain.handle('generar-actas', async (_, { html, nombreSugerido }) => {
  try {
    const jccmBase64 = fs.readFileSync(path.join(__dirname, 'public', 'logo_jccm.png')).toString('base64');
    const cpmBase64  = fs.readFileSync(path.join(__dirname, 'public', 'logo_cpm.png')).toString('base64');
    const htmlConLogos = html
      .replace(/\{\{LOGO_JCCM\}\}/g, `data:image/png;base64,${jccmBase64}`)
      .replace(/\{\{LOGO_CPM\}\}/g,  `data:image/png;base64,${cpmBase64}`);

    const contentPdfBuffer = await renderHtmlToPdf(htmlConLogos, 'actas', {
      pageSize: 'A4', landscape: true, printBackground: true, displayHeaderFooter: false,
      margins: { marginType: 'custom', top: 0.39, bottom: 0.39, left: 0.39, right: 0.39 }
    });

    const outputDoc  = await PDFDocument.create();
    const contentDoc = await PDFDocument.load(contentPdfBuffer);
    const font       = await outputDoc.embedFont(StandardFonts.Helvetica);
    const totalPages = contentDoc.getPageCount();
    const { width, height } = contentDoc.getPages()[0].getSize();

    for (let i = 0; i < totalPages; i++) {
      const [embedded] = await outputDoc.copyPages(contentDoc, [i]);
      outputDoc.addPage(embedded);
      const page = outputDoc.getPages()[i];
      const texto = `${i + 1} / ${totalPages}`;
      const textW = font.widthOfTextAtSize(texto, 8);
      page.drawText(texto, { x: (width - textW) / 2, y: 12, size: 8, font, color: rgb(0.25, 0.25, 0.25) });
    }

    const outputBytes = await outputDoc.save();
    const filePath = await mostrarPreviewYGuardar(outputBytes, nombreSugerido, { winWidth: 960, dialogTitle: 'Guardar actas de evaluación PDF' });
    if (!filePath) return { ok: false };
    shell.openPath(filePath);
    return { ok: true };
  } catch (e) {
    logger.error(`generar-actas: ${e.message}`);
    return { ok: false, error: e.message };
  }
});

/* ── IPC: configuración de tribunales 1º EE (por curso) ── */
ipcMain.handle('leer-tribunales-config', () => {
  const f = tribunalesFile(cursoActivo);
  try {
    if (!fs.existsSync(f)) {
      const defaultConfig = {
        tribunales: Array.from({ length: 8 }, (_, i) => ({
          num: i + 1, dia: '', hora: '', aula: '', nombres: ''
        }))
      };
      fs.writeFileSync(f, JSON.stringify(defaultConfig, null, 2), 'utf-8');
      return defaultConfig;
    }
    return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch { return null; }
});

ipcMain.handle('guardar-tribunales-config', (_, data) => {
  const f = tribunalesFile(cursoActivo);
  try {
    rotateBackups(f);
    writeAtomic(f, JSON.stringify(data, null, 2));
    return { ok: true };
  } catch (e) {
    logger.error(`guardar-tribunales-config: ${e.message}`);
    return { ok: false, error: e.message };
  }
});

/* ── IPC: generar PDF de tribunales 1º EE ── */
ipcMain.handle('generar-tribunales', async (_, { html, nombreSugerido }) => {
  try {
  const jccmBase64 = fs.readFileSync(path.join(__dirname, 'public', 'logo_jccm.png')).toString('base64');
  const cpmBase64  = fs.readFileSync(path.join(__dirname, 'public', 'logo_cpm.png')).toString('base64');
  const htmlConLogos = html
    .replace(/\{\{LOGO_JCCM\}\}/g, `data:image/png;base64,${jccmBase64}`)
    .replace(/\{\{LOGO_CPM\}\}/g,  `data:image/png;base64,${cpmBase64}`);

  const contentPdfBuffer = await renderHtmlToPdf(htmlConLogos, 'tribunales', {
    pageSize: 'A4', landscape: true, printBackground: true, displayHeaderFooter: false,
    margins: { marginType: 'custom', top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
  });

  const outputDoc = await PDFDocument.create();
  const contentDoc = await PDFDocument.load(contentPdfBuffer);
  const font = await outputDoc.embedFont(StandardFonts.Helvetica);

  const totalPages = contentDoc.getPageCount();
  const { width, height } = contentDoc.getPages()[0].getSize();

  const FOOTER_TEXT = 'Los alumnos tienen que presentarse a las pruebas provistos de DNI o libro de familia, adem\u00e1s de lapicero y goma de borrar.\nCualquier error que se observe en los presentes tribunales, deber\u00e1 ser comunicado a la mayor brevedad posible en la secretar\u00eda acad\u00e9mica del centro.';
  const LINE_Y = 52; // FOOTER_MARGIN_BOTTOM(12) + 40

  for (let i = 0; i < totalPages; i++) {
    const [embedded] = await outputDoc.copyPages(contentDoc, [i]);
    outputDoc.addPage(embedded);
    const page = outputDoc.getPages()[i];
    if (i < totalPages - 1) {
      page.drawLine({ start: { x: 50, y: LINE_Y }, end: { x: width - 50, y: LINE_Y }, thickness: 0.5, color: rgb(0.3, 0.3, 0.3) });
      const lines = FOOTER_TEXT.split('\n');
      const textStartY = LINE_Y - 12;
      lines.forEach((line, l) => {
        const tw = font.widthOfTextAtSize(line, 8);
        page.drawText(line, { x: (width - tw) / 2, y: textStartY - l * 9, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      });
      const pageNum = `${i + 1} / ${totalPages}`;
      const pnW = font.widthOfTextAtSize(pageNum, 8);
      page.drawText(pageNum, { x: (width - pnW) / 2, y: textStartY - lines.length * 9 - 4, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
    }
  }

  const outputBytes = await outputDoc.save();
  const filePath = await mostrarPreviewYGuardar(outputBytes, nombreSugerido, { dialogTitle: 'Guardar tribunales 1º EE PDF' });
  if (!filePath) return { ok: false };
  shell.openPath(filePath);
  return { ok: true };
  } catch (e) {
    logger.error(`generar-tribunales: ${e.message}`);
    return { ok: false, error: e.message };
  }
});

/* ── IPC: exportar copia a una ruta elegida por el usuario ── */
ipcMain.handle('exportar-json', async (_, data) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Exportar solicitudes',
    defaultPath: data._nombreSugerido || 'SolicitudesAdmision.json',
    filters: [{ name: 'Archivo JSON', extensions: ['json'] }]
  });
  if (!filePath) return { ok: false };
  try {
    const { _nombreSugerido, ...sinMeta } = data;
    fs.writeFileSync(filePath, JSON.stringify(sinMeta, null, 2), 'utf-8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/* ── IPC: exportar datos históricos de un curso específico ── */
ipcMain.handle('exportar-json-historico', async (_, curso) => {
  if (!/^\d{2}-\d{2}$/.test(curso)) return { ok: false, error: 'Curso inválido' };
  const f = dataFile(curso);
  if (!fs.existsSync(f)) return { ok: false, error: 'No hay datos para ese curso' };
  try {
    const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
    const nombreSugerido = `SolicitudesAdmision_${curso}.json`;
    const { filePath } = await dialog.showSaveDialog({
      title: `Exportar solicitudes del curso ${curso}`,
      defaultPath: nombreSugerido,
      filters: [{ name: 'Archivo JSON', extensions: ['json'] }]
    });
    if (!filePath) return { ok: false };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/* ── IPC: importar datos históricos a un curso específico ── */
ipcMain.handle('importar-json-historico', async (_, curso, data) => {
  if (!/^\d{2}-\d{2}$/.test(curso)) return { ok: false, error: 'Curso inválido' };
  if (!data) return { ok: false, error: 'No se proporcionaron datos' };
  try {
    const f = dataFile(curso);
    rotateBackups(f);
    writeAtomic(f, JSON.stringify(data, null, 2));
    return { ok: true };
  } catch (e) {
    logger.error(`importar-json-historico(${curso}): ${e.message}`);
    return { ok: false, error: e.message };
  }
});
