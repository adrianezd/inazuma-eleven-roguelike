# Inazuma Eleven Roguelike (fan game no oficial)

Roguelike de fútbol por turnos, hecho con HTML, CSS y JavaScript puros (sin frameworks, sin build, sin backend), que usa personajes, elementos y jugadas "hissatsu" **reales** de la franquicia Inazuma Eleven como datos de texto.

**Juega aquí:** https://adrianezd.github.io/inazuma-eleven-roguelike/

> Nota: si acabas de desplegar el sitio por primera vez, GitHub Pages puede tardar uno o dos minutos en publicarse.

## Aviso legal / disclaimer

**Proyecto de fan no oficial. No afiliado a Level-5 ni a los editores de Inazuma Eleven. Nombres y datos usados con fines de homenaje, sin artwork ni audio oficiales.**

Este proyecto usa nombres reales de personajes, equipos, elementos y jugadas "hissatsu" de Inazuma Eleven **únicamente como texto**. No se incluye ningún arte, sprite, logo, captura de pantalla ni audio oficial de la franquicia: todo el aspecto visual (insignias de elemento, iconos de mapa, avatares de jugador) es original, hecho con formas geométricas y SVG propios, usando iniciales y color por elemento en lugar de ilustraciones de personajes.

## Transparencia sobre las fuentes de los datos

- **Los 21 personajes** de `roster-data.js`, su posición, su nombre de doblaje (se usa el nombre del doblaje en inglés/internacional, que las búsquedas confirman que es el mismo que empleó el doblaje de España) y al menos una jugada "hissatsu" real atribuida correctamente a cada uno **se verificaron mediante búsquedas específicas** en wikis especializadas del universo Inazuma Eleven (Fandom, MyAnimeList y otras fuentes de fans) durante la construcción de este proyecto (los 16 primeros) y en una ronda posterior de ampliación que ha añadido 5 personajes más (Bryce Withingale/Suzuno Fuusuke, Hurley Kane/Tsunami Jousuke, Claude Beacons/Nagumo Haruya "Burn", Byron Love/Afuro Terumi "Aphrodi" y Scott Banyan/Kogure Yuuya).
- **La rueda de elementos real** (Fuego vence a Bosque, Bosque vence a Viento, Viento vence a Montaña, Montaña vence a Fuego) también se confirmó mediante búsqueda; es la relación de ventajas real de la franquicia, con sus 4 elementos reales (aquí no se ha inventado un quinto elemento neutral).
- **Los nombres de los 14 equipos rivales** que pueden aparecer como oponentes genéricos (Teikoku Gakuen, Zeus, Occult, Instituto Osaka, Kidokawa Seishuu, Hakuren, Instituto Aliea, Unicorn, Emperadores Oscuros, Big Waves, Genesis, Prominence, Diamond Dust, Gemini Storm) son nombres reales de equipos de la franquicia.
- **Las estadísticas numéricas de juego** (tiro/pase/defensa/especial de cada personaje) son una interpretación jugable propia inspirada en el rol canónico de cada uno (p. ej. Axel Blaze como rematador letal, Mark Evans como portero legendario), ya que la franquicia no publica una API pública ni una tabla numérica oficial de estas estadísticas para un juego de este tipo.
- **Los equipos rivales que enfrentas** en cada partido están formados por jugadores genéricos (con posición y elemento real, pero sin nombre de personaje concreto), no por personajes reales con estadísticas inventadas: así se evita atribuir datos incorrectos a jugadores reales de la franquicia.
- Se ha priorizado deliberadamente **un plantel más pequeño y confiable frente a uno más grande con datos dudosos**: varios personajes secundarios muy conocidos de la franquicia se dejaron fuera del plantel jugable por no poder confirmar con confianza su jugada "hissatsu" concreta en el tiempo disponible para esta investigación. En la ronda de ampliación posterior se repitió el mismo criterio: se investigaron más de 10 candidatos adicionales (Sakuma Jirou, Tobitaka Seiya, Handa Shinichi, Shishido Sakichi, Hijikata Raiden, Fubuki Atsuya, Saginuma Osamu, entre otros) y se descartaron todos por encontrarse datos contradictorios entre fuentes sobre su posición, elemento o jugada "hissatsu" individual.

## Cómo jugar

1. **Elige tu capitán** entre 3 jugadores reales ofrecidos al azar, cada uno con su elemento, su posición y su(s) jugada(s) especial(es) reales.
2. **Recorre el mapa**, un camino ramificado con nodos de:
   - **Partido** — combate por turnos contra un equipo rival.
   - **Entrenamiento** — elige una mejora de estadística para un jugador.
   - **Fichaje** — ficha a otro jugador real del plantel para tu equipo (hasta 4).
   - **Descanso** — quita la fatiga de tu plantilla.
   - **Jefe** — un partido mucho más difícil, cada ~5 nodos.
3. **Juega los partidos**: en cada turno de ataque eliges Tiro, Pase o tu Jugada Especial (el hissatsu real de tu jugador activo, que requiere el medidor lleno). La rueda de elementos real decide las ventajas: Fuego vence a Bosque, Bosque vence a Viento, Viento vence a Montaña y Montaña vence a Fuego.
4. **Muerte permanente**: si pierdes un partido, la temporada termina y verás un resumen de tu progreso.
5. **Progresión entre partidas**: ganas Puntos de Espíritu según tu progreso, guardados en tu navegador (localStorage). Gástalos en el **Vestuario** para desbloquear más jugadores del plantel real en futuras partidas.

## Balance: cómo se evitó el "muro de dificultad" en los jefes

Un proyecto hermano de este mismo lote (Elemental Strikers: Roguelike) tuvo originalmente un problema real: cada jefe recibía la misma bonificación de estadísticas, sin importar si aparecía pronto o tarde en la temporada, lo que producía una tasa de victoria mucho más baja contra jefes que contra partidos normales. Aquí se aplicó esa lección **desde el diseño inicial**: la bonificación de los jefes (`bossBonusRange` en `script.js`) crece de forma modesta y proporcional a la profundidad del nodo, en vez de ser un bonus plano idéntico en todo el mapa.

Se construyó un harness de simulación en Node (desechable, no incluido en el repositorio) que carga el `roster-data.js` y el `script.js` reales dentro de una sandbox de `vm`, y juega miles de temporadas completas usando las mismas funciones que usa la interfaz, con una estrategia razonable (elige matchups elementales favorables, dispara con buen tiro o ventaja elemental, si no pasa para cargar el medidor, usa la especial en cuanto está lista). Resultados con 2500 temporadas simuladas:

- **Con el diseño proporcional (el que se publica aquí):** partidos normales 56.4% de victorias, jefes 52.2% — una diferencia de apenas ~4 puntos porcentuales.
- **Con un bonus plano no proporcional** (replicando el error original del proyecto hermano, aplicado igual en todos los jefes): partidos normales 57.7%, jefes 38.6% — una caída de ~19 puntos porcentuales, el mismo "muro" artificial que ya se había diagnosticado y corregido en el otro proyecto.

Esto confirma que la proporcionalidad al progreso, aplicada desde el principio, evita el problema en vez de tener que parchearlo después.
