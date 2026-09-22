# 8 BITS BATTLE

Juego de 8 bits para el aula en el que todos luchan contra todos y solo puede quedar uno. El equipo del profesor hace de servidor y los alumnos se conectan por WebSockets desde el navegador.

## Arrancar (equipo del profesor)
1. Doble clic en `INICIAR.bat` (o ejecuta `npm install` y después `npm start`).
2. Se abre `http://localhost:3000`: es el **panel del profesor**. Tu IP sale arriba a la derecha.
3. Los alumnos abren en su navegador `http://TU_IP:3000`, escriben su nombre y pulsan **¡A LUCHAR!**
4. Cuando estén todos, pulsa **EMPEZAR PARTIDA**.

La primera vez, Windows pedirá permiso en el firewall para Node.js: marca **Redes privadas** y acepta.

## Reglas
- 3 vidas y **10 tiros como máximo** por partida.
- A los 25 s la zona roja empieza a cerrarse, y fuera de ella pierdes vida. Así la partida siempre termina, aunque todos se queden sin balas.
- Gana el último que siga vivo. Luego se vuelve a la sala para jugar otra partida.

## Controles
WASD/flechas para moverte · ratón para apuntar · clic o espacio para disparar · M para el sonido

## Ajustes
Están al principio de `server.js` (modo aula) o `party/server.js` (modo nube): `MAX_SHOTS`, `MAX_HP`, `SPEED`, `ZONE_DELAY` y el mapa (`MAP`).

## Modo nube (Vercel + PartyKit)
El modo aula de arriba usa un único proceso Node con estado en memoria y WebSockets sin más — no puede desplegarse en Vercel (funciones serverless, sin proceso persistente). Para jugar desde internet en vez de la red local del aula, el juego se separa en dos partes:
- **Frontend estático** (`public/`) → Vercel.
- **Servidor de la partida** (`party/server.js`, misma lógica que `server.js` pero adaptada) → PartyKit (Cloudflare), que sí mantiene el bucle del juego y el estado entre jugadores.

Pasos:
1. Crea cuenta gratis en [partykit.io](https://partykit.io) y despliega el servidor de juego:
   ```
   npx partykit login
   npm run pk:deploy
   ```
   Te dará un host tipo `8bits-battle.TU-USUARIO.partykit.dev`.
2. Pega ese host en `public/index.html`, en la línea `window.PARTYKIT_HOST = '';`.
3. Despliega `public/` en Vercel (importa el repo desde vercel.com, o `vercel deploy` con la CLI). `npm run build` no compila nada — solo sirve los archivos estáticos.
4. Comparte la URL de Vercel con la clase. El primero en abrirla es el profesor (panel de host); los siguientes entran como alumnos.

Para probar el servidor de juego en local antes de desplegarlo: `npm run pk:dev` (se sirve en `ws://localhost:1999/party/main`; pon `window.PARTYKIT_HOST = 'localhost:1999'` mientras pruebas).
