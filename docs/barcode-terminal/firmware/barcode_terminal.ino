/*
 * Terminal Portátil de Mensajería - Firmware ESP32
 *
 * Características:
 * - Lectura de códigos de barras 1D/2D vía UART (GM67)
 * - Comunicación BLE con smartphone Android
 * - Display OLED SSD1306 para feedback visual
 * - Buzzer y vibración para confirmación
 * - Gestión de batería con medición ADC
 * - Modos de ahorro de energía
 *
 * Autor: Sistema de diseño colaborativo
 * Versión: 1.0.0
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
// CONFIGURACIÓN DE PINES
// ============================================================

// UART Scanner (GM67)
#define SCANNER_RX_PIN 16
#define SCANNER_TX_PIN 17
#define SCANNER_TRIG_PIN 23

// Display OLED (I2C)
#define OLED_SDA_PIN 21
#define OLED_SCL_PIN 22
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_ADDRESS 0x3C

// Botones
#define BTN_SCAN 25
#define BTN_OK 26
#define BTN_CANCEL 27
#define BTN_MENU 32

// Feedback
#define BUZZER_PIN 33
#define VIBRATOR_PIN 14

// LEDs
#define LED_STATUS 2
#define LED_RGB_R 12
#define LED_RGB_G 13
#define LED_RGB_B 15
#define LED_BATTERY 4

// Batería
#define BATTERY_ADC_PIN 35
#define BATTERY_MIN_VOLTAGE 3.0
#define BATTERY_MAX_VOLTAGE 4.2

// ============================================================
// CONFIGURACIÓN BLE
// ============================================================

#define SERVICE_UUID        "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"  // Nordic UART Service
#define CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

#define DEVICE_NAME "Courier_Terminal"

// ============================================================
// OBJETOS GLOBALES
// ============================================================

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

BLEServer* pServer = NULL;
BLECharacteristic* pTxCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

HardwareSerial ScannerSerial(2); // UART2 para scanner

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
const unsigned long SCREEN_TIMEOUT = 30000; // 30 segundos

// Estados del sistema
enum SystemState {
  STATE_IDLE,
  STATE_SCANNING,
  STATE_SENDING,
  STATE_SUCCESS,
  STATE_ERROR
};

SystemState currentState = STATE_IDLE;

// ============================================================
// CALLBACKS BLE
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

      // Procesar comandos recibidos del smartphone
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
  Serial.println("Terminal de Mensajería - Iniciando");
  Serial.println("=================================\n");

  // Configurar pines
  setupPins();

  // Inicializar display OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("ERROR: No se encontró display OLED");
    while(1); // Detener si no hay display
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0,0);
  display.println("Iniciando...");
  display.display();

  // Inicializar scanner UART
  ScannerSerial.begin(9600, SERIAL_8N1, SCANNER_RX_PIN, SCANNER_TX_PIN);
  Serial.println("Scanner UART inicializado");

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
  showMessage("Listo", "Presiona SCAN", 0);
  setStatusLED(0, 255, 0); // Verde

  Serial.println("\nSistema iniciado correctamente");
  Serial.println("Esperando códigos de barras...\n");
}

// ============================================================
// LOOP PRINCIPAL
// ============================================================

void loop() {
  // Leer scanner
  if (ScannerSerial.available()) {
    String barcode = ScannerSerial.readStringUntil('\n');
    barcode.trim();
    if (barcode.length() > 0) {
      handleBarcodeScanned(barcode);
    }
  }

  // Leer botones
  handleButtons();

  // Gestionar conexión BLE
  handleBLEConnection();

  // Actualizar batería cada 30 segundos
  static unsigned long lastBatteryCheck = 0;
  if (millis() - lastBatteryCheck > 30000) {
    updateBatteryLevel();
    lastBatteryCheck = millis();
  }

  // Auto-apagar pantalla por inactividad
  if (displayOn && (millis() - lastActivityTime > SCREEN_TIMEOUT)) {
    display.ssd1306_command(SSD1306_DISPLAYOFF);
    displayOn = false;
    Serial.println("Pantalla apagada por inactividad");
  }

  delay(10); // Pequeño delay para estabilidad
}

// ============================================================
// FUNCIONES DE CONFIGURACIÓN
// ============================================================

void setupPins() {
  // Botones (INPUT_PULLUP)
  pinMode(BTN_SCAN, INPUT_PULLUP);
  pinMode(BTN_OK, INPUT_PULLUP);
  pinMode(BTN_CANCEL, INPUT_PULLUP);
  pinMode(BTN_MENU, INPUT_PULLUP);

  // Outputs
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(VIBRATOR_PIN, OUTPUT);
  pinMode(SCANNER_TRIG_PIN, OUTPUT);
  pinMode(LED_STATUS, OUTPUT);
  pinMode(LED_RGB_R, OUTPUT);
  pinMode(LED_RGB_G, OUTPUT);
  pinMode(LED_RGB_B, OUTPUT);
  pinMode(LED_BATTERY, OUTPUT);

  // Estado inicial
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(VIBRATOR_PIN, LOW);
  digitalWrite(SCANNER_TRIG_PIN, HIGH);
  digitalWrite(LED_STATUS, LOW);

  // ADC batería
  pinMode(BATTERY_ADC_PIN, INPUT);
}

void initBLE() {
  Serial.println("Inicializando BLE...");

  // Crear dispositivo BLE
  BLEDevice::init(DEVICE_NAME);

  // Crear servidor BLE
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Crear servicio BLE
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Crear característica TX
  pTxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_TX,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pTxCharacteristic->addDescriptor(new BLE2902());

  // Crear característica RX
  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_RX,
    BLECharacteristic::PROPERTY_WRITE
  );
  pRxCharacteristic->setCallbacks(new MyCallbacks());

  // Iniciar servicio
  pService->start();

  // Iniciar advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);
  BLEDevice::startAdvertising();

  Serial.println("BLE iniciado - esperando conexiones...");
}

// ============================================================
// FUNCIONES DE SCANNER
// ============================================================

void handleBarcodeScanned(String barcode) {
  lastActivityTime = millis();

  Serial.print("Código escaneado: ");
  Serial.println(barcode);

  lastBarcode = barcode;
  lastScanTime = millis();

  // Feedback inmediato
  playSuccessSound();
  vibrate(100);
  setStatusLED(0, 255, 0); // Verde

  // Mostrar en pantalla
  showBarcodeOnDisplay(barcode);

  // Enviar por BLE si está conectado
  if (deviceConnected) {
    sendBarcodeBLE(barcode);
  } else {
    showMessage("Sin conexion", "Conecta smartphone", 2000);
    playErrorSound();
  }
}

void sendBarcodeBLE(String barcode) {
  currentState = STATE_SENDING;
  setStatusLED(0, 0, 255); // Azul - enviando

  // Crear mensaje JSON
  String jsonMessage = "{";
  jsonMessage += "\"type\":\"barcode\",";
  jsonMessage += "\"code\":\"" + barcode + "\",";
  jsonMessage += "\"device\":\"" + deviceID + "\",";
  jsonMessage += "\"timestamp\":" + String(millis()) + ",";
  jsonMessage += "\"battery\":" + String(batteryPercent);
  jsonMessage += "}";

  // Enviar por BLE
  pTxCharacteristic->setValue(jsonMessage.c_str());
  pTxCharacteristic->notify();

  Serial.print("BLE TX: ");
  Serial.println(jsonMessage);

  currentState = STATE_SUCCESS;
  setStatusLED(0, 255, 0); // Verde - éxito

  delay(500);
  showMessage("Enviado", barcode, 2000);
}

// ============================================================
// FUNCIONES DE DISPLAY
// ============================================================

void showSplashScreen() {
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(10, 10);
  display.println("TERMINAL");
  display.setTextSize(1);
  display.setCursor(15, 35);
  display.println("Mensajeria v1.0");
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

  // Título
  display.setCursor(0, 0);
  display.setTextSize(2);
  display.println(title);

  // Mensaje
  display.setTextSize(1);
  display.setCursor(0, 25);
  display.println(message);

  // Batería
  display.setCursor(0, 55);
  display.print("Bat: ");
  display.print(batteryPercent);
  display.print("%");

  // Estado BLE
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

  // Mostrar código con word wrap
  int lineLength = 21; // caracteres por línea
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
// FUNCIONES DE FEEDBACK
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
// FUNCIONES DE BATERÍA
// ============================================================

void updateBatteryLevel() {
  // Leer ADC (múltiples lecturas para promedio)
  int adcValue = 0;
  for (int i = 0; i < 10; i++) {
    adcValue += analogRead(BATTERY_ADC_PIN);
    delay(10);
  }
  adcValue /= 10;

  // Convertir a voltaje (divisor de voltaje 1:1, ADC 12-bit)
  batteryVoltage = (adcValue / 4095.0) * 3.3 * 2.0; // *2 por divisor

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

  // Indicador LED batería baja
  if (batteryPercent < 20) {
    digitalWrite(LED_BATTERY, HIGH);
  } else {
    digitalWrite(LED_BATTERY, LOW);
  }
}

// ============================================================
// FUNCIONES DE BOTONES
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

  // Botón OK
  if (digitalRead(BTN_OK) == LOW) {
    lastButtonPress = millis();
    lastActivityTime = millis();

    Serial.println("Botón OK presionado");
    playBeep();
    showMessage("Listo", "Siguiente codigo", 2000);
  }

  // Botón CANCEL
  if (digitalRead(BTN_CANCEL) == LOW) {
    lastButtonPress = millis();
    lastActivityTime = millis();

    Serial.println("Botón CANCEL presionado");
    playBeep();
    lastBarcode = "";
    showMessage("Cancelado", "Listo", 2000);
  }

  // Botón MENU
  if (digitalRead(BTN_MENU) == LOW) {
    lastButtonPress = millis();
    lastActivityTime = millis();

    Serial.println("Botón MENU presionado");
    playBeep();
    showInfoScreen();
  }
}

void showInfoScreen() {
  display.clearDisplay();
  display.setTextSize(1);

  display.setCursor(0, 0);
  display.println("INFO TERMINAL");
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
  display.print("Ultimo codigo:");
  display.println(lastBarcode.substring(0, 12));

  display.display();
  delay(5000);
  showMessage("Listo", "Presiona SCAN", 0);
}

// ============================================================
// FUNCIONES BLE
// ============================================================

void handleBLEConnection() {
  // Reconectar si se desconectó
  if (!deviceConnected && oldDeviceConnected) {
    delay(500); // Dar tiempo al stack BLE
    pServer->startAdvertising();
    Serial.println("BLE: Reiniciando advertising...");
    oldDeviceConnected = deviceConnected;
  }

  // Nueva conexión
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
// FUNCIONES AUXILIARES
// ============================================================

String generateDeviceID() {
  uint64_t chipid = ESP.getEfuseMac();
  char id[20];
  sprintf(id, "CT-%04X%04X", (uint16_t)(chipid >> 32), (uint16_t)chipid);
  return String(id);
}
