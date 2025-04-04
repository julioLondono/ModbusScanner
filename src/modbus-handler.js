const ModbusRTU = require('modbus-serial');
const { SerialPort } = require('serialport');
const { formatModbusError } = require('./error-handler');

class ModbusHandler {
    constructor() {
        this.client = new ModbusRTU();
        this.connected = false;
        this.pollingInterval = null;
        this.currentPollConfig = null;
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
