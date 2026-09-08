# BuyMeAShake Admin

Panel de administración interno (base visual Buyer1). Por ahora solo login + dashboard.

## Arranque

```bash
# Backend (:8000)
cd backend
# uvicorn ...

# Admin UI (:4300)
cd admin
pnpm install
pnpm start
```

Abre `http://localhost:4300/login`.

## Login

1. `POST /api/v1/admin/login` → tokens
2. `GET /api/v1/admin/me` → perfil + `roles[]`
3. Guard exige rol `admin` en `user_roles`

Promover un admin (usuario con password, no solo Firebase):

```bash
cd backend
.venv\Scripts\python.exe scripts/promote_admin.py admin@example.com
```

Errores: `401` credenciales · `403` sin rol admin.
