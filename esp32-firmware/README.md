# ⚡ ESP32 Bluetooth Attendance Node Firmware

Firmware source code for the hardware scanning node of the **Smart Attendance System**.

---

## 📌 Overview

The ESP32 microcontroller acts as an automated, non-invasive proximity scanner. It executes active **Classic Bluetooth (GAP)** queries to determine whether enrolled student phones are physically present inside the classroom.

### 🔑 Key Engineering Characteristics:
- **Zero Mobile App**: Students do not need to install any background application.
- **Zero Pairing**: Does not require Bluetooth pairing, PIN code authentication, or active screen unlocking.
- **Fast Latency**: Responding devices answer GAP discovery queries in **~1.0 second**.
- **Clean Timeout Separation**: Absent/disabled devices time out at **5.14 ± 0.4 seconds**.
- **Glitch Filtering**: Automatically retries once if a false-absent response returns unexpectedly in under 1 second.

---

## 🔌 Hardware Setup & Pinout

| Component | Recommendation |
| :--- | :--- |
| **Microcontroller** | DOIT ESP32 DEVKIT V1 (or any ESP32 board with Classic BT support) |
| **USB Interface** | Standard Micro-USB / USB-C data cable |
| **Baud Rate** | `115200` bps (8-N-1) |
| **Power** | 5V via host PC USB port |

---

## 🚀 Flashing Instructions

### Using Arduino IDE (v2.x):
1. **Install ESP32 Board Core**:
   - Navigate to `File > Preferences`.
   - Add Espressif's URL to *Additional Boards Manager URLs*:
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Open `Tools > Board > Boards Manager...`, search for **esp32**, and click **Install**.
2. **Select Board & Port**:
   - `Tools > Board > esp32 > DOIT ESP32 DEVKIT V1` (or your specific ESP32 variant).
   - `Tools > Port > COMx` (or `/dev/ttyUSB0` on Linux/macOS).
3. **Configure Settings**:
   - Upload Speed: `921600` (or `115200`).
   - Flash Frequency: `80MHz`.
   - Partition Scheme: `Default 4MB with spiffs`.
4. **Compile & Upload**:
   - Open `bt_attendance_node.ino`.
   - Click **Upload** (hold the `BOOT` button on the board if required during connecting).

---

## 📡 Serial Communication Protocol

The node communicates over USB Serial at **115,200 baud** using a deterministic JSON-Lines protocol.

### 1. Ping / Handshake
- **Command sent from Web Application**:
  ```text
  PING\n
  ```
- **Response from ESP32**:
  ```json
  {"event":"pong","status":"ok"}
  ```

### 2. Device Check
- **Command sent from Web Application**:
  ```text
  CHECK 44:01:BB:CC:DD:EE\n
  ```
- **Response when Present**:
  ```json
  {"event":"result","mac":"44:01:BB:CC:DD:EE","present":true,"status":0,"ms":1082,"tries":1,"name":"Galaxy S23"}
  ```
- **Response when Absent**:
  ```json
  {"event":"result","mac":"44:01:BB:CC:DD:EE","present":false,"status":1,"ms":5140,"tries":2,"name":""}
  ```
