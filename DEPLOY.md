# Desplegar Expalsa Activa en el VPS de Hostinger

Servidor: `<SERVER_IP>` / `<SERVER_HOST>` — Ubuntu 24.04

## 0. Antes de empezar

Verificá que el hostname resuelva a la IP del VPS (necesario para que Caddy
pueda sacar el certificado HTTPS automático):

```bash
nslookup <SERVER_HOST>
# Tiene que devolver <SERVER_IP>
```

Si Hostinger te dio ese hostname, normalmente ya viene resuelto. Si no,
avisame y usamos la IP directa sin HTTPS mientras tanto (no recomendado
para producción real, pero sirve para probar).

## 1. Conectarse al servidor

```bash
ssh <USUARIO>@<SERVER_IP>
```

## 2. Preparar el servidor (una sola vez)

```bash
# Actualizar el sistema
apt update && apt upgrade -y

# Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com | sh

# Firewall: solo abrir lo estrictamente necesario
apt install -y ufw
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Caddy lo redirige a HTTPS solo)
ufw allow 443/tcp   # HTTPS
ufw --force enable
```

## 3. Subir el código

Desde tu computadora (no desde el servidor), con los proyectos ya en carpetas
separadas (`cmms-api`, `cmms-frontend`) más los archivos de este paquete:

```bash
scp -r cmms-api cmms-frontend docker-compose.prod.yml .env.prod.example <USUARIO>@<SERVER_IP>:/opt/expalsa-activa/
```

O, si preferís trabajar con git (mejor para actualizaciones futuras):

```bash
# En el servidor
mkdir -p /opt/expalsa-activa && cd /opt/expalsa-activa
git clone <url-de-tu-repo-backend> cmms-api
git clone <url-de-tu-repo-frontend> cmms-frontend
# y subís docker-compose.prod.yml + .env.prod.example a mano (scp) o los agregás a un repo aparte
```

## 4. Configurar las variables de entorno

En el servidor:

```bash
cd /opt/expalsa-activa
cp .env.prod.example .env
nano .env
```

Completá **como mínimo** `DB_PASSWORD`, `JWT_SECRET_KEY` y `MINIO_ROOT_PASSWORD`.
Para generar el `JWT_SECRET_KEY`:

```bash
openssl rand -base64 48
```

## 5. Levantar todo

```bash
cd /opt/expalsa-activa
docker compose -f docker-compose.prod.yml up -d --build
```

La primera vez tarda unos minutos (compila el backend con Maven y el
frontend con Vite dentro de los contenedores). Podés seguir el progreso con:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

## 6. Verificar

Abrí en el navegador: **https://<SERVER_HOST>**

Caddy debería haber conseguido el certificado HTTPS solo, sin que hayas
tenido que hacer nada de Let's Encrypt a mano.

## 7. Actualizar la app cuando haya cambios nuevos

```bash
cd /opt/expalsa-activa
git pull   # (o volvés a subir los archivos con scp)
docker compose -f docker-compose.prod.yml up -d --build
```

## 8. La app móvil

En el proyecto `expalsa-activa-mobile`, cambiar el `.env`:

```
EXPO_PUBLIC_API_URL=https://<SERVER_HOST>/api
```

## Notas de seguridad

- Postgres y MinIO **no están expuestos a internet** — solo Caddy (el
  frontend) tiene los puertos 80/443 abiertos. Todo lo demás vive en la
  red interna de Docker.
- Guardá el archivo `.env` real en un lugar seguro (gestor de contraseñas
  de la empresa) — si se pierde, hay que generar credenciales nuevas.
- Considerá configurar backups automáticos del volumen `postgres_data`
  (no está cubierto en esta guía — avisame si querés que lo armemos).

