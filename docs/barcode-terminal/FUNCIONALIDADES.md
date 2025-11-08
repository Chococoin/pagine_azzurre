# Funcionalidades del Terminal de Mensajería

## 📺 Capacidad de Pantalla OLED

### Especificaciones Técnicas
- **Pantalla:** SSD1306 OLED 1.3"
- **Resolución:** 128x64 píxeles
- **Tipo:** Monocroma (blanco o azul sobre negro)

### Caracteres Disponibles por Tamaño de Fuente

| Tamaño Fuente | Dimensión Carácter | Caracteres/Línea | Líneas | Total Caracteres |
|---------------|--------------------|-----------------:|-------:|-----------------:|
| **Tamaño 1** | 6x8 píxeles | 21 | 8 | 168 |
| **Tamaño 2** | 12x16 píxeles | 10 | 4 | 40 |
| **Tamaño 3** | 18x24 píxeles | 7 | 2-3 | 14-21 |

### Layout Recomendado (Modo Mixto)

```
┌─────────────────────┐ ← 128px ancho
│  TITULO GRANDE  │    ← Líneas 1-2: Tamaño 2 (10 chars)
│─────────────────────│
│Info detallada aqui  │    ← Líneas 3-8: Tamaño 1 (21 chars)
│Codigo: 123456789012│
│Hora: 14:32:15       │
│Estado: Confirmado   │
│Bat: 85%   BLE: OK   │
│[Presiona OK]        │
└─────────────────────┘
   ↑ 64px alto
```

---

## 🎯 FUNCIONALIDADES PRINCIPALES

### 1. Escaneo de Códigos de Barras

#### 1.1 Tipos de Códigos Soportados
- ✅ **1D:** EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, ITF
- ✅ **2D:** QR Code, DataMatrix, PDF417, Aztec Code

#### 1.2 Modos de Escaneo

**Modo A: Automático (por defecto)**
```
1. Scanner activo continuamente
2. Detecta código automáticamente
3. Lee y procesa
4. Beep + vibración de confirmación
```

**Modo B: Manual (botón SCAN)**
```
1. Usuario presiona BTN_SCAN
2. Scanner se activa por 5 segundos
3. Lee código si detecta
4. Se apaga automáticamente
```

**Modo C: Trigger externo**
```
1. Pin TRIG activa scanner
2. Útil para integración futura
```

#### 1.3 Pantalla Durante Escaneo

```
┌─────────────────────┐
│  ESCANEANDO │        Tamaño 2, centrado
│─────────────────────│
│                     │        Animación:
│    ▓▓▓░░░░░░░      │        Barra de progreso
│                     │        o
│  Apunta al codigo   │        Icono parpadeando
│                     │
│  Bat: 85%           │        Info bottom
└─────────────────────┘
```

**Timeout:** 5 segundos → vuelve a pantalla principal

---

### 2. Visualización de Códigos Escaneados

#### 2.1 Pantalla de Confirmación Inmediata

```
┌─────────────────────┐
│ CODIGO LEIDO │       ← Tamaño 2, verde/blanco
│─────────────────────│
│8412345678901        │       ← Tamaño 1
│                     │          Word-wrap si >21 chars
│Tipo: EAN-13         │       ← Detección automática
│Hora: 14:32:15       │
│Estado: Enviando...  │       ← Animación puntos
│                     │
│Bat: 85%   BLE: OK   │       ← Status bar
└─────────────────────┘
```

**Duración:** 3 segundos → vuelve a pantalla principal

#### 2.2 Código Muy Largo (>21 caracteres)

```
┌─────────────────────┐
│ CODIGO LEIDO │
│─────────────────────│
│12345678901234567890 │       ← Línea 1 (21 chars)
│12345678901234567890 │       ← Línea 2 (21 chars)
│123                  │       ← Línea 3 (resto)
│                     │
│QR Code - 43 chars   │       ← Info adicional
│Hora: 14:32          │
│Bat: 85%   BLE: OK   │
└─────────────────────┘
```

**Auto-scroll:** Si >63 caracteres, hacer scroll vertical

---

### 3. Estados del Sistema

#### 3.1 Pantalla Principal (Idle)

```
┌─────────────────────┐
│  TERMINAL   │        ← Tamaño 2
│ MENSAJERIA  │
│─────────────────────│
│Listo para escanear  │
│                     │
│Paquetes hoy: 42     │       ← Contador diario
│Ultimo: 14:28        │       ← Último escaneo
│                     │
│Bat: 85%   BLE: OK   │       ← Status permanente
└─────────────────────┘

Indicadores BLE:
- "BLE: OK" = Conectado (verde si color)
- "BLE: --" = Desconectado (rojo si color)
- "BLE: ?" = Buscando (amarillo si color)
```

#### 3.2 Enviando Datos (vía BLE)

```
┌─────────────────────┐
│  ENVIANDO   │        ← Tamaño 2
│─────────────────────│
│▓▓▓▓▓▓▓▓▓▓░░░░░     │       ← Barra progreso
│                     │
│Codigo: 841234567... │
│al smartphone        │
│                     │
│Por favor espera...  │
└─────────────────────┘
```

**Timeout:** 5 segundos max → mostrar error si falla

#### 3.3 Éxito

```
┌─────────────────────┐
│   ENVIADO   │        ← Tamaño 2, negrita
│     ✓       │        ← Icono checkmark
│─────────────────────│
│                     │
│Codigo registrado    │
│en el sistema        │
│                     │
│Siguiente paquete... │
└─────────────────────┘
```

**Duración:** 2 segundos → vuelve a principal

#### 3.4 Error

```
┌─────────────────────┐
│    ERROR    │        ← Tamaño 2, invertido
│     ✗       │        ← Icono X
│─────────────────────│
│Sin conexion BLE     │       ← Mensaje de error
│                     │
│Reintenta:           │
│[OK] Reintentar      │
│[SCAN] Nuevo codigo  │
│                     │
└─────────────────────┘
```

**Errores posibles:**
- Sin conexión BLE
- Timeout de scanner
- Código inválido
- Batería crítica
- Error de transmisión

---

### 4. Menú de Información (Botón OK largo)

#### 4.1 Pantalla de Info

```
┌─────────────────────┐
│   INFO TERMINAL  │   ← Tamaño 1
│─────────────────────│
│ID: CT-A1B2C3D4      │       ← Device ID
│Firmware: v1.0.2     │
│Bateria: 3.87V (85%) │
│BLE: Conectado       │
│Smartphone: OnePlus  │       ← Nombre dispositivo
│Codigos hoy: 42      │
│Ultimo: 8412345...   │
│Uptime: 3h 24m       │
└─────────────────────┘
```

**Navegación:**
- Presión corta OK → Volver
- Auto-retorno en 10 segundos

#### 4.2 Estadísticas del Día

```
┌─────────────────────┐
│  ESTADISTICAS  │
│─────────────────────│
│Codigos hoy: 42      │
│Entregados: 38       │
│Recogidos: 4         │
│Errores: 2           │
│                     │
│Primera: 08:45       │
│Ultima: 14:32        │
│                     │
└─────────────────────┘
```

#### 4.3 Gestión de Batería

```
┌─────────────────────┐
│   BATERIA    │
│─────────────────────│
│Nivel: 85%           │
│Voltaje: 3.87V       │
│                     │
│▓▓▓▓▓▓▓▓▓░░░░░░     │       ← Barra visual
│                     │
│Tiempo restante:     │
│  ~8 horas           │       ← Estimación
│                     │
└─────────────────────┘
```

**Alertas de batería:**
- <20%: Icono batería baja
- <10%: Mensaje "Cargar pronto"
- <5%: Mensaje "Batería crítica" + beep cada 30s

---

### 5. Configuración (Futuro)

#### 5.1 Menú de Configuración

```
┌─────────────────────┐
│  CONFIG      │
│─────────────────────│
│> Brillo pantalla    │       ← Navegable
│  Sonido: ON         │
│  Vibracion: ON      │
│  Auto-sleep: 30s    │
│  Idioma: Español    │
│  Reset contador     │
│                     │
│[OK] [SCAN] navegar  │
└─────────────────────┘
```

#### 5.2 Ajuste de Brillo

```
┌─────────────────────┐
│ BRILLO OLED  │
│─────────────────────│
│                     │
│▓▓▓▓▓▓▓░░░░░░░      │       ← 50%
│                     │
│Bajo  ───────  Alto  │
│                     │
│[SCAN] - / [OK] +    │
└─────────────────────┘
```

---

### 6. Feedback Visual, Sonoro y Táctil

#### 6.1 LED RGB - Códigos de Color

| Estado | Color LED | Duración | Significado |
|--------|-----------|----------|-------------|
| **Idle** | Verde fijo | Continuo | Listo para escanear |
| **Escaneando** | Azul parpadeante | 1-5s | Procesando código |
| **Enviando** | Azul fijo | 1-3s | Transmitiendo BLE |
| **Éxito** | Verde 2 parpadeos | 1s | Código enviado OK |
| **Error** | Rojo 3 parpadeos | 2s | Fallo en operación |
| **Sin BLE** | Amarillo parpadeante | Continuo | Esperando conexión |
| **Batería baja** | Rojo fijo | Continuo | <10% batería |

#### 6.2 Buzzer - Patrones de Sonido

| Evento | Patrón | Frecuencia | Duración |
|--------|--------|------------|----------|
| **Código escaneado** | Beep-Beep corto | 2000Hz + 2500Hz | 100ms + 100ms |
| **Enviado exitoso** | Beep triple ascendente | 1500-2000-2500Hz | 100ms cada uno |
| **Error** | Beep doble grave | 500Hz + 300Hz | 200ms cada uno |
| **Botón presionado** | Beep simple | 1500Hz | 50ms |
| **Batería crítica** | Beep largo grave | 400Hz | 500ms (cada 30s) |
| **BLE conectado** | Melodía corta | 1500-2000-2500Hz | 50ms cada uno |

#### 6.3 Vibración - Patrones

| Evento | Patrón | Duración |
|--------|--------|----------|
| **Código escaneado** | Pulso simple | 100ms |
| **Enviado OK** | Doble pulso | 100ms + pausa + 100ms |
| **Error** | Triple pulso corto | 50ms + 50ms + 50ms |
| **Botón presionado** | Pulso muy corto | 30ms |
| **Alerta crítica** | Pulso largo | 300ms |

---

## 📊 Flujo de Navegación

### Diagrama de Estados

```
┌──────────────┐
│   INICIO     │
│  (Splash)    │
└──────┬───────┘
       │ 2 segundos
       ▼
┌──────────────┐
│  PRINCIPAL   │◄────────────┐
│   (Idle)     │             │
└──┬───┬───┬───┘             │
   │   │   │                 │
   │   │   │ BTN_OK largo    │
   │   │   └────────►┌───────┴──────┐
   │   │             │  MENU INFO   │
   │   │             └──────────────┘
   │   │
   │   │ BTN_SCAN
   │   └────────►┌──────────────┐
   │             │  ESCANEANDO  │
   │             └──────┬───────┘
   │                    │ Código detectado
   │                    ▼
   │             ┌──────────────┐
   │             │CONFIRMACION  │
   │             │   CODIGO     │
   │             └──────┬───────┘
   │                    │
   │                    ▼
   │             ┌──────────────┐
   │             │  ENVIANDO    │──┐ Error
   │             │   (BLE)      │  │
   │             └──────┬───────┘  │
   │                    │ OK       │
   │                    ▼          ▼
   │             ┌──────────┐  ┌──────┐
   │             │  EXITO   │  │ERROR │
   │             └──────┬───┘  └───┬──┘
   │                    │          │
   └────────────────────┴──────────┘
        Auto-retorno a PRINCIPAL
```

---

## 🔢 Limitaciones de Caracteres por Pantalla

### Códigos de Barras Largos

**Problema:** Códigos >21 caracteres no caben en una línea

**Soluciones implementadas:**

#### Opción A: Word-Wrap Automático
```
Código de 45 caracteres:
┌─────────────────────┐
│123456789012345678901│ ← Línea 1 (21 chars)
│234567890123456789012│ ← Línea 2 (21 chars)
│345                  │ ← Línea 3 (3 chars)
```

#### Opción B: Scroll Horizontal
```
Animación cada 500ms:
Frame 1: │12345678901234567890│
Frame 2: │23456789012345678901│
Frame 3: │34567890123456789012│
...
```

#### Opción C: Mostrar Parcial + Tipo
```
┌─────────────────────┐
│Codigo QR largo:     │
│1234567890...234567  │ ← Inicio...fin
│(45 caracteres)      │
│Hash: A3F2E1         │ ← Identificador corto
└─────────────────────┘
```

### Mensajes de Estado

**Longitud máxima recomendada por línea:**
- Tamaño 1: 21 caracteres
- Tamaño 2: 10 caracteres

**Abreviaciones estándar:**
```
✅ Bueno:
"Bat: 85%   BLE: OK"     → 19 chars (cabe)
"Enviando..."            → 13 chars (cabe)

❌ Evitar:
"Batería al ochenta y cinco por ciento" → 39 chars (NO cabe)

✅ Mejor:
"Bat: 85%"               → 9 chars
```

---

## 🎨 Templates de Pantalla (Reutilizables)

### Template 1: Mensaje Simple
```cpp
void mostrarMensajeSimple(String titulo, String mensaje) {
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(0, 0);
  display.println(titulo);      // Máx 10 chars

  display.setTextSize(1);
  display.setCursor(0, 25);
  display.println(mensaje);     // Máx 21 chars x 3 líneas

  mostrarStatusBar();           // Bat + BLE
  display.display();
}
```

### Template 2: Lista de Ítems
```cpp
void mostrarLista(String items[], int cantidad) {
  display.clearDisplay();
  display.setTextSize(1);

  for(int i = 0; i < min(cantidad, 7); i++) {
    display.setCursor(0, i * 8);
    display.println(items[i]);  // Máx 21 chars
  }

  mostrarStatusBar();
  display.display();
}
```

### Template 3: Progreso
```cpp
void mostrarProgreso(String texto, int porcentaje) {
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(0, 0);
  display.println(texto);

  // Barra de progreso
  int ancho = (porcentaje * 118) / 100;
  display.drawRect(5, 25, 118, 15, WHITE);
  display.fillRect(7, 27, ancho, 11, WHITE);

  display.setTextSize(1);
  display.setCursor(55, 45);
  display.print(porcentaje);
  display.println("%");

  display.display();
}
```

---

## 🔋 Gestión de Energía y Pantalla

### Auto-apagado de Pantalla

**Niveles de ahorro:**

#### Nivel 1: Dimming (30 segundos inactividad)
```
Brillo: 100% → 30%
Consumo: ~20mA → ~6mA
Reversión: Cualquier botón o escaneo
```

#### Nivel 2: Apagado (1 minuto inactividad)
```
Pantalla: OFF
Consumo: ~20mA → 0mA
Reversión: Botón SCAN
Mantiene: BLE activo, scanner en standby
```

#### Nivel 3: Deep Sleep (5 minutos inactividad, sin BLE)
```
ESP32: Deep sleep
Consumo total: ~0.15mA
Reversión: Botón físico SCAN (wake-up)
Reinicia: Todo el sistema
```

### Wake-up Pantalla

**Animación de activación:**
```
Frame 1: ░░░░░░░░░░  (0% brillo)
Frame 2: ▒▒▒▒▒▒▒▒▒▒  (50% brillo)
Frame 3: ▓▓▓▓▓▓▓▓▓▓  (100% brillo)
Duración: 300ms total
```

---

## 📱 Interacción con Smartphone

### Mensajes del Smartphone → Terminal

El terminal puede recibir y mostrar mensajes del smartphone:

#### Confirmación de Recepción
```
┌─────────────────────┐
│ CONFIRMADO  │
│─────────────────────│
│Paquete #8412345678  │
│registrado           │
│                     │
│Destinatario:        │
│Juan Perez           │
│C/ Mayor 123         │
└─────────────────────┘
```

#### Alerta de Error
```
┌─────────────────────┐
│   ATENCION  │
│─────────────────────│
│Codigo duplicado     │
│                     │
│Ya escaneado hoy a   │
│las 10:32            │
│                     │
│[OK] Continuar       │
└─────────────────────┘
```

#### Notificaciones
```
┌─────────────────────┐
│ NOTIFICACION │
│─────────────────────│
│Nuevo pedido         │
│urgente:             │
│                     │
│Recoger en:          │
│C/ Gran Via 45       │
│15:00 - 17:00        │
└─────────────────────┘
```

---

## 🚀 Funcionalidades Futuras (Roadmap)

### Versión 1.1
- [ ] Caché de códigos offline (hasta 100 códigos)
- [ ] Sincronización batch cuando recupera BLE
- [ ] Contador de intentos de envío
- [ ] Timestamp local (RTC)

### Versión 1.2
- [ ] WiFi como backup de BLE
- [ ] Actualización de firmware OTA
- [ ] Múltiples idiomas (ES, EN, FR)
- [ ] Personalización de mensajes

### Versión 2.0
- [ ] Pantalla color (IPS 1.3" 240x240)
- [ ] Fotos de paquetes (cámara adicional)
- [ ] GPS tracking (módulo GPS)
- [ ] Firma digital en pantalla táctil

---

## 📏 Resumen de Capacidades

| Aspecto | Capacidad |
|---------|-----------|
| **Líneas disponibles (tamaño 1)** | 8 líneas |
| **Caracteres por línea (tamaño 1)** | 21 caracteres |
| **Total caracteres (tamaño 1)** | 168 caracteres |
| **Códigos de barras largos** | Word-wrap automático |
| **Máximo código sin scroll** | 63 caracteres (3 líneas) |
| **Estados simultáneos** | 1 pantalla activa |
| **Tiempo actualización pantalla** | ~20-50ms |
| **Consumo pantalla ON** | ~20mA |
| **Consumo pantalla OFF** | 0mA |

---

## ✅ Checklist de Funcionalidades Implementadas

### Core (v1.0)
- ✅ Escaneo automático de códigos
- ✅ Escaneo manual (botón)
- ✅ Envío BLE inmediato
- ✅ Feedback visual (OLED)
- ✅ Feedback sonoro (buzzer)
- ✅ Feedback táctil (vibración)
- ✅ Indicador de batería
- ✅ Indicador de conexión BLE
- ✅ Auto-apagado de pantalla

### Extras (v1.0)
- ✅ Menú de información
- ✅ Contador de códigos diarios
- ✅ Timestamp de último escaneo
- ✅ Detección de tipo de código
- ✅ Word-wrap para códigos largos
- ✅ Animaciones de progreso
- ✅ Manejo de errores visual

### Pendientes (v1.1+)
- ⬜ Caché offline
- ⬜ Configuración de brillo
- ⬜ Múltiples idiomas
- ⬜ Estadísticas avanzadas
- ⬜ Actualización OTA
- ⬜ WiFi backup

---

**Documentación:** v1.0
**Última actualización:** 2025-01-08
