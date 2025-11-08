# Lista de Compras - Terminal de Códigos de Barras

## 🎯 Objetivo: Prototipo Funcional en Breadboard (Fase 1)

Esta lista te permitirá construir un prototipo completamente funcional para validar el concepto antes de invertir en PCB custom.

## ⚡ Dos Opciones de Microcontrolador

Este proyecto soporta DOS microcontroladores diferentes. Elige según tus prioridades:

### 🔵 ESP32 DevKit V1 (Opciones 1-3)
- **Mejor para:** Prototipado rápido en breadboard
- **Tamaño:** 55x28mm (más grande)
- **Ventajas:** Mucha documentación, fácil de cablear, 30 GPIOs
- **Precio:** ~€139 completo (con herramientas)

### ⭐ XIAO ESP32-S3 (Opción 4)
- **Mejor para:** Producto final compacto, Python opcional
- **Tamaño:** 21x17.5mm (76% más pequeño)
- **Ventajas:** Ultra-compacto, cargador integrado, USB-C, 8MB PSRAM
- **Precio:** ~€125 completo (ahorro de €14)

**Recomendación:** Si es tu primera vez → ESP32 DevKit. Si quieres el terminal final más pequeño → XIAO ESP32-S3.

---

## 📦 OPCIÓN 1: Kit Básico ESP32 DevKit (€139-177) - PARA EMPEZAR

### Componentes Principales

| # | Componente | Cantidad | Precio Unit. | Total | Enlace Compra |
|---|------------|----------|--------------|-------|---------------|
| 1 | **ESP32 DevKit V1** (30 pines) | 1 | €6-8 | €8 | [AliExpress](https://es.aliexpress.com/item/32959541446.html) |
| 2 | **GM67 2D Barcode Scanner Module** | 1 | €18-25 | €22 | [AliExpress - GM67](https://es.aliexpress.com/item/1005003827450841.html) |
| 3 | **OLED Display 1.3" SSD1306 I2C** (blanco o azul) | 1 | €4-6 | €5 | [AliExpress - OLED](https://es.aliexpress.com/item/32896971385.html) |
| 4 | **Batería LiPo 3.7V 3000mAh** (modelo 103450) | 1 | €6-8 | €7 | [AliExpress - LiPo](https://es.aliexpress.com/item/1005004089866524.html) |
| 5 | **Módulo TP4056 con protección** (carga LiPo) | 1 | €1-2 | €1.50 | [AliExpress - TP4056](https://es.aliexpress.com/item/32649780468.html) |
| 6 | **Regulador AMS1117-3.3V** (módulo) | 1 | €1-2 | €1.50 | [AliExpress - AMS1117](https://es.aliexpress.com/item/32829415186.html) |
| 7 | **Conector USB Type-C** (breakout/módulo) | 1 | €1-2 | €1.50 | [AliExpress - USB-C](https://es.aliexpress.com/item/1005003636706118.html) |
| 8 | **Buzzer Piezo 5V** (activo o pasivo) | 1 | €0.50-1 | €0.80 | [AliExpress - Buzzer](https://es.aliexpress.com/item/32808743801.html) |
| 9 | **Motor de Vibración** (coin type 3V) | 1 | €1-2 | €1.50 | [AliExpress - Vibrator](https://es.aliexpress.com/item/32965497227.html) |
| 10 | **Pulsadores Táctiles 6x6mm** (pack 100) | 1 pack | €2-3 | €2.50 | [AliExpress - Buttons](https://es.aliexpress.com/item/32896953455.html) |
| 11 | **LED RGB Común Cátodo** 5mm | 1 | €0.50 | €0.50 | [AliExpress - RGB LED](https://es.aliexpress.com/item/32835427806.html) |
| 12 | **Interruptor Slide Switch** | 1 | €0.50-1 | €0.70 | [AliExpress - Switch](https://es.aliexpress.com/item/32964796405.html) |

**Subtotal Componentes Principales: €53**

---

### Kit de Componentes Pasivos

| # | Componente | Cantidad | Precio | Enlace |
|---|------------|----------|--------|--------|
| 13 | **Kit de Resistencias** (1/4W, valores variados) | 1 kit | €3-5 | [Kit Resistencias 600pcs](https://es.aliexpress.com/item/32952657927.html) |
| 14 | **Kit de Capacitores Cerámicos** (100nF, 10uF, 22uF, etc.) | 1 kit | €3-5 | [Kit Capacitores](https://es.aliexpress.com/item/1005003595404476.html) |
| 15 | **Capacitores Electrolíticos** (100uF, 470uF, 1000uF) | 1 kit | €3-4 | [Kit Electrolíticos](https://es.aliexpress.com/item/1005003267956468.html) |
| 16 | **Transistores 2N2222** (NPN, pack 10) | 1 pack | €1-2 | [Transistores](https://es.aliexpress.com/item/32848118241.html) |
| 17 | **Diodos 1N4148** (pack 100) | 1 pack | €1-2 | [Diodos](https://es.aliexpress.com/item/32849879904.html) |
| 18 | **Diodos Schottky 1N5819** (pack 10) | 1 pack | €1-2 | [Schottky](https://es.aliexpress.com/item/32958207460.html) |

**Subtotal Componentes Pasivos: €15**

---

### Herramientas de Prototipado

| # | Herramienta | Cantidad | Precio | Enlace |
|---|-------------|----------|--------|--------|
| 19 | **Breadboard 830 puntos** | 2 | €2-3 c/u | [Breadboard MB-102](https://es.aliexpress.com/item/32822296504.html) |
| 20 | **Cables Jumper Macho-Macho** (pack 40) | 2 packs | €2 c/u | [Jumpers M-M](https://es.aliexpress.com/item/32833194748.html) |
| 21 | **Cables Jumper Macho-Hembra** (pack 40) | 1 pack | €2 | [Jumpers M-F](https://es.aliexpress.com/item/32833194748.html) |
| 22 | **Cables Jumper Hembra-Hembra** (pack 40) | 1 pack | €2 | [Jumpers F-F](https://es.aliexpress.com/item/32832691972.html) |
| 23 | **Cable USB Mini/Micro para ESP32** | 1 | €1-2 | Incluido con ESP32 |
| 24 | **Fuente de Alimentación Breadboard** (3.3V/5V) | 1 | €2-3 | [Power Supply MB-102](https://es.aliexpress.com/item/1005001621837443.html) |

**Subtotal Prototipado: €18**

---

### Herramientas Básicas (Si NO las tienes)

| # | Herramienta | Precio | Enlace | ¿Necesario? |
|---|-------------|--------|--------|-------------|
| 25 | **Soldador de temperatura regulable** 60W | €25-40 | [Soldador Digital](https://es.aliexpress.com/item/1005002749094318.html) | ⭐ SÍ |
| 26 | **Estaño con Flux** 60/40 (0.8mm, 50g) | €5-8 | [Estaño](https://es.aliexpress.com/item/1005003616878208.html) | ⭐ SÍ |
| 27 | **Multímetro Digital** | €8-15 | [Multímetro](https://es.aliexpress.com/item/1005004886512537.html) | ⭐ SÍ |
| 28 | **Alicates de Corte** | €5-8 | [Alicates](https://es.aliexpress.com/item/32963255962.html) | ⭐ SÍ |
| 29 | **Pinzas Antiestáticas** | €3-5 | [Pinzas](https://es.aliexpress.com/item/1005003854326485.html) | Recomendado |
| 30 | **Desoldador de Succión** | €2-4 | [Desoldador](https://es.aliexpress.com/item/32827174437.html) | Recomendado |
| 31 | **Soporte "Tercera Mano"** con lupa | €8-12 | [Tercera Mano](https://es.aliexpress.com/item/1005003291059258.html) | Útil |
| 32 | **Programador USB-Serial CP2102** | €2-4 | [CP2102](https://es.aliexpress.com/item/1005001636319616.html) | Backup |

**Subtotal Herramientas Esenciales (25-28): €43-71**
**Subtotal Herramientas Completas (25-32): €60-96**

---

## 💰 RESUMEN OPCIÓN 1: Kit Básico

| Categoría | Precio |
|-----------|--------|
| Componentes Principales | €53 |
| Componentes Pasivos | €15 |
| Prototipado | €18 |
| **TOTAL sin herramientas** | **€86** |
| + Herramientas esenciales (si no tienes) | +€43-71 |
| **TOTAL con herramientas** | **€129-157** |
| + Envío (estimado) | +€10-20 |
| **GRAN TOTAL** | **€139-177** |

---

## 📦 OPCIÓN 2: Kit Premium (€200-250) - Para Acelerar Desarrollo

Incluye todo de Opción 1 más:

| Componente Extra | Cantidad | Precio | Por qué |
|------------------|----------|--------|---------|
| **ESP32 adicionales** (backup) | 2 | €16 | Por si quemas uno |
| **Scanner adicional** | 1 | €22 | Backup crítico |
| **Baterías extra** 3000mAh | 2 | €14 | Testing y comparación |
| **OLED Display extra** | 1 | €5 | Backup |
| **Caja organizadora** componentes | 1 | €10 | Organización |
| **Pasta de Flux** en jeringa | 1 | €5 | Mejor soldadura |
| **Soporte PCB ajustable** | 1 | €8 | Facilita soldadura |
| **Cable USB-C a USB-A** (calidad) | 1 | €3 | Carga confiable |
| **Batería 9V + clip** (power supply) | 1 | €5 | Fuente portátil |

**Extra Premium: €88**
**Total Opción 2: €177 + €88 = €265** (con herramientas)

---

## 📦 OPCIÓN 3: Kit Mínimo de Prueba (€80-100) - Solo Validar Concepto

Si quieres probar antes de comprometerte:

| # | Componente | Precio |
|---|------------|--------|
| 1 | ESP32 DevKit V1 | €8 |
| 2 | GM67 Scanner | €22 |
| 3 | OLED 1.3" | €5 |
| 4 | Breadboard + Jumpers | €6 |
| 5 | Power bank USB (que ya tengas) | €0 |
| 6 | Resistencias y LEDs básicos | €5 |
| **TOTAL** | **€46** |
| + Herramientas básicas (si no tienes) | +€43 |
| **GRAN TOTAL** | **€89** |

**Con esto puedes:**
- ✅ Probar scanner
- ✅ Probar comunicación BLE
- ✅ Mostrar datos en OLED
- ✅ Validar que todo funciona
- ❌ No incluye batería (usar USB)
- ❌ No incluye buzzer/vibrador

---

## 📦 OPCIÓN 4: Kit XIAO ESP32-S3 (€110-140) ⭐ RECOMENDADO PARA PRODUCTO FINAL

### Componentes Principales (XIAO)

| # | Componente | Cantidad | Precio Unit. | Total | Enlace Compra |
|---|------------|----------|--------------|-------|---------------|
| 1 | **Seeed XIAO ESP32-S3** (ultra-compacto) | 1 | €7-9 | €8 | [AliExpress XIAO](https://es.aliexpress.com/item/1005005877531694.html) |
| 2 | **GM67 2D Barcode Scanner Module** | 1 | €18-25 | €22 | [AliExpress - GM67](https://es.aliexpress.com/item/1005003827450841.html) |
| 3 | **OLED Display 1.3" SSD1306 I2C** | 1 | €4-6 | €5 | [AliExpress - OLED](https://es.aliexpress.com/item/32896971385.html) |
| 4 | **Batería LiPo 3.7V 1000mAh** (más pequeña) | 1 | €4-6 | €5 | [AliExpress - LiPo](https://es.aliexpress.com/item/1005004089866524.html) |
| 5 | **Buzzer Piezo 5V** | 1 | €0.50-1 | €0.80 | [AliExpress - Buzzer](https://es.aliexpress.com/item/32808743801.html) |
| 6 | **Motor de Vibración** (coin type 3V) | 1 | €1-2 | €1.50 | [AliExpress - Vibrator](https://es.aliexpress.com/item/32965497227.html) |
| 7 | **Pulsadores Táctiles 6x6mm** (pack 100) | 1 pack | €2-3 | €2.50 | [AliExpress - Buttons](https://es.aliexpress.com/item/32896953455.html) |
| 8 | **LED RGB Común Cátodo** 5mm | 1 | €0.50 | €0.50 | [AliExpress - RGB LED](https://es.aliexpress.com/item/32835427806.html) |

**Subtotal Componentes Principales: €45.30**

**Componentes NO necesarios con XIAO (ahorro vs DevKit):**
- ❌ Módulo TP4056 (cargador integrado) → ahorro €1.50
- ❌ Regulador AMS1117 (integrado) → ahorro €1.50
- ❌ Conector USB-C externo (integrado) → ahorro €1.50
- ❌ Interruptor ON/OFF (control por software) → ahorro €0.70

**Ahorro total en componentes: -€5.20**

---

### Kit de Componentes Pasivos (igual que Opción 1)

| # | Componente | Cantidad | Precio |
|---|------------|----------|--------|
| 9 | **Kit de Resistencias** (1/4W) | 1 kit | €3-5 |
| 10 | **Kit de Capacitores Cerámicos** | 1 kit | €3-5 |
| 11 | **Capacitores Electrolíticos** | 1 kit | €3-4 |
| 12 | **Transistores 2N2222** (pack 10) | 1 pack | €1-2 |
| 13 | **Diodos 1N4148** (pack 100) | 1 pack | €1-2 |

**Subtotal Componentes Pasivos: €12-15** (menos que DevKit)

---

### Herramientas de Prototipado (XIAO)

| # | Herramienta | Cantidad | Precio | Enlace |
|---|-------------|----------|--------|--------|
| 14 | **Breadboard con adaptador XIAO** | 1 | €6-8 | [Breadboard](https://es.aliexpress.com/item/32822296504.html) |
| 15 | **Cables Jumper** (M-M, M-F, F-F) | 3 packs | €6 | [Jumpers](https://es.aliexpress.com/item/32833194748.html) |
| 16 | **Cable USB-C** (incluido con XIAO) | 1 | €0 | Incluido |
| 17 | **Adaptador/Breakout para XIAO** (opcional) | 1 | €3-5 | [XIAO Expansion](https://es.aliexpress.com/item/1005005973043115.html) |

**Subtotal Prototipado: €15-19**

**Nota sobre XIAO:** Es más pequeño y requiere adaptador o soldar headers directamente. Recomendamos breadboard expansion board para prototipado fácil.

---

### Herramientas Básicas (igual que Opción 1)

| # | Herramienta | Precio | ¿Necesario? |
|---|-------------|--------|-------------|
| 18 | **Soldador de temperatura regulable** 60W | €25-40 | ⭐ SÍ |
| 19 | **Estaño con Flux** (0.8mm, 50g) | €5-8 | ⭐ SÍ |
| 20 | **Multímetro Digital** | €8-15 | ⭐ SÍ |
| 21 | **Alicates de Corte** | €5-8 | ⭐ SÍ |

**Subtotal Herramientas Esenciales: €43-71**

---

## 💰 RESUMEN OPCIÓN 4: Kit XIAO ESP32-S3

| Categoría | Precio |
|-----------|--------|
| Componentes Principales | €45 |
| Componentes Pasivos | €13 |
| Prototipado | €17 |
| **TOTAL sin herramientas** | **€75** |
| + Herramientas esenciales (si no tienes) | +€43-71 |
| **TOTAL con herramientas** | **€118-146** |
| + Envío (estimado) | +€10-20 |
| **GRAN TOTAL** | **€128-166** |

### 🎯 Comparación XIAO vs ESP32 DevKit

| Característica | ESP32 DevKit | XIAO ESP32-S3 | Diferencia |
|----------------|--------------|---------------|------------|
| **Costo componentes** | €86 | €75 | **-€11** ✅ |
| **Costo total (con herramientas)** | €129-157 | €118-146 | **-€11** ✅ |
| **Tamaño microcontrolador** | 55x28mm | 21x17mm | **-76%** ✅ |
| **Peso** | 10g | 2.5g | **-75%** ✅ |
| **Módulos externos necesarios** | 4 (TP4056, AMS1117, USB-C, switch) | 0 | **-4** ✅ |
| **Conexiones de soldadura** | ~60 | ~30 | **-50%** ✅ |
| **PSRAM** | 0 MB | 8 MB | **+8MB** ✅ |
| **Python (MicroPython)** | Básico | Oficial | ✅ |
| **USB** | Micro-USB | USB-C | ✅ |
| **Facilidad breadboard** | Muy fácil | Requiere adaptador | ⚠️ |
| **Pines disponibles** | 30 GPIO | 11 GPIO | ⚠️ |
| **Documentación** | Abundante | Buena | ⚠️ |

### ✅ Ventajas del XIAO ESP32-S3

1. **Más económico:** Ahorro de €11 por unidad
2. **Ultra-compacto:** Terminal final 48% más pequeño
3. **Menos complejidad:** Sin módulos externos (TP4056, AMS1117)
4. **Mejor para Python:** 8MB PSRAM vs 0MB
5. **USB-C moderno:** Más confiable que Micro-USB
6. **Cargador integrado:** Simplifica circuito
7. **Producción:** 50% menos puntos de soldadura

### ⚠️ Consideraciones del XIAO

1. **Breadboard:** Necesita adaptador o breakout board (€3-5 extra)
2. **Pines limitados:** Solo 11 GPIO (pero suficientes para el proyecto)
3. **Menos documentación:** Comparado con ESP32 estándar
4. **Primera vez:** Si nunca usaste ESP32, mejor empezar con DevKit

### 💡 Estrategia Recomendada: Híbrida

**Para principiantes:**
```
Fase 1: Prototipo con ESP32 DevKit
→ Fácil de cablear en breadboard
→ Validar funcionalidad completa
→ Aprender ESP32
Costo: €139

Fase 2: PCB con XIAO ESP32-S3
→ Diseño compacto
→ Ahorro en producción
→ Producto final profesional
Costo adicional: €8 por XIAO
```

**Para usuarios con experiencia:**
```
Empezar directamente con XIAO ESP32-S3
→ Usar expansion board para prototipo
→ Menos componentes que comprar
→ Directo al diseño final
Costo: €128 (€11 ahorro)
```

---

### 📋 Lista de Compras XIAO (Copiar y Pegar)

```
COMPONENTES PRINCIPALES:
☐ 1x Seeed XIAO ESP32-S3
☐ 1x GM67 2D Barcode Scanner
☐ 1x OLED 1.3" SSD1306 I2C
☐ 1x Batería LiPo 3.7V 1000mAh
☐ 1x Buzzer Piezo 5V
☐ 1x Motor Vibración
☐ 1x Pack pulsadores 6x6mm
☐ 1x LED RGB común cátodo

COMPONENTES PASIVOS:
☐ 1x Kit resistencias
☐ 1x Kit capacitores cerámicos
☐ 1x Kit capacitores electrolíticos
☐ 1x Pack transistores 2N2222
☐ 1x Pack diodos 1N4148

PROTOTIPADO:
☐ 1x Breadboard 830 puntos
☐ 1x XIAO Expansion Board (opcional pero recomendado)
☐ 3x Packs cables jumper

HERRAMIENTAS (si no tienes):
☐ 1x Soldador 60W regulable
☐ 1x Estaño con flux
☐ 1x Multímetro digital
☐ 1x Alicates de corte
```

**Total estimado: €75 componentes + €17 prototipado + €43 herramientas = €135**

---

### 🔗 Enlaces Directos XIAO

**Microcontrolador:**
- [Seeed XIAO ESP32-S3 en AliExpress](https://es.aliexpress.com/item/1005005877531694.html) - €8
- [Seeed XIAO en tienda oficial](https://www.seeedstudio.com/XIAO-ESP32S3-p-5627.html) - $13.99

**Accesorios XIAO:**
- [XIAO Expansion Board](https://es.aliexpress.com/item/1005005973043115.html) - €5 (facilita prototipado)
- [Grove Shield para XIAO](https://es.aliexpress.com/item/1005003030051175.html) - €6 (sensores Grove)
- [Breakout Board](https://es.aliexpress.com/item/1005004668668880.html) - €3 (simple)

**Documentación:**
- [Wiki oficial XIAO ESP32-S3](https://wiki.seeedstudio.com/xiao_esp32s3_getting_started/)
- [Pinout diagram](https://files.seeedstudio.com/wiki/SeeedStudio-XIAO-ESP32S3/img/2.jpg)
- [Arduino examples](https://github.com/Seeed-Studio/Seeed_Arduino_XIAO)

---

## 🛒 DÓNDE COMPRAR - Proveedores Recomendados

### Opción A: AliExpress (Más Económico, 15-30 días)

**Ventajas:**
- ✅ Precios muy bajos
- ✅ Gran variedad
- ✅ Envío gratis en muchos productos

**Desventajas:**
- ❌ Envío lento (2-4 semanas)
- ❌ Calidad variable
- ❌ Soporte limitado

**Recomendación:** Ideal si no tienes prisa. Compra todo de una vez para ahorrar en envío.

### Opción B: Amazon España (Rápido, 1-3 días)

**Componentes disponibles en Amazon.es:**
- ESP32: €10-15 (más caro pero llega rápido)
- Breadboard + Jumpers: €12-15
- Multímetro: €15-20
- Soldador: €30-50
- Buzzer, LEDs, resistencias: €8-12 (kits)

**Scanner GM67:** NO disponible en Amazon → usar AliExpress

**Costo total Amazon:** €180-220 (sin scanner)

**Estrategia mixta:**
- Amazon: Herramientas y componentes comunes (llegan 2-3 días)
- AliExpress: Scanner, batería, OLED (llegan 2-3 semanas)

### Opción C: Tiendas Locales España

**Tiendas Electrónica:**
- **BricoGeek** (bricogeek.com) - Envío 24-48h, precios medios
- **ElectroCrea** (electrocrea.com) - Componentes Arduino/ESP32
- **RS Components** (es.rs-online.com) - Profesional, rápido, caro
- **Farnell** (es.farnell.com) - Similar a RS

**Ejemplo BricoGeek:**
- ESP32: €12-18
- OLED: €8-12
- Breadboard: €6-10
- **Scanner GM67:** NO disponible

**Costo total local:** €200-280 (sin scanner)

---

## 📋 LISTA DE COMPRAS PRÁCTICA - COPIA Y PEGA

### Para AliExpress (Pedido Único)

```
☐ 1x ESP32 DevKit V1 (30 pines)
☐ 1x GM67 2D Barcode Scanner Module
☐ 1x OLED 1.3" SSD1306 I2C
☐ 1x Batería LiPo 3.7V 3000mAh
☐ 1x Módulo TP4056 con protección
☐ 1x Módulo AMS1117-3.3V
☐ 1x Módulo USB Type-C breakout
☐ 1x Buzzer Piezo 5V
☐ 1x Motor Vibración coin type
☐ 1x Pack 100 pulsadores 6x6mm
☐ 1x LED RGB común cátodo
☐ 1x Interruptor slide switch
☐ 1x Kit resistencias (600pcs)
☐ 1x Kit capacitores cerámicos
☐ 1x Kit capacitores electrolíticos
☐ 1x Pack 10 transistores 2N2222
☐ 1x Pack 100 diodos 1N4148
☐ 2x Breadboard 830 puntos
☐ 3x Packs cables jumper (M-M, M-F, F-F)
☐ 1x Fuente breadboard MB-102

HERRAMIENTAS (si no tienes):
☐ 1x Soldador 60W temperatura regulable
☐ 1x Estaño con flux 0.8mm 50g
☐ 1x Multímetro digital
☐ 1x Alicates de corte
☐ 1x Pinzas antiestáticas
```

**Total estimado: €86 componentes + €43 herramientas = €129 + envío**

### Para Amazon España (Rápido)

```
☐ 1x ESP32 DevKit V1
☐ 1x Breadboard + Kit jumpers
☐ 1x Multímetro digital
☐ 1x Soldador temperatura regulable
☐ 1x Estaño con flux
☐ 1x Kit componentes pasivos (resistencias, capacitores)
☐ 1x OLED 1.3" I2C (si disponible)
```

**Luego en AliExpress:**
```
☐ GM67 Scanner (imprescindible, solo AliExpress)
☐ Batería LiPo 3000mAh
☐ Módulos de carga (TP4056, AMS1117)
```

---

## ⏱️ CRONOGRAMA DE COMPRA RECOMENDADO

### Semana 0 (HOY)
- 🛒 **Hacer pedido AliExpress** (todo lo anterior)
- 📅 Tiempo espera: 15-25 días

### Semana 1 (Mientras esperas)
- 📚 Estudiar tutoriales Arduino/ESP32
- 💻 Instalar Arduino IDE o PlatformIO
- 📖 Leer documentación del proyecto
- 🎓 Hacer curso básico de soldadura (YouTube)

### Semana 2-3 (Sigues esperando)
- 📘 Leer datasheets de componentes (ESP32, GM67, SSD1306)
- 🔧 Preparar espacio de trabajo
- ✅ Verificar instalación de drivers USB-Serial
- 📝 Revisar esquemático y planificar conexiones

### Semana 3-4 (Llegan componentes)
- 📦 Verificar que llegó todo
- 🔌 Primera prueba: ESP32 + Blink
- 🖥️ Segunda prueba: OLED display
- 📷 Tercera prueba: Scanner básico
- 🔗 Cuarta prueba: BLE básico

---

## 🎯 ESTRATEGIA DE COMPRA RECOMENDADA

### Para Principiantes (Primera vez con electrónica)
**Opción:** Kit Mínimo (€89) o Kit Básico (€139)
**Razón:** Valida que te gusta antes de invertir mucho

### Para Intermedios (Tienes experiencia Arduino)
**Opción:** Kit Básico (€139) con todas las herramientas
**Razón:** Balance perfecto precio/funcionalidad

### Para Avanzados (Quieres ir rápido)
**Opción:** Kit Premium (€265)
**Razón:** Backups, componentes extra, aceleras desarrollo

### Para Producción (Quieres hacer varios)
**Opción:** Comprar componentes para 5-10 unidades
**Razón:** Descuentos por volumen, piezas de repuesto

---

## 📦 CHECKLIST PRE-COMPRA

Antes de hacer el pedido, verifica:

```
☐ ¿Tengo herramientas básicas? (soldador, multímetro)
  → Si NO: añadir a pedido

☐ ¿Tengo cables USB adecuados?
  → ESP32 usa Micro-USB o USB-C (verificar modelo)

☐ ¿Tengo fuente de alimentación 5V?
  → Power bank USB sirve para testing inicial

☐ ¿Revisé los voltajes?
  → ESP32: 3.3V
  → Scanner GM67: 5V (4-5V rango)
  → OLED: 3.3V

☐ ¿Leí las especificaciones de los componentes?
  → Enlaces en la lista incluyen datasheets

☐ ¿Tengo espacio de trabajo?
  → Mesa limpia, buena iluminación, ventilación

☐ ¿Presupuesto confirmado?
  → €89 mínimo, €139 básico, €265 premium
```

---

## 💡 CONSEJOS DE COMPRA

### 1. Compra duplicados de componentes críticos
- **ESP32:** Si quemas uno, pierdes días esperando otro
- **Scanner:** Componente más caro, ten backup si es crítico

### 2. Calidad vs. Precio
- **Vale la pena pagar más:**
  - Soldador (diferencia enorme en facilidad)
  - Multímetro (los de €5 son inservibles)
  - Cables USB (los malos causan problemas raros)

- **No vale la pena pagar más:**
  - Resistencias y capacitores (los baratos funcionan igual)
  - Breadboards (todos son similares)
  - Jumpers (calidad suficiente en baratos)

### 3. Kits vs. Componentes Individuales
- **Kits:** Mejor para empezar (tienes variedad)
- **Individuales:** Si sabes exactamente qué necesitas

### 4. Verifica vendedor en AliExpress
- ⭐ Rating >4.5 estrellas
- 📦 >1000 pedidos
- 💬 Lee reseñas con fotos

### 5. Protección de Compra
- AliExpress: Protección de comprador 90 días
- PayPal: Protección adicional
- Amazon: Devoluciones fáciles 30 días

---

## 📞 ¿Problemas o Dudas?

### No encuentro un componente
- **GM67 Scanner:** Busca alternativas "DE2120", "QR Code Scanner Module 2D"
- **ESP32 DevKit:** Cualquier modelo de 30 pines sirve (ESP32-WROOM-32)
- **OLED:** Asegura que sea I2C (4 pines), no SPI (7 pines)

### Los precios son diferentes
- Precios fluctúan 10-20% en AliExpress
- Busca "ofertas flash" o "cupones de vendedor"
- Compra en fechas especiales (11.11, Black Friday, etc.)

### Tarda mucho el envío
- **Estándar:** 15-30 días desde China
- **ePacket:** 10-20 días (€2-5 extra)
- **DHL/FedEx:** 5-7 días (€15-25 extra)
- ¿Vale la pena Express? Solo si tienes prisa

### ¿Puedo sustituir componentes?
- **ESP32:** Cualquier modelo funciona (ESP32-WROOM)
- **Scanner:** Solo módulos UART 2D (GM65, GM67, DE2120)
- **OLED:** Debe ser SSD1306 I2C 1.3" (o 0.96")
- **Batería:** Cualquier LiPo 3.7V entre 2000-4000mAh

---

## ✅ PRÓXIMOS PASOS DESPUÉS DE COMPRAR

1. **Mientras esperas el envío:**
   - Lee la [Guía de Ensamblaje](05_GUIA_ENSAMBLAJE.md)
   - Instala Arduino IDE + librerías
   - Haz tutoriales básicos de ESP32

2. **Cuando lleguen los componentes:**
   - Verifica que todo esté completo
   - Prueba cada componente individualmente
   - Sigue [Fase 1 del Roadmap](06_ROADMAP.md)

3. **Problemas comunes:**
   - ESP32 no reconocido: Instalar driver CP2102/CH340
   - OLED no muestra: Verificar dirección I2C (0x3C vs 0x3D)
   - Scanner no lee: Verificar voltaje 5V y baudrate 9600

---

## 🎉 ¡Listo para Comprar!

**Resumen final:**
- 💰 **Presupuesto mínimo:** €89 (solo componentes)
- 💰 **Presupuesto recomendado:** €139 (componentes + herramientas)
- 💰 **Presupuesto óptimo:** €265 (todo + extras)
- ⏱️ **Tiempo de espera:** 2-4 semanas (AliExpress)
- ⏱️ **Tiempo de montaje:** 2-3 días (primera vez)

**¿Alguna duda antes de hacer el pedido?** 🚀
