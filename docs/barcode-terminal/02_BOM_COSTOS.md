# Bill of Materials (BOM) - Terminal de Mensajería

## Resumen de Costos

| Fase | Costo Unitario | Cantidad | Total |
|------|----------------|----------|-------|
| **Prototipo Breadboard** | - | 1 | **€180-250** |
| **Prototipo PCB v1** | - | 3-5 unidades | **€450-750** |
| **Diseño Industrial** | - | - | **€1,500-3,000** |
| **Pre-producción (10 unidades)** | ~€75-95 | 10 | **€750-950** |
| **Producción (100 unidades)** | ~€45-60 | 100 | **€4,500-6,000** |

---

## 🔧 OPCIONES DE MICROCONTROLADOR

Este proyecto soporta dos opciones de microcontrolador. Elige según tus prioridades:

### Opción A: ESP32 DevKit V1 (Original)

**Mejor para:** Máxima documentación, prototipado rápido en breadboard, precio bajo
- **Tamaño:** 55x28mm (grande)
- **Peso:** 10g
- **Precio:** €6-8
- **Pines:** 30 GPIOs disponibles
- **Prototipado:** Muy fácil (breadboard friendly)

### Opción B: Seeed XIAO ESP32-S3 ⭐ RECOMENDADO

**Mejor para:** Dispositivo compacto, Python opcional, producto final portátil
- **Tamaño:** 21x17.5mm (76% más pequeño)
- **Peso:** 2.5g (75% más ligero)
- **Precio:** €7-9
- **Pines:** 11 GPIOs (suficientes para el proyecto)
- **Ventajas:** Cargador LiPo integrado, USB-C, más PSRAM
- **Python:** MicroPython soportado oficialmente

**Recomendación:** Usa **ESP32 DevKit** para prototipar, luego cambia a **XIAO ESP32-S3** para el producto final.

---

## 1. COMPONENTES ELECTRÓNICOS (por unidad)

### 1.1 Microcontrolador y Comunicación

#### Opción A: ESP32 DevKit V1
| Componente | Descripción | Cantidad | Precio Unit. | Precio Total | Proveedor |
|------------|-------------|----------|--------------|--------------|-----------|
| ESP32 DevKit V1 | Módulo WiFi+BLE, 30 pines | 1 | €6-8 | €7.00 | AliExpress/Amazon |
| Cable Micro-USB | Para programación | 1 | €1-2 | €1.00 | Incluido |

#### Opción B: Seeed XIAO ESP32-S3 ⭐
| Componente | Descripción | Cantidad | Precio Unit. | Precio Total | Proveedor |
|------------|-------------|----------|--------------|--------------|-----------|
| Seeed XIAO ESP32-S3 | Ultra-compacto, 8MB PSRAM | 1 | €7-9 | €8.00 | AliExpress/Seeed |
| Cable USB-C | Para programación | 1 | €1-2 | €1.00 | Incluido |

**Nota:** Con XIAO no necesitas módulos TP4056 ni AMS1117 (cargador integrado)

### 1.2 Scanner de Códigos

| Componente | Descripción | Cantidad | Precio Unit. | Precio Total | Proveedor |
|------------|-------------|----------|--------------|--------------|-----------|
| GM67 2D Scanner | 1D/2D barcode reader | 1 | €15-25 | €20.00 | AliExpress |
| Alternativa: DE2120 | 2D scanner module | 1 | €18-30 | €24.00 | AliExpress |
| Conector JST | Para scanner | 1 | €0.20 | €0.20 | Local |

**Opción seleccionada**: GM67 (mejor relación precio/rendimiento)

### 1.3 Pantalla y Visualización

| Componente | Descripción | Cantidad | Precio Unit. | Precio Total | Proveedor |
|------------|-------------|----------|--------------|--------------|-----------|
| OLED 1.3" SSD1306 | 128x64 I2C blanco/azul | 1 | €4.50 | €4.50 | AliExpress |
| LED RGB | Indicador estado | 1 | €0.10 | €0.10 | Local |
| LED Rojo | Indicador batería baja | 1 | €0.05 | €0.05 | Local |

### 1.4 Alimentación

| Componente | Descripción | Cantidad | Precio Unit. | Precio Total | Proveedor |
|------------|-------------|----------|--------------|-----------|-----------|
| Batería LiPo 3.7V | 3000mAh (103450) | 1 | €6.00 | €6.00 | AliExpress |
| TP4056 + Protección | Módulo carga LiPo | 1 | €1.50 | €1.50 | AliExpress |
| AMS1117-3.3 | Regulador LDO 3.3V | 1 | €0.30 | €0.30 | Local |
| Conector USB-C | Hembra SMD | 1 | €0.80 | €0.80 | Local |
| Holder batería | Soporte 18650 alt. | 1 | €0.50 | €0.50 | AliExpress |
| Interruptor ON/OFF | Slide switch | 1 | €0.40 | €0.40 | Local |

### 1.5 Interfaz de Usuario

| Componente | Descripción | Cantidad | Precio Unit. | Precio Total | Proveedor |
|------------|-------------|----------|--------------|--------------|-----------|
| Pulsadores táctiles | 6x6mm | 4 | €0.10 | €0.40 | Local |
| Buzzer piezo | 5V pasivo | 1 | €0.50 | €0.50 | Local |
| Motor vibración | 3V coin type | 1 | €1.20 | €1.20 | AliExpress |
| Transistor 2N2222 | Driver motor/buzzer | 2 | €0.05 | €0.10 | Local |

### 1.6 Componentes Pasivos

| Componente | Descripción | Cantidad | Precio Unit. | Precio Total | Proveedor |
|------------|-------------|----------|--------------|--------------|-----------|
| Resistencias SMD 0805 | Kit variado | 20 | €0.01 | €0.20 | Kit |
| Capacitores cerámicos | 100nF, 10uF, 22uF | 10 | €0.05 | €0.50 | Kit |
| Diodo Schottky | 1N5819 | 2 | €0.10 | €0.20 | Local |
| Condensador electrolítico | 100uF, 470uF | 2 | €0.15 | €0.30 | Local |

### 1.7 Conectores y Diversos

| Componente | Descripción | Cantidad | Precio Unit. | Precio Total | Proveedor |
|------------|-------------|----------|--------------|--------------|-----------|
| Header pins | Macho/Hembra 2.54mm | 40 | €0.02 | €0.80 | Kit |
| Tornillos M2.5 | Plástico/metal | 8 | €0.05 | €0.40 | Local |

**Subtotal Electrónica por unidad**: **€42-47**

---

## 2. PCB (Placa de Circuito Impreso)

### Prototipo (5 unidades)

| Item | Especificación | Precio |
|------|----------------|--------|
| Fabricación PCB | 2 capas, 100x80mm, HASL | €30-50 (5 pcs) |
| Stencil | Pasta de soldar | €10-15 |
| Envío | Express 7-10 días | €15-25 |

**Total 5 prototipos PCB**: **€55-90** (€11-18 por unidad)

### Producción (100 unidades)

| Item | Especificación | Precio |
|------|----------------|--------|
| Fabricación PCB | 2 capas, 100x80mm, ENIG | €150-250 |
| Stencil | Incluido | - |
| Envío | Estándar | €20-30 |

**Total 100 PCBs**: **€170-280** (€1.70-2.80 por unidad)

---

## 3. CARCASA Y MECÁNICA

### Prototipo (Impresión 3D)

| Item | Descripción | Precio Unit. | Cantidad | Total |
|------|-------------|--------------|----------|-------|
| Impresión 3D | PLA/PETG, 2 partes | €15 | 1 | €15 |
| Diseño CAD | Freelancer/propio | - | - | €0-300 |
| Tornillos y espaciadores | Kit M2.5 | €5 | 1 kit | €5 |
| Junta de goma | Protección (opcional) | €2 | 1 | €2 |

**Total carcasa prototipo**: **€22-322** (dependiendo diseño)

### Producción (Inyección de plástico - MOQ ~500 unidades)

| Item | Descripción | Precio |
|------|-------------|--------|
| Molde de inyección | Acero, 2 cavidades | €3,000-8,000 |
| Carcasa por unidad | ABS/PC | €2-4 |
| Setup fee | Primera producción | €500-800 |

**Para lotes pequeños (<100)**: Usar impresión 3D profesional: €8-12/unidad

---

## 4. ENSAMBLAJE

### Prototipo (Manual)

| Item | Descripción | Precio |
|------|-------------|--------|
| Soldadura manual | Por unidad | €0 (DIY) o €30-50 (servicio) |
| Pasta de soldar | Jeringa | €5 |
| Flux y consumibles | - | €10 |

### Producción (Semi-automático)

| Item | Descripción | Precio Unit. |
|------|-------------|--------------|
| Pick & Place + Reflow | Por PCB | €5-10 |
| Inspección y testing | Por unidad | €2-3 |
| Ensamblaje final | Carcasa + PCB | €3-5 |

**Total ensamblaje producción**: €10-18 por unidad

---

## 5. SOFTWARE Y DESARROLLO

| Item | Descripción | Precio |
|------|-------------|--------|
| Firmware ESP32 | Desarrollo (40-60h) | €0 (open source) o €1,600-3,000 |
| App Android básica | Flutter/React Native | €0 (template) o €2,000-5,000 |
| Backend/API | Firebase o custom | €0-500/mes |
| Testing y debugging | 20-40 horas | €800-2,000 |

**Total desarrollo software**: **€0-10,500** (dependiendo si es DIY o contratado)

---

## 6. HERRAMIENTAS NECESARIAS (One-time)

### Para Prototipado

| Herramienta | Precio | Necesario |
|-------------|--------|-----------|
| Soldador temperatura controlada | €30-80 | Sí |
| Multímetro digital | €20-50 | Sí |
| Fuente alimentación | €30-100 | Recomendado |
| Osciloscopio USB | €80-200 | Opcional |
| Estación aire caliente | €50-150 | Para SMD (opcional) |
| Programador USB-Serial | €5-10 | Sí (ESP32) |

**Total herramientas básicas**: **€85-240**

---

## 7. RESUMEN DE COSTOS POR FASE

### FASE 1: Prototipo en Breadboard (1 unidad)
```
Componentes electrónicos:        €50-60
Cables y breadboard:              €15-20
Herramientas básicas (si no tienes): €85-240
────────────────────────────────────────
TOTAL FASE 1:                     €150-320
```

### FASE 2: Primer Prototipo PCB (5 unidades)
```
Componentes (5 unidades):         €210-235
PCB fabricación (5 pcs):          €55-90
Carcasa 3D (5 unidades):          €75-100
Ensamblaje manual:                €25-50
────────────────────────────────────────
TOTAL FASE 2:                     €365-475 (€73-95/unidad)
```

### FASE 3: Lote Pre-producción (10 unidades)
```
Componentes (10 unidades):        €420-470
PCB (10 unidades):                €110-180
Carcasa 3D profesional:           €80-120
Ensamblaje:                       €100-180
────────────────────────────────────────
TOTAL FASE 3:                     €710-950 (€71-95/unidad)
```

### FASE 4: Producción Pequeña Serie (100 unidades)
```
Componentes (100 unidades):       €4,200-4,700
PCB (100 unidades):               €170-280
Carcasas 3D profesional:          €800-1,200
Ensamblaje semi-auto:             €1,000-1,800
────────────────────────────────────────
TOTAL FASE 4:                     €6,170-7,980 (€62-80/unidad)
```

### FASE 5: Producción Media (500 unidades) - Con molde
```
Componentes (500):                €19,000-21,000
PCB (500):                        €600-1,000
Molde de inyección:               €3,000-8,000 (one-time)
Carcasas inyectadas:              €1,000-2,000
Ensamblaje:                       €5,000-9,000
────────────────────────────────────────
TOTAL:                            €28,600-41,000 (€57-82/unidad)
Sin molde amortizado:             €51-67/unidad
```

---

## 8. COSTO TOTAL PROYECTO COMPLETO

### Opción A: DIY Completo (Tú haces todo)
```
Fase 1 (Prototipo breadboard):    €150-320
Fase 2 (5 PCBs):                  €365-475
Software (Open source/DIY):       €0
────────────────────────────────────────
TOTAL INVERSIÓN:                  €515-795
```

### Opción B: Semi-Profesional (10 unidades finales)
```
Fase 1 + 2 (Desarrollo):          €515-795
Fase 3 (10 unidades):             €710-950
Software contratado (básico):     €2,000-4,000
────────────────────────────────────────
TOTAL INVERSIÓN:                  €3,225-5,745
COSTO POR UNIDAD:                 €322-575
```

### Opción C: Producción (100 unidades)
```
Desarrollo completo:              €3,000-6,000
Producción 100 unidades:          €6,170-7,980
Software profesional:             €4,000-8,000
Certificaciones (opcional):       €2,000-5,000
────────────────────────────────────────
TOTAL INVERSIÓN:                  €15,170-26,980
COSTO POR UNIDAD:                 €152-270
```

---

## 9. PROVEEDORES RECOMENDADOS

### Componentes Electrónicos
- **AliExpress**: Scanner, batería, OLED (económico, 15-30 días)
- **Mouser/Digikey**: ESP32, componentes de calidad (rápido, 2-5 días)
- **LCSC**: Componentes SMD en cantidad (económico, 7-15 días)

### PCB
- **JLCPCB**: Muy económico, buena calidad (7-15 días)
- **PCBWay**: Calidad premium, más caro (7-10 días)
- **AISLER**: Europeo, rápido pero más caro (3-5 días)

### Carcasas
- **Impresión 3D local**: Rápido, bueno para prototipos
- **Xometry**: On-demand manufacturing, calidad profesional
- **Alibaba**: Inyección plástico, MOQ alto (500+)

---

## 10. COMPARATIVA DE COSTOS: ESP32 DevKit vs XIAO ESP32-S3

### Costos por Unidad (Componentes Electrónicos)

| Componente | ESP32 DevKit | XIAO ESP32-S3 | Diferencia |
|------------|--------------|---------------|------------|
| Microcontrolador | €7.00 | €8.00 | +€1.00 |
| Cargador LiPo (TP4056) | €1.50 | **incluido** | -€1.50 |
| Regulador (AMS1117) | €0.30 | **incluido** | -€0.30 |
| Scanner GM67 | €20.00 | €20.00 | - |
| OLED 1.3" | €4.50 | €4.50 | - |
| Batería LiPo | €6.00 | €5.00* | -€1.00 |
| Otros componentes | €15.00 | €13.00 | -€2.00 |
| **TOTAL** | **€54.30** | **€50.50** | **-€3.80** |

*Batería más pequeña (1000mAh vs 3000mAh) suficiente por menor consumo

### Tamaño y Peso del Terminal Final

| Característica | ESP32 DevKit | XIAO ESP32-S3 | Mejora |
|----------------|--------------|---------------|--------|
| Dimensiones PCB | 100x80mm | 80x65mm | -35% área |
| Grosor | 35mm | 28mm | -20% |
| Peso total | ~180g | ~145g | -19% |
| Volumen | 280 cm³ | 145 cm³ | -48% |

### Costos de Producción (100 unidades)

| Concepto | ESP32 DevKit | XIAO ESP32-S3 | Diferencia |
|----------|--------------|---------------|------------|
| Componentes (100u) | €5,430 | €5,050 | -€380 |
| PCB más pequeño | €280 | €220 | -€60 |
| Carcasa más pequeña | €1,200 | €900 | -€300 |
| Ensamblaje | €1,800 | €1,500 | -€300 |
| **TOTAL** | **€8,710** | **€7,670** | **-€1,040** |
| **Por unidad** | **€87.10** | **€76.70** | **-€10.40** |

### Ventajas Adicionales del XIAO ESP32-S3

**Técnicas:**
- ✅ USB-C moderno (vs Micro-USB)
- ✅ 8MB PSRAM (vs 0MB) - mejor para Python
- ✅ Cargador integrado (reduce componentes)
- ✅ Menor consumo → batería más pequeña

**De Producto:**
- ✅ 48% menos volumen → más portátil
- ✅ 19% menos peso → menos fatiga
- ✅ Aspecto más profesional
- ✅ Menores costos de envío

**De Desarrollo:**
- ✅ Mismo performance (240MHz dual-core)
- ✅ MicroPython soportado oficialmente
- ✅ Menos cableado (cargador integrado)

### Desventajas del XIAO ESP32-S3

- ⚠️ Menos pines disponibles (11 vs 30)
  - **Solución:** Proyecto usa solo 11 pines
- ⚠️ Soldadura SMD más compleja
  - **Solución:** Usar módulo pre-ensamblado
- ⚠️ Menos documentación que ESP32 estándar
  - **Solución:** Wiki oficial Seeed bien documentada

---

## 11. RECOMENDACIÓN INICIAL

### Para Prototipado Rápido (Fase 0-1)

**OPCIÓN A: Kit de Evaluación ESP32 DevKit (€120-150)**
- ESP32 DevKit (€8)
- Scanner GM67 (€20)
- OLED 1.3" (€5)
- Batería LiPo + cargador (€10)
- Buzzer + vibrador (€2)
- Breadboard y cables (€15)
- Botones y componentes (€10)
- Carcasa temporal (€10)

**Ventajas:** Prototipado muy rápido, máxima documentación, breadboard friendly

---

**OPCIÓN B: Kit de Evaluación XIAO ESP32-S3 (€110-140)** ⭐
- XIAO ESP32-S3 (€8)
- Scanner GM67 (€20)
- OLED 1.3" (€5)
- Batería LiPo 1000mAh (€5) - carga integrada
- Buzzer + vibrador (€2)
- Breadboard + adaptador (€18)
- Botones y componentes (€10)
- Carcasa temporal (€10)

**Ventajas:** Terminal final más compacto, Python opcional, menores costos finales

---

### Estrategia Recomendada: Híbrida

**Fase 0-1: Prototipo (Semanas 1-4)**
```
Usar ESP32 DevKit
→ Prototipado rápido en breadboard
→ Validar funcionalidad completa
→ Desarrollar firmware base
Costo: €120-150
```

**Fase 2: PCB v1 (Semanas 5-10)**
```
Migrar a XIAO ESP32-S3
→ Diseño PCB compacto
→ Adaptar firmware (cambio pines)
→ 5 prototipos PCB
Costo: €400-500
```

**Fase 3+: Producción**
```
Continuar con XIAO ESP32-S3
→ Optimización final
→ Producción 10-100 unidades
→ Ahorro €10.40/unidad
```

**Siguiente paso**: Si el prototipo funciona bien, pasar a Fase 2 con XIAO para máxima compacidad.
