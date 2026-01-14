
# Planificador de Vacaciones (Netlify + Neon)

Proyecto listo para desplegar en Netlify con almacenamiento en Neon (PostgreSQL).

## Estructura

```
.
├── netlify.toml
├── package.json
├── netlify/
│   └── functions/
│       └── vacations.js
└── site/
    └── index.html
```

## Despliegue

1. **Crear base en Neon**
   - Regístrate en https://neon.tech/
   - Crea un proyecto y copia la Connection String (por ejemplo: `postgres://usuario:pass@host/db`).

2. **Configurar variables en Netlify**
   - En tu sitio de Netlify ve a *Site Settings → Environment Variables*.
   - Agrega `NEON_DB_URL` con la connection string de Neon.

3. **Deploy**
   - Sube este repo a GitHub.
   - En Netlify, *New site from Git*, conecta el repo.
   - Netlify instalará la dependencia `pg` y publicará `/site`.

4. **Probar**
   - Abre tu URL de Netlify.
   - Agrega miembros, registra vacaciones y verifica que se actualicen en el calendario.

> Las tablas se crean automáticamente en la primera ejecución de la función.

## Notas
- La función acepta los tipos: `add-member`, `save-vacation`, `delete-vacation`, `reset-all`.
- La validación de festivos usa la API pública de `date.nager.at`.
