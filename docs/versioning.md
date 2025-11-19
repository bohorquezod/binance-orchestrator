# Versionado

## Semantic Versioning

El proyecto sigue [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR**: Cambios incompatibles en API
- **MINOR**: Nuevas funcionalidades compatibles hacia atrás
- **PATCH**: Correcciones de bugs compatibles

## Versionado de Código

### package.json

```json
{
  "version": "1.0.0"
}
```

### Git Tags

Crear tags para releases:

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Changelog

### Formato

```markdown
# Changelog

## [1.0.0] - 2024-01-01

### Added
- Initial release
- CSV processing functionality
- Data synchronization
- Webhook handling

### Changed
- ...

### Fixed
- ...

### Removed
- ...
```

## Releases

### Proceso

1. **Actualizar versión** en `package.json`
2. **Actualizar CHANGELOG.md**
3. **Commit** cambios
4. **Crear tag** de Git
5. **Push** tag
6. **Crear release** en GitHub (opcional)

### Ejemplo

```bash
# Actualizar versión
npm version patch  # o minor, major

# Crear tag
git tag -a v1.0.1 -m "Release 1.0.1"

# Push
git push origin main --tags
```

## Versionado de API

### Endpoints

Los endpoints usan versionado en la ruta: `/api/v1/`

Para cambios incompatibles, crear nueva versión: `/api/v2/`

### Breaking Changes

Si se introduce un breaking change:
1. Mantener versión anterior activa
2. Documentar cambios en CHANGELOG
3. Agregar deprecation warnings
4. Planear remoción de versión antigua

## Versionado de Docker

### Tags

Usar tags para versiones:

```bash
docker build -t binance-orchestrator:1.0.0 .
docker build -t binance-orchestrator:latest .
```

### Estrategia

- `latest`: Última versión estable
- `v1.0.0`: Versión específica
- `v1.0`: Última patch de minor version
- `v1`: Última minor de major version

## Versionado de Documentación

### Actualización

- Documentación debe actualizarse con cada release
- Mantener compatibilidad documentada
- Documentar breaking changes

### Versionado de Docs

Si la documentación cambia significativamente:
- Mantener versiones anteriores disponibles
- Actualizar README con cambios
- Documentar en CHANGELOG

## Best Practices

### ✅ DO

- ✅ Seguir semantic versioning estrictamente
- ✅ Actualizar CHANGELOG con cada release
- ✅ Crear tags de Git para releases
- ✅ Documentar breaking changes
- ✅ Mantener versiones anteriores disponibles

### ❌ DON'T

- ❌ NO hacer breaking changes en patch releases
- ❌ NO saltar versiones
- ❌ NO olvidar actualizar documentación
- ❌ NO hacer releases sin tests

