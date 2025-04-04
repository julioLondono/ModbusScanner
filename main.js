const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ModbusHandler = require('./src/modbus-handler');

let mainWindow;
const modbusHandler = new ModbusHandler();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
    // For development
    mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for Modbus communication
ipcMain.handle('get-ports', async () => {
    return await modbusHandler.listPorts();
});

ipcMain.handle('connect', async (event, config) => {
    return await modbusHandler.connect(config);
});

ipcMain.handle('disconnect', async () => {
    return await modbusHandler.disconnect();
});

ipcMain.handle('read-registers', async (event, { address, length, functionCode }) => {
    return await modbusHandler.readRegisters(address, length, functionCode);
});

ipcMain.handle('write-register', async (event, { address, value }) => {
    return await modbusHandler.writeRegister(address, value);
});