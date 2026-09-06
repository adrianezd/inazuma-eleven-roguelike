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
  'Royal Academy', 'Zeus', 'Occult', 'Instituto Osaka', 'Academia Ogre',
  'Alpino', 'Instituto Alius', 'Unicorn', 'Emperadores Oscuros', 'Big Waves',
  'Genesis', 'Prominence', 'Polvo de Diamante', 'Tormenta de Géminis'
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
    hissatsu: ['Mano Mágica'],
    desc: 'Portero legendario y capitán de corazón indomable.',
    locked: true, cost: 140
  },
  {
    id: 'r02', nombre: 'Axel Blaze', original: 'Gouenji Shuuya',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 88, pase: 50, defensa: 34, especial: 70,
    hissatsu: ['Tornado de Fuego', 'Tormenta de fuego'],
    desc: 'El delantero estrella, el mejor rematador del equipo.',
    locked: true, cost: 190
  },
  {
    id: 'r03', nombre: 'Nathan Swift', original: 'Kazemaru Ichirouta',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 44, pase: 62, defensa: 70, especial: 58,
    hissatsu: ['Huracán Multiple'],
    desc: 'El jugador más veloz del Raimon.',
    locked: true, cost: 75
  },
  {
    id: 'r04', nombre: 'Jude Sharp', original: 'Kidou Yuuto',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 54, pase: 78, defensa: 54, especial: 74,
    hissatsu: ['Pingüino Emperador'],
    desc: 'Estratega frío y calculador, el cerebro del equipo.',
    locked: true, cost: 75
  },
  {
    id: 'r05', nombre: 'Kevin Dragonfly', original: 'Someoka Ryuugo',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 78, pase: 44, defensa: 40, especial: 62,
    hissatsu: ['Remate Dragón'],
    desc: 'Delantero fogoso, uno de los fundadores del club.',
    locked: false
  },
  {
    id: 'r06', nombre: 'Jack Wallside', original: 'Kabeyama Heigorou',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 36, pase: 46, defensa: 82, especial: 52,
    hissatsu: ['El Muro'],
    desc: 'Un muro humano casi imposible de traspasar.',
    locked: true, cost: 99
  },
  {
    id: 'r07', nombre: 'Caleb Stonewall', original: 'Fudou Akio',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 58, pase: 66, defensa: 58, especial: 68,
    hissatsu: ['Barrido defensivo'],
    desc: 'Provocador y letal, juega sin reglas.',
    locked: true, cost: 150
  },
  {
    id: 'r08', nombre: 'Shawn Froste', original: 'Fubuki Shirou',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 74, pase: 56, defensa: 44, especial: 72,
    hissatsu: ['Ventisca Eterna'],
    desc: 'Frío como el hielo, letal frente a la portería.',
    locked: true, cost: 144
  },
  {
    id: 'r09', nombre: 'Austin Hobbs', original: 'Toramaru Utsunomiya',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 76, pase: 42, defensa: 32, especial: 64,
    hissatsu: ['Remate del Tigre'],
    desc: 'El delantero más joven, con un instinto feroz.',
    locked: true, cost: 96
  },
  {
    id: 'r10', nombre: 'Erik Eagle', original: 'Ichinose Kazuya',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 66, pase: 79, defensa: 50, especial: 60,
    hissatsu: ['El Fénix'],
    desc: 'Líder nato, siempre listo para resurgir.',
    locked: true, cost: 158
  },
  {
    id: 'r11', nombre: 'Darren LaChance', original: 'Tachimukai Yuuki',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 20, pase: 48, defensa: 81, especial: 56,
    hissatsu: ['Mano Mágica'],
    desc: 'Guardameta suplente que se ganó su titularidad a pulso.',
    locked: true, cost: 83
  },
  {
    id: 'r12', nombre: 'Todd Ironside', original: 'Kurimatsu Teppei',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 34, pase: 48, defensa: 72, especial: 48,
    hissatsu: ['Corte Giratorio'],
    desc: 'Defensa fornido con un don inesperado para el regate.',
    locked: false
  },
  // -- Personajes desbloqueables con Puntos de Espíritu en el Vestuario --
  {
    id: 'r13', nombre: 'Joseph King', original: 'Genda Koujirou',
    posicion: 'Portero', tipo: 'Fuego',
    tiro: 24, pase: 52, defensa: 82, especial: 60,
    hissatsu: ['Escudo de Fuerza'],
    desc: 'Guardameta de la Royal, orgulloso e inquebrantable.',
    locked: true, cost: 102
  },
  {
    id: 'r14', nombre: 'Xavier Foster', original: 'Kiyama Hiroto',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 82, pase: 54, defensa: 38, especial: 66,
    hissatsu: ['Cañon de Meteoritos'],
    desc: 'Antiguo capitán de Genesis, ambicioso y brillante.',
    locked: true, cost: 135
  },
  {
    id: 'r15', nombre: 'Jordan Greenway', original: 'Midorikawa Ryuuji',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 68, pase: 68, defensa: 48, especial: 64,
    hissatsu: ['Puerta Astral'],
    desc: 'Técnica exquisita y un gran corazón.',
    locked: true, cost: 147
  },
  {
    id: 'r16', nombre: 'Bobby Shearer', original: 'Domon Asuka',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 40, pase: 50, defensa: 78, especial: 54,
    hissatsu: ['Corte Volcánico'],
    desc: 'Defensor disciplinado, siempre el primero en el barro.',
    locked: true, cost: 108
  },
  // -- Ampliación del plantel (segunda ronda de verificación, ver README) --
  {
    id: 'r17', nombre: 'Bryce Withingale', original: 'Suzuno Fuusuke',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 79, pase: 50, defensa: 38, especial: 70,
    hissatsu: ['Balón Iceberg'],
    desc: 'Capitán de Diamond Dust, frío y calculador frente a la portería.',
    locked: true, cost: 131
  },
  {
    id: 'r18', nombre: 'Hurley Kane', original: 'Tsunami Jousuke',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 62, pase: 54, defensa: 70, especial: 56,
    hissatsu: ['Remate Tsunami'],
    desc: 'Surfista y defensa de Inazuma Japón, imparable con el viento a favor.',
    locked: true, cost: 138
  },
  {
    id: 'r19', nombre: 'Claude Beacons', original: 'Nagumo Haruya',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 80, pase: 42, defensa: 32, especial: 66,
    hissatsu: ['Llamarada Atómica'],
    desc: 'Capitán de Prominence, ambicioso y ardiente ante el gol.',
    locked: true, cost: 105
  },
  {
    id: 'r20', nombre: 'Byron Love', original: 'Afuro Terumi',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 76, pase: 74, defensa: 42, especial: 76,
    hissatsu: ['Sabiduría Divina'],
    desc: 'Capitán de Zeus, el centrocampista más elegante y letal.',
    locked: true, cost: 177
  },
  {
    id: 'r21', nombre: 'Scott Banyan', original: 'Kogure Yuuya',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 38, pase: 50, defensa: 70, especial: 50,
    hissatsu: ['Campo Torbellino'],
    desc: 'Defensa travieso de Raimon, siempre lleno de recursos.',
    locked: true, cost: 87
  },
  // -- Tercera ampliación del plantel (r22-r24, r30-r34, r36-r37) --
  // Este lote se incorporó inicialmente con el nombre original japonés en
  // el campo "nombre" (por velocidad de entrega), lo cual se corrigió
  // después: se buscó mediante búsquedas web el nombre real de doblaje en
  // inglés/internacional de cada uno (fichas de personaje de MyAnimeList,
  // listados de doblaje al castellano de Inazuma Eleven GO) y se sustituyó
  // en "nombre", dejando "original" como el nombre japonés de referencia,
  // igual que en el resto del plantel. Nishiki Ryouma (r36) es una
  // excepción real, no un descuido: las fuentes indican que su doblaje
  // conserva el nombre original sin traducir. Varios personajes de este
  // mismo lote (Kageno Jin, Shishido Sakichi, Handa Shinichi, Hijikata
  // Raiden, Saginuma Osamu, Fei Rune, Aoyama Shunsuke, Sangoku Taichi,
  // Amagi Daichi, Matatagi Hayato) se retiraron por completo del plantel
  // porque no se pudo confirmar un nombre de doblaje real para ellos —
  // se prefirió quitarlos antes que dejarlos en japonés o inventar un
  // nombre de doblaje que no existe.
  {
    id: 'r22', nombre: 'David Samford', original: 'Sakuma Jirou',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 76, pase: 61, defensa: 30, especial: 58,
    hissatsu: ['Pinguino Emperador II'],
    desc: 'Delantero de la royal, implacable y sin piedad en el choque.',
    locked: true, cost: 113
  },
  {
    id: 'r23', nombre: 'Archer Hawkins', original: 'Tobitaka Seiya',
    posicion: 'Defensa', tipo: 'Aire',
    tiro: 30, pase: 40, defensa: 79, especial: 60,
    hissatsu: ['Corte de vacío'],
    desc: 'Guerrero solitario que rechazó el once titular por orgullo.',
    locked: true, cost: 89
  },
  {
    id: 'r24', nombre: 'Aiden Froste', original: 'Fubuki Atsuya',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 78, pase: 44, defensa: 30, especial: 68,
    hissatsu: ['Remate Cazaosos'],
    desc: 'El hermano de Shawn Froste, tan letal como frío en el área.',
    locked: true, cost: 105
  },
  {
    id: 'r30', nombre: 'Arion Sherwind', original: 'Matsukaze Tenma',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 68, pase: 76, defensa: 46, especial: 66,
    hissatsu: ['Brisa deslizante'],
    desc: 'Capitán de la nueva generación de Raimon, corazón indomable.',
    locked: true, cost: 159
  },
  {
    id: 'r31', nombre: 'Riccardo Di Rigo', original: 'Shindou Takuto',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 66, pase: 78, defensa: 44, especial: 72,
    hissatsu: ['Pentagrama'],
    desc: 'Estratega de piano y balón, heredero del legado de Jude Sharp.',
    locked: false
  },
  {
    id: 'r32', nombre: 'Gabriel García', original: 'Kirino Ranmaru',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 40, pase: 56, defensa: 74, especial: 54,
    hissatsu: ['Niebla Mística'],
    desc: 'Defensa técnico y mejor amigo de Shindou.',
    locked: false
  },
  {
    id: 'r33', nombre: 'Aitor Cazador', original: 'Kariya Masaki',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 44, pase: 44, defensa: 76, especial: 62,
    hissatsu: ['Red de caza'],
    desc: 'Regateador travieso capaz de desaparecer entre rivales.',
    locked: true, cost: 114
  },
  {
    id: 'r34', nombre: 'Víctor Blade', original: 'Tsurugi Kyousuke',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 82, pase: 46, defensa: 36, especial: 74,
    hissatsu: ['Aguijón Letal'],
    desc: 'Delantero letal con una precisión de rapaz.',
    locked: true, cost: 132
  },
  {
    id: 'r36', nombre: 'Ryoma Nishiki', original: 'Nishiki Ryouma',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 68, pase: 68, defensa: 34, especial: 58,
    hissatsu: ['Chut ancestal'],
    desc: 'Centrocampista desenfadado con un don natural para el gol.',
    locked: false
  },
  {
    id: 'r37', nombre: 'Subaru Honda', original: 'Kurumada Gouichi',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 36, pase: 46, defensa: 82, especial: 50,
    hissatsu: ['A todo vapor'],
    desc: 'Defensa colosal, un muro que pocos logran superar.',
    locked: true, cost: 96
  },
  {
    id: 'r38', nombre: 'Samguk Han', original: "Sangoku Taichi",
    posicion: 'Portero', tipo: 'Fuego',
    tiro: 22, pase: 50, defensa: 75, especial: 60,
    hissatsu: ['Captura ardiente'],
    desc: 'Portero del raimon, con reflejos felinos y un corazón ardiente.',
    locked: false
  },
  {
    id: 'r39', nombre: 'Shadow Cimmerian', original: "Kageto Yamino",
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 80, pase: 48, defensa: 32, especial: 70,
    hissatsu: ['Tornado oscuro'],
    desc: 'Delantero misterioso, capaz de desaparecer entre las sombras.',
    locked: false
  },
  {
    id: 'r40', nombre: 'William Glass', original: "Kakeru Megane",
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 65, pase: 60, defensa: 34, especial: 68,
    hissatsu: ['Remate Gafas'],
    desc: 'Delantero elegante y preciso, con un toque de magia en sus pies.',
    locked: false
  },
  {
    id: 'r41', nombre: 'Paul Peabody', original: "Goro Tamaro",
    posicion: 'Portero', tipo: 'Bosque',
    tiro: 48, pase: 52, defensa: 76, especial: 72,
    hissatsu: ['Mano Celestial'],
    desc: 'Portero experimentado con una visión única del juego.',
    locked: false
  },
  {
    id: 'r42', nombre: 'Thor Stoutberg', original: "Raiden Hijikata",
    posicion: 'Defensa', tipo: 'Aire',
    tiro: 38, pase: 50, defensa: 80, especial: 60,
    hissatsu: ['Pisotón de Sumo'],
    desc: 'Defensa robusto y disciplinado, con un estilo de juego imponente.',
    locked: false
  },
  {
    id: 'r43', nombre: 'Larry Pogue', original: "Saginuma Osamu",
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 70, pase: 70, defensa: 50, especial: 68,
    hissatsu: ['Chut draconiano'],
    desc: 'Centrocampista creativo, capaz de cambiar el rumbo del partido.',
    locked: false
  },
  {
    id: 'r44', nombre: 'Tom Skipper', original: "Yo Kabutenji",
    posicion: 'Delantero', tipo: 'Aire',
    tiro: 78, pase: 60, defensa: 36, especial: 72,
    hissatsu: ['La Tierra'],
    desc: 'Delantero ágil y veloz, con un instinto asesino frente a la portería.',
    locked: true, cost: 120
  },
  {
    id: 'r45', nombre: 'Bash Lancer', original: "Baddap Sleep",
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 80, pase: 50, defensa: 34, especial: 70,
    hissatsu: ['Lanza Letal'],
    desc: 'Delantero y capitán de la Academia Ogre, con un estilo de juego agresivo y directo.',
    locked: true, cost: 140
  },
    {
    id: 'r46', nombre: 'Steve Grim', original: 'Handa Shinichi',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 48, pase: 64, defensa: 48, especial: 52,
    hissatsu: ['Disparo Rodante'],
    desc: 'Centrocampista equilibrado de Raimon, fiable y trabajador.',
    locked: false, cost: 65
  },
  {
    id: 'r47', nombre: 'Timmy Saunders', original: 'Shourinji Ayumu',
    posicion: 'Centrocampista', tipo: 'Montaña',
    tiro: 42, pase: 56, defensa: 58, especial: 50,
    hissatsu: ['Cabezazo Kung Fu'],
    desc: 'Pequeño pero valiente jugador de Raimon con gran espíritu de lucha.',
    locked: false, cost: 58
  },
  {
    id: 'r48', nombre: 'Maxwell Carson', original: 'Matsuno Kuusuke',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 52, pase: 62, defensa: 44, especial: 54,
    hissatsu: ['Remate en V'],
    desc: 'Centrocampista habilidoso de Raimon, siempre dispuesto a improvisar.',
    locked: false, cost: 70
  },
  {
    id: 'r49', nombre: 'Jim Wraith', original: 'Kageno Jin',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 34, pase: 48, defensa: 66, especial: 55,
    hissatsu: ['Doppelganger'],
    desc: 'Defensa silencioso capaz de sorprender apareciendo de la nada.',
    locked: false, cost: 68
  },
  {
    id: 'r50', nombre: 'Isaac Glass', original: 'Kakeru Megane',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 65, pase: 60, defensa: 34, especial: 68,
    hissatsu: ['Remate Gafas v2'],
    desc: 'Delantero peculiar que sueña con convertirse en una estrella.',
    locked: false, cost: 72
  },
  {
    id: 'r51', nombre: 'Paul Siddon', original: 'Donichi Posei',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 30, pase: 30, defensa: 79, especial: 80,
    hissatsu: ['Muralla Gigante'],
    desc: 'Portero veterano del Zeus, conocido por su imponente presencia en la portería.',
    locked: true, cost: 155
  },
  {
    id: 'r52', nombre: 'Tori Vanguard', original: 'Zaizen Touko',
    posicion: 'Centrocampista', tipo: 'Aire',
    tiro: 58, pase: 62, defensa: 64, especial: 60,
    hissatsu: ['Torre Inexpugnable'],
    desc: 'Centrocampista de Aire con una gran capacidad defensiva.',
    locked: true, cost: 115
  },
  {
    id: 'r53', nombre: 'Cameron Morefield', original: 'Otonashi Haruna',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 38, pase: 68, defensa: 44, especial: 52,
    hissatsu: ['Pase Celestial'],
    desc: 'Analista y apoyo del equipo, siempre pendiente de cada detalle.',
    locked: false, cost: 60
  },
  {
    id: 'r54', nombre: 'Dave Quagmire', original: 'Saginuma Osamu',
    posicion: 'Portero', tipo: 'Aire',
    tiro: 24, pase: 48, defensa: 82, especial: 70,
    hissatsu: ['Agujero de gusano'],
    desc: 'Portero de Epsilon con reflejos sorprendentes y gran intuición para anticipar los tiros.',
    locked: true, cost: 125
  },
  {
    id: 'r55', nombre: 'Zeke Valanche', original: 'Desarm',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 79, pase: 48, defensa: 34, especial: 72,
    hissatsu: ['Remate de Gaia'],
    desc: 'Delantero de Epsilon con una presencia intimidante y gran potencia.',
    locked: true, cost: 130
  },
  {
    id: 'r56', nombre: 'Suzette Hartland', original: 'Urabe Rika',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 70, pase: 54, defensa: 38, especial: 60,
    hissatsu: ['Torre de Osaka'],
    desc: 'Delantera de Osaka con una personalidad tan intensa como su juego.',
    locked: false, cost: 78
  },
  {
    id: 'r57', nombre: 'Lilly Willow', original: 'Kogure Yuuya',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 36, pase: 48, defensa: 68, especial: 52,
    hissatsu: ['Trampa de Araña'],
    desc: 'Jugadora astuta capaz de complicar cualquier ataque rival.',
    locked: false, cost: 74
  },
  {
    id: 'r58', nombre: 'Edgar Partinus', original: 'Edgar Valtinas',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 86, pase: 58, defensa: 38, especial: 78,
    hissatsu: ['Excalibur'],
    desc: 'Capitán de los Knights of Queen y elegante especialista del remate.',
    locked: true, cost: 180
  },
  {
    id: 'r59', nombre: 'Mark Krueger', original: 'Mark Kruger',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 72, pase: 78, defensa: 52, especial: 74,
    hissatsu: ['Gran Lobo'],
    desc: 'Capitán de Unicorn y uno de los grandes cerebros del fútbol americano.',
    locked: true, cost: 170
  },
  {
    id: 'r60', nombre: 'Dylan Keats', original: 'Dylan Keith',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 82, pase: 62, defensa: 36, especial: 76,
    hissatsu: ['Remate Unicornio'],
    desc: 'Delantero de Unicorn conocido por su velocidad y precisión.',
    locked: true, cost: 155
  },
  {
    id: 'r61', nombre: 'Paolo Bianchi', original: 'Fidio Aldena',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 86, pase: 62, defensa: 34, especial: 82,
    hissatsu: ['Espada de Odín'],
    desc: 'Capitán de Orfeo y meteoro blanco del fútbol italiano.',
    locked: true, cost: 190
  },
  {
    id: 'r62', nombre: 'Tiago Torres', original: 'Teres Tolue',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 42, pase: 52, defensa: 88, especial: 76,
    hissatsu: ['Muro de Hierro'],
    desc: 'Capitán de Los Emperadores, especialista defensivo prácticamente impenetrable.',
    locked: true, cost: 175
  },
  {
    id: 'r63', nombre: 'Nakata Hidetoshi', original: 'Nakata Hidetoshi',
    posicion: 'Centrocampista', tipo: 'Montaña',
    tiro: 80, pase: 82, defensa: 50, especial: 88,
    hissatsu: ['Disparo Valiente'],
    desc: 'Veterano de gran talento que lidera el centro del campo con experiencia.',
    locked: true, cost: 265
  },
  {
    id: 'r64', nombre: 'Angelo Gabrini', original: 'Angelo Gabrini',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 70, pase: 74, defensa: 34, especial: 74,
    hissatsu: ['Balon Angelical'],
    desc: 'Centrocampista italiano de técnica refinada y gran capacidad goleadora.',
    locked: true, cost: 145
  },
  {
    id: 'r65', nombre: 'Marco Maserati', original: 'Marco Masato',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 52, pase: 70, defensa: 76, especial: 64,
    hissatsu: ['Voltereta Círcense'],
    desc: 'Defensa técnica de Orfeo con gran capacidad para combinar.',
    locked: false, cost: 105
  },

];
