# ⚔️ Gamificación y Economía - Guía Definitiva de Arquitectura

Si ya entiendes cómo funciona la Fundación y la parte social... es hora de entrar al casino. ¡Bienvenido al Modulo de Gamificación y Economía de DegaderSocial V2! 
Aquí te explico cómo funcionan los **combates en tiempo real** (La Arena) y cómo fluye el dinero invisible en nuestra plataforma (**DegaCoins**).

Si tienes 12 años y alguna vez has jugado a *Clash Royale* o comprado Monedas (V-Bucks/Robux) dentro de una app, este documento será pan comido para ti. 🚀

---

## 🎮 PARTE 1: La Arena (Gamificación)

DegaderSocial no es solo texto aburrido. Los usuarios pueden combatir en desafíos mentales teológicos en tiempo real. 

### 1. El Matchmaking (Buscando oponente)
Todo esto funciona mediante la brujería de los WebSockets (Archivo mágico: `src/services/arenaSocketService.js`).
1. Haces click en "Jugar". Tu navegador le grita al servidor a través de un tubo constante (`socket.emit('arena:findMatch')`).
2. El servidor te mete en una sala de espera invisible (`this.matchmakingQueue`).
3. Cuando otro jugador entra, el servidor **saca 10 preguntas aleatorias** de la base de datos (`Challenge.model.js`) y crea un campo de batalla (`ArenaMatch.model.js`).
4. ¡El servidor une los dos tubos a una sala de pelea!

### 2. Las Reglas del Combate "Tira y Afloja" (Tug-of-War)
Tu partida empieza con dos medidores gigantes:
* 🪢 **La Cuerda (Dominación):** Comienza justa a la mitad (50). Si aciertas una pregunta rápido, tiras de la cuerda +10 puntos (o más si fuiste rápido como un rayo). Para ganar, tienes que llevar la cuerda a 100 (Tú la atraes) o si pierdes llegará a 0 (El oponente la empujó).
* ♥️ **Vidas de jugador:** Ambos empiezan con 3 Vidas (`player1Health: 3`). Si te equivocas de respuesta o respondes muy muy tarde, el sistema baja tu vida. Con 0 vidas, mueres automáticamente.

**El Anti-Trampas Hardcore:** 
Si tu rival respondió primero y la pregunta cambió, y luego tú mandas la repuesta vieja para ganar puntos con trampa, el archivo `arenaSocketService.js` tiene un detector de *"Robo de pregunta"* que ignora tu truco.

### 3. Puntos de Gloria (PG) y La Recompensa
¿Qué pasa cuando la cuerda llega a tu lado y vences o tu oponente se desconecta cobardemente?
1. Eres bendecido con **+30 Puntos de Gloria (PG)**.
2. El perdedor es humillado con **-10 PG**.
3. Estos puntos se inyectan en tu Base de datos (`user.arena.rankPoints`).
4. **Alerta a la Nube:** Tu victoria lanza un grito oficial en el servidor (`eventBus.emit(ARENA_GAME_COMPLETED)`) para actualizar el enorme ranking de Redis (El Ranking Internacional de los mejores).

### 4. Las Temporadas (Seasons)
Tu esfuerzo no es eterno. Existe un contador `Season.model.js` con una fecha de muerte (`endsAt`).
Cuando el contador llega a cero, el servidor congela todo y reparte Cofres, Insignias VIP, e Items a tres escalas:
- Recompensas a los del "Top 1".
- Recompensas a los del "Top 10" y "Top 100".
- Recompensas de consolación por "participación".

---

## 💰 PARTE 2: Economía Publicitaria (Los DegaCoins)

Mantener un servidor no es gratis. ¿Cómo ganamos dinero sin arruinar la experiencia del usuario local? A través del sistema monetario de las **DegaCoins**.

Este sistema (que está integrado maravillosamente en `src/models/AdCredit.model.js`) es el corazón sangrante de tus anunciantes (Banners flotantes a la derecha de la App).

### 1. El Banco de DegaCoins
Todo anunciante de DegaderSocial (imagina la Editorial Cristiana "Vida") tiene en su cuenta un cofre virtual llamado `AdCredit`.
- Funciona como una máquina de maquinistas (Arcade). Ingresas a tu Panel (`ClientAdsDashboard`) y pagas 50 Dólares para obtener 1000 DegaCoins.
- El servidor guarda ese número de forma segura en `balance: 1000`.

### 2. La Hemorragia Automática (Gasto Silencioso)
1. Carlos (Un usuario normal) entra al Inicio de la App.
2. Un pedacito inteligente en nuestro código evalúa a Carlos y dice *"Mmm, Carlos tiene 25 años y busca Biblias"*, así que escoge el Anuncio de la Editorial "Vida".
3. Cuando Carlos **mira el anuncio en su pantalla** (se llama "Impresión publicitaria"), este sistema arranca el archivo del Ojo que Todo lo Ve (`AdImpression.model.js`).
4. Instantáneamente, viaja al balance de DegaCoins del Anunciante y ¡PUM! Le **descuenta 1 crédito automáticamente** (O el precio configurado por impresión).

### 3. Alarma Roja (Umbral)
Mongoose (nuestra mascota de Base de datos) tiene incrustado un "Grito de emergencia". 
En `AdCredit.model.js`, hay una regla interna (`pre-save`). En cuanto la Editorial se va gastando de 1 en 1 DegaCoins... 
> **3... 2... 1... ¡100 DEGACOINS SOLAMENTE!**

En cuanto la cuenta cae por debajo de 100 créditos, se enciende la luz `alertaBajoBalance = true`. Esto le envía un mail de pánico al anunciante para que recargue dólares en la App a través del Founder Dashboard y el servidor de pasarela de pagos, asegurando un flujo de ingresos constante para ti.

---

### 🔥 Resumen de Regla de Vida
- Si se te cae o crashea un combate en la Arena -> Modifica `arenaSocketService.js`.
- Si las tablas posicionales o los PG no suman correctamente -> Modifica cómo se dispara el `eventBus` en la Arena.
- Si un anuncio dice ser "Infinito" y no gasta monedas -> Revisa el Hook de Intersections (`AdsSidebar.jsx`) o asegúrate que el backend de `AdCredit` esté ejecutando bien `descontarCreditos()`.
