# Bot cuenta corriente (silver)

Panel con botones: cada miembro ve su saldo y movimientos. Oficiales y administradores (roles o IDs configurados) pueden ingresar o retirar silver, ver resumen del gremio y movimientos recientes.

Ahora incluye un **sistema de eventos**:

- Crear evento por tipo de actividad (Grupal, Mazmorra, Avalonian, ZvZ, Hellgate, Recoleccion, Otro)
- Inscripcion y baja de participantes desde panel
- Roles por participante solo para eventos de tipo **Grupal**: **Tanque**, **Healer**, **Flamigero**, **Shadow Caller** y **Otros**
- Cierre de evento con seleccion de asistentes
- Reparto automatico del loot entre asistentes en sus cuentas corrientes
- **Sin comision al gremio**: el total del loot se divide entre los asistentes
- Si el creador del evento **no es staff**, el evento se crea **sin impacto contable** (se puede crear/cerrar, pero no modifica saldos al cerrar)
- Publicacion automatica de eventos en canal de anuncios (con ping opcional a rol)
- Publicacion del balance de reparto de loot en canal dedicado al cerrar el evento

## Requisitos

- Node.js 18+
- En Windows: herramientas de compilación para `better-sqlite3` (Visual Studio Build Tools con C++)

## Instalación

```bash
npm install
cp .env.example .env
```

Editá `.env` con el token del bot, `GUILD_ID`, `PANEL_CHANNEL_ID`, y quién es staff (`ADMIN_USER_IDS` y/o `LEADER_ROLE_IDS`).

## Uso

```bash
npm start
```

En desarrollo con recarga automática:

```bash
npm run dev
```

### Permisos del bot en Discord

- Intents: **Server Members Intent** puede ser necesario según el uso de menús de usuario.
- En el canal del panel: ver canal, enviar mensajes, incrustar enlaces, usar comandos de aplicación / componentes.

### Panel y permisos

En el canal: **Mi cuenta**, **Resumen gremio** y **Eventos** los usa cualquier miembro.

**Mas opciones** abre acciones solo para oficiales:

- Crear evento
- Cerrar evento (seleccionar asistentes y loot total)
- Agregar / quitar silver manual
- Ver movimientos

Si un miembro comun intenta usar opciones staff, recibe un aviso efimero sin permiso.

### Datos

SQLite en `data/guild.db` por defecto, o en `DATA_DIR` si está definido. En hosting, montá un volumen persistente en esa ruta.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DISCORD_TOKEN` | Token del bot |
| `GUILD_ID` | ID del servidor |
| `PANEL_CHANNEL_ID` | Canal donde se publica el panel |
| `ADMIN_USER_IDS` | IDs de usuario admin (coma) |
| `LEADER_ROLE_IDS` | IDs de roles de oficial (coma) |
| `EVENTS_CHANNEL_ID` | Canal donde se publican eventos nuevos (opcional) |
| `EVENTS_ANNOUNCE_ROLE_ID` | Uno o varios roles a mencionar, separados por coma (opcional) |
| `EVENTS_CHANNEL_LOOT_ID` | Canal donde se publica el balance de loot (opcional) |
| `DATA_DIR` | Carpeta del archivo `.db` |
| `PORT` | Si se define, abre HTTP `GET /` → `ok` (health check) |

El dueño del servidor siempre tiene permisos de oficial.
