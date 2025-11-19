# Despliegue

## Docker

### Build

```bash
docker build -t binance-orchestrator .
```

### Run

```bash
docker run -p 3000:3000 --env-file .env binance-orchestrator
```

### Docker Compose

```bash
# Build
docker-compose build

# Start
docker-compose up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

## Variables de Entorno

### Desarrollo

Crear `.env` basado en `.env.example`:

```env
PORT=3000
NODE_ENV=development

FILE_STORAGE_API_URL=http://file-storage-api:3000
BINANCE_DB_API_URL=http://binance-db-api:3000
BINANCE_PROXY_URL=http://binance-proxy:3000

TRAEFIK_PREFIX=/binance-orchestrator
DOMAIN=api.borasta.sytes.net

LOG_LEVEL=info
```

### Producción

Ajustar URLs según entorno:
- Usar nombres de servicios Docker para comunicación interna
- Usar URLs públicas para comunicación externa

## Traefik Configuration

El `docker-compose.yml` incluye labels de Traefik:

```yaml
labels:
  - traefik.enable=true
  - traefik.docker.network=proxy
  - traefik.http.routers.binance-orchestrator.rule=Host(`${DOMAIN}`) && PathPrefix(`/binance-orchestrator`)
  - traefik.http.routers.binance-orchestrator.entrypoints=web
  - traefik.http.middlewares.binance-orchestrator-strip.stripprefix.prefixes=/binance-orchestrator
```

### Requisitos

- Red `proxy` debe existir: `docker network create proxy`
- Traefik debe estar configurado y corriendo
- Dominio debe estar configurado en DNS

## Health Checks

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

### Verificar Health

```bash
curl http://localhost:3000/health
```

## Logging

### Logs en Docker

Los logs se escriben en:
- `logs/combined.log`: Todos los logs
- `logs/error.log`: Solo errores

### Ver Logs

```bash
# Docker Compose
docker-compose logs -f

# Docker
docker logs -f binance-orchestrator

# Archivos
tail -f logs/combined.log
```

## Monitoreo

### Métricas Recomendadas

- Health check endpoint
- Response times
- Error rates
- Requests per second
- Service availability

### Alertas

Configurar alertas para:
- Health check failures
- High error rates
- Service unavailability
- High response times

## Rollback

### Estrategia

1. Mantener imágenes Docker versionadas
2. Usar tags para versiones
3. Rollback rápido cambiando tag en docker-compose

### Proceso

```bash
# Cambiar tag en docker-compose.yml
image: binance-orchestrator:v1.0.0

# Rebuild y restart
docker-compose up -d --force-recreate
```

## Escalabilidad

### Horizontal Scaling

- Múltiples instancias detrás de load balancer
- Stateless: no almacena estado
- Compartir logs centralizados

### Vertical Scaling

- Aumentar recursos de contenedor
- Ajustar límites de memoria/CPU

## Seguridad

### Best Practices

- ✅ Usar usuario no-root en Docker
- ✅ No exponer puertos innecesarios
- ✅ Usar secrets para información sensible
- ✅ Mantener imágenes actualizadas
- ✅ Escanear imágenes por vulnerabilidades

### Secrets

Para información sensible, usar:
- Docker secrets
- Environment variables desde secret manager
- No commitear `.env` en git

## CI/CD

### Pipeline Recomendado

1. **Build**: Compilar TypeScript
2. **Test**: Ejecutar tests unitarios
3. **Lint**: Verificar código
4. **Build Docker**: Crear imagen
5. **Test Integration**: Tests de integración (opcional)
6. **Push**: Subir imagen a registry
7. **Deploy**: Desplegar en entorno

### Ejemplo GitHub Actions

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build
        run: npm run build
      - name: Test
        run: npm test
      - name: Build Docker
        run: docker build -t binance-orchestrator .
      - name: Deploy
        run: |
          # Deploy commands
```

## Troubleshooting

### Container no inicia

1. Verificar logs: `docker-compose logs`
2. Verificar variables de entorno
3. Verificar health check
4. Verificar conectividad con servicios externos

### Servicios externos no disponibles

1. Verificar URLs en `.env`
2. Verificar conectividad de red
3. Verificar que servicios estén corriendo
4. Verificar timeouts

### Performance Issues

1. Revisar logs de errores
2. Verificar recursos del contenedor
3. Revisar tiempos de respuesta de servicios externos
4. Considerar caching si aplica

