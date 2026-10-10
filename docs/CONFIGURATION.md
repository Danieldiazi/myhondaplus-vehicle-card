# Configuración

**Español** | [English](CONFIGURATION.en.md)

## Origen de los datos

La tarjeta no consulta directamente los servicios de Honda. Utiliza los dispositivos, entidades y servicios creados en Home Assistant por [My Honda+ for Home Assistant](https://github.com/enricobattocchi/myhondaplus-homeassistant).

Debes instalar y configurar esa integración antes de añadir la tarjeta. El valor de `device` corresponde al identificador del dispositivo creado por la integración en el registro de dispositivos de Home Assistant.

```text
My Honda+ for Home Assistant → dispositivo y entidades → My Honda+ Vehicle Card
```

## Opciones

| Opción                | Tipo                        |  Predeterminado | Descripción                                                                                      |
| --------------------- | --------------------------- | --------------: | ------------------------------------------------------------------------------------------------ |
| `device`              | string                      |               — | ID del dispositivo creado por My Honda+ for Home Assistant. El editor lo selecciona visualmente. |
| `name`                | string                      |     `My Honda+` | Nombre mostrado.                                                                                 |
| `vehicle_model`       | string                      |          `auto` | Modelo usado únicamente para elegir la ilustración.                                              |
| `color_preset`        | string                      |    `rallye_red` | Color predefinido de la sombra de la ilustración.                                                |
| `vehicle_color`       | string                      |       `#a51d2d` | Color de sombra hexadecimal cuando el preset es `custom`.                                        |
| `image_mode`          | `rendered` / `custom`       |      `rendered` | Ilustración incluida o imagen propia.                                                            |
| `vehicle_image`       | string                      |               — | URL de la imagen personalizada.                                                                  |
| `vehicle_scale`       | number                      |           `100` | Escala de la ilustración, entre 70 y 140 %.                                                      |
| `vehicle_alignment`   | `left` / `center` / `right` |        `center` | Alineación horizontal de la ilustración.                                                         |
| `vehicle_shadow`      | boolean                     |          `true` | Activa la sombra de color de la ilustración.                                                     |
| `shadow_intensity`    | number                      |            `60` | Intensidad de la sombra, entre 0 y 100 %.                                                        |
| `layout`              | `full` / `compact`          |          `full` | Densidad visual.                                                                                 |
| `stale_after`         | number                      |         `21600` | Segundos antes de marcar los datos como antiguos.                                                |
| `show_controls`       | boolean                     |          `true` | Muestra los botones de acción.                                                                   |
| `show_model`          | boolean                     |          `true` | Muestra el modelo visual debajo del nombre.                                                      |
| `animate`             | boolean                     |          `true` | Permite las animaciones respetando la preferencia de movimiento reducido.                        |
| `confirm_unlock`      | boolean                     |          `true` | Solicita confirmación antes de abrir.                                                            |
| `confirm_climate`     | boolean                     |         `false` | Solicita confirmación antes de accionar la climatización.                                        |
| `confirm_horn_lights` | boolean                     |         `false` | Solicita confirmación antes de accionar la bocina y las luces.                                   |
| `confirm_refresh`     | boolean                     |         `false` | Solicita confirmación antes de actualizar datos guardados o directamente desde el coche.         |
| `warn_stale_actions`  | boolean                     |          `true` | Advierte si los datos son antiguos o su fecha es desconocida.                                    |
| `locale`              | `auto` / `es` / `en` / `gl` |          `auto` | Idioma de la tarjeta. `auto` utiliza el idioma de Home Assistant.                                |
| `debug`               | boolean                     |         `false` | Muestra el diagnóstico anonimizado.                                                              |
| `controls`            | array                       | predeterminados | Controles visibles. Los que no tengan entidad se ocultan.                                        |
| `metrics`             | array                       | predeterminadas | Métricas visibles. Las que no tengan entidad se ocultan.                                         |
| `statuses`            | array                       | predeterminados | Estados visibles y su orden. Los que no tengan entidad se ocultan.                               |
| `entities`            | object                      |      automático | Sobrescritura avanzada de entidades detectadas.                                                  |

### Claves de métricas, estados y controles

- `metrics`: `range`, `battery`, `odometer`, `trip_distance`, `trip_consumption` y `trip_duration`.
- `statuses`: `doors`, `windows`, `trunk`, `hood`, `lights`, `charging`, `climate` y `location`.
- `controls`: `lock`, `climate`, `horn_lights`, `refresh_cached` y `refresh`.

`refresh_cached` vuelve a consultar los datos guardados en la nube de Honda. `refresh` solicita datos nuevos directamente al coche. Cada control se muestra únicamente cuando la integración publica su entidad; no todos los vehículos ofrecen ambas actualizaciones. La ubicación es un estado informativo que abre el diálogo nativo de Home Assistant, no una acción remota.

`vehicle_model: auto` intenta elegir la ilustración a partir del dispositivo. Los valores manuales son `civic`, `hrv`, `crv`, `zrv`, `jazz`, `honda_e`, `eny1` y `generic`. Cambiarlo manualmente solo modifica la representación visual y nunca activa capacidades.

Los presets de sombra disponibles son `rallye_red`, `platinum_white`, `crystal_black`, `sonic_grey`, `urban_grey`, `premium_blue`, `canyon_river_blue`, `silver` y `custom`.

Cuando `image_mode` es `custom` y `vehicle_image` no puede cargarse, la tarjeta muestra el logo genérico de Honda y un aviso localizado. La URL se mantiene en la configuración para que pueda corregirse desde el editor.

## Configuración mínima

```yaml
type: custom:myhondaplus-vehicle-card
device: ID_DEL_DISPOSITIVO_CREADO_POR_LA_INTEGRACION
```

El editor visual obtiene la lista desde el registro de dispositivos de Home Assistant, por lo que normalmente no necesitas copiar el identificador manualmente.

El editor también indica si Home Assistant ha cargado la integración, cuántos vehículos encuentra y qué métricas, estados y controles reconoce para el vehículo seleccionado. **Volver a detectar integración y entidades** actualiza esa información cuando la integración cambie sus entidades. Por seguridad, una tarjeta del navegador no inspecciona directamente el directorio `custom_components`: «integración no detectada» significa que Home Assistant no la ha cargado ni publica entidades `myhondaplus`.

La propia tarjeta muestra un diagnóstico localizado en lugar de una tarjeta vacía cuando no puede completarse la configuración: integración no detectada, ningún vehículo configurado, vehículo seleccionado inexistente o ausencia de entidades compatibles. Cuando falta la integración, incluye un enlace a sus instrucciones de instalación.

## Sobrescritura de entidades

```yaml
entities:
  range: sensor.civic_total_range
  lock: lock.civic_doors
  location: device_tracker.civic_location
```

La detección automática usa el dispositivo, el dominio de Home Assistant y claves estables expuestas por My Honda+ for Home Assistant. Las sobrescrituras siempre tienen prioridad.

## Detección de capacidades

La tarjeta no asigna funciones por modelo. El modelo visual solo selecciona la ilustración; las capacidades se obtienen de las entidades activas de la plataforma `myhondaplus` asociadas al dispositivo.

- Si una entidad no existe, su métrica, estado o control se oculta.
- Si existe pero está `unknown` o `unavailable`, se muestra como **Sin datos** y los controles no disponibles se desactivan. Un botón nunca pulsado puede estar `unknown` y seguir disponible; un cierre desconocido o transitorio no se puede accionar.
- Si existe y tiene un estado válido, se muestra y puede utilizarse.
- La batería solo se reconoce mediante claves específicas de batería de tracción; un nombre genérico no basta.

Las métricas disponibles incluyen autonomía, batería, kilometraje, distancia mensual, consumo medio y tiempo de conducción. Los estados informativos incluyen puertas, ventanas, maletero, capó, luces, carga, climatización y ubicación. El editor permite activar, desactivar y ordenar estos estados. En completo se incluyen todos; en compacto, climatización y ubicación. La detección oculta los que no existan. Los controles incluyen cierre, climatización, bocina y luces, actualización almacenada y actualización desde el coche, siempre que la integración publique la entidad correspondiente.

## Confirmaciones y datos antiguos

`confirm_unlock` está activado de forma predeterminada. `confirm_climate`, `confirm_horn_lights` y `confirm_refresh` permiten solicitar confirmación para cada acción adicional. `confirm_refresh` protege tanto la actualización de los datos guardados en la nube como la solicitud directa al coche.

Cuando `warn_stale_actions` está activado y los datos superan `stale_after` o se desconoce su fecha, la tarjeta advierte antes de cierre, climatización, bocina y luces o actualización directa desde el coche. Si una acción tiene también su confirmación específica, ambos avisos se presentan en un único diálogo.

## Valores predeterminados exactos y validación

Cuando se omiten las listas, se aplican estos valores:

- `metrics`: `[range, battery, odometer, trip_distance, trip_consumption]`. El tiempo de conducción es opcional.
- `controls`: `[lock, climate, horn_lights, refresh]`. La actualización de datos guardados es opcional.
- `statuses`, diseño completo: `[doors, windows, trunk, hood, lights, charging, climate, location]`.
- `statuses`, diseño compacto: `[climate, location]`.

Una lista explícita sustituye el valor predeterminado y fija su orden. Las listas vacías ocultan su grupo. Los cambios ajenos del editor conservan los estados implícitos. La antigua clave de control `location` se acepta, pero la ubicación se muestra entre los estados.

La configuración se valida antes de renderizar: las listas contienen claves admitidas y sin duplicados; los booleanos son booleanos YAML; los números son finitos; `stale_after` no es negativo; diseño, idioma y modelo usan valores admitidos. Los errores identifican el campo incorrecto en el idioma activo. La escala se limita a 70–140 % y la intensidad de sombra a 0–100 %. Las entidades manuales deben usar su dominio (`lock.*` para cierre, `button.*` para actualizar); una sobrescritura vacía permite detección automática. Con `locale: auto`, los idiomas de HA no admitidos utilizan español.

## Antigüedad de los datos del vehículo

El **estado** del sensor de fecha `updated` contiene la fecha del vehículo. El atributo `last_updated` registra una escritura en HA, que puede renovarse durante una consulta de la nube mientras los datos del coche siguen siendo antiguos.

Una fecha válida que supere `stale_after` muestra el aviso de datos antiguos. Las fechas incorrectas, no disponibles o futuras muestran **Sin fecha de actualización**. Cuando no existe ese sensor, la tarjeta puede mostrar la antigüedad de la entidad de autonomía o kilometraje, etiquetada como estimación de HA; la fecha del vehículo sigue siendo desconocida. La antigüedad se recalcula cada minuto mientras la tarjeta está conectada, sin consultar los registros ni Honda.

Con `warn_stale_actions: true`, una fecha antigua **o desconocida** solicita confirmación antes de cierre, climatización, bocina/luces y actualización directa. La actualización de datos guardados no utiliza este aviso. Las confirmaciones específicas siguen siendo independientes.

## Detección estable, reintentos y diagnóstico

Las claves de la integración `refresh_cached` y `refresh_data` corresponden a `refresh_cached` y `refresh` en la tarjeta. También se reconoce la antigua `refresh_from_car`. Las claves de traducción exactas y sufijos estables de identificadores tienen prioridad sobre los nombres visibles. El clima excluye deshielo y ajustes relacionados; la conexión del cable no se interpreta como carga activa.

Los eventos de registro actualizan la detección cuando HA permite suscripciones. Las consultas pendientes se comparten y las respuestas de configuraciones anteriores se descartan. Un fallo detiene los reintentos automáticos; utiliza el botón de reintento, **Volver a detectar integración y entidades** en el editor o el mismo botón dentro de `debug: true`. Si las suscripciones no están disponibles, utiliza la detección manual.

El diagnóstico distingue `configured` (entidad asignada), `present` (HA tiene su estado) y `available` (estado utilizable). Un botón nunca pulsado en `unknown` es utilizable; `unavailable` no lo es. Los identificadores se reducen al dominio. Se excluyen estados, atributos, identificadores de dispositivo, VIN y coordenadas.

## Límites de responsabilidad

La tarjeta solo puede representar funciones que la integración haya publicado como entidades o servicios en Home Assistant. Una métrica que no exista en el dispositivo no puede ser obtenida directamente por la tarjeta.

- Cuando el vehículo o las entidades no aparecen en Home Assistant, revisa la integración My Honda+.
- Cuando las entidades existen pero la tarjeta no las reconoce, utiliza el diagnóstico y abre una incidencia en este repositorio.
- Nunca incluyas VIN, credenciales, tokens o coordenadas en una configuración compartida o en una incidencia pública.
