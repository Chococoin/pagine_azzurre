/*
 * Terminal Portátil de Mensajería - Firmware ESP32
 * VERSIÓN: XIAO ESP32-S3 (Compacta)
 *
 * Hardware: Seeed XIAO ESP32-S3
 * - 21x17.5mm ultra-compacto
 * - 240MHz dual-core
 * - 8MB PSRAM (perfecto para MicroPython)
 * - Cargador LiPo integrado
 * - USB-C nativo
 *
 * Características:
 * - Lectura de códigos de barras 1D/2D vía UART (GM67)
 * - Comunicación BLE con smartphone Android
 * - Display OLED SSD1306 para feedback visual
 * - Buzzer y vibración para confirmación
 * - Gestión de batería con medición ADC
 * - Modos de ahorro de energía
 *
 * Diferencias vs ESP32 DevKit:
 * - Pines GPIO diferentes (ver mapeo abajo)
 * - Batería conectada directamente (cargador integrado)
 * - Sin regulador externo necesario
 *
 * Autor: Sistema de diseño colaborativo
 * Versión: 1.0.0-XIAO
 * Fecha: 2025
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ============================================================
// CONFIGURACIÓN DE PINES - XIAO ESP32-S3
// ============================================================
// IMPORTANTE: Los pines del XIAO son diferentes al DevKit

// UART Scanner (GM67)
#define SCANNER_RX_PIN 3   // D2 (GPIO3) en XIAO
#define SCANNER_TX_PIN 4   // D3 (GPIO4) en XIAO
#define SCANNER_TRIG_PIN 5 // D4 (GPIO5) en XIAO

// Display OLED (I2C) - Pines fijos en XIAO
#define OLED_SDA_PIN 1     // D0 (GPIO1) - I2C SDA
#define OLED_SCL_PIN 2     // D1 (GPIO2) - I2C SCL
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_ADDRESS 0x3C

// Botones (solo 2 por limitación de pines)
#define BTN_SCAN 43        // D6 (GPIO43)
#define BTN_OK 44          // D7 (GPIO44)
// Nota: XIAO tiene menos pines, usamos solo 2 botones principales
// SCAN y OK son los más críticos

// Feedback
#define BUZZER_PIN 6       // D5 (GPIO6)
#define VIBRATOR_PIN 7     // D10 (GPIO7)

// LEDs (RGB en un solo LED)
#define LED_RGB_R 8        // D8 (GPIO8)
#define LED_RGB_G 9        // D9 (GPIO9)
#define LED_RGB_B 10       // D10 (GPIO10) - compartir con vibrador via multiplexing

// Batería - ADC en XIAO
#define BATTERY_ADC_PIN A0 // GPIO1 - Voltage divider interno
#define BATTERY_MIN_VOLTAGE 3.0
#define BATTERY_MAX_VOLTAGE 4.2

// ============================================================
// CONFIGURACIÓN BLE
// ============================================================

#define SERVICE_UUID        "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

#define DEVICE_NAME "Courier_XIAO"

// ============================================================
// OBJETOS GLOBALES
// ============================================================

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

BLEServer* pServer = NULL;
BLECharacteristic* pTxCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

HardwareSerial ScannerSerial(1); // UART1 para scanner (cambio vs DevKit que usa UART2)

// ============================================================
// VARIABLES GLOBALES
// ============================================================

String lastBarcode = "";
String deviceID = "";
unsigned long lastScanTime = 0;
float batteryVoltage = 0.0;
int batteryPercent = 100;

bool displayOn = true;
unsigned long lastActivityTime = 0;
const unsigned long SCREEN_TIMEOUT = 30000;

enum SystemState {
  STATE_IDLE,
  STATE_SCANNING,
  STATE_SENDING,
  STATE_SUCCESS,
  STATE_ERROR
};

SystemState currentState = STATE_IDLE;

// ============================================================
// CALLBACKS BLE (Idénticos a versión DevKit)
// ============================================================

class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("BLE: Cliente conectado");
    showMessage("Conectado", "Smartphone vinculado", 2000);
    playSuccessSound();
  };

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("BLE: Cliente desconectado");
    showMessage("Desconectado", "Esperando conexion...", 2000);
  }
};

class MyCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string rxValue = pCharacteristic->getValue();

    if (rxValue.length() > 0) {
      Serial.print("BLE RX: ");
      for (int i = 0; i < rxValue.length(); i++) {
        Serial.print(rxValue[i]);
      }
      Serial.println();

      String command = String(rxValue.c_str());
      processCommand(command);
    }
  }
};

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n=================================");
  Serial.println("Terminal XIAO ESP32-S3 - Iniciando");
  Serial.println("=================================\n");

  // Configurar pines
  setupPins();

  // Inicializar I2C con pines específicos del XIAO
  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);

  // Inicializar display OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("ERROR: No se encontró display OLED");
    while(1);
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0,0);
  display.println("Iniciando XIAO...");
  display.display();

  // Inicializar scanner UART1 (diferente del DevKit)
  ScannerSerial.begin(9600, SERIAL_8N1, SCANNER_RX_PIN, SCANNER_TX_PIN);
  Serial.println("Scanner UART inicializado en UART1");

  // Generar ID único del dispositivo
  deviceID = generateDeviceID();
  Serial.print("Device ID: ");
  Serial.println(deviceID);

  // Inicializar BLE
  initBLE();

  // Medir batería
  updateBatteryLevel();

  // Pantalla de inicio
  showSplashScreen();
  delay(2000);

  // Listo
  showMessage("XIAO Listo", "Presiona SCAN", 0);
  setStatusLED(0, 255, 0);

  Serial.println("\nSistema XIAO iniciado correctamente");
  Serial.println("Esperando códigos de barras...\n");
}

// ============================================================
// LOOP PRINCIPAL (Idéntico a versión DevKit)
// ============================================================

void loop() {
  if (ScannerSerial.available()) {
    String barcode = ScannerSerial.readStringUntil('\n');
    barcode.trim();
    if (barcode.length() > 0) {
      handleBarcodeScanned(barcode);
    }
  }

  handleButtons();
  handleBLEConnection();

  static unsigned long lastBatteryCheck = 0;
  if (millis() - lastBatteryCheck > 30000) {
    updateBatteryLevel();
    lastBatteryCheck = millis();
  }

  if (displayOn && (millis() - lastActivityTime > SCREEN_TIMEOUT)) {
    display.ssd1306_command(SSD1306_DISPLAYOFF);
    displayOn = false;
    Serial.println("Pantalla apagada por inactividad");
  }

  delay(10);
}

// ============================================================
// FUNCIONES DE CONFIGURACIÓN
// ============================================================

void setupPins() {
  // Botones (INPUT_PULLUP) - solo 2 en XIAO
  pinMode(BTN_SCAN, INPUT_PULLUP);
  pinMode(BTN_OK, INPUT_PULLUP);

  // Outputs
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(VIBRATOR_PIN, OUTPUT);
  pinMode(SCANNER_TRIG_PIN, OUTPUT);
  pinMode(LED_RGB_R, OUTPUT);
  pinMode(LED_RGB_G, OUTPUT);
  pinMode(LED_RGB_B, OUTPUT);

  // Estado inicial
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(VIBRATOR_PIN, LOW);
  digitalWrite(SCANNER_TRIG_PIN, HIGH);

  // ADC batería (XIAO tiene divisor de voltaje interno)
  pinMode(BATTERY_ADC_PIN, INPUT);

  // XIAO ESP32-S3: Configurar ADC
  analogReadResolution(12); // 12-bit resolution
  analogSetAttenuation(ADC_11db); // 0-3.3V range
}

void initBLE() {
  Serial.println("Inicializando BLE...");

  BLEDevice::init(DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pTxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_TX,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pTxCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_RX,
    BLECharacteristic::PROPERTY_WRITE
  );
  pRxCharacteristic->setCallbacks(new MyCallbacks());

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);
  BLEDevice::startAdvertising();

  Serial.println("BLE iniciado - esperando conexiones...");
}

// ============================================================
// FUNCIONES DE SCANNER (Idénticas)
// ============================================================

void handleBarcodeScanned(String barcode) {
  lastActivityTime = millis();

  Serial.print("Código escaneado: ");
  Serial.println(barcode);

  lastBarcode = barcode;
  lastScanTime = millis();

  playSuccessSound();
  vibrate(100);
  setStatusLED(0, 255, 0);

  showBarcodeOnDisplay(barcode);

  if (deviceConnected) {
    sendBarcodeBLE(barcode);
  } else {
    showMessage("Sin conexion", "Conecta smartphone", 2000);
    playErrorSound();
  }
}

void sendBarcodeBLE(String barcode) {
  currentState = STATE_SENDING;
  setStatusLED(0, 0, 255);

  String jsonMessage = "{";
  jsonMessage += "\"type\":\"barcode\",";
  jsonMessage += "\"code\":\"" + barcode + "\",";
  jsonMessage += "\"device\":\"" + deviceID + "\",";
  jsonMessage += "\"timestamp\":" + String(millis()) + ",";
  jsonMessage += "\"battery\":" + String(batteryPercent);
  jsonMessage += "}";

  pTxCharacteristic->setValue(jsonMessage.c_str());
  pTxCharacteristic->notify();

  Serial.print("BLE TX: ");
  Serial.println(jsonMessage);

  currentState = STATE_SUCCESS;
  setStatusLED(0, 255, 0);

  delay(500);
  showMessage("Enviado", barcode, 2000);
}

// ============================================================
// FUNCIONES DE DISPLAY (Idénticas)
// ============================================================

void showSplashScreen() {
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(5, 10);
  display.println("TERMINAL");
  display.setTextSize(1);
  display.setCursor(20, 35);
  display.println("XIAO ESP32-S3");
  display.setCursor(10, 50);
  display.print("ID: ");
  display.println(deviceID.substring(0, 8));
  display.display();
}

void showMessage(String title, String message, int duration) {
  if (!displayOn) {
    display.ssd1306_command(SSD1306_DISPLAYON);
    displayOn = true;
  }

  display.clearDisplay();
  display.setTextSize(1);

  display.setCursor(0, 0);
  display.setTextSize(2);
  display.println(title);

  display.setTextSize(1);
  display.setCursor(0, 25);
  display.println(message);

  display.setCursor(0, 55);
  display.print("Bat: ");
  display.print(batteryPercent);
  display.print("%");

  display.setCursor(70, 55);
  if (deviceConnected) {
    display.print("BLE: OK");
  } else {
    display.print("BLE: --");
  }

  display.display();
  lastActivityTime = millis();

  if (duration > 0) {
    delay(duration);
  }
}

void showBarcodeOnDisplay(String barcode) {
  display.clearDisplay();
  display.setTextSize(1);

  display.setCursor(0, 0);
  display.println("CODIGO LEIDO:");

  display.setTextSize(1);
  display.setCursor(0, 20);

  int lineLength = 21;
  for (int i = 0; i < barcode.length(); i += lineLength) {
    display.println(barcode.substring(i, min((int)(i + lineLength), (int)barcode.length())));
  }

  display.setCursor(0, 55);
  display.print("Bat:");
  display.print(batteryPercent);
  display.print("%");

  display.display();
}

// ============================================================
// FUNCIONES DE FEEDBACK (Idénticas)
// ============================================================

void playSuccessSound() {
  tone(BUZZER_PIN, 2000, 100);
  delay(100);
  tone(BUZZER_PIN, 2500, 100);
  noTone(BUZZER_PIN);
}

void playErrorSound() {
  tone(BUZZER_PIN, 500, 200);
  delay(200);
  tone(BUZZER_PIN, 300, 200);
  noTone(BUZZER_PIN);
}

void playBeep() {
  tone(BUZZER_PIN, 1500, 100);
  delay(100);
  noTone(BUZZER_PIN);
}

void vibrate(int duration) {
  digitalWrite(VIBRATOR_PIN, HIGH);
  delay(duration);
  digitalWrite(VIBRATOR_PIN, LOW);
}

void setStatusLED(int r, int g, int b) {
  analogWrite(LED_RGB_R, r);
  analogWrite(LED_RGB_G, g);
  analogWrite(LED_RGB_B, b);
}

// ============================================================
// FUNCIONES DE BATERÍA - ADAPTADO PARA XIAO
// ============================================================

void updateBatteryLevel() {
  // XIAO ESP32-S3 tiene divisor de voltaje 1:2 en el pin de batería
  // El pin BAT está conectado a un divisor que lee VBAT/2

  int adcValue = 0;
  for (int i = 0; i < 10; i++) {
    adcValue += analogRead(BATTERY_ADC_PIN);
    delay(10);
  }
  adcValue /= 10;

  // Convertir a voltaje
  // ADC 12-bit (0-4095) con Vref 3.3V
  // Divisor interno 1:2, entonces VBAT = ADC_voltage * 2
  batteryVoltage = (adcValue / 4095.0) * 3.3 * 2.0;

  // Calcular porcentaje (LiPo: 3.0V=0%, 4.2V=100%)
  batteryPercent = map(batteryVoltage * 100,
                       BATTERY_MIN_VOLTAGE * 100,
                       BATTERY_MAX_VOLTAGE * 100,
                       0, 100);
  batteryPercent = constrain(batteryPercent, 0, 100);

  Serial.print("Batería: ");
  Serial.print(batteryVoltage, 2);
  Serial.print("V (");
  Serial.print(batteryPercent);
  Serial.println("%)");
}

// ============================================================
// FUNCIONES DE BOTONES - ADAPTADO PARA 2 BOTONES
// ============================================================

void handleButtons() {
  static unsigned long lastButtonPress = 0;
  const unsigned long debounceDelay = 50;

  if (millis() - lastButtonPress < debounceDelay) {
    return;
  }

  // Botón SCAN
  if (digitalRead(BTN_SCAN) == LOW) {
    lastButtonPress = millis();
    lastActivityTime = millis();

    Serial.println("Botón SCAN presionado");
    playBeep();

    // Activar trigger del scanner
    digitalWrite(SCANNER_TRIG_PIN, LOW);
    delay(100);
    digitalWrite(SCANNER_TRIG_PIN, HIGH);

    showMessage("Escaneando", "Apunta al codigo", 0);
  }

  // Botón OK (funcionalidad múltiple)
  if (digitalRead(BTN_OK) == LOW) {
    lastButtonPress = millis();
    lastActivityTime = millis();

    Serial.println("Botón OK presionado");
    playBeep();

    // Mostrar info si se mantiene presionado
    unsigned long pressTime = millis();
    while(digitalRead(BTN_OK) == LOW && (millis() - pressTime) < 2000) {
      delay(10);
    }

    if ((millis() - pressTime) > 2000) {
      // Presionado largo: mostrar info
      showInfoScreen();
    } else {
      // Presionado corto: confirmar
      showMessage("OK", "Siguiente codigo", 2000);
    }
  }
}

void showInfoScreen() {
  display.clearDisplay();
  display.setTextSize(1);

  display.setCursor(0, 0);
  display.println("INFO XIAO");
  display.println("---------------");
  display.print("ID: ");
  display.println(deviceID.substring(0, 10));
  display.print("Bat: ");
  display.print(batteryVoltage, 2);
  display.print("V (");
  display.print(batteryPercent);
  display.println("%)");
  display.print("BLE: ");
  display.println(deviceConnected ? "Conectado" : "Desconectado");
  display.print("Ultimo:");
  display.println(lastBarcode.substring(0, 12));

  display.display();
  delay(5000);
  showMessage("Listo", "Presiona SCAN", 0);
}

// ============================================================
// FUNCIONES BLE (Idénticas)
// ============================================================

void handleBLEConnection() {
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("BLE: Reiniciando advertising...");
    oldDeviceConnected = deviceConnected;
  }

  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
}

void processCommand(String command) {
  Serial.print("Procesando comando: ");
  Serial.println(command);

  if (command == "PING") {
    String response = "{\"type\":\"pong\",\"device\":\"" + deviceID + "\"}";
    pTxCharacteristic->setValue(response.c_str());
    pTxCharacteristic->notify();
  }
  else if (command == "STATUS") {
    String status = "{";
    status += "\"type\":\"status\",";
    status += "\"battery\":" + String(batteryPercent) + ",";
    status += "\"voltage\":" + String(batteryVoltage, 2) + ",";
    status += "\"lastBarcode\":\"" + lastBarcode + "\",";
    status += "\"device\":\"" + deviceID + "\"";
    status += "}";
    pTxCharacteristic->setValue(status.c_str());
    pTxCharacteristic->notify();
  }
  else if (command == "BEEP") {
    playBeep();
  }
  else if (command == "VIBRATE") {
    vibrate(200);
  }
}

// ============================================================
// FUNCIONES AUXILIARES (Idénticas)
// ============================================================

String generateDeviceID() {
  uint64_t chipid = ESP.getEfuseMac();
  char id[20];
  sprintf(id, "XIAO-%04X%04X", (uint16_t)(chipid >> 32), (uint16_t)chipid);
  return String(id);
}
