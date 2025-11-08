# Guía de Ensamblaje - Terminal de Mensajería

## Índice
1. [Preparación](#1-preparación)
2. [Prototipo en Breadboard (Fase 1)](#2-prototipo-en-breadboard-fase-1)
3. [Pruebas del Prototipo](#3-pruebas-del-prototipo)
4. [PCB Custom (Fase 2)](#4-pcb-custom-fase-2)
5. [Ensamblaje Final](#5-ensamblaje-final)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Preparación

### 1.1 Herramientas Necesarias

**Esenciales:**
- ✅ Soldador de temperatura controlada (30-80W, 350°C)
- ✅ Estaño con flux (0.6-0.8mm, 60/40 o sin plomo)
- ✅ Multímetro digital
- ✅ Alicates de corte y punta fina
- ✅ Destornillador de precisión
- ✅ Breadboard 830 puntos
- ✅ Cables jumper macho-macho, macho-hembra
- ✅ Pinzas antiestáticas

**Recomendadas:**
- ⭐ Tercera mano con lupa
- ⭐ Flux adicional en pasta o líquido
- ⭐ Desoldador de succión o trenza
- ⭐ Cinta Kapton (alta temperatura)
- ⭐ Estación de aire caliente (para SMD)
- ⭐ Osciloscopio USB (opcional)

### 1.2 Componentes a Recibir

Verificar que tienes todos los componentes del BOM:

```
□ ESP32-WROOM-32E (1x)
□ GM67 Scanner 2D (1x)
□ OLED SSD1306 1.3" (1x)
□ Batería LiPo 3000mAh (1x)
□ Módulo TP4056 (1x)
□ AMS1117-3.3 (1x)
□ Pulsadores 6x6mm (4x)
□ Buzzer piezo (1x)
□ Motor vibración (1x)
□ LEDs (3x)
□ Transistores 2N2222 (2x)
□ Resistencias variadas
□ Capacitores variados
□ Conector USB-C
□ Interruptor ON/OFF
□ Cables varios
```

### 1.3 Software Necesario

**Para programar ESP32:**

1. **Opción A: Arduino IDE** (Más fácil)
```bash
# Descargar desde https://www.arduino.cc/en/software

# Instalar soporte ESP32:
# File > Preferences > Additional Board URLs:
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json

# Tools > Board > Boards Manager > buscar "ESP32" > Install
```

2. **Opción B: PlatformIO** (Profesional)
```bash
# Instalar VS Code
# Instalar extensión PlatformIO IDE

# O vía CLI:
pip install platformio
```

**Librerías necesarias** (Arduino IDE):
- Adafruit GFX Library
- Adafruit SSD1306
- Adafruit BusIO

**Driver USB-Serial:**
- CP2102: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
- CH340: http://www.wch.cn/download/CH341SER_EXE.html

---

## 2. Prototipo en Breadboard (Fase 1)

### 2.1 Diagrama de Conexiones

```
┌─────────────────────────────────────────────────────────────────┐
│                    BREADBOARD LAYOUT                             │
└─────────────────────────────────────────────────────────────────┘

RAIL POSITIVO (+) ───── VCC 3.3V (desde regulador o fuente)
RAIL NEGATIVO (-) ───── GND

┌────────────────────────────────────────────────────────────────┐
│  Sección 1: Alimentación                                       │
└────────────────────────────────────────────────────────────────┘

Batería LiPo ──┬──► TP4056 Module ──┬──► AMS1117-3.3 ──► VCC (3.3V)
               │                    │
             USB-C                 GND
             Charging


┌────────────────────────────────────────────────────────────────┐
│  Sección 2: ESP32 + OLED                                       │
└────────────────────────────────────────────────────────────────┘

ESP32 DevKit V1 (30 pines)
- VIN (3.3V) ──► VCC
- GND ──► GND
- GPIO21 ──► OLED SDA
- GPIO22 ──► OLED SCL

OLED 1.3" (4 pines)
- VCC ──► 3.3V
- GND ──► GND
- SDA ──► GPIO21
- SCL ──► GPIO22


┌────────────────────────────────────────────────────────────────┐
│  Sección 3: Scanner GM67                                       │
└────────────────────────────────────────────────────────────────┘

GM67 (5 pines)
- VCC ──► 5V (directamente de LiPo, 3.7-4.2V OK)
- GND ──► GND
- TX ──► GPIO16 (RX2)
- RX ──► GPIO17 (TX2)
- TRIG ──► GPIO23 (opcional)


┌────────────────────────────────────────────────────────────────┐
│  Sección 4: Botones                                            │
└────────────────────────────────────────────────────────────────┘

Cada botón:
GPIO ──┬──[Botón]──► GND
       │
    10kΩ resistor
       │
      VCC

- BTN_SCAN (GPIO25)
- BTN_OK (GPIO26)
- BTN_CANCEL (GPIO27)
- BTN_MENU (GPIO32)


┌────────────────────────────────────────────────────────────────┐
│  Sección 5: Buzzer y Vibrador                                  │
└────────────────────────────────────────────────────────────────┘

Buzzer (con transistor):
GPIO33 ──► [1kΩ] ──► Base 2N2222
                      Collector ──► VCC
                      Emitter ──► Buzzer+ ──► GND

Vibrador (con transistor):
GPIO14 ──► [1kΩ] ──► Base 2N2222
                      Collector ──► VCC ──► Motor
                      Emitter ──► GND
                      + Diodo 1N4148 anti-flyback


┌────────────────────────────────────────────────────────────────┐
│  Sección 6: LEDs Indicadores                                   │
└────────────────────────────────────────────────────────────────┘

LED Status (GPIO2):
GPIO2 ──► [330Ω] ──► LED+ ──► LED- ──► GND

LED RGB (common cathode):
GPIO12 ──► [330Ω] ──► R
GPIO13 ──► [330Ω] ──► G
GPIO15 ──► [330Ω] ──► B
Common ──► GND


┌────────────────────────────────────────────────────────────────┐
│  Sección 7: Medición Batería (ADC)                             │
└────────────────────────────────────────────────────────────────┘

VBAT ──► [100kΩ] ──┬──► GPIO35 (ADC)
                    │
                 [100kΩ]
                    │
                   GND

Divisor voltaje 1:1 → VBAT/2 al ADC
```

### 2.2 Paso a Paso (Breadboard)

#### Paso 1: Configurar Alimentación

1. **Conectar batería al TP4056:**
   ```
   Batería + ──► BAT+ (TP4056)
   Batería - ──► BAT- (TP4056)
   ```

2. **Conectar TP4056 al AMS1117:**
   ```
   OUT+ (TP4056) ──► VIN (AMS1117)
   OUT- (TP4056) ──► GND
   ```

3. **Salida del AMS1117:**
   ```
   VOUT (3.3V) ──► Rail + breadboard
   GND ──► Rail - breadboard
   ```

4. **Verificar con multímetro:**
   - Entre VCC y GND debe haber 3.3V ±0.1V
   - ⚠️ Si no hay voltaje, revisar conexiones y orientación del regulador

#### Paso 2: Conectar ESP32

1. Colocar ESP32 DevKit en el breadboard
2. Conectar:
   ```
   3V3 pin ──► VCC rail
   GND pins ──► GND rail
   ```

3. **Probar encendido:**
   - El LED de la placa ESP32 debe encender
   - Si no enciende, verificar polaridad de alimentación

#### Paso 3: Conectar OLED

1. Conectar display OLED:
   ```
   OLED VCC ──► 3.3V
   OLED GND ──► GND
   OLED SDA ──► GPIO21 (ESP32)
   OLED SCL ──► GPIO22 (ESP32)
   ```

2. **Cargar código de prueba I2C:**
   ```cpp
   #include <Wire.h>

   void setup() {
     Wire.begin();
     Serial.begin(115200);
     Serial.println("Escaneando I2C...");

     byte count = 0;
     for (byte i = 1; i < 127; i++) {
       Wire.beginTransmission(i);
       if (Wire.endTransmission() == 0) {
         Serial.print("Dispositivo en 0x");
         Serial.println(i, HEX);
         count++;
       }
     }
     Serial.println(count == 0 ? "No se encontraron dispositivos" : "Escaneo completo");
   }

   void loop() {}
   ```

3. Deberías ver `0x3C` o `0x3D` en el monitor serial

#### Paso 4: Conectar Scanner GM67

1. Conectar cables:
   ```
   GM67 VCC ──► VBAT (4.2V, no 3.3V)
   GM67 GND ──► GND
   GM67 TX ──► GPIO16 (RX2)
   GM67 RX ──► GPIO17 (TX2)
   ```

2. **Código de prueba UART:**
   ```cpp
   HardwareSerial ScannerSerial(2);

   void setup() {
     Serial.begin(115200);
     ScannerSerial.begin(9600, SERIAL_8N1, 16, 17);
     Serial.println("Scanner listo");
   }

   void loop() {
     if (ScannerSerial.available()) {
       String data = ScannerSerial.readStringUntil('\n');
       Serial.println("Código: " + data);
     }
   }
   ```

3. Escanear un código de barras → debe aparecer en monitor serial

#### Paso 5: Conectar Botones

1. Para cada botón, conectar según esquema:
   ```
   GPIO ──┬── [Pulsador] ── GND
          │
       [10kΩ]
          │
         VCC
   ```

2. **Código de prueba:**
   ```cpp
   #define BTN_SCAN 25

   void setup() {
     Serial.begin(115200);
     pinMode(BTN_SCAN, INPUT_PULLUP);
   }

   void loop() {
     if (digitalRead(BTN_SCAN) == LOW) {
       Serial.println("Botón presionado");
       delay(200);
     }
   }
   ```

#### Paso 6: Conectar Buzzer

1. Conectar según esquema con transistor
2. **Código de prueba:**
   ```cpp
   #define BUZZER 33

   void setup() {
     pinMode(BUZZER, OUTPUT);
   }

   void loop() {
     tone(BUZZER, 2000, 500); // 2kHz, 500ms
     delay(1000);
   }
   ```

#### Paso 7: Conectar Vibrador

Similar al buzzer, usar GPIO14 y probar con código similar

#### Paso 8: Probar Conjunto

1. Cargar firmware completo (`barcode_terminal.ino`)
2. Abrir monitor serial (115200 baud)
3. Verificar:
   - ✅ Display muestra mensaje de inicio
   - ✅ BLE inicia advertising
   - ✅ Scanner responde a códigos
   - ✅ Botones funcionan
   - ✅ Buzzer y vibrador actúan

---

## 3. Pruebas del Prototipo

### 3.1 Checklist de Funcionalidad

```
□ Alimentación estable (3.3V)
□ ESP32 arranca correctamente
□ Display OLED muestra contenido
□ Scanner lee códigos 1D
□ Scanner lee códigos 2D/QR
□ BLE visible desde smartphone
□ BLE conecta exitosamente
□ Envío de datos BLE funciona
□ Botones responden
□ Buzzer suena correctamente
□ Vibrador funciona
□ Medición de batería precisa
□ Consumo dentro de rango esperado
```

### 3.2 Mediciones de Consumo

Usar multímetro en modo amperímetro:

```bash
# Modo idle (esperando)
Consumo esperado: 70-100 mA

# Modo escaneando
Consumo esperado: 250-350 mA

# Modo deep sleep
Consumo esperado: <1 mA
```

Si el consumo es excesivo (>500mA), revisar cortocircuitos.

### 3.3 Test de Comunicación BLE

1. Instalar "nRF Connect" en smartphone
2. Escanear dispositivos BLE
3. Buscar "Courier_Terminal"
4. Conectar
5. Buscar servicio `6E400001...`
6. Habilitar notificaciones en TX characteristic
7. Escribir "PING" en RX characteristic
8. Deberías recibir `{"type":"pong",...}`

---

## 4. PCB Custom (Fase 2)

### 4.1 Diseño en KiCad

#### Instalación KiCad
```bash
# Ubuntu/Debian
sudo apt install kicad kicad-libraries

# Windows/Mac
# Descargar desde https://www.kicad.org/download/
```

#### Crear Proyecto

1. **File > New Project** → `barcode_terminal`

2. **Abrir Schematic Editor**
   - Dibujar esquemático según `03_ESQUEMATICO.md`
   - Asignar footprints a cada componente
   - Anotar componentes (Tools > Annotate Schematic)
   - Generar netlist (Tools > Generate Netlist)

3. **Abrir PCB Editor**
   - Importar netlist
   - Colocar componentes según layout recomendado
   - Definir contorno de PCB (Edge.Cuts layer)
   - Rutear pistas (manual o auto-router)
   - Añadir plano de tierra en capa inferior
   - Design Rules Check (DRC)

4. **Generar Gerbers**
   - File > Plot
   - Seleccionar todas las capas necesarias
   - Formato Gerber X2
   - Generar drill file

### 4.2 Fabricación del PCB

#### Proveedor Recomendado: JLCPCB

1. **Subir Gerbers:**
   - Ir a https://jlcpcb.com
   - Click "Quote Now"
   - Arrastrar ZIP con gerbers
   - Configuración:
     ```
     Layers: 2
     Dimensions: (auto-detectado)
     Quantity: 5
     PCB Thickness: 1.6mm
     PCB Color: Verde (o preferido)
     Surface Finish: HASL (económico) o ENIG (mejor)
     Copper Weight: 1oz
     ```

2. **Opciones adicionales:**
   ```
   Remove Order Number: Yes (€2 extra)
   Castellated Holes: No
   Gold Fingers: No
   Flying Probe Test: No (opcional)
   ```

3. **Ensamblaje (PCBA):**
   - Si deseas ensamblaje SMD, seleccionar "SMT Assembly"
   - Subir BOM y archivos de posición (Pick & Place)
   - Revisar vista 3D
   - Seleccionar componentes disponibles

4. **Envío:**
   - Estándar (15-20 días): €2-5
   - Express DHL (7-10 días): €15-25

**Costo estimado 5 PCBs:** €30-50 sin ensamblaje, €100-200 con ensamblaje SMD

### 4.3 Ensamblaje del PCB

#### Orden de Soldadura Recomendado

1. **Componentes SMD pequeños** (si aplica):
   - Resistencias 0805
   - Capacitores 0805
   - Usar pasta de soldar + aire caliente

2. **ICs y módulos SMD**:
   - Regulador AMS1117
   - USB-C connector

3. **Componentes through-hole**:
   - Headers
   - Conectores
   - Transistores
   - LEDs

4. **Módulos grandes**:
   - ESP32
   - Scanner
   - OLED
   - TP4056

5. **Componentes mecánicos**:
   - Interruptores
   - Botones

#### Técnicas de Soldadura

**SMD (con pasta de soldar):**
```
1. Aplicar pasta de soldar con stencil o jeringa
2. Colocar componentes con pinzas
3. Calentar con aire caliente (280-320°C)
4. Inspeccionar con lupa
```

**Through-hole:**
```
1. Insertar componente
2. Doblar patas en ángulo
3. Soldar con soldador (350°C)
4. Cortar exceso de patilla
5. Limpiar flux residual
```

### 4.4 Inspección Post-Ensamblaje

**Visual:**
- ❌ Puentes de estaño (cortocircuitos)
- ❌ Soldaduras frías (grises, opacas)
- ❌ Componentes torcidos
- ✅ Soldaduras brillantes, cóncavas

**Eléctrico:**
```bash
# Con multímetro en modo continuidad
1. Verificar GND: todos los GND conectados
2. Verificar VCC: no cortocircuito a GND
3. Verificar pistas críticas
4. Medir resistencia entre VCC y GND (debe ser >10kΩ)
```

**Funcional:**
```bash
# Sin batería, con fuente de banco
1. Conectar 3.7V a entrada regulador
2. Medir salida: debe ser 3.3V
3. Si OK, conectar ESP32
4. Programar firmware
5. Verificar arranque en monitor serial
```

---

## 5. Ensamblaje Final

### 5.1 Carcasa (Impresión 3D)

#### Diseño CAD

Si tienes experiencia con CAD:
- Usar Fusion 360 (gratis para hobby)
- FreeCAD (open source)
- OnShape (web-based)

Dimensiones sugeridas:
```
Largo: 150-160mm
Ancho: 80-90mm
Alto: 30-35mm
Grosor paredes: 2-3mm
```

Elementos a incluir:
- Soportes para PCB (tornillos M2.5)
- Ventana para OLED
- Apertura para scanner
- Hueco para botones
- Acceso USB-C
- Respiraderos (ventilación)

#### Impresión

**Parámetros recomendados:**
```
Material: PETG (resistente) o PLA (fácil)
Layer Height: 0.2mm
Infill: 20-30%
Perimeters: 3
Support: Solo donde necesario
```

**Servicios de impresión:**
- Local: Buscar FabLab o makerspace cercano
- Online: Xometry, Sculpteo, 3DHubs

**Costo:** €15-30 por carcasa (depende material y complejidad)

### 5.2 Montaje Final

1. **Colocar PCB en carcasa inferior**
   - Usar tornillos M2.5 x 8mm
   - Añadir espaciadores si es necesario

2. **Conectar batería**
   - Verificar polaridad ⚠️
   - Fijar batería con velcro o soporte

3. **Cerrar carcasa**
   - Alinear ambas mitades
   - Tornillos M2.5 en esquinas

4. **Prueba final**
   - Encender terminal
   - Verificar todas las funciones
   - Probar autonomía

### 5.3 Etiquetado

- Etiquetar botones (SCAN, OK, CANCEL, MENU)
- Añadir indicaciones LED
- Número de serie del dispositivo
- Logo (opcional)

Usar impresora de etiquetas o grabado láser

---

## 6. Troubleshooting

### Problema: ESP32 no arranca

**Síntomas:** No hay salida en monitor serial

**Soluciones:**
1. Verificar voltaje VCC (debe ser 3.3V)
2. Verificar pin EN (debe estar en HIGH)
3. Presionar botón BOOT mientras conectas USB
4. Verificar conexión USB-Serial

### Problema: Display no muestra nada

**Síntomas:** Pantalla negra

**Soluciones:**
1. Verificar voltaje OLED (3.3V)
2. Revisar conexiones I2C (SDA/SCL)
3. Escanear dirección I2C (debe ser 0x3C o 0x3D)
4. Probar con ejemplo básico de Adafruit
5. Verificar que pantalla no esté defectuosa

### Problema: Scanner no lee

**Síntomas:** No hay respuesta al escanear

**Soluciones:**
1. Verificar voltaje scanner (4-5V necesario)
2. Revisar conexiones UART (TX ↔ RX cruzados)
3. Verificar baudrate (9600 por defecto)
4. Probar pin TRIG en LOW para forzar escaneo
5. Verificar que LED del scanner encienda

### Problema: BLE no conecta

**Síntomas:** Dispositivo no aparece o no conecta

**Soluciones:**
1. Verificar en monitor serial que BLE inició
2. Reiniciar Bluetooth en smartphone
3. Borrar dispositivos emparejados previos
4. Acercarse más (< 2 metros)
5. Revisar permisos de app Android (Location, Bluetooth)

### Problema: Batería dura poco

**Síntomas:** Autonomía < 5 horas

**Soluciones:**
1. Verificar consumo en idle con multímetro
2. Implementar deep sleep cuando no se usa
3. Reducir brillo OLED (si ajustable)
4. Apagar scanner cuando no escanea
5. Usar batería mayor capacidad (4000mAh)

### Problema: Buzzer/Vibrador no funciona

**Síntomas:** No hay sonido/vibración

**Soluciones:**
1. Verificar transistor correctamente conectado
2. Medir voltaje en base del transistor al activar
3. Probar componente directamente con 3.3V
4. Verificar polaridad buzzer/motor
5. Añadir diodo de protección (flyback)

---

## 7. Mantenimiento

### Carga de Batería
- Cargar cuando batería < 20%
- Usar cargador USB 5V/1A mínimo
- Tiempo de carga completa: ~3-4 horas
- No dejar cargando >12 horas continuamente

### Limpieza
- Limpiar lente del scanner con paño microfibra
- No usar líquidos directamente en PCB
- Alcohol isopropílico (99%) para limpiar contactos

### Almacenamiento
- Si no se usa >1 mes, cargar batería a 50-60%
- Almacenar en lugar seco, temperatura ambiente
- Evitar temperaturas extremas (<0°C o >50°C)

---

## 8. Próximos Pasos

Una vez funcional el prototipo:

1. **Optimizar firmware**
   - Implementar deep sleep
   - Gestión avanzada de energía
   - OTA updates

2. **Desarrollar app Android**
   - UI/UX profesional
   - Base de datos SQLite
   - Sincronización backend

3. **Testing de campo**
   - Probar en condiciones reales
   - Recopilar feedback
   - Iterar diseño

4. **Producción**
   - Optimizar PCB (reducir tamaño)
   - Carcasa inyectada
   - Certificaciones (CE, FCC)

---

## 9. Recursos Adicionales

### Documentación
- ESP32 Datasheet: https://www.espressif.com/en/products/socs/esp32
- Arduino ESP32: https://docs.espressif.com/projects/arduino-esp32/
- KiCad Docs: https://docs.kicad.org/

### Comunidades
- r/esp32 (Reddit)
- ESP32.com forums
- Arduino forums
- Hackaday.io

### Tiendas de Componentes
- **Internacional:**
  - Mouser Electronics
  - Digikey
  - AliExpress (económico)

- **España:**
  - RS Components
  - Farnell
  - BricoGeek
  - ElectroCrea

---

¡Éxito con tu proyecto! 🚀
