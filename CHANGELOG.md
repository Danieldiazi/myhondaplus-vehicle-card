# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El proyecto sigue [Semantic Versioning](https://semver.org/):

- `PATCH`: correcciones compatibles;
- `MINOR`: funciones nuevas compatibles;
- `MAJOR`: cambios incompatibles de configuración o comportamiento.

## [Unreleased]

### Fixed

- Detección separada de `refresh_data`/`refresh_from_car` y `refresh_cached`, con identificadores estables y desempate determinista.
- La climatización no se confunde con deshielo ni ajustes relacionados.
- La antigüedad usa la fecha del vehículo; las fechas desconocidas y estimaciones de HA ya no se presentan como datos recientes del coche.
- Los estados de cierre desconocidos o transitorios no se muestran como desbloqueado ni permiten accionar el cierre.
- Detección sin consultas duplicadas, respuestas obsoletas ni reintentos en bucle; redetección por eventos o botón manual.
- El editor conserva los estados implícitos del diseño compacto al cambiar métricas o controles y respeta listas vacías explícitas.
- El diagnóstico distingue entidades asignadas, presentes y disponibles, conservando su anonimización.
- La distribución incluye cambios en `assets/`.
- Actualizaciones compatibles del lockfile para resolver los avisos de auditoría de Vitest, brace-expansion y source-map-js.

### Added

- Validación localizada de configuración YAML y pruebas de regresión.
- Pruebas de navegador antes de publicar releases.

### Removed

- Implementación JavaScript antigua no utilizada por el bundle TypeScript.

### Changed

- Documentación sincronizada con la serie 1.x: confirmaciones, acciones de actualización, opciones de configuración, fallback visual y versiones con soporte.
- Guías bilingües de usuario, configuración y publicación, junto con preguntas frecuentes en español e inglés.

## [1.0.1] - 2026-08-08

### Fixed

- La confirmación de actualización se aplica tanto a «Actualizar datos guardados» como a «Actualizar desde el coche».

## [1.0.0] - 2026-08-08

### Added

- Los estados de puertas, ventanas, maletero, capó, luces, carga, climatización y ubicación pueden mostrarse, ocultarse y ordenarse desde el editor visual.
- Confirmaciones opcionales para climatización, bocina y luces y actualización directa desde el coche.
- Advertencia configurable antes de enviar acciones remotas cuando los datos del vehículo están marcados como antiguos.
- Indicadores visuales discretos en métricas, estados, cierre y fecha de actualización para señalar que abren el diálogo nativo de Home Assistant.

## [0.9.1] - 2026-08-08

### Added

- El diálogo nativo `more-info` también se abre desde el cierre, los estados de puertas, ventanas, maletero, capó, luces, climatización y carga, y la fecha de actualización cuando tienen una entidad asociada.

### Changed

- La ubicación pasa del grupo de acciones al grupo de estados informativos, donde muestra su valor y abre `more-info` sin sugerir que envía una orden al vehículo.

### Fixed

- Se republica el código actual mediante el workflow automático después de que la release manual `v0.9.0` distribuyese por error un bundle antiguo.

## [0.8.0] - 2026-08-04

### Added

- Las métricas vinculadas a entidades abren el diálogo nativo de Home Assistant con su historial, atributos y controles al pulsarlas.

### Changed

- El fondo de las métricas se obtiene explícitamente de `--secondary-background-color` para respetar el tema activo.

## [0.7.2] - 2026-08-04

### Changed

- Republicación limpia del parche `0.7.1` para garantizar que HACS reciba el bundle generado y adjuntado por el workflow automático de release.

## [0.7.1] - 2026-08-04

### Fixed

- El editor deja de repetir el descubrimiento de integración y entidades en cada actualización de estados de Home Assistant, evitando el parpadeo periódico de la configuración.
- Los controles utilizan un fondo y borde teñidos con el color principal del tema para distinguirlos claramente de métricas y estados informativos.
- La tarjeta hereda la familia tipográfica y la escala de tamaños de Home Assistant para integrarse visualmente con el resto del dashboard.

## [0.7.0] - 2026-08-04

### Added

- Diagnósticos accionables dentro de la tarjeta cuando falta la integración, no hay vehículos configurados, el vehículo seleccionado ya no existe o no publica entidades compatibles.
- Pruebas unitarias y visuales para los estados de descubrimiento de la integración, el editor y la tarjeta.

### Fixed

- Se conservan las sobrescrituras manuales de entidades en configuraciones YAML aunque el dispositivo no tenga entradas `myhondaplus` reconocibles en el registro.

## [0.6.0] - 2026-08-04

### Changed

- Se reclasifica como versión menor el conjunto de funciones publicado inicialmente en `0.5.6` —detección de la integración, resumen de capacidades y redescubrimiento de entidades— para cumplir la política de versionado semántico del proyecto. No introduce cambios de comportamiento adicionales.

## [0.5.6] - 2026-08-04

### Added

- El editor detecta si Home Assistant ha cargado la integración My Honda+, diferencia la ausencia de vehículos configurados y enlaza sus instrucciones de instalación.
- Resumen de métricas, estados y controles detectados para el vehículo seleccionado.
- Botón para volver a descubrir la integración, los vehículos y sus entidades sin recrear la tarjeta.

## [0.5.5] - 2026-08-04

### Added

- Pruebas visuales en Chromium para diseños completos y compactos, vistas móvil y escritorio, temas claro y oscuro, Civic, fallback genérico y errores de imagen personalizada.

### Changed

- Editor visual, diagnóstico y etiquetas accesibles completamente traducidos al español, inglés y gallego.
- Roadmap reorganizado para distinguir el trabajo completado de las prioridades pendientes.

### Fixed

- La versión incluida en el registro y los diagnósticos ahora se obtiene automáticamente de `package.json`.
- Una imagen personalizada que no pueda cargarse muestra el logo genérico de Honda y un aviso localizado.
- La ilustración y la fecha de actualización mantienen espacios independientes para evitar solapamientos en diseños responsive.

## [0.5.4] - 2026-08-03

### Changed

- Versión de prueba para verificar la detección automática de actualizaciones mediante HACS.

## [0.5.3] - 2026-08-03

### Added

- Documentación completa en inglés y español con selector de idioma sincronizado.
- Captura de vista previa de la tarjeta con el fallback genérico de Honda.
- Guía `AGENTS.md` para agentes de desarrollo y revisión.
- Validación oficial de repositorios HACS con categoría `plugin`.

## [0.5.2] - 2026-08-03

### Added

- Instalaciones reproducibles mediante `package-lock.json` y `npm ci`.
- Auditoría de dependencias de producción en CI y releases.
- Política de seguridad en `SECURITY.md`.
- Documentación explícita de la dependencia de My Honda+ for Home Assistant y de los límites de responsabilidad entre integración y tarjeta.
- Detección dinámica de métricas, estados y controles según las entidades reales del vehículo.
- Métricas mensuales de distancia, consumo y tiempo de conducción.
- Controles de bocina y luces y actualización de datos almacenados cuando estén disponibles.
- Escala, alineación y sombra configurables para la ilustración.
- Licencia MIT incluida en el repositorio.

### Changed

- GitHub Actions fijadas mediante SHA completos.
- Flujo de publicación actualizado para Node.js 24.
- README, guía de usuario y referencia de configuración ampliados con instalación previa de la integración y orientación de soporte.
- Estados inexistentes ocultos y entidades temporalmente no disponibles identificadas como sin datos.
- Actualizaciones menores y de parche agrupadas en Dependabot; las mayores permanecen separadas.
- Fondo de la tarjeta integrado con el tema activo de Home Assistant, sin mezclar el color primario.
- Iconos de métricas unificados con los iconos MDI nativos de Home Assistant.
- Iconos de cierre, estados y controles unificados con los iconos MDI nativos de Home Assistant.
- Logotipo genérico de Honda como fallback para modelos sin una ilustración SVG específica.
- Estado de climatización independiente de la ilustración —también en diseño compacto—, sombras de color coherentes para imágenes incluidas y personalizadas, y fallback de Honda redimensionado.

## [0.5.0] - 2026-08-02

### Added

- Traducciones al español, inglés y gallego.
- Modelo interno normalizado `VehicleState`.
- Diagnóstico anonimizado copiable.
- Métricas y controles configurables.
- Errores visibles y bloqueo de acciones en curso.
- Soporte para lectores de pantalla, foco de teclado y reducción de movimiento.
- Formularios de incidencias y plantilla de pull request.
- Dependabot para npm y GitHub Actions.
- Documentación de usuario, configuración, arquitectura y contribución.

### Changed

- Workflows actualizados a Node.js 24.
- Separación entre entidades de Home Assistant y estado visual.

## [0.4.0]

### Added

- Arquitectura TypeScript + Lit + Vite.
- Editor visual con descubrimiento de vehículos.
- Presets de color y color personalizado.
- Tests unitarios del resolvedor de entidades.
- CI y automatización de releases.
