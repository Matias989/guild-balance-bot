# Bot cuenta corriente (silver)

Panel con botones: cada miembro ve su saldo y movimientos. Oficiales y administradores (roles o IDs configurados) pueden ingresar o retirar silver, ver resumen del gremio y movimientos recientes.

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

En el canal: **Mi cuenta** y **Resumen gremio** los usa cualquier miembro. **Más opciones** abre acciones solo para oficiales (agregar/quitar silver y movimientos); si un miembro común lo pulsa, recibe un aviso efímero sin permiso.

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
| `DATA_DIR` | Carpeta del archivo `.db` |
| `PORT` | Si se define, abre HTTP `GET /` → `ok` (health check) |

El dueño del servidor siempre tiene permisos de oficial.
