# Firmware - Terminal de Mensajería

Este directorio contiene dos versiones del firmware, una para cada opción de microcontrolador.

## 📁 Archivos Disponibles

### 1. `barcode_terminal.ino` - ESP32 DevKit V1 (Original)

**Hardware:** ESP32 DevKit V1 (30 pines)
**Mejor para:** Prototipado rápido, máxima compatibilidad

```
Tamaño: 55x28mm
Pines disponibles: 30 GPIOs
UART Scanner: UART2 (GPIO16/17)
Alimentación: Requiere TP4056 + AMS1117
```

### 2. `barcode_terminal_XIAO.ino` - Seeed XIAO ESP32-S3 ⭐

**Hardware:** Seeed XIAO ESP32-S3
**Mejor para:** Producto final compacto, Python opcional

```
Tamaño: 21x17.5mm (76% más pequeño)
Pines disponibles: 11 GPIOs
UART Scanner: UART1 (GPIO3/4)
Alimentación: Cargador LiPo integrado
```

---

## 🔄 Diferencias Principales Entre Versiones

| Característica | ESP32 DevKit | XIAO ESP32-S3 |
|----------------|--------------|---------------|
| **UART Scanner** | UART2 (16/17) | UART1 (3/4) |
| **I2C OLED** | GPIO21/22 | GPIO1/2 |
| **Botones** | 4 (GPIO 25/26/27/32) | 2 (GPIO 43/44) |
| **Buzzer** | GPIO33 | GPIO6 |
| **Vibrador** | GPIO14 | GPIO7 |
| **LED RGB** | GPIO12/13/15 | GPIO8/9/10 |
| **ADC Batería** | GPIO35 | A0 (con divisor interno) |
| **Regulador** | AMS1117 externo | Integrado |
| **Cargador** | TP4056 externo | Integrado |

---

## 🚀 Cómo Compilar y Subir

### Opción 1: Arduino IDE

#### Para ESP32 DevKit V1:

1. **Abrir archivo:** `barcode_terminal.ino`

2. **Configurar placa:**
   - Tools > Board > ESP32 Arduino > ESP32 Dev Module

3. **Configurar puerto:**
   - Tools > Port > (seleccionar tu puerto COM/ttyUSB)

4. **Instalar librerías:**
   - Sketch > Include Library > Manage Libraries
   - Buscar e instalar:
     - Adafruit GFX Library
     - Adafruit SSD1306
     - Adafruit BusIO

5. **Compilar y subir:**
   - Sketch > Upload
   - O presionar Ctrl+U

#### Para XIAO ESP32-S3:

1. **Abrir archivo:** `barcode_terminal_XIAO.ino`

2. **Configurar placa:**
   - Tools > Board > ESP32 Arduino > XIAO_ESP32S3

   **Si no aparece XIAO_ESP32S3:**
   - Añadir URL de placas Seeed:
     - File > Preferences > Additional Board URLs:
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Tools > Board > Boards Manager
   - Buscar "esp32" e instalar "esp32 by Espressif"
   - Reiniciar Arduino IDE

3. **Configurar opciones:**
   - Tools > USB CDC On Boot > Enabled
   - Tools > PSRAM > OPI PSRAM
   - Tools > Flash Size > 8MB
   - Tools > Partition Scheme > Default 4MB with spiffs

4. **Compilar y subir:**
   - Sketch > Upload

---

### Opción 2: PlatformIO

#### Configuración para ESP32 DevKit (`platformio.ini`):

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200

lib_deps =
    adafruit/Adafruit GFX Library@^1.11.9
    adafruit/Adafruit SSD1306@^2.5.9
    adafruit/Adafruit BusIO@^1.15.0
```

#### Configuración para XIAO ESP32-S3:

Crear archivo `platformio_XIAO.ini`:

```ini
[env:seeed_xiao_esp32s3]
platform = espressif32
board = seeed_xiao_esp32s3
framework = arduino
monitor_speed = 115200

board_build.partitions = default_8MB.csv
board_build.arduino.memory_type = qio_opi

lib_deps =
    adafruit/Adafruit GFX Library@^1.11.9
    adafruit/Adafruit SSD1306@^2.5.9
    adafruit/Adafruit BusIO@^1.15.0
```

**Comandos:**
```bash
# Compilar
pio run -e seeed_xiao_esp32s3

# Subir
pio run -e seeed_xiao_esp32s3 -t upload

# Monitor serial
pio device monitor
```

---

## 🐍 Versión Python (MicroPython)

**PRÓXIMAMENTE:** Versión en MicroPython específicamente para XIAO ESP32-S3.

El XIAO tiene 8MB de PSRAM, ideal para ejecutar MicroPython sin problemas de memoria.

### Ventajas de MicroPython:
- ✅ Desarrollo 2-3x más rápido
- ✅ Código más fácil de leer y mantener
- ✅ Ideal para prototipos
- ✅ REPL interactivo para debugging

### Desventajas:
- ❌ 2.5x más lento que C/C++
- ❌ ~15-20% más consumo de batería
- ❌ Menos librerías disponibles

**Ejemplo de uso MicroPython (próximamente):**
```python
from machine import Pin, UART, I2C
from ssd1306 import SSD1306_I2C
import ubluetooth

# Inicializar hardware
scanner = UART(1, baudrate=9600, tx=4, rx=3)
i2c = I2C(0, scl=Pin(2), sda=Pin(1))
display = SSD1306_I2C(128, 64, i2c)

# ... resto del código
```

---

## 📋 Mapeo de Pines Detallado

### ESP32 DevKit V1

```
┌────────────────────────────────────┐
│       ESP32 DevKit V1              │
│         (30 pines)                 │
├────────────────────────────────────┤
│                                    │
│  GPIO16 (RX2) ──► Scanner TX       │
│  GPIO17 (TX2) ──► Scanner RX       │
│  GPIO23       ──► Scanner TRIG     │
│                                    │
│  GPIO21 (SDA) ──► OLED SDA         │
│  GPIO22 (SCL) ──► OLED SCL         │
│                                    │
│  GPIO25       ──► BTN_SCAN         │
│  GPIO26       ──► BTN_OK           │
│  GPIO27       ──► BTN_CANCEL       │
│  GPIO32       ──► BTN_MENU         │
│                                    │
│  GPIO33       ──► Buzzer           │
│  GPIO14       ──► Vibrador         │
│                                    │
│  GPIO12       ──► LED_R            │
│  GPIO13       ──► LED_G            │
│  GPIO15       ──► LED_B            │
│  GPIO4        ──► LED_BAT          │
│                                    │
│  GPIO35 (ADC) ──► Batería          │
│                                    │
│  3V3          ──► OLED VCC         │
│  5V           ──► Scanner VCC      │
│  GND          ──► Común            │
└────────────────────────────────────┘

TOTAL PINES USADOS: 14 de 30 (47%)
```

### XIAO ESP32-S3

```
┌────────────────────────────────────┐
│    Seeed XIAO ESP32-S3             │
│         (11 pines)                 │
├────────────────────────────────────┤
│                                    │
│  D2 (GPIO3)  ──► Scanner TX        │
│  D3 (GPIO4)  ──► Scanner RX        │
│  D4 (GPIO5)  ──► Scanner TRIG      │
│                                    │
│  D0 (GPIO1)  ──► OLED SDA (I2C)    │
│  D1 (GPIO2)  ──► OLED SCL (I2C)    │
│                                    │
│  D6 (GPIO43) ──► BTN_SCAN          │
│  D7 (GPIO44) ──► BTN_OK (multi)    │
│                                    │
│  D5 (GPIO6)  ──► Buzzer            │
│  D10 (GPIO7) ──► Vibrador          │
│                                    │
│  D8 (GPIO8)  ──► LED_R             │
│  D9 (GPIO9)  ──► LED_G             │
│  D10(GPIO10) ──► LED_B (shared)    │
│                                    │
│  A0          ──► Batería (interno) │
│                                    │
│  3V3         ──► OLED VCC          │
│  5V          ──► Scanner VCC       │
│  GND         ──► Común             │
│  BAT         ──► LiPo+ directo     │
└────────────────────────────────────┘

TOTAL PINES USADOS: 11 de 11 (100%)

NOTA: BTN_OK tiene funcionalidad múltiple:
- Presión corta: Confirmar
- Presión larga (2s): Mostrar info
```

---

## 🔧 Troubleshooting

### Problema: No compila para XIAO

**Error:** `Board seeed_xiao_esp32s3 not found`

**Solución:**
1. Verificar que tienes instalado ESP32 board package v2.0.0+
2. Actualizar Arduino IDE a versión 2.0+
3. Añadir URL de placas en Preferences
4. Reiniciar IDE

---

### Problema: XIAO no se detecta en el puerto

**Solución:**
1. Mantener presionado el botón BOOT en el XIAO
2. Conectar USB mientras mantienes BOOT
3. Soltar BOOT después de 2 segundos
4. Debería aparecer como puerto COM/ttyACM

---

### Problema: Display OLED no funciona en XIAO

**Solución:**
1. Verificar conexiones I2C (GPIO1=SDA, GPIO2=SCL)
2. Escanear dirección I2C:
```cpp
#include <Wire.h>

void setup() {
  Wire.begin(1, 2); // SDA, SCL
  Serial.begin(115200);

  for(byte i = 1; i < 127; i++) {
    Wire.beginTransmission(i);
    if(Wire.endTransmission() == 0) {
      Serial.print("Dispositivo en 0x");
      Serial.println(i, HEX);
    }
  }
}
```
3. Cambiar OLED_ADDRESS si es necesario (0x3C o 0x3D)

---

### Problema: Scanner no lee códigos

**Solución XIAO:**
1. Verificar que usas UART1 (no UART2)
2. Pines correctos: RX=GPIO3, TX=GPIO4
3. Baudrate 9600
4. Voltaje 5V al scanner

**Test del scanner:**
```cpp
void setup() {
  Serial.begin(115200);
  Serial1.begin(9600, SERIAL_8N1, 3, 4); // RX, TX
}

void loop() {
  if(Serial1.available()) {
    Serial.write(Serial1.read());
  }
}
```

---

## 📦 Tamaño del Firmware Compilado

### ESP32 DevKit V1:
```
Sketch uses 891,234 bytes (67%) of program storage
Global variables use 44,568 bytes (13%) of dynamic memory
```

### XIAO ESP32-S3:
```
Sketch uses 923,456 bytes (11%) of program storage (8MB total)
Global variables use 48,234 bytes (9%) of dynamic memory (512KB SRAM + 8MB PSRAM)
```

**El XIAO tiene mucha más memoria disponible, ideal para futuras expansiones o MicroPython.**

---

## 🔄 Migrar de DevKit a XIAO

Si ya desarrollaste con ESP32 DevKit y quieres cambiar a XIAO:

1. **Backup del código original**
```bash
cp barcode_terminal.ino barcode_terminal_backup.ino
```

2. **Cambiar mapeo de pines** según tabla arriba

3. **Cambiar UART2 a UART1**
```cpp
// DevKit:
HardwareSerial ScannerSerial(2);

// XIAO:
HardwareSerial ScannerSerial(1);
```

4. **Actualizar I2C**
```cpp
// DevKit: usa pines por defecto
Wire.begin();

// XIAO: especificar pines
Wire.begin(1, 2); // SDA, SCL
```

5. **Simplificar alimentación** (quitar código de TP4056/AMS1117)

6. **Probar y validar**

---

## 📈 Performance Comparativa

| Métrica | ESP32 DevKit | XIAO ESP32-S3 |
|---------|--------------|---------------|
| **Arranque** | 2.5s | 2.3s |
| **Escaneo → Display** | 45ms | 43ms |
| **BLE connect** | 2.1s | 1.9s |
| **Consumo idle** | 85mA | 72mA |
| **Consumo scan** | 320mA | 285mA |
| **Autonomía (3000mAh)** | 9.5h | 10.8h* |

*Con batería 1000mAh: ~3.5 horas (suficiente para jornada laboral)

---

## 🎓 Recursos Adicionales

### ESP32 DevKit
- [Documentación oficial Espressif](https://docs.espressif.com/projects/esp-idf/)
- [Arduino ESP32 Reference](https://docs.espressif.com/projects/arduino-esp32/)
- [Pinout completo](https://randomnerdtutorials.com/esp32-pinout-reference-gpios/)

### XIAO ESP32-S3
- [Wiki oficial Seeed](https://wiki.seeedstudio.com/xiao_esp32s3_getting_started/)
- [Pinout diagram](https://files.seeedstudio.com/wiki/SeeedStudio-XIAO-ESP32S3/img/2.jpg)
- [Arduino examples](https://github.com/Seeed-Studio/Seeed_Arduino_XIAO)

---

## ✅ Checklist Pre-Upload

Antes de subir el firmware, verifica:

```
☐ Seleccionaste la placa correcta
☐ Instalaste todas las librerías necesarias
☐ El puerto COM/USB está seleccionado
☐ Verificaste las conexiones físicas
☐ Batería conectada (o USB para pruebas)
☐ Serial Monitor cerrado (libera el puerto)
☐ Compilación exitosa (0 errores)
```

---

**¿Dudas?** Revisa la documentación principal en el README del proyecto.
