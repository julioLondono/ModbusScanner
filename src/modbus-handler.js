const ModbusRTU = require('modbus-serial');
const { SerialPort } = require('serialport');
const { formatModbusError } = require('./error-handler');

class ModbusHandler {
    constructor() {
        this.client = new ModbusRTU();
        this.connected = false;
        this.pollingInterval = null;
        this.currentPollConfig = null;
        this.scanInProgress = false;
        this.stopScanRequested = false;
        
        // Common function codes to test
        this.functionCodes = [
            { code: 1, name: 'Read Coils' },
            { code: 2, name: 'Read Discrete Inputs' },
            { code: 3, name: 'Read Holding Registers' },
            { code: 4, name: 'Read Input Registers' }
        ];
    }

    async listPorts() {
        try {
            const ports = await SerialPort.list();
            console.log('Available ports:', ports);
            return {
                success: true,
                data: ports.map(port => ({
                    path: port.path,
                    manufacturer: port.manufacturer || 'Unknown',
                    serialNumber: port.serialNumber || 'N/A',
                    pnpId: port.pnpId || 'N/A',
                    vendorId: port.vendorId || 'N/A',
                    productId: port.productId || 'N/A'
                })),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error listing ports:', error);
            const formattedError = formatModbusError(error);
            return {
                success: false,
                error: formattedError,
                timestamp: new Date().toISOString()
            };
        }
    }

    async connect(config) {
        try {
            if (this.connected) {
                await this.disconnect();
            }

            await this.client.connectRTUBuffered(config.port, {
                baudRate: parseInt(config.baudRate),
                dataBits: parseInt(config.dataBits),
                stopBits: parseInt(config.stopBits),
                parity: config.parity
            });

            this.client.setID(parseInt(config.slaveId));
            this.connected = true;
            return {
                success: true,
                message: `Connected to ${config.port} at ${config.baudRate} baud`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Connection error:', error);
            this.connected = false;
            const formattedError = formatModbusError(error);
            return {
                success: false,
                error: formattedError,
                timestamp: new Date().toISOString()
            };
        }
    }

    async disconnect() {
        try {
            this.stopPolling(); // Stop polling before disconnecting
            if (this.connected) {
                await this.client.close();
                this.connected = false;
            }
            return { success: true, message: 'Disconnected successfully' };
        } catch (error) {
            console.error('Disconnection error:', error);
            throw error;
        }
    }

    startPolling(config) {
        if (!this.connected) {
            return {
                success: false,
                error: {
                    type: 'Connection Error',
                    message: 'Not connected to device',
                    suggestions: ['Connect to a device before starting polling']
                },
                timestamp: new Date().toISOString()
            };
        }

        // Stop any existing polling
        this.stopPolling();

        this.currentPollConfig = config;
        const interval = Math.max(100, config.interval); // Minimum 100ms interval

        this.pollingInterval = setInterval(async () => {
            try {
                const result = await this.readRegisters(
                    config.address,
                    config.length,
                    config.functionCode
                );
                if (config.onData) {
                    config.onData(result);
                }
            } catch (error) {
                if (config.onError) {
                    config.onError(error);
                }
                // Stop polling on error
                this.stopPolling();
            }
        }, interval);

        return {
            success: true,
            message: `Started polling at ${interval}ms intervals`,
            timestamp: new Date().toISOString()
        };
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            this.currentPollConfig = null;
            return {
                success: true,
                message: 'Polling stopped',
                timestamp: new Date().toISOString()
            };
        }
        return {
            success: true,
            message: 'Polling was not active',
            timestamp: new Date().toISOString()
        };
    }

    isPolling() {
        return this.pollingInterval !== null;
    }

    stopScan() {
        if (this.scanInProgress) {
            this.stopScanRequested = true;
            return {
                success: true,
                message: 'Scan stop requested',
                timestamp: new Date().toISOString()
            };
        }
        return {
            success: true,
            message: 'No scan in progress',
            timestamp: new Date().toISOString()
        };
    }

    async scanDevices(startAddress, endAddress, progressCallback) {
        if (!this.connected) {
            return {
                success: false,
                error: {
                    type: 'Connection Error',
                    message: 'Not connected to device',
                    suggestions: ['Connect to a device before scanning']
                },
                timestamp: new Date().toISOString()
            };
        }

        if (this.scanInProgress) {
            return {
                success: false,
                error: {
                    type: 'Scan Error',
                    message: 'Scan already in progress',
                    suggestions: ['Wait for current scan to complete']
                },
                timestamp: new Date().toISOString()
            };
        }

        this.scanInProgress = true;
        this.stopScanRequested = false;
        const discoveredDevices = [];
        const totalAddresses = endAddress - startAddress + 1;
        
        // Set shorter timeout for scan operations
        const originalTimeout = this.client._timeout;
        this.client._timeout = 200; // 200ms timeout for faster scanning

        try {
            for (let address = startAddress; address <= endAddress; address++) {
                // Update progress
                const progress = ((address - startAddress) / totalAddresses) * 100;
                if (progressCallback) {
                    progressCallback({
                        currentAddress: address,
                        progress: Math.round(progress),
                        status: 'scanning'
                    });
                }

                // Test each function code
                const device = { address, supportedFunctions: [] };
                let hasResponse = false;

                for (const func of this.functionCodes) {
                    try {
                        // Save original slave ID
                        const originalId = this.client._unitID;
                        // Set new slave ID
                        this.client.setID(address);

                        // Try to read with current function code
                        let result;
                        switch (func.code) {
                            case 1:
                                result = await this.client.readCoils(0, 1);
                                break;
                            case 2:
                                result = await this.client.readDiscreteInputs(0, 1);
                                break;
                            case 3:
                                result = await this.client.readHoldingRegisters(0, 1);
                                break;
                            case 4:
                                result = await this.client.readInputRegisters(0, 1);
                                break;
                        }

                        // If we get here, the function code is supported
                        device.supportedFunctions.push(func);
                        hasResponse = true;

                        // Restore original slave ID
                        this.client.setID(originalId);
                    } catch (error) {
                        // Ignore errors - just means function code isn't supported
                        continue;
                    }
                }

                if (hasResponse) {
                    discoveredDevices.push(device);
                }

                // Check if stop was requested
                if (this.stopScanRequested) {
                    throw new Error('Scan stopped by user');
                }

                // Minimal delay to prevent overwhelming devices
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Restore original timeout
            this.client._timeout = originalTimeout;

            this.scanInProgress = false;
            return {
                success: true,
                data: discoveredDevices,
                message: `Scan complete. Found ${discoveredDevices.length} devices.`,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            // Restore original timeout
            this.client._timeout = originalTimeout;
            this.scanInProgress = false;
            
            return {
                success: false,
                error: {
                    type: 'Scan Error',
                    message: error.message === 'Scan stopped by user' ? 'Scan stopped by user' : 'Device scan failed',
                    details: error.message,
                    suggestions: error.message === 'Scan stopped by user' ? 
                        ['Scan was manually stopped', 'Try scanning a smaller range'] :
                        ['Check device connections', 'Verify address range']
                },
                timestamp: new Date().toISOString()
            };
        }
    }

    async readRegisters(address, length, functionCode) {
        if (!this.connected) {
            return {
                success: false,
                error: {
                    type: 'Connection Error',
                    message: 'Not connected to device',
                    suggestions: ['Connect to a device before reading registers']
                },
                timestamp: new Date().toISOString()
            };
        }

        try {
            let result;
            switch (parseInt(functionCode)) {
                case 1:
                    result = await this.client.readCoils(address, length);
                    break;
                case 2:
                    result = await this.client.readDiscreteInputs(address, length);
                    break;
                case 3:
                    result = await this.client.readHoldingRegisters(address, length);
                    break;
                case 4:
                    result = await this.client.readInputRegisters(address, length);
                    break;
                default:
                    throw new Error('Unsupported function code');
            }
            return {
                success: true,
                data: result.data,
                buffer: result.buffer,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Read error:', error);
            const formattedError = formatModbusError(error);
            return {
                success: false,
                error: formattedError,
                timestamp: new Date().toISOString()
            };
        }
    }

    async writeRegister(address, value) {
        if (!this.connected) {
            throw new Error('Not connected to device');
        }

        try {
            await this.client.writeRegister(address, value);
            return { success: true, message: 'Write successful' };
        } catch (error) {
            console.error('Write error:', error);
            throw error;
        }
    }
}

module.exports = ModbusHandler;
