const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    title: "LyricSync",
    backgroundColor: "#10151f",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.loadFile(path.join(__dirname, "..", "index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle("file:save-text", async (_event, { content, fileName, filters }) => {
    const result = await dialog.showSaveDialog({ defaultPath: fileName, filters });
    if (result.canceled || !result.filePath) return { canceled: true };
    await writeFile(result.filePath, content, "utf8");
    return { canceled: false, path: result.filePath };
  });
  ipcMain.handle("file:open-text", async (_event, { filters }) => {
    const result = await dialog.showOpenDialog({ properties: ["openFile"], filters });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    return { canceled: false, path: result.filePaths[0], content: await readFile(result.filePaths[0], "utf8") };
  });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
