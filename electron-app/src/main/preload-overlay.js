/**
 * Star Commander - Overlay Preload
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    onOverlayUpdate: (callback) => {
        ipcRenderer.on('overlay-update', (event, channel) => callback(channel));
    }
});
