# Esquemático del Circuito - Terminal de Mensajería

## Diagrama de Bloques del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                     TERMINAL DE MENSAJERÍA                      │
└─────────────────────────────────────────────────────────────────┘

         USB-C                    Batería LiPo 3.7V 3000mAh
           │                              │
           │                              │
           ▼                              ▼
    ┌─────────────┐              ┌──────────────┐
    │   TP4056    │◄─────────────┤  Protección  │
    │  Cargador   │              │     BMS      │
    └──────┬──────┘              └──────┬───────┘
           │                            │
           │         VBAT (3.7-4.2V)    │
           └────────────┬───────────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │  AMS1117-3.3 │
                 │  Regulador   │
                 └──────┬───────┘
                        │
                    VCC (3.3V)
                        │
        ┌───────────────┼───────────────┬──────────────┬──────────────┐
        │               │               │              │              │
        ▼               ▼               ▼              ▼              ▼
   ┌─────────┐    ┌──────────┐   ┌──────────┐   ┌─────────┐   ┌──────────┐
   │  ESP32  │    │  GM67    │   │  OLED    │   │ Buzzer  │   │ Vibrador │
   │ WROOM   │◄───┤ Scanner  │   │ SSD1306  │   │  Piezo  │   │  Motor   │
   │  -32E   │    │ 2D/1D    │   │ 128x64   │   │         │   │          │
   └────┬────┘    └──────────┘   └──────────┘   └─────────┘   └──────────┘
        │
        │
   ┌────┴─────┐
   │ Botones  │
   │  x4      │
   └──────────┘

        │
        │ BLE
        ▼
   [Smartphone Android]
```

---

## 1. CIRCUITO DE ALIMENTACIÓN

### 1.1 Carga de Batería (TP4056)

```
USB-C Connector (J1)
    Pin 1 (VBUS) ──┬─── C1 (10uF) ──┬─── GND
                   │                │
                   │           ┌────┴────┐
                   └───────────┤  TP4056 │
                               │         │
                   ┌───────────┤ VCC     │
                   │           │         │
              R1 (1.2kΩ)       │ PROG    │
                   │           │         │
                   ├───────────┤ GND     │
                   │           │         │
                   │           │ BAT+    ├────┬─── VBAT+
                   │           │         │    │
                   │           │ BAT-    ├────┼─── VBAT-
                   │           └─────────┘    │
                   │                          │
                  GND                    C2 (100uF)
                                              │
                                             GND

Componentes:
- J1: Conector USB Type-C (solo VBUS y GND)
- U1: TP4056 módulo de carga LiPo
- C1: 10uF electrolítico (filtro entrada)
- C2: 100uF electrolítico (filtro batería)
- R1: 1.2kΩ (corriente de carga = 1A)
- LED rojo: Cargando (conectado a CHRG pin)
- LED verde: Completo (conectado a STDBY pin)
```

### 1.2 Protección de Batería (BMS)

```
VBAT+ ───┬──── DW01+ ────┬──── FS8205A ────┬──── BAT+
         │               │                  │
      C3 (100nF)     R2 (1kΩ)          R3 (100Ω)
         │               │                  │
VBAT- ───┴──── GND ──────┴──── GND ─────────┴──── BAT-

Características protección:
- Sobre-carga: >4.25V
- Sobre-descarga: <2.5V
- Sobre-corriente: >3A
- Corto-circuito: <0.1Ω
```

### 1.3 Regulador de Voltaje 3.3V

```
BAT+ (3.7-4.2V) ──┬─── C4 (10uF) ──┬─── GND
                  │                │
                  │           ┌────┴────┐
                  └───────────┤AMS1117  │
                              │  -3.3   │
                  ┌───────────┤ VIN     │
                  │           │         │
                  │           │ VOUT    ├─────┬─── VCC (3.3V)
                  │           │         │     │
                  │           │ GND     │   C5 (22uF)
                  │           └─────────┘     │
                 GND                         GND

Componentes:
- U2: AMS1117-3.3 (regulador LDO, Imax=1A)
- C4: 10uF entrada
- C5: 22uF salida (estabilidad)
- D1: Diodo Schottky 1N5819 (protección inversa, opcional)
```

### 1.4 Interruptor de Encendido

```
BAT+ ────┬──── SW1 ────┬──── VIN (a regulador)
         │             │
        LED1       R4 (330Ω)
      (Power)          │
         │            GND
        GND

- SW1: Interruptor SPST (slide switch)
- LED1: LED indicador de encendido (opcional)
```

---

## 2. MICROCONTROLADOR ESP32

### 2.1 Conexiones Principales

```
                        ┌────────────────────┐
                        │    ESP32-WROOM     │
                        │                    │
    VCC (3.3V) ─────────┤ 3V3 (Pines 2,19)   │
    GND ────────────────┤ GND (Pines 1,15,38)│
                        │                    │
    ──── C6 (100nF) ────┤ EN                 │──── R5 (10kΩ) ──── VCC
    ──── C7 (10uF) ─────┤                    │
                        │                    │
    BOOT Button ────────┤ GPIO0              │──── R6 (10kΩ) ──── VCC
                        │                    │
    ──── R7 (330Ω) ─────┤ GPIO2   (LED)      │──── LED2 ──── GND
                        │                    │
                        └────────────────────┘

Componentes:
- C6, C7: Condensadores de desacople
- R5: Pull-up EN (enable)
- R6: Pull-up GPIO0 (boot mode)
- R7, LED2: LED indicador de estado (opcional)
```

### 2.2 Pines de Programación

```
                        ┌────────────────────┐
    USB-Serial (J2)     │    ESP32           │
                        │                    │
    TXD ────────────────┤ GPIO3 (RXD0)       │
    RXD ────────────────┤ GPIO1 (TXD0)       │
    DTR ────────────────┤ EN (via C8)        │
    RTS ────────────────┤ GPIO0 (via C9)     │
    GND ────────────────┤ GND                │
    VCC ────────────────┤ 3V3 (opcional)     │
                        └────────────────────┘

- C8, C9: 100nF (auto-reset durante programación)
- Programador: CP2102, CH340G, o similar
```

---

## 3. SCANNER DE CÓDIGOS DE BARRAS (GM67)

### 3.1 Conexión UART

```
                        ┌────────────────────┐
    GM67 Scanner (J3)   │    ESP32           │
                        │                    │
    VCC (5V) ───────────┤ [5V desde VBAT]    │
    GND ────────────────┤ GND                │
    TX ─────────────────┤ GPIO16 (RXD2)      │
    RX ─────────────────┤ GPIO17 (TXD2)      │
    TRIG (opcional) ────┤ GPIO23 (output)    │
                        └────────────────────┘

Notas:
- GM67 funciona con 5V (consumo 150mA en escaneo)
- Usar level shifter si los pines TX/RX no son 5V tolerantes
- Configuración: 9600 baud, 8N1
- TRIG: Pin opcional para activar escaneo (LOW activo)
```

### 3.2 Level Shifter (si necesario)

```
        3.3V                              5V
         │                                │
    ┌────┴────┐                      ┌────┴────┐
    │         │  BSS138              │         │
ESP │ GPIO16  ├──────┤├──────────────┤ TX GM67 │
    │         │     MOSFET           │         │
    │         │                      │         │
    │ GPIO17  ├──────┤├──────────────┤ RX GM67 │
    │         │     MOSFET           │         │
    └─────────┘                      └─────────┘

Alternativa: Usar módulo level shifter 4-channel
```

---

## 4. PANTALLA OLED (SSD1306)

### 4.1 Conexión I2C

```
                        ┌────────────────────┐
    OLED 1.3" (J4)      │    ESP32           │
                        │                    │
    VCC ────────────────┤ 3V3                │
    GND ────────────────┤ GND                │
    SCL ────────────────┤ GPIO22 (SCL)       │
    SDA ────────────────┤ GPIO21 (SDA)       │
                        └────────────────────┘

Componentes adicionales:
- R8, R9: 4.7kΩ pull-up en SDA y SCL (generalmente integrados)
- Dirección I2C: 0x3C o 0x3D (verificar con escáner I2C)
```

---

## 5. INTERFAZ DE USUARIO

### 5.1 Botones

```
                        ┌────────────────────┐
                        │    ESP32           │
                        │                    │
    SW2 (SCAN) ─────────┤ GPIO25             │──── R10 (10kΩ) ──── VCC
    SW3 (OK) ───────────┤ GPIO26             │──── R11 (10kΩ) ──── VCC
    SW4 (CANCEL) ───────┤ GPIO27             │──── R12 (10kΩ) ──── VCC
    SW5 (MENU) ─────────┤ GPIO32             │──── R13 (10kΩ) ──── VCC
                        │                    │
                        └────────────────────┘
            │               │               │               │
           GND             GND             GND             GND

Configuración:
- Pull-up interno o externo (10kΩ)
- Botón presionado = LOW (0V)
- Debouncing por software (50ms)
```

### 5.2 Buzzer Piezo

```
                        ┌────────────────────┐
                        │    ESP32           │
                        │                    │
                   ┌────┤ GPIO33             │
                   │    │                    │
              ┌────┴────┐                    │
              │ 2N2222  │                    │
    VCC ──────┤ C       │                    │
              │         │                    │
    Buzzer+ ──┤ E       │                    │
              └─────────┘                    │
                   │                         │
    Buzzer- ───────┴─────────────────────────┤ GND
                                             └────────────────────┘

Componentes:
- Q1: Transistor NPN 2N2222 o BC547
- R14: 1kΩ resistencia base
- Buzzer: Piezo 5V pasivo (genera tono por PWM)
```

### 5.3 Motor de Vibración

```
                        ┌────────────────────┐
                        │    ESP32           │
                        │                    │
                   ┌────┤ GPIO14             │
                   │    │                    │
              ┌────┴────┐                    │
              │ 2N2222  │                    │
    VCC ──┬───┤ C       │                    │
          │   │         │                    │
    Motor ┴───┤ E       │                    │
    Vibr  │   └─────────┘                    │
          │        │                         │
         D2    R15 (1kΩ)                     │
    (1N4148)    │                            │
          │        │                         │
    GND ──┴────────┴─────────────────────────┤ GND
                                             └────────────────────┘

Componentes:
- Q2: Transistor NPN 2N2222
- D2: Diodo 1N4148 (protección flyback)
- R15: 1kΩ resistencia base
- Motor: Coin vibration motor 3V
```

### 5.4 LEDs Indicadores

```
                        ┌────────────────────┐
                        │    ESP32           │
                        │                    │
    R16 (330Ω) ─────────┤ GPIO12 (LED RGB R) │──── LED3 (R) ──── GND
    R17 (330Ω) ─────────┤ GPIO13 (LED RGB G) │──── LED3 (G) ──── GND
    R18 (330Ω) ─────────┤ GPIO15 (LED RGB B) │──── LED3 (B) ──── GND
                        │                    │
    R19 (330Ω) ─────────┤ GPIO4  (Batería)   │──── LED4 ──── GND
                        └────────────────────┘

Indicadores:
- LED3: RGB común cátodo (estado general)
- LED4: Rojo (batería baja)
```

---

## 6. MEDICIÓN DE BATERÍA

```
                                    ┌────────────────────┐
    VBAT ────┬─── R20 (100kΩ) ─────┤ GPIO35 (ADC1_CH7)  │
             │                      │    ESP32           │
        R21 (100kΩ)                 │                    │
             │                      └────────────────────┘
            GND

Divisor de voltaje:
- Entrada ADC: VBAT * (R21 / (R20 + R21)) = VBAT * 0.5
- VBAT max: 4.2V → ADC: 2.1V
- VBAT min: 3.0V → ADC: 1.5V
- Resolución ESP32: 12 bits (0-4095)
```

---

## 7. PINES UTILIZADOS - RESUMEN

| GPIO | Función | Tipo | Notas |
|------|---------|------|-------|
| 0 | BOOT | Input | Pull-up, programación |
| 1 | TXD0 | Output | UART debug |
| 2 | LED Status | Output | LED indicador |
| 3 | RXD0 | Input | UART debug |
| 4 | LED Battery | Output | Indicador batería |
| 12 | LED RGB R | Output | PWM |
| 13 | LED RGB G | Output | PWM |
| 14 | Vibrator | Output | PWM |
| 15 | LED RGB B | Output | PWM |
| 16 | RXD2 | Input | UART Scanner RX |
| 17 | TXD2 | Output | UART Scanner TX |
| 21 | SDA | I2C | OLED |
| 22 | SCL | I2C | OLED |
| 23 | TRIG Scanner | Output | Opcional |
| 25 | Button SCAN | Input | Pull-up |
| 26 | Button OK | Input | Pull-up |
| 27 | Button CANCEL | Input | Pull-up |
| 32 | Button MENU | Input | Pull-up |
| 33 | Buzzer | Output | PWM |
| 35 | ADC Battery | Input | ADC |

---

## 8. CONSUMO DE CORRIENTE POR MODO

### Modo Activo (Escaneando)
```
ESP32 (BLE activo):      80-100 mA
Scanner GM67:            150 mA
OLED encendido:          20 mA
Vibración (pulsos):      50 mA promedio
──────────────────────────────────
TOTAL:                   300-320 mA
Autonomía (3000mAh):     ~9-10 horas
```

### Modo Standby (Esperando escaneo)
```
ESP32 (light sleep):     20-30 mA
Scanner standby:         30 mA
OLED encendido:          20 mA
──────────────────────────────────
TOTAL:                   70-80 mA
Autonomía (3000mAh):     ~37-42 horas
```

### Modo Deep Sleep
```
ESP32 (deep sleep):      0.15 mA
Scanner apagado:         0 mA
OLED apagado:            0 mA
──────────────────────────────────
TOTAL:                   ~0.15 mA
Autonomía (3000mAh):     ~20,000 horas (833 días)
```

---

## 9. CONSIDERACIONES DE DISEÑO PCB

### Layout Recomendado
```
┌────────────────────────────────────┐
│  [USB-C]    [Power LED]   [ON/OFF] │  ← Top edge
│                                    │
│  ┌──────────┐         ┌─────────┐  │
│  │ TP4056   │         │ ESP32   │  │
│  │ Charger  │         │ Module  │  │
│  └──────────┘         └─────────┘  │
│                                    │
│  ┌──────────┐         ┌─────────┐  │
│  │ Battery  │         │  OLED   │  │
│  │ 3000mAh  │         │ Display │  │
│  └──────────┘         └─────────┘  │
│                                    │
│  [BTN1] [BTN2] [BTN3] [BTN4]       │
│                                    │
│  ┌──────────────────────────────┐  │
│  │     GM67 Scanner Module      │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘

Dimensiones aproximadas: 80-100mm x 140-160mm
```

### Capas PCB
- **Layer 1 (Top)**: Componentes, pistas señal
- **Layer 2 (Bottom)**: GND plane, pistas power

### Ground Plane
- Plano de tierra continuo en capa inferior
- Vias de conexión cada 10-15mm
- Separar zona analógica (ADC) de digital

### Trazas Críticas
- **Power (VCC, VBAT)**: 0.5-0.8mm ancho
- **Ground**: Plano completo
- **I2C (SDA, SCL)**: 0.3mm, mantener cortas (<10cm)
- **UART Scanner**: 0.3mm, evitar cruces con RF
- **Antena ESP32**: Mantener área libre 5mm alrededor

### Condensadores de Desacople
- Colocar cerca de cada IC (ESP32, regulador)
- 100nF cerámicos + 10-22uF electrolíticos
- Minimizar longitud de pistas

---

## 10. ARCHIVOS DE DISEÑO

Para implementar este esquemático en KiCad:

1. **Librerías necesarias**:
   - ESP32-WROOM-32E (oficial Espressif)
   - SSD1306 OLED
   - TP4056
   - Componentes estándar (resistencias, capacitores, transistores)

2. **Netlist** (ver archivo separado: `barcode_terminal.net`)

3. **Footprints**:
   - ESP32-WROOM-32E: SMD Module
   - GM67: Conector 5-pin
   - OLED: Módulo 4-pin
   - USB-C: Conector 16-pin SMD

4. **BOM para KiCad** (ver archivo: `barcode_terminal_bom.csv`)

---

## Notas Finales

- **Todos los componentes son through-hole o módulos** para facilitar ensamblaje manual
- **Alternativa SMD**: Reducir tamaño PCB en 30-40% usando componentes SMD 0805
- **Protecciones**: Incluir fusible resettable (PTC) en línea VBAT opcional
- **EMI**: Considerar ferrites en líneas power si hay interferencia
- **Certificación**: Para producción, considerar CE/FCC (layout especial de antena)
