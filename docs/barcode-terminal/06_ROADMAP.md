# Roadmap de Desarrollo - Terminal de Mensajería

## Resumen Ejecutivo

Este roadmap detalla el plan de desarrollo completo del terminal portátil de mensajería, desde el prototipo inicial hasta el producto final en producción.

**Tiempo total estimado:** 5-7 meses
**Presupuesto total estimado:** €3,000-10,000 (depende del alcance)

---

## Fase 0: Preparación (Semana 1-2)

### Objetivos
- Adquirir conocimientos básicos
- Comprar componentes y herramientas
- Configurar entorno de desarrollo

### Tareas

#### 1. Aprendizaje Básico
- [ ] Tutorial Arduino básico (2-3 días)
  - Blink LED
  - Lectura de botones
  - Serial communication
- [ ] Tutorial ESP32 (2-3 días)
  - WiFi básico
  - BLE basics
  - Deep sleep modes
- [ ] Tutorial soldadura (1 día)
  - Video tutoriales
  - Práctica en PCBs viejos

**Recursos:**
- https://www.arduino.cc/en/Tutorial/HomePage
- https://randomnerdtutorials.com/esp32-tutorials/
- https://learn.adafruit.com/adafruit-guide-excellent-soldering

#### 2. Compra de Componentes
- [ ] Componentes de BOM Fase 1 (ver `02_BOM_COSTOS.md`)
- [ ] Herramientas básicas
- [ ] Material de prueba (LEDs, resistencias extra, etc.)

**Presupuesto:** €150-250

#### 3. Setup de Desarrollo
- [ ] Instalar Arduino IDE o PlatformIO
- [ ] Instalar drivers USB-Serial (CP2102/CH340)
- [ ] Configurar entorno ESP32
- [ ] Clonar repositorio firmware
- [ ] Compilar ejemplo "Blink"

**Tiempo:** 2-3 horas

---

## Fase 1: Prototipo en Breadboard (Semana 3-4)

### Objetivos
- Validar todos los componentes funcionan
- Desarrollar firmware básico
- Probar comunicación BLE end-to-end

### Semana 3: Hardware

#### Día 1-2: Alimentación y ESP32
- [ ] Conectar regulador de voltaje
- [ ] Verificar 3.3V estable
- [ ] Conectar ESP32
- [ ] Cargar sketch de prueba
- [ ] Verificar salida serial

#### Día 3: Display OLED
- [ ] Conectar OLED via I2C
- [ ] Escanear dirección I2C
- [ ] Cargar ejemplo Adafruit
- [ ] Mostrar texto personalizado
- [ ] Test de refresh rate

#### Día 4: Scanner
- [ ] Conectar GM67 via UART
- [ ] Configurar baudrate
- [ ] Leer códigos 1D (EAN, Code128)
- [ ] Leer códigos 2D (QR)
- [ ] Test de distancia de lectura

#### Día 5-7: Periféricos
- [ ] Conectar botones con pull-ups
- [ ] Test debouncing
- [ ] Conectar buzzer con transistor
- [ ] Test tonos PWM
- [ ] Conectar vibrador
- [ ] Integrar LEDs

**Entregable:** Prototipo breadboard funcional
**Presupuesto:** €0 (ya comprado en Fase 0)

### Semana 4: Software

#### Día 1-2: Firmware Base
- [ ] Estructura de código modular
- [ ] State machine básica
- [ ] Funciones de display
- [ ] Handler de botones
- [ ] Debug logging

#### Día 3-4: BLE
- [ ] Implementar Nordic UART Service
- [ ] Test advertising
- [ ] Conexión desde smartphone
- [ ] Envío de datos (TX)
- [ ] Recepción de comandos (RX)

#### Día 5: Integración
- [ ] Flujo completo: scan → BLE → confirmación
- [ ] Gestión de batería (ADC)
- [ ] Power management básico
- [ ] Testing de estabilidad

#### Día 6-7: Testing y Debugging
- [ ] Tests de stress (100+ escaneos)
- [ ] Test de autonomía (medición corriente)
- [ ] Corrección de bugs
- [ ] Documentación de problemas encontrados

**Entregable:** Firmware v0.1 funcional
**Horas de desarrollo:** 40-60h

---

## Fase 2: Diseño PCB y Fabricación (Semana 5-10)

### Objetivos
- Diseñar PCB profesional
- Fabricar 5 prototipos
- Ensamblar y testear

### Semana 5-6: Diseño PCB

#### KiCad Schematic
- [ ] Crear proyecto KiCad
- [ ] Dibujar esquemático completo
- [ ] Asignar footprints
- [ ] Electrical Rules Check (ERC)
- [ ] Generar netlist

**Tiempo:** 10-15 horas

#### KiCad PCB Layout
- [ ] Definir dimensiones PCB (90x150mm aprox)
- [ ] Colocar componentes principales
- [ ] Rutear power traces (VCC, GND, VBAT)
- [ ] Rutear señales (I2C, UART, GPIO)
- [ ] Plano de tierra continuo
- [ ] Keepout areas (antena)
- [ ] Design Rules Check (DRC)
- [ ] Revisar clearances
- [ ] 3D View check

**Tiempo:** 20-30 horas

#### Generación de Archivos
- [ ] Generar Gerbers
- [ ] Generar drill files
- [ ] Generar BOM
- [ ] Generar pick-and-place (si PCBA)
- [ ] Verificar con Gerber viewer online

**Tiempo:** 2-3 horas

**Entregable:** Archivos de fabricación completos

### Semana 7-8: Fabricación (Tiempo de espera)

#### Ordenar PCB
- [ ] Subir gerbers a JLCPCB/PCBWay
- [ ] Revisar vista previa 3D
- [ ] Seleccionar opciones (color, finish, etc.)
- [ ] Ordenar 5 unidades
- [ ] Pagar y esperar envío

**Tiempo espera:** 10-15 días
**Costo:** €30-50

#### Mientras tanto: App Android Básica
- [ ] Setup proyecto Android Studio
- [ ] Implementar BLE manager
- [ ] UI básica (lista de códigos)
- [ ] Base de datos SQLite
- [ ] Test con prototipo breadboard

**Tiempo:** 30-40 horas

### Semana 9: Ensamblaje PCB

#### Recepción y Check
- [ ] Verificar PCBs recibidos
- [ ] Inspección visual (defectos)
- [ ] Medir dimensiones
- [ ] Verificar vias y pads

#### Soldadura
- [ ] Preparar estación de trabajo
- [ ] Soldar componentes SMD
- [ ] Soldar through-hole
- [ ] Soldar módulos (ESP32, scanner, OLED)
- [ ] Inspección con lupa

**Tiempo por PCB:** 2-4 horas
**Total:** 10-20 horas para 5 unidades

#### Testing Eléctrico
- [ ] Test de continuidad
- [ ] Verificar no cortocircuitos
- [ ] Medir resistencia VCC-GND
- [ ] Power-up test (sin componentes sensibles)
- [ ] Programar ESP32
- [ ] Test funcional completo

**Tiempo:** 1-2 horas por PCB

**Entregable:** 3-5 PCBs funcionales (yield 60-100%)

### Semana 10: Testing de Campo

- [ ] Cargar firmware v0.2
- [ ] Test de autonomía real (10h target)
- [ ] Test de alcance BLE (10m+ target)
- [ ] Test de velocidad de escaneo
- [ ] Test de ergonomía
- [ ] Recopilar feedback
- [ ] Lista de mejoras para v2

**Entregable:** Reporte de testing
**Presupuesto acumulado Fase 2:** €400-600

---

## Fase 3: Diseño Industrial y Mejoras (Semana 11-18)

### Objetivos
- Diseñar carcasa ergonómica
- Optimizar firmware
- Desarrollar app Android completa
- Preparar para pre-producción

### Semana 11-13: Diseño Carcasa

#### CAD 3D
- [ ] Mediciones precisas del PCB
- [ ] Diseño carcasa en Fusion 360 / FreeCAD
- [ ] Soportes para PCB
- [ ] Ventanas para OLED y scanner
- [ ] Agujeros para botones
- [ ] Puerto USB-C accesible
- [ ] Ergonomía (asas, grip)
- [ ] Simulación de encaje

**Tiempo:** 30-40 horas
**Skill:** Medio-alto (considerar contratar freelancer si no tienes experiencia)

#### Impresión Prototipo
- [ ] Exportar STL
- [ ] Slicing (Cura, PrusaSlicer)
- [ ] Impresión 3D (PLA o PETG)
- [ ] Post-procesamiento (lijado)
- [ ] Test de encaje con PCB

**Costo:** €20-40 por iteración
**Iteraciones esperadas:** 2-3

#### Refinamiento
- [ ] Ajustes basados en prototipos físicos
- [ ] Optimización para inyección (si aplica)
- [ ] Versión final CAD

**Entregable:** Archivos STL finales

### Semana 14-16: Software Avanzado

#### Firmware v1.0
- [ ] Deep sleep implementation
- [ ] Gestión inteligente de energía
- [ ] OTA updates via BLE
- [ ] Mejora de UI en OLED
- [ ] Animaciones y transiciones
- [ ] Configuración persistente (EEPROM)
- [ ] Logs de diagnóstico
- [ ] Recovery mode

**Tiempo:** 40-50 horas

#### App Android v1.0
- [ ] UI/UX profesional (Material Design)
- [ ] Gestión de múltiples terminales
- [ ] Sincronización offline-first
- [ ] Backend API integration (Firebase/custom)
- [ ] Notificaciones push
- [ ] Reportes y estadísticas
- [ ] Modo offline robusto
- [ ] Testing exhaustivo

**Tiempo:** 80-120 horas
**Considerar:** Contratar desarrollador Android si no tienes experiencia

### Semana 17-18: Testing Beta

- [ ] Producir 5-10 unidades con carcasa
- [ ] Distribuir a testers beta
- [ ] Recopilar feedback estructurado
- [ ] Iterar en base a feedback
- [ ] Documentación de usuario

**Costo:** €500-1,000 (10 unidades)

**Entregable:** Producto beta completo
**Presupuesto acumulado Fase 3:** €1,500-3,000

---

## Fase 4: Pre-producción (Semana 19-24)

### Objetivos
- PCB v2 optimizado
- Lote de 50-100 unidades
- Preparación para producción masiva

### Semana 19-20: Optimización PCB v2

#### Mejoras basadas en aprendizajes
- [ ] Reducir tamaño PCB (-10-20%)
- [ ] Cambiar componentes a SMD
- [ ] Optimizar ruteo
- [ ] Reducir costos (componentes más baratos)
- [ ] Mejoras de EMI/EMC
- [ ] Test points para debugging

**Tiempo:** 20-30 horas

#### Fabricación PCB v2
- [ ] Ordenar 50-100 PCBs
- [ ] Considerar PCBA (ensamblaje automático)

**Costo:** €500-1,500 (depende de PCBA)
**Tiempo espera:** 15-20 días

### Semana 21-22: Carcasa Pre-producción

#### Opción A: Impresión 3D profesional
- [ ] Servicio MJF o SLS (mejor calidad)
- [ ] 50-100 unidades

**Costo:** €800-1,500

#### Opción B: Molde de inyección
- [ ] Diseño de molde
- [ ] Fabricación molde aluminio (soft tool)
- [ ] Primeras inyecciones

**Costo:** €3,000-8,000 (molde) + €2-4/unidad
**Solo si vas a producir >500 unidades**

### Semana 23-24: Ensamblaje y QC

- [ ] Ensamblaje de 50-100 unidades
- [ ] Quality Control checklist
- [ ] Testing 100% de unidades
- [ ] Packaging
- [ ] Documentación de usuario

**Tiempo:** 100-200 horas (considerar ayuda)

**Entregable:** 50-100 unidades listas para venta
**Presupuesto acumulado Fase 4:** €3,000-10,000

---

## Fase 5: Producción y Lanzamiento (Semana 25+)

### Pre-lanzamiento

#### Marketing
- [ ] Sitio web producto
- [ ] Material fotográfico profesional
- [ ] Video demo
- [ ] Documentación técnica
- [ ] Manual de usuario

#### Canales de venta
- [ ] Tienda online (Shopify, WooCommerce)
- [ ] Distribuidores B2B
- [ ] Marketplace (Amazon, etc.)

#### Legal
- [ ] Registrar marca (opcional)
- [ ] Términos y condiciones
- [ ] Garantía y soporte

### Lanzamiento

#### Piloto
- [ ] Vender primeras 50 unidades
- [ ] Soporte al cliente
- [ ] Recopilar feedback
- [ ] Iteraciones menores

#### Escalado
- [ ] Ordenar lote de 500-1000 unidades
- [ ] Molde de inyección (si no se hizo antes)
- [ ] Optimizar supply chain
- [ ] Certificaciones (CE, FCC si exportas)

---

## Resumen de Costos por Fase

| Fase | Descripción | Presupuesto | Tiempo |
|------|-------------|-------------|--------|
| 0 | Preparación | €150-250 | 2 semanas |
| 1 | Prototipo breadboard | €0 | 2 semanas |
| 2 | PCB + fabricación | €400-600 | 6 semanas |
| 3 | Diseño industrial | €1,500-3,000 | 8 semanas |
| 4 | Pre-producción (50-100u) | €3,000-10,000 | 6 semanas |
| **Total DIY** | Si haces todo tú | **€5,050-13,850** | **24 semanas (6 meses)** |
| **Total Semi-Pro** | Con freelancers | **€10,000-25,000** | **20 semanas (5 meses)** |

---

## Resumen de Horas de Trabajo

| Actividad | Horas |
|-----------|-------|
| Aprendizaje inicial | 40h |
| Prototipo breadboard | 60h |
| Diseño PCB | 40h |
| App Android | 120h |
| Firmware | 100h |
| Diseño carcasa | 40h |
| Ensamblaje y testing | 200h |
| **Total** | **~600 horas** |

Si trabajas **20h/semana** → **30 semanas (7.5 meses)**
Si trabajas **40h/semana** (full-time) → **15 semanas (3.75 meses)**

---

## Hitos Clave

```
✅ Semana 4: Prototipo breadboard funcional
✅ Semana 10: Primer PCB ensamblado
✅ Semana 14: App Android básica funcionando
✅ Semana 18: Producto beta completo
✅ Semana 24: 100 unidades pre-producción listas
✅ Semana 28: Lanzamiento comercial
```

---

## Riesgos y Mitigaciones

### Riesgo 1: PCB no funciona al primer intento
**Probabilidad:** Media (30-40%)
**Impacto:** +€200, +2 semanas
**Mitigación:**
- Revisión exhaustiva DRC
- Peer review del esquemático
- Ordenar más de 5 PCBs

### Riesgo 2: Problemas con BLE en producción
**Probabilidad:** Media
**Impacto:** Alto
**Mitigación:**
- Testing extensivo en Fase 1-2
- Considerar antena externa
- Certificación RF profesional

### Riesgo 3: Autonomía insuficiente
**Probabilidad:** Media-Alta
**Impacto:** Medio
**Mitigación:**
- Mediciones continuas de consumo
- Implementar deep sleep desde Fase 1
- Batería más grande si necesario (3000 → 4000mAh)

### Riesgo 4: Costos superan presupuesto
**Probabilidad:** Alta
**Impacto:** Alto
**Mitigación:**
- Contingencia de +30% en presupuesto
- Opción de crowdfunding (Kickstarter)
- Buscar inversores/socios

### Riesgo 5: Falta de tiempo/motivación
**Probabilidad:** Media
**Impacto:** Crítico
**Mitigación:**
- Establecer hitos semanales
- Encontrar accountability partner
- Considerar equipo/cofounders

---

## Métricas de Éxito

### Técnicas
- [ ] Autonomía ≥10 horas uso continuo
- [ ] Alcance BLE ≥10 metros
- [ ] Tiempo de escaneo <500ms
- [ ] Tasa de error lectura <1%
- [ ] Tiempo de conexión BLE <3 segundos

### Negocio (si comercializas)
- [ ] 100 unidades vendidas (primer lote)
- [ ] NPS (Net Promoter Score) >50
- [ ] Margen >40%
- [ ] Payback periodo <12 meses

---

## Próximos Pasos Inmediatos

### Esta semana
1. ✅ Revisar toda la documentación generada
2. ✅ Decidir si continuar con el proyecto
3. ⬜ Hacer pedido de componentes Fase 0
4. ⬜ Configurar entorno de desarrollo
5. ⬜ Empezar tutorial Arduino básico

### Próxima semana
1. ⬜ Recibir componentes
2. ⬜ Primer prototipo breadboard (alimentación + ESP32)
3. ⬜ Cargar primer sketch
4. ⬜ Conectar OLED
5. ⬜ Documentar progreso (fotos, notas)

---

## Recursos y Contactos Útiles

### Fabricación
- **PCB:** JLCPCB (jlcpcb.com), PCBWay (pcbway.com)
- **Componentes:** Mouser, Digikey, LCSC, AliExpress
- **Carcasa:** Xometry (xometry.com), Protolabs, impresión 3D local

### Desarrollo
- **Firmware:** ESP32 Forums, Arduino Forums
- **Android:** r/androiddev, Stack Overflow
- **Diseño:** r/PrintedCircuitBoard, EEVBlog forums

### Financiación (si necesitas)
- **Crowdfunding:** Kickstarter, Indiegogo
- **Aceleradoras:** Y Combinator, Techstars
- **Grants:** Horizon Europe, subsidios locales

---

## Conclusión

Este proyecto es **totalmente viable** y representa una excelente oportunidad de aprendizaje en:
- Diseño de hardware
- Firmware embedded
- Comunicación inalámbrica (BLE)
- Desarrollo móvil
- Producto completo end-to-end

**Recomendación:** Comenzar con Fase 0 y Fase 1 (coste bajo, riesgo bajo) para validar viabilidad antes de invertir en PCB custom y producción.

¿Estás listo para empezar? 🚀
