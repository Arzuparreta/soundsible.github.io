# Spanish terminology

The translator reads this file on every run. It exists because regenerating one
article at a time drifts: the published corpus already says both `relay` and
`relé` inside `relay.md`, and `contributing`, `agent-integration`, `ios` and
`install` address the reader as *usted* while every other article uses *tú*.

Edit this file to correct terminology. The next run of `npm run translate`
applies it to whatever it retranslates; to apply it everywhere at once, run
`npm run translate -- --all --force`.

## Register

Spanish of Spain, informal **tú** throughout (`abre`, `ejecuta`, `consulta` —
never `abra`, `ejecute`, `consulte`). Imperatives for instructions, as in the
English. Do not add courtesy formulas the original does not have.

## Terms

| English | Spanish | Note |
| --- | --- | --- |
| queue | cola | `playback queue` → `cola de reproducción` |
| library | biblioteca | |
| track | pista | |
| song | canción | when the original says *song*, not *track* |
| playlist | lista de reproducción | |
| player | reproductor | |
| engine | motor | the Soundsible process, not a car engine |
| listener | oyente | |
| broadcast (verb) | emitir | |
| broadcast (noun) | emisión | |
| listening room | sala de escucha | |
| settings, configuration | configuración | |
| release | versión | a published release; `v0.10.0` stays as written |
| download | descarga, descargar | |
| build (noun) | compilación | |
| backup | copia de seguridad | |
| session | sesión | |
| tracking | seguimiento | |
| relay | relay | **never `relé`**; `Community relay` → `relay comunitario` |
| deck | deck | the DJ term, left in English |
| sideloading | sideloading | left in English |
| setup wizard | asistente de configuración | |
| headless | sin interfaz gráfica | |

## Left in English

Product, feature and protocol names: Soundsible, Live, DJ, Auto Mode,
OpenSubsonic, AltStore, SideStore, Tailscale, Docker, Homebrew, winget,
GitHub, YouTube, Spotify, Apple Music.

Anything inside backticks, any URL, any file path, any environment variable and
any command — including the comments inside a code block. These are checked
byte for byte by `npm test`; a translated comment fails the build.
