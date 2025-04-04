class ModbusError extends Error {
    constructor(message, code, details = null) {
        super(message);
        this.name = 'ModbusError';
        this.code = code;
        this.details = details;
    }
}

const ModbusExceptionCodes = {
    1: 'Illegal Function (The device does not support this function)',
    2: 'Illegal Data Address (The address is not valid for this device)',
    3: 'Illegal Data Value (The value is not valid)',
    4: 'Device Failure (The device failed to process the request)',
    5: 'Acknowledge (Request received, will take time to process)',
    6: 'Device Busy (Device is processing another command)',
    7: 'Memory Parity Error (Error in device memory)',
    8: 'Gateway Path Unavailable (Communication error with device)',
    10: 'Gateway Target Device Failed To Respond (Device not responding)',
    11: 'Gateway Target Device Failed To Acknowledge (Device error)'
};

const ConnectionErrors = {
    ECONNREFUSED: 'Connection refused - Check if device is powered and connected',
    ETIMEDOUT: 'Connection timed out - Check cable connection and device status',
    ENOTFOUND: 'Device not found - Check COM port settings',
    EBUSY: 'Port is busy - Close other applications using this port',
    EACCES: 'Access denied - Check port permissions',
};

function formatModbusError(error) {
    // Handle Modbus exceptions
    if (error.modbusCode) {
        const description = ModbusExceptionCodes[error.modbusCode] || 'Unknown Modbus error';
        return {
            type: 'Modbus Exception',
            code: error.modbusCode,
            message: `Modbus Error: ${description}`,
            details: error.message,
            suggestions: getErrorSuggestions(error)
        };
    }

    // Handle connection errors
    if (error.code && ConnectionErrors[error.code]) {
        return {
            type: 'Connection Error',
            code: error.code,
            message: ConnectionErrors[error.code],
            details: error.message,
            suggestions: getErrorSuggestions(error)
        };
    }

    // Handle timeout errors
    if (error.message && error.message.includes('timeout')) {
        return {
            type: 'Timeout Error',
            code: 'TIMEOUT',
            message: 'Device did not respond in time',
            details: error.message,
            suggestions: [
                'Increase timeout value',
                'Check device response time',
                'Verify device is operational'
            ]
        };
    }

    // Handle other errors
    return {
        type: 'General Error',
        code: error.code || 'UNKNOWN',
        message: error.message || 'An unknown error occurred',
        details: error.stack,
        suggestions: [
            'Check device connection',
            'Verify communication parameters',
            'Ensure device is powered on'
        ]
    };
}

function getErrorSuggestions(error) {
    const suggestions = [];
    
    if (error.modbusCode) {
        switch (error.modbusCode) {
            case 1:
                suggestions.push(
                    'Verify the function code is supported by your device',
                    'Check device documentation for supported functions',
                    'Try a different function code (e.g., 3 for holding registers)'
                );
                break;
            case 2:
                suggestions.push(
                    'Verify the register address is valid',
                    'Check device manual for valid address ranges',
                    'Ensure address is within device memory map'
                );
                break;
            case 3:
                suggestions.push(
                    'Check if value is within allowed range',
                    'Verify data format matches device expectations',
                    'Review device specifications for valid values'
                );
                break;
            default:
                suggestions.push(
                    'Check device connection',
                    'Verify device is powered on',
                    'Review device documentation'
                );
        }
    } else if (error.code && ConnectionErrors[error.code]) {
        suggestions.push(
            'Check physical connection',
            'Verify COM port settings',
            'Ensure no other application is using the port',
            'Try closing and reopening the connection'
        );
    }

    return suggestions;
}

module.exports = {
    ModbusError,
    formatModbusError
};
