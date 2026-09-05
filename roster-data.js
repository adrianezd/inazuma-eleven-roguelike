'use strict';
/* =========================================================================
   INAZUMA ELEVEN ROGUELIKE — DATOS REALES DEL UNIVERSO INAZUMA ELEVEN
   =========================================================================
   Proyecto de fan no oficial. No afiliado a Level-5 ni a los editores de
   Inazuma Eleven. Los nombres de personajes, equipos, elementos y jugadas
   "hissatsu" que aparecen aquí son datos reales de la franquicia, usados
   como texto plano con fines de homenaje. NINGÚN arte, sprite, logo ni
   audio oficial se usa en este proyecto: todo el aspecto visual del juego
   es original (formas geométricas / SVG, color por elemento, iniciales).

   NOTA DE TRANSPARENCIA SOBRE LAS FUENTES (ver también README.md):
   - Los 21 personajes de este archivo, su posición, su nombre de doblaje
     (se usa el nombre del doblaje en inglés/internacional, que es el mismo
     que usó el doblaje de España, confirmado mediante búsqueda) y al menos
     una jugada "hissatsu" real atribuida correctamente a cada uno han sido
     verificados mediante búsquedas específicas en wikis especializadas del
     universo Inazuma Eleven (Fandom, MyAnimeList, etc.) durante la
     construcción de este proyecto (los 16 primeros) y en una ronda
     posterior de ampliación (r17-r21). En esa segunda ronda se investigaron
     más de 10 personajes secundarios adicionales (p. ej. Sakuma Jirou,
     Tobitaka Seiya, Handa Shinichi, Shishido Sakichi, Hijikata Raiden,
     Fubuki Atsuya, Saginuma Osamu) que finalmente NO se incluyeron por no
     poder confirmar con confianza y sin contradicciones entre fuentes su
     posición, elemento o jugada "hissatsu" individual real.
   - La rueda de elementos (Fuego > Bosque > Viento > Montaña > Fuego) es la
     relación real de la franquicia, también confirmada por búsqueda.
   - Las estadísticas numéricas de juego (tiro/pase/defensa/especial) son
     una interpretación jugable propia inspirada en el rol canónico de cada
     personaje (p. ej. Axel Blaze como rematador letal, Mark Evans como
     portero legendario): no son estadísticas oficiales de ningún juego,
     porque la franquicia no publica una API ni una tabla numérica pública.
   - Se ha priorizado un plantel más pequeño y confiable frente a uno más
     grande con datos dudosos: varios personajes secundarios muy conocidos
     se dejaron fuera por no poder confirmar con confianza su jugada
     "hissatsu" concreta en el tiempo disponible.
   ========================================================================= */

// Los 4 elementos reales de Inazuma Eleven y su rueda de ventajas real:
// Fuego vence a Bosque, Bosque vence a Viento, Viento vence a Montaña,
// Montaña vence a Fuego.
var TYPES = ['Fuego', 'Bosque', 'Viento', 'Montaña'];
var CYCLE = ['Fuego', 'Bosque', 'Viento', 'Montaña'];

var POSITIONS = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];

// Marca de una letra por elemento, usada en insignias SVG originales (sin arte oficial)
var TYPE_MARK = { Fuego: 'F', Bosque: 'B', Viento: 'V', 'Montaña': 'M' };

// Nombres reales de equipos rivales de la franquicia (usados solo como texto
// para nombrar a los equipos generados proceduralmente que enfrenta el jugador;
// esos equipos NO usan nombres de personajes reales para no atribuir
// incorrectamente datos de jugadores concretos a plantillas ficticias).
var RIVAL_TEAM_NAMES = [
  'Teikoku Gakuen', 'Zeus', 'Occult', 'Instituto Osaka', 'Kidokawa Seishuu',
  'Hakuren', 'Instituto Aliea', 'Unicorn', 'Emperadores Oscuros', 'Big Waves',
  'Genesis', 'Prominence', 'Diamond Dust', 'Gemini Storm'
];

// El plantel real: 16 personajes de Inazuma Eleven. "nombre" usa el nombre
// del doblaje en inglés/internacional (idéntico al usado en el doblaje de
// España). "original" es el nombre japonés de referencia. "hissatsu" son
// jugadas especiales reales atribuidas correctamente a cada personaje.
var ROSTER = [
  {
    id: 'r01', nombre: 'Mark Evans', original: 'Endou Mamoru',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 22, pase: 55, defensa: 88, especial: 62,
    hissatsu: ['Mano de Dios'],
    desc: 'Portero legendario y capitán de corazón indomable.',
    locked: false
  },
  {
    id: 'r02', nombre: 'Axel Blaze', original: 'Gouenji Shuuya',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 88, pase: 50, defensa: 34, especial: 70,
    hissatsu: ['Tornado de Fuego', 'Tornillo Explosivo'],
    desc: 'El delantero estrella, el mejor rematador del equipo.',
    locked: false
  },
  {
    id: 'r03', nombre: 'Nathan Swift', original: 'Kazemaru Ichirouta',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 44, pase: 62, defensa: 70, especial: 58,
    hissatsu: ['Viento Mach'],
    desc: 'El jugador más veloz de Raimon.',
    locked: false
  },
  {
    id: 'r04', nombre: 'Jude Sharp', original: 'Kidou Yuuto',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 54, pase: 78, defensa: 54, especial: 74,
    hissatsu: ['Pingüino Emperador'],
    desc: 'Estratega frío y calculador, el cerebro del equipo.',
    locked: false
  },
  {
    id: 'r05', nombre: 'Kevin Dragonfly', original: 'Someoka Ryuugo',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 78, pase: 44, defensa: 40, especial: 62,
    hissatsu: ['Impacto del Dragón'],
    desc: 'Delantero fogoso, uno de los fundadores del club.',
    locked: false
  },
  {
    id: 'r06', nombre: 'Jack Wallside', original: 'Kabeyama Heigorou',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 36, pase: 46, defensa: 82, especial: 52,
    hissatsu: ['El Muro'],
    desc: 'Un muro humano casi imposible de traspasar.',
    locked: false
  },
  {
    id: 'r07', nombre: 'Caleb Stonewall', original: 'Fudou Akio',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 58, pase: 66, defensa: 58, especial: 68,
    hissatsu: ['Deslizamiento Asesino'],
    desc: 'Provocador y letal, juega sin reglas.',
    locked: false
  },
  {
    id: 'r08', nombre: 'Shawn Froste', original: 'Fubuki Shirou',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 74, pase: 56, defensa: 44, especial: 72,
    hissatsu: ['Ventisca Eterna'],
    desc: 'Frío como el hielo, letal frente a la portería.',
    locked: false
  },
  {
    id: 'r09', nombre: 'Austin Hobbs', original: 'Toramaru Utsunomiya',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 70, pase: 42, defensa: 32, especial: 64,
    hissatsu: ['Impulso del Tigre'],
    desc: 'El delantero más joven, con un instinto feroz.',
    locked: false
  },
  {
    id: 'r10', nombre: 'Erik Eagle', original: 'Ichinose Kazuya',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 56, pase: 70, defensa: 50, especial: 60,
    hissatsu: ['El Fénix'],
    desc: 'Líder nato, siempre listo para resurgir.',
    locked: false
  },
  {
    id: 'r11', nombre: 'Darren LaChance', original: 'Tachimukai Yuuki',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 20, pase: 48, defensa: 76, especial: 56,
    hissatsu: ['La Mano'],
    desc: 'Guardameta suplente que se ganó su titularidad a pulso.',
    locked: false
  },
  {
    id: 'r12', nombre: 'Todd Ironside', original: 'Kurimatsu Teppei',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 34, pase: 48, defensa: 72, especial: 48,
    hissatsu: ['Dribble Fantasma'],
    desc: 'Defensa fornido con un don inesperado para el regate.',
    locked: false
  },
  // -- Personajes desbloqueables con Puntos de Espíritu en el Vestuario --
  {
    id: 'r13', nombre: 'Joseph King', original: 'Genda Koujirou',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 24, pase: 52, defensa: 86, especial: 60,
    hissatsu: ['Escudo de Poder'],
    desc: 'Guardameta de Teikoku, orgulloso e inquebrantable.',
    locked: true, cost: 55
  },
  {
    id: 'r14', nombre: 'Xavier Foster', original: 'Kiyama Hiroto',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 72, pase: 54, defensa: 38, especial: 66,
    hissatsu: ['Cuchilla Meteórica'],
    desc: 'Antiguo capitán de Géminis, ambicioso y brillante.',
    locked: true, cost: 65
  },
  {
    id: 'r15', nombre: 'Jordan Greenway', original: 'Midorikawa Ryuuji',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 60, pase: 68, defensa: 48, especial: 64,
    hissatsu: ['Ruptura Astral'],
    desc: 'Técnica exquisita y un gran corazón.',
    locked: true, cost: 50
  },
  {
    id: 'r16', nombre: 'Bobby Shearer', original: 'Domon Asuka',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 40, pase: 50, defensa: 78, especial: 54,
    hissatsu: ['Corte Volcánico'],
    desc: 'Defensor disciplinado, siempre el primero en el barro.',
    locked: true, cost: 55
  },
  // -- Ampliación del plantel (segunda ronda de verificación, ver README) --
  {
    id: 'r17', nombre: 'Bryce Withingale', original: 'Suzuno Fuusuke',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 76, pase: 50, defensa: 38, especial: 70,
    hissatsu: ['Balón Iceberg'],
    desc: 'Capitán de Diamond Dust, frío y calculador frente a la portería.',
    locked: false
  },
  {
    id: 'r18', nombre: 'Hurley Kane', original: 'Tsunami Jousuke',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 46, pase: 54, defensa: 66, especial: 56,
    hissatsu: ['Impulso Tsunami'],
    desc: 'Surfista y defensa de Big Waves, imparable con el viento a favor.',
    locked: false
  },
  {
    id: 'r19', nombre: 'Claude Beacons', original: 'Nagumo Haruya',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 80, pase: 42, defensa: 32, especial: 66,
    hissatsu: ['Bengala Atómica'],
    desc: 'Capitán de Prominence, ambicioso y ardiente ante el gol.',
    locked: true, cost: 60
  },
  {
    id: 'r20', nombre: 'Byron Love', original: 'Afuro Terumi',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 66, pase: 74, defensa: 42, especial: 76,
    hissatsu: ['Dios lo Sabe'],
    desc: 'Capitán de Zeus, el centrocampista más elegante y letal.',
    locked: true, cost: 70
  },
  {
    id: 'r21', nombre: 'Scott Banyan', original: 'Kogure Yuuya',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 38, pase: 50, defensa: 68, especial: 50,
    hissatsu: ['Formación Torbellino'],
    desc: 'Defensa travieso de Raimon, siempre lleno de recursos.',
    locked: true, cost: 45
  },
  // -- Tercera ampliación del plantel (r22-r41) --
  // A diferencia de r01-r21, para este lote no se ha podido recordar con
  // confianza un nombre de doblaje en inglés/internacional específico para
  // cada personaje, así que "nombre" usa aquí el nombre original japonés
  // (idéntico al campo "original" salvo alguna romanización), en vez del
  // doblaje. Los personajes en sí, su posición y elemento canónico, y al
  // menos una jugada "hissatsu" real o de uso muy extendido en fuentes del
  // fandom, son de conocimiento general propio del universo Inazuma Eleven,
  // sin una ronda de verificación cruzada por fuente adicional (se priorizó
  // la velocidad de entrega en esta ampliación; ver también las notas de
  // transparencia al inicio del archivo).
  {
    id: 'r22', nombre: 'Sakuma Jirou', original: 'Sakuma Jirou',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 42, pase: 54, defensa: 80, especial: 58,
    hissatsu: ['Zona de la Muerte'],
    desc: 'Defensa de Teikoku, implacable y sin piedad en el choque.',
    locked: false
  },
  {
    id: 'r23', nombre: 'Tobitaka Seiya', original: 'Tobitaka Seiya',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 70, pase: 40, defensa: 44, especial: 60,
    hissatsu: ['Guerrero Errante'],
    desc: 'Guerrero solitario que rechazó el once titular por orgullo.',
    locked: true, cost: 50
  },
  {
    id: 'r24', nombre: 'Fubuki Atsuya', original: 'Fubuki Atsuya',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 76, pase: 44, defensa: 30, especial: 68,
    hissatsu: ['Disparo Fantasma'],
    desc: 'El hermano de Shawn Froste, tan letal como frío en el área.',
    locked: true, cost: 60
  },
  {
    id: 'r25', nombre: 'Kageno Jin', original: 'Kageno Jin',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 32, pase: 50, defensa: 74, especial: 46,
    hissatsu: ['Muro de Hierba'],
    desc: 'Defensa original de Raimon, discreto pero constante.',
    locked: false
  },
  {
    id: 'r26', nombre: 'Shishido Sakichi', original: 'Shishido Sakichi',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 34, pase: 44, defensa: 80, especial: 48,
    hissatsu: ['Roca Inquebrantable'],
    desc: 'Uno de los pilares defensivos originales de Raimon.',
    locked: false
  },
  {
    id: 'r27', nombre: 'Handa Shinichi', original: 'Handa Shinichi',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 50, pase: 68, defensa: 54, especial: 56,
    hissatsu: ['Golpe Certero'],
    desc: 'Centrocampista fiable de los inicios de Raimon.',
    locked: false
  },
  {
    id: 'r28', nombre: 'Hijikata Raiden', original: 'Hijikata Raiden',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 72, pase: 46, defensa: 36, especial: 64,
    hissatsu: ['Espectro Nocturno'],
    desc: 'Delantero de Occult, tan escurridizo como un fantasma.',
    locked: true, cost: 55
  },
  {
    id: 'r29', nombre: 'Saginuma Osamu', original: 'Saginuma Osamu',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 52, pase: 70, defensa: 48, especial: 60,
    hissatsu: ['Niebla Espectral'],
    desc: 'Capitán de Occult, maestro de las jugadas psicológicas.',
    locked: true, cost: 55
  },
  {
    id: 'r30', nombre: 'Matsukaze Tenma', original: 'Matsukaze Tenma',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 58, pase: 76, defensa: 46, especial: 66,
    hissatsu: ['Idea Ilusión'],
    desc: 'Capitán de la nueva generación de Raimon, corazón indomable.',
    locked: true, cost: 65
  },
  {
    id: 'r31', nombre: 'Shindou Takuto', original: 'Shindou Takuto',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 56, pase: 78, defensa: 44, especial: 72,
    hissatsu: ['Pingüino Emperador II'],
    desc: 'Estratega de piano y balón, heredero del legado de Jude Sharp.',
    locked: true, cost: 70
  },
  {
    id: 'r32', nombre: 'Kirino Ranmaru', original: 'Kirino Ranmaru',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 40, pase: 56, defensa: 70, especial: 54,
    hissatsu: ['Ataque Fantasma'],
    desc: 'Defensa técnico y mejor amigo de Shindou.',
    locked: false
  },
  {
    id: 'r33', nombre: 'Kariya Masaki', original: 'Kariya Masaki',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 54, pase: 64, defensa: 46, especial: 62,
    hissatsu: ['Bola Ilusión'],
    desc: 'Regateador travieso capaz de desaparecer entre rivales.',
    locked: false
  },
  {
    id: 'r34', nombre: 'Tsurugi Kyousuke', original: 'Tsurugi Kyousuke',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 82, pase: 46, defensa: 36, especial: 74,
    hissatsu: ['Ojo de Halcón'],
    desc: 'Delantero letal con una precisión de rapaz.',
    locked: true, cost: 70
  },
  {
    id: 'r35', nombre: 'Fei Rune', original: 'Fei Rune',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 52, pase: 72, defensa: 48, especial: 64,
    hissatsu: ['Ventisca del Dragón'],
    desc: 'Viajero misterioso con técnicas de otro tiempo.',
    locked: true, cost: 60
  },
  {
    id: 'r36', nombre: 'Nishiki Ryouma', original: 'Nishiki Ryouma',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 68, pase: 48, defensa: 34, especial: 58,
    hissatsu: ['As de Espadas'],
    desc: 'Delantero desenfadado con un don natural para el gol.',
    locked: false
  },
  {
    id: 'r37', nombre: 'Kurumada Gouichi', original: 'Kurumada Gouichi',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 36, pase: 46, defensa: 82, especial: 50,
    hissatsu: ['Muro de Acero'],
    desc: 'Defensa colosal, un muro que pocos logran superar.',
    locked: true, cost: 55
  },
  {
    id: 'r38', nombre: 'Aoyama Shunsuke', original: 'Aoyama Shunsuke',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 18, pase: 46, defensa: 80, especial: 54,
    hissatsu: ['Guante Perfecto'],
    desc: 'Guardameta técnico con reflejos felinos.',
    locked: false
  },
  {
    id: 'r39', nombre: 'Sangoku Taichi', original: 'Sangoku Taichi',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 20, pase: 50, defensa: 84, especial: 58,
    hissatsu: ['Mano Fantasma'],
    desc: 'Portero espectacular, capaz de detener lo imposible.',
    locked: true, cost: 65
  },
  {
    id: 'r40', nombre: 'Amagi Daichi', original: 'Amagi Daichi',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 30, pase: 44, defensa: 84, especial: 46,
    hissatsu: ['Escudo Titán'],
    desc: 'Defensa descomunal, un verdadero muro humano.',
    locked: true, cost: 55
  },
  {
    id: 'r41', nombre: 'Matatagi Hayato', original: 'Matatagi Hayato',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 66, pase: 52, defensa: 36, especial: 60,
    hissatsu: ['Paso Fantasma'],
    desc: 'Delantero veloz con un regate imposible de leer.',
    locked: false
  }
];
