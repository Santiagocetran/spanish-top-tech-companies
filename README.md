# Argentina Tech Jobs

[English](README.en.md) · [Guía técnica](docs/argentina/README.md) · [Contribuir](CONTRIBUTING.md)

Un prototipo para descubrir posiciones tecnológicas ubicadas en Argentina o disponibles de forma remota desde Argentina, con evidencia y niveles explícitos de incertidumbre.

**Estado: demostración local con datos sintéticos.** Están implementados la base P0–P1, el recorrido vertical V0 y una ampliación offline de contratos Greenhouse. No hay cobertura de empleadores reales, rastreo en vivo, sitio publicado ni servidor MCP de Argentina. Los registros reales están vacíos. No se automatizan postulaciones.

## Ejecutar localmente

Requisitos: Git, Node **22.23.4** (`.nvmrc`) y npm **10.9.9**. La implementación está en la rama `implement/argentina-v0`.

```sh
git clone --branch implement/argentina-v0 https://github.com/Santiagocetran/spanish-top-tech-companies.git
cd spanish-top-tech-companies
npm ci --ignore-scripts
npm run validate:registry
npm test
npm run demo:greenhouse
npm run snapshot:check -- .cache/ar-greenhouse/snapshot.json
npm run build -- --snapshot .cache/ar-greenhouse/snapshot.json
```

La instalación descarga dependencias; las pruebas y demostraciones de Argentina funcionan offline. El demo usa un reloj fijo y seis puestos inventados. Devuelve el puesto 201 como **confirmed** y el 202 como **likely**; el filtro USD/mes/base/bruto de 4000 coincide únicamente con el rango argentino del 201. Un fallo simulado de enriquecimiento salarial no oculta el puesto 202.

El build produce un índice local rotulado, JSON y un manifiesto en `_site-ar/`; no es una aplicación web completa. Sin `--snapshot`, falla explícitamente. `npm run demo` conserva la demostración V0 original de cinco puestos.

## Qué está implementado

```text
Fixture Greenhouse → registros validados → puestos y evidencia
  → elegibilidad Argentina → estado JSON local → búsqueda exacta
```

- Empresas y fuentes independientes de Levels.fyi y de datos salariales.
- Contratos estrictos, IDs estables, evidencia rastreable y persistencia local atómica.
- Elegibilidad **confirmed / likely / unknown / ineligible**. “Remote” solo no confirma Argentina; LATAM/global no implica confirmación. La autorización personal para trabajar es una cuestión separada.
- Filtros de ubicación, modalidad, elegibilidad y remuneración que deben coincidir en la misma opción del puesto.
- Monedas, períodos y alcance salarial explícitos; ninguna conversión o valor supuesto.
- Inventario completo, evidencia obligatoria y enriquecimiento salarial opcional separados. Repetir una corrida no duplica ausencias.
- Frescura calculada al consultar: 48 horas hasta stale y siete días hasta expired_unverified. Remuneración con su propio reloj.

El parser admite un vocabulario y un subconjunto HTML acotados. Texto no reconocido permanece desconocido; no se afirma precisión sobre publicaciones reales. Los snapshots anteriores a las reglas `ar-v0-2` requieren reconstrucción explícita.

## Documentación y verificación

- [Guía de desarrollo y comandos](docs/argentina/README.md)
- [Contratos Greenhouse actuales, límites y evidencia](docs/argentina/GREENHOUSE_CONTRACT.md)
- [Handoff V0 y baseline histórico](docs/argentina/LOCAL_V0.md)
- [Plan corregido](docs/argentina/IMPLEMENTATION_PLAN.md) y [resoluciones de auditoría](docs/argentina/AUDIT_DISPOSITION.md)
- [Revisión independiente más reciente](docs/argentina/evidence/greenhouse-contract/REVIEW.md)

La última verificación registra **57 pruebas aprobadas**, demo/build offline y regresiones históricas de jobs aprobadas. Hay dos entradas de auditoría de severidad alta en las dependencias de desarrollo Playwright heredadas; no se usan en este prototipo. Los resultados y límites están documentados, no representan una certificación de producción.

Los workflows heredados están archivados fuera de `.github/workflows/`. No están habilitados cron, despliegues, releases ni publicación de MCP. El runtime de Argentina no carga datos españoles ni usa telemetría o endpoints heredados.

## Próximos pasos

Ampliar contratos offline por opción de ubicación y fixtures realistas con permiso de uso; después, revisar viabilidad, propiedad y permisos de fuentes. Rastreo real, otros ATS, MCP, interfaz web y publicación pertenecen a etapas posteriores y no se habilitan con estos comandos.

## Origen y licencias

Fork de [pugarte7/spanish-top-tech-companies](https://github.com/pugarte7/spanish-top-tech-companies). Se conservan las atribuciones originales, [licencia MIT del código](LICENSE) y [licencia de los datos heredados](LICENSE-DATA). Esos datos españoles son históricos y no se presentan como datos argentinos. No se conceden derechos adicionales sobre datos de terceros.

El código, las guías y las pruebas históricas de España se mantienen aislados para trazabilidad; sus servicios pertenecen al proyecto upstream. Ver [divergencias y procedencia](docs/UPSTREAM.md).
