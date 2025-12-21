/**
 * Star Commander - Renderer Script
 * V4.0 with Commandant/Chief modes
 */

// State
let isRunning = false;
let currentTarget = 'mute';
let overlayEnabled = false;
let appMode = null; // 'commandant' or 'chief'
let importedConfig = null; // Temp storage for imported config
let isBriefing = false; // Briefing mode active

// DOM Elements
const statusIndicator = document.getElementById('status-indicator');
const statusText = statusIndicator.querySelector('.status-text');
const btnStart = document.getElementById('btn-start');
const activeChannelSpan = document.getElementById('active-channel');
const logsContainer = document.getElementById('logs-container');
const channelButtons = document.querySelectorAll('.channel-btn');

// Initialize
async function init() {
    // Check first launch
    const isFirstLaunch = await window.api.isFirstLaunch();
    if (isFirstLaunch) {
        document.getElementById('wizard-overlay').style.display = 'flex';
        wizardStep(0);
    } else {
        // Load existing config
        const config = await window.api.config.get();
        appMode = config.mode;
        await loadConfig();
        applyModeUI();
    }
    
    // Load overlay status
    overlayEnabled = await window.api.overlay.getStatus();
    // Sync options checkbox
    const overlayCheckbox = document.getElementById('option-overlay');
    if (overlayCheckbox) overlayCheckbox.checked = overlayEnabled;
    
    // Setup event listeners
    setupEventListeners();
    
    // Listen for relay events
    window.api.on('relay-event', handleRelayEvent);
    
    // Listen for keybind presses
    window.api.on('keybind-pressed', handleKeybindPress);
}

// Apply UI based on mode
function applyModeUI() {
    const modeBadge = document.getElementById('mode-badge');
    const exportSection = document.getElementById('export-section');
    const chiefsAddSection = document.getElementById('chiefs-add-section');
    const keybindsCommandant = document.getElementById('keybinds-commandant');
    const keybindsChief = document.getElementById('keybinds-chief');
    const btnWhisper = document.getElementById('btn-whisper');
    const btnBriefing = document.getElementById('btn-briefing');
    const tabBots = document.querySelector('[data-tab="bots"]');
    const tabChiefs = document.querySelector('[data-tab="chiefs"]');
    
    const channelGrid = document.getElementById('channel-grid');
    const btnStartEl = document.getElementById('btn-start');
    const botStatusGrid = document.getElementById('bot-status-grid');
    const chiefStatusInfo = document.getElementById('chief-status-info');
    
    if (appMode === 'commandant') {
        modeBadge.textContent = '👑 Commandant';
        modeBadge.classList.remove('chief');
        if (exportSection) exportSection.style.display = 'flex';
        if (chiefsAddSection) chiefsAddSection.style.display = 'block';
        if (keybindsCommandant) keybindsCommandant.style.display = 'block';
        if (keybindsChief) keybindsChief.style.display = 'none';
        if (btnWhisper) btnWhisper.style.display = 'none';
        if (btnBriefing) btnBriefing.style.display = 'flex'; // Show in grid
        if (tabBots) tabBots.style.display = '';
        if (tabChiefs) tabChiefs.style.display = '';
        if (channelGrid) channelGrid.style.display = 'grid';
        if (btnStartEl) btnStartEl.style.display = '';
        if (botStatusGrid) botStatusGrid.style.display = 'grid';
        if (chiefStatusInfo) chiefStatusInfo.style.display = 'none';
    } else if (appMode === 'chief') {
        modeBadge.textContent = '🎖️ Chef';
        modeBadge.classList.add('chief');
        if (exportSection) exportSection.style.display = 'none';
        if (chiefsAddSection) chiefsAddSection.style.display = 'none';
        if (keybindsCommandant) keybindsCommandant.style.display = 'none';
        if (keybindsChief) keybindsChief.style.display = 'block';
        if (btnWhisper) btnWhisper.style.display = 'block';
        if (btnBriefing) btnBriefing.style.display = 'none'; // Hide in grid
        if (tabBots) tabBots.style.display = 'none';
        if (tabChiefs) tabChiefs.style.display = 'none';
        // Hide channel selector and start button for chiefs
        if (channelGrid) channelGrid.style.display = 'none';
        if (btnStartEl) btnStartEl.style.display = 'none';
        // Show chief info instead of bot status
        if (botStatusGrid) botStatusGrid.style.display = 'none';
        if (chiefStatusInfo) chiefStatusInfo.style.display = 'block';
        // Show ready state
        statusIndicator.classList.add('running');
        statusText.textContent = 'Ready';
        
        // Show chief's assigned channel
        updateChiefChannelDisplay();
        
        // Auto-enable overlay for chiefs and show MUTE
        window.api.overlay.toggle(true);
        window.api.relay.setTarget('mute');
        overlayEnabled = true;
    }
}

// Update display for chief's channel
async function updateChiefChannelDisplay() {
    const config = await window.api.config.get();
    const myChiefId = config.myChiefId;
    const chiefs = config.chiefs || [];
    const myChief = chiefs.find(c => c.userId === myChiefId);
    
    if (myChief) {
        const channelName = myChief.channelName || myChief.channelKey;
        activeChannelSpan.textContent = channelName;
        
        // Update chief info card
        const nameEl = document.getElementById('chief-identity-name');
        const channelEl = document.getElementById('chief-identity-channel');
        if (nameEl) nameEl.textContent = myChief.name;
        if (channelEl) channelEl.textContent = channelName;
    } else {
        activeChannelSpan.textContent = 'Non assigné';
    }
}

// Load configuration
async function loadConfig() {
    const config = await window.api.config.get();
    
    // Emitter
    document.getElementById('token-emitter').value = config.tokens?.emitter || '';
    document.getElementById('channel-source').value = config.channels?.source?.id || '';
    
    // Relay channel (whisper)
    const relayInput = document.getElementById('channel-relay');
    const webhookInput = document.getElementById('webhook-relay');
    if (relayInput) relayInput.value = config.channels?.relay?.id || '';
    if (webhookInput) webhookInput.value = config.channels?.relay?.webhookUrl || '';
    
    // Receivers (tokens)
    document.getElementById('token-receiver1').value = config.tokens?.receivers?.receiver1 || '';
    document.getElementById('token-receiver2').value = config.tokens?.receivers?.receiver2 || '';
    document.getElementById('token-receiver3').value = config.tokens?.receivers?.receiver3 || '';
    
    // Receiver names
    const names = config.tokens?.names || {};
    document.getElementById('name-receiver1').value = names.receiver1 || '';
    document.getElementById('name-receiver2').value = names.receiver2 || '';
    document.getElementById('name-receiver3').value = names.receiver3 || '';
    
    // Update Status tab with receiver names
    document.getElementById('receiver1-name').textContent = names.receiver1 || 'Receiver 1';
    document.getElementById('receiver2-name').textContent = names.receiver2 || 'Receiver 2';
    document.getElementById('receiver3-name').textContent = names.receiver3 || 'Receiver 3';
    
    // Target channels
    if (config.channels?.targets) {
        config.channels.targets.forEach((target, i) => {
            const idInput = document.getElementById(`target${i+1}-id`);
            if (idInput) idInput.value = target.id || '';
            
            // Update channel button names
            const nameSpan = document.getElementById(`channel${i+1}-name`);
            if (nameSpan && target.name) {
                nameSpan.textContent = target.name;
            }
        });
    }
    
    // Chiefs
    renderChiefs(config.chiefs || []);
    updateChiefChannelOptions();
    
    // Keybinds
    const keybinds = config.keybinds || {};
    document.getElementById('keybind-all').value = keybinds.all || '';
    document.getElementById('keybind-mute').value = keybinds.mute || '';
    document.getElementById('keybind-channel1').value = keybinds.channel1 || '';
    document.getElementById('keybind-channel2').value = keybinds.channel2 || '';
    document.getElementById('keybind-channel3').value = keybinds.channel3 || '';
    
    const whisperInput = document.getElementById('keybind-whisper');
    if (whisperInput) whisperInput.value = keybinds.whisper || '';
    
    const briefingInput = document.getElementById('keybind-briefing');
    if (briefingInput) briefingInput.value = keybinds.briefing || '';
    
    // Update channel button keybind displays
    updateChannelButtonKeybinds(keybinds);
    
    // Update keybind labels with channel names
    const keybindNames = config.tokens?.names || {};
    const label1 = document.getElementById('keybind-channel1-label');
    const label2 = document.getElementById('keybind-channel2-label');
    const label3 = document.getElementById('keybind-channel3-label');
    if (label1) label1.textContent = keybindNames.receiver1 || 'Channel 1';
    if (label2) label2.textContent = keybindNames.receiver2 || 'Channel 2';
    if (label3) label3.textContent = keybindNames.receiver3 || 'Channel 3';
    
    // Options
    const settings = config.settings || {};
    const radioEffectCheckbox = document.getElementById('option-radio-effect');
    const radioIntensitySlider = document.getElementById('option-radio-intensity');
    const radioIntensityValue = document.getElementById('radio-intensity-value');
    const clickSoundCheckbox = document.getElementById('option-click-sound');
    const overlayCheckbox = document.getElementById('option-overlay');
    
    if (overlayCheckbox) overlayCheckbox.checked = settings.overlayEnabled !== false;
    if (radioEffectCheckbox) radioEffectCheckbox.checked = settings.radioEffectEnabled !== false;
    if (clickSoundCheckbox) clickSoundCheckbox.checked = settings.clickSoundEnabled !== false;
    
    if (radioIntensitySlider) {
        const intensity = settings.radioEffectIntensity ?? 50;
        radioIntensitySlider.value = intensity;
        if (radioIntensityValue) radioIntensityValue.textContent = intensity + '%';
    }
    
    // Show/hide intensity slider based on radio effect state
    const intensityRow = document.getElementById('radio-intensity-row');
    if (intensityRow && radioEffectCheckbox) {
        intensityRow.style.display = radioEffectCheckbox.checked ? 'flex' : 'none';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Window controls
    document.getElementById('btn-minimize').onclick = () => window.api.window.minimize();
    document.getElementById('btn-close').onclick = () => window.api.window.close();
    
    // Start/Stop button
    btnStart.onclick = toggleRelay;
    
    // Channel buttons
    channelButtons.forEach(btn => {
        btn.onclick = () => setTarget(btn.dataset.target);
    });
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => switchTab(btn.dataset.tab);
    });
    
    // Save buttons
    document.getElementById('btn-save-bots').onclick = saveBots;
    document.getElementById('btn-save-keybinds').onclick = saveKeybinds;
    document.getElementById('btn-save-options').onclick = saveOptions;
    document.getElementById('btn-add-chief').onclick = addChief;
    
    // Reset keybinds button
    const btnResetKeybinds = document.getElementById('btn-reset-keybinds');
    if (btnResetKeybinds) btnResetKeybinds.onclick = resetKeybinds;
    
    // Overlay toggle in options
    const overlayOptionCheckbox = document.getElementById('option-overlay');
    if (overlayOptionCheckbox) {
        overlayOptionCheckbox.onchange = async () => {
            overlayEnabled = overlayOptionCheckbox.checked;
            await window.api.overlay.toggle(overlayEnabled);
        };
    }
    
    // Export config
    const btnExport = document.getElementById('btn-export-config');
    if (btnExport) btnExport.onclick = exportConfig;
    
    // Import config (commandant)
    const btnImport = document.getElementById('btn-import-config');
    if (btnImport) btnImport.onclick = importConfigCommandant;
    
    // Reset config
    const btnReset = document.getElementById('btn-reset-config');
    if (btnReset) btnReset.onclick = resetConfig;
    
    // Keybind inputs
    document.querySelectorAll('.keybind-input').forEach(input => {
        input.addEventListener('keydown', handleKeybindCapture);
    });
    
    // Wizard mode selection
    document.getElementById('btn-mode-commandant').onclick = () => {
        appMode = 'commandant';
        wizardStep('cmd-0');  // Go to "existing config?" step
    };
    
    document.getElementById('btn-mode-chief').onclick = () => {
        appMode = 'chief';
        wizardStep('chief-1');
    };
    
    // Commandant: existing config or new?
    document.getElementById('btn-cmd-import').onclick = () => {
        wizardStep('cmd-import');
    };
    
    document.getElementById('btn-cmd-new').onclick = () => {
        wizardStep('cmd-1');
    };
    
    // Commandant import zone (direct call, no input file needed)
    const importZoneCmd = document.getElementById('import-zone-cmd');
    if (importZoneCmd) {
        importZoneCmd.onclick = handleImportFileCommandant;
    }
    
    // Chief import zone (direct call, no input file needed)
    const importZone = document.getElementById('import-zone');
    if (importZone) {
        importZone.onclick = handleImportFile;
    }
    
    // Chief select
    const chiefSelect = document.getElementById('wizard-chief-select');
    if (chiefSelect) {
        chiefSelect.onchange = handleChiefSelect;
    }
    
    // Whisper button (toggle mode)
    const btnWhisper = document.getElementById('btn-whisper');
    if (btnWhisper) {
        btnWhisper.onclick = () => toggleWhisperMode();
    }
    
    // Briefing button (toggle mode, Commandant only)
    const btnBriefing = document.getElementById('btn-briefing');
    if (btnBriefing) {
        btnBriefing.onclick = () => toggleBriefingMode();
    }
    
    // Radio intensity slider
    const radioIntensitySlider = document.getElementById('option-radio-intensity');
    if (radioIntensitySlider) {
        radioIntensitySlider.oninput = () => {
            const value = radioIntensitySlider.value;
            document.getElementById('radio-intensity-value').textContent = value + '%';
        };
    }
    
    // Show/hide intensity slider based on radio effect toggle
    const radioEffectCheckbox = document.getElementById('option-radio-effect');
    if (radioEffectCheckbox) {
        radioEffectCheckbox.onchange = () => {
            const intensityRow = document.getElementById('radio-intensity-row');
            if (intensityRow) {
                intensityRow.style.display = radioEffectCheckbox.checked ? 'flex' : 'none';
            }
        };
    }
}

// Toggle relay start/stop
async function toggleRelay() {
    if (isRunning) {
        setLoadingState(true, 'Stopping...');
        const result = await window.api.relay.stop();
        setLoadingState(false);
        
        if (result.success) {
            setRunningState(false);
            addLog('Relay stopped', 'info');
        }
    } else {
        setLoadingState(true, 'Connecting...');
        addLog('Starting relay...', 'info');
        
        const result = await window.api.relay.start();
        setLoadingState(false);
        
        if (result.success) {
            setRunningState(true);
            addLog('Relay started', 'success');
        } else {
            addLog(`Failed to start: ${result.error}`, 'error');
        }
    }
}

// Set loading state
function setLoadingState(loading, text = 'Loading...') {
    if (loading) {
        btnStart.disabled = true;
        btnStart.innerHTML = `<span class="spinner"></span> ${text}`;
        btnStart.classList.add('btn-loading');
    } else {
        btnStart.disabled = false;
        btnStart.classList.remove('btn-loading');
    }
}

// Set running state
function setRunningState(running) {
    isRunning = running;
    
    if (running) {
        statusIndicator.classList.add('running');
        statusText.textContent = 'Running';
        btnStart.textContent = '■ Stop';
        btnStart.classList.remove('btn-primary');
    } else {
        statusIndicator.classList.remove('running');
        statusText.textContent = 'Stopped';
        btnStart.textContent = '▶ Start';
        btnStart.classList.add('btn-primary');
        
        // Reset all bot statuses
        document.getElementById('emitter-status').classList.remove('connected');
        document.getElementById('receiver1-status').classList.remove('connected');
        document.getElementById('receiver2-status').classList.remove('connected');
        document.getElementById('receiver3-status').classList.remove('connected');
    }
}

// Set target channel
async function setTarget(target) {
    currentTarget = target;
    
    // Update UI
    channelButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === target);
    });
    
    // Get display name
    let displayName = target.toUpperCase();
    if (target.startsWith('channel')) {
        const config = await window.api.config.get();
        const index = parseInt(target.replace('channel', '')) - 1;
        const receiverName = config.tokens?.names?.[`receiver${index + 1}`];
        displayName = receiverName || config.channels?.targets?.[index]?.name || target;
    }
    
    activeChannelSpan.textContent = displayName;
    
    // Tell relay
    if (isRunning) {
        window.api.relay.setTarget(target);
    }
    
    addLog(`Target: ${displayName}`, 'info');
}

// Handle keybind press from main process
function handleKeybindPress(target) {
    if (target === 'whisper') {
        // Toggle whisper on keybind
        toggleWhisperMode();
    } else if (target === 'briefing') {
        // Toggle briefing on keybind (Commandant only)
        toggleBriefingMode();
    } else {
        setTarget(target);
    }
}

// Whisper functions
let isWhispering = false;

async function startWhisper() {
    if (isWhispering) return;
    
    // Whisper is only for Chiefs
    if (appMode !== 'chief') {
        addLog('Whisper réservé aux Chefs', 'warning');
        return;
    }
    
    isWhispering = true;
    
    const btnWhisper = document.getElementById('btn-whisper');
    if (btnWhisper) btnWhisper.classList.add('active');
    
    // Update overlay
    window.api.relay.setTarget('whisper');
    
    // Send whisper ON command via Discord
    const result = await window.api.relay.whisper(true);
    if (result.success) {
        addLog('🎤 Whisper: ON (vers Commandant)', 'warning');
    } else {
        addLog(`❌ Whisper error: ${result.error}`, 'error');
        isWhispering = false;
        if (btnWhisper) btnWhisper.classList.remove('active');
        // Reset overlay
        window.api.relay.setTarget('mute');
    }
}

async function stopWhisper() {
    if (!isWhispering) return;
    
    // Update UI immediately
    isWhispering = false;
    
    const btnWhisper = document.getElementById('btn-whisper');
    if (btnWhisper) btnWhisper.classList.remove('active');
    
    // Update overlay immediately
    window.api.relay.setTarget('mute');
    
    addLog('🎤 Whisper: OFF', 'info');
    
    // Send whisper OFF command (fire and forget - don't wait)
    window.api.relay.whisper(false).catch(err => {
        console.error('Whisper OFF error:', err);
    });
}

function toggleWhisperMode() {
    if (isWhispering) {
        stopWhisper();
    } else {
        startWhisper();
    }
}

// Briefing functions (Commandant only)
async function startBriefing() {
    if (isBriefing) return;
    
    // Briefing is only for Commandants
    if (appMode !== 'commandant') {
        addLog('Briefing réservé aux Commandants', 'warning');
        return;
    }
    
    // Relay must be running
    if (!isRunning) {
        addLog('Lancez le relay avant le briefing', 'warning');
        return;
    }
    
    isBriefing = true;
    
    const btnBriefing = document.getElementById('btn-briefing');
    if (btnBriefing) btnBriefing.classList.add('active');
    
    // Update overlay
    window.api.relay.setTarget('briefing');
    
    // Start briefing
    const result = await window.api.relay.briefing(true);
    if (!result.success) {
        addLog(`❌ Briefing error: ${result.error}`, 'error');
        isBriefing = false;
        if (btnBriefing) btnBriefing.classList.remove('active');
        window.api.relay.setTarget('mute');
    }
}

async function endBriefing() {
    if (!isBriefing) return;
    
    // Update UI immediately
    isBriefing = false;
    
    const btnBriefing = document.getElementById('btn-briefing');
    if (btnBriefing) btnBriefing.classList.remove('active');
    
    // Update overlay
    window.api.relay.setTarget('mute');
    
    // End briefing
    const result = await window.api.relay.briefing(false);
    if (!result.success) {
        addLog(`❌ End briefing error: ${result.error}`, 'error');
    }
}

function toggleBriefingMode() {
    if (isBriefing) {
        endBriefing();
    } else {
        startBriefing();
    }
}

// Handle relay events
function handleRelayEvent({ event, data }) {
    switch (event) {
        case 'bot-connected':
            addLog(`✓ ${data.name} connected`, 'success');
            updateBotStatus(data.index, true);
            break;
        case 'bot-disconnected':
            addLog(`✗ ${data.name} disconnected`, 'warning');
            updateBotStatus(data.index, false);
            break;
        case 'speaking':
            addLog(`🎤 [${data.user}] → ${data.targets}`, 'speaking');
            break;
        case 'error':
            addLog(`❌ ${data.message}`, 'error');
            break;
        case 'overlay-toggled':
            overlayEnabled = data.enabled;
            // Sync options checkbox
            const overlayChk = document.getElementById('option-overlay');
            if (overlayChk) overlayChk.checked = overlayEnabled;
            break;
        case 'whisper-on':
            addLog(`🎤 [${data.user}] Whisper actif`, 'warning');
            break;
        case 'whisper-off':
            addLog(`🎤 [${data.user}] Whisper désactivé`, 'info');
            break;
        case 'whisper-speaking':
            addLog(`📢 Whisper: [${data.user}] → Commandants`, 'speaking');
            break;
        case 'whisper-sent':
            // Already logged locally
            break;
        case 'info':
            addLog(data.message, 'info');
            break;
        case 'warning':
            addLog(data.message, 'warning');
            break;
        case 'briefing-started':
            addLog(`📢 Briefing démarré - ${data.movedCount} membres déplacés`, 'success');
            break;
        case 'briefing-ended':
            addLog(`📢 Briefing terminé - ${data.movedCount} membres renvoyés`, 'success');
            break;
    }
}

// Update bot status indicator using index
function updateBotStatus(index, connected) {
    const statusId = index === 'emitter' ? 'emitter-status' : `${index}-status`;
    const element = document.getElementById(statusId);
    if (element) {
        element.classList.toggle('connected', connected);
    }
}

// Add log entry
function addLog(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    
    logsContainer.appendChild(entry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
    
    // Keep only last 100 logs
    while (logsContainer.children.length > 100) {
        logsContainer.removeChild(logsContainer.firstChild);
    }
}

// Switch tab
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });
}

// Update channel button keybind display
function updateChannelButtonKeybinds(keybinds) {
    const keyMap = {
        'mute': document.querySelector('[data-target="mute"] .channel-key'),
        'all': document.querySelector('[data-target="all"] .channel-key'),
        'channel1': document.querySelector('[data-target="channel1"] .channel-key'),
        'channel2': document.querySelector('[data-target="channel2"] .channel-key'),
        'channel3': document.querySelector('[data-target="channel3"] .channel-key'),
        'briefing': document.querySelector('#btn-briefing .channel-key')
    };
    
    if (keyMap.mute && keybinds.mute) keyMap.mute.textContent = keybinds.mute;
    if (keyMap.all && keybinds.all) keyMap.all.textContent = keybinds.all;
    if (keyMap.channel1 && keybinds.channel1) keyMap.channel1.textContent = keybinds.channel1;
    if (keyMap.channel2 && keybinds.channel2) keyMap.channel2.textContent = keybinds.channel2;
    if (keyMap.channel3 && keybinds.channel3) keyMap.channel3.textContent = keybinds.channel3;
    if (keyMap.briefing && keybinds.briefing) keyMap.briefing.textContent = keybinds.briefing;
}

// Save all bots config
async function saveBots() {
    const names = {
        receiver1: document.getElementById('name-receiver1').value,
        receiver2: document.getElementById('name-receiver2').value,
        receiver3: document.getElementById('name-receiver3').value
    };
    
    await window.api.config.set('tokens', {
        emitter: document.getElementById('token-emitter').value,
        receivers: {
            receiver1: document.getElementById('token-receiver1').value,
            receiver2: document.getElementById('token-receiver2').value,
            receiver3: document.getElementById('token-receiver3').value
        },
        names: names
    });
    
    // Build targets
    const targets = [];
    for (let i = 1; i <= 3; i++) {
        const name = names[`receiver${i}`];
        const id = document.getElementById(`target${i}-id`).value;
        if (name && id) {
            targets.push({ name, id, tokenKey: `receiver${i}` });
        }
    }
    
    await window.api.config.set('channels', {
        source: {
            id: document.getElementById('channel-source').value,
            name: 'Commandants'
        },
        targets,
        relay: {
            id: document.getElementById('channel-relay')?.value || '',
            webhookUrl: document.getElementById('webhook-relay')?.value || ''
        }
    });
    
    // Update UI
    document.getElementById('receiver1-name').textContent = names.receiver1 || 'Receiver 1';
    document.getElementById('receiver2-name').textContent = names.receiver2 || 'Receiver 2';
    document.getElementById('receiver3-name').textContent = names.receiver3 || 'Receiver 3';
    
    targets.forEach((target, i) => {
        const nameSpan = document.getElementById(`channel${i+1}-name`);
        if (nameSpan) nameSpan.textContent = target.name;
    });
    
    updateChiefChannelOptions();
    addLog('Bots configuration saved', 'success');
}

// Save keybinds
async function saveKeybinds() {
    const keybinds = {
        all: document.getElementById('keybind-all').value,
        mute: document.getElementById('keybind-mute').value,
        channel1: document.getElementById('keybind-channel1').value,
        channel2: document.getElementById('keybind-channel2').value,
        channel3: document.getElementById('keybind-channel3').value
    };
    
    const whisperInput = document.getElementById('keybind-whisper');
    if (whisperInput) {
        keybinds.whisper = whisperInput.value;
    }
    
    const briefingInput = document.getElementById('keybind-briefing');
    if (briefingInput) {
        keybinds.briefing = briefingInput.value;
    }
    
    await window.api.config.set('keybinds', keybinds);
    
    // Update button displays
    updateChannelButtonKeybinds(keybinds);
    
    addLog('Keybinds saved', 'success');
}

// Reset keybinds to default
async function resetKeybinds() {
    const defaultKeybinds = {
        all: 'num0',
        mute: 'num1',
        channel1: 'num2',
        channel2: 'num3',
        channel3: 'num4',
        whisper: 'num9',
        briefing: 'num5'
    };
    
    // Update UI
    document.getElementById('keybind-all').value = defaultKeybinds.all;
    document.getElementById('keybind-mute').value = defaultKeybinds.mute;
    document.getElementById('keybind-channel1').value = defaultKeybinds.channel1;
    document.getElementById('keybind-channel2').value = defaultKeybinds.channel2;
    document.getElementById('keybind-channel3').value = defaultKeybinds.channel3;
    
    const whisperInput = document.getElementById('keybind-whisper');
    if (whisperInput) whisperInput.value = defaultKeybinds.whisper;
    
    const briefingInput = document.getElementById('keybind-briefing');
    if (briefingInput) briefingInput.value = defaultKeybinds.briefing;
    
    // Save to config
    await window.api.config.set('keybinds', defaultKeybinds);
    
    // Update button displays
    updateChannelButtonKeybinds(defaultKeybinds);
    
    addLog('Keybinds reset to default', 'success');
}

// Save options
async function saveOptions() {
    const overlayEnabled = document.getElementById('option-overlay').checked;
    const radioEffectEnabled = document.getElementById('option-radio-effect').checked;
    const radioEffectIntensity = parseInt(document.getElementById('option-radio-intensity').value);
    const clickSoundEnabled = document.getElementById('option-click-sound').checked;
    
    const config = await window.api.config.get();
    const settings = config.settings || {};
    
    settings.overlayEnabled = overlayEnabled;
    settings.radioEffectEnabled = radioEffectEnabled;
    settings.radioEffectIntensity = radioEffectIntensity;
    settings.clickSoundEnabled = clickSoundEnabled;
    
    await window.api.config.set('settings', settings);
    
    // Update relay audio settings in real-time (if running)
    await window.api.relay.updateAudioSettings({
        radioEffectEnabled,
        radioEffectIntensity,
        clickSoundEnabled
    });
    
    addLog('Options saved', 'success');
}

// Handle keybind capture
function handleKeybindCapture(e) {
    e.preventDefault();
    
    let key = '';
    
    if (e.ctrlKey) key += 'Ctrl+';
    if (e.altKey) key += 'Alt+';
    if (e.shiftKey) key += 'Shift+';
    
    const keyMap = {
        'Numpad0': 'num0', 'Numpad1': 'num1', 'Numpad2': 'num2', 'Numpad3': 'num3',
        'Numpad4': 'num4', 'Numpad5': 'num5', 'Numpad6': 'num6', 'Numpad7': 'num7',
        'Numpad8': 'num8', 'Numpad9': 'num9', 'NumpadAdd': 'numadd', 'NumpadSubtract': 'numsub',
        'NumpadMultiply': 'nummult', 'NumpadDivide': 'numdiv', 'NumpadDecimal': 'numdec',
        'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4', 'F5': 'F5', 'F6': 'F6',
        'F7': 'F7', 'F8': 'F8', 'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12'
    };
    
    const mappedKey = keyMap[e.code] || e.key.toUpperCase();
    
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        return;
    }
    
    key += mappedKey;
    e.target.value = key;
}

// Render chiefs list
function renderChiefs(chiefs) {
    const container = document.getElementById('chiefs-list');
    if (!container) return;
    
    container.innerHTML = chiefs.map((chief, i) => `
        <div class="chief-item">
            <div class="chief-info">
                <span class="chief-name">${chief.name}</span>
                <span class="chief-channel">${chief.channelName || chief.channelKey}</span>
                <span class="chief-id">${chief.userId}</span>
            </div>
            <button onclick="removeChief(${i})">✕</button>
        </div>
    `).join('');
}

// Update chief channel dropdown options
async function updateChiefChannelOptions() {
    const select = document.getElementById('new-chief-channel');
    if (!select) return;
    
    const config = await window.api.config.get();
    const names = config.tokens?.names || {};
    
    select.innerHTML = '<option value="">-- Channel --</option>';
    
    for (let i = 1; i <= 3; i++) {
        const name = names[`receiver${i}`];
        if (name) {
            select.innerHTML += `<option value="receiver${i}">${name}</option>`;
        } else {
            select.innerHTML += `<option value="receiver${i}">Receiver ${i}</option>`;
        }
    }
}

// Add chief
async function addChief() {
    const userId = document.getElementById('new-chief-userid').value;
    const name = document.getElementById('new-chief-name').value;
    const channelKey = document.getElementById('new-chief-channel').value;
    
    if (!userId || !name || !channelKey) {
        addLog('Remplissez tous les champs', 'warning');
        return;
    }
    
    const config = await window.api.config.get();
    const chiefs = config.chiefs || [];
    
    const channelName = config.tokens?.names?.[channelKey] || channelKey;
    
    chiefs.push({ userId, name, channelKey, channelName });
    
    await window.api.config.set('chiefs', chiefs);
    renderChiefs(chiefs);
    
    document.getElementById('new-chief-userid').value = '';
    document.getElementById('new-chief-name').value = '';
    document.getElementById('new-chief-channel').value = '';
    
    addLog(`Chef "${name}" ajouté`, 'success');
}

// Remove chief
async function removeChief(index) {
    const config = await window.api.config.get();
    const chiefs = config.chiefs || [];
    chiefs.splice(index, 1);
    
    await window.api.config.set('chiefs', chiefs);
    renderChiefs(chiefs);
    
    addLog('Chef supprimé', 'info');
}

// Export config
async function exportConfig() {
    const result = await window.api.exportConfig();
    if (result.success) {
        addLog(`Config exportée: ${result.path}`, 'success');
    } else {
        addLog('Export annulé', 'info');
    }
}

// Import config (for commandant - restore/migrate)
async function importConfigCommandant() {
    const result = await window.api.importConfig();
    
    if (result.success) {
        const data = result.data;
        
        // Save imported config
        await window.api.config.set('tokens', data.tokens);
        await window.api.config.set('channels', data.channels);
        await window.api.config.set('chiefs', data.chiefs || []);
        
        // Reload UI
        await loadConfig();
        
        addLog('Config importée avec succès !', 'success');
    } else if (result.error) {
        addLog(`Erreur import: ${result.error}`, 'error');
    } else {
        addLog('Import annulé', 'info');
    }
}

// Handle import file for Commandant (restore config)
async function handleImportFileCommandant(e) {
    const result = await window.api.importConfig();
    
    if (result.success) {
        importedConfig = result.data;
        
        // Show preview
        document.getElementById('import-preview-cmd').style.display = 'block';
        
        const list = document.getElementById('import-channels-list-cmd');
        list.innerHTML = '';
        
        if (importedConfig.channels?.targets) {
            importedConfig.channels.targets.forEach(t => {
                list.innerHTML += `<li>📢 ${t.name}</li>`;
            });
        }
        
        // Enable finish button
        document.getElementById('btn-cmd-import-finish').disabled = false;
        
    } else if (result.error) {
        addLog(`Erreur import: ${result.error}`, 'error');
    }
}

// Wizard finish - Commandant with imported config
async function wizardFinishCommandantImport() {
    if (!importedConfig) {
        addLog('Erreur: pas de config importée', 'error');
        return;
    }
    
    // Save mode
    await window.api.config.set('mode', 'commandant');
    
    // Save imported config
    await window.api.config.set('tokens', importedConfig.tokens);
    await window.api.config.set('channels', importedConfig.channels);
    await window.api.config.set('chiefs', importedConfig.chiefs || []);
    
    // Mark setup complete
    await window.api.setupComplete();
    
    // Hide wizard
    document.getElementById('wizard-overlay').style.display = 'none';
    
    // Load config and apply UI
    appMode = 'commandant';
    await loadConfig();
    applyModeUI();
    
    addLog('Config importée ! Cliquez Start pour commencer.', 'success');
}

// Handle import file for Chief
async function handleImportFile(e) {
    const result = await window.api.importConfig();
    
    if (result.success) {
        importedConfig = result.data;
        
        // Show preview
        document.getElementById('import-preview').style.display = 'block';
        
        const list = document.getElementById('import-channels-list');
        list.innerHTML = '';
        
        if (importedConfig.channels?.targets) {
            importedConfig.channels.targets.forEach(t => {
                list.innerHTML += `<li>📢 ${t.name}</li>`;
            });
        }
        
        // Populate chief select
        const chiefSelect = document.getElementById('wizard-chief-select');
        chiefSelect.innerHTML = '<option value="">-- Sélectionnez --</option>';
        
        if (importedConfig.chiefs && importedConfig.chiefs.length > 0) {
            importedConfig.chiefs.forEach(chief => {
                chiefSelect.innerHTML += `<option value="${chief.userId}">${chief.name} (${chief.channelName || chief.channelKey})</option>`;
            });
            // Enable next button only if chiefs exist
            document.getElementById('btn-chief-next').disabled = false;
        } else {
            // No chiefs configured - show warning
            chiefSelect.innerHTML = '<option value="">⚠️ Aucun chef configuré</option>';
            document.getElementById('btn-chief-next').disabled = true;
            list.innerHTML += '<li style="color: var(--warning)">⚠️ Demandez au Commandant de vous ajouter dans l\'onglet Chiefs</li>';
        }
        
    } else if (result.error) {
        addLog(`Erreur import: ${result.error}`, 'error');
    }
}

// Handle chief select
function handleChiefSelect(e) {
    const chiefId = e.target.value;
    const chiefInfo = document.getElementById('chief-info');
    const btnFinish = document.getElementById('btn-chief-finish');
    
    if (chiefId && chiefId !== '') {
        chiefInfo.style.display = 'block';
        btnFinish.disabled = false;
        
        const chiefs = importedConfig?.chiefs || [];
        const chief = chiefs.find(c => c.userId === chiefId);
        if (chief) {
            document.getElementById('chief-channel-name').textContent = chief.channelName || chief.channelKey;
        } else {
            document.getElementById('chief-channel-name').textContent = 'Channel inconnu';
        }
    } else {
        chiefInfo.style.display = 'none';
        btnFinish.disabled = true;
    }
}

// Wizard navigation
function wizardStep(step) {
    document.querySelectorAll('.wizard-step').forEach(s => s.style.display = 'none');
    document.getElementById(`wizard-step-${step}`).style.display = 'block';
}

// Wizard validation functions
function wizardValidateStep2() {
    const emitter = document.getElementById('wizard-token-emitter').value.trim();
    const receiver1 = document.getElementById('wizard-token-receiver1').value.trim();
    
    if (!emitter) {
        alert('⚠️ Le token Emitter est obligatoire');
        document.getElementById('wizard-token-emitter').focus();
        return;
    }
    
    if (!receiver1) {
        alert('⚠️ Au moins le token Receiver 1 est obligatoire');
        document.getElementById('wizard-token-receiver1').focus();
        return;
    }
    
    wizardStep('cmd-3');
}

function wizardValidateStep3() {
    const source = document.getElementById('wizard-channel-source').value.trim();
    const target1Name = document.getElementById('wizard-target1-name').value.trim();
    const target1Id = document.getElementById('wizard-target1-id').value.trim();
    
    if (!source) {
        alert('⚠️ Le Channel Source (Commandants) est obligatoire');
        document.getElementById('wizard-channel-source').focus();
        return;
    }
    
    if (!target1Name || !target1Id) {
        alert('⚠️ Au moins le Target 1 (nom + ID) est obligatoire');
        if (!target1Name) {
            document.getElementById('wizard-target1-name').focus();
        } else {
            document.getElementById('wizard-target1-id').focus();
        }
        return;
    }
    
    wizardStep('cmd-4');
}

function wizardValidateStep4() {
    const relayId = document.getElementById('wizard-channel-relay').value.trim();
    const webhookUrl = document.getElementById('wizard-webhook-relay').value.trim();
    
    if (!relayId) {
        alert('⚠️ Le Channel Relay ID est obligatoire pour le Whisper');
        document.getElementById('wizard-channel-relay').focus();
        return;
    }
    
    if (!webhookUrl) {
        alert('⚠️ Le Webhook URL est obligatoire pour le Whisper');
        document.getElementById('wizard-webhook-relay').focus();
        return;
    }
    
    if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
        alert('⚠️ Le Webhook URL doit commencer par https://discord.com/api/webhooks/');
        document.getElementById('wizard-webhook-relay').focus();
        return;
    }
    
    wizardFinishCommandant();
}

// Wizard finish - Commandant
async function wizardFinishCommandant() {
    // Save mode
    await window.api.config.set('mode', 'commandant');
    
    // Save tokens
    await window.api.config.set('tokens', {
        emitter: document.getElementById('wizard-token-emitter').value,
        receivers: {
            receiver1: document.getElementById('wizard-token-receiver1').value,
            receiver2: document.getElementById('wizard-token-receiver2').value,
            receiver3: document.getElementById('wizard-token-receiver3').value
        },
        names: {
            receiver1: document.getElementById('wizard-target1-name').value,
            receiver2: document.getElementById('wizard-target2-name').value,
            receiver3: document.getElementById('wizard-target3-name').value
        }
    });
    
    // Save channels
    const targets = [];
    for (let i = 1; i <= 3; i++) {
        const name = document.getElementById(`wizard-target${i}-name`).value;
        const id = document.getElementById(`wizard-target${i}-id`).value;
        if (name && id) {
            targets.push({ name, id, tokenKey: `receiver${i}` });
        }
    }
    
    await window.api.config.set('channels', {
        source: {
            id: document.getElementById('wizard-channel-source').value,
            name: 'Commandants'
        },
        targets,
        relay: {
            id: document.getElementById('wizard-channel-relay').value,
            webhookUrl: document.getElementById('wizard-webhook-relay').value,
            name: 'relay-commands'
        }
    });
    
    // Mark setup complete
    await window.api.setupComplete();
    
    // Hide wizard
    document.getElementById('wizard-overlay').style.display = 'none';
    
    // Load config and apply UI
    appMode = 'commandant';
    await loadConfig();
    applyModeUI();
    
    addLog('Setup Commandant terminé ! Cliquez Start pour commencer.', 'success');
}

// Wizard finish - Chief
async function wizardFinishChief() {
    if (!importedConfig) {
        addLog('Erreur: pas de config importée', 'error');
        return;
    }
    
    const selectedChiefId = document.getElementById('wizard-chief-select').value;
    
    if (!selectedChiefId) {
        alert('⚠️ Veuillez sélectionner votre profil');
        return;
    }
    
    // Save mode
    await window.api.config.set('mode', 'chief');
    
    // Save imported config
    await window.api.config.set('tokens', importedConfig.tokens);
    await window.api.config.set('channels', importedConfig.channels);
    await window.api.config.set('chiefs', importedConfig.chiefs || []);
    
    // Save my chief ID
    await window.api.config.set('myChiefId', selectedChiefId);
    
    // Mark setup complete
    await window.api.setupComplete();
    
    // Hide wizard
    document.getElementById('wizard-overlay').style.display = 'none';
    
    // Load config and apply UI
    appMode = 'chief';
    await loadConfig();
    applyModeUI();
    
    addLog('Setup Chef terminé ! Utilisez Whisper pour parler au Commandant.', 'success');
}

// Reset config and show wizard (for testing)
async function resetAndShowWizard() {
    await window.api.config.reset();
    document.getElementById('wizard-overlay').style.display = 'flex';
    wizardStep(0);
    addLog('Config reset, wizard opened', 'info');
}

// Reset config with confirmation
async function resetConfig() {
    const confirmed = confirm('⚠️ Ceci va supprimer toute la configuration et relancer le wizard.\n\nÊtes-vous sûr ?');
    
    if (confirmed) {
        // Stop relay if running
        if (isRunning) {
            await window.api.relay.stop();
            setRunningState(false);
        }
        
        await resetAndShowWizard();
    }
}

// Initialize on load
init();

// Sync logs section height with channel section
function syncLogsHeight() {
    const channelSection = document.querySelector('.channel-section');
    const logsSection = document.querySelector('.logs-section');
    if (channelSection && logsSection) {
        logsSection.style.maxHeight = channelSection.offsetHeight + 'px';
    }
}

// Call on load and resize
window.addEventListener('load', () => setTimeout(syncLogsHeight, 100));
window.addEventListener('resize', syncLogsHeight);

// Open external URL
function openExternal(url) {
    if (window.api && window.api.openExternal) {
        window.api.openExternal(url);
    }
}
