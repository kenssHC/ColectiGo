# @collectigo/backend

API REST de ColectiGO construida con NestJS 11, TypeORM y PostgreSQL.
Autenticación mediante tokens de Firebase (verificados con firebase-admin).

Toda la documentación de configuración y endpoints está en el [README raíz](../../README.md).

## Comandos

```bash
pnpm dev                # desarrollo con watch
pnpm build              # compilar a dist/
pnpm start:prod         # ejecutar compilado
pnpm test               # pruebas unitarias
pnpm migration:run      # aplicar migraciones
pnpm migration:revert   # revertir la última migración
pnpm seed               # cargar rutas de ejemplo (solo si la BD está vacía)
```

## Estructura

```
src/
├── main.ts               # bootstrap: helmet, compression, CORS, pipes, filtro global
├── app.module.ts         # módulo raíz: config, TypeORM, throttler
├── app.controller.ts     # GET /health
├── data-source.ts        # DataSource para la CLI de TypeORM
├── config/               # configuración namespaced + validación de env
├── migrations/           # migraciones del esquema
├── seeds/                # datos de ejemplo para desarrollo
├── common/               # guards (Firebase, admin), filtros, decoradores
└── modules/
    ├── auth/             # verificación de tokens de Firebase
    ├── users/            # sincronización y perfil de usuarios
    ├── routes/           # rutas, recorridos y sugerencias
    └── planner/          # rutas directas/transbordos y clasificación de opciones
```
