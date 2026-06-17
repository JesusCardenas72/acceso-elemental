const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  leerJSON:     ()       => ipcRenderer.invoke('leer-json'),
  guardarJSON:  (data)   => ipcRenderer.invoke('guardar-json', data),
  importarJSON: ()       => ipcRenderer.invoke('importar-json'),
  exportarJSON:   (data) => ipcRenderer.invoke('exportar-json', data),
  generarListado: (data) => ipcRenderer.invoke('generar-listado', data),
  generarActas:   (data) => ipcRenderer.invoke('generar-actas', data),
  leerTribunalesConfig:    ()       => ipcRenderer.invoke('leer-tribunales-config'),
  guardarTribunalesConfig: (data)   => ipcRenderer.invoke('guardar-tribunales-config', data),
  generarTribunales:       (data)   => ipcRenderer.invoke('generar-tribunales', data),
  generarExcelOrdenPrelacion: (data) => ipcRenderer.invoke('generar-excel-orden-prelacion', data),
  generarExcelTodos: () => ipcRenderer.invoke('generar-excel-todos'),
  leerPrefs:    ()       => ipcRenderer.invoke('leer-prefs'),
  guardarPrefs: (patch)  => ipcRenderer.invoke('guardar-prefs', patch),
  // Histórico de cursos escolares
  getCursoActual:      ()           => ipcRenderer.invoke('get-curso-actual'),
  listarCursos:      ()           => ipcRenderer.invoke('listar-cursos'),
  leerCursoActivo:   ()           => ipcRenderer.invoke('leer-curso-activo'),
  cambiarCursoActivo: (curso)      => ipcRenderer.invoke('cambiar-curso-activo', curso),
  exportarJSONHistorico: (curso)  => ipcRenderer.invoke('exportar-json-historico', curso),
  importarJSONHistorico: (curso, data)  => ipcRenderer.invoke('importar-json-historico', curso, data)
});
