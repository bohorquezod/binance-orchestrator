# Documentación del Proyecto

Esta documentación describe completamente la arquitectura, estructura, convenciones y procesos del proyecto Binance Orchestrator.

## 📚 Índice

- [Arquitectura](./architecture.md) - Arquitectura de alto nivel y detallada del sistema
- [Endpoints y Contratos](./endpoints.md) - Especificación completa de la API REST
- [Flujos de Datos](./data-flow.md) - Pipeline de datos, validaciones y mapeos
- [Dependencias](./dependencies.md) - Dependencias del proyecto y su propósito
- [Convenciones](./conventions.md) - Estándares y convenciones del proyecto
- [Estructura de Carpetas](./folder-structure.md) - Organización del código fuente
- [Testing](./testing.md) - Estrategia de pruebas y calidad de código
- [Despliegue](./deployment.md) - Procesos de despliegue y Docker
- [Versionado](./versioning.md) - Estándares de versionado y releases

## 🎯 Visión General

Binance Orchestrator es un microservicio Node.js construido con Express.js y TypeScript que actúa como un orquestador central para coordinar múltiples servicios relacionados con Binance. El proyecto sigue una arquitectura modular basada en servicios, con separación clara de responsabilidades entre controladores, servicios y utilidades.

### Stack Tecnológico

- **Runtime**: Node.js 20.x
- **Framework**: Express.js 4.x
- **Lenguaje**: TypeScript 5.3.x
- **Testing**: Jest + Supertest
- **Documentación API**: Swagger/OpenAPI 3.0
- **Validación**: express-validator
- **Logging**: Winston
- **HTTP Client**: Axios (abstraído en cliente unificado)
- **CSV Processing**: csv-parse
- **Seguridad**: Helmet, CORS

### Principios Arquitectónicos

1. **Orquestación**: Coordina múltiples servicios externos (file-storage-api, binance-db-api, binance-proxy)
2. **Separación de responsabilidades**: Capas claras (controllers → services → HTTP client)
3. **Type Safety**: TypeScript estricto con validación de tipos
4. **Testabilidad**: Cobertura de pruebas unitarias e integración
5. **Documentación**: OpenAPI actualizado y documentación de código
6. **Abstracción**: Cliente HTTP unificado para facilitar cambios de librería
7. **Resiliencia**: Manejo de errores y retry logic para servicios externos

### Servicios Externos Integrados

- **file-storage-api**: Almacenamiento y recuperación de archivos CSV
- **binance-db-api**: Base de datos para almacenar datos de Binance
- **binance-proxy**: Proxy para acceder a la API de Binance
- **exchanger-bridge**: Bridge para intercambios (webhooks)

