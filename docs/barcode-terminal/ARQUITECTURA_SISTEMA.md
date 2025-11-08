# Arquitectura del Sistema de Tracking

## 🏗️ Visión General

El terminal de códigos de barras es parte de un sistema completo de tracking de envíos que funciona así:

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  TERMINAL   │   BLE   │ SMARTPHONE  │   API   │  BACKEND    │
│  Mensajero  ├────────►│  Mensajero  ├────────►│  Central    │
└─────────────┘         └─────────────┘         └─────────────┘
      │                        │                        │
   Escanea              Procesa y envía          Actualiza DB
   códigos              (4G/WiFi/Datos)          y tracking
```

### Componentes del Sistema:

1. **Terminal de Códigos de Barras**
   - Lee códigos QR/barras de paquetes
   - Envía por Bluetooth Low Energy (BLE)
   - Sin internet propio (no necesita 4G/WiFi)

2. **Smartphone del Mensajero** (Android)
   - Recibe datos del terminal via BLE
   - Tiene app dedicada
   - Envía a backend via WiFi/4G/Datos móviles
   - Puede funcionar offline (caché)

3. **Backend/Central** (Servidor)
   - Recibe actualizaciones de estado
   - Actualiza base de datos
   - Notifica a clientes
   - Dashboard web de tracking

---

## 🔄 Flujo de Datos Completo

### Escenario 1: Entrega de Paquete

```
PASO 1: Mensajero llega a destino
┌─────────────────────────────────────────────────────────────┐
│ Terminal (en mano del mensajero)                            │
│                                                             │
│ 1. Mensajero presiona botón SCAN                           │
│ 2. Terminal lee código de barras: "8412345678901"          │
│ 3. Terminal muestra en pantalla:                           │
│    ┌─────────────────────┐                                 │
│    │ CODIGO LEIDO │                                        │
│    │8412345678901        │                                 │
│    │Estado: Enviando...  │                                 │
│    └─────────────────────┘                                 │
│ 4. Beep + vibración de confirmación                        │
└─────────────────────────────────────────────────────────────┘
              │
              │ BLE (Bluetooth Low Energy)
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Smartphone (en bolsillo del mensajero)                      │
│                                                             │
│ 5. App recibe via BLE:                                     │
│    {                                                        │
│      "type": "barcode",                                    │
│      "code": "8412345678901",                              │
│      "device": "CT-A1B2C3D4",                              │
│      "timestamp": 1699876543210,                           │
│      "battery": 85                                         │
│    }                                                        │
│                                                             │
│ 6. App busca paquete en DB local:                          │
│    - Paquete #8412345678901                                │
│    - Destinatario: Juan Pérez                              │
│    - Dirección: C/ Mayor 123                               │
│    - Estado actual: "En tránsito"                          │
│                                                             │
│ 7. App muestra diálogo:                                    │
│    ┌───────────────────────────────┐                       │
│    │ Confirmar entrega             │                       │
│    │ Paquete: 8412345678901        │                       │
│    │ Destinatario: Juan Pérez      │                       │
│    │ ¿Entregado?                   │                       │
│    │ [SÍ]  [NO - Problema]         │                       │
│    └───────────────────────────────┘                       │
│                                                             │
│ 8. Mensajero confirma "SÍ"                                 │
│                                                             │
│ 9. App actualiza estado local:                             │
│    - Estado: "Entregado"                                   │
│    - Fecha entrega: 2024-11-08 14:32:15                   │
│    - Geolocalización: 40.4168, -3.7038                    │
│    - Foto (opcional): captura con cámara                   │
│    - Firma (opcional): firma digital                       │
│                                                             │
│ 10. App envía confirmación al terminal:                    │
│     {                                                       │
│       "type": "ack",                                       │
│       "code": "8412345678901",                             │
│       "status": "success",                                 │
│       "message": "Paquete entregado"                       │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
              │
              │ HTTP POST (4G/WiFi)
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend/API Central                                         │
│                                                             │
│ 11. API recibe POST /api/deliveries:                       │
│     {                                                       │
│       "tracking_code": "8412345678901",                    │
│       "status": "delivered",                               │
│       "delivered_at": "2024-11-08T14:32:15Z",              │
│       "courier_id": "COURIER_123",                         │
│       "device_id": "CT-A1B2C3D4",                          │
│       "location": {                                        │
│         "lat": 40.4168,                                    │
│         "lng": -3.7038                                     │
│       },                                                    │
│       "photo_url": "https://cdn.../delivery123.jpg"        │
│     }                                                       │
│                                                             │
│ 12. Backend actualiza base de datos:                       │
│     UPDATE packages                                         │
│     SET status = 'delivered',                              │
│         delivered_at = '2024-11-08 14:32:15',              │
│         courier_id = 'COURIER_123',                        │
│         delivery_location = '40.4168,-3.7038'              │
│     WHERE tracking_code = '8412345678901'                  │
│                                                             │
│ 13. Backend envía notificaciones:                          │
│     - Email al cliente: "Paquete entregado"                │
│     - SMS (opcional): "Su paquete ha sido entregado"       │
│     - Push notification a app cliente                      │
│     - Webhook a sistema del comercio                       │
│                                                             │
│ 14. Backend responde a app:                                │
│     {                                                       │
│       "success": true,                                     │
│       "message": "Delivery confirmed",                     │
│       "next_delivery": {                                   │
│         "tracking_code": "7623456789012",                  │
│         "address": "C/ Sol 45"                             │
│       }                                                     │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
              │
              │ Cliente puede ver tracking
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Dashboard Web / App Cliente                                 │
│                                                             │
│ 15. Cliente ve actualización en tiempo real:               │
│     ┌─────────────────────────────────────┐                │
│     │ Tracking: 8412345678901             │                │
│     │ ✓ Paquete entregado                 │                │
│     │ 08/11/2024 14:32                    │                │
│     │ [Ver ubicación en mapa]             │                │
│     │ [Ver foto de entrega]               │                │
│     └─────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 Comunicación BLE Terminal ↔ Smartphone

### Terminal envía → Smartphone recibe

#### Mensaje 1: Código Escaneado
```json
{
  "type": "barcode",
  "code": "8412345678901",
  "device": "CT-A1B2C3D4",
  "timestamp": 1699876543210,
  "battery": 85,
  "scan_type": "auto"  // o "manual"
}
```

### Smartphone envía → Terminal recibe

#### Mensaje 1: Confirmación (ACK)
```json
{
  "type": "ack",
  "code": "8412345678901",
  "status": "success",
  "message": "Paquete registrado",
  "next_action": "continue"
}
```

#### Mensaje 2: Error
```json
{
  "type": "ack",
  "code": "8412345678901",
  "status": "error",
  "message": "Código no encontrado",
  "action": "retry"
}
```

#### Mensaje 3: Información de Paquete (opcional)
```json
{
  "type": "package_info",
  "code": "8412345678901",
  "recipient": "Juan Perez",
  "address": "C/ Mayor 123",
  "instructions": "Llamar al timbre 2B"
}
```

---

## 📱 App Android - Funcionalidades Clave

### Pantalla Principal

```
┌─────────────────────────────────────┐
│ 📦 Courier Delivery App             │
├─────────────────────────────────────┤
│                                     │
│ 🟢 Terminal conectado               │
│    CT-A1B2C3D4 | Bat: 85%           │
│                                     │
│ 📊 Pendientes hoy: 12               │
│ ✓  Entregados: 8                    │
│ 📍 Siguiente: C/ Mayor 123          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Últimos escaneos:               │ │
│ │                                 │ │
│ │ ✓ 14:32 | 8412345678901         │ │
│ │   Entregado - Juan Pérez        │ │
│ │                                 │ │
│ │ ✓ 14:15 | 7623456789012         │ │
│ │   Entregado - María García      │ │
│ │                                 │ │
│ │ ⏳ 14:01 | 6534567890123         │ │
│ │   Pendiente sincronizar         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [🔍 Buscar paquete]                 │
│ [📋 Lista completa]                 │
│ [⚙️ Configuración]                  │
└─────────────────────────────────────┘
```

### Flujo de Confirmación de Entrega

```
1. Escaneo → App recibe código via BLE
              ↓
2. ┌─────────────────────────────────┐
   │ Código: 8412345678901           │
   │ Destinatario: Juan Pérez        │
   │ Dirección: C/ Mayor 123         │
   │                                 │
   │ ¿Acción?                        │
   │ [✓ Entregado]                   │
   │ [📦 Recogido]                   │
   │ [❌ No disponible]               │
   │ [↩️ Devolver]                   │
   └─────────────────────────────────┘
              ↓
3. Si "Entregado":
   ┌─────────────────────────────────┐
   │ Confirmar entrega               │
   │                                 │
   │ [📷 Tomar foto] (opcional)      │
   │ [✍️ Firma digital] (opcional)   │
   │                                 │
   │ Observaciones:                  │
   │ ┌─────────────────────────────┐ │
   │ │ Entregado en recepción      │ │
   │ └─────────────────────────────┘ │
   │                                 │
   │ [✓ Confirmar]  [✗ Cancelar]    │
   └─────────────────────────────────┘
              ↓
4. App envía a backend
              ↓
5. Backend responde OK
              ↓
6. App envía ACK al terminal
              ↓
7. Terminal muestra "ENVIADO ✓"
```

---

## 🗄️ Backend/API - Estructura

### Endpoints Principales

#### POST /api/deliveries
Registrar entrega de paquete

**Request:**
```json
{
  "tracking_code": "8412345678901",
  "status": "delivered",  // "delivered", "picked_up", "failed", "returned"
  "courier_id": "COURIER_123",
  "device_id": "CT-A1B2C3D4",
  "timestamp": "2024-11-08T14:32:15Z",
  "location": {
    "lat": 40.4168,
    "lng": -3.7038
  },
  "notes": "Entregado en recepción",
  "photo_url": "https://cdn.../photo.jpg",
  "signature_url": "https://cdn.../signature.png"
}
```

**Response:**
```json
{
  "success": true,
  "delivery_id": "DEL_456789",
  "message": "Delivery confirmed",
  "next_package": {
    "tracking_code": "7623456789012",
    "recipient": "María García",
    "address": "C/ Sol 45",
    "instructions": "Timbre 3A"
  }
}
```

#### GET /api/packages/pending
Obtener paquetes pendientes para un mensajero

**Response:**
```json
{
  "packages": [
    {
      "tracking_code": "7623456789012",
      "type": "delivery",
      "recipient": "María García",
      "address": "C/ Sol 45",
      "phone": "+34 600 123 456",
      "instructions": "Timbre 3A",
      "priority": "normal",
      "time_window": "14:00-18:00"
    },
    {
      "tracking_code": "6534567890123",
      "type": "pickup",
      "sender": "Tech Store",
      "address": "C/ Gran Vía 100",
      "phone": "+34 600 789 012",
      "instructions": "Preguntar por José",
      "priority": "urgent"
    }
  ],
  "total": 12,
  "route_optimized": true
}
```

#### POST /api/tracking/update
Actualizar estado de tracking

**Request:**
```json
{
  "tracking_code": "8412345678901",
  "status": "in_transit",
  "location": {
    "lat": 40.4168,
    "lng": -3.7038
  },
  "courier_id": "COURIER_123"
}
```

---

## 🔄 Funcionamiento Offline

### Problema: ¿Qué pasa si el smartphone pierde conexión?

**Solución: Caché Local**

```
┌─────────────────────────────────────────────────────────────┐
│ App Android - Modo Offline                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. App detecta que no hay internet (WiFi/4G)               │
│                                                             │
│ 2. Al recibir escaneo:                                     │
│    - Guardar en SQLite local                               │
│    - Mostrar icono "⏳ Pendiente sincronizar"              │
│    - NO enviar a backend (imposible)                       │
│    - SÍ enviar ACK al terminal (confirmación local)        │
│                                                             │
│ 3. Continuar funcionando normalmente:                      │
│    ┌─────────────────────────────────┐                     │
│    │ 🔴 Sin conexión                 │                     │
│    │ 3 entregas pendientes           │                     │
│    │ sincronizar                     │                     │
│    │                                 │                     │
│    │ ⏳ 14:32 | 8412345678901        │                     │
│    │ ⏳ 14:15 | 7623456789012        │                     │
│    │ ⏳ 14:01 | 6534567890123        │                     │
│    └─────────────────────────────────┘                     │
│                                                             │
│ 4. Cuando recupera conexión:                               │
│    - Detectar WiFi/4G activo                               │
│    - Sincronizar automáticamente en lote:                  │
│      POST /api/deliveries/batch                            │
│      [                                                      │
│        { tracking: "8412...", status: "delivered", ... },  │
│        { tracking: "7623...", status: "delivered", ... },  │
│        { tracking: "6534...", status: "delivered", ... }   │
│      ]                                                      │
│    - Actualizar estado local → ✓ Sincronizado              │
│                                                             │
│ 5. Mostrar notificación:                                   │
│    "✓ 3 entregas sincronizadas con el servidor"           │
└─────────────────────────────────────────────────────────────┘
```

### Base de Datos Local (SQLite)

```sql
CREATE TABLE deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_code TEXT NOT NULL,
    status TEXT NOT NULL,  -- 'delivered', 'picked_up', etc.
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    courier_id TEXT,
    device_id TEXT,
    latitude REAL,
    longitude REAL,
    notes TEXT,
    photo_path TEXT,
    signature_path TEXT,
    synced INTEGER DEFAULT 0,  -- 0 = no sincronizado, 1 = sincronizado
    synced_at TIMESTAMP,
    server_id TEXT  -- ID del backend después de sincronizar
);

CREATE INDEX idx_synced ON deliveries(synced);
CREATE INDEX idx_tracking ON deliveries(tracking_code);
```

---

## 📊 Dashboard Web (Central)

### Vista de Tracking en Tiempo Real

```
┌─────────────────────────────────────────────────────────────┐
│ 🏢 Dashboard Central - Tracking en Vivo                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📊 Resumen del día:                                         │
│ ┌──────────┬──────────┬──────────┬──────────┐              │
│ │ Pendiente│ En ruta  │Entregados│  Errores │              │
│ │   42     │    18    │   156    │     3    │              │
│ └──────────┴──────────┴──────────┴──────────┘              │
│                                                             │
│ 🗺️ Mapa en vivo:                                           │
│ ┌─────────────────────────────────────────────────┐        │
│ │                                                 │        │
│ │    📍 Mensajero 1 (8 entregas)                  │        │
│ │         ↓ En C/ Mayor 123                       │        │
│ │                                                 │        │
│ │              📍 Mensajero 2 (5 entregas)        │        │
│ │                   ↓ En C/ Sol 45                │        │
│ │                                                 │        │
│ │    📍 Mensajero 3 (12 entregas)                 │        │
│ │         ↓ En ruta                               │        │
│ └─────────────────────────────────────────────────┘        │
│                                                             │
│ 📋 Últimas actualizaciones:                                │
│ ┌─────────────────────────────────────────────────┐        │
│ │ 14:32 | ✓ Entregado | 8412345678901            │        │
│ │       Juan Pérez - C/ Mayor 123                │        │
│ │       Mensajero: COURIER_123                   │        │
│ │                                                 │        │
│ │ 14:15 | ✓ Entregado | 7623456789012            │        │
│ │       María García - C/ Sol 45                 │        │
│ │                                                 │        │
│ │ 14:01 | ❌ No disponible | 6534567890123        │        │
│ │       Pedro Ruiz - C/ Alcalá 200               │        │
│ │       Nota: "Nadie en casa - llamar mañana"    │        │
│ └─────────────────────────────────────────────────┘        │
│                                                             │
│ [🔍 Buscar paquete]  [📊 Reportes]  [⚙️ Config]            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Seguridad y Autenticación

### 1. Pareamiento Terminal ↔ Smartphone

```
Primer uso:
1. Abrir app Android
2. Ir a "Añadir terminal"
3. App muestra código QR o PIN: "123456"
4. En terminal: Menú → Parear dispositivo → Ingresar PIN
5. Terminal y app se emparejan (BLE bonding)
6. Asociar terminal a mensajero en backend:
   POST /api/devices/pair
   {
     "device_id": "CT-A1B2C3D4",
     "courier_id": "COURIER_123",
     "pin": "123456"
   }
```

### 2. Autenticación App ↔ Backend

```
Login mensajero:
POST /api/auth/login
{
  "username": "courier123",
  "password": "***",
  "device_info": {
    "model": "OnePlus Nord",
    "os": "Android 13",
    "app_version": "1.0.2"
  }
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "courier": {
    "id": "COURIER_123",
    "name": "Juan Mensajero",
    "zone": "Madrid Centro"
  },
  "expires_at": "2024-11-09T14:32:15Z"
}

Todas las peticiones posteriores:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 🚨 Manejo de Errores

### Error 1: Terminal sin conexión BLE

```
Terminal:
┌─────────────────────┐
│ SIN CONEXION │
│─────────────────────│
│BLE desconectado     │
│                     │
│Comprueba que el     │
│smartphone tiene     │
│la app abierta       │
│                     │
│[Reintentar]         │
└─────────────────────┘

Acción: Guardar escaneo en caché local del terminal (futuro)
```

### Error 2: Código no encontrado en backend

```
Smartphone:
┌─────────────────────────────────┐
│ ⚠️ Código no encontrado          │
├─────────────────────────────────┤
│ Código: 8412345678901           │
│                                 │
│ Este código no está en el       │
│ sistema o ya fue procesado      │
│                                 │
│ ¿Qué deseas hacer?              │
│ [↩️ Escanear de nuevo]          │
│ [📞 Llamar a central]           │
│ [✓ Registrar igualmente]        │
└─────────────────────────────────┘
```

### Error 3: Backend no responde

```
App guarda en caché local:
┌─────────────────────────────────┐
│ ⏳ Guardado localmente           │
├─────────────────────────────────┤
│ Código: 8412345678901           │
│ Estado: Entregado               │
│                                 │
│ Se sincronizará automáticamente │
│ cuando haya conexión            │
│                                 │
│ [✓ Entendido]                   │
└─────────────────────────────────┘
```

---

## 📈 Métricas y KPIs del Sistema

### Dashboard de Operaciones

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Métricas del Sistema                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Hoy (08/11/2024):                                           │
│ ├─ Paquetes procesados: 219                                │
│ ├─ Entregados: 156 (71%)                                   │
│ ├─ Pendientes: 60 (27%)                                    │
│ └─ Con incidencias: 3 (2%)                                 │
│                                                             │
│ Performance:                                                │
│ ├─ Tiempo medio de entrega: 2.3 horas                      │
│ ├─ Tasa de primer intento: 89%                             │
│ └─ Satisfacción cliente: 4.7/5 ⭐                           │
│                                                             │
│ Mensajeros activos: 15                                     │
│ ├─ En ruta: 12                                             │
│ ├─ En descanso: 2                                          │
│ └─ Retornando: 1                                           │
│                                                             │
│ Terminales conectados: 14/15                               │
│ └─ CT-A1B2C3D4: Offline desde 13:45                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Resumen del Flujo

```
┌──────────────┐
│   TERMINAL   │ Escanea código de barras
└──────┬───────┘
       │ BLE (Bluetooth Low Energy)
       │ < 1 segundo
       ▼
┌──────────────┐
│  SMARTPHONE  │ Recibe código + procesa
│  (con 4G)    │
└──────┬───────┘
       │ HTTPS API
       │ < 2 segundos
       ▼
┌──────────────┐
│   BACKEND    │ Actualiza base de datos
│  (Servidor)  │
└──────┬───────┘
       │ Notificaciones
       │ Tiempo real
       ▼
┌──────────────┐
│   CLIENTE    │ Ve actualización en tracking
│  (Web/App)   │
└──────────────┘

Tiempo total: ~3 segundos desde escaneo hasta tracking actualizado
```

---

## ✅ Ventajas de Esta Arquitectura

1. **Terminal sin conectividad cara:**
   - No necesita 4G/WiFi propio (ahorro €€€)
   - Solo BLE (muy bajo consumo)
   - Batería dura mucho más

2. **Smartphone como gateway:**
   - Mensajero ya tiene smartphone
   - Reutiliza plan de datos existente
   - Más flexible (puede cambiar de teléfono)

3. **Funcionamiento offline:**
   - App guarda localmente si no hay red
   - Sincroniza automáticamente después
   - No se pierde ningún escaneo

4. **Escalable:**
   - Añadir mensajeros = solo dar nuevo terminal
   - Backend puede manejar miles de dispositivos
   - Infraestructura cloud escalable

5. **Mantenible:**
   - Actualizar app: Google Play Store
   - Actualizar terminal: OTA via BLE (futuro)
   - Backend: deploy continuo

---

**Documentación:** v1.0
**Última actualización:** 2025-01-08
