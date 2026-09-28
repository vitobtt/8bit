# PIZZA PANZA

Snake de 8 bits en el que manejas a un pizzero glotón: cada pizza que se come lo hace más largo y más gordo. Si choca contra la pared, contra su propia barriga o contra un horno, vuelve al punto de inicio.

Funciona entero en el navegador, sin servidor: `public/` se publica tal cual en Vercel (https://8bit-rose.vercel.app).

## Cómo se juega
- **Mover:** flechas o WASD. En el móvil, desliza el dedo sobre la pantalla o usa la cruceta.
- **Pausa:** P o Esc · **Sonido:** M

| Objeto | Efecto |
|---|---|
| Pizza | +10 puntos, creces y engordas 2 kg |
| Pizza dorada | +50 puntos, creces 3 casillas. Desaparece a los 6 s |
| Guindilla | Durante 6 s los puntos valen el doble y vas más rápido |
| Ensalada | ¡Dieta! Pierdes 3 casillas, 6 kg y el combo |
| Horno | Obstáculo. Salen a partir del nivel 3 |

## Lo que engancha
- **Combos:** si comes una pizza menos de 5 s después de la anterior, el multiplicador sube (hasta x5) y el sonido se hace más agudo.
- **Niveles:** cada 8 pizzas subes de nivel y el pizzero va más rápido.
- **Engorde visible:** cuantos más kilos, más ancha la barriga y más grande la cabeza.
- **Récord y top 5** guardados en el navegador. Al perder te dice cuánto te faltó para batir tu récord.
- **12 logros.** Algunos desbloquean pizzeros nuevos (Napolitano, Picante, Ninja, Dorado, Galáctico). Al acabar cada partida se muestra el siguiente logro por conseguir.

Los récords y logros se guardan en `localStorage`, así que se guardan por navegador y equipo: no se comparten entre alumnos.

## Ajustes
Están al principio de `public/client.js`: `START` (punto de inicio), `COMBO_MS`, `PIZZAS_PER_LEVEL`, `FEVER_MS`. La velocidad está en `tickMs()` y los logros en `ACHS`.

## Probar en local
Abre `public/index.html` en el navegador, o sirve la carpeta con cualquier servidor estático (`npx serve public`).
