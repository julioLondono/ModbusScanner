const { ipcRenderer } = require('electron');

// DOM Elements
const profileSelect = document.getElementById('profileSelect');
const profileName = document.getElementById('profileName');
const loadProfileButton = document.getElementById('loadProfile');
const saveProfileButton = document.getElementById('saveProfile');
const deleteProfileButton = document.getElementById('deleteProfile');

// DOM Elements
const portSelect = document.getElementById('portSelect');
const refreshPortsButton = document.getElementById('refreshPorts');
const baudRate = document.getElementById('baudRate');
const dataBits = document.getElementById('dataBits');
const stopBits = document.getElementById('stopBits');
const parity = document.getElementById('parity');
const slaveId = document.getElementById('slaveId');
const connectButton = document.getElementById('connectButton');
const functionCode = document.getElementById('functionCode');
const address = document.getElementById('address');
const length = document.getElementById('length');
const readButton = document.getElementById('readButton');
const startPolling = document.getElementById('startPolling');
const pollingInterval = document.getElementById('pollingInterval');
const responseDiv = document.getElementById('response');
const startScan = document.getElementById('startScan');
const stopScan = document.getElementById('stopScan');
const startAddress = document.getElementById('startAddress');
const endAddress = document.getElementById('endAddress');
const scanProgress = document.querySelector('.progress-bar');
const scanStatus = document.querySelector('.scan-status');
const discoveredDevices = document.querySelector('.discovered-devices');

let isConnected = false;

// Refresh available ports
async function refreshPorts() {
    try {
        const response = await ipcRenderer.invoke('get-ports');
        if (response.success) {
            portSelect.innerHTML = '';
            response.data.forEach(port => {
                const option = document.createElement('option');
                option.value = port.path;
                option.textContent = `${port.path} - ${port.manufacturer || 'Unknown'}`;
                portSelect.appendChild(option);
            });
        } else {
            showResponse(response);
        }
    } catch (error) {
        showResponse({
            success: false,
            error: {
                type: 'System Error',
                message: 'Failed to list ports',
                details: error.message,
                suggestions: ['Check USB connections', 'Try refreshing again']
            },
            timestamp: new Date().toISOString()
        });
    }
}

// Connect/Disconnect
async function toggleConnection() {
    try {
        if (!isConnected) {
            const config = {
                port: portSelect.value,
                baudRate: baudRate.value,
                dataBits: dataBits.value,
                stopBits: stopBits.value,
                parity: parity.value,
                slaveId: slaveId.value
            };
            const response = await ipcRenderer.invoke('connect', config);
            if (response.success) {
                isConnected = true;
                connectButton.textContent = 'Disconnect';
                readButton.disabled = false;
                startPolling.disabled = false;
                startScan.disabled = false;
                stopScan.disabled = true;
            }
            showResponse(response);
        } else {
            const response = await ipcRenderer.invoke('disconnect');
            if (response.success) {
                isConnected = false;
                connectButton.textContent = 'Connect';
                readButton.disabled = true;
                startPolling.disabled = true;
                startScan.disabled = true;
                stopScan.disabled = true;
                if (startPolling.classList.contains('polling')) {
                    startPolling.click(); // Stop polling if active
                }
            }
            showResponse(response);
        }
    } catch (error) {
        showResponse({
            success: false,
            error: {
                type: 'System Error',
                message: 'Connection operation failed',
                details: error.message,
                suggestions: ['Check device connection', 'Verify port settings']
            },
            timestamp: new Date().toISOString()
        });
    }
}

// Read registers
async function readRegisters() {
    try {
        const response = await ipcRenderer.invoke('read-registers', {
            address: parseInt(address.value),
            length: parseInt(length.value),
            functionCode: parseInt(functionCode.value)
        });
        showResponse(response);
    } catch (error) {
        showResponse({
            success: false,
            error: {
                type: 'System Error',
                message: 'Failed to read registers',
                details: error.message,
                suggestions: [
                    'Verify device is connected',
                    'Check register address and length',
                    'Ensure function code is supported'
                ]
            },
            timestamp: new Date().toISOString()
        });
    }
}

// Display response
function showResponse(response) {
    if (typeof response === 'string') {
        // Legacy string message support
        responseDiv.innerHTML = `<div class="info-message">[${new Date().toLocaleTimeString()}] ${response}</div>`;
        return;
    }

    if (!response.success) {
        // Error case
        const error = response.error;
        const errorHtml = `
            <div class="error-container" style="border-left: 4px solid #d32f2f; padding: 10px; margin: 10px 0; background-color: #ffebee;">
                <h3 style="color: #d32f2f; margin-top: 0;">${error.type}</h3>
                <p><strong>Message:</strong> ${error.message}</p>
                ${error.details ? `<p><strong>Details:</strong> ${error.details}</p>` : ''}
                ${error.suggestions ? `
                    <div class="suggestions" style="margin-top: 10px;">
                        <strong>Suggestions:</strong>
                        <ul style="margin-top: 5px;">
                            ${error.suggestions.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                <p class="timestamp" style="color: #666; margin-top: 10px; font-size: 0.9em;">
                    Time: ${new Date(response.timestamp).toLocaleString()}
                </p>
            </div>
        `;
        responseDiv.innerHTML = errorHtml;
    } else {
        // Success case
        const successHtml = `
            <div class="success-container" style="border-left: 4px solid #2e7d32; padding: 10px; margin: 10px 0; background-color: #f1f8e9;">
                ${response.message ? `<p class="success-message" style="color: #2e7d32; margin-top: 0;">${response.message}</p>` : ''}
                ${response.data ? `
                    <div class="data-container">
                        <h3 style="margin: 10px 0;">Data:</h3>
                        <pre style="background-color: #fff; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(response.data, null, 2)}</pre>
                    </div>
                ` : ''}
                <p class="timestamp" style="color: #666; margin-top: 10px; font-size: 0.9em;">
                    Time: ${new Date(response.timestamp).toLocaleString()}
                </p>
            </div>
        `;
        responseDiv.innerHTML = successHtml;
    }
}

// Profile Management Functions
async function loadProfiles() {
    try {
        const response = await ipcRenderer.invoke('load-profiles');
        if (response.success) {
            profileSelect.innerHTML = '';
            response.data.forEach(profile => {
                const option = document.createElement('option');
                option.value = profile.name;
                option.textContent = profile.name;
                profileSelect.appendChild(option);
            });
        } else {
            showResponse(response);
        }
    } catch (error) {
        showResponse({
            success: false,
            error: {
                type: 'System Error',
                message: 'Failed to load profiles',
                details: error.message,
                suggestions: ['Check if profiles file exists', 'Try restarting the application']
            },
            timestamp: new Date().toISOString()
        });
    }
}

async function loadProfile() {
    try {
        const response = await ipcRenderer.invoke('load-profiles');
        if (response.success) {
            const selectedProfile = response.data.find(p => p.name === profileSelect.value);
            if (selectedProfile) {
                portSelect.value = selectedProfile.port;
                baudRate.value = selectedProfile.baudRate;
                dataBits.value = selectedProfile.dataBits;
                stopBits.value = selectedProfile.stopBits;
                parity.value = selectedProfile.parity;
                slaveId.value = selectedProfile.slaveId;
                showResponse({
                    success: true,
                    message: `Profile '${selectedProfile.name}' loaded successfully`,
                    data: selectedProfile,
                    timestamp: new Date().toISOString()
                });
            } else {
                showResponse({
                    success: false,
                    error: {
                        type: 'Profile Error',
                        message: 'Selected profile not found',
                        suggestions: ['Select a valid profile', 'Try refreshing the profile list']
                    },
                    timestamp: new Date().toISOString()
                });
            }
        } else {
            showResponse(response);
        }
    } catch (error) {
        showResponse({
            success: false,
            error: {
                type: 'System Error',
                message: 'Failed to load profile',
                details: error.message,
                suggestions: ['Check if profile exists', 'Try restarting the application']
            },
            timestamp: new Date().toISOString()
        });
    }
}

async function saveProfile() {
    try {
        const name = profileName.value.trim();
        if (!name) {
            showResponse({
                success: false,
                error: {
                    type: 'Validation Error',
                    message: 'Please enter a profile name',
                    suggestions: ['Enter a name for the profile']
                },
                timestamp: new Date().toISOString()
            });
            return;
        }

        const profile = {
            name,
            port: portSelect.value,
            baudRate: parseInt(baudRate.value),
            dataBits: parseInt(dataBits.value),
            stopBits: parseInt(stopBits.value),
            parity: parity.value,
            slaveId: parseInt(slaveId.value)
        };

        const response = await ipcRenderer.invoke('save-profile', profile);
        if (response.success) {
            await loadProfiles();
            profileName.value = '';
        }
        showResponse(response);
    } catch (error) {
        showResponse({
            success: false,
            error: {
                type: 'System Error',
                message: 'Failed to save profile',
                details: error.message,
                suggestions: ['Check write permissions', 'Try using a different profile name']
            },
            timestamp: new Date().toISOString()
        });
    }
}

async function deleteProfile() {
    try {
        const name = profileSelect.value;
        if (!name) {
            showResponse({
                success: false,
                error: {
                    type: 'Validation Error',
                    message: 'Please select a profile to delete',
                    suggestions: ['Select a profile from the dropdown']
                },
                timestamp: new Date().toISOString()
            });
            return;
        }

        const response = await ipcRenderer.invoke('delete-profile', name);
        if (response.success) {
            await loadProfiles();
        }
        showResponse(response);
    } catch (error) {
        showResponse({
            success: false,
            error: {
                type: 'System Error',
                message: 'Failed to delete profile',
                details: error.message,
                suggestions: ['Check file permissions', 'Try restarting the application']
            },
            timestamp: new Date().toISOString()
        });
    }
}

// Event listeners
refreshPortsButton.addEventListener('click', refreshPorts);
connectButton.addEventListener('click', toggleConnection);
readButton.addEventListener('click', readRegisters);
startPolling.addEventListener('click', handlePolling);
startScan.addEventListener('click', handleScan);
stopScan.addEventListener('click', handleStopScan);

// Listen for scan progress updates
ipcRenderer.on('scan-progress', (event, progress) => {
    scanProgress.style.width = `${progress.progress}%`;
    scanStatus.textContent = `Scanning address ${progress.currentAddress}... ${progress.progress}%`;
});

async function handleStopScan() {
    try {
        startScan.disabled = true;
        stopScan.disabled = true;
        const response = await ipcRenderer.invoke('stop-scan');
        showResponse(response);
    } catch (error) {
        showResponse({
            success: false,
            error: {
                type: 'Stop Scan Error',
                message: 'Failed to stop scan',
                details: error.message,
                suggestions: ['Try again', 'Restart application if issue persists']
            },
            timestamp: new Date().toISOString()
        });
    }
}

async function handleScan() {
    try {
        // Clear previous results
        discoveredDevices.innerHTML = '';
        scanProgress.style.width = '0%';
        scanStatus.textContent = 'Starting scan...';
        startScan.disabled = true;
        stopScan.disabled = false;

        const start = parseInt(startAddress.value);
        const end = parseInt(endAddress.value);

        if (start > end) {
            throw new Error('Start address must be less than or equal to end address');
        }

        if (start < 0 || end > 247) {
            throw new Error('Address range must be between 0 and 247');
        }

        const response = await ipcRenderer.invoke('scan-devices', { startAddress: start, endAddress: end });

        if (response.success) {
            scanStatus.textContent = response.message;
            response.data.forEach(device => {
                const deviceElement = document.createElement('div');
                deviceElement.className = 'device-item';
                deviceElement.innerHTML = `
                    <strong>Device Address: ${device.address}</strong>
                    <div class="device-functions">
                        Supported Functions:
                        ${device.supportedFunctions.map(f => 
                            `<span class="function-tag">${f.name}</span>`
                        ).join('')}
                    </div>
                `;
                discoveredDevices.appendChild(deviceElement);

                // Add click handler to use this device
                deviceElement.addEventListener('click', () => {
                    slaveId.value = device.address;
                });
            });
        } else {
            scanStatus.textContent = 'Scan failed: ' + response.error.message;
        }

        showResponse(response);
    } catch (error) {
        scanStatus.textContent = 'Scan failed';
        showResponse({
            success: false,
            error: {
                type: 'Scan Error',
                message: 'Failed to scan for devices',
                details: error.message,
                suggestions: ['Check address range', 'Verify device connections']
            },
            timestamp: new Date().toISOString()
        });
    } finally {
        startScan.disabled = false;
        stopScan.disabled = true;
    }
}

// Listen for polling data and errors
ipcRenderer.on('polling-data', (event, result) => {
    showResponse(result);
});

ipcRenderer.on('polling-error', (event, error) => {
    showResponse({
        success: false,
        error,
        timestamp: new Date().toISOString()
    });
});

async function handlePolling() {
    try {
        if (startPolling.classList.contains('polling')) {
            // Stop polling
            const result = await ipcRenderer.invoke('stop-polling');
            showResponse(result);
            startPolling.textContent = 'Start Polling';
            startPolling.classList.remove('polling');
            readButton.disabled = false;
        } else {
            // Start polling
            const config = {
                address: parseInt(address.value),
                length: parseInt(length.value),
                functionCode: parseInt(functionCode.value),
                interval: parseInt(pollingInterval.value)
            };

            const result = await ipcRenderer.invoke('start-polling', config);
            if (result.success) {
                showResponse(result);
                startPolling.textContent = 'Stop Polling';
                startPolling.classList.add('polling');
                readButton.disabled = true; // Disable manual read while polling
            } else {
                showResponse(result);
            }
        }
    } catch (error) {
        showResponse({
            success: false,
            error: {
                type: 'Polling Error',
                message: 'Failed to start/stop polling',
                details: error.message,
                suggestions: ['Check device connection', 'Try a longer polling interval']
            },
            timestamp: new Date().toISOString()
        });
    }
}
loadProfileButton.addEventListener('click', loadProfile);
saveProfileButton.addEventListener('click', saveProfile);
deleteProfileButton.addEventListener('click', deleteProfile);

// Handle profile name input changes
profileName.addEventListener('input', () => {
    const hasText = profileName.value.trim().length > 0;
    saveProfileButton.style.display = hasText ? 'inline-block' : 'none';
    deleteProfileButton.style.display = hasText ? 'inline-block' : 'none';
});

// Initial loads
refreshPorts();
loadProfiles();
