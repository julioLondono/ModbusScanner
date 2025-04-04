const { ipcRenderer } = require('electron');

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
const responseDiv = document.getElementById('response');

let isConnected = false;

// Refresh available ports
async function refreshPorts() {
    try {
        const ports = await ipcRenderer.invoke('get-ports');
        portSelect.innerHTML = '';
        ports.forEach(port => {
            const option = document.createElement('option');
            option.value = port.path;
            option.textContent = `${port.path} - ${port.manufacturer || 'Unknown'}`;
            portSelect.appendChild(option);
        });
    } catch (error) {
        showResponse('Error listing ports: ' + error.message);
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
            await ipcRenderer.invoke('connect', config);
            isConnected = true;
            connectButton.textContent = 'Disconnect';
            readButton.disabled = false;
            showResponse('Connected successfully');
        } else {
            await ipcRenderer.invoke('disconnect');
            isConnected = false;
            connectButton.textContent = 'Connect';
            readButton.disabled = true;
            showResponse('Disconnected successfully');
        }
    } catch (error) {
        showResponse('Connection error: ' + error.message);
    }
}

// Read registers
async function readRegisters() {
    try {
        const result = await ipcRenderer.invoke('read-registers', {
            address: parseInt(address.value),
            length: parseInt(length.value),
            functionCode: parseInt(functionCode.value)
        });
        
        showResponse('Read successful:\n' + JSON.stringify(result.data, null, 2));
    } catch (error) {
        showResponse('Read error: ' + error.message);
    }
}

// Display response
function showResponse(message) {
    responseDiv.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
}

// Event listeners
refreshPortsButton.addEventListener('click', refreshPorts);
connectButton.addEventListener('click', toggleConnection);
readButton.addEventListener('click', readRegisters);

// Initial port refresh
refreshPorts();
