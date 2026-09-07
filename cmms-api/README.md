# CMMS API

Backend del CMMS construido con Spring Boot 3 + Java 17, siguiendo el diseño
de multi-tenancy, autenticación JWT y modelo de datos definidos en las
conversaciones de arquitectura previas.

## Requisitos

- Java 17 (JDK)
- Maven 3.9+
- Docker y Docker Compose (para Postgres y MinIO locales)

## Cómo levantar el entorno de desarrollo

### 1. Levantar la infraestructura (Postgres + MinIO)

```bash
docker-compose up -d
```

Esto levanta:
- Postgres en `localhost:5432` (db: `cmms_dev`, user: `cmms_user`, pass: `cmms_pwd`)
- MinIO en `localhost:9000` (consola en `localhost:9001`, user/pass: `minioadmin`)

### 2. Correr el backend

```bash
./mvnw spring-boot:run
```

O si tienes Maven instalado globalmente:

```bash
mvn spring-boot:run
```

Spring Boot arrancará con el perfil `dev` por defecto (definido en
`application.yml`), aplicará las migraciones de Flyway automáticamente
(`V1__init_schema.sql`) y quedará escuchando en `http://localhost:8080`.

### 3. Verificar que está vivo

```bash
curl http://localhost:8080/swagger-ui.html
```

O abre esa URL en el navegador para ver la documentación OpenAPI interactiva.

### 4. Datos de prueba (automático)

Al arrancar en perfil `dev`, `DevDataSeeder` crea automáticamente (si no existen):
- Organización "Demo Org"
- Rol ADMIN
- Usuario `admin@demo.com` / password `password123`
- Un Asset y un Work Order de ejemplo

Es idempotente: si vuelves a arrancar la app, no duplica los datos.

### 5. Probar el login

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password123"}'
```

Deberías recibir `{ "accessToken": "...", "refreshToken": "...", "tokenType": "Bearer" }`.

### 6. Probar el registro de una nueva organización

```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Mi Empresa",
    "email": "yo@miempresa.com",
    "password": "unaClaveSegura123",
    "firstName": "Nombre",
    "lastName": "Apellido"
  }'
```

Este endpoint crea la Organization, el Role ADMIN por defecto, y el
primer User (ACTIVE) en una sola transacción atómica, y devuelve los
tokens ya autenticado.

## Estructura del proyecto

```
src/main/java/com/tuempresa/cmms/
├── config/       → Seguridad, CORS, OpenAPI
├── security/     → JWT provider, filtros, UserDetailsService
├── tenant/       → Filtro y entidad base multi-tenant
├── model/        → Entidades JPA y enums
├── repository/   → Spring Data JPA
├── service/      → Lógica de negocio
├── controller/   → Endpoints REST
├── dto/          → Request/Response
└── exception/    → Manejo centralizado de errores
```

## Estado actual

- [x] Modelo de datos base (Organization, User, Role, Asset, Location, WorkOrder, Part, Team)
- [x] Autenticación JWT (login)
- [x] Aislamiento multi-tenant vía Hibernate Filter
- [x] Migración inicial de base de datos (Flyway)
- [x] Endpoint de registro de organización + primer usuario admin
- [x] Seeder de datos de prueba (perfil dev)
- [x] CRUD completo de Work Orders y Assets (paginación + filtros)
- [ ] CRUD de Locations, Parts, Teams
- [ ] Refresh token endpoint
- [ ] Tests de integración

## Endpoints disponibles

```
POST   /auth/register
POST   /auth/login

POST   /work-orders
GET    /work-orders?status=&priority=&assetId=&search=&page=&size=&sort=
GET    /work-orders/{id}
PUT    /work-orders/{id}
PATCH  /work-orders/{id}/status
DELETE /work-orders/{id}

POST   /assets
GET    /assets?status=&locationId=&search=&page=&size=&sort=
GET    /assets/{id}
PUT    /assets/{id}
DELETE /assets/{id}
```

Todos (excepto `/auth/**`) requieren header `Authorization: Bearer <accessToken>`.

## Notas de diseño

Ver el historial de la conversación de arquitectura para el razonamiento
detrás de cada decisión: por qué shared-schema + Hibernate Filter para
multi-tenancy, por qué Flyway en vez de `ddl-auto: update`, por qué el
storage está abstraído para ser compatible con MinIO/S3/GCS, etc.
