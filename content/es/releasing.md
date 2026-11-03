# Versiones y lanzamientos

Soundsible tiene un número de versión. El servidor, las imágenes del contenedor y la aplicación de escritorio se crean a partir de la mismo commit y se publican juntos, por lo que `0.2.0` significa lo mismo sin importar cómo lo haya instalado, y un informe de error solo tiene un número para citar.

## Lo que promete el número

La versión describe lo que le sucede a **usted** cuando actualiza. Ni las API internas, ni cuánto código cambió.

| Cambio    | Significado                                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MAYOR**  | La actualización requiere que haga algo a mano: editar su archivo de Compose, cambiar el nombre de una configuración, migrar datos o adaptarse a una API modificada. |
| **MENOR**  | Nueva capacidad. La actualización sigue siendo `docker compose pull && docker compose up -d` y nada más                                                                |
| **PARCHE** | Solo arreglos                                                                                                                                                          |

Si bien Soundsible está por debajo de 1.0, la versión mayor todavía no cambia, por lo que **la versión menor asume lo que más adelante asumirá la mayor**: una actualización 0.x puede exigir una intervención manual. Una versión de parche nunca la exige.

`X.Y.Z-rc.N` es una versión candidata: creada y publicada como cualquier otra versión, marcada como versión preliminar y nunca mueve la etiqueta de contenedor `latest`.

### ¿Qué significará 1.0?

No "se siente terminado". Dos cosas específicas, ambas en la [hoja de ruta](ROADMAP.md) y ambas de ingeniería:

- La API OpenSubsonic es lo suficientemente estable como para que clientes de terceros puedan depender de ella sin fijar una versión.
- La biblioteca vive en SQLite como la fuente de la verdad y las actualizaciones la migran hacia adelante sin que nadie toque ningún archivo.

Hasta entonces, 0.x es la respuesta honesta.

**La aplicación de escritorio no está en esa lista** y su estado beta no frena la versión 1.0. Lo que se interpone entre esta y una etiqueta estable es un certificado de firma de código Windows: dinero y una identidad legal, no un código. Soundsible no comprará uno; Si la comunidad decide financiar las compilaciones firmadas para Windows, el flujo de trabajo de lanzamiento gana un paso de firma y nada más cambia. Hasta entonces, los instaladores se envían sin firmar, con certificaciones de procedencia de compilación, y Windows advertirá sobre un editor desconocido. Este es un trato justo para una versión beta y malo para algo llamado estable, razón por la cual [los requisitos de la beta](DESKTOP_BETA.md) todavía dicen que una compilación sin firmar no debe publicarse como estable.

La aplicación de escritorio tiene la misma versión que todo lo demás. `0.4.0` es `0.4.0` ya sea que lo haya instalado como contenedor o como aplicación; "beta" es una declaración sobre la madurez del shell del escritorio, no un número separado.

## Donde vive la versión

`shared/version.py` lo declara. Ese es el único lugar donde se decide.

El motor lo importa. La imagen del contenedor la obtiene como argumento de compilación de la etiqueta. El shell del escritorio es el caso incómodo: Cargo, npm y Tauri leen cada uno su propio manifiesto en el momento de la compilación y ninguno de ellos puede leer Python, por lo que `scripts/version_sync.py` copia el número en cinco lugares:

```
desktop-shell/src-tauri/tauri.conf.json
desktop-shell/package.json
desktop-shell/package-lock.json      (twice: root, and packages[""])
desktop-shell/src-tauri/Cargo.toml
desktop-shell/src-tauri/Cargo.lock
```

Las copias pueden desincronizarse, por lo que el trabajo `version_consistency` de CI ejecuta `scripts/version_sync.py --check` en cada push y pull request y falla si algún manifiesto no está de acuerdo. En una etiqueta también falla si la etiqueta y la declaración son números diferentes.

Esto no es hipotético: antes de que existiera, los manifiestos decían `1.0.0-rc.1` mientras que el motor decía `0.1.0`, y cada instalador jamás creado informaba `1.0.0-rc.1` sin importar qué etiqueta lo produjera.

## Cómo se elige el número

Por las pull requests, a medida que se fusionan. Cada pull request lleva exactamente una etiqueta de impacto, que se agrega cuando se abre:

```
impact:major   they have to do something by hand to upgrade
impact:minor   new capability, upgrading is still just a pull
impact:patch   a fix
impact:none    nothing a user could observe (docs, CI, tests)
```

La verificación `impact_label` rechaza una pull request sin una. Luego, el proceso de publicación toma el mayor impacto integrado desde la versión anterior y actualiza el número en consecuencia; nadie vuelve a leer un mes de diferencias tratando de recordar si algo se estaba rompiendo.

## Publicar una versión

```bash
python scripts/release.py plan       # what would go out, and as what number
python scripts/release.py prepare    # opens the bump PR, auto-merge armed
#   ... it merges once the required checks pass, and that is the release
```

La fusión de la pull request de incremento de versión es lo que publica la versión. `release-tag.yml` etiqueta el
commit de fusión con `vX.Y.Z` e inicia los dos flujos de trabajo siguientes sobre esa etiqueta; una
etiqueta enviada con `GITHUB_TOKEN` no inicia nada por sí sola, por lo que los lanza explícitamente.
Para retener una versión hasta que se revise, desactiva la fusión automática en la pull request de incremento de versión
(`gh pr merge <url> --disable-auto`): entonces se publicará cuando alguien la fusione.

Si ese trabajo falla a medias, vuelve a ejecutarlo: solo inicia los flujos de trabajo que
todavía no tienen una ejecución sobre la etiqueta. `python scripts/release.py finish` es la
alternativa manual cuando no se ha ejecutado en absoluto: etiqueta el commit de fusión desde una
copia de trabajo, y al enviar la etiqueta se inician los mismos flujos de trabajo.

O `/release` en Claude Code, que ejecuta los tres pasos y espera en el medio.

`prepare` abre una pull request en lugar de enviar a `main` porque el conjunto de reglas de la rama prohíbe los envíos directos: la publicación pasa por la misma puerta que todo lo demás. Se ejecuta desde una copia local del repositorio en lugar de desde Acciones porque un push realizado con `GITHUB_TOKEN` no desencadena flujos de trabajo: una publicación creada por un bot nunca recibiría las comprobaciones requeridas y una etiqueta enviada por un bot no generaría nada.

`--rc` prepara una versión candidata. `--version X.Y.Z` anula el número derivado, que es como eventualmente sucederá 1.0; una etiqueta no puede decidir eso.

## Qué genera una etiqueta

La etiqueta `vX.Y.Z` inicia dos flujos de trabajo:

- **CI** compila y publica las imágenes de contenedor en GHCR: `X.Y.Z`, `X.Y` y
  `latest` (solo las versiones estables; una versión candidata nunca actualiza `latest`).
- **Release** verifica la etiqueta frente a la declaración, compila los instaladores de Windows
  x64 y arm64, la aplicación para iPhone y el
  APK alfa firmado de Android, y publica una única versión en GitHub Releases con todos ellos
  adjuntos y notas generadas. El trabajo de Android instala el APK sobre el
  publicado anteriormente en un emulador y espera a que el CI del propio commit etiquetado
  termine correctamente antes de entregarlo. Si falla, la versión de GitHub Release
  no se publica; las imágenes de contenedor, que CI publica desde la misma etiqueta, sí.

Cada envío a `main` también publica una imagen `edge`, que informa `0.0.0-edge+<sha>` para que dos compilaciones de desarrollo nunca se confundan entre sí.
