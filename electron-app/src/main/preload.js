/**
 * Star Commander - Preload Script
 * Secure bridge between main and renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Window controls
    window: {
        minimize: () => ipcRenderer.send('window-minimize'),
        maximize: () => ipcRenderer.send('window-maximize'),
        close: () => ipcRenderer.send('window-close')
    },
    
    // Config
    config: {
        get: (key) => ipcRenderer.invoke('config-get', key),
        set: (key, value) => ipcRenderer.invoke('config-set', key, value),
        reset: () => ipcRenderer.invoke('reset-config')
    },
    
    // Relay
    relay: {
        start: () => ipcRenderer.invoke('relay-start'),
        stop: () => ipcRenderer.invoke('relay-stop'),
        setTarget: (target) => ipcRenderer.invoke('relay-set-target', target),
        whisper: (enabled) => ipcRenderer.invoke('relay-whisper', enabled),
        briefing: (enabled) => ipcRenderer.invoke('relay-briefing', enabled),
        updateAudioSettings: (settings) => ipcRenderer.invoke('relay-update-audio-settings', settings)
    },
    
    // Events
    on: (channel, callback) => {
        const validChannels = ['relay-event', 'keybind-pressed'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },
    
    // Setup
    isFirstLaunch: () => ipcRenderer.invoke('is-first-launch'),
    setupComplete: () => ipcRenderer.invoke('setup-complete'),
    
    // Utils
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // Overlay
    overlay: {
        toggle: (enabled) => ipcRenderer.invoke('overlay-toggle', enabled),
        getStatus: () => ipcRenderer.invoke('overlay-status')
    },
    
    // Config export/import
    exportConfig: () => ipcRenderer.invoke('export-config'),
    importConfig: () => ipcRenderer.invoke('import-config'),
    
    // Theme export/import
    exportTheme: (theme) => ipcRenderer.invoke('export-theme', theme),
    importTheme: () => ipcRenderer.invoke('import-theme'),
    
    // Discord members
    getGuildMembers: (token) => ipcRenderer.invoke('get-guild-members', token),

    // Discord chanels
    getGuildChannels: (token) => ipcRenderer.invoke('get-guild-channels', token), // ← Ajoute le paramètre token

});
