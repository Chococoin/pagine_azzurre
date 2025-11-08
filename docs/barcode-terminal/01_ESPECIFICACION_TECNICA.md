# Terminal Portátil para Mensajería - Especificación Técnica

## 1. Descripción General

Terminal portátil de mano para lectura de códigos de barras 1D/2D con conectividad Bluetooth Low Energy para sincronización con smartphone Android.

## 2. Requisitos Funcionales

### 2.1 Lectura de Códigos
- **Tipos soportados**: Códigos 1D (EAN, Code 128, Code 39, UPC, etc.) y 2D (QR, DataMatrix, PDF417)
- **Método de lectura**: Módulo scanner 2D integrado
- **Distancia de lectura**: 5-30 cm
- **Velocidad de escaneo**: <500ms por código

### 2.2 Comunicación
- **Protocolo**: Bluetooth Low Energy (BLE) 5.0
- **Alcance**: Mínimo 10 metros en espacio abierto
- **Datos transmitidos**:
  - Código escaneado
  - Timestamp
  - Estado de batería
  - ID del terminal

### 2.3 Interfaz de Usuario
- **Pantalla**: OLED 1.3" (128x64 px) para confirmación visual
- **Botones**:
  - Power ON/OFF
  - Scan manual (trigger)
  - Confirmación/OK
  - Cancelar
- **Feedback táctil**: Motor de vibración
- **Feedback audio**: Buzzer piezo para beep de confirmación

### 2.4 Alimentación
- **Tipo**: Batería LiPo recargable
- **Autonomía**: 10 horas de uso continuo
- **Carga**: USB-C con circuito de gestión integrado
- **Indicador**: LED de estado de batería

## 3. Especificaciones Técnicas

### 3.1 Microcontrolador
- **Modelo**: ESP32-WROOM-32E
- **Características**:
  - Dual-core 240 MHz
  - 4 MB Flash
  - Bluetooth 5.0 BLE
  - WiFi (para futuras expansiones)
  - Bajo consumo energético

### 3.2 Scanner de Códigos
- **Módulo**: GM67 2D Barcode Scanner
- **Alternativa**: DE2120 o similar
- **Interfaz**: UART/Serial
- **Consumo**: ~150mA durante escaneo

### 3.3 Pantalla
- **Tipo**: OLED SSD1306
- **Tamaño**: 1.3 pulgadas
- **Resolución**: 128x64 píxeles
- **Interfaz**: I2C
- **Consumo**: ~20mA

### 3.4 Batería
- **Tipo**: LiPo 3.7V
- **Capacidad**: 2500-3000 mAh
- **Formato**: 18650 o pouch cell
- **Protección**: BMS integrado

### 3.5 Gestión de Energía
- **Regulador**: 3.3V LDO (AMS1117-3.3)
- **Carga**: TP4056 con protección
- **Entrada**: USB-C (5V)

## 4. Consumo Energético Estimado

| Componente | Corriente (mA) | Modo |
|------------|----------------|------|
| ESP32 (activo) | 80-160 | BLE activo |
| ESP32 (sleep) | 0.15 | Deep sleep |
| Scanner GM67 | 150 | Escaneando |
| Scanner GM67 | 30 | Standby |
| OLED | 20 | Encendido |
| Vibración | 100 | Activo (pulsos) |
| Buzzer | 10 | Activo (pulsos) |

**Consumo promedio estimado**: ~200mA
**Autonomía con batería 2500mAh**: ~12.5 horas
**Autonomía con batería 3000mAh**: ~15 horas

## 5. Dimensiones Físicas (Estimado)

- **Ancho**: 80-90 mm
- **Largo**: 150-180 mm
- **Grosor**: 25-35 mm
- **Peso**: 150-200 gramos

## 6. Condiciones Operativas

- **Temperatura**: 0°C a 50°C
- **Humedad**: 20% a 80% (sin condensación)
- **Caídas**: Resistente a caídas de 1.2m (con carcasa)

## 7. Software

### 7.1 Firmware (ESP32)
- **Lenguaje**: C/C++ (Arduino Framework o ESP-IDF)
- **Librerías principales**:
  - BLE (ESP32 BLE Library)
  - OLED (Adafruit SSD1306)
  - Gestión de energía

### 7.2 App Android
- **Framework sugerido**: Flutter o React Native
- **Base de datos local**: SQLite
- **Sincronización**: Firebase o backend custom

## 8. Características de Seguridad

- **Pareamiento BLE**: PIN o passkey
- **Encriptación**: BLE secure pairing
- **Timeout**: Auto-apagado después de inactividad
- **Protección batería**: Sobre-carga, sobre-descarga, corto-circuito

## 9. Fases de Desarrollo

### Fase 1: Prototipo funcional (breadboard)
- Validar componentes principales
- Desarrollar firmware básico
- Pruebas de comunicación BLE

### Fase 2: Prototipo PCB v1.0
- Diseño de PCB
- Fabricación y ensamblaje
- Testing y debugging

### Fase 3: Diseño industrial
- Carcasa ergonómica 3D
- Optimización de PCB
- Certificaciones (FCC, CE si necesario)

### Fase 4: Pre-producción
- PCB v2.0 optimizado
- Validación de manufactura
- App móvil completa

## 10. Tiempo Estimado de Desarrollo

- **Fase 1 (Prototipo)**: 3-4 semanas
- **Fase 2 (PCB v1)**: 6-8 semanas
- **Fase 3 (Diseño industrial)**: 8-12 semanas
- **Fase 4 (Pre-producción)**: 4-6 semanas

**Total**: 5-7 meses desde inicio hasta unidad pre-producción
