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
// NOTA: los nombres de esta lista y de RIVAL_TEAM_BOSSES se verificaron con
// cuidado hasta "Instituto Aliea" (ver README). Los añadidos a partir de ahí
// (marcados abajo) son de menor confianza -- se recuerdan de la franquicia
// pero no se han verificado con la misma rigurosidad que el resto; revísalos
// si te importa la precisión exacta del doblaje español.
var RIVAL_TEAM_NAMES = [
  'Royal Academy', 'Zeus', 'Occult', 'Otaku',
  'Alpino', 'Unicorn', 'Big Waves',
  'Brain', 'Wild', 'Shuriken', 'Kirkwood', 'Umbrella',
  'Tarjeteros', 'Veteranos Inazuma', 'Instituto Alius',
  'Cala Pirata', 'Sallys', 'Leones del desierto',
  'Academia Universal', 'Instituto Plenilunio',
  'Raimon Inakuni', 'Mary Times', 'Mar de Luna', 'Farm', 'Fauxshore',
  'Los arions', 'Mar de Árboles'
];

var RIVAL_TEAM_BOSSES = [
  'Royal Academy', 'Zeus', 'Academia Ogre',
  'Instituto Alius','Emperadores Oscuros',
  'Genesis', 'Prominence', 'Polvo de Diamante', 'Tormenta de Géminis', 'Dragones de Fuego',
  'Pequeños Gigantes', 'Épsilon', 'Los Emperadores', 'Os Reis', 'Neo Japón',
  'Protocolo Omega', 'Caos', 'El Dorado 01', 'Resistencia Japon', 'Resistencia Japón GO',
  'Gir', 'Gar', 'Ragnah', 'Alius Masters', 'Inazuma Japon', 'Inazuma Japon GO',
  'Chrono Storm', 'Dragon Link', 'Desesperdidos', 'Dinastía Galáctica',
  'Earth Eleven', 'Eclipse de Orión', 'El Dorado 02', 'El Dorado 03', 
  'Protocolo Omega 2.0', 'Protocolo Omega 3.0', 'Zanark Domain', 'Equipo Zero',
  'Falam Medius', 'Flota Ixar', 'Guardianes de La Reina', 'Orfeo', 'Élite Omega'
];

// Puntuación de "fuerza" de cada equipo (1-100), usada para que la CPU
// resuelva enfrentamientos entre rivales (torneo, FutDraft) con más sentido
// que un dado puro: cuanto más alta, más gana. Son valores de partida
// (equipos de RIVAL_TEAM_NAMES más bajos, de RIVAL_TEAM_BOSSES más altos,
// los que aparecen en ambas listas a medio camino) pensados para ajustar a
// mano con el tiempo, no una medición objetiva de nada.
var TEAM_POWER = {
  // Solo en RIVAL_TEAM_NAMES (nivel normal)
  'Occult': 28,
  'Alpino': 33, 'Unicorn': 40, 'Big Waves': 30,
  'Brain': 30, 'Wild': 32, 'Shuriken': 34, 'Kirkwood': 39, 'Umbrella': 18,
  'Tarjeteros': 16, 'Veteranos Inazuma': 38,
  'Cala Pirata': 21, 'Sallys': 24, 'Leones del desierto': 33,
  'Academia Universal': 29, 'Instituto Plenilunio': 34,
  'Raimon Inakuni': 17, 'Mary Times': 36, 'Mar de Luna': 29, 'Farm': 38, 'Fauxshore': 31,
  'Los arions': 27, 'Mar de Árboles': 37, 'Otaku': 23,
  // En las dos listas a la vez (versátiles, gama media-alta)
  'Royal Academy': 61, 'Zeus': 64, 'Instituto Alius': 65,
  // Solo en RIVAL_TEAM_BOSSES (nivel jefe)
  'Academia Ogre': 60, 'Emperadores Oscuros': 85, 'Genesis': 90,
  'Prominence': 73, 'Polvo de Diamante': 73, 'Tormenta de Géminis': 70, 'Dragones de Fuego': 70,
  'Pequeños Gigantes': 82, 'Épsilon': 74, 'Los Emperadores': 75, 'Os Reis': 75, 'Neo Japón': 74,
  'Protocolo Omega': 66, 'Caos': 75, 'El Dorado 01': 57, 'Resistencia Japon': 70, 'Resistencia Japón GO': 70,
  'Gir': 56, 'Gar': 56, 'Ragnah': 80, 'Alius Masters': 73, 'Inazuma Japon': 88, 'Inazuma Japon GO': 96,
  'Chrono Storm': 77, 'Dragon Link': 74, 'Desesperdidos': 70, 'Dinastía Galáctica': 78,
  'Earth Eleven': 88, 'Eclipse de Orión': 85, 'El Dorado 02': 75, 'El Dorado 03': 79,
  'Protocolo Omega 2.0': 76, 'Protocolo Omega 3.0': 78, 'Zanark Domain': 78, 'Equipo Zero': 81,
  'Falam Medius': 82, 'Flota Ixar': 83, 'Guardianes de La Reina': 81, 'Orfeo': 80,
  'Élite Omega': 88
};


// El plantel real: 16 personajes de Inazuma Eleven. "nombre" usa el nombre
// del doblaje en inglés/internacional (idéntico al usado en el doblaje de
// España). "original" es el nombre japonés de referencia. "hissatsu" son
// jugadas especiales reales atribuidas correctamente a cada personaje.
var ROSTER = [
  {
    id: 'r01', nombre: 'Mark Evans', original: 'Endou Mamoru',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 42, pase: 55, defensa: 88, especial: 88,
    hissatsu: ['Mano Mágica'],
    desc: 'Portero legendario y capitán de corazón indomable.',
    locked: true, cost: 140
  },
  {
    id: 'r02', nombre: 'Axel Blaze', original: 'Gouenji Shuuya',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 89, pase: 65, defensa: 32, especial: 87,
    hissatsu: ['Tornado de Fuego'],
    desc: 'El delantero estrella, el mejor rematador del equipo.',
    locked: true, cost: 190
  },
  {
    id: 'r03', nombre: 'Nathan Swift', original: 'Kazemaru Ichirouta',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 70, pase: 72, defensa: 69, especial: 65,
    hissatsu: ['Defensa Huracán'],
    desc: 'El jugador más veloz del Raimon.',
    locked: true, cost: 75
  },
  {
    id: 'r04', nombre: 'Jude Sharp', original: 'Kidou Yuuto',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 75, pase: 81, defensa: 60, especial: 80,
    hissatsu: ['Pingüino Emperador III'],
    desc: 'Estratega frío y calculador, el cerebro del equipo.',
    locked: true, cost: 75
  },
  {
    id: 'r05', nombre: 'Kevin Dragonfly', original: 'Someoka Ryuugo',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 77, pase: 61, defensa: 40, especial: 70,
    hissatsu: ['Remate Dragón'],
    desc: 'Delantero fogoso, uno de los fundadores del club.',
    locked: false
  },
  {
    id: 'r06', nombre: 'Jack Wallside', original: 'Kabeyama Heigorou',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 36, pase: 67, defensa: 79, especial: 70,
    hissatsu: ['El Muro'],
    desc: 'Un muro humano casi imposible de traspasar.',
    locked: true, cost: 99
  },
  {
    id: 'r07', nombre: 'Caleb Stonewall', original: 'Fudou Akio',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 71, pase: 80, defensa: 71, especial: 70,
    hissatsu: ['Pinguino Emperador III'],
    desc: 'Provocador y letal, juega sin reglas.',
    locked: true, cost: 150
  },
  {
    id: 'r08', nombre: 'Shawn Froste', original: 'Fubuki Shirou',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 73, pase: 56, defensa: 76, especial: 77,
    hissatsu: ['Paisaje Helado'],
    desc: 'Frío como el hielo, letal frente a la portería.',
    locked: true, cost: 144
  },
  {
    id: 'r09', nombre: 'Austin Hobbs', original: 'Toramaru Utsunomiya',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 78, pase: 70, defensa: 32, especial: 72,
    hissatsu: ['Remate del Tigre'],
    desc: 'El delantero más joven, con un instinto feroz.',
    locked: true, cost: 96
  },
  {
    id: 'r10', nombre: 'Erik Eagle', original: 'Ichinose Kazuya',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 74, pase: 80, defensa: 50, especial: 75,
    hissatsu: ['Fénix'],
    desc: 'Líder nato, siempre listo para resurgir.',
    locked: true, cost: 158
  },
  {
    id: 'r11', nombre: 'Darren LaChance', original: 'Tachimukai Yuuki',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 20, pase: 48, defensa: 81, especial: 72,
    hissatsu: ['Mano Mágica'],
    desc: 'Guardameta suplente que se ganó su titularidad a pulso.',
    locked: true, cost: 83
  },
  {
    id: 'r12', nombre: 'Todd Ironside', original: 'Kurimatsu Teppei',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 34, pase: 64, defensa: 77, especial: 48,
    hissatsu: ['Corte Giratorio'],
    desc: 'Defensa fornido con un don inesperado para el regate.',
    locked: false
  },
  // -- Personajes desbloqueables con Puntos de Espíritu en el Vestuario --
  {
    id: 'r13', nombre: 'Joseph King', original: 'Genda Koujirou',
    posicion: 'Portero', tipo: 'Fuego',
    tiro: 24, pase: 56, defensa: 83, especial: 73,
    hissatsu: ['Escudo de Fuerza'],
    desc: 'Guardameta de la Royal, orgulloso e inquebrantable.',
    locked: true, cost: 102
  },
  {
    id: 'r14', nombre: 'Xavier Foster', original: 'Kiyama Hiroto',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 82, pase: 54, defensa: 38, especial: 80,
    hissatsu: ['Cañon de Meteoritos'],
    desc: 'Antiguo capitán de Genesis, ambicioso y brillante.',
    locked: true, cost: 135
  },
  {
    id: 'r15', nombre: 'Jordan Greenway', original: 'Midorikawa Ryuuji',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 75, pase: 76, defensa: 51, especial: 70,
    hissatsu: ['Puerta Astral'],
    desc: 'Técnica exquisita y un gran corazón.',
    locked: true, cost: 147
  },
  {
    id: 'r16', nombre: 'Bobby Shearer', original: 'Domon Asuka',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 42, pase: 58, defensa: 78, especial: 54,
    hissatsu: ['Corte Volcánico'],
    desc: 'Defensor disciplinado, siempre el primero en el barro.',
    locked: true, cost: 108
  },
  // -- Ampliación del plantel (segunda ronda de verificación, ver README) --
  {
    id: 'r17', nombre: 'Bryce Withingale', original: 'Suzuno Fuusuke',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 82, pase: 60, defensa: 38, especial: 73,
    hissatsu: ['Balón Iceberg'],
    desc: 'Capitán de Diamond Dust, frío y calculador frente a la portería.',
    locked: true, cost: 131
  },
  {
    id: 'r18', nombre: 'Hurley Kane', original: 'Tsunami Jousuke',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 66, pase: 54, defensa: 70, especial: 56,
    hissatsu: ['Remate Tsunami'],
    desc: 'Surfista y defensa de Inazuma Japón, imparable con el viento a favor.',
    locked: true, cost: 138
  },
  {
    id: 'r19', nombre: 'Claude Beacons', original: 'Nagumo Haruya',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 83, pase: 60, defensa: 32, especial: 72,
    hissatsu: ['Llamarada Atómica'],
    desc: 'Capitán de Prominence, ambicioso y ardiente ante el gol.',
    locked: true, cost: 105
  },
  {
    id: 'r20', nombre: 'Byron Love', original: 'Afuro Terumi',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 84, pase: 76, defensa: 42, especial: 80,
    hissatsu: ['Sabiduría Divina'],
    desc: 'Capitán de Zeus, el centrocampista más elegante y letal.',
    locked: true, cost: 177
  },
  {
    id: 'r21', nombre: 'Scott Banyan', original: 'Kogure Yuuya',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 38, pase: 62, defensa: 77, especial: 70,
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
    tiro: 78, pase: 69, defensa: 40, especial: 67,
    hissatsu: ['Pinguino Emperador II'],
    desc: 'Delantero de la royal, implacable y sin piedad en el choque.',
    locked: true, cost: 113
  },
  {
    id: 'r23', nombre: 'Archer Hawkins', original: 'Tobitaka Seiya',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 30, pase: 40, defensa: 80, especial: 82,
    hissatsu: ['Corte de vacío'],
    desc: 'Guerrero solitario que rechazó el once titular por orgullo.',
    locked: true, cost: 89
  },
  {
    id: 'r24', nombre: 'Aiden Froste', original: 'Fubuki Atsuya',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 80, pase: 44, defensa: 30, especial: 74,
    hissatsu: ['Remate Cazaosos'],
    desc: 'El hermano de Shawn Froste, tan letal como frío en el área.',
    locked: true, cost: 105
  },
  {
    id: 'r30', nombre: 'Arion Sherwind', original: 'Matsukaze Tenma',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 78, pase: 78, defensa: 46, especial: 81,
    hissatsu: ['Brisa deslizante'],
    desc: 'Capitán de la nueva generación de Raimon, corazón indomable.',
    locked: true, cost: 159
  },
  {
    id: 'r31', nombre: 'Riccardo Di Rigo', original: 'Shindou Takuto',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 76, pase: 83, defensa: 44, especial: 78,
    hissatsu: ['Pentagrama'],
    desc: 'Estratega de piano y balón, heredero del legado de Jude Sharp.',
    locked: false
  },
  {
    id: 'r32', nombre: 'Gabriel García', original: 'Kirino Ranmaru',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 40, pase: 62, defensa: 78, especial: 70,
    hissatsu: ['Niebla Mística'],
    desc: 'Defensa técnico y mejor amigo de Riccardo.',
    locked: false
  },
  {
    id: 'r33', nombre: 'Aitor Cazador', original: 'Kariya Masaki',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 44, pase: 64, defensa: 78, especial: 67,
    hissatsu: ['Red de caza'],
    desc: 'Defensa travieso capaz de desaparecer entre rivales.',
    locked: true, cost: 114
  },
  {
    id: 'r34', nombre: 'Víctor Blade', original: 'Tsurugi Kyousuke',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 82, pase: 56, defensa: 36, especial: 74,
    hissatsu: ['Aguijón Letal'],
    desc: 'Delantero letal con una precisión de rapaz.',
    locked: true, cost: 132
  },
  {
    id: 'r36', nombre: 'Ryoma Nishiki', original: 'Nishiki Ryouma',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 76, pase: 74, defensa: 34, especial: 72,
    hissatsu: ['Chut ancestal'],
    desc: 'Delantero desenfadado con un don natural para el gol.',
    locked: false
  },
  {
    id: 'r37', nombre: 'Subaru Honda', original: 'Kurumada Gouichi',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 36, pase: 53, defensa: 75, especial: 60,
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
    tiro: 79, pase: 48, defensa: 32, especial: 70,
    hissatsu: ['Tornado oscuro'],
    desc: 'Delantero misterioso, capaz de desaparecer entre las sombras.',
    locked: false
  },
  {
    id: 'r40', nombre: 'William Glass', original: "Kakeru Megane",
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 68, pase: 60, defensa: 34, especial: 68,
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
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 38, pase: 60, defensa: 80, especial: 70,
    hissatsu: ['Pisotón de Sumo'],
    desc: 'Defensa robusto y disciplinado, con un estilo de juego imponente.',
    locked: false
  },
  {
    id: 'r43', nombre: 'Larry Pogue', original: "Saginuma Osamu",
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 75, pase: 70, defensa: 55, especial: 82,
    hissatsu: ['Chut draconiano'],
    desc: 'Centrocampista creativo, capaz de cambiar el rumbo del partido.',
    locked: false
  },
  {
    id: 'r44', nombre: 'Tom Skipper', original: "Yo Kabutenji",
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 80, pase: 60, defensa: 36, especial: 74,
    hissatsu: ['La Tierra'],
    desc: 'Delantero ágil y veloz, con un instinto asesino frente a la portería.',
    locked: true, cost: 120
  },
  {
    id: 'r45', nombre: 'Bash Lancer', original: "Baddap Sleep",
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 83, pase: 50, defensa: 34, especial: 76,
    hissatsu: ['Lanza Letal'],
    desc: 'Delantero y capitán de la Academia Ogro, con un estilo de juego agresivo y directo.',
    locked: true, cost: 140
  },
    {
    id: 'r46', nombre: 'Steve Grim', original: 'Handa Shinichi',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 65, pase: 69, defensa: 61, especial: 52,
    hissatsu: ['Disparo Rodante'],
    desc: 'Centrocampista equilibrado de Raimon, fiable y trabajador.',
    locked: false, cost: 65
  },
  {
    id: 'r47', nombre: 'Timmy Saunders', original: 'Shourinji Ayumu',
    posicion: 'Centrocampista', tipo: 'Montaña',
    tiro: 63, pase: 65, defensa: 58, especial: 63,
    hissatsu: ['Cabezazo Kung Fu'],
    desc: 'Pequeño pero valiente jugador de Raimon con gran espíritu de lucha.',
    locked: false, cost: 58
  },
  {
    id: 'r48', nombre: 'Maxwell Carson', original: 'Matsuno Kuusuke',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 72, pase: 62, defensa: 44, especial: 64,
    hissatsu: ['Remate en V'],
    desc: 'Centrocampista habilidoso de Raimon, siempre dispuesto a improvisar.',
    locked: false, cost: 70
  },
  {
    id: 'r49', nombre: 'Jim Wraith', original: 'Kageno Jin',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 34, pase: 48, defensa: 71, especial: 55,
    hissatsu: ['Doppelganger'],
    desc: 'Defensa silencioso capaz de sorprender apareciendo de la nada.',
    locked: false, cost: 68
  },
  {
    id: 'r50', nombre: 'Isaac Glass', original: 'Kazuto Megane', sprite: 'assets/sprites/r50.webp',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 69, pase: 62, defensa: 36, especial: 70,
    hissatsu: ['Remate Gafas v2'],
    desc: 'Delantero peculiar que sueña con convertirse en una estrella.',
    locked: false, cost: 72
  },
  {
    id: 'r51', nombre: 'Paul Siddon', original: 'Donichi Posei',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 51, pase: 50, defensa: 79, especial: 80,
    hissatsu: ['Muralla Gigante'],
    desc: 'Portero veterano del Zeus, conocido por su imponente presencia en la portería.',
    locked: true, cost: 155
  },
  {
    id: 'r52', nombre: 'Tori Vanguard', original: 'Zaizen Touko',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 58, pase: 62, defensa: 74, especial: 60,
    hissatsu: ['Torre Inexpugnable'],
    desc: 'Centrocampista de Aire con una gran capacidad defensiva.',
    locked: true, cost: 115
  },
  {
    id: 'r53', nombre: 'Bellatrix', original: 'Reina Yagami',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 77, pase: 74, defensa: 44, especial: 75,
    hissatsu: ['Pinguino Espacial'],
    desc: 'Hermana de Xene, con un estilo de juego elegante y preciso.',
    locked: false, cost: 60
  },
  {
    id: 'r54', nombre: 'Dave Quagmire', original: 'Saginuma Osamu',
    posicion: 'Portero', tipo: 'Viento',
    tiro: 54, pase: 65, defensa: 82, especial: 80,
    hissatsu: ['Agujero de gusano'],
    desc: 'Portero de Epsilon con reflejos sorprendentes y gran intuición para anticipar los tiros.',
    locked: true, cost: 125
  },
  {
    id: 'r55', nombre: 'Zeke Valanche', original: 'Desarm',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 75, pase: 57, defensa: 57, especial: 72,
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
    id: 'r57', nombre: 'Eugene Conwell', original: 'Kogure Yuuya',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 69, pase: 69, defensa: 48, especial: 69,
    hissatsu: ['Chut congelante'],
    desc: 'Cabeza bolo.',
    locked: false, cost: 74
  },
  {
    id: 'r58', nombre: 'Edgar Partinus', original: 'Edgar Valtinas',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 86, pase: 64, defensa: 38, especial: 78,
    hissatsu: ['Excalibur'],
    desc: 'Capitán de los Knights of Queen y elegante especialista del remate.',
    locked: true, cost: 180
  },
  {
    id: 'r59', nombre: 'Mark Krueger', original: 'Mark Kruger',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 76, pase: 80, defensa: 52, especial: 77,
    hissatsu: ['Gran Lobo'],
    desc: 'Capitán de Unicorn y uno de los grandes cerebros del fútbol americano.',
    locked: true, cost: 170
  },
  {
    id: 'r60', nombre: 'Dylan Keats', original: 'Dylan Keith',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 82, pase: 69, defensa: 36, especial: 77,
    hissatsu: ['Remate Unicornio'],
    desc: 'Delantero de Unicorn conocido por su velocidad y precisión.',
    locked: true, cost: 155
  },
  {
    id: 'r61', nombre: 'Paolo Bianchi', original: 'Fidio Aldena',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 85, pase: 78, defensa: 34, especial: 82,
    hissatsu: ['Espada de Odín'],
    desc: 'Capitán de Orfeo y meteoro blanco del fútbol italiano.',
    locked: true, cost: 190
  },
  {
    id: 'r62', nombre: 'Tiago Torres', original: 'Teres Tolue',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 42, pase: 72, defensa: 88, especial: 80,
    hissatsu: ['Muro de Hierro'],
    desc: 'Capitán de Los Emperadores, especialista defensivo prácticamente impenetrable.',
    locked: true, cost: 175
  },
  {
    id: 'r63', nombre: 'Nakata Hidetoshi', original: 'Nakata Hidetoshi',
    posicion: 'Centrocampista', tipo: 'Montaña',
    tiro: 80, pase: 84, defensa: 50, especial: 88,
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
    tiro: 52, pase: 70, defensa: 78, especial: 75,
    hissatsu: ['Voltereta Círcense'],
    desc: 'Defensa técnica de Orfeo con gran capacidad para combinar.',
    locked: false, cost: 105
  },
  {
    id: 'r66', nombre: 'Jimmy Mach', original: 'Maya Hayami',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 74, pase: 75, defensa: 34, especial: 70,
    hissatsu: ['Tiro Giratorio'],
    desc: 'Alcanza la velocidad del sonido y es capaz de rematar desde cualquier ángulo.',
    locked: false, cost: 110
  },
  {
    id: 'r67', nombre: 'Balt Decker', original: 'Balt Decker',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 50, pase: 65, defensa: 75, especial: 70,
    hissatsu: ['Ciclón'],
    desc: 'Defensa de pequeño tamaño pero gran capacidad defensiva.',
    locked: false, cost: 120
  },
  {
    id: 'r68', nombre: 'Fei Rune', original: 'Fei Rune',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 85, pase: 70, defensa: 32, especial: 80,
    hissatsu: ['Remate Rebotado'],
    desc: 'Viajero del tiempo que ayudó a Arion a salvar el fútbol.',
    locked: true, cost: 99999
  },
  {
    id: 'r69', nombre: 'Vladimir Blade', original: 'Yuichi Tsurugi',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 88, pase: 64, defensa: 36, especial: 80,
    hissatsu: ['Aguijón Escarlata'],
    desc: 'Hermano de Víctor Blade, un delantero letal con una precisión de rayo.',
    locked: true, cost: 99999
  },
  {
    id: 'r70', nombre: 'WonderBot', original: 'WonderBot',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 20, pase: 40, defensa: 90, especial: 80,
    hissatsu: ['Defensa Automática'],
    desc: 'Portero robotizado con reflejos sobrehumanos y una programación impecable.',
    locked: true, cost: 99999
  },
  {
    id: 'r71', nombre: 'Destra', original: 'Desuta',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 83, pase: 65, defensa: 30, especial: 80,
    hissatsu: ['Carga Negativa'],
    desc: 'Delantero de fuerza bruta, capaz de romper cualquier defensa.',
    locked: true, cost: 180
  },
  {
    id: 'r72', nombre: 'Sael', original: 'Sael',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 82, pase: 62, defensa: 34, especial: 80,
    hissatsu: ['Remate Celestial'],
    desc: 'Delantero de origen desconocido, con un estilo de juego místico y poderoso.',
    locked: true, cost: 160
  },
  {
  id: 'r73', nombre: 'Escavan Malice', original: 'Eska Bannel',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 81, pase: 50, defensa: 30, especial: 80,
    hissatsu: ['Lluvia Letal'],
    desc: 'Es tan temperamental que monta en cólera si pierde la ocasión de marcar',
    locked: true, cost: 170
  },
  {
    id: 'r74', nombre: 'Mystral Callous', original: 'Mistrene Callous',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 80, pase: 50, defensa: 30, especial: 80,
    hissatsu: ['Lluvia Letal'],
    desc: 'Puede parecer una chica, pero, a la hora de jugar, es todo un salvaje.',
    locked: true, cost: 175
  },
  {
    id: 'r75', nombre: 'Victor Garcia', original: 'Querardo Naval',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 50, pase: 55, defensa: 78, especial: 80,
    hissatsu: ['Engaño Torero'],
    desc: 'Se crió en una finca con toros y sabe torear, pero no le gusta herir a los animales.',
    locked: true, cost: 145
  },
  {
    id: 'r76', nombre: 'Bai Long', original: 'Haikyuu',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 85, pase: 70, defensa: 34, especial: 85,
    hissatsu: ['Rizo de Dragón'],
    desc: 'Rival de Victor Blade. Se crió en el Santuario',
    locked: true, cost: 155
  },
  {
    id: 'r77', nombre: 'Tezcat', original: 'Shuu',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 80, pase: 77, defensa: 34, especial: 85,
    hissatsu: ['Ceniza Negra'],
    desc: 'Delantero misterioso con habilidades sobrenaturales.',
    locked: true, cost: 155
  },
  {
    id: 'r78', nombre: 'Zanark Avalonic', original: 'Zanark Avalonic',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 88, pase: 60, defensa: 34, especial: 80,
    hissatsu: ['Golpe Cataclismo'],
    desc: 'Delantero de origen desconocido, con un estilo de juego imponente y poderoso.',
    locked: true, cost: 200
  },
  {
    id: 'r79', nombre: 'Malcom Night', original: 'Malcom Night',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 50, pase: 55, defensa: 80, especial: 75,
    hissatsu: ['Corte Giratorio'],
    desc: 'Defensa de gran experiencia, capaz de anticipar cualquier jugada.',
    locked: true, cost: 120
  },
  {
    id: 'r80', nombre: 'Mask', original: 'Nathan Jones',
    posicion: 'Portero', tipo: 'Viento',
    tiro: 30, pase: 50, defensa: 76, especial: 70,
    hissatsu: ['Cuchilla Asesina'],
    desc: 'Portero enmascarado con reflejos felinos y gran intuición para detener tiros.',
    locked: false
  },
  {
    id: 'r81', nombre: 'Wolf', original: 'Troy Moon',
    posicion: 'Centrocampista', tipo: 'Montaña',
    tiro: 70, pase: 65, defensa: 60, especial: 70,
    hissatsu: ['Tiro Fantasma'],
    desc: 'Defensa que sale cuando hay Luna Llena.',
    locked: false
  },
  {
    id: 'r82', nombre: 'Talisman', original: 'Johan Tassman',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 76, pase: 50, defensa: 50, especial: 70,
    hissatsu: ['Tiro Fantasma'],
    desc: 'Mediocentro y capitán del Occult.',
    locked: false
  },
 // ============================================================
  // WILD - 11 TITULARES
  // ============================================================

  {
    id: 'r83', nombre: 'Boar', original: 'Charlie Boardfield',
    posicion: 'Portero', tipo: 'Fuego',
    tiro: 18, pase: 48, defensa: 75, especial: 68,
    hissatsu: ['Garra Salvaje'],
    desc: 'Portero del Wild, agresivo y poderoso como un jabalí.',
    locked: false, cost: 105
  },
  {
    id: 'r84', nombre: 'Chicken', original: 'Hugo Tallgeese',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 65, pase: 70, defensa: 58, especial: 68,
    hissatsu: ['Acelerón'],
    desc: 'Capitán del Wild y cerebro del equipo.',
    locked: false, cost: 115
  },
  {
    id: 'r85', nombre: 'Fishman', original: 'Wilson Fishman', sprite: 'assets/sprites/r85.webp',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 38, pase: 52, defensa: 75, especial: 58,
    hissatsu: ['Robo Rápido'],
    desc: 'Defensa ágil especializado en robar balones.',
    locked: false, cost: 90
  },
  {
    id: 'r86', nombre: 'Toad', original: 'Peter Johnson', sprite: 'assets/sprites/r86.webp',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 34, pase: 46, defensa: 73, especial: 58,
    hissatsu: ['Barrido Defensivo'],
    desc: 'Defensa resistente que utiliza movimientos rápidos para recuperar el balón.',
    locked: false, cost: 88
  },
  {
    id: 'r87', nombre: 'Lion', original: 'Leonard O\'Shea', sprite: 'assets/sprites/r87.webp',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 45, pase: 48, defensa: 76, especial: 66,
    hissatsu: ['Embestida'],
    desc: 'Defensa poderoso que destaca por su fuerza física.',
    locked: false, cost: 105
  },
  {
    id: 'r88', nombre: 'Chameleon', original: 'Cham Lion', sprite: 'assets/sprites/r88.webp',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 42, pase: 75, defensa: 73, especial: 62,
    hissatsu: ['Robo Rápido'],
    desc: 'Defensa imprevisible capaz de desaparecer entre los rivales.',
    locked: false, cost: 92
  },
  {
    id: 'r89', nombre: 'Eagle', original: 'Steve Eagle', sprite: 'assets/sprites/r89.webp',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 68, pase: 64, defensa: 48, especial: 70,
    hissatsu: ['Ataque de Cóndor'],
    desc: 'Centrocampista veloz que domina el juego aéreo.',
    locked: false, cost: 108
  },
  {
    id: 'r90', nombre: 'Monkey', original: 'Bruce Monkey', sprite: 'assets/sprites/r90.webp',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 64, pase: 65, defensa: 61, especial: 68,
    hissatsu: ['Giro de Mono'],
    desc: 'Jugador imprevisible y escurridizo que puede aparecer en cualquier zona.',
    locked: false, cost: 102
  },
  {
    id: 'r91', nombre: 'Gorilla', original: 'Gary Lancaster', sprite: 'assets/sprites/r91.webp',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 75, pase: 42, defensa: 45, especial: 70,
    hissatsu: ['Remate Tarzán'],
    desc: 'Delantero de enorme fuerza física y potencia de remate.',
    locked: false, cost: 120
  },
  {
    id: 'r92', nombre: 'Snake', original: 'Harry Snake', sprite: 'assets/sprites/r92.webp',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 73, pase: 50, defensa: 38, especial: 72,
    hissatsu: ['Remate Serpiente'],
    desc: 'Delantero ágil cuyos movimientos son difíciles de predecir.',
    locked: false, cost: 115
  },
  {
    id: 'r93', nombre: 'Cheetah', original: 'Adrian Speed',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 78, pase: 58, defensa: 34, especial: 78,
    hissatsu: ['Remate Tarzán'],
    desc: 'El delantero más veloz del Wild, capaz de dejar atrás a cualquier defensa.',
    locked: false, cost: 130
  },

  {
    id: 'r94', nombre: 'Styx', original: 'Russell Walk', sprite: 'assets/sprites/r94.webp',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 42, pase: 50, defensa: 73, especial: 72,
    hissatsu: ['Gravedad'],
    desc: 'Defensa del Occult vinculado al río de los muertos.',
    locked: false, cost: 105
  },
  {
    id: 'r95', nombre: 'Creepy', original: 'Jason Jones', sprite: 'assets/sprites/r95.webp',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 38, pase: 48, defensa: 72, especial: 70,
    hissatsu: ['Doppelgänger'],
    desc: 'Defensa siniestro capaz de confundir a sus rivales.',
    locked: false, cost: 100
  },
  {
    id: 'r96', nombre: 'Franky', original: 'Ken Furan', sprite: 'assets/sprites/r96.webp',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 38, pase: 45, defensa: 74, especial: 65,
    hissatsu: ['Frankstein'],
    desc: 'Defensa corpulento obsesionado con crear vida artificial.',
    locked: false, cost: 108
  },
  {
    id: 'r97', nombre: 'Undead', original: 'Jerry Fulton', sprite: 'assets/sprites/r97.webp',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 40, pase: 47, defensa: 71, especial: 68,
    hissatsu: ['Doppelgänger'],
    desc: 'Defensa que parece incapaz de sentir miedo o dolor.',
    locked: false, cost: 102
  },
  {
    id: 'r98', nombre: 'Jiangshi', original: 'Ray Mannings', sprite: 'assets/sprites/r98.webp',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 58, pase: 67, defensa: 50, especial: 73,
    hissatsu: ['Gravedad'],
    desc: 'Centrocampista que se mueve de forma extraña e imprevisible.',
    locked: false, cost: 108
  },
  {
    id: 'r99', nombre: 'Mummy', original: 'Robert Mayer', sprite: 'assets/sprites/r99.webp',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 56, pase: 64, defensa: 53, especial: 70,
    hissatsu: ['Gravedad'],
    desc: 'Centrocampista envuelto en vendas y experto en controlar el ritmo.',
    locked: false, cost: 102
  },
  {
    id: 'r100', nombre: 'Grave', original: 'Alexander Brave', sprite: 'assets/sprites/r100.webp',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 62, pase: 60, defensa: 48, especial: 74,
    hissatsu: ['Maldición'],
    desc: 'Centrocampista que canaliza una energía oscura y misteriosa.',
    locked: false, cost: 108
  },
  {
    id: 'r101', nombre: 'Blood', original: 'Burt Wolf', sprite: 'assets/sprites/r101.webp',
    posicion: 'Centrocampista', tipo: 'Montaña',
    tiro: 64, pase: 56, defensa: 50, especial: 76,
    hissatsu: ['Tiro Fantasma'],
    desc: 'Centrocampista siniestro que utiliza técnicas de aspecto vampírico.',
    locked: false, cost: 112
  },
    {
    id: 'r102', nombre: 'Apollo', original: 'Apollo Hikaru',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 38, pase: 58, defensa: 78, especial: 70,
    hissatsu: ['Entrada Tormenta'],
    desc: 'Defensa del Zeus conocido por sus movimientos rápidos y precisos.',
    locked: false, cost: 108
  },
  {
    id: 'r103', nombre: 'Hephestus', original: 'En Hephais',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 42, pase: 48, defensa: 79, especial: 72,
    hissatsu: ['Mega Terremoto'],
    desc: 'Defensa poderoso que utiliza su fuerza para detener los ataques.',
    locked: false, cost: 112
  },
  {
    id: 'r104', nombre: 'Ares', original: 'Ran Aresu',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 40, pase: 50, defensa: 80, especial: 68,
    hissatsu: ['Entrada Tormenta'],
    desc: 'Defensa agresivo que destaca por sus entradas contundentes.',
    locked: false, cost: 108
  },
  {
    id: 'r105', nombre: 'Dionyisus', original: 'Geki Deio',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 44, pase: 52, defensa: 80, especial: 70,
    hissatsu: ['Mega Terremoto'],
    desc: 'Defensa del Zeus con una gran potencia física.',
    locked: false, cost: 110
  },
  {
    id: 'r106', nombre: 'Hermes', original: 'Matsuaki Herume',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 68, pase: 72, defensa: 61, especial: 78,
    hissatsu: ['Hora Celestial'],
    desc: 'Centrocampista veloz especializado en superar rivales con su velocidad.',
    locked: false, cost: 115
  },
  {
    id: 'r107', nombre: 'Athena', original: 'Tomo Atena',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 74, pase: 73, defensa: 50, especial: 74,
    hissatsu: ['Sabiduría Divina'],
    desc: 'Centrocampista técnico capaz de controlar el ritmo del partido.',
    locked: false, cost: 112
  },
  {
    id: 'r108', nombre: 'Demeter', original: 'Yutaka Demete',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 79, pase: 72, defensa: 39, especial: 72,
    hissatsu: ['Disparo con Rebotes'],
    desc: 'Delantero del zeus con potente disparo.',
    locked: false, cost: 115
  },
  {
    id: 'r109', nombre: 'Hera', original: 'Tadashi Hera',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 73, pase: 71, defensa: 46, especial: 75,
    hissatsu: ['Flecha Divina'],
    desc: 'Centrocampista del Zeus capaz de lanzar poderosos disparos.',
    locked: false, cost: 115
  },


  // ============================================================
  // GÉNESIS
  // Xene y Bellatrix ya están definidos.
  // ============================================================

  {
    id: 'r110', nombre: 'Nero', original: 'Nelson Rockwell',
    posicion: 'Portero', tipo: 'Bosque',
    tiro: 38, pase: 52, defensa: 84, especial: 76,
    hissatsu: ['Muro Dimensional'],
    desc: 'Portero del Génesis con una defensa prácticamente inexpugnable.',
    locked: false, cost: 135
  },
  {
    id: 'r111', nombre: 'Gele', original: 'Gail Baker',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 40, pase: 56, defensa: 80, especial: 74,
    hissatsu: ['Niebla Mística'],
    desc: 'Defensa del Génesis que confunde a sus rivales con movimientos impredecibles.',
    locked: false, cost: 120
  },
  {
    id: 'r112', nombre: 'Kiburn', original: 'Kim Powell',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 44, pase: 52, defensa: 80, especial: 76,
    hissatsu: ['Gravitación'],
    desc: 'Defensa extremadamente poderoso que utiliza la fuerza gravitatoria.',
    locked: false, cost: 122
  },
  {
    id: 'r113', nombre: 'Zohen', original: 'Zack Cummings',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 42, pase: 69, defensa: 80, especial: 70,
    hissatsu: ['Robo Planeta'],
    desc: 'Defensa resistente especializado en recuperar el balón.',
    locked: false, cost: 120
  },
  {
    id: 'r114', nombre: 'Hauser', original: 'Hunt Mercer',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 40, pase: 60, defensa: 76, especial: 72,
    hissatsu: ['Superarmadillo'],
    desc: 'Defensa de enorme resistencia física.',
    locked: false, cost: 122
  },
  {
    id: 'r115', nombre: 'Kormer', original: 'Connor Murray',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 61, pase: 68, defensa: 68, especial: 78,
    hissatsu: ['Rapto Divino'],
    desc: 'Centrocampista del Génesis con gran capacidad para controlar el balón.',
    locked: false, cost: 125
  },
  {
    id: 'r116', nombre: 'Kiwill', original: 'Katie Brown',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 65, pase: 75, defensa: 48, especial: 76,
    hissatsu: ['Finta Bumerán'],
    desc: 'Centrocampista técnica y ágil que destaca en el uno contra uno.',
    locked: false, cost: 120
  },
  {
    id: 'r117', nombre: 'Ark', original: 'Ashton Malone',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 70, pase: 70, defensa: 65, especial: 80,
    hissatsu: ['Cañón de Meteoritos'],
    desc: 'Centrocampista ofensivo con un disparo de enorme potencia.',
    locked: false, cost: 130
  },
  {
    id: 'r118', nombre: 'Wittz', original: 'Wilbur Watkins',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 82, pase: 56, defensa: 38, especial: 82,
    hissatsu: ['Astro Remate'],
    desc: 'Delantero del Génesis capaz de realizar potentes remates de origen cósmico.',
    locked: false, cost: 135
  },
  {
    id: 'r119', nombre: 'Hector Helio', original: 'Rococo Ulpa',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 51, pase: 56, defensa: 87, especial: 82,
    hissatsu: ['Mano Celestial X'],
    desc: 'Procede de una remota región llamada Costail y tiene un potencial enorme.',
    locked: false, cost: 190
  },
  {
    id: 'r120', nombre: 'Hector Helio', original: 'Rococo Ulpa',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 82, pase: 56, defensa: 38, especial: 82,
    hissatsu: ['Disparo X'],
    desc: 'Procede de una remota región llamada Costail y tiene un potencial enorme.',
    locked: false, cost: 190
  },
  // r121-r129: ronda de ampliación adicional, misma confianza media que
  // r17-r21 (posición y elemento verificados por búsqueda, hissatsu real
  // atribuido correctamente cuando se ha podido confirmar con una fuente
  // clara). El elemento de Choi es una inferencia razonable a partir del
  // nombre de su equipo (Fire Dragon / Corea), no una confirmación directa
  // de su atributo personal -- revísalo si te importa la precisión exacta.
  {
    id: 'r121', nombre: 'Sol Daystar', original: 'Amemiya Taiyou',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 85, pase: 80, defensa: 40, especial: 80,
    hissatsu: ['Tormenta Solar'],
    desc: 'Capitán del Universal, considerado el genio del fútbol de su generación.',
    locked: false, cost: 145
  },
  {
    id: 'r122', nombre: 'Gocker', original: 'Gokukawa Kantarou',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 25, pase: 55, defensa: 86, especial: 70,
    hissatsu: ['Rompehielos'],
    desc: 'Defensa corpulento del Polvo de Diamantes, temido por su fuerza bruta.',
    locked: false, cost: 150
  },
  {
    id: 'r123', nombre: 'Bomber', original: 'Honba Geki',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 30, pase: 55, defensa: 86, especial: 70,
    hissatsu: ['Cortefuegos'],
    desc: 'Defensa de Prominence que forma una defensa temible junto a Gocker.',
    locked: false, cost: 150
  },
  {
    id: 'r124', nombre: 'Goldie Lemmon', original: 'Nanobana Kinako',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 60, pase: 58, defensa: 82, especial: 82,
    hissatsu: ['Grumo Pegapasta'],
    desc: 'Defensa polivalente que ha jugado en varios de los grandes equipos de su generación.',
    locked: false, cost: 125
  },
  {
    id: 'r125', nombre: 'Heat', original: 'Atsuishi Shigeto',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 69, pase: 73, defensa: 70, especial: 74,
    hissatsu: ['Lluvia de Meteoros'],
    desc: 'Centrocampista de Prominence, aprendió una técnica prohibida de un portero legendario.',
    locked: false, cost: 118
  },
  {
    id: 'r126', nombre: 'Lean', original: 'Hasuike An',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 60, pase: 78, defensa: 60, especial: 70,
    hissatsu: ['Cruz del sur'],
    desc: 'Centrocampista de Prominence con un regate entre los mejores de su generación.',
    locked: false, cost: 122
  },
  {
    id: 'r127', nombre: 'Julio Acuto', original: 'Demonio Strada',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 75, pase: 75, defensa: 60, especial: 85,
    hissatsu: ['Pinguino Emperador X'],
    desc: 'Idéntico a Jude Sharp, del que llegó a ser una copia casi perfecta.',
    locked: false, cost: 130
  },
  {
    id: 'r128', nombre: 'Davy Jones', original: 'Namikawa Rensuke',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 81, pase: 50, defensa: 42, especial: 80,
    hissatsu: ['Remate Poseidón'],
    desc: 'Capitán y delantero de Kaiou Gakuen, orgulloso de defender su honor.',
    locked: false, cost: 128
  },
  {
    id: 'r129', nombre: 'Choi', original: 'Choi Chang-soo',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 65, pase: 87, defensa: 70, especial: 75,
    hissatsu: ['Caída Infernal'],
    desc: 'Capitán de Fire Dragon, la selección de Corea, uno de los grandes creadores de juego.',
    locked: false, cost: 128
  },
  {
    id: 'r130', nombre: 'Soundtown', original: 'Cadence Soundtown',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 60, pase: 82, defensa: 76, especial: 75,
    hissatsu: ['Baile de Llamas'],
    desc: 'Capitán de Mary Times',
    locked: false, cost: 128
  },
  {
    id: 'r131', nombre: 'Alan Master', original: 'Alan Master',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 61, pase: 73, defensa: 73, especial: 65,
    hissatsu: ['Robo rápido'],
    desc: 'Creador de juego de la Royal.',
    locked: false, cost: 128
  },
    {id: 'r132', nombre: 'Ganymede', original: 'Ganymede',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 43, pase: 60, defensa: 78, especial: 65,
    hissatsu: ['Robo planetario'],
    desc: 'Defensa de Tormenta de Géminis',
    locked: false, cost: 128
  },
  {id: 'r133', nombre: 'Wanli Chang-Cheng', original: 'Wanli',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 45, pase: 50, defensa: 79, especial: 60,
    hissatsu: ['Muralla de Atlantis'],
    desc: 'Defensa Físico y amigable',
    locked: false, cost: 128
  },
   {
    id: 'r134', nombre: 'Ray Dark', original: 'Kageyama Reiji',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 78, pase: 82, defensa: 65, especial: 88,
    hissatsu: ['Pingüino Emperador Nº2'],
    desc: 'El legendario entrenador y estratega de la Royal Academy, maestro de las tácticas más oscuras.',
    locked: true, cost: 99999
  },
  {
    id: 'r135', nombre: 'Beta', original: 'Beta',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 85, pase: 68, defensa: 42, especial: 78,
    hissatsu: ['Comando de Disparo 07'],
    desc: 'Capitana del Protocolo Omega 2.0, capaz de cambiar por completo su personalidad durante los partidos.',
    locked: true, cost: 180
  },
  {
    id: 'r136', nombre: 'Alpha', original: 'Alpha',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 84, pase: 70, defensa: 44, especial: 76,
    hissatsu: ['Comando de Disparo 05'],
    desc: 'Capitán del Protocolo Omega 1.0, calculador y extremadamente preciso en el campo.',
    locked: true, cost: 180
  },
  {
    id: 'r137', nombre: 'Gamma', original: 'Gamma',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 86, pase: 66, defensa: 48, especial: 77,
    hissatsu: ['Comando de Disparo 13'],
    desc: 'Líder del Protocolo Omega 3.0, un delantero frío que confía plenamente en sus capacidades.',
    locked: true, cost: 170
  },
  {
    id: 'r138', nombre: 'J.P. Lapin', original: 'Nishizono Shinsuke',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 42, pase: 55, defensa: 81, especial: 78,
    hissatsu: ['Parada en Plancha'],
    desc: 'Portero de pequeño tamaño pero enorme determinación, siempre dispuesto a proteger su portería.',
    locked: true, cost: 140
  },
  {
    id: 'r139', nombre: 'Terry Archibald', original: 'Ibuki Munemasa',
    posicion: 'Portero', tipo: 'Viento',
    tiro: 45, pase: 58, defensa: 86, especial: 81,
    hissatsu: ['Mate Salvaje'],
    desc: 'Portero de largos brazos y enorme fuerza, antiguo jugador de baloncesto acostumbrado a actuar por su cuenta.',
    locked: true, cost: 190
  },
  {
    id: 'r140', nombre: 'Lucas Star', original: 'Ichihoshi Hikaru',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 79, pase: 82, defensa: 55, especial: 80,
    hissatsu: ['Órbita Celestial'],
    desc: 'Centrocampista de enorme talento cuya verdadera identidad esconde una historia mucho más compleja.',
    locked: true, cost: 180
  },
  {
    id: 'r141', nombre: 'Frank Foreman', original: 'Tetsukado Shin',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 58, pase: 52, defensa: 83, especial: 78,
    hissatsu: ['Juego de piernas'],
    desc: 'Defensa corpulento y directo, antiguo boxeador acostumbrado a enfrentarse a sus rivales sin miedo.',
    locked: true, cost: 160
  },
  {
    id: 'r142', nombre: 'Falco Flashman', original: 'Matatagi Hayato',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 86, pase: 72, defensa: 38, especial: 80,
    hissatsu: ['Taconazo Parkour'],
    desc: 'Delantero extremadamente veloz y talentoso, capaz de convertirse en una amenaza constante para cualquier defensa.',
    locked: true, cost: 165
  },
  {
    id: 'r143', nombre: 'Keenan Sharpe', original: 'Minaho Kazuto',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 52, pase: 76, defensa: 83, especial: 80,
    hissatsu: ['Copia y corta'],
    desc: 'Defensa inteligente y observador, destaca por analizar rápidamente las jugadas de sus rivales.',
    locked: true, cost: 160
  },
  {
    id: 'r144', nombre: 'Zippy Lermer', original: 'Manabe Jinichirou',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 48, pase: 80, defensa: 85, especial: 80,
    hissatsu: ['Cálculo Perfecto'],
    desc: 'Defensa brillante capaz de analizar las trayectorias y calcular con precisión las jugadas del partido.',
    locked: true, cost: 160
  },
  {
    id: 'r145', nombre: 'Trina Verdure', original: 'Morimura Konoha',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 42, pase: 61, defensa: 80, especial: 78,
    hissatsu: ['Bola de Hojas'],
    desc: 'Defensa inicialmente tímida que consigue superar sus miedos y convertirse en una jugadora muy importante.',
    locked: true, cost: 160
  },
  {
    id: 'r146', nombre: 'Cerise Blossom', original: 'Nozaki Sakura',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 70, pase: 82, defensa: 51, especial: 84,
    hissatsu: ['Aro-AleHop'],
    desc: 'Centrocampista elegante y habilidosa, con una gran coordinación gracias a su experiencia en gimnasia rítmica.',
    locked: true, cost: 150
  },
  {
    id: 'r147', nombre: 'Simeon Ayp', original: 'Saru',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 89, pase: 86, defensa: 48, especial: 85,
    hissatsu: ['Cañon de Fragmentos'],
    desc: 'Líder y capitán del Ragnah y uno de los jugadores más poderosos de la era de Chrono Stone.',
    locked: true, cost: 200
  },
  {
    id: 'r148', nombre: 'Mac Robingo', original: 'Mac Robingo',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 89, pase: 73, defensa: 40, especial: 87,
    hissatsu: ['Golpe de Samba'],
    desc: 'Delantero brasileño de gran potencia y presencia física, capaz de imponerse en el área rival.',
    locked: true, cost: 200
  },
    {
    id: 'r149', nombre: 'Gigi Blasi', original: 'Gigi Blasi',
    posicion: 'Portero', tipo: 'Viento',
    tiro: 38, pase: 51, defensa: 85, especial: 84,
    hissatsu: ['Guardia del Coliseo'],
    desc: 'Guardameta italiano.',
    locked: true, cost: 180
  },
    {
    id: 'r150', nombre: 'Xene', original: 'Xavier Foster',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 87, pase: 75, defensa: 38, especial: 82,
    hissatsu: ['Supernova'],
    desc: 'Delantero del Génesis y capitán.',
    locked: false, cost: 200
  },
  {
    id: 'r151', nombre: 'Feldt', original: 'Thomas Feldt',
    posicion: 'Portero', tipo: 'Bosque',
    tiro: 18, pase: 55, defensa: 82, especial: 78,
    hissatsu: ['Campo de fuerza'],
    desc: 'Capitán y portero del Brain. Un jugador inteligente que recupera su verdadero espíritu deportivo.',
    locked: true, cost: 125
  },
  {
    id: 'r152', nombre: 'Philip Marvel', original: 'Philip Marvel',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 35, pase: 60, defensa: 78, especial: 71,
    hissatsu: ['Escáner Defensa'],
    desc: 'Defensa del Brain que destaca por su físico.',
    locked: true, cost: 105
  },
  {
    id: 'r153', nombre: 'Stronger', original: 'Terry Stronger',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 48, pase: 58, defensa: 75, especial: 70,
    hissatsu: ['Escáner Defensa'],
    desc: 'Defensa de gran fuerza física que fue sometido al lavado de cerebro del Brain.',
    locked: true, cost: 108
  },
  {
  id:'r154', nombre:'Francis Tell', original:'Francis Tell',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:68,pase:75,defensa:55,especial:76,
  hissatsu:['Cañonazo'],
  desc:'Centrocampista del Instituto Brain, especialista en analizar el juego rival.',
  locked:true,cost:150
},
{
  id:'r155', nombre:'Samuel Buster', original:'Samuel Buster',
  posicion:'Centrocampista', tipo:'Fuego',
  tiro:72,pase:70,defensa:52,especial:75,
  hissatsu:['Tiro dinamita'],
  desc:'Centrocampista del Instituto Brain con gran potencia de tiro.',
  locked:true,cost:150
},
{
  id:'r156', nombre:'Jonathan Seller', original:'Jonathan Seller',
  posicion:'Delantero', tipo:'Viento',
  tiro:80,pase:65,defensa:38,especial:78,
  hissatsu:['Remate Misil'],
  desc:'Delantero del Instituto Brain y uno de sus principales atacantes.',
  locked:true,cost:170
},
{
  id:'r157', nombre:'Neil Turner', original:'Neil Turner',
  posicion:'Delantero', tipo:'Fuego',
  tiro:81,pase:60,defensa:42,especial:82,
  hissatsu:['Tornado de fuego'],
  desc:'Delantero estrella del Brain, conocido por su potente Tornado de fuego.',
  locked:true,cost:190
},
{
  id:'r158', nombre:'Jim Hillfort', original:'Jim Hillfort', sprite:'assets/sprites/r158.webp',
  posicion:'Defensa', tipo:'Viento',
  tiro:48,pase:57,defensa:78,especial:72,
  hissatsu:['Telaraña'],
  desc:'Defensa del Instituto Shuriken, propenso a enfermar con facilidad.',
  locked:true,cost:130
},
{
  id:'r159', nombre:'Phil Wingate', original:'Phil Wingate', sprite:'assets/sprites/r159.webp',
  posicion:'Defensa', tipo:'Montaña',
  tiro:54,pase:64,defensa:70,especial:75,
  hissatsu:['Telaraña'],
  desc:'Defensa del Shuriken que utiliza códigos para coordinar al equipo.',
  locked:true,cost:150
},
{
  id:'r160', nombre:'Jupiter Jumper', original:'Jupiter Jumper', sprite:'assets/sprites/r160.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:63,pase:70,defensa:48,especial:73,
  hissatsu:['Giro de Mono'],
  desc:'Centrocampista del Shuriken, ágil y experto en desplazarse con rapidez.',
  locked:true,cost:140
},
{
  id:'r161', nombre:'Sam Samurai', original:'Sam Samurai', sprite:'assets/sprites/r161.webp',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:75,pase:57,defensa:40,especial:79,
  hissatsu:['Remate Múltiple'],
  desc:'Delantero del Shuriken y maestro de la espada.',
  locked:true,cost:170
},
{
  id:'r162', nombre:'Hank Sullivan', original:'Hank Sullivan', sprite:'assets/sprites/r162.webp',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:67,pase:76,defensa:52,especial:77,
  hissatsu:['Espejismo'],
  desc:'Centrocampista organizador del Shuriken, especializado en coordinar al equipo.',
  locked:true,cost:150
},
{
  id:'r163', nombre:'Sail Bluesea', original:'Sail Bluesea', sprite:'assets/sprites/r163.webp',
  posicion:'Delantero', tipo:'Viento',
  tiro:81,pase:68,defensa:39,especial:84,
  hissatsu:['Bola de Fango'],
  desc:'Capitán y delantero del Instituto Shuriken.',
  locked:true,cost:180
},
{
  id:'r164', nombre:'Albert Green', original:'Albert Green', sprite:'assets/sprites/r164.webp',
  posicion:'Portero', tipo:'Fuego',
  tiro:35,pase:52,defensa:80,especial:84,
  hissatsu:['Despeje de leñador'],
  desc:'Capitán y portero del Instituto Farm, especialista en técnicas defensivas.',
  locked:true,cost:180
},
{
  id:'r165', nombre:'Mark Hillvalley', original:'Mark Hillvalley', sprite:'assets/sprites/r165.webp',
  posicion:'Defensa', tipo:'Montaña',
  tiro:45,pase:58,defensa:84,especial:80,
  hissatsu:['Rueda infernal'],
  desc:'Defensa del Instituto Farm, resistente y especializado en recuperar el balón.',
  locked:true,cost:150
},
{
  id:'r166', nombre:'Herb Sherman', original:'Herb Sherman', sprite:'assets/sprites/r166.webp',
  posicion:'Defensa', tipo:'Bosque',
  tiro:55,pase:54,defensa:79,especial:77,
  hissatsu:['Chut granada'],
  desc:'Defensa del Instituto Farm con un potente disparo como recurso ofensivo.',
  locked:true,cost:145
},
{
  id:'r167', nombre:'Joe Small', original:'Joe Small', sprite:'assets/sprites/r167.webp',
  posicion:'Centrocampista', tipo:'Montaña',
  tiro:61,pase:70,defensa:57,especial:75,
  hissatsu:['Remolino cortante'],
  desc:'Centrocampista del Instituto Farm, hábil y difícil de superar.',
  locked:true,cost:145
},
{
  id:'r168', nombre:'Orville Newman', original:'Orville Newman', sprite:'assets/sprites/r168.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:74,pase:68,defensa:51,especial:73,
  hissatsu:['Cabezazo Kung-fu'],
  desc:'Centrocampista del Instituto Farm con buen control del balón.',
  locked:true,cost:140
},
{
  id:'r169', nombre:'Daniel Dawson', original:'Daniel Dawson', sprite:'assets/sprites/r169.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:64,pase:72,defensa:53,especial:74,
  hissatsu:['Balón rodante'],
  desc:'Centrocampista del Instituto Farm, especialista en regates y jugadas rápidas.',
  locked:true,cost:145
},
{
  id:'r170', nombre:'Miles Ryan', original:'Miles Ryan', sprite:'assets/sprites/r170.webp',
  posicion:'Defensa', tipo:'Viento',
  tiro:64,pase:72,defensa:73,especial:74,
  hissatsu:['Ciclon'],
  desc:'Amigo de Nathan, veloz como el viento',
  locked:true,cost:145
},

{
  id:'r171', nombre:'Saggy', original:'Sagamineta', sprite:'assets/sprites/r171.webp',
  posicion:'Delantero', tipo:'Bosque',
  tiro:78,pase:67,defensa:60,especial:84,
  hissatsu:['Remate Misil'],
  desc:'Delantero especial de Inazuma Eleven 2, conocido como Saggy.',
  locked:true,cost:160
},
{
  id:'r172', nombre:'Syon Blaze', original:'Masato Goenji', sprite:'assets/sprites/r172.webp',
  posicion:'Delantero', tipo:'Fuego',
  tiro:86,pase:63,defensa:38,especial:84,
  hissatsu:['Tornado de Fuego'],
  desc:'Extraordinario delantero y primo de Axel Blaze.',
  locked:true,cost:190
},
{
  id:'r173', nombre:'Canon Evans', original:'Kanon Endou', sprite:'assets/sprites/r173.webp',
  posicion:'Delantero', tipo:'Viento',
  tiro:86,pase:67,defensa:40,especial:86,
  hissatsu:['Cañón Celestial'],
  desc:'Delantero del futuro y descendiente de Mark Evans.',
  locked:true,cost:200
},
{
  id:'r174', nombre:'Benkei Kumano', original:'Benkei Kumano', sprite:'assets/sprites/r175.webp',
  posicion:'Defensa', tipo:'Viento',
  tiro:65,pase:71,defensa:82,especial:86,
  hissatsu:['Hielo Futurista'],
  desc:'Defensa del futuro y descendiente de Shawn.',
  locked:true,cost:200
},
{
  id:'r175', nombre:'Shiryu Shiratori', original:'Shiryu Shiratori', sprite:'assets/sprites/r174.webp',
  posicion:'Delantero', tipo:'Montaña',
  tiro:82,pase:65,defensa:67,especial:83,
  hissatsu:['Remate del muro'],
  desc:'Delantero del futuro y descendiente de Jack.',
  locked:true,cost:200
},
{
  id:'r176', nombre:'Chester Horse Jr', original:'Chester Horse Jr', sprite:'assets/sprites/r176.webp',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:67,pase:65,defensa:67,especial:81,
  hissatsu:['Remate Misil'],
  desc:'Comentarista del Raimon.',
  locked:true,cost:100
},
{
  id:'r177', nombre:'Rory Boomer', original:'Rory Boomer', sprite:'assets/sprites/r177.webp',
  posicion:'Centrocampista', tipo:'Montaña',
  tiro:72,pase:71,defensa:67,especial:69,
  hissatsu:['Disparo con rebotes'],
  desc:'Tiene voz atronadora. Sus amigos se tapan los oídos cuando habla.',
  locked:true,cost:100
},
{
  id:'r178', nombre:'Sam Kincaid', original:'Shishido Sakichi',
  posicion:'Centrocampista', tipo:'Fuego',
  tiro:70,pase:60,defensa:52,especial:66,
  hissatsu:['Tiro Granada'],
  desc:'Centrocampista del Raimon, creador de su propio Tiro Granada en pleno partido.',
  locked:true,cost:130
},
{
  id:'r179', nombre:'Grant Cook', original:'Ooiwa Kurando',
  posicion:'Portero', tipo:'Fuego',
  tiro:22,pase:52,defensa:85,especial:80,
  hissatsu:['Burnout'],
  desc:'Portero del Prominence, del proyecto Aliea Academy, conocido como "Grent". Protege su portería con Burnout.',
  locked:true,cost:170
},
{
  id:'r180', nombre:'Val Flamewood', original:'Hagakure Koutarou',
  posicion:'Defensa', tipo:'Fuego',
  tiro:40,pase:55,defensa:88,especial:78,
  hissatsu:['Gravitación'],
  desc:'Defensa del Prominence, conocido como "Bakurei". Su Gravitación es casi infranqueable.',
  locked:true,cost:165
},
{
  id:'r181', nombre:'Denzel Freezer', original:'Mikoori Rei',
  posicion:'Delantero', tipo:'Montaña',
  tiro:85,pase:50,defensa:38,especial:88,
  hissatsu:['Supernova'],
  desc:'Delantero del Diamond Dust, conocido como "Frost". Su Supernova es una de las técnicas más temidas de Aliea Academy.',
  locked:true,cost:190
},
{
  id:'r182', nombre:'Ben North', original:'Shirai Ikkaku',
  posicion:'Portero', tipo:'Montaña',
  tiro:18,pase:48,defensa:86,especial:80,
  hissatsu:['Bloque de Hielo'],
  desc:'Portero del Diamond Dust, conocido como "Beluga". Nadie se libra de su Atrapada Tornado.',
  locked:true,cost:170
},
{
  id:'r183', nombre:'Claire Lesnow', original:'Kurakake Clara',
  posicion:'Defensa', tipo:'Viento',
  tiro:36,pase:58,defensa:80,especial:76,
  hissatsu:['Rompehielos'],
  desc:'Defensa del Diamond Dust, conocida como "Clear" y única chica del equipo. Protege su línea con Velo de Agua.',
  locked:true,cost:160
},
{
  id:'r184', nombre:'Gordon Star', original:'Goryuu Reo',
  posicion:'Portero', tipo:'Bosque',
  tiro:22,pase:50,defensa:84,especial:78,
  hissatsu:['Taladro Destructor'],
  desc:'Portero del Gemini Storm, del proyecto Aliea Academy, conocido como "Gorleo". Su Taladro Destructor perfora cualquier tiro.',
  locked:true,cost:168
},
{
  id:'r185', nombre:'Daniel Hatch', original:'Jimon Daiki',
  posicion:'Delantero', tipo:'Bosque',
  tiro:80,pase:48,defensa:36,especial:72,
  hissatsu:['Tiro Centuple'],
  desc:'Delantero del Royal Academy, letal cerca del área con su Tiro Centuple.',
  locked:true,cost:150
},
{
  id:'r186', nombre:'Cliff Tomlinson', original:'Ena Kazuki',
  posicion:'Delantero', tipo:'Viento',
  tiro:70,pase:50,defensa:48,especial:66,
  hissatsu:['Entrada Asesina'],
  desc:'Delantero del Royal Academy que no duda en recurrir a su Entrada Asesina para recuperar el balón.',
  locked:true,cost:140
},
];
