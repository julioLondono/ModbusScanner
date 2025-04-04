# Modbus RTU Slave Tester

A desktop application for testing Modbus RTU slave devices, specifically designed for Siemens, Honeywell, Prolon DDC controllers, and Modbus RTU IoT sensors.

## Features

- Connect to Modbus RTU devices via USB-to-serial adapter
- Configure serial port settings (baud rate, parity, data bits, stop bits)
- Support for common Modbus function codes:
  - Read Coils (01)
  - Read Discrete Inputs (02)
  - Read Holding Registers (03)
  - Read Input Registers (04)
- Real-time response display
- Simple and intuitive user interface

## Requirements

- Windows 10/11 (64-bit)
- USB-to-serial adapter (RS485 or RS232)
- Node.js 18+ (for development)

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/modbus-rtu-slave-tester.git
cd modbus-rtu-slave-tester
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

## Building

To create a standalone Windows executable:

```bash
npm run build
```

The built application will be available in the `dist` folder.

## Usage

1. Connect your USB-to-serial adapter to your PC
2. Launch the application
3. Select the COM port and configure communication parameters
4. Click "Connect" to establish communication with the Modbus device
5. Use the interface to read registers or coils from your device

## License

ISC
