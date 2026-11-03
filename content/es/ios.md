# Soundsible para iOS

Código de un cliente nativo para tu propio servidor de Soundsible.

> **Nunca se ha instalado ni ejecutado en un dispositivo.** Nadie ha instalado esta aplicación de iOS
> en ningún sitio. Su comportamiento en ejecución es completamente teórico. La CI genera un IPA
> y las pruebas automatizadas cubren partes del código, pero ninguna de las dos cosas demuestra que funcionen la instalación,
> la vinculación, la reproducción, el audio en segundo plano, la escucha sin conexión o la integración con el coche.
> Las instrucciones y descripciones de funciones que siguen explican el comportamiento
> previsto del código, no una experiencia de uso verificada. Todavía hacen falta una primera instalación y
> la validación en un dispositivo físico.

Las funciones previstas incluyen la reproducción en segundo plano, la descarga de música desde
su servidor para escucharla sin conexión y los metadatos y controles multimedia nativos.

No está en la App Store y eso es deliberado. Consulte [¿Por qué no la App Store?](#why-not-the-app-store).

---

## Instalación

Este procedimiento nunca se ha llevado a cabo con Soundsible.

Necesita un iPhone o iPad con **iOS 26 o posterior** y una herramienta de sideloading. **[SideStore](https://sidestore.io)** es el recomendado: después de una configuración única, vuelve a firmar tus aplicaciones en el teléfono, sin computadora.

1. Instale SideStore siguiendo sus propias instrucciones. Este es el único paso que necesita una computadora: SideStore se configura una vez desde una computadora de escritorio y luego vuelve a firmar sus aplicaciones en el teléfono.

2. Agregue la fuente Soundsible:

   ```text
   https://github.com/Arzuparreta/soundsible/releases/latest/download/apps.json
   ```

   Esa URL siempre se resuelve en la versión más reciente, por lo que la aplicación obtiene sus actualizaciones de ella.

3. Instale Soundsible desde esa fuente.

4. Ábrelo y emparéjalo con tu servidor (abajo).

> **Descargas de versiones publicadas.** Las versiones publicadas incluyen `apps.json` y
> `Soundsible.ipa`. Usa la fuente anterior para instalar la aplicación publicada; los artefactos
> del flujo de trabajo son compilaciones de desarrollo. Esto no verifica la vía de distribución independiente mediante AltStore
> PAL que se describe a continuación.

> **Lo de los siete días.** Una ID Apple gratuita puede firmar como máximo **3** aplicaciones instaladas mediante sideloading, y la firma dura **7 días**. SideStore lo renueva en segundo plano en el teléfono y al vincularlo con **LiveContainer** se soluciona el límite de tres aplicaciones. Ambos son los límites de Apple en cuanto a sideloading, no algo que Soundsible pueda superar.

También puede tomar el `.ipa` directamente desde una [versión](https://github.com/Arzuparreta/soundsible/releases) e instalarlo con AltStore, SideStore o Sideloadly.

## Emparejamiento

En tu Soundsible, abre **Configuración → Vincular un dispositivo** y deja el panel con el código QR en pantalla. En la aplicación, toque **Escanear el código de emparejamiento**.

Mantener el panel abierto es importante: es lo que activa la confirmación automática, y la confirmación automática es lo que permite que el teléfono termine de emparejarse por sí solo. Si el panel está cerrado, el motor acepta el código pero espera a que usted lo confirme en el servidor, y el token que genera va a quien lo haya confirmado, nunca al teléfono. La aplicación lo dice en lugar de mostrar una espera indefinida.

Para un servidor sin interfaz gráfica, use **Ya tengo un token de dispositivo** y pegue un token de dispositivo emparejado con el alcance `library:read`.

La credencial reside en el llavero y solo se envía a su propio servidor.

## En el coche

El uso previsto consiste en conectarse por Bluetooth, USB o CarPlay e iniciar
la reproducción desde el teléfono. Nada de lo siguiente se ha probado en un dispositivo.

Implementación prevista:

| | |
|---|---|
| Título, artista, álbum y carátula en el equipo del coche | Implementado en el código; sin verificar |
| Barra de progreso que sigue la canción | Implementado en el código; sin verificar |
| Reproducir, pausar, siguiente y anterior desde el volante o el salpicadero | Implementado en el código; sin verificar |
| Pantalla En reproducción de Soundsible dentro de CarPlay | Implementado en el código; sin verificar |
| **Explorar tu biblioteca desde la pantalla del coche** | ❌ |

Esta última es una **aplicación CarPlay**, que necesita el derecho `carplay-audio`. Apple lo otorga solo a aplicaciones publicadas en la App Store, por lo que está fuera del alcance en esta ruta de distribución. Todo lo anterior no necesita ningún derecho: son `MPNowPlayingInfoCenter` y `MPRemoteCommandCenter`, las mismas API del sistema que controlan la pantalla de bloqueo.

## Sin conexión

El siguiente flujo de trabajo existe en el código, pero nunca se ha probado en un dispositivo.

Abra una lista de reproducción, un álbum o Favoritos y elija **Hacer disponible sin conexión**. Solo se recupera lo que falta, por lo que fijar dos listas de reproducción que se superponen cuesta la diferencia y no la suma.

**Configuración → Sin conexión** permite establecer un límite de almacenamiento. La música que hayas fijado explícitamente nunca se elimina. Solo se libera la música descargada por haberse reproducido anteriormente, empezando por la que lleva más tiempo sin escucharse.

## Fundido cruzado y DJ

**Configuración → Reproducción** establece un fundido cruzado de hasta 12 segundos. A mitad de la mezcla, la pantalla de bloqueo y el coche cambian a la pista entrante; ese punto de transferencia es lo que un navegador no puede controlar, porque la API de sesión de medios solo describe una pista a la vez mientras suenan dos.

---

## ¿Por qué no la App Store?

La pauta **5.2.3** prohíbe aplicaciones que "guarden, conviertan o descarguen medios de fuentes de terceros (por ejemplo, Apple Music, YouTube, SoundCloud, Vimeo, etc.) sin la autorización explícita de esas fuentes". Adquirir música de YouTube es lo que *es* Soundsible, por lo que la única versión que Apple aprobaría es una sin la función: un reproductor de biblioteca, y no este proyecto.

Estas son las ventajas y limitaciones de cada vía de distribución:

|                                     | Tienda de aplicaciones | Sideloading                        |
| ----------------------------------- | ---------------------- | ------------------------------------ |
| Programa de desarrollador Apple     | 99 €/año               | No es necesario                      |
| La aplicación puede ser ella misma. | No                     | si                                   |
| Instalar                            | Un toque               | SideStore y una renovación de 7 días |
| Pantalla de navegación CarPlay      | Posible                | No                                   |

La última fila requiere un matiz: **AltStore PAL** podría recuperar gran parte de las ventajas que se pierden con el sideloading, sin eliminar funciones de la aplicación. El código está preparado, pero esta vía no se ha ejecutado; consulta su estado más abajo.

## La opción de pago: AltStore PAL

Todo para esto ya está en el repositorio, inactivo. Está escrito aquí para que el día que se pague sea una tarde y no un proyecto de investigación.

### Lo que compra

|                                      | Sideloading (hoy)             | AltStore PAL                                                       |
| ------------------------------------ | ---------------------------------- | ------------------------------------------------------------------ |
| Costo para el desarrollador          | nada                               | 99 €/año                                                           |
| Computadora necesaria para instalar  | una vez, para configurar SideStore | **nunca**: el mercado se instala desde Safari                      |
| Firma                                | caduca cada 7 días                 | permanente                                                         |
| Límite de tres aplicaciones          | si                                 | no                                                                 |
| donde funciona                       | en todas partes                    | UE, Japón, Brasil                                                  |
| ¿Es necesario reducir la aplicación? | no                                 | no: la certificación notarial revisa la seguridad, no el contenido |

La aplicación es gratuita y no monetiza, por lo que no se debe nada más que la membresía: la tarifa de tecnología básica de Apple solo comienza por encima del millón de primeras instalaciones anuales.

### Donde estas

```bash
python3 scripts/altstore_pal_preflight.py
```

Imprime la lista de verificación completa con lo que se ha hecho y lo que sigue. Los pasos que ocurren en un navegador no dejan nada que detectar, así que regístrelos a mano:

```bash
python3 scripts/altstore_pal_preflight.py --confirm membership
```

### El orden

1. **Únase al Programa para desarrolladores Apple** como individuo: sin D-U-N-S, verificado en uno o dos días. Según la Ley de Servicios Digitales de la UE, su nombre, dirección, teléfono y correo electrónico se publican en su listado, y se acepta un apartado postal para la dirección.
2. **Solicite el Anexo de términos alternativos para aplicaciones en la UE** en el portal para desarrolladores. Sin él no hay ninguna distribución alternativa.
3. **Registre su ID de desarrollador con AltStore PAL** a través de [su API REST](https://faq.altstore.io/developers/distribute-with-altstore-pal). Responde con un token de seguridad.
4. **App Store Connect → Usuarios y acceso → Integraciones → Marketplace → +** y pega ese token. Luego elija Soundsible como aplicación para distribuir.
5. **Almacene las credenciales** que necesita el flujo de trabajo: la verificación previa nombra los seis secretos y las tres variables, con lo que es cada uno.
6. **Ejecute el flujo de trabajo `iOS AltStore PAL`.** Crea un archivo firmado y lo carga en App Store Connect.
7. **App Store Connect → la versión → Información de revisión de la aplicación → Tipo de revisión → Notarización.** Guardar, *Agregar para revisión*, *Enviar a revisión de la aplicación*. Este es el paso que importa: revisada según las Pautas de revisión de notarización, la aplicación se juzga por su seguridad e integridad, no por el origen de su música.
8. **Al aceptar, Apple genera el Paquete de Distribución Alternativa** por sí solo.
9. **Recopile el ADP** a través de la API REST de AltStore PAL y alójelo con su estructura de directorios y hashes de archivos intactos. Un recurso de versión GitHub no puede hacer eso: es un archivo plano. GitHub Pages en `soundsible.github.io` puede.
10. **Genere la fuente PAL** y publíquela junto con la sideloading:

    ```bash
    python3 scripts/altstore_source.py \
      --ipa <the signed ipa> \
      --marketplace-id "$SOUNDSIBLE_MARKETPLACE_ID" \
      --download-url "$SOUNDSIBLE_ADP_BASE_URL" \
      --out apps-pal.json
    ```

Ambas fuentes mantienen el mismo identificador de paquete, por lo que PAL actualiza una instalación descargada existente en lugar de colocar una segunda copia al lado.

### Qué se verifica y qué no

Esto importa más de lo que parece. Los archivos PAL se encuentran en el repositorio junto al código que CI ejercita en cada inserción, y nada en su *apariencia* los distingue. Cualquiera (una persona o un agente) que lea `ios-altstore-pal.yml` podría asumir razonablemente que funciona. No es así, porque nunca se le ha dado la oportunidad.

| | Estado |
|---|---|
| `ios-build.yml`, generación de IPA | **Solo se ha verificado la compilación.** Genera un IPA real; la instalación y la ejecución nunca se han probado. |
| `scripts/altstore_source.py`, parte de instalación externa | **Solo se ha verificado la generación.** Se ejecuta al publicar versiones y tiene pruebas; nadie ha instalado la aplicación desde su fuente. |
| `scripts/altstore_source.py`, parte de `--marketplace-id` | Nombres de campos tomados de la documentación; tiene pruebas de su *estructura*, pero ningún cliente ha instalado nunca desde una fuente generada por él. |
| `scripts/altstore_pal_preflight.py` | **Verificado.** Tiene pruebas y se ejecuta. Es una lista de comprobación para algo que no está verificado. |
| `.github/workflows/ios-altstore-pal.yml` | **Nunca se ha ejecutado. Ni una sola vez.** |
| `ios/exportOptions/app-store-connect.plist` | **Nunca se ha usado.** |

La aprobación de CI no dice nada sobre los dos últimos: nada en CI los ejecuta.

### De dónde vinieron los pasos PAL

Todos leídos **2026-08-06**. Tanto Apple como AltStore mueven estas páginas, así que vuelva a verificar antes de confiar en ellas.

1. [Distribuir con AltStore PAL](https://faq.altstore.io/developers/distribute-with-altstore-pal): los pasos ordenados, el registro de ID de desarrollador a través de su API REST, el token del mercado App Store Connect y el requisito de alojar el ADP con su estructura de directorios y hashes de archivos intactos.
2. [Crear una fuente](https://faq.altstore.io/developers/make-a-source): el esquema JSON y que `marketplaceID` solo se requiere para aplicaciones notariadas en PAL.
3. [Enviar para certificación notarial](https://developer.apple.com/help/app-store-connect/managing-alternative-distribution/submit-for-notarization): que la compilación se carga como cualquier otra, que la diferencia es el tipo de revisión y que Apple genera el propio ADP al momento de la aceptación.
4. [DMA y aplicaciones en la UE](https://developer.apple.com/support/dma-and-apps-in-the-eu/): que la notarización revisa la seguridad y la integridad en lugar del contenido, que un desarrollador individual no necesita organización y que la tarifa de tecnología básica comienza por encima del millón de primeras instalaciones anuales.

### Suposiciones pendientes de verificar

- **`method: app-store-connect`** en la lista de exportación. La lista de métodos encontrada durante la investigación fue *app-store, ad-hoc, paquete, empresa, desarrollo, desarrollador-id, mac-application*, sin ningún `app-store-connect` en ella. El reciente Xcode pasó a llamarse `app-store` a `app-store-connect`; Nunca se confirmó cuál quiere el Xcode 26. Si la exportación se queja del método, pruebe con `app-store`.
- **`xcrun altool --upload-app`.** Documentado para cargas de App Store Connect, pero altool quedó obsoleto en favor de `notarytool` en macOS y puede desaparecer o cambiarse en Xcode 26. Opciones alternativas: `xcrun notarytool` o exportOptions `destination: upload` con `-authenticationKeyPath`.
- **`~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8`.** ruta de búsqueda documentada de altool y discutible si el punto anterior cambia.
- **`CODE_SIGN_IDENTITY="Apple Distribution"`.** La cadena exacta depende de cómo se llama el certificado. `security find-identity -v -p codesigning` en el ejecutor dirá.
- **Si es necesario el paso 9.** La documentación de AltStore menciona las compilaciones de procesamiento PAL automáticamente, lo que puede hacer que la recolección manual del ADP sea innecesaria.

---

## Compilar la aplicación

**No necesitas una Mac para compilar las partes que contienen la lógica.** `ios/` está dividido para que todo, excepto SwiftUI y AVFoundation shell, sea Swift simple:

```bash
# Core library — API client, queue, offline policy. Runs anywhere.
docker run --rm -v "$PWD/ios/SoundsibleKit":/w -w /w swift:6.3 swift test
```

La interfaz nativa de la aplicación necesita Xcode, y el flujo de trabajo `iOS` GitHub Actions es donde eso sucede: los ejecutores macOS son gratuitos y no están medidos para repositorios públicos. Genera el proyecto Xcode con [XcodeGen](https://github.com/yonaskolb/XcodeGen) desde [`ios/project.yml`](../ios/project.yml), crea un archivo sin firmar y adjunta el `.ipa` como un artefacto.

El `.xcodeproj` se genera, nunca se incluye en el repositorio: nadie en este proyecto posee una Mac para editar uno, por lo que un archivo de proyecto versionado sería un archivo que ningún colaborador podría cambiar.

En una Mac:

```bash
brew install xcodegen
cd ios && xcodegen generate && open Soundsible.xcodeproj
```

### Diseño

| Camino               | que es                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `ios/SoundsibleKit/` | Modelos, cliente API, emparejamiento, `PlayQueue`, `OfflineLibrary`. Sin dependencias de frameworks de Apple; probado en Linux.  |
| `ios/App/Audio/`     | `AVAudioSession`, los dos decks, Now Playing, comandos remotos, el cargador de transmisiones autenticado. |
| `ios/App/Model/`     | `AppModel` (emparejado o no) y `PlayerModel` (lo que está sonando).                                       |
| `ios/App/Views/`     | Emparejamiento, navegación, Reproducción en curso, configuración.                                         |
| `ios/project.yml`    | El proyecto Xcode, como YAML.                                                                             |

La aplicación se dirige a **iOS 26** y está construida con el SDK de iOS 26, por lo que adopta Liquid Glass en lugar de optar por no participar con `UIDesignRequiresCompatibility`; de todos modos, una trampilla de escape que Apple elimina en Xcode 27. El destino de la aplicación se ejecuta en el modo de idioma Swift 6 con `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor`, el valor predeterminado de Xcode 26 para un nuevo proyecto; `SoundsibleKit` permanece deliberadamente como `nonisolated` porque es la parte que funciona fuera del hilo principal.

### Lo que le pide al motor

Solo lo que ya existe; consulte [CAR\_INTEGRATION.md](CAR_INTEGRATION.md):

- `GET /api/car/home`, `GET /api/car/items/<id>` para navegar
- `GET /api/static/stream/<track_id>`, `GET /api/static/cover/<track_id>`
- `POST /api/pairing/sessions/claim`, `GET /api/pairing/verify`
- `POST /api/devices/register`, `PUT /api/playback/state`

Todo lleva `Authorization: Bearer <paired-device token>`.
