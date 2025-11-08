# Terminal Portátil para Mensajería

## 📦 Descripción del Proyecto

Terminal portátil profesional para empresas de mensajería que permite leer códigos de barras (1D y 2D) de paquetes y sincronizar automáticamente el estado de entregas vía Bluetooth Low Energy (BLE) con un smartphone Android.

### Características Principales

✅ **Lectura Universal**
- Códigos 1D: EAN, Code 128, Code 39, UPC, etc.
- Códigos 2D: QR, DataMatrix, PDF417

✅ **Conectividad**
- Bluetooth Low Energy 5.0
- Alcance: 10+ metros
- Sincronización automática con app Android

✅ **Autonomía**
- Batería LiPo 3000mAh
- 10+ horas de uso continuo
- Carga via USB-C

✅ **Interfaz de Usuario**
- Pantalla OLED 1.3" (128x64)
- 4 botones físicos
- Feedback táctil (vibración)
- Feedback sonoro (buzzer)
- LEDs indicadores

✅ **Portabilidad**
- Tamaño: ~150x80x30mm
- Peso: <200g
- Diseño ergonómico para uso con una mano

---

## 📚 Documentación Completa

Este repositorio contiene toda la documentación necesaria para construir el terminal desde cero:

### 1. [Especificación Técnica](01_ESPECIFICACION_TECNICA.md)
- Requisitos funcionales completos
- Especificaciones de hardware
- Consumo energético
- Condiciones operativas
- Fases de desarrollo

### 2. [BOM y Costos](02_BOM_COSTOS.md)
- Lista completa de componentes (Bill of Materials)
- Costos detallados por fase
- Proveedores recomendados
- Estimaciones de presupuesto desde prototipo hasta producción
- **Resumen de costos:**
  - Prototipo breadboard: €150-250
  - 5 PCBs: €400-600
  - 10 unidades pre-producción: €700-950
  - 100 unidades producción: €6,000-8,000

### 3. [Esquemático Electrónico](03_ESQUEMATICO.md)
- Diagrama de bloques completo
- Circuitos detallados de cada subsistema
- Conexiones pin-por-pin
- Recomendaciones de layout PCB
- Consideraciones de diseño

### 4. [Protocolo BLE](04_PROTOCOLO_BLE.md)
- Especificación completa del protocolo de comunicación
- UUIDs de servicios y características
- Formato de mensajes JSON
- Ejemplos de implementación en Android (Kotlin)
- Casos de uso y flujos de trabajo
- Seguridad y encriptación

### 5. [Guía de Ensamblaje](05_GUIA_ENSAMBLAJE.md)
- Paso a paso para construir el prototipo breadboard
- Instrucciones de soldadura y ensamblaje PCB
- Diseño e impresión 3D de carcasa
- Troubleshooting de problemas comunes
- Mantenimiento

### 6. [Roadmap de Desarrollo](06_ROADMAP.md)
- Plan completo de 6 meses de desarrollo
- Hitos y entregables por fase
- Estimación de horas de trabajo (~600h)
- Gestión de riesgos
- Métricas de éxito

---

## 🛠️ Tecnologías Utilizadas

### Hardware
- **Microcontrolador:** ESP32-WROOM-32E (Dual-core 240MHz, BLE 5.0)
- **Scanner:** GM67 2D Barcode Reader (1D/2D)
- **Display:** OLED SSD1306 1.3" (128x64)
- **Batería:** LiPo 3.7V 3000mAh
- **Gestión energía:** TP4056 + AMS1117-3.3

### Software
- **Firmware:** C/C++ (Arduino Framework)
- **App móvil:** Android (Kotlin/Java)
- **Comunicación:** BLE Nordic UART Service
- **Formato datos:** JSON

### Herramientas
- **IDE:** Arduino IDE / PlatformIO
- **PCB Design:** KiCad 7+
- **CAD 3D:** Fusion 360 / FreeCAD
- **3D Printing:** PLA/PETG

---

## 🚀 Quick Start

### Opción 1: Solo quiero ver cómo funciona (2 horas)

1. Comprar kit básico (~€50):
   - ESP32 DevKit
   - GM67 Scanner
   - OLED SSD1306
   - Breadboard y cables

2. Conectar según [Guía de Ensamblaje - Sección 2](05_GUIA_ENSAMBLAJE.md#2-prototipo-en-breadboard-fase-1)

3. Cargar firmware desde `/firmware/barcode_terminal.ino`

4. Probar con app "nRF Connect" en smartphone

### Opción 2: Quiero hacer el prototipo completo (2-4 semanas)

1. Seguir [Fase 0 y Fase 1 del Roadmap](06_ROADMAP.md)
2. Comprar todos los componentes de [BOM Fase 1](02_BOM_COSTOS.md) (~€200)
3. Ensamblar prototipo breadboard
4. Desarrollar firmware completo
5. Crear app Android básica

### Opción 3: Quiero fabricar PCB y carcasa (2-3 meses)

1. Completar Opción 2
2. Diseñar PCB en KiCad siguiendo [Esquemático](03_ESQUEMATICO.md)
3. Fabricar PCBs en JLCPCB/PCBWay
4. Diseñar carcasa en CAD
5. Imprimir en 3D o inyectar
6. Ensamblar unidades finales

### Opción 4: Producción comercial (5-7 meses)

1. Seguir [Roadmap completo](06_ROADMAP.md)
2. Presupuesto: €5,000-15,000
3. Resultado: 50-100 unidades listas para venta

---

## 📂 Estructura del Repositorio

```
barcode-terminal/
├── README.md                          # Este archivo
├── 01_ESPECIFICACION_TECNICA.md       # Specs completas
├── 02_BOM_COSTOS.md                   # Lista de componentes y costos
├── 03_ESQUEMATICO.md                  # Diagramas electrónicos
├── 04_PROTOCOLO_BLE.md                # Protocolo de comunicación
├── 05_GUIA_ENSAMBLAJE.md              # Instrucciones paso a paso
├── 06_ROADMAP.md                      # Plan de desarrollo
│
├── firmware/
│   ├── barcode_terminal.ino           # Firmware ESP32 completo
│   └── platformio.ini                 # Configuración PlatformIO
│
├── hardware/
│   ├── kicad/                         # Proyecto KiCad (futuro)
│   │   ├── barcode_terminal.kicad_pro
│   │   ├── barcode_terminal.kicad_sch
│   │   └── barcode_terminal.kicad_pcb
│   └── cad/                           # Modelos 3D carcasa (futuro)
│       └── enclosure.step
│
└── software/
    └── android/                       # App Android (futuro)
        └── BarcodeTerminalApp/
```

---

## 💰 Estimación de Costos

### Prototipo DIY (Para aprender)
```
Componentes:           €150-200
Herramientas:          €80-150
Total:                 €230-350
Tiempo:                40-80 horas (2-4 semanas part-time)
```

### Lote Pre-producción (10 unidades)
```
Componentes:           €420-470
PCBs (10):             €110-180
Carcasas 3D:           €80-120
Ensamblaje:            €100-180
Total:                 €710-950
Costo unitario:        €71-95/unidad
```

### Producción (100 unidades)
```
Componentes:           €4,200-4,700
PCBs:                  €170-280
Carcasas:              €800-1,200
Ensamblaje:            €1,000-1,800
Total:                 €6,170-7,980
Costo unitario:        €62-80/unidad
```

---

## 🎯 Casos de Uso

### 1. Empresa de Mensajería / Courier
- Repartidor escanea paquetes al recoger y entregar
- Sincronización automática con base de datos central
- Trazabilidad en tiempo real
- Confirmación de entregas

### 2. Gestión de Almacenes
- Control de inventario
- Entrada/salida de mercancía
- Localización de productos

### 3. Eventos y Ticketing
- Validación de entradas (códigos QR)
- Control de accesos
- Registro de asistencia

### 4. Logística Interna
- Trazabilidad de componentes
- Control de producción
- Gestión de activos

---

## 🔧 Requisitos del Sistema

### Para Desarrollo
- **OS:** Windows 10+, macOS 10.15+, Ubuntu 20.04+
- **RAM:** 4GB mínimo, 8GB recomendado
- **Disco:** 2GB espacio libre
- **Herramientas:** Arduino IDE 2.0+ o PlatformIO
- **Driver:** CP2102/CH340 USB-Serial

### Para App Android
- **OS:** Android 5.0+ (API 21+)
- **Bluetooth:** BLE 4.0+
- **Permisos:** Location, Bluetooth, Storage
- **RAM:** 2GB+

---

## 📊 Especificaciones Técnicas Resumidas

| Característica | Especificación |
|----------------|----------------|
| Procesador | ESP32 Dual-core @ 240MHz |
| Memoria | 4MB Flash, 520KB RAM |
| Conectividad | BLE 5.0, WiFi 802.11 b/g/n |
| Scanner | 1D/2D, 5-30cm rango |
| Display | OLED 1.3" 128x64 monocromo |
| Batería | LiPo 3.7V 3000mAh |
| Autonomía | 10-15 horas uso típico |
| Carga | USB-C 5V/1A, ~3-4 horas |
| Dimensiones | 150x80x30 mm (aprox) |
| Peso | <200g con batería |
| Temperatura | 0°C a 50°C |
| Certificaciones | Recomendado: CE, FCC (producción) |

---

## 🧩 Componentes Clave

### Microcontrolador: ESP32-WROOM-32E
- Procesador dual-core Xtensa LX6
- Bluetooth 5.0 BLE + WiFi
- Bajo consumo con deep sleep (<1mA)
- GPIO abundantes (34 pines)
- ADC, PWM, I2C, UART, SPI

### Scanner: GM67
- Lee códigos 1D y 2D
- Interface UART (9600 baud)
- Consumo: 150mA en escaneo
- Trigger automático o manual
- LED rojo de iluminación

### Display: SSD1306 OLED
- 1.3 pulgadas, 128x64 píxeles
- Interface I2C (2 cables)
- Alto contraste, visible luz solar
- Bajo consumo (~20mA)

---

## 🏆 Ventajas Competitivas

### vs. Terminales Comerciales (€200-500)

✅ **Costo:** 70-80% más económico
✅ **Personalizable:** 100% código abierto
✅ **Moderno:** BLE en vez de Bluetooth clásico
✅ **Actualizable:** OTA firmware updates
✅ **Compacto:** Más ligero que mayoría

### vs. Usar solo smartphone

✅ **Dedicado:** No ocupa el teléfono personal
✅ **Batería:** No drena batería del móvil
✅ **Ergonómico:** Diseñado para escaneo continuo
✅ **Robusto:** Resistente a caídas y uso rudo
✅ **Rápido:** Scanner dedicado > cámara

---

## 🚧 Limitaciones Actuales

❌ **No resistente al agua** (IP rating: ninguno)
   - Mejora futura: Carcasa IP65

❌ **No incluye GPS**
   - Mejora futura: Módulo GPS opcional

❌ **Solo BLE** (no WiFi implementado)
   - El hardware lo soporta, falta software

❌ **Sin cámara** (no puede tomar fotos de paquetes)
   - Requeriría rediseño significativo

❌ **Pantalla monocromo** (sin color)
   - Suficiente para el caso de uso

---

## 🛣️ Roadmap Futuro (Post v1.0)

### v1.1 (Hardware)
- [ ] Añadir módulo GPS
- [ ] Mejora de batería (4000mAh)
- [ ] Carcasa resistente al agua (IP65)
- [ ] NFC reader adicional

### v1.2 (Software)
- [ ] OTA updates via BLE
- [ ] WiFi sync como backup
- [ ] Multiple paired devices
- [ ] Offline queueing (cientos de códigos)

### v2.0 (Avanzado)
- [ ] Cámara para fotos de paquetes
- [ ] Pantalla táctil color
- [ ] Lector de huella dactilar
- [ ] 4G/LTE opcional

---

## 🤝 Contribuciones

Este proyecto está diseñado como una base educativa y de código abierto.

**Áreas donde puedes contribuir:**
- Mejoras de firmware (optimización, features)
- App Android completa
- Diseño PCB optimizado
- Modelos 3D de carcasas
- Documentación y tutoriales
- Traducciones
- Testing y reporte de bugs

---

## 📖 Recursos de Aprendizaje

### Tutoriales Recomendados
1. **ESP32 Basics**
   - https://randomnerdtutorials.com/esp32-tutorials/
   - https://docs.espressif.com/projects/esp-idf/

2. **Bluetooth Low Energy**
   - https://learn.adafruit.com/introduction-to-bluetooth-low-energy
   - Nordic Semiconductor Developer Academy

3. **PCB Design**
   - https://www.youtube.com/c/PhilsLab (excelentes tutoriales)
   - KiCad documentation

4. **Arduino + ESP32**
   - https://www.arduino.cc/reference/en/
   - ESP32 Arduino Core docs

### Libros Sugeridos
- "Make: Bluetooth" by Alasdair Allan
- "Designing Embedded Systems with 32-Bit PIC Microcontrollers and MikroC"
- "The Hardware Hacker" by Andrew "bunnie" Huang

---

## 📄 Licencia

Este proyecto está documentado con propósitos educativos y de desarrollo personal.

**Firmware y Software:** MIT License (código abierto)
**Documentación:** Creative Commons BY-SA 4.0
**Hardware:** CERN Open Hardware License v2

Puedes:
- ✅ Usar para proyectos personales
- ✅ Modificar y mejorar
- ✅ Uso comercial (con atribución)
- ✅ Compartir y distribuir

---

## ❓ FAQ

### ¿Necesito experiencia previa en electrónica?
**No es esencial**, pero ayuda. El proyecto está diseñado con componentes modulares para facilitar el aprendizaje. Si nunca has hecho nada de electrónica, calcula 2-3 semanas de aprendizaje básico antes de empezar.

### ¿Cuánto cuesta hacer un prototipo?
**€150-250** para el primer prototipo en breadboard. Ver [BOM y Costos](02_BOM_COSTOS.md) para detalles.

### ¿Cuánto tiempo me tomará?
- **Prototipo breadboard:** 2-4 semanas (part-time)
- **PCB custom:** +6-8 semanas
- **Producto completo:** 5-7 meses

### ¿Puedo venderlo comercialmente?
**Sí**, el diseño es open source. Considera:
- Certificaciones (CE, FCC) si vendes en EU/US
- Soporte y garantía al cliente
- Inversión en moldes de inyección para escala

### ¿Funciona con iOS (iPhone)?
**BLE es compatible con iOS**, pero necesitarías desarrollar una app nativa en Swift/SwiftUI. El protocolo BLE es el mismo.

### ¿Qué alcance tiene el Bluetooth?
**10-15 metros** en espacio abierto. En interiores con obstáculos: 5-8 metros.

### ¿Funciona sin conexión a internet?
**Sí completamente**. Solo necesita BLE para conectar con el smartphone. La app puede funcionar offline y sincronizar después con backend.

---

## 📞 Soporte

### ¿Tienes preguntas o problemas?

1. **Revisa la documentación** (especialmente [Troubleshooting](05_GUIA_ENSAMBLAJE.md#6-troubleshooting))
2. **Busca en issues** del repositorio
3. **Abre un nuevo issue** con:
   - Descripción del problema
   - Fotos del setup
   - Logs del monitor serial
   - Qué has intentado ya

### Comunidades útiles
- r/esp32
- r/arduino
- ESP32.com forums
- KiCad forums

---

## 🙏 Agradecimientos

Este proyecto se basa en el trabajo de la comunidad open-source:

- **Espressif** (ESP32)
- **Adafruit** (librerías display)
- **Arduino** (framework)
- **KiCad** (herramientas PCB)
- **Nordic Semiconductor** (especificación BLE UART)

---

## 📝 Changelog

### v1.0.0 (2025-01-08)
- ✅ Documentación completa inicial
- ✅ Especificación técnica
- ✅ BOM y costos detallados
- ✅ Esquemático electrónico
- ✅ Protocolo BLE definido
- ✅ Firmware base ESP32
- ✅ Guía de ensamblaje
- ✅ Roadmap de desarrollo

### Próximo (TBD)
- ⬜ Diseño PCB KiCad
- ⬜ Modelo 3D carcasa
- ⬜ App Android básica
- ⬜ Testing en campo

---

## 🎉 ¡Comienza Ahora!

**Siguiente paso:** Lee la [Guía de Ensamblaje - Fase 0](05_GUIA_ENSAMBLAJE.md#fase-0-preparación-semana-1-2) y haz tu primer pedido de componentes.

**¿Listo para construir tu propio terminal?** 🚀

---

*Última actualización: 2025-01-08*
*Versión documentación: 1.0.0*
