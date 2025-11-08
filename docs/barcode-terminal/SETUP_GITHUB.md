# Cómo Subir Este Proyecto a GitHub

## Opción 1: Crear Repositorio en GitHub (Interfaz Web)

### Paso 1: Crear el repositorio en GitHub
1. Ve a https://github.com/new
2. Nombre del repositorio: `barcode-terminal` o `courier-terminal`
3. Descripción: "Portable barcode scanning terminal for courier services with BLE connectivity"
4. Visibilidad: Pública o Privada (tú decides)
5. **NO** marcar "Add a README file" (ya tenemos uno)
6. **NO** marcar "Add .gitignore" (ya tenemos uno)
7. Click en "Create repository"

### Paso 2: Conectar tu repositorio local con GitHub

GitHub te mostrará instrucciones. Usa estas:

```bash
# En tu terminal, desde el directorio del proyecto
cd /home/user/barcode-terminal-project

# Añadir el remote de GitHub (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/barcode-terminal.git

# O si prefieres SSH:
git remote add origin git@github.com:TU_USUARIO/barcode-terminal.git

# Cambiar el nombre de la rama a 'main' (GitHub usa 'main' por defecto)
git branch -M main

# Subir tu código a GitHub
git push -u origin main
```

### Paso 3: Verificar
Ve a https://github.com/TU_USUARIO/barcode-terminal y deberías ver todos tus archivos.

---

## Opción 2: Usar GitHub CLI (gh)

Si tienes GitHub CLI instalado:

```bash
cd /home/user/barcode-terminal-project

# Crear repositorio y subir en un solo comando
gh repo create barcode-terminal --public --source=. --remote=origin --push

# O si prefieres privado:
gh repo create barcode-terminal --private --source=. --remote=origin --push
```

---

## Verificar que Todo Está Bien

```bash
cd /home/user/barcode-terminal-project

# Ver el estado de git
git status

# Ver el historial de commits
git log --oneline

# Ver los remotes configurados
git remote -v
```

---

## Estructura del Repositorio

```
barcode-terminal/
├── .gitignore                          # Archivos a ignorar
├── README.md                           # Documentación principal
├── 01_ESPECIFICACION_TECNICA.md        # Especificaciones técnicas
├── 02_BOM_COSTOS.md                    # Lista de materiales y costos
├── 03_ESQUEMATICO.md                   # Diagramas electrónicos
├── 04_PROTOCOLO_BLE.md                 # Protocolo de comunicación BLE
├── 05_GUIA_ENSAMBLAJE.md               # Guía de ensamblaje paso a paso
├── 06_ROADMAP.md                       # Plan de desarrollo
├── SETUP_GITHUB.md                     # Este archivo
└── firmware/
    ├── barcode_terminal.ino            # Firmware ESP32
    └── platformio.ini                  # Configuración PlatformIO
```

---

## Próximos Pasos Después de Subir a GitHub

1. **Añadir topics al repositorio** (en GitHub):
   - `esp32`
   - `barcode-scanner`
   - `bluetooth-low-energy`
   - `iot`
   - `courier`
   - `logistics`
   - `hardware`

2. **Configurar GitHub Pages** (opcional):
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: main, folder: / (root)
   - Tu documentación estará en: https://TU_USUARIO.github.io/barcode-terminal/

3. **Añadir un License**:
   ```bash
   # MIT License (recomendado para open source)
   # En GitHub: Add file → Create new file → Filename: LICENSE
   # GitHub detectará el nombre y te ofrecerá templates
   ```

4. **Añadir badges al README** (opcional):
   ```markdown
   ![License](https://img.shields.io/badge/license-MIT-blue.svg)
   ![Hardware](https://img.shields.io/badge/hardware-ESP32-green.svg)
   ![Status](https://img.shields.io/badge/status-prototype-yellow.svg)
   ```

---

## Trabajar con el Repositorio

### Hacer cambios
```bash
# Editar archivos...

# Ver qué cambió
git status
git diff

# Añadir cambios
git add .

# Hacer commit
git commit -m "Descripción de los cambios"

# Subir a GitHub
git push
```

### Crear ramas para features
```bash
# Crear rama para una nueva característica
git checkout -b feature/pcb-design

# Trabajar en la rama...
git add .
git commit -m "Add KiCad PCB design files"
git push -u origin feature/pcb-design

# En GitHub, crear Pull Request para mergear a main
```

---

## Colaboración

Si quieres que otros contribuyan:

1. **Settings → General → Features**: Habilitar "Issues" y "Discussions"
2. Crear archivo `CONTRIBUTING.md` con guías de contribución
3. Crear templates para issues: `.github/ISSUE_TEMPLATE/`
4. Añadir `CODE_OF_CONDUCT.md`

---

## Backup Local

Siempre mantén una copia local:

```bash
# Clonar en otra ubicación como backup
git clone https://github.com/TU_USUARIO/barcode-terminal.git ~/backup/barcode-terminal
```

---

¡Tu proyecto ahora está en GitHub y listo para compartir con el mundo! 🚀
