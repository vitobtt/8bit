# PIZZA PANZA

Snake de 8 bits en el que manejas a un pizzero glotón: cada pizza que se come lo hace más largo y más gordo. Si choca contra la pared, contra su propia barriga o contra un horno, vuelve al punto de inicio.

Funciona entero en el navegador, sin servidor: `public/` se publica tal cual en Vercel (https://8bit-rose.vercel.app).

## Cómo se juega
- **Mover:** flechas o WASD. En el móvil, desliza el dedo sobre la pantalla o usa la cruceta.
- **Eructo turbo:** Espacio (en el móvil, un toque en la pantalla o el botón BURP)
- **Pausa:** P o Esc · **Sonido:** M

| Objeto | Efecto |
|---|---|
| Pizza | +10 puntos, creces y engordas 2 kg |
| Pizza dorada | +50 puntos, creces 3 casillas. Desaparece a los 6 s |
| Guindilla | Durante 6 s los puntos valen el doble y vas más rápido |
| Ensalada | ¡Dieta! Pierdes 3 casillas, 6 kg y el combo |
| Piña | +30 puntos y un efecto de caos aleatorio durante 6 s (ver abajo). Sale desde el nivel 2 |
| Horno | Obstáculo. Salen a partir del nivel 3 |

### Eructo turbo
Cada pizza llena la barra de **GASES** (la dorada llena 3 y la piña 2). Cuando está llena, pulsa Espacio: el pizzero suelta un eructo, sale disparado 5 casillas y durante un momento **atraviesa su propia barriga y los hornos**. Sirve para escapar cuando te has encerrado. Contra la pared no hay truco: el eructo frena en seco y tienes que girar a tiempo.

### Piña (caos)
Al comerla te toca uno de estos efectos al azar:
- **Controles al revés**
- **El mundo del revés:** el tablero se gira 180°
- **Las pizzas huyen:** se alejan de ti
- **Llueven pizzas:** caen 6 pizzas extra, un regalo para quien sea rápido

## Lo que engancha
- **Combos:** si comes una pizza menos de 5 s después de la anterior, el multiplicador sube (hasta x5) y el sonido se hace más agudo.
- **La dificultad va con el tamaño:** cada casilla que crece el pizzero lo acelera un poco (hasta casi el triple de la velocidad inicial). Cada 5 casillas subes de nivel: aparecen hornos nuevos y las pizzas especiales duran menos. Una ensalada te encoge y te frena, así que puede venirte bien como respiro.
- **Engorde visible:** cuantos más kilos, más ancha la barriga y más grande la cabeza.
- **Récord y top 5** guardados en el navegador. Al perder te dice cuánto te faltó para batir tu récord.
- **14 logros.** Algunos desbloquean pizzeros nuevos (Napolitano, Picante, Ninja, Hawaiano, Dorado, Galáctico). Al acabar cada partida se muestra el siguiente logro por conseguir.

Los récords y logros se guardan en `localStorage`, así que se guardan por navegador y equipo: no se comparten entre alumnos.

## Ajustes
Están al principio de `public/client.js`: `START` (punto de inicio), `COMBO_MS`, `SEGS_PER_LEVEL`, `BASE_TICK` y `MIN_TICK` (velocidad inicial y máxima), `FEVER_MS`, `GAS_MAX`, `BURP_STEPS`, `GHOST_STEPS` y `CHAOS_MS`. Los efectos de la piña están en `CHAOS`. La curva de velocidad está en `tickMs()` y los logros en `ACHS`.

## Probar en local
Abre `public/index.html` en el navegador, o sirve la carpeta con cualquier servidor estático (`npx serve public`).
