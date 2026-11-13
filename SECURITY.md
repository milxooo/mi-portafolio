# Política de Seguridad y Divulgación Responsable

## Notificación de Vulnerabilidades
La seguridad de este portafolio y sus proyectos asociados se toma en serio. Si descubres una vulnerabilidad de seguridad o un problema de privacidad, por favor notifícalo de manera responsable.

### Canal de Contacto
- **Correo Electrónico:** juliancf245@gmail.com
- **Tiempo de Respuesta Estimado:** Menos de 48 horas para acuse de recibo y evaluación.

### Alcance
- Código fuente alojado en el repositorio `milxooo/mi-portafolio`.
- Despliegue en producción en GitHub Pages: `https://milxooo.github.io/mi-portafolio/`.

### Política de Divulgación Coordinada
- Por favor no divulgar públicamente la vulnerabilidad hasta que se haya aplicado y probado la corrección correspondiente.
- No se autorizan ataques de denegación de servicio (DoS/DDoS) ni intentos de acceso a cuentas de terceros.

## Limitaciones conocidas del hosting (GitHub Pages)
GitHub Pages no permite configurar cabeceras HTTP personalizadas. Por eso:
- La **Content-Security-Policy** se aplica mediante `<meta http-equiv>` y solo incluye directivas que los navegadores respetan en `<meta>`. Se eliminó `frame-ancestors` porque se ignora en `<meta>`; **este sitio no puede impedir ser embebido en un iframe** (clickjacking) mientras use Pages.
- `X-Content-Type-Options: nosniff` se eliminó de `<meta>` porque los navegadores lo ignoran; solo funciona como cabecera HTTP.
- Opción informativa (no planificada): un hosting con cabeceras configurables permitiría ambas protecciones.

## Otras notas
- `robots.txt` solo orienta a rastreadores cooperativos y **no es control de acceso**; todo lo publicado es público.
- `npm test` ejecuta controles básicos (secretos obvios, enlaces externos, política `<meta>`, datos). Aprobarlos no garantiza que el sitio sea seguro.
- Las GitHub Actions están fijadas por SHA de commit (la versión va en un comentario).
- La tipografía Inter se sirve localmente (`assets/fonts/`); no hay peticiones a terceros.
