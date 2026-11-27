/* Avisa a página que ela está dentro do app e dá o caminho até o bot (main.mjs confere a origem). */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ACHADINHOS_APP', {
  robo: corpo => ipcRenderer.invoke('robo', corpo)
});
