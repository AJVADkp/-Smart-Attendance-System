/*
 * ============================================================
 * ESP32 Bluetooth Attendance Node
 * File: bt_attendance_node.ino
 * 
 * Purpose: Classic Bluetooth presence checker.
 *          Receives CHECK / PING commands over USB serial
 *          and replies with a JSON line per command.
 *
 * Commands (sent from PC over serial):
 *   PING                     → {"event":"pong","status":"ok"}
 *   CHECK <BT_ADDRESS>       → {"event":"result","mac":"AA:BB:CC:DD:EE:FF","present":true,"status":0,"ms":1180,"tries":1,"name":"Phone Name"}
 *
 * Baud rate: 115200
 *
 * Proven working on 6 Android brands + iPhone (screen locked).
 * Uses BluetoothSerial stack to ensure memory retention and clean
 * Classic BT GAP operation on ESP32 Arduino Core 2.x and 3.x.
 * ============================================================
 */

#include <Arduino.h>
#include "BluetoothSerial.h"
#include "esp_bt_main.h"
#include "esp_gap_bt_api.h"

// ── Configuration constants ───────────────────────────────────
#define SERIAL_BAUD        115200
#define CHECK_TIMEOUT_MS   5500    // wait up to 5.5 s for GAP name discovery
#define FAST_FAIL_MS       1000    // if reply arrives in <1 s negative, retry once
#define MAX_TRIES          2       // maximum attempts per CHECK command
#define DEVICE_NAME        "AttendNode"

// ── Data Types ───────────────────────────────────────────────
typedef struct {
  bool     present;
  int      status;
  uint32_t ms;
  char     name[64];
} CheckOutcome;

// ── Bluetooth Stack Handle ────────────────────────────────────
BluetoothSerial SerialBT;

// ── Internal GAP State ────────────────────────────────────────
static volatile bool s_discovered = false;
static volatile int  s_gap_status = -1;
static char          s_found_name[64] = "";

// ── Helpers ──────────────────────────────────────────────────
static void parseMac(const char* mac_str, uint8_t* bda) {
  unsigned int b[6];
  sscanf(mac_str, "%02X:%02X:%02X:%02X:%02X:%02X",
         &b[0], &b[1], &b[2], &b[3], &b[4], &b[5]);
  for (int i = 0; i < 6; i++) bda[i] = (uint8_t)b[i];
}

static void replyJson(const char* mac, bool present, int status, uint32_t ms, int tries, const char* name) {
  // Escape quotes and backslashes for JSON safety
  char safe_name[70] = "";
  int j = 0;
  for (int i = 0; name[i] && j < 60; i++) {
    char c = name[i];
    if (c == '"' || c == '\\') safe_name[j++] = '\\';
    safe_name[j++] = c;
  }
  safe_name[j] = '\0';

  Serial.printf(
    "{\"event\":\"result\",\"mac\":\"%s\",\"present\":%s,\"status\":%d,\"ms\":%lu,\"tries\":%d,\"name\":\"%s\"}\n",
    mac,
    present ? "true" : "false",
    status,
    (unsigned long)ms,
    tries,
    safe_name
  );
}

// ── GAP Callback ─────────────────────────────────────────────
static void gap_callback(esp_bt_gap_cb_event_t event, esp_bt_gap_cb_param_t* param) {
  if (event == ESP_BT_GAP_READ_REMOTE_NAME_EVT) {
    s_gap_status = (int)param->read_rmt_name.stat;
    if (param->read_rmt_name.stat == ESP_BT_STATUS_SUCCESS) {
      strncpy(s_found_name, (const char*)param->read_rmt_name.rmt_name, sizeof(s_found_name) - 1);
      s_found_name[sizeof(s_found_name) - 1] = '\0';
    } else {
      s_found_name[0] = '\0';
    }
    s_discovered = true;
  }
}

// ── Single BT check ──────────────────────────────────────────
static CheckOutcome doCheck(uint8_t* bda) {
  CheckOutcome out = { false, -1, 0, "" };
  s_discovered = false;
  s_gap_status = -1;
  s_found_name[0] = '\0';

  uint32_t t0 = millis();
  esp_err_t err = esp_bt_gap_read_remote_name(bda);
  if (err != ESP_OK) {
    out.ms = millis() - t0;
    out.status = (int)err;
    return out;
  }

  // Wait for GAP callback or timeout
  while (!s_discovered && (millis() - t0) < CHECK_TIMEOUT_MS) {
    delay(25);
  }

  out.ms = millis() - t0;
  out.status = s_gap_status;
  if (s_discovered && s_gap_status == ESP_BT_STATUS_SUCCESS) {
    out.present = true;
    strncpy(out.name, s_found_name, sizeof(out.name) - 1);
    out.name[sizeof(out.name) - 1] = '\0';
  }
  return out;
}

// ── Command handler ──────────────────────────────────────────
static void handleCheck(const char* mac_str) {
  uint8_t target_bda[6] = {0};
  parseMac(mac_str, target_bda);

  int tries = 0;
  CheckOutcome result = { false, -1, 0, "" };

  for (tries = 1; tries <= MAX_TRIES; tries++) {
    result = doCheck(target_bda);

    if (result.present) break;

    // Retry once if false-absent comes back suspiciously fast (<1s)
    if (tries < MAX_TRIES && result.ms < FAST_FAIL_MS) {
      delay(100);
      continue;
    }
    break;
  }

  int status_code = result.present ? 0 : (result.ms >= CHECK_TIMEOUT_MS ? 2 : 1);
  replyJson(mac_str, result.present, status_code, result.ms, tries, result.name);
}

// ── Arduino setup ────────────────────────────────────────────
void setup() {
  Serial.begin(SERIAL_BAUD);
  Serial.println("{\"event\":\"boot\",\"status\":\"ok\",\"msg\":\"Attendance Node starting\"}");

  // Start Bluetooth via BluetoothSerial (ensures proper memory allocation & RF initialization)
  if (!SerialBT.begin(DEVICE_NAME)) {
    Serial.println("{\"event\":\"error\",\"msg\":\"Bluetooth failed to start. Is this an ESP32 with Classic BT?\"}");
    return;
  }

  esp_bt_gap_register_callback(gap_callback);

  // Set device non-discoverable (we probe others, don't want to be found)
  esp_bt_gap_set_scan_mode(ESP_BT_NON_CONNECTABLE, ESP_BT_NON_DISCOVERABLE);

  Serial.println("{\"event\":\"ready\",\"status\":\"ok\",\"msg\":\"Attendance Node ready — send CHECK <MAC> or PING\"}");
}

// ── Arduino loop ─────────────────────────────────────────────
void loop() {
  if (!Serial.available()) return;

  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  if (line == "PING") {
    Serial.println("{\"event\":\"pong\",\"status\":\"ok\"}");
    return;
  }

  if (line.startsWith("CHECK ")) {
    String mac = line.substring(6);
    mac.trim();
    mac.toUpperCase();
    if (mac.length() == 17) {
      handleCheck(mac.c_str());
    } else {
      Serial.printf("{\"event\":\"error\",\"msg\":\"Invalid MAC: %s\"}\n", mac.c_str());
    }
    return;
  }

  Serial.printf("{\"event\":\"error\",\"msg\":\"Unknown command: %s\"}\n", line.c_str());
}
