const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lyricSyncDesktop", {
  saveText: (payload) => ipcRenderer.invoke("file:save-text", payload),
  openText: (payload) => ipcRenderer.invoke("file:open-text", payload),
});
