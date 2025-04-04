const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ModbusHandler = require('./src/modbus-handler');
const ProfileManager = require('./src/profile-manager');

let mainWindow;
let profileManager;
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
    profileManager = new ProfileManager();
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

ipcMain.handle('start-polling', async (event, config) => {
    config.onData = (result) => {
        // Send data back to renderer process
        event.sender.send('polling-data', result);
    };
    config.onError = (error) => {
        // Send error back to renderer process
        event.sender.send('polling-error', error);
    };
    return await modbusHandler.startPolling(config);
});

ipcMain.handle('stop-polling', async () => {
    return await modbusHandler.stopPolling();
});

ipcMain.handle('is-polling', async () => {
    return {
        success: true,
        data: modbusHandler.isPolling(),
        timestamp: new Date().toISOString()
    };
});

ipcMain.handle('scan-devices', async (event, { startAddress, endAddress }) => {
    return await modbusHandler.scanDevices(startAddress, endAddress, (progress) => {
        // Send progress updates to renderer
        event.sender.send('scan-progress', progress);
    });
});

ipcMain.handle('stop-scan', async () => {
    return await modbusHandler.stopScan();
});

// Profile management handlers
ipcMain.handle('load-profiles', async () => {
    return await profileManager.loadProfiles();
});

ipcMain.handle('save-profile', async (event, profile) => {
    return await profileManager.saveProfile(profile);
});

ipcMain.handle('delete-profile', async (event, profileName) => {
    return await profileManager.deleteProfile(profileName);
});
