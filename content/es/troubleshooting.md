# Yt-dlp "El formato solicitado no está disponible" — arreglar

**Causa:** Cuando la aplicación pasa cookies (por ejemplo, `--cookies-from-browser` o `--cookies`), YouTube puede devolver una lista de formatos diferente que no coincide con nuestra cadena de formato, por lo que yt-dlp genera "El formato solicitado no está disponible". La misma URL funciona desde el terminal porque el terminal a menudo se ejecuta sin cookies.

**Solución:** Descarga mediante CLI (subproceso). En caso de ese error, vuelva a intentarlo una vez con el mismo comando pero sin opciones de cookies. Ver `odst_tool/youtube_downloader.py` en `_download_audio`.
