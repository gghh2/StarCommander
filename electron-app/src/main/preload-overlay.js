/**
 * Star Commander - Overlay Preload
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    onOverlayUpdate: (callback) => {
        ipcRenderer.on('overlay-update', (event, channel) => callback(channel));
    },
    resizeOverlay: (expanded) => {
        ipcRenderer.send('overlay-resize', expanded);
    }
});
