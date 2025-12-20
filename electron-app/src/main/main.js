/**
 * Star Commander - Electron Main Process
 * V4.0
 */

const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, shell, screen } = require('electron');
const path = require('path');

// Detect dev mode and separate config paths
const isDev = !app.isPackaged;
if (isDev) {
    // Use separate userData folder for dev mode
    app.setPath('userData', app.getPath('userData') + '-dev');
    console.log('[Main] Dev mode - userData:', app.getPath('userData'));
}

const Store = require('electron-store');

// Config store (saved in %APPDATA%/star-commander/)
const store = new Store({
    name: 'config',
    defaults: {
        mode: null, // 'commandant' or 'chief'
        tokens: {
            emitter: '',
            receivers: {},
            names: {}
        },
        channels: {
            source: { id: '', name: 'Commandants' },
            targets: [],
            relay: { id: '', webhookUrl: '' }  // Text channel for whisper commands
        },
        chiefs: [], // { userId, name, channelKey }
        myChiefId: null, // For chief mode: which chief am I
        keybinds: {
            all: 'num0',
            mute: 'num1',
            channel1: 'num2',
            channel2: 'num3',
            channel3: 'num4',
            whisper: 'num9',
            briefing: 'num5'
        },
        settings: {
            startMinimized: false,
            minimizeToTray: true,
            overlayEnabled: false,
            overlayPosition: { x: 20, y: 20 }
        },
        setupComplete: false
    }
});

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let relayManager = null;
let isCleaningUp = false;
let currentChannel = 'MUTE';

// Cleanup relay before closing
async function cleanupBeforeClose() {
    if (isCleaningUp) return;
    isCleaningUp = true;
    
    if (relayManager) {
        console.log('Stopping relay before close...');
        try {
            await relayManager.stop();
        } catch (e) {
            console.error('Error stopping relay:', e);
        }
        relayManager = null;
    }
}

// Create main window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        resizable: false,
        maximizable: false,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, '../../assets/icon.png'),
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    mainWindow.once('ready-to-show', () => {
        if (!store.get('settings.startMinimized')) {
            mainWindow.show();
        }
    });

    // Handle close button - always quit and cleanup
    mainWindow.on('close', async (event) => {
        if (!isCleaningUp && relayManager) {
            event.preventDefault();
            await cleanupBeforeClose();
            app.quit();
        }
    });

    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
}

// Create overlay window
function createOverlay() {
    const savedPos = store.get('settings.overlayPosition') || { x: 20, y: 20 };
    
    overlayWindow = new BrowserWindow({
        width: 200,
        height: 50,
        x: savedPos.x,
        y: savedPos.y,
        resizable: false,
        movable: true,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload-overlay.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        show: false  // Always start hidden
    });

    overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));
    
    // Prevent closing, just hide
    overlayWindow.on('close', (event) => {
        if (!isCleaningUp) {
            event.preventDefault();
            overlayWindow.hide();
        }
    });
    
    // Save position on move
    overlayWindow.on('moved', () => {
        const bounds = overlayWindow.getBounds();
        store.set('settings.overlayPosition', { x: bounds.x, y: bounds.y });
    });
}

// Show/hide overlay
function toggleOverlay(show) {
    if (!overlayWindow) return;
    
    if (show) {
        overlayWindow.showInactive();
        // Wait for window to be ready then update
        setTimeout(() => updateOverlay(currentChannel), 100);
    } else {
        overlayWindow.hide();
    }
    
    store.set('settings.overlayEnabled', show);
}

// Update overlay content
function updateOverlay(channelName) {
    currentChannel = channelName;
    console.log('[Overlay] Updating to:', channelName);
    
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        // Send update even if hidden (will show correct value when shown)
        overlayWindow.webContents.send('overlay-update', channelName);
    }
}

// Create system tray
function createTray() {
    try {
        const iconPath = path.join(__dirname, '../../assets/icon.png');
        tray = new Tray(iconPath);
        
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Show', click: () => mainWindow.show() },
            { type: 'separator' },
            { label: 'Toggle Overlay', click: () => {
                const current = store.get('settings.overlayEnabled');
                toggleOverlay(!current);
                mainWindow.webContents.send('relay-event', { 
                    event: 'overlay-toggled', 
                    data: { enabled: !current }
                });
            }},
            { type: 'separator' },
            { label: 'Quit', click: async () => {
                await cleanupBeforeClose();
                app.quit();
            }}
        ]);
        
        tray.setToolTip('Star Commander');
        tray.setContextMenu(contextMenu);
        
        tray.on('click', () => {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        });
    } catch (e) {
        console.log('Tray icon not found, skipping tray creation');
    }
}

// Register global keybinds
function registerKeybinds() {
    const keybinds = store.get('keybinds');
    
    globalShortcut.unregisterAll();
    
    const registerKey = (key, target) => {
        if (key) {
            try {
                globalShortcut.register(key, () => {
                    // Check if window still exists before sending
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('keybind-pressed', target);
                    }
                });
            } catch (e) {
                console.log(`Failed to register keybind ${key}:`, e.message);
            }
        }
    };
    
    registerKey(keybinds.all, 'all');
    registerKey(keybinds.mute, 'mute');
    registerKey(keybinds.channel1, 'channel1');
    registerKey(keybinds.channel2, 'channel2');
    registerKey(keybinds.channel3, 'channel3');
    registerKey(keybinds.whisper, 'whisper');
    registerKey(keybinds.briefing, 'briefing');
}

// Clear require cache for core modules (needed for restart)
function clearCoreModuleCache() {
    const corePath = path.join(__dirname, '../core');
    Object.keys(require.cache).forEach(key => {
        if (key.includes(corePath.replace(/\\/g, '/'))) {
            delete require.cache[key];
        }
        if (key.includes(corePath)) {
            delete require.cache[key];
        }
    });
}

// IPC Handlers
function setupIPC() {
    // Window controls
    ipcMain.on('window-minimize', () => mainWindow.minimize());
    ipcMain.on('window-maximize', () => {
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    });
    ipcMain.on('window-close', () => mainWindow.close());
    
    // Config
    ipcMain.handle('config-get', (event, key) => {
        return key ? store.get(key) : store.store;
    });
    
    ipcMain.handle('config-set', (event, key, value) => {
        store.set(key, value);
        
        if (key === 'keybinds' || key.startsWith('keybinds.')) {
            registerKeybinds();
        }
        
        return true;
    });
    
    // Relay controls
    ipcMain.handle('relay-start', async () => {
        try {
            clearCoreModuleCache();
            
            const RelayManager = require('../core/relayManager');
            relayManager = new RelayManager(store.store, (event, data) => {
                mainWindow.webContents.send('relay-event', { event, data });
            });
            await relayManager.start();
            
            // Auto-enable and show overlay on start
            store.set('settings.overlayEnabled', true);
            toggleOverlay(true);
            
            // Notify renderer that overlay is now enabled
            mainWindow.webContents.send('relay-event', { 
                event: 'overlay-toggled', 
                data: { enabled: true }
            });
            
            return { success: true };
        } catch (error) {
            console.error('Relay start error:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('relay-stop', async () => {
        if (relayManager) {
            await relayManager.stop();
            relayManager = null;
        }
        
        // Hide overlay and update state
        store.set('settings.overlayEnabled', false);
        toggleOverlay(false);
        
        // Notify renderer
        mainWindow.webContents.send('relay-event', { 
            event: 'overlay-toggled', 
            data: { enabled: false }
        });
        
        return { success: true };
    });
    
    ipcMain.handle('relay-set-target', (event, target) => {
        // Don't call relayManager for whisper (it's just for overlay update)
        if (relayManager && target !== 'whisper') {
            relayManager.setTarget(target);
        }
        
        // Get channel display name
        let displayName = 'MUTE';
        if (target === 'all') {
            displayName = 'ALL';
        } else if (target === 'mute') {
            displayName = 'MUTE';
        } else if (target === 'whisper') {
            displayName = 'WHISPER';
        } else if (target === 'briefing') {
            displayName = 'BRIEFING';
        } else if (target.startsWith('channel')) {
            const index = parseInt(target.replace('channel', '')) - 1;
            const targets = store.get('channels.targets') || [];
            const names = store.get('tokens.names') || {};
            displayName = names[`receiver${index + 1}`] || targets[index]?.name || `Channel ${index + 1}`;
        }
        
        updateOverlay(displayName);
    });
    
    // Overlay controls
    ipcMain.handle('overlay-toggle', (event, enabled) => {
        toggleOverlay(enabled);
        return enabled;
    });
    
    ipcMain.handle('overlay-status', () => {
        return store.get('settings.overlayEnabled');
    });
    
    // Whisper control (works even without full relay for Chiefs)
    ipcMain.handle('relay-whisper', async (event, enabled) => {
        // If relay is running, use it
        if (relayManager) {
            await relayManager.sendWhisperCommand(enabled);
            return { success: true };
        }
        
        // Otherwise, send directly via webhook (Chief mode)
        const webhookUrl = store.get('channels.relay.webhookUrl');
        const myChiefId = store.get('myChiefId');
        
        if (!myChiefId) {
            return { success: false, error: 'Chief ID not configured' };
        }
        
        if (!webhookUrl) {
            return { success: false, error: 'Webhook URL not configured' };
        }
        
        try {
            const https = require('https');
            const url = new URL(webhookUrl);
            const action = enabled ? 'ON' : 'OFF';
            const data = JSON.stringify({ content: `WHISPER:${myChiefId}:${action}` });
            
            await new Promise((resolve, reject) => {
                const req = https.request({
                    hostname: url.hostname,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': data.length
                    }
                }, (res) => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve();
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                });
                req.on('error', reject);
                req.write(data);
                req.end();
            });
            
            mainWindow.webContents.send('relay-event', { 
                event: 'whisper-sent', 
                data: { enabled } 
            });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });
    
    // Briefing mode control (Commandant only)
    ipcMain.handle('relay-briefing', async (event, enabled) => {
        if (!relayManager) {
            return { success: false, error: 'Relay not running' };
        }
        
        try {
            if (enabled) {
                await relayManager.startBriefing();
            } else {
                await relayManager.endBriefing();
            }
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });
    
    // Check if first launch (setup not complete)
    ipcMain.handle('is-first-launch', () => {
        return !store.get('setupComplete');
    });
    
    // Mark setup as complete
    ipcMain.handle('setup-complete', () => {
        store.set('setupComplete', true);
        // Re-register keybinds after setup (config now loaded)
        registerKeybinds();
        return true;
    });
    
    // Reset config (for testing)
    ipcMain.handle('reset-config', () => {
        store.clear();
        return true;
    });
    
    // Open external URL
    ipcMain.handle('open-external', (event, url) => {
        shell.openExternal(url);
    });
    
    // Export config for chiefs
    ipcMain.handle('export-config', async () => {
        const { dialog } = require('electron');
        
        // Build export data (without tokens for security)
        const exportData = {
            version: '4.0',
            channels: store.get('channels'),
            tokens: store.get('tokens'),  // Include tokens so chiefs can connect
            chiefs: store.get('chiefs') || []
        };
        
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Exporter la configuration',
            defaultPath: 'starcommander-config.json',
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        
        if (!result.canceled && result.filePath) {
            const fs = require('fs');
            fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2));
            return { success: true, path: result.filePath };
        }
        
        return { success: false };
    });
    
    // Import config (for chiefs)
    ipcMain.handle('import-config', async () => {
        const { dialog } = require('electron');
        
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Importer la configuration',
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile']
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
            const fs = require('fs');
            try {
                const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));
                
                // Validate
                if (!data.version || !data.channels || !data.tokens) {
                    return { success: false, error: 'Format de fichier invalide' };
                }
                
                return { success: true, data };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
        
        return { success: false };
    });
}

// App ready
app.whenReady().then(() => {
    createWindow();
    createOverlay();
    createTray();
    setupIPC();
    registerKeybinds();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('will-quit', async () => {
    globalShortcut.unregisterAll();
    await cleanupBeforeClose();
});
