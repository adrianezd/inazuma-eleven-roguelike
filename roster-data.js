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
  'Neo Raimon', 'Raimon GO', 'Zoolan Team', 'Claustro Sagrado', 'Royal Academy GO', 'Instituto Espejismo', 'Poderosa Fe', 'Los arions', 'Mar de Árboles', 'Fertilia', 'Magmavis', 'Colina Verde', 'Barcelona Orb', 'Twinford', 'Northbright', 'Campeones Raimon'
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
  'Falam Medius', 'Flota Ixar', 'Guardianes de La Reina', 'Orfeo', 'Élite Omega',
  'Galanes Electrizantes', 'Los Cuatro Magníficos', 'Fertilia', 'Magmavis',
  'Chispas Perfectas', 'Artemisa de Mr.YI', 'Ángeles Oscuros', 'FFI Estrellas'
];

// A qué temporada/juego de la franquicia pertenece cada equipo rival, a
// petición explícita ("un filtro para el modo carrera para que tú
// selecciones de que juegos elegir los equipos"): temp1/temp2/temp3
// (anime original), go1/go2/go3 (Inazuma Eleven GO), ares (Ares no
// Tenbin), orion (Orion no Kokuin), vr (Victory Road). Clasificación
// dada directamente por el usuario equipo a equipo -- los que no
// aparecen aquí (p.ej. 'Tormenta de Géminis', sin respuesta) se tratan
// como sin temporada conocida y NUNCA se filtran, para no perder equipos
// por un hueco en la clasificación. Ver careerSeasonFilteredPool.
var TEAM_SEASON = {
  'Academia Ogre': 'temp3', 'Academia Universal': 'go1', 'Alius Masters': 'temp2',
  'Alpino': 'temp2', 'Artemisa de Mr.YI': 'orion', 'Barcelona Orb': 'ares',
  'Big Waves': 'temp3', 'Brain': 'temp1', 'Cala Pirata': 'go1',
  'Campeones Raimon': 'vr', 'Caos': 'temp2', 'Chispas Perfectas': 'orion',
  'Chrono Storm': 'go2', 'Colina Verde': 'ares', 'Desesperdidos': 'go2',
  'Dinastía Galáctica': 'go3', 'Dragon Link': 'go1', 'Dragones de Fuego': 'temp3',
  'Earth Eleven': 'go3', 'Eclipse de Orión': 'orion', 'El Dorado 01': 'go2',
  'El Dorado 02': 'go2', 'El Dorado 03': 'go2', 'Élite Omega': 'go2',
  'Emperadores Oscuros': 'temp2', 'Épsilon': 'temp2', 'Equipo Zero': 'go1',
  'Falam Medius': 'go3', 'Farm': 'temp1', 'Fauxshore': 'temp2',
  'Fertilia': 'go3', 'Flota Ixar': 'go3', 'Galanes Electrizantes': 'temp3',
  'Gar': 'go2', 'Genesis': 'temp2', 'Gir': 'go2',
  'Guardianes de La Reina': 'orion', 'Inazuma Japon': 'temp3', 'Inazuma Japon GO': 'go2',
  'Instituto Alius': 'go2', 'Instituto Plenilunio': 'ares', 'Kirkwood': 'temp1',
  'Leones del desierto': 'temp3', 'Los arions': 'go2', 'Los Cuatro Magníficos': 'temp3',
  'Los Emperadores': 'temp3', 'Magmavis': 'go3', 'Mar de Árboles': 'temp2',
  'Mar de Luna': 'go1', 'Mary Times': 'temp2', 'Neo Japón': 'temp3',
  'Northbright': 'vr', 'Occult': 'temp1', 'Orfeo': 'temp3',
  'Os Reis': 'temp3', 'Otaku': 'temp1', 'Pequeños Gigantes': 'temp3',
  'Polvo de Diamante': 'temp2', 'Prominence': 'temp2', 'Protocolo Omega': 'go2',
  'Protocolo Omega 2.0': 'go2', 'Protocolo Omega 3.0': 'go2', 'Ragnah': 'go2',
  'Raimon Inakuni': 'ares', 'Resistencia Japon': 'temp2', 'Resistencia Japón GO': 'go2',
  'Royal Academy': 'temp1', 'Sallys': 'temp1', 'Shuriken': 'temp1',
  'Tarjeteros': 'temp3', 'Tormenta de Géminis': 'temp2', 'Ángeles Oscuros': 'temp3', 'Neo Raimon': 'temp1', 'FFI Estrellas': 'temp3', 'Raimon GO': 'go1', 'Zoolan Team': 'temp3', 'Claustro Sagrado': 'temp2', 'Royal Academy GO': 'go1', 'Instituto Espejismo': 'go1', 'Poderosa Fe': 'go1', 'Twinford': 'vr', 'Umbrella': 'temp1',
  'Unicorn': 'temp3', 'Veteranos Inazuma': 'temp1', 'Wild': 'temp1',
  'Zanark Domain': 'go2', 'Zeus': 'temp1'
};
var TEAM_SEASON_LABELS = {
  temp1: 'Temporada 1', temp2: 'Temporada 2', temp3: 'Temporada 3',
  go1: 'GO 1', go2: 'GO 2', go3: 'GO 3',
  ares: 'Ares no Tenbin', orion: 'Orion no Kokuin', vr: 'Victory Road'
};
var TEAM_SEASON_ORDER = ['temp1', 'temp2', 'temp3', 'go1', 'go2', 'go3', 'ares', 'orion', 'vr'];

// Puntuación de "fuerza" de cada equipo (1-100), usada para que la CPU
// resuelva enfrentamientos entre rivales (torneo, FutDraft) con más sentido
// que un dado puro: cuanto más alta, más gana. Son valores de partida
// (equipos de RIVAL_TEAM_NAMES más bajos, de RIVAL_TEAM_BOSSES más altos,
// los que aparecen en ambas listas a medio camino) pensados para ajustar a
// mano con el tiempo, no una medición objetiva de nada.
var TEAM_POWER = {
  // Solo en RIVAL_TEAM_NAMES (nivel normal)
  'Occult': 38,
  'Alpino': 43, 'Unicorn': 68, 'Big Waves': 60,
  'Brain': 45, 'Wild': 38, 'Shuriken': 47, 'Kirkwood': 49, 'Umbrella': 28,
  'Tarjeteros': 56, 'Veteranos Inazuma': 38,
  'Cala Pirata': 42, 'Sallys': 34, 'Leones del desierto': 59,
  'Academia Universal': 56, 'Instituto Plenilunio': 55,
  'Raimon Inakuni': 45, 'Mary Times': 36, 'Mar de Luna': 43, 'Farm': 42, 'Fauxshore': 39,
  'Los arions': 47, 'Mar de Árboles': 47, 'Otaku': 33,
  'Colina Verde': 65, 'Barcelona Orb': 70, 'Twinford': 55, 'Northbright': 64, 'Campeones Raimon': 73,
  // En las dos listas a la vez (versátiles, gama media-alta)
  'Royal Academy': 70, 'Zeus': 75, 'Instituto Alius': 75,
  'Fertilia': 70, 'Magmavis': 75,
  // Solo en RIVAL_TEAM_BOSSES (nivel jefe)
  'Academia Ogre': 75, 'Emperadores Oscuros': 93, 'Genesis': 91,
  'Prominence': 73, 'Polvo de Diamante': 73, 'Tormenta de Géminis': 70, 'Dragones de Fuego': 75,
  'Pequeños Gigantes': 90, 'Épsilon': 74, 'Los Emperadores': 75, 'Os Reis': 75, 'Neo Japón': 76,
  'Protocolo Omega': 66, 'Caos': 75, 'El Dorado 01': 70, 'Resistencia Japon': 80, 'Resistencia Japón GO': 70,
  'Gir': 66, 'Gar': 70, 'Ragnah': 80, 'Alius Masters': 92, 'Inazuma Japon': 92, 'Inazuma Japon GO': 90,
  'Chrono Storm': 95, 'Dragon Link': 80, 'Desesperdidos': 75, 'Dinastía Galáctica': 84,
  'Earth Eleven': 94, 'Eclipse de Orión': 85, 'El Dorado 02': 75, 'El Dorado 03': 79,
  'Protocolo Omega 2.0': 76, 'Protocolo Omega 3.0': 78, 'Zanark Domain': 78, 'Equipo Zero': 86,
  'Falam Medius': 83, 'Flota Ixar': 83, 'Guardianes de La Reina': 81, 'Orfeo': 80,
  'Élite Omega': 93, 'Galanes Electrizantes':70, 'Los Cuatro Magníficos': 70,
  'Chispas Perfectas': 85, 'Artemisa de Mr.YI': 90,
  // Añadidos por el usuario (escudo y media dados por él)
  'Ángeles Oscuros': 85, 'FFI Estrellas': 80, 'Neo Raimon': 75, 'Raimon GO': 70, 'Zoolan Team': 60, 'Claustro Sagrado': 60,
  'Royal Academy GO': 60, 'Instituto Espejismo': 63, 'Poderosa Fe': 60
};


// El plantel real: 16 personajes de Inazuma Eleven. "nombre" usa el nombre
// del doblaje en inglés/internacional (idéntico al usado en el doblaje de
// España). "original" es el nombre japonés de referencia. "hissatsu" son
// jugadas especiales reales atribuidas correctamente a cada personaje.
var ROSTER = [
  {
    id: 'r01', equipo:'Raimon', nombre: 'Mark Evans', original: 'Endou Mamoru',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 42, pase: 55, defensa: 88, especial: 88,
    hissatsu:['Mano Mágica'],tipoTecnica:'portero',
    desc: 'Portero legendario y capitán de corazón indomable.',
    locked: true, cost:200
  },
  {
    id: 'r02', equipo:'Raimon', nombre: 'Axel Blaze', original: 'Gouenji Shuuya',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 89, pase: 75, defensa: 32, especial: 87,
    hissatsu:['Tornado de Fuego'],tipoTecnica:'tiro',
    desc: 'El delantero estrella, el mejor rematador del equipo.',
    locked: true, cost:210
  },
  {
    id: 'r03', equipo:'Raimon', nombre: 'Nathan Swift', original: 'Kazemaru Ichirouta',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 75, pase: 76, defensa: 75, especial: 65,
    hissatsu:['Defensa Huracán'],tipoTecnica:'regate',
    desc: 'El jugador más veloz del Raimon.',
    locked: true, cost:126
  },
  {
    id: 'r04', equipo:'Raimon', nombre: 'Jude Sharp', original: 'Kidou Yuuto',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 80, pase: 85, defensa: 67, especial: 80,
    hissatsu:['Pingüino Emperador III'],tipoTecnica:'regate',
    desc: 'Estratega frío y calculador, el cerebro del equipo.',
    locked: true, cost:79
  },
  {
    id: 'r05', equipo:'Raimon', nombre: 'Kevin Dragonfly', original: 'Someoka Ryuugo',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 78, pase: 71, defensa: 40, especial: 70,
    hissatsu:['Remate Dragón'],tipoTecnica:'tiro',
    desc: 'Delantero fogoso, uno de los fundadores del club.',
    locked: false
  },
  {
    id: 'r06', equipo:'Raimon', nombre: 'Jack Wallside', original: 'Kabeyama Heigorou',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 36, pase: 67, defensa: 83, especial: 80,
    hissatsu:['El Muro'],tipoTecnica:'defensa',
    desc: 'Un muro humano casi imposible de traspasar.',
    locked: true, cost:137
  },
  {
    id: 'r07', equipo:'Raimon', nombre: 'Caleb Stonewall', original: 'Fudou Akio',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 74, pase: 80, defensa: 76, especial: 70,
    hissatsu:['Pinguino Emperador III'],tipoTecnica:'regate',
    desc: 'Provocador y letal, juega sin reglas.',
    locked: true, cost:158
  },
  {
    id: 'r08', equipo:'Raimon', nombre: 'Shawn Froste', original: 'Fubuki Shirou',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 76, pase: 70, defensa: 79, especial: 80,
    hissatsu:['Paisaje Helado'],tipoTecnica:'tiro',
    desc: 'Frío como el hielo, letal frente a la portería.',
    locked: true, cost:151
  },
  {
    id: 'r09', equipo:'Raimon', nombre: 'Austin Hobbs', original: 'Toramaru Utsunomiya',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 78, pase: 70, defensa: 32, especial: 72,
    hissatsu:['Remate del Tigre'],tipoTecnica:'tiro',
    desc: 'El delantero más joven, con un instinto feroz.',
    locked: true, cost:101
  },
  {
    id: 'r10', equipo:'Raimon', nombre: 'Erik Eagle', original: 'Ichinose Kazuya',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 74, pase: 80, defensa: 70, especial: 75,
    hissatsu:['Fénix'],tipoTecnica:'tiro',
    desc: 'Líder nato, siempre listo para resurgir.',
    locked: true, cost:166
  },
  {
    id: 'r11', equipo:'Raimon', nombre: 'Darren LaChance', original: 'Tachimukai Yuuki',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 20, pase: 48, defensa: 81, especial: 80,
    hissatsu:['Mano Mágica'],tipoTecnica:'portero',
    desc: 'Guardameta suplente que se ganó su titularidad a pulso.',
    locked: true, cost:87
  },
  {
    id: 'r12', equipo:'Raimon', nombre: 'Todd Ironside', original: 'Kurimatsu Teppei',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 34, pase: 71, defensa: 77, especial: 70,
    hissatsu:['Corte Giratorio'],tipoTecnica:'defensa',
    desc: 'Defensa fornido con un don inesperado para el regate.',
    locked: false
  },
  // -- Personajes desbloqueables con Puntos de Espíritu en el Vestuario --
  {
    id: 'r13', equipo:'Royal Academy', nombre: 'Joseph King', original: 'Genda Koujirou',
    posicion: 'Portero', tipo: 'Fuego',
    tiro: 24, pase: 56, defensa: 83, especial: 81,
    hissatsu:['Escudo de Fuerza'],tipoTecnica:'portero',
    desc: 'Guardameta de la Royal, orgulloso e inquebrantable.',
    locked: true, cost:107
  },
  {
    id: 'r14', equipo:'Genesis', nombre: 'Xavier Foster', original: 'Kiyama Hiroto',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 87, pase: 81, defensa: 38, especial: 80,
    hissatsu:['Cañon de Meteoritos'],tipoTecnica:'tiro',
    desc: 'Antiguo capitán de Genesis, ambicioso y brillante.',
    locked: true, cost:142
  },
  {
    id: 'r15', equipo:'Inazuma Japon', nombre: 'Jordan Greenway', original: 'Midorikawa Ryuuji',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 75, pase: 78, defensa: 74, especial: 77,
    hissatsu:['Puerta Astral'],tipoTecnica:'tiro',
    desc: 'Técnica exquisita y un gran corazón.',
    locked: true, cost:154
  },
  {
    id: 'r16', equipo:'Raimon', nombre: 'Bobby Shearer', original: 'Domon Asuka',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 42, pase: 58, defensa: 80, especial: 65,
    hissatsu:['Corte Volcánico'],tipoTecnica:'tiro',
    desc: 'Defensor disciplinado, siempre el primero en el barro.',
    locked: true, cost:113
  },
  // -- Ampliación del plantel (segunda ronda de verificación, ver README) --
  {
    id: 'r17', equipo:'Diamond Dust', nombre: 'Bryce Withingale', original: 'Suzuno Fuusuke',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 84, pase: 60, defensa: 38, especial: 73,
    hissatsu:['Balón Iceberg'],tipoTecnica:'tiro',
    desc: 'Capitán de Diamond Dust, frío y calculador frente a la portería.',
    locked: true, cost:138
  },
  {
    id: 'r18', equipo:'Inazuma Japon', nombre: 'Hurley Kane', original: 'Tsunami Jousuke',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 72, pase: 66, defensa: 78, especial: 80,
    hissatsu:['Remate Tsunami'],tipoTecnica:'tiro',
    desc: 'Surfista y defensa de Inazuma Japón, imparable con el viento a favor.',
    locked: true, cost:145
  },
  {
    id: 'r19', equipo:'Prominence', nombre: 'Claude Beacons', original: 'Nagumo Haruya',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 85, pase: 75, defensa: 32, especial: 81,
    hissatsu:['Llamarada Atómica'],tipoTecnica:'tiro',
    desc: 'Capitán de Prominence, ambicioso y ardiente ante el gol.',
    locked: true, cost:110
  },
  {
    id: 'r20', equipo:'Zeus', nombre: 'Byron Love', original: 'Afuro Terumi',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 84, pase: 81, defensa: 69, especial: 80,
    hissatsu:['Sabiduría Divina'],tipoTecnica:'defensa',
    desc: 'Capitán de Zeus, el centrocampista más elegante y letal.',
    locked: true, cost:186
  },
  {
    id: 'r21', equipo:'Raimon', nombre: 'Scott Banyan', original: 'Kogure Yuuya',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 38, pase: 69, defensa: 80, especial: 79,
    hissatsu:['Campo Torbellino'],tipoTecnica:'defensa',
    desc: 'Defensa travieso de Raimon, siempre lleno de recursos.',
    locked: true, cost:91
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
    id: 'r22', equipo:'Royal Academy', nombre: 'David Samford', original: 'Sakuma Jirou',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 78, pase: 79, defensa: 59, especial: 67,
    hissatsu:['Pinguino Emperador II'],tipoTecnica:'regate',
    desc: 'Delantero de la royal, implacable y sin piedad en el choque.',
    locked: true, cost:119
  },
  {
    id: 'r23', equipo:'Inazuma Japon', nombre: 'Archer Hawkins', original: 'Tobitaka Seiya',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 30, pase: 76, defensa: 83, especial: 82,
    hissatsu:['Corte de vacío'],tipoTecnica:'tiro',
    desc: 'Guerrero solitario que rechazó el once titular por orgullo.',
    locked: true, cost:93
  },
  {
    id: 'r24', equipo:'Alpino', nombre: 'Aiden Froste', original: 'Fubuki Atsuya',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 86, pase: 72, defensa: 30, especial: 82,
    hissatsu:['Remate Cazaosos'],tipoTecnica:'tiro',
    desc: 'El hermano de Shawn Froste, tan letal como frío en el área.',
    locked: true, cost:110
  },
  {
    id: 'r30', equipo:'Raimon', nombre: 'Arion Sherwind', original: 'Matsukaze Tenma',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 84, pase: 82, defensa: 75, especial: 85,
    hissatsu:['Brisa deslizante'],tipoTecnica:'regate',
    desc: 'Capitán de la nueva generación de Raimon, corazón indomable.',
    locked: true, cost:167
  },
  {
    id: 'r31', equipo:'Raimon GO', nombre: 'Riccardo Di Rigo', original: 'Shindou Takuto',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 79, pase: 87, defensa: 78, especial: 84,
    hissatsu:['Pentagrama'],tipoTecnica:'tiro',
    desc: 'Estratega de piano y balón, heredero del legado de Jude Sharp.',
    locked: false
  },
  {
    id: 'r32', equipo:'Raimon GO', nombre: 'Gabriel García', original: 'Kirino Ranmaru',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 40, pase: 76, defensa: 81, especial: 80,
    hissatsu:['Niebla Mística'],tipoTecnica:'regate',
    desc: 'Defensa técnico y mejor amigo de Riccardo.',
    locked: false
  },
  {
    id: 'r33', equipo:'Raimon GO', nombre: 'Aitor Cazador', original: 'Kariya Masaki',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 44, pase: 70, defensa: 82, especial: 78,
    hissatsu:['Red de caza'],tipoTecnica:'portero',
    desc: 'Defensa travieso capaz de desaparecer entre rivales.',
    locked: true, cost:120
  },
  {
    id: 'r34', equipo:'Raimon GO', nombre: 'Víctor Blade', original: 'Tsurugi Kyousuke',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 85, pase: 78, defensa: 36, especial: 79,
    hissatsu:['Aguijón Letal'],tipoTecnica:'tiro',
    desc: 'Delantero letal con una precisión de rapaz.',
    locked: true, cost:139
  },
  {
    id: 'r36', equipo:'Raimon GO', nombre: 'Ryoma Nishiki', original: 'Nishiki Ryouma',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 80, pase: 73, defensa: 34, especial: 75,
    hissatsu:['Chut ancestal'],tipoTecnica:'tiro',
    desc: 'Delantero desenfadado con un don natural para el gol.',
    locked: false
  },
  {
    id: 'r37', equipo:'Raimon GO', nombre: 'Subaru Honda', original: 'Kurumada Gouichi',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 36, pase: 53, defensa: 75, especial: 70,
    hissatsu:['A todo vapor'],tipoTecnica:'regate',
    desc: 'Defensa colosal, un muro que pocos logran superar.',
    locked: true, cost:101
  },
  {
    id: 'r38', equipo:'Raimon', nombre: 'Samguk Han', original: "Sangoku Taichi",
    posicion: 'Portero', tipo: 'Fuego',
    tiro: 22, pase: 50, defensa: 75, especial: 75,
    hissatsu:['Captura ardiente'],tipoTecnica:'portero',
    desc: 'Portero del raimon, con reflejos felinos y un corazón ardiente.',
    locked: false
  },
  {
    id: 'r39', equipo:'Neo Raimon', nombre: 'Shadow Cimmerian', original: "Kageto Yamino",
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 79, pase: 76, defensa: 32, especial: 70,
    hissatsu:['Tornado oscuro'],tipoTecnica:'tiro',
    desc: 'Delantero misterioso, capaz de desaparecer entre las sombras.',
    locked: false
  },
  {
    id: 'r40', equipo:'Raimon', nombre: 'William Glass', original: "Kakeru Megane",
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 68, pase: 60, defensa: 34, especial: 68,
    hissatsu:['Remate Gafas'],tipoTecnica:'tiro',
    desc: 'Delantero elegante y preciso, con un toque de magia en sus pies.',
    locked: false
  },
  {
    id: 'r41', equipo:'Neo Raimon', nombre: 'Paul Peabody', original: "Goro Tamaro",
    posicion: 'Portero', tipo: 'Bosque',
    tiro: 48, pase: 52, defensa: 72, especial: 71,
    hissatsu:['Mano Celestial'],tipoTecnica:'portero',
    desc: 'Portero experimentado con una visión única del juego.',
    locked: false
  },
  {
    id: 'r42', equipo:'Inazuma Japon', nombre: 'Thor Stoutberg', original: "Raiden Hijikata",
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 38, pase: 69, defensa: 80, especial: 80,
    hissatsu:['Pisotón de Sumo'],tipoTecnica:'defensa',
    desc: 'Defensa robusto y disciplinado, con un estilo de juego imponente.',
    locked: false
  },
  {
    id: 'r43', equipo:'Neo Japón', nombre: 'Larry Pogue', original: "Saginuma Osamu",
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 75, pase: 75, defensa: 55, especial: 80,
    hissatsu:['Chut draconiano'],tipoTecnica:'tiro',
    desc: 'Centrocampista creativo, capaz de cambiar el rumbo del partido.',
    locked: false
  },
  {
    id: 'r44', equipo:'Neo Raimon', nombre: 'Tom Skipper', original: "Yo Kabutenji",
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 83, pase: 73, defensa: 36, especial: 76,
    hissatsu:['La Tierra'],tipoTecnica:'defensa',
    desc: 'Delantero ágil y veloz, con un instinto asesino frente a la portería.',
    locked: true, cost:126
  },
  {
    id: 'r45', equipo:'Academia Ogre', nombre: 'Bash Lancer', original: "Baddap Sleep",
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 88, pase: 84, defensa: 34, especial: 85,
    hissatsu:['Lanza Letal'],tipoTecnica:'defensa',
    desc: 'Delantero y capitán de la Academia Ogro, con un estilo de juego agresivo y directo.',
    locked: true, cost:147
  },
    {
    id: 'r46', equipo:'Raimon', nombre: 'Steve Grim', original: 'Handa Shinichi',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 67, pase: 64, defensa: 61, especial: 52,
    hissatsu:['Disparo Rodante'],tipoTecnica:'tiro',
    desc: 'Centrocampista equilibrado de Raimon, fiable y trabajador.',
    locked: false, cost:68
  },
  {
    id: 'r47', equipo:'Raimon', nombre: 'Timmy Saunders', original: 'Shourinji Ayumu',
    posicion: 'Centrocampista', tipo: 'Montaña',
    tiro: 69, pase: 62, defensa: 58, especial: 63,
    hissatsu:['Cabezazo Kung Fu'],tipoTecnica:'tiro',
    desc: 'Pequeño pero valiente jugador de Raimon con gran espíritu de lucha.',
    locked: false, cost:61
  },
  {
    id: 'r48', equipo:'Raimon', nombre: 'Maxwell Carson', original: 'Matsuno Kuusuke',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 72, pase: 65, defensa: 44, especial: 64,
    hissatsu:['Remate en V'],tipoTecnica:'tiro',
    desc: 'Centrocampista habilidoso de Raimon, siempre dispuesto a improvisar.',
    locked: false, cost:74
  },
  {
    id: 'r49', equipo:'Raimon', nombre: 'Jim Wraith', original: 'Kageno Jin',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 34, pase: 48, defensa: 71, especial: 72,
    hissatsu:['Doppelganger'],tipoTecnica:'defensa',
    desc: 'Defensa silencioso capaz de sorprender apareciendo de la nada.',
    locked: false, cost:71
  },
  {
    id: 'r50', equipo:'Inazuma Japon', nombre: 'Isaac Glass', original: 'Kazuto Megane', sprite: 'assets/sprites/r50.webp',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 69, pase: 62, defensa: 36, especial: 70,
    hissatsu:['Remate Gafas v2'],tipoTecnica:'tiro',
    desc: 'Delantero peculiar que sueña con convertirse en una estrella.',
    locked: false, cost:76
  },
  {
    id: 'r51', equipo:'Zeus', nombre: 'Paul Siddon', original: 'Donichi Posei',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 51, pase: 50, defensa: 79, especial: 80,
    hissatsu:['Muralla Gigante'],tipoTecnica:'portero',
    desc: 'Portero veterano del Zeus, conocido por su imponente presencia en la portería.',
    locked: true, cost:163
  },
  {
    id: 'r52', equipo:'Raimon', nombre: 'Tori Vanguard', original: 'Zaizen Touko',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 58, pase: 62, defensa: 74, especial: 72,
    hissatsu:['Torre Inexpugnable'],tipoTecnica:'defensa',
    desc: 'Centrocampista de Aire con una gran capacidad defensiva.',
    locked: true, cost:121
  },
  {
    id: 'r53', equipo:'Genesis', nombre: 'Bellatrix', original: 'Reina Yagami',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 77, pase: 77, defensa: 64, especial: 75,
    hissatsu:['Pinguino Espacial'],tipoTecnica:'regate',
    desc: 'Hermana de Xene, con un estilo de juego elegante y preciso.',
    locked: false, cost:63
  },
  {
    id: 'r54', equipo:'Épsilon', nombre: 'Dave Quagmire', original: 'Saginuma Osamu',
    posicion: 'Portero', tipo: 'Viento',
    tiro: 64, pase: 65, defensa: 82, especial: 80,
    hissatsu:['Agujero de gusano'],tipoTecnica:'portero',
    desc: 'Portero de Epsilon con reflejos sorprendentes y gran intuición para anticipar los tiros.',
    locked: true, cost:131
  },
  {
    id: 'r55', equipo:'Épsilon', nombre: 'Zeke Valanche', original: 'Desarm',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 75, pase: 57, defensa: 57, especial: 72,
    hissatsu:['Remate de Gaia'],tipoTecnica:'tiro',
    desc: 'Delantero de Epsilon con una presencia intimidante y gran potencia.',
    locked: true, cost:137
  },
  {
    id: 'r56', equipo:'Raimon', nombre: 'Suzette Hartland', original: 'Urabe Rika',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 70, pase: 54, defensa: 38, especial: 70,
    hissatsu:['Torre de Osaka'],tipoTecnica:'defensa',
    desc: 'Delantera de Osaka con una personalidad tan intensa como su juego.',
    locked: false, cost:82
  },
  {
    id: 'r57', equipo:'Neo Japón', nombre: 'Eugene Conwell', original: 'Kogure Yuuya',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 69, pase: 69, defensa: 48, especial: 69,
    hissatsu:['Chut congelante'],tipoTecnica:'tiro',
    desc: 'Cabeza bolo.',
    locked: false, cost:78
  },
  {
    id: 'r58', equipo:'Knights', nombre: 'Edgar Partinus', original: 'Edgar Valtinas',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 86, pase: 64, defensa: 38, especial: 78,
    hissatsu:['Excalibur'],tipoTecnica:'tiro',
    desc: 'Capitán de los Knights of Queen y elegante especialista del remate.',
    locked: true, cost:189
  },
  {
    id: 'r59', equipo:'Unicorn', nombre: 'Mark Krueger', original: 'Mark Kruger',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 76, pase: 80, defensa: 70, especial: 77,
    hissatsu:['Gran Lobo'],tipoTecnica:'tiro',
    desc: 'Capitán de Unicorn y uno de los grandes cerebros del fútbol americano.',
    locked: true, cost:179
  },
  {
    id: 'r60', equipo:'Unicorn', nombre: 'Dylan Keats', original: 'Dylan Keith',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 82, pase: 73, defensa: 36, especial: 77,
    hissatsu:['Remate Unicornio'],tipoTecnica:'tiro',
    desc: 'Delantero de Unicorn conocido por su velocidad y precisión.',
    locked: true, cost:163
  },
  {
    id: 'r61', equipo:'Orfeo', nombre: 'Paolo Bianchi', original: 'Fidio Aldena',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 85, pase: 78, defensa: 34, especial: 82,
    hissatsu:['Espada de Odín'],tipoTecnica:'tiro',
    desc: 'Capitán de Orfeo y meteoro blanco del fútbol italiano.',
    locked: true, cost:200
  },
  {
    id: 'r62', equipo:'Los Emperadores', nombre: 'Tiago Torres', original: 'Teres Tolue',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 42, pase: 78, defensa: 88, especial: 84,
    hissatsu:['Muro de Hierro'],tipoTecnica:'defensa',
    desc: 'Capitán de Los Emperadores, especialista defensivo prácticamente impenetrable.',
    locked: true, cost:184
  },
  {
    id: 'r63', equipo:'Orfeo', nombre: 'Nakata Hidetoshi', original: 'Nakata Hidetoshi',
    posicion: 'Centrocampista', tipo: 'Montaña',
    tiro: 88, pase: 84, defensa: 80, especial: 88,
    hissatsu:['Disparo Valiente'],tipoTecnica:'tiro',
    desc: 'Veterano de gran talento que lidera el centro del campo con experiencia.',
    locked: true, cost:278
  },
  {
    id: 'r64', equipo:'Orfeo', nombre: 'Angelo Gabrini', original: 'Angelo Gabrini',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 70, pase: 74, defensa: 34, especial: 74,
    hissatsu:['Balon Angelical'],tipoTecnica:'tiro',
    desc: 'Centrocampista italiano de técnica refinada y gran capacidad goleadora.',
    locked: true, cost:152
  },
  {
    id: 'r65', equipo:'Orfeo', nombre: 'Marco Maserati', original: 'Marco Masato',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 52, pase: 70, defensa: 78, especial: 75,
    hissatsu:['Voltereta Círcense'],tipoTecnica:'regate',
    desc: 'Defensa técnica de Orfeo con gran capacidad para combinar.',
    locked: false, cost:110
  },
  {
    id: 'r66', equipo:'Neo Raimon', nombre: 'Jimmy Mach', original: 'Maya Hayami',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 73, pase: 70, defensa: 34, especial: 70,
    hissatsu:['Tiro Giratorio'],tipoTecnica:'tiro',
    desc: 'Alcanza la velocidad del sonido y es capaz de rematar desde cualquier ángulo.',
    locked: false, cost:116
  },
  {
    id: 'r67', equipo:'Neo Raimon', nombre: 'Balt Decker', original: 'Balt Decker',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 50, pase: 65, defensa: 73, especial: 70,
    hissatsu:['Ciclón'],tipoTecnica:'defensa',
    desc: 'Defensa de pequeño tamaño pero gran capacidad defensiva.',
    locked: false, cost:126
  },
  {
    id: 'r68', equipo:'Los arions', nombre: 'Fei Rune', original: 'Fei Rune',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 85, pase: 79, defensa: 32, especial: 80,
    hissatsu:['Remate Rebotado'],tipoTecnica:'tiro',
    desc: 'Viajero del tiempo que ayudó a Arion a salvar el fútbol.',
    locked: true, cost: 99999
  },
  {
    id: 'r69', equipo:'Los arions', nombre: 'Vladimir Blade', original: 'Yuichi Tsurugi',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 88, pase: 64, defensa: 36, especial: 80,
    hissatsu:['Aguijón Escarlata'],tipoTecnica:'tiro',
    desc: 'Hermano de Víctor Blade, un delantero letal con una precisión de rayo.',
    locked: true, cost: 99999
  },
  {
    id: 'r70', equipo:'Los arions', nombre: 'WonderBot', original: 'WonderBot',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 20, pase: 40, defensa: 90, especial: 80,
    hissatsu:['Defensa Automática'],tipoTecnica:'defensa',
    desc: 'Portero robotizado con reflejos sobrehumanos y una programación impecable.',
    locked: true, cost: 99999
  },
  {
    id: 'r71', equipo:'Ángeles Oscuros', nombre: 'Destra', original: 'Desuta',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 85, pase: 65, defensa: 30, especial: 80,
    hissatsu:['Carga Negativa'],tipoTecnica:'tiro',
    desc: 'Delantero de fuerza bruta, capaz de romper cualquier defensa.',
    locked: true, cost:189
  },
  {
    id: 'r72', equipo:'Ángeles Oscuros', nombre: 'Sael', original: 'Sael',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 85, pase: 76, defensa: 34, especial: 80,
    hissatsu:['Remate Celestial'],tipoTecnica:'tiro',
    desc: 'Delantero de origen desconocido, con un estilo de juego místico y poderoso.',
    locked: true, cost:168
  },
  {
  id: 'r73', equipo:'Academia Ogre', nombre: 'Escavan Malice', original: 'Eska Bannel',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 81, pase: 70, defensa: 30, especial: 80,
    hissatsu:['Lluvia Letal'],tipoTecnica:'tiro',
    desc: 'Es tan temperamental que monta en cólera si pierde la ocasión de marcar',
    locked: true, cost:179
  },
  {
    id: 'r74', equipo:'Academia Ogre', nombre: 'Mystral Callous', original: 'Mistrene Callous',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 80, pase: 70, defensa: 30, especial: 80,
    hissatsu:['Lluvia Letal'],tipoTecnica:'tiro',
    desc: 'Puede parecer una chica, pero, a la hora de jugar, es todo un salvaje.',
    locked: true, cost:184
  },
  {
    id: 'r75', equipo:'FFI Estrellas', nombre: 'Victor Garcia', original: 'Querardo Naval',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 50, pase: 75, defensa: 81, especial: 80,
    hissatsu:['Engaño Torero'],tipoTecnica:'regate',
    desc: 'Se crió en una finca con toros y sabe torear, pero no le gusta herir a los animales.',
    locked: true, cost:152
  },
  {
    id: 'r76', equipo:'Equipo Zero', nombre: 'Bai Long', original: 'Haikyuu',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 85, pase: 82, defensa: 34, especial: 85,
    hissatsu:['Rizo de Dragón'],tipoTecnica:'tiro',
    desc: 'Rival de Victor Blade. Se crió en el Santuario',
    locked: true, cost:163
  },
  {
    id: 'r77', equipo:'Equipo Zero', nombre: 'Tezcat', original: 'Shuu',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 83, pase: 81, defensa: 34, especial: 85,
    hissatsu:['Ceniza Negra'],tipoTecnica:'tiro',
    desc: 'Delantero misterioso con habilidades sobrenaturales.',
    locked: true, cost:163
  },
  {
    id: 'r78', equipo:'Zanark Domain', nombre: 'Zanark Avalonic', original: 'Zanark Avalonic',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 88, pase: 79, defensa: 34, especial: 88,
    hissatsu:['Golpe Cataclismo'],tipoTecnica:'tiro',
    desc: 'Delantero de origen desconocido, con un estilo de juego imponente y poderoso.',
    locked: true, cost:210
  },
  {
    id: 'r79', equipo:'Emperadores Oscuros', nombre: 'Malcom Night Osc.', original: 'Malcom Night',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 50, pase: 69, defensa: 80, especial: 80,
    hissatsu:['Corte Giratorio'],tipoTecnica:'defensa',
    desc: 'Defensa de gran experiencia, capaz de anticipar cualquier jugada.',
    locked: true, cost:126
  },
  {
    id: 'r80', equipo:'Occult', nombre: 'Mask', original: 'Nathan Jones',
    posicion: 'Portero', tipo: 'Viento',
    tiro: 30, pase: 50, defensa: 76, especial: 75,
    hissatsu:['Cuchilla Asesina'],tipoTecnica:'tiro',
    desc: 'Portero enmascarado con reflejos felinos y gran intuición para detener tiros.',
    locked: false
  },
  {
    id: 'r81', equipo:'Occult', nombre: 'Wolf', original: 'Troy Moon',
    posicion: 'Centrocampista', tipo: 'Montaña',
    tiro: 70, pase: 71, defensa: 60, especial: 70,
    hissatsu:['Tiro Fantasma'],tipoTecnica:'tiro',
    desc: 'Defensa que sale cuando hay Luna Llena.',
    locked: false
  },
  {
    id: 'r82', equipo:'Occult', nombre: 'Talisman', original: 'Johan Tassman',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 76, pase: 70, defensa: 50, especial: 70,
    hissatsu:['Tiro Fantasma'],tipoTecnica:'tiro',
    desc: 'Mediocentro y capitán del Occult.',
    locked: false
  },
 // ============================================================
  // WILD - 11 TITULARES
  // ============================================================

  {
    id: 'r83', equipo:'Wild', nombre: 'Boar', original: 'Charlie Boardfield',
    posicion: 'Portero', tipo: 'Fuego',
    tiro: 18, pase: 48, defensa: 75, especial: 72,
    hissatsu:['Garra Salvaje'],tipoTecnica:'tiro',
    desc: 'Portero del Wild, agresivo y poderoso como un jabalí.',
    locked: false, cost:110
  },
  {
    id: 'r84', equipo:'Wild', nombre: 'Chicken', original: 'Hugo Tallgeese',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 66, pase: 70, defensa: 61, especial: 68,
    hissatsu:['Acelerón'],tipoTecnica:'regate',
    desc: 'Capitán del Wild y cerebro del equipo.',
    locked: false, cost:121
  },
  {
    id: 'r85', equipo:'Wild', nombre: 'Fishman', original: 'Wilson Fishman', sprite: 'assets/sprites/r85.webp',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 38, pase: 52, defensa: 75, especial: 69,
    hissatsu:['Robo Rápido'],tipoTecnica:'defensa',
    desc: 'Defensa ágil especializado en robar balones.',
    locked: false, cost:95
  },
  {
    id: 'r86', equipo:'Wild', nombre: 'Toad', original: 'Peter Johnson', sprite: 'assets/sprites/r86.webp',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 34, pase: 46, defensa: 73, especial: 68,
    hissatsu:['Barrido Defensivo'],tipoTecnica:'defensa',
    desc: 'Defensa resistente que utiliza movimientos rápidos para recuperar el balón.',
    locked: false, cost:92
  },
  {
    id: 'r87', equipo:'Wild', nombre: 'Lion', original: 'Leonard O\'Shea', sprite: 'assets/sprites/r87.webp',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 45, pase: 48, defensa: 78, especial: 72,
    hissatsu:['Embestida'],tipoTecnica:'regate',
    desc: 'Defensa poderoso que destaca por su fuerza física.',
    locked: false, cost:110
  },
  {
    id: 'r88', equipo:'Wild', nombre: 'Chameleon', original: 'Cham Lion', sprite: 'assets/sprites/r88.webp',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 42, pase: 75, defensa: 73, especial: 62,
    hissatsu:['Robo Rápido'],tipoTecnica:'defensa',
    desc: 'Defensa imprevisible capaz de desaparecer entre los rivales.',
    locked: false, cost:97
  },
  {
    id: 'r89', equipo:'Wild', nombre: 'Eagle', original: 'Steve Eagle', sprite: 'assets/sprites/r89.webp',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 70, pase: 70, defensa: 48, especial: 70,
    hissatsu:['Ataque de Cóndor'],tipoTecnica:'tiro',
    desc: 'Centrocampista veloz que domina el juego aéreo.',
    locked: false, cost:113
  },
  {
    id: 'r90', equipo:'Wild', nombre: 'Monkey', original: 'Bruce Monkey', sprite: 'assets/sprites/r90.webp',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 64, pase: 65, defensa: 66, especial: 68,
    hissatsu:['Giro de Mono'],tipoTecnica:'regate',
    desc: 'Jugador imprevisible y escurridizo que puede aparecer en cualquier zona.',
    locked: false, cost:107
  },
  {
    id: 'r91', equipo:'Wild', nombre: 'Gorilla', original: 'Gary Lancaster', sprite: 'assets/sprites/r91.webp',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 75, pase: 72, defensa: 45, especial: 70,
    hissatsu:['Remate Tarzán'],tipoTecnica:'tiro',
    desc: 'Delantero de enorme fuerza física y potencia de remate.',
    locked: false, cost:126
  },
  {
    id: 'r92', equipo:'Wild', nombre: 'Snake', original: 'Harry Snake', sprite: 'assets/sprites/r92.webp',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 73, pase: 69, defensa: 38, especial: 72,
    hissatsu:['Remate Serpiente'],tipoTecnica:'tiro',
    desc: 'Delantero ágil cuyos movimientos son difíciles de predecir.',
    locked: false, cost:121
  },
  {
    id: 'r93', equipo:'Wild', nombre: 'Cheetah', original: 'Adrian Speed',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 78, pase: 58, defensa: 34, especial: 78,
    hissatsu:['Remate Tarzán'],tipoTecnica:'tiro',
    desc: 'El delantero más veloz del Wild, capaz de dejar atrás a cualquier defensa.',
    locked: false, cost:137
  },

  {
    id: 'r94', equipo:'Occult', nombre: 'Styx', original: 'Russell Walk', sprite: 'assets/sprites/r94.webp',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 42, pase: 50, defensa: 73, especial: 72,
    hissatsu:['Gravedad'],tipoTecnica:'defensa',
    desc: 'Defensa del Occult vinculado al río de los muertos.',
    locked: false, cost:110
  },
  {
    id: 'r95', equipo:'Occult', nombre: 'Creepy', original: 'Jason Jones', sprite: 'assets/sprites/r95.webp',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 38, pase: 48, defensa: 72, especial: 70,
    hissatsu:['Doppelgänger'],tipoTecnica:'defensa',
    desc: 'Defensa siniestro capaz de confundir a sus rivales.',
    locked: false, cost:105
  },
  {
    id: 'r96', equipo:'Occult', nombre: 'Franky', original: 'Ken Furan', sprite: 'assets/sprites/r96.webp',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 38, pase: 45, defensa: 74, especial: 65,
    hissatsu:['Frankstein'],tipoTecnica:'tiro',
    desc: 'Defensa corpulento obsesionado con crear vida artificial.',
    locked: false, cost:113
  },
  {
    id: 'r97', equipo:'Occult', nombre: 'Undead', original: 'Jerry Fulton', sprite: 'assets/sprites/r97.webp',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 40, pase: 47, defensa: 71, especial: 68,
    hissatsu:['Doppelgänger'],tipoTecnica:'defensa',
    desc: 'Defensa que parece incapaz de sentir miedo o dolor.',
    locked: false, cost:107
  },
  {
    id: 'r98', equipo:'Occult', nombre: 'Jiangshi', original: 'Ray Mannings', sprite: 'assets/sprites/r98.webp',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 58, pase: 67, defensa: 50, especial: 73,
    hissatsu:['Gravedad'],tipoTecnica:'defensa',
    desc: 'Centrocampista que se mueve de forma extraña e imprevisible.',
    locked: false, cost:113
  },
  {
    id: 'r99', equipo:'Occult', nombre: 'Mummy', original: 'Robert Mayer', sprite: 'assets/sprites/r99.webp',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 56, pase: 64, defensa: 53, especial: 70,
    hissatsu:['Gravedad'],tipoTecnica:'defensa',
    desc: 'Centrocampista envuelto en vendas y experto en controlar el ritmo.',
    locked: false, cost:107
  },
  {
    id: 'r100', equipo:'Occult', nombre: 'Grave', original: 'Alexander Brave', sprite: 'assets/sprites/r100.webp',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 69, pase: 69, defensa: 48, especial: 74,
    hissatsu:['Maldición'],tipoTecnica:'tiro',
    desc: 'Centrocampista que canaliza una energía oscura y misteriosa.',
    locked: false, cost:113
  },
  {
    id: 'r101', equipo:'Occult', nombre: 'Blood', original: 'Burt Wolf', sprite: 'assets/sprites/r101.webp',
    posicion: 'Centrocampista', tipo: 'Montaña',
    tiro: 64, pase: 61, defensa: 50, especial: 76,
    hissatsu:['Tiro Fantasma'],tipoTecnica:'tiro',
    desc: 'Centrocampista siniestro que utiliza técnicas de aspecto vampírico.',
    locked: false, cost:118
  },
    {
    id: 'r102', equipo:'Zeus', nombre: 'Apollo', original: 'Apollo Hikaru',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 38, pase: 71, defensa: 78, especial: 72,
    hissatsu:['Entrada Tormenta'],tipoTecnica:'regate',
    desc: 'Defensa del Zeus conocido por sus movimientos rápidos y precisos.',
    locked: false, cost:113
  },
  {
    id: 'r103', equipo:'Zeus', nombre: 'Hephestus', original: 'En Hephais',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 42, pase: 74, defensa: 79, especial: 79,
    hissatsu:['Mega Terremoto'],tipoTecnica:'tiro',
    desc: 'Defensa poderoso que utiliza su fuerza para detener los ataques.',
    locked: false, cost:118
  },
  {
    id: 'r104', equipo:'Zeus', nombre: 'Ares', original: 'Ran Aresu',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 40, pase: 74, defensa: 80, especial: 75,
    hissatsu:['Entrada Tormenta'],tipoTecnica:'regate',
    desc: 'Defensa agresivo que destaca por sus entradas contundentes.',
    locked: false, cost:113
  },
  {
    id: 'r105', equipo:'Zeus', nombre: 'Dionyisus', original: 'Geki Deio',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 44, pase: 75, defensa: 80, especial: 79,
    hissatsu:['Mega Terremoto'],tipoTecnica:'tiro',
    desc: 'Defensa del Zeus con una gran potencia física.',
    locked: false, cost:116
  },
  {
    id: 'r106', equipo:'Zeus', nombre: 'Hermes', original: 'Matsuaki Herume',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 68, pase: 72, defensa: 69, especial: 78,
    hissatsu:['Hora Celestial'],tipoTecnica:'tiro',
    desc: 'Centrocampista veloz especializado en superar rivales con su velocidad.',
    locked: false, cost:121
  },
  {
    id: 'r107', equipo:'Zeus', nombre: 'Athena', original: 'Tomo Atena',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 74, pase: 73, defensa: 66, especial: 74,
    hissatsu:['Sabiduría Divina'],tipoTecnica:'defensa',
    desc: 'Centrocampista técnico capaz de controlar el ritmo del partido.',
    locked: false, cost:118
  },
  {
    id: 'r108', equipo:'Zeus', nombre: 'Demeter', original: 'Yutaka Demete',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 79, pase: 72, defensa: 39, especial: 77,
    hissatsu:['Disparo con Rebotes'],tipoTecnica:'tiro',
    desc: 'Delantero del zeus con potente disparo.',
    locked: false, cost:121
  },
  {
    id: 'r109', equipo:'Zeus', nombre: 'Hera', original: 'Tadashi Hera',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 76, pase: 74, defensa: 66, especial: 75,
    hissatsu:['Flecha Divina'],tipoTecnica:'tiro',
    desc: 'Centrocampista del Zeus capaz de lanzar poderosos disparos.',
    locked: false, cost:121
  },


  // ============================================================
  // GÉNESIS
  // Xene y Bellatrix ya están definidos.
  // ============================================================

  {
    id: 'r110', equipo:'Genesis', nombre: 'Nero', original: 'Nelson Rockwell',
    posicion: 'Portero', tipo: 'Bosque',
    tiro: 38, pase: 52, defensa: 84, especial: 76,
    hissatsu:['Muro Dimensional'],tipoTecnica:'defensa',
    desc: 'Portero del Génesis con una defensa prácticamente inexpugnable.',
    locked: false, cost:142
  },
  {
    id: 'r111', equipo:'Genesis', nombre: 'Gele', original: 'Gail Baker',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 40, pase: 72, defensa: 80, especial: 74,
    hissatsu:['Niebla Mística'],tipoTecnica:'regate',
    desc: 'Defensa del Génesis que confunde a sus rivales con movimientos impredecibles.',
    locked: false, cost:126
  },
  {
    id: 'r112', equipo:'Genesis', nombre: 'Kiburn', original: 'Kim Powell',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 44, pase: 70, defensa: 80, especial: 76,
    hissatsu:['Gravitación'],tipoTecnica:'defensa',
    desc: 'Defensa extremadamente poderoso que utiliza la fuerza gravitatoria.',
    locked: false, cost:128
  },
  {
    id: 'r113', equipo:'Genesis', nombre: 'Zohen', original: 'Zack Cummings',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 42, pase: 69, defensa: 80, especial: 70,
    hissatsu:['Robo Planeta'],tipoTecnica:'defensa',
    desc: 'Defensa resistente especializado en recuperar el balón.',
    locked: false, cost:126
  },
  {
    id: 'r114', equipo:'Genesis', nombre: 'Hauser', original: 'Hunt Mercer',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 40, pase: 69, defensa: 76, especial: 72,
    hissatsu:['Superarmadillo'],tipoTecnica:'defensa',
    desc: 'Defensa de enorme resistencia física.',
    locked: false, cost:128
  },
  {
    id: 'r115', equipo:'Genesis', nombre: 'Kormer', original: 'Connor Murray',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 67, pase: 68, defensa: 68, especial: 78,
    hissatsu:['Rapto Divino'],tipoTecnica:'tiro',
    desc: 'Centrocampista del Génesis con gran capacidad para controlar el balón.',
    locked: false, cost:131
  },
  {
    id: 'r116', equipo:'Genesis', nombre: 'Kiwill', original: 'Katie Brown',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 65, pase: 75, defensa: 78, especial: 76,
    hissatsu:['Finta Bumerán'],tipoTecnica:'regate',
    desc: 'Centrocampista técnica y ágil que destaca en el uno contra uno.',
    locked: false, cost:126
  },
  {
    id: 'r117', equipo:'Genesis', nombre: 'Ark', original: 'Ashton Malone',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 70, pase: 70, defensa: 65, especial: 80,
    hissatsu:['Cañón de Meteoritos'],tipoTecnica:'tiro',
    desc: 'Centrocampista ofensivo con un disparo de enorme potencia.',
    locked: false, cost:137
  },
  {
    id: 'r118', equipo:'Genesis', nombre: 'Wittz', original: 'Wilbur Watkins',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 82, pase: 78, defensa: 38, especial: 82,
    hissatsu:['Astro Remate'],tipoTecnica:'tiro',
    desc: 'Delantero del Génesis capaz de realizar potentes remates de origen cósmico.',
    locked: false, cost:142
  },
  {
    id: 'r119', equipo:'Pequeños Gigantes', nombre: 'Hector Helio', original: 'Rococo Ulpa',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 51, pase: 56, defensa: 87, especial: 82,
    hissatsu:['Mano Celestial X'],tipoTecnica:'portero',
    desc: 'Procede de una remota región llamada Costail y tiene un potencial enorme.',
    locked: false, cost:200
  },
  {
    id: 'r120', equipo:'Pequeños Gigantes', nombre: 'Hector Helio', original: 'Rococo Ulpa',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 88, pase: 79, defensa: 38, especial: 85,
    hissatsu:['Disparo X'],tipoTecnica:'tiro',
    desc: 'Procede de una remota región llamada Costail y tiene un potencial enorme.',
    locked: false, cost:200
  },
  // r121-r129: ronda de ampliación adicional, misma confianza media que
  // r17-r21 (posición y elemento verificados por búsqueda, hissatsu real
  // atribuido correctamente cuando se ha podido confirmar con una fuente
  // clara). El elemento de Choi es una inferencia razonable a partir del
  // nombre de su equipo (Fire Dragon / Corea), no una confirmación directa
  // de su atributo personal -- revísalo si te importa la precisión exacta.
  {
    id: 'r121', equipo:'Academia Universal', nombre: 'Sol Daystar', original: 'Amemiya Taiyou',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 85, pase: 80, defensa: 65, especial: 80,
    hissatsu:['Tormenta Solar'],tipoTecnica:'tiro',
    desc: 'Capitán del Universal, considerado el genio del fútbol de su generación.',
    locked: false, cost:152
  },
  {
    id: 'r122', equipo:'Polvo de Diamante', nombre: 'Gocker', original: 'Gokukawa Kantarou',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 25, pase: 76, defensa: 86, especial: 80,
    hissatsu:['Rompehielos'],tipoTecnica:'defensa',
    desc: 'Defensa corpulento del Polvo de Diamantes, temido por su fuerza bruta.',
    locked: false, cost:158
  },
  {
    id: 'r123', equipo:'Prominence', nombre: 'Bomber', original: 'Honba Geki',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 30, pase:75, defensa: 86, especial: 80,
    hissatsu:['Cortefuegos'],tipoTecnica:'defensa',
    desc: 'Defensa de Prominence que forma una defensa temible junto a Gocker.',
    locked: false, cost:158
  },
  {
    id: 'r124', equipo:'Los arions', nombre: 'Goldie Lemmon', original: 'Nanobana Kinako',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 68, pase: 78, defensa: 84, especial: 82,
    hissatsu:['Grumo Pegapasta'],tipoTecnica:'portero',
    desc: 'Defensa polivalente que ha jugado en varios de los grandes equipos de su generación.',
    locked: false, cost:131
  },
  {
    id: 'r125', equipo:'Prominence', nombre: 'Heat', original: 'Atsuishi Shigeto',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 71, pase: 78, defensa: 74, especial: 74,
    hissatsu:['Lluvia de Meteoros'],tipoTecnica:'tiro',
    desc: 'Centrocampista de Prominence, aprendió una técnica prohibida de un portero legendario.',
    locked: false, cost:124
  },
  {
    id: 'r126', equipo:'Prominence', nombre: 'Lean', original: 'Hasuike An',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 60, pase: 78, defensa: 60, especial: 70,
    hissatsu:['Cruz del sur'],tipoTecnica:'tiro',
    desc: 'Centrocampista de Prominence con un regate entre los mejores de su generación.',
    locked: false, cost:128
  },
  {
    id: 'r127', equipo:'Orfeo', nombre: 'Julio Acuto', original: 'Demonio Strada',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 78, pase: 82, defensa: 73, especial: 85,
    hissatsu:['Pinguino Emperador X'],tipoTecnica:'regate',
    desc: 'Idéntico a Jude Sharp, del que llegó a ser una copia casi perfecta.',
    locked: false, cost:137
  },
  {
    id: 'r128', equipo:'Cala Pirata', nombre: 'Davy Jones', original: 'Namikawa Rensuke',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 84, pase: 70, defensa: 42, especial: 80,
    hissatsu:['Peces Voladores'],tipoTecnica:'regate',
    desc: 'Capitán y delantero de Kaiou Gakuen, orgulloso de defender su honor.',
    locked: false, cost:134
  },
  {
    id: 'r129', equipo:'Dragones de Fuego', nombre: 'Choi', original: 'Choi Chang-soo',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 65, pase: 87, defensa: 80, especial: 75,
    hissatsu:['Caída Infernal'],tipoTecnica:'tiro',
    desc: 'Capitán de Fire Dragon, la selección de Corea, uno de los grandes creadores de juego.',
    locked: false, cost:134
  },
  {
    id: 'r130', equipo:'Mary Times', nombre: 'Soundtown', original: 'Cadence Soundtown',
    posicion: 'Centrocampista', tipo: 'Fuego',
    tiro: 65, pase: 82, defensa: 79, especial: 75,
    hissatsu:['Baile de Llamas'],tipoTecnica:'tiro',
    desc: 'Capitán de Mary Times',
    locked: false, cost:134
  },
  {
    id: 'r131', equipo:'Royal Academy', nombre: 'Alan Master', original: 'Alan Master',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 71, pase: 76, defensa: 73, especial: 65,
    hissatsu:['Robo rápido'],tipoTecnica:'defensa',
    desc: 'Creador de juego de la Royal.',
    locked: false, cost:134
  },
    {id: 'r132', equipo:'Tormenta de Géminis', nombre: 'Ganymede', original: 'Ganymede',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 43, pase: 70, defensa: 79, especial: 76,
    hissatsu:['Robo planetario'],tipoTecnica:'defensa',
    desc: 'Defensa de Tormenta de Géminis',
    locked: false, cost:134
  },
  {id: 'r133', equipo:'Raimon GO', nombre: 'Wanli Chang-Cheng', original: 'Wanli',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 45, pase: 66, defensa: 83, especial: 76,
    hissatsu:['Muralla de Atlantis'],tipoTecnica:'defensa',
    desc: 'Defensa Físico y amigable',
    locked: false, cost:134
  },
   {
    id: 'r134', equipo:'Royal Academy', nombre: 'Ray Dark', original: 'Kageyama Reiji',
    posicion: 'Centrocampista', tipo: 'Bosque',
    tiro: 78, pase: 82, defensa: 85, especial: 88,
    hissatsu:['Pingüino Emperador Nº2'],tipoTecnica:'regate',
    desc: 'El legendario entrenador y estratega de la Royal Academy, maestro de las tácticas más oscuras.',
    locked: true, cost: 99999
  },
  {
    id: 'r135', equipo:'Protocolo Omega 2.0', nombre: 'Beta', original: 'Beta',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 85, pase: 79, defensa: 42, especial: 78,
    hissatsu:['Comando de Disparo 07'],tipoTecnica:'tiro',
    desc: 'Capitana del Protocolo Omega 2.0, capaz de cambiar por completo su personalidad durante los partidos.',
    locked: true, cost:189
  },
  {
    id: 'r136', equipo:'Protocolo Omega', nombre: 'Alpha', original: 'Alpha',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 84, pase: 78, defensa: 44, especial: 76,
    hissatsu:['Comando de Disparo 05'],tipoTecnica:'tiro',
    desc: 'Capitán del Protocolo Omega 1.0, calculador y extremadamente preciso en el campo.',
    locked: true, cost:189
  },
  {
    id: 'r137', equipo:'Protocolo Omega 3.0', nombre: 'Gamma', original: 'Gamma',
    posicion: 'Delantero', tipo: 'Bosque',
    tiro: 86, pase: 78, defensa: 48, especial: 77,
    hissatsu:['Comando de Disparo 13'],tipoTecnica:'tiro',
    desc: 'Líder del Protocolo Omega 3.0, un delantero frío que confía plenamente en sus capacidades.',
    locked: true, cost:179
  },
  {
    id: 'r138', equipo:'Earth Eleven', nombre: 'J.P. Lapin', original: 'Nishizono Shinsuke',
    posicion: 'Portero', tipo: 'Montaña',
    tiro: 42, pase: 55, defensa: 81, especial: 78,
    hissatsu:['Parada en Plancha'],tipoTecnica:'portero',
    desc: 'Portero de pequeño tamaño pero enorme determinación, siempre dispuesto a proteger su portería.',
    locked: true, cost:147
  },
  {
    id: 'r139', equipo:'Earth Eleven', nombre: 'Terry Archibald', original: 'Ibuki Munemasa',
    posicion: 'Portero', tipo: 'Viento',
    tiro: 45, pase: 58, defensa: 86, especial: 81,
    hissatsu:['Mate Salvaje'],tipoTecnica:'tiro',
    desc: 'Portero de largos brazos y enorme fuerza, antiguo jugador de baloncesto acostumbrado a actuar por su cuenta.',
    locked: true, cost:200
  },
  {
    id: 'r140', equipo:'Earth Eleven', nombre: 'Lucas Star', original: 'Ichihoshi Hikaru',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 79, pase: 82, defensa: 80, especial: 80,
    hissatsu:['Órbita Celestial'],tipoTecnica:'tiro',
    desc: 'Centrocampista de enorme talento cuya verdadera identidad esconde una historia mucho más compleja.',
    locked: true, cost:189
  },
  {
    id: 'r141', equipo:'Earth Eleven', nombre: 'Frank Foreman', original: 'Tetsukado Shin',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 58, pase: 78, defensa: 83, especial: 80,
    hissatsu:['Juego de piernas'],tipoTecnica:'regate',
    desc: 'Defensa corpulento y directo, antiguo boxeador acostumbrado a enfrentarse a sus rivales sin miedo.',
    locked: true, cost:168
  },
  {
    id: 'r142', equipo:'Earth Eleven', nombre: 'Falco Flashman', original: 'Matatagi Hayato',
    posicion: 'Delantero', tipo: 'Viento',
    tiro: 86, pase: 78, defensa: 38, especial: 80,
    hissatsu:['Taconazo Parkour'],tipoTecnica:'regate',
    desc: 'Delantero extremadamente veloz y talentoso, capaz de convertirse en una amenaza constante para cualquier defensa.',
    locked: true, cost:173
  },
  {
    id: 'r143', equipo:'Earth Eleven', nombre: 'Keenan Sharpe', original: 'Minaho Kazuto',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 52, pase: 76, defensa: 83, especial: 80,
    hissatsu:['Copia y corta'],tipoTecnica:'regate',
    desc: 'Defensa inteligente y observador, destaca por analizar rápidamente las jugadas de sus rivales.',
    locked: true, cost:168
  },
  {
    id: 'r144', equipo:'Earth Eleven', nombre: 'Zippy Lermer', original: 'Manabe Jinichirou',
    posicion: 'Defensa', tipo: 'Viento',
    tiro: 48, pase: 80, defensa: 85, especial: 80,
    hissatsu:['Cálculo Perfecto'],tipoTecnica:'portero',
    desc: 'Defensa brillante capaz de analizar las trayectorias y calcular con precisión las jugadas del partido.',
    locked: true, cost:168
  },
  {
    id: 'r145', equipo:'Earth Eleven', nombre: 'Trina Verdure', original: 'Morimura Konoha',
    posicion: 'Defensa', tipo: 'Bosque',
    tiro: 42, pase: 75, defensa: 80, especial: 78,
    hissatsu:['Bola de Hojas'],tipoTecnica:'tiro',
    desc: 'Defensa inicialmente tímida que consigue superar sus miedos y convertirse en una jugadora muy importante.',
    locked: true, cost:168
  },
  {
    id: 'r146', equipo:'Earth Eleven', nombre: 'Cerise Blossom', original: 'Nozaki Sakura',
    posicion: 'Centrocampista', tipo: 'Viento',
    tiro: 70, pase: 82, defensa: 61, especial: 84,
    hissatsu:['Aro-AleHop'],tipoTecnica:'regate',
    desc: 'Centrocampista elegante y habilidosa, con una gran coordinación gracias a su experiencia en gimnasia rítmica.',
    locked: true, cost:158
  },
  {
    id: 'r147', equipo:'Ragnah', nombre: 'Simeon Ayp', original: 'Saru',
    posicion: 'Delantero', tipo: 'Montaña',
    tiro: 89, pase: 86, defensa: 48, especial: 85,
    hissatsu:['Cañon de Fragmentos'],tipoTecnica:'tiro',
    desc: 'Líder y capitán del Ragnah y uno de los jugadores más poderosos de la era de Chrono Stone.',
    locked: true, cost:210
  },
  {
    id: 'r148', equipo:'Os Reis', nombre: 'Mac Robingo', original: 'Mac Robingo',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 89, pase: 78, defensa: 40, especial: 87,
    hissatsu:['Golpe de Samba'],tipoTecnica:'regate',
    desc: 'Delantero brasileño de gran potencia y presencia física, capaz de imponerse en el área rival.',
    locked: true, cost:210
  },
    {
    id: 'r149', equipo:'Orfeo', nombre: 'Gigi Blasi', original: 'Gigi Blasi',
    posicion: 'Portero', tipo: 'Viento',
    tiro: 38, pase: 51, defensa: 85, especial: 84,
    hissatsu:['Guardia del Coliseo'],tipoTecnica:'defensa',
    desc: 'Guardameta italiano.',
    locked: true, cost:189
  },
    {
    id: 'r150', equipo:'Genesis', nombre: 'Xene', original: 'Xavier Foster',
    posicion: 'Delantero', tipo: 'Fuego',
    tiro: 87, pase: 79, defensa: 38, especial: 82,
    hissatsu:['Supernova'],tipoTecnica:'tiro',
    desc: 'Delantero del Génesis y capitán.',
    locked: false, cost:210
  },
  {
    id: 'r151', equipo:'Brain', nombre: 'Feldt', original: 'Thomas Feldt',
    posicion: 'Portero', tipo: 'Bosque',
    tiro: 18, pase: 55, defensa: 82, especial: 80,
    hissatsu:['Campo de fuerza'],tipoTecnica:'portero',
    desc: 'Capitán y portero del Brain. Un jugador inteligente que recupera su verdadero espíritu deportivo.',
    locked: true, cost:131
  },
  {
    id: 'r152', equipo:'Brain', nombre: 'Philip Marvel', original: 'Philip Marvel',
    posicion: 'Defensa', tipo: 'Montaña',
    tiro: 35, pase: 68, defensa: 78, especial: 71,
    hissatsu:['Escáner Defensa'],tipoTecnica:'defensa',
    desc: 'Defensa del Brain que destaca por su físico.',
    locked: true, cost:110
  },
  {
    id: 'r153', equipo:'Brain', nombre: 'Stronger', original: 'Terry Stronger',
    posicion: 'Defensa', tipo: 'Fuego',
    tiro: 48, pase: 58, defensa: 75, especial: 70,
    hissatsu:['Escáner Defensa'],tipoTecnica:'defensa',
    desc: 'Defensa de gran fuerza física que fue sometido al lavado de cerebro del Brain.',
    locked: true, cost:113
  },
  {
  id:'r154', equipo:'Brain', nombre:'Francis Tell', original:'Francis Tell',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:68,pase:75,defensa:55,especial:76,
  hissatsu:['Cañonazo'],tipoTecnica:'tiro',
  desc:'Centrocampista del Instituto Brain, especialista en analizar el juego rival.',
  locked:true,cost:158
},
{
  id:'r155', equipo:'Brain', nombre:'Samuel Buster', original:'Samuel Buster',
  posicion:'Centrocampista', tipo:'Fuego',
  tiro:72,pase:70,defensa:52,especial:75,
  hissatsu:['Tiro dinamita'],tipoTecnica:'tiro',
  desc:'Centrocampista del Instituto Brain con gran potencia de tiro.',
  locked:true,cost:158
},
{
  id:'r156', equipo:'Brain', nombre:'Jonathan Seller', original:'Jonathan Seller',
  posicion:'Delantero', tipo:'Viento',
  tiro:80,pase:65,defensa:38,especial:78,
  hissatsu:['Remate Misil'],tipoTecnica:'tiro',
  desc:'Delantero del Instituto Brain y uno de sus principales atacantes.',
  locked:true,cost:179
},
{
  id:'r157', equipo:'Brain', nombre:'Neil Turner', original:'Neil Turner',
  posicion:'Delantero', tipo:'Fuego',
  tiro:81,pase:70,defensa:42,especial:82,
  hissatsu:['Tornado de fuego'],tipoTecnica:'tiro',
  desc:'Delantero estrella del Brain, conocido por su potente Tornado de fuego.',
  locked:true,cost:200
},
{
  id:'r158', equipo:'Shuriken', nombre:'Jim Hillfort', original:'Jim Hillfort', sprite:'assets/sprites/r158.webp',
  posicion:'Defensa', tipo:'Viento',
  tiro:48,pase:67,defensa:78,especial:72,
  hissatsu:['Telaraña'],tipoTecnica:'defensa',
  desc:'Defensa del Instituto Shuriken, propenso a enfermar con facilidad.',
  locked:true,cost:137
},
{
  id:'r159', equipo:'Shuriken', nombre:'Phil Wingate', original:'Phil Wingate', sprite:'assets/sprites/r159.webp',
  posicion:'Defensa', tipo:'Montaña',
  tiro:54,pase:64,defensa:70,especial:75,
  hissatsu:['Telaraña'],tipoTecnica:'defensa',
  desc:'Defensa del Shuriken que utiliza códigos para coordinar al equipo.',
  locked:true,cost:158
},
{
  id:'r160', equipo:'Shuriken', nombre:'Jupiter Jumper', original:'Jupiter Jumper', sprite:'assets/sprites/r160.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:63,pase:70,defensa:48,especial:73,
  hissatsu:['Giro de Mono'],tipoTecnica:'regate',
  desc:'Centrocampista del Shuriken, ágil y experto en desplazarse con rapidez.',
  locked:true,cost:147
},
{
  id:'r161', equipo:'Shuriken', nombre:'Sam Samurai', original:'Sam Samurai', sprite:'assets/sprites/r161.webp',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:75,pase:57,defensa:40,especial:79,
  hissatsu:['Remate Múltiple'],tipoTecnica:'tiro',
  desc:'Delantero del Shuriken y maestro de la espada.',
  locked:true,cost:179
},
{
  id:'r162', equipo:'Shuriken', nombre:'Hank Sullivan', original:'Hank Sullivan', sprite:'assets/sprites/r162.webp',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:67,pase:76,defensa:52,especial:77,
  hissatsu:['Espejismo'],tipoTecnica:'regate',
  desc:'Centrocampista organizador del Shuriken, especializado en coordinar al equipo.',
  locked:true,cost:158
},
{
  id:'r163', equipo:'Shuriken', nombre:'Sail Bluesea', original:'Sail Bluesea', sprite:'assets/sprites/r163.webp',
  posicion:'Delantero', tipo:'Viento',
  tiro:81,pase:68,defensa:39,especial:84,
  hissatsu:['Bola de Fango'],tipoTecnica:'tiro',
  desc:'Capitán y delantero del Instituto Shuriken.',
  locked:true,cost:189
},
{
  id:'r164', equipo:'Farm', nombre:'Albert Green', original:'Albert Green', sprite:'assets/sprites/r164.webp',
  posicion:'Portero', tipo:'Fuego',
  tiro:35,pase:52,defensa:80,especial:84,
  hissatsu:['Despeje de leñador'],tipoTecnica:'portero',
  desc:'Capitán y portero del Instituto Farm, especialista en técnicas defensivas.',
  locked:true,cost:189
},
{
  id:'r165', equipo:'Farm', nombre:'Mark Hillvalley', original:'Mark Hillvalley', sprite:'assets/sprites/r165.webp',
  posicion:'Defensa', tipo:'Montaña',
  tiro:45,pase:72,defensa:84,especial:80,
  hissatsu:['Rueda infernal'],tipoTecnica:'regate',
  desc:'Defensa del Instituto Farm, resistente y especializado en recuperar el balón.',
  locked:true,cost:158
},
{
  id:'r166', equipo:'Farm', nombre:'Herb Sherman', original:'Herb Sherman', sprite:'assets/sprites/r166.webp',
  posicion:'Defensa', tipo:'Bosque',
  tiro:55,pase:69,defensa:79,especial:77,
  hissatsu:['Chut granada'],tipoTecnica:'tiro',
  desc:'Defensa del Instituto Farm con un potente disparo como recurso ofensivo.',
  locked:true,cost:152
},
{
  id:'r167', equipo:'Farm', nombre:'Joe Small', original:'Joe Small', sprite:'assets/sprites/r167.webp',
  posicion:'Centrocampista', tipo:'Montaña',
  tiro:61,pase:70,defensa:57,especial:75,
  hissatsu:['Remolino cortante'],tipoTecnica:'tiro',
  desc:'Centrocampista del Instituto Farm, hábil y difícil de superar.',
  locked:true,cost:152
},
{
  id:'r168', equipo:'Farm', nombre:'Orville Newman', original:'Orville Newman', sprite:'assets/sprites/r168.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:74,pase:68,defensa:51,especial:73,
  hissatsu:['Cabezazo Kung-fu'],tipoTecnica:'tiro',
  desc:'Centrocampista del Instituto Farm con buen control del balón.',
  locked:true,cost:147
},
{
  id:'r169', equipo:'Farm', nombre:'Daniel Dawson', original:'Daniel Dawson', sprite:'assets/sprites/r169.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:64,pase:72,defensa:53,especial:74,
  hissatsu:['Balón rodante'],tipoTecnica:'regate',
  desc:'Centrocampista del Instituto Farm, especialista en regates y jugadas rápidas.',
  locked:true,cost:152
},
{
  id:'r170', equipo:'Neo Japón', nombre:'Miles Ryan', original:'Miles Ryan', sprite:'assets/sprites/r170.webp',
  posicion:'Defensa', tipo:'Viento',
  tiro:64,pase:70,defensa:70,especial:71,
  hissatsu:['Ciclon'],tipoTecnica:'defensa',
  desc:'Amigo de Nathan, veloz como el viento',
  locked:true,cost:152
},

{
  id:'r171', equipo:'Neo Raimon', nombre:'Saggy', original:'Sagamineta', sprite:'assets/sprites/r171.webp',
  posicion:'Delantero', tipo:'Bosque',
  tiro:78,pase:77,defensa:60,especial:84,
  hissatsu:['Remate Misil'],tipoTecnica:'tiro',
  desc:'Delantero especial de Inazuma Eleven 2, conocido como Saggy.',
  locked:true,cost:168
},
{
  id:'r172', equipo:'Neo Raimon', nombre:'Syon Blaze', original:'Masato Goenji', sprite:'assets/sprites/r172.webp',
  posicion:'Delantero', tipo:'Fuego',
  tiro:86,pase:83,defensa:38,especial:84,
  hissatsu:['Tornado de Fuego'],tipoTecnica:'tiro',
  desc:'Extraordinario delantero y primo de Axel Blaze.',
  locked:true,cost:200
},
{
  id:'r173', equipo:'Neo Raimon', nombre:'Canon Evans', original:'Kanon Endou', sprite:'assets/sprites/r173.webp',
  posicion:'Delantero', tipo:'Viento',
  tiro:86,pase:81,defensa:40,especial:86,
  hissatsu:['Cañón Celestial'],tipoTecnica:'tiro',
  desc:'Delantero del futuro y descendiente de Mark Evans.',
  locked:true,cost:210
},
{
  id:'r174', equipo:'Neo Raimon', nombre:'Bay Froste', original:'Benkei Kumano', sprite:'assets/sprites/r174.webp',
  posicion:'Defensa', tipo:'Viento',
  tiro:65,pase:79,defensa:85,especial:86,
  hissatsu:['Hielo Futurista'],tipoTecnica:'tiro',
  desc:'Defensa del futuro y descendiente de Shawn.',
  locked:true,cost:210
},
{
  id:'r175', equipo:'Neo Raimon', nombre:'Mount Wallside', original:'Shiryu Shiratori', sprite:'assets/sprites/r175.webp',
  posicion:'Delantero', tipo:'Montaña',
  tiro:84,pase:85,defensa:67,especial:83,
  hissatsu:['Remate del muro'],tipoTecnica:'tiro',
  desc:'Delantero del futuro y descendiente de Jack.',
  locked:true,cost:210
},
{
  id:'r176', equipo:'Raimon', nombre:'Chester Horse Jr', original:'Chester Horse Jr', sprite:'assets/sprites/r176.webp',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:67,pase:65,defensa:67,especial:81,
  hissatsu:['Remate Misil'],tipoTecnica:'tiro',
  desc:'Comentarista del Raimon.',
  locked:true,cost:105
},
{
  id:'r177', equipo:'Neo Raimon', nombre:'Rory Boomer', original:'Rory Boomer', sprite:'assets/sprites/r177.webp',
  posicion:'Centrocampista', tipo:'Montaña',
  tiro:72,pase:71,defensa:67,especial:69,
  hissatsu:['Disparo con rebotes'],tipoTecnica:'tiro',
  desc:'Tiene voz atronadora. Sus amigos se tapan los oídos cuando habla.',
  locked:true,cost:105
},
{
  id:'r178', equipo:'Raimon', nombre:'Sam Kincaid', original:'Shishido Sakichi',
  posicion:'Centrocampista', tipo:'Fuego',
  tiro:70,pase:60,defensa:52,especial:66,
  hissatsu:['Chut Granada'],tipoTecnica:'tiro',
  desc:'Centrocampista del Raimon, creador de su propio Chut Granada en pleno partido.',
  locked:true,cost:137
},
{
  id:'r179', equipo:'Prominence', nombre:'Grant Cook', original:'Ooiwa Kurando', sprite:'assets/sprites/r179.webp',
  posicion:'Portero', tipo:'Fuego',
  tiro:22,pase:52,defensa:85,especial:80,
  hissatsu:['Burnout'],tipoTecnica:'tiro',
  desc:'Portero del Prominence, del proyecto Aliea Academy, conocido como "Grent". Protege su portería con Burnout.',
  locked:true,cost:179
},
{
  id:'r180', equipo:'Prominence', nombre:'Val Flamewood', original:'Hagakure Koutarou', sprite:'assets/sprites/r180.webp',
  posicion:'Defensa', tipo:'Fuego',
  tiro:40,pase:71,defensa:80,especial:78,
  hissatsu:['Gravitación'],tipoTecnica:'defensa',
  desc:'Defensa del Prominence, conocido como "Bakurei". Su Gravitación es casi infranqueable.',
  locked:true,cost:173
},
{
  id:'r181', equipo:'Diamond Dust', nombre:'Denzel Freezer', original:'Mikoori Rei', sprite:'assets/sprites/r181.webp',
  posicion:'Delantero', tipo:'Montaña',
  tiro:82,pase:70,defensa:38,especial:88,
  hissatsu:['Supernova'],tipoTecnica:'tiro',
  desc:'Delantero del Diamond Dust, conocido como "Frost". Su Supernova es una de las técnicas más temidas de Aliea Academy.',
  locked:true,cost:200
},
{
  id:'r182', equipo:'Diamond Dust', nombre:'Ben North', original:'Shirai Ikkaku', sprite:'assets/sprites/r182.webp',
  posicion:'Portero', tipo:'Montaña',
  tiro:18,pase:48,defensa:83,especial:80,
  hissatsu:['Bloque de Hielo'],tipoTecnica:'portero',
  desc:'Portero del Diamond Dust, conocido como "Beluga". Nadie supera su Bloque de Hielo.',
  locked:true,cost:179
},
{
  id:'r183', equipo:'Diamond Dust', nombre:'Claire Lesnow', original:'Kurakake Clara', sprite:'assets/sprites/r183.webp',
  posicion:'Defensa', tipo:'Viento',
  tiro:36,pase:74,defensa:80,especial:76,
  hissatsu:['Rompehielos'],tipoTecnica:'defensa',
  desc:'Defensa del Diamond Dust, conocida como "Clear" y única chica del equipo. Protege su línea con Rompehielos.',
  locked:true,cost:168
},
{
  id:'r184', equipo:'Tormenta de Géminis', nombre:'Gordon Star', original:'Goryuu Reo', sprite:'assets/sprites/r184.webp',
  posicion:'Portero', tipo:'Bosque',
  tiro:22,pase:50,defensa:84,especial:78,
  hissatsu:['Agujero de Gusano'],tipoTecnica:'portero',
  desc:'Portero del Gemini Storm, del proyecto Aliea Academy, conocido como "Gorleo". Su Agujero de Gusano se traga cualquier tiro.',
  locked:true,cost:176
},
{
  id:'r185', equipo:'Royal Academy', nombre:'Daniel Hatch', original:'Jimon Daiki', sprite:'assets/sprites/r185.webp',
  posicion:'Delantero', tipo:'Bosque',
  tiro:80,pase:68,defensa:36,especial:72,
  hissatsu:['Chut de los 100 toques'],tipoTecnica:'tiro',
  desc:'Delantero del Royal Academy, letal cerca del área con su Chut de los 100 toques.',
  locked:true,cost:158
},
{
  id:'r186', equipo:'Royal Academy', nombre:'Derek Swing', original:'Ena Kazuki', sprite:'assets/sprites/r186.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:70,pase:75,defensa:58,especial:66,
  hissatsu:['Remate misil'],tipoTecnica:'tiro',
  desc:'Centrocampista del Royal Academy que sorprende al rival rematando desde su Remate misil.',
  locked:true,cost:147
},
{
  id:'r187', equipo:'Leones del desierto', nombre:'Bilal Kalil', original:'Bilal Kalil', sprite:'assets/sprites/r187.webp',
  posicion:'Defensa', tipo:'Montaña',
  tiro:58,pase:75,defensa:86,especial:82,
  hissatsu:['Tormenta de Arena'],tipoTecnica:'portero',
  desc:'Defensa de los Leones del Desierto y uno de los jugadores más destacados de Catar.',
  locked:true,cost:189
},
{
  id:'r188', equipo:'Big Waves', nombre:'Dolph Hensen', original:'Dolph Hensen', sprite:'assets/sprites/r188.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:81,pase:78,defensa:59,especial:84,
  hissatsu:['Megalodon'],tipoTecnica:'tiro',
  desc:'Centrocampista y capitán de los Big Waves, especialista en jugadas ofensivas.',
  locked:true,cost:189
},
{
  id:'r189', equipo:'Zoolan Team', nombre:'Phil A. Minion', original:'Phil A. Minion', sprite:'assets/sprites/r189.webp',
  posicion:'Defensa', tipo:'Fuego',
  tiro:62,pase:78,defensa:84,especial:80,
  hissatsu:['Piroquinesis'],tipoTecnica:'regate',
  desc:'Defensa vinculado a Zoolan Rice y a sus equipos de jugadores seleccionados.',
  locked:true,cost:184
},
{
  id:'r190', equipo:'FFI Estrellas', nombre:'Julien Rousseau', original:'Julien Rousseau', sprite:'assets/sprites/r190.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:79,pase:79,defensa:70,especial:78,
  hissatsu:['Lecho de Rosas'],tipoTecnica:'tiro',
  desc:'Centrocampista francés de los Grifos de la Rosa.',
  locked:true,cost:168
},
{
  id:'r191', equipo:'Equipo Zero', nombre:'Blake Obscura', original:'Blake Obscura', sprite:'assets/sprites/r191.webp',
  posicion:'Defensa', tipo:'Bosque',
  tiro:55,pase:78,defensa:84,especial:85,
  hissatsu:['Picadora'],tipoTecnica:'defensa',
  desc:'Defensa de Luz y Oscuridad y miembro del equipo Zero.',
  locked:true,cost:194
},
{
  id:'r192', equipo:'Criaturas de la Noche', nombre:'Wolfram Vulpeen', original:'Wolfram Vulpeen', sprite:'assets/sprites/r192.webp',
  posicion:'Delantero', tipo:'Fuego',
  tiro:86,pase:76,defensa:43,especial:90,
  hissatsu:['Aullido de Licántropo'],tipoTecnica:'tiro',
  desc:'Capitán de Aullido Lunar y segundo al mando de las Criaturas de la Noche. Miximax: Gen L.',
  locked:true,cost:221
},
{
  id:'r193', equipo:'Nosfanáticos', nombre:'Desmodus Drakul', original:'Desmodus Drakul', sprite:'assets/sprites/r193.webp',
  posicion:'Centrocampista', tipo:'Montaña',
  tiro:84,pase:82,defensa:69,especial:91,
  hissatsu:['Mordisco de Vampiro'],tipoTecnica:'tiro',
  desc:'Capitán de los Nosfanáticos y líder de las Criaturas de la Noche. Miximax: Gen V.',
  locked:true,cost:221
},
{
  id:'r194', equipo:'Ragnah', nombre:'Saru', original:'Simeon Ayp', sprite:'assets/sprites/r194.webp',
  posicion:'Delantero', tipo:'Montaña',
  tiro:90,pase:88,defensa:45,especial:94,
  hissatsu:['Cañonazo de Fragmentos V2'],tipoTecnica:'tiro',
  desc:'Saru en su versión Miximax con Gen S.',
  locked:true,cost:504
},
{
  id:'r195', equipo:'Desesperdidos', nombre:'Aster', original:'Aster', sprite:'assets/sprites/r195.webp',
  posicion:'Delantero', tipo:'Fuego',
  tiro:87,pase:78,defensa:43,especial:88,
  hissatsu:['Tormenta Dimensional'],tipoTecnica:'tiro',
  desc:'Capitán de los Desesperdidos y compañero de Flora.',
  locked:true,cost:221
},
{
  id:'r196', equipo:'Desesperdidos', nombre:'Flora', original:'Flora', sprite:'assets/sprites/r196.webp',
  posicion:'Delantero', tipo:'Viento',
  tiro:88,pase:78,defensa:42,especial:91,
  hissatsu:['Tiro Supermasivo'],tipoTecnica:'tiro',
  desc:'Jugadora de los Desesperdidos. Puede realizar Miximax con Rosa Negra.',
  locked:true,cost:221
},
{
  id:'r197', equipo:'Desesperdidos', nombre:'Lotus', original:'Lotus', sprite:'assets/sprites/r197.webp',
  posicion:'Portero', tipo:'Montaña',
  tiro:35,pase:58,defensa:85,especial:85,
  hissatsu:['Agujero Blanco'],tipoTecnica:'portero',
  desc:'Guardameta de los Desesperdidos y uno de los duplicados de Aster.',
  locked:true,cost:221
},
{
  id:'r198', equipo:'Nosfanáticos', nombre:'Holly Waters', original:'Holly Waters', sprite:'assets/sprites/r198.webp',
  posicion:'Defensa', tipo:'Fuego',
  tiro:48,pase:63,defensa:81,especial:81,
  hissatsu:['Luz Cegadora'],tipoTecnica:'defensa',
  desc:'Defensa de los Nosfanáticos y de las Criaturas de la Noche.',
  locked:true,cost:200
},
{
  id:'r199', equipo:'Nosfanáticos', nombre:'Ron Innwater', original:'Ron Innwater', sprite:'assets/sprites/r199.webp',
  posicion:'Defensa', tipo:'Montaña',
  tiro:45,pase:65,defensa:81,especial:84,
  hissatsu:['Muralla de Atlantis'],tipoTecnica:'defensa',
  desc:'Defensa de los Nosfanáticos y posteriormente de las Criaturas de la Noche.',
  locked:true,cost:194
},
{
  id:'r200', equipo:'Desesperdidos', nombre:'Magnol', original:'Magnol', sprite:'assets/sprites/r200.webp',
  posicion:'Defensa', tipo:'Bosque',
  tiro:52,pase:67,defensa:81,especial:82,
  hissatsu:['Muralla de Atlantis'],tipoTecnica:'defensa',
  desc:'Miembro de los Desesperdidos y uno de los duplicados de Aster.',
  locked:true,cost:189
},
{
  id:'r201', equipo:'Desesperdidos', nombre:'Gentian', original:'Gentian', sprite:'assets/sprites/r201.webp',
  posicion:'Delantero', tipo:'Bosque',
  tiro:83,pase:70,defensa:43,especial:85,
  hissatsu:['Polen Devastador'],tipoTecnica:'tiro',
  desc:'Delantero de los Desesperdidos, especializado en técnicas relacionadas con las plantas.',
  locked:true,cost:200
},
{
  id:'r202', equipo:'Desesperdidos', nombre:'Flora', original:'Flora', sprite:'assets/sprites/r202.webp',
  posicion:'Delantero', tipo:'Viento',
  tiro:91,pase:79,defensa:42,especial:91,
  hissatsu:['Tiro Supermasivo V2'],tipoTecnica:'tiro',
  desc:'Flora Miximax con Rosa Negra.',
  locked:true,cost:504
},
{
  id:'r203', equipo:'Gir', nombre:'Mehr', original:'Mehr', sprite:'assets/sprites/r203.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:78,pase:86,defensa:71,especial:83,
  hissatsu:['Danza del viento'],tipoTecnica:'regate',
  desc:'Capitana del Gir y una de las líderes de los Chicos de la Segunda Fase. Posteriormente se une al Ragnah.',
  locked:true,cost:221
},
{
  id:'r204', equipo:'Gir', nombre:'Ghiris', original:'Ghiris', sprite:'assets/sprites/r204.webp',
  posicion:'Centrocampista', tipo:'Fuego',
  tiro:82,pase:84,defensa:65,especial:83,
  hissatsu:['Futuro Negativo'],tipoTecnica:'tiro',
  desc:'Centrocampista del Gir y compañero de Mehr. Posteriormente se une al Ragnah.',
  locked:true,cost:215
},
{
  id:'r205', equipo:'Gir', nombre:'Chell', original:'Chell', sprite:'assets/sprites/r205.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:83,pase:70,defensa:60,especial:75,
  hissatsu:['Entrada huracán'],tipoTecnica:'regate',
  desc:'Centrocampista destacado del Gir. Posee el Espíritu Guerrero Guerrero del Oeste, Baihu.',
  locked:true,cost:205
},
{
  id:'r206', equipo:'Gir', nombre:'Zetoh', original:'Zetoh', sprite:'assets/sprites/r206.webp',
  posicion:'Delantero', tipo:'Fuego',
  tiro:83,pase:68,defensa:40,especial:74,
  hissatsu:['Llamarada atómica'],tipoTecnica:'tiro',
  desc:'Delantero del Gir, orgulloso y extremadamente trabajador. Posee el Espíritu Guerrero Gigante de Fuego, Surtur.',
  locked:true,cost:210
},
{
  id:'r207', equipo:'Ragnah', nombre:'Kyon Canis', original:'Kyon Canis', sprite:'assets/sprites/r207.webp',
  posicion:'Delantero', tipo:'Montaña',
  tiro:85,pase:69,defensa:45,especial:75,
  hissatsu:['Lanza letal'],tipoTecnica:'tiro',
  desc:'Delantero del Ragnah con el Espíritu Guerrero Adalid leonino, Jmet.',
  locked:true,cost:205
},
{
  id:'r208', equipo:'Chrono Storm', nombre:'Jean-Pierre Lapin', original:'Shinsuke Nishizono',
  sprite:'assets/sprites/r208.png',
  posicion:'Portero', tipo:'Montaña',
  tiro:62,pase:72,defensa:92,especial:96,
  hissatsu:['Romance de los Tres Reinos'],tipoTecnica:'portero',
  desc:'JP en su forma Miximax con Liu Bei. Portero del Chrono Storm.',
  locked:true,cost:693
},
{
  id:'r209', equipo:'Chrono Storm', nombre:'Gabriel Garcia', original:'Kariya Masaki',
  sprite:'assets/sprites/r209.png',
  posicion:'Defensa', tipo:'Bosque',
  tiro:55,pase:78,defensa:94,especial:91,
  hissatsu:['La Flamme'],tipoTecnica:'defensa',
  desc:'Gabi en su forma Miximax con Juana de Arco. Defensa del Chrono Storm.',
  locked:true,cost:677
},
{
  id:'r210', equipo:'Chrono Storm', nombre:'Sor', original:'Sor',
  sprite:'assets/sprites/r210.png',
  posicion:'Defensa', tipo:'Bosque',
  tiro:62,pase:87,defensa:91,especial:89,
  hissatsu:['Defensa de Quetzal'],tipoTecnica:'defensa',
  desc:'Sor en su forma Miximax con Papá Quetzalcoatlus. Defensa del Chrono Storm.',
  locked:true,cost:662
},
{
  id:'r211', equipo:'Chrono Storm', nombre:'Goldie Lemmon', original:'Nanobana Kinako',
  sprite:'assets/sprites/r211.png',
  posicion:'Defensa', tipo:'Fuego',
  tiro:78,pase:75,defensa:94,especial:93,
  hissatsu:['Ilusión deslumbrante'],tipoTecnica:'defensa',
  desc:'Goldie en su forma Miximax con la Reina de los Dragones. Defensa del Chrono Storm.',
  locked:true,cost:693
},
{
  id:'r212', equipo:'Chrono Storm', nombre:'Riccardo Di Rigo', original:'Shindou Takuto',
  sprite:'assets/sprites/r212.png',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:84,pase:96,defensa:81,especial:94,
  hissatsu:['Remate Efímero'],tipoTecnica:'tiro',
  desc:'Riccardo en su forma Miximax con Nobunaga Oda. Director de juego del Chrono Storm.',
  locked:true,cost:709
},
{
  id:'r213', equipo:'Chrono Storm', nombre:'Victor Blade', original:'Tsurugi Kyousuke',
  sprite:'assets/sprites/r213.png',
  posicion:'Delantero', tipo:'Fuego',
  tiro:98,pase:72,defensa:42,especial:96,
  hissatsu:['Katana Fulminante'],tipoTecnica:'tiro',
  desc:'Victor en su forma Miximax con Soji Okita. Delantero del Chrono Storm.',
  locked:true,cost:725
},
{
  id:'r214', equipo:'Chrono Storm', nombre:'Fei Rune', original:'Fei Rune',
  sprite:'assets/sprites/r214.png',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:92,pase:86,defensa:75,especial:94,
  hissatsu:['Chut Prehistórica'],tipoTecnica:'tiro',
  desc:'Fei en su forma Miximax con Big. Jugador del Chrono Storm.',
  locked:true,cost:709
},
{
  id:'r215', equipo:'Chrono Storm', nombre:'Ryoma Nishiki', original:'Nishiki Ryoma',
  sprite:'assets/sprites/r215.png',
  posicion:'Centrocampista', tipo:'Montaña',
  tiro:89,pase:91,defensa:74,especial:93,
  hissatsu:['Corriente Negra'],tipoTecnica:'regate',
  desc:'Roma en su forma Miximax con Ryoma Sakamoto. Centrocampista del Chrono Storm.',
  locked:true,cost:693
},
{
  id:'r216', equipo:'Chrono Storm', nombre:'Arion Sherwind', original:'Matsukaze Tenma',
  sprite:'assets/sprites/r216.png',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:91,pase:94,defensa:80,especial:97,
  hissatsu:['Espada Real'],tipoTecnica:'regate',
  desc:'Arion en su forma Miximax con el Rey Arturo. Capitán del Chrono Storm.',
  locked:true,cost:725
},
{
  id:'r217', equipo:'Academia Universal', nombre:'Sol Daystar', original:'Kishibe Taiga',
  sprite:'assets/sprites/r217.png',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:96,pase:88,defensa:71,especial:95,
  hissatsu:['Tormenta Eléctrica'],tipoTecnica:'tiro',
  desc:'Sol en su forma Miximax con Zhuge Liang. Forma del anime y de la versión Fuego.',
  locked:true,cost:709
},
{
  id:'r218', equipo:'Chrono Storm', nombre:'Bailong', original:'Hakuryuu',
  sprite:'assets/sprites/r218.png',
  posicion:'Delantero', tipo:'Viento',
  tiro:99,pase:73,defensa:43,especial:97,
  hissatsu:['Tormenta Eléctrica'],tipoTecnica:'tiro',
  desc:'Bailong en su forma Miximax con Zhuge Liang. Forma correspondiente a la versión Trueno.',
  locked:true,cost:740
},
{
  id:'r219', equipo:'Chrono Storm', nombre:'Zanark Avalonic', original:'Zanark Avalonic',
  sprite:'assets/sprites/r219.png',
  posicion:'Delantero', tipo:'Montaña',
  tiro:100,pase:86,defensa:47,especial:99,
  hissatsu:['Soy Todopoderoso'],tipoTecnica:'tiro',
  desc:'Zanark en su forma Miximax con Huracán Zeta. Uno de los atacantes más poderosos del Chrono Storm.',
  locked:true,cost:756
},
{
  id:'r220', equipo:'Dragon Link', nombre:'Quentin Cinquedea', original:'Senguuji Yamato', sprite:'assets/sprites/r220.webp',
  posicion:'Portero', tipo:'Fuego',
  tiro:42,pase:70,defensa:85,especial:84,
  hissatsu:['Rompetiros'],tipoTecnica:'portero',
  desc:'Capitán y guardameta de Dragon Link, uno de los jugadores más poderosos del Camino Imperial.',
  locked:true,cost:231
},
{
  id:'r221', equipo:'Dragon Link', nombre:'Aimé Quintet', original:'Gomaki Tetsurou', sprite:'assets/sprites/r221.webp',
  posicion:'Defensa', tipo:'Viento',
  tiro:48,pase:73,defensa:82,especial:82,
  hissatsu:['Salto Dimensional'],tipoTecnica:'defensa',
  desc:'Uno de los defensas principales de Dragon Link.',
  locked:true,cost:189
},
{
  id:'r222', equipo:'Dragon Link', nombre:'Erik Pentona', original:'Seijou Shougo', sprite:'assets/sprites/r222.webp',
  posicion:'Delantero', tipo:'Montaña',
  tiro:81,pase:66,defensa:45,especial:79,
  hissatsu:['Remate Dragón'],tipoTecnica:'tiro',
  desc:'Uno de los delanteros principales de Dragon Link.',
  locked:true,cost:200
},
{
  id:'r223', equipo:'Academia Universal', nombre:'Ringo Saturn', original:'Ringo Saturn', sprite:'assets/sprites/r223.webp',
  posicion:'Portero', tipo:'Montaña',
  tiro:31,pase:60,defensa:84,especial:84,
  hissatsu:['Estrella Reflectante'],tipoTecnica:'portero',
  desc:'Jugador destacado del Instituto Universal.',
  locked:true,cost:200
},
{
  id:'r224', equipo:'Instituto Espejismo', nombre:'Harrold Houdini', original:'Harrold Houdini', sprite:'assets/sprites/r224.webp',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:74,pase:85,defensa:70,especial:83,
  hissatsu:['Tiro Espectral'],tipoTecnica:'tiro',
  desc:'Habilidoso jugador del Instituto Espejismo, famoso por sus técnicas de engaño.',
  locked:true,cost:200
},
{
  id:'r225', equipo:'Instituto Espejismo', nombre:'Hocus Sesame', original:'Hocus Sesame', sprite:'assets/sprites/r225.webp',
  posicion:'Centrocampista', tipo:'Fuego',
  tiro:67,pase:76,defensa:72,especial:80,
  hissatsu:['Espejismo'],tipoTecnica:'regate',
  desc:'Jugador del Instituto Espejismo.',
  locked:true,cost:158
},
{
  id:'r226', equipo:'Instituto Espejismo', nombre:'Pocus Sesame', original:'Pocus Sesame', sprite:'assets/sprites/r226.webp',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:77,pase:74,defensa:55,especial:79,
  hissatsu:['Espejismo'],tipoTecnica:'regate',
  desc:'Jugador del Instituto Espejismo.',
  locked:true,cost:158
},
{
  id:'r227', equipo:'Resistencia Japon', nombre:'Doug McArthur', original:'Doug McArthur', sprite:'assets/sprites/r227.webp',
  posicion:'Delantero', tipo:'Viento',
  tiro:79,pase:79,defensa:59,especial:80,
  hissatsu:['Tiro Sónico'],tipoTecnica:'tiro',
  desc:'Delantero destacado del equipo que lucha contra el Imperio.',
  locked:true,cost:184
},
{
  id:'r228', equipo:'Camino Imperial', nombre:'Alessandro ilGrande', original:'Alessandro ilGrande', sprite:'assets/sprites/r228.webp',
  posicion:'Portero', tipo:'Montaña',
  tiro:28,pase:54,defensa:81,especial:81,
  hissatsu:['Barrera de Gaia'],tipoTecnica:'portero',
  desc:'Uno de los grandes porteros del Camino Imperial.',
  locked:true,cost:231
},
{
  id:'r229', equipo:'Zeus', nombre:'Cronus Fourseasons', original:'Cronus Fourseasons', sprite:'assets/sprites/r229.webp',
  posicion:'Centrocampista', tipo:'Fuego',
  tiro:84,pase:81,defensa:70,especial:80,
  hissatsu:['Tiro Balista'],tipoTecnica:'tiro',
  desc:'Jugador estrella del Monte Olimpo y uno de los más importantes del Camino Imperial.',
  locked:true,cost:221
},
{
  id:'r230', equipo:'Zeus', nombre:'Hyperion', original:'Hyperion', sprite:'assets/sprites/r230.webp',
  posicion:'Centrocampista', tipo:'Fuego',
  tiro:83,pase:72,defensa:68,especial:80,
  hissatsu:['Tiro Balista'],tipoTecnica:'tiro',
  desc:'Poderoso delantero asociado al Monte Olimpo.',
  locked:true,cost:210
},
{
  id:'r231', equipo:'Royal Academy GO', nombre:'Dracon Yale', original:'Oji Ryuzaki', sprite:'assets/sprites/r231.webp',
  posicion:'Defensa', tipo:'Viento',
  tiro:66,pase:76,defensa:83,especial:85,
  hissatsu:['Gran Torbellino'],tipoTecnica:'defensa',
  desc:'Defensa de la Royal Academy GO y uno de los Imperiales más completos.',
  locked:true,cost:210
},
{
  id:'r232', equipo:'Royal Academy GO', nombre:'Rex Remington', original:'Rex Remington', sprite:'assets/sprites/r232.webp',
  posicion:'Delantero', tipo:'Montaña',
  tiro:81,pase:70,defensa:60,especial:80,
  hissatsu:['Pinguino Emperador Nº7'],tipoTecnica:'tiro',
  desc:'Capitán de la Royal Academy GO.',
  locked:true,cost:215
},
{
  id:'r233', equipo:'Poderosa Fe', nombre:'Infinity Beyond', original:'Infinity Beyond', sprite:'assets/sprites/r233.webp',
  posicion:'Delantero', tipo:'Fuego',
  tiro:82,pase:70,defensa:40,especial:80,
  hissatsu:['Remate de Gaia'],tipoTecnica:'tiro',
  desc:'Delantero destacado del Colegio Poderosa Fe.',
  locked:true,cost:205
},
{
  id:'r234', equipo:'Poderosa Fe', nombre:'Maxim Millennium', original:'Maxim Millennium', sprite:'assets/sprites/r234.webp',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:80,pase:74,defensa:52,especial:78,
  hissatsu:['Remate Misil'],tipoTecnica:'tiro',
  desc:'Jugador destacado del Colegio Poderosa Fe.',
  locked:true,cost:200
},
{
  id:'r235', equipo:'Cala Pirata', nombre:'Octavus Kraken', original:'Octavus Kraken', sprite:'assets/sprites/r235.webp',
  posicion:'Defensa', tipo:'Fuego',
  tiro:32,pase:67,defensa:81,especial:82,
  hissatsu:['Bloqueo Ballena'],tipoTecnica:'defensa',
  desc:'Defensa de la Academia Cala Pirata.',
  locked:true,cost:189
},
{
  id:'r236', equipo:'Kirkwood', nombre:'Bay Laurel', original:'Bay Laurel', sprite:'assets/sprites/r236.webp',
  posicion:'Centrocampista', tipo:'Montaña',
  tiro:73,pase:82,defensa:80,especial:80,
  hissatsu:['Espejismo de balón'],tipoTecnica:'regate',
  desc:'Uno de los hermanos Ash, jugador destacado del Kirkwood.',
  locked:true,cost:184
},
{
  id:'r237', equipo:'Kirkwood', nombre:'Langford Ash', original:'Langford Ash', sprite:'assets/sprites/r237.webp',
  posicion:'Centrocampista', tipo:'Montaña',
  tiro:74,pase:70,defensa:70,especial:78,
  hissatsu:['Tiro Balista'],tipoTecnica:'tiro',
  desc:'Hermano de Bay Laurel y jugador del Kirkwood.',
  locked:true,cost:173
},
{
  id:'r238', equipo:'Kirkwood', nombre:'Bradford Ash', original:'Bradford Ash', sprite:'assets/sprites/r238.webp',
  posicion:'Delantero', tipo:'Montaña',
  tiro:80,pase:75,defensa:43,especial:84,
  hissatsu:['Tiro Balista'],tipoTecnica:'tiro',
  desc:'Hermano de Bay Laurel y Langford Ash.',
  locked:true,cost:194
},
{
  id:'r239', equipo:'Eclipse de Orión', nombre:'Jade Beor', original:'Yurika Beor', sprite:'assets/sprites/r239.webp',
  posicion:'Delantero', tipo:'Bosque',
  tiro:88,pase:82,defensa:42,especial:85,
  hissatsu:['Sombra de Orión'],tipoTecnica:'tiro',
  desc:'Capitana de La Sombra de Orión y una de las armas más poderosas de la Fundación Orión.',
  locked:true,cost:225
},
{
  id:'r240', equipo:'Eclipse de Orión', nombre:'Betelgeuse', original:'Betelgeuse', sprite:'assets/sprites/r240.webp',
  posicion:'Delantero', tipo:'Fuego',
  tiro:82,pase:70,defensa:40,especial:83,
  hissatsu:['Sombra de Orión'],tipoTecnica:'tiro',
  desc:'Uno de los principales delanteros de Eclipse de Orión, considerado inferior únicamente a Jade.',
  locked:true,cost:215
},
{
  id:'r241', equipo:'Eclipse de Orión', nombre:'Procyon', original:'Procyon', sprite:'assets/sprites/r241.webp',
  posicion:'Portero', tipo:'Bosque',
  tiro:51,pase:78,defensa:84,especial:84,
  hissatsu:['Escudo sombrío'],tipoTecnica:'portero',
  desc:'Uno de los miembros principales de Eclipse de Orión y Discípulo de Orión.',
  locked:true,cost:195
},
{
  id:'r242', equipo:'Alius Masters', nombre:'Xavier Schiller', original:'Kira Hiroto', sprite:'assets/sprites/r242.webp',
  posicion:'Delantero', tipo:'Bosque',
  tiro:86,pase:78,defensa:40,especial:85,
  hissatsu:['Explosión'],tipoTecnica:'tiro',
  desc:'Delantero de Ares con un enorme talento goleador.',
  locked:true,cost:225
},
{
  id:'r243', equipo:'Zeus', nombre:'Perseo', original:'Percy Hurst', sprite:'assets/sprites/r243.webp',
  posicion:'Delantero', tipo:'Fuego',
  tiro:82,pase:76,defensa:42,especial:81,
  hissatsu:['Tijera Celestial'],tipoTecnica:'tiro',
  desc:'Delantero del Instituto Zeus en la línea temporal de Ares.',
  locked:true,cost:175
},
{
  id:'r244', equipo:'Emperadores Oscuros', nombre:'Scotty Osc.', original:'Kogure Yuya', posicion:'Defensa', tipo:'Bosque',
  tiro:52,pase:78,defensa:86,especial:88,
  hissatsu:['Campo Torbellino V2'],tipoTecnica:'defensa',
  desc:'Defensa del Raimon, famoso por su velocidad, agilidad y su peculiar sentido del humor.',
  locked:true,cost:560,
  sprite:'assets/sprites/r244.webp'
},
{
  id:'r245', equipo:'Emperadores Oscuros', nombre:'Dvalin Osc.', original:'Dvalin', posicion:'Delantero', tipo:'Fuego',
  tiro:89,pase:80,defensa:53,especial:85,
  hissatsu:['Lanza de Odín V2'],tipoTecnica:'tiro',
  desc:'Versión oscura de Dvalin, uno de los jugadores más poderosos del Épsilon.',
  locked:true,cost:630,
  sprite:'assets/sprites/r245.webp'
},
{
  id:'r246', equipo:'Emperadores Oscuros', nombre:'Zell Osc.', original:'Zell', posicion:'Portero', tipo:'Fuego',
  tiro:55,pase:56,defensa:84,especial:86,
  hissatsu:['Agujero de Gusano V2'],tipoTecnica:'portero',
  desc:'Versión oscura de Zell, poderoso delantero del Épsilon.',
  locked:true,cost:630,
  sprite:'assets/sprites/r246.webp'
},
{
  id:'r247', equipo:'Emperadores Oscuros', nombre:'Thomas Feldt Osc.', original:'Sugimori Takeshi',
  posicion:'Portero', tipo:'Bosque',
  tiro:32,pase:55,defensa:84,especial:88,
  hissatsu:['Puño Cohete'],tipoTecnica:'portero',
  desc:'Guardameta de los Emperadores Oscuros y antiguo jugador del Instituto Brain.',
  locked:true,cost:380,
  sprite:'assets/sprites/r247.png'
},
{
  id:'r248', equipo:'Emperadores Oscuros', nombre:'Malcolm Night Osc.', original:'Nishigaki Mamoru',
  posicion:'Defensa', tipo:'Fuego',
  tiro:40,pase:78,defensa:85,especial:77,
  hissatsu:['Corte Giratorio'],tipoTecnica:'defensa',
  desc:'Defensa de los Emperadores Oscuros y antiguo jugador de Kirkwood.',
  locked:true,cost:350,
  sprite:'assets/sprites/r248.png'
},
{
  id:'r249', equipo:'Emperadores Oscuros', nombre:'Shadow Osc.', original:'Yamino Kageto',
  posicion:'Delantero', tipo:'Bosque',
  tiro:87,pase:80,defensa:40,especial:88,
  hissatsu:['Tornado Oscuro'],tipoTecnica:'tiro',
  desc:'Poderoso delantero de los Emperadores Oscuros, nacido de la oscuridad.',
  locked:true,cost:400,
  sprite:'assets/sprites/r249.png'
},
{
  id:'r250', equipo:'Emperadores Oscuros', nombre:'Jim Wraith Osc.', original:'Kageno Jin',
  posicion:'Defensa', tipo:'Bosque',
  tiro:42,pase:77,defensa:84,especial:76,
  hissatsu:['Doppelgänger'],tipoTecnica:'defensa',
  desc:'Defensa de los Emperadores Oscuros y antiguo jugador del Raimon.',
  locked:true,cost:330,
  sprite:'assets/sprites/r250.png'
},
{
  id:'r251', equipo:'Emperadores Oscuros', nombre:'Tod Ironside Osc.', original:'Kurimatsu Teppei',
  posicion:'Defensa', tipo:'Fuego',
  tiro:50,pase:78,defensa:84,especial:80,
  hissatsu:['Cometa'],tipoTecnica:'defensa',
  desc:'Defensa del Raimon convertido en miembro de los Emperadores Oscuros.',
  locked:true,cost:320,
  sprite:'assets/sprites/r251.png'
},
{
  id:'r252', equipo:'Emperadores Oscuros', nombre:'Steve Grim Osc.', original:'Handa Shinichi',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:80,pase:80,defensa:75,especial:71,
  hissatsu:['Remate en V'],tipoTecnica:'tiro',
  desc:'Centrocampista equilibrado del Raimon que forma parte de los Emperadores Oscuros.',
  locked:true,cost:300,
  sprite:'assets/sprites/r252.png'
},
{
  id:'r253', equipo:'Emperadores Oscuros', nombre:'Tim Saunders Osc.', original:'Shourinji Ayumu',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:70,pase:75,defensa:84,especial:85,
  hissatsu:['Cometa'],tipoTecnica:'defensa',
  desc:'Centrocampista del Raimon convertido en miembro de los Emperadores Oscuros.',
  locked:true,cost:290,
  sprite:'assets/sprites/r253.png'
},
{
  id:'r254', equipo:'Emperadores Oscuros', nombre:'Sam Kincaid Osc.', original:'Shishidou Sakichi',
  posicion:'Defensa', tipo:'Bosque',
  tiro:55,pase:73,defensa:87,especial:85,
  hissatsu:['Estrella Fugaz'],tipoTecnica:'defensa',
  desc:'Jugador del Raimon que forma parte de los Emperadores Oscuros.',
  locked:true,cost:290,
  sprite:'assets/sprites/r254.png'
},
{
  id:'r255', equipo:'Emperadores Oscuros', nombre:'Maxwell Carson Osc.', original:'Matsuno Kuusuke',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:78,pase:84,defensa:76,especial:85,
  hissatsu:['Remate en V'],tipoTecnica:'tiro',
  desc:'Centrocampista ofensivo de los Emperadores Oscuros, famoso por su velocidad.',
  locked:true,cost:310,
  sprite:'assets/sprites/r255.png'
},
{
  id:'r256', equipo:'Emperadores Oscuros', nombre:'Nathan Swift Osc.', original:'Kazemaru Ichirouta',
  posicion:'Delantero', tipo:'Viento',
  tiro:85,pase:86,defensa:51,especial:88,
  hissatsu:['Fénix Oscuro'],tipoTecnica:'tiro',
  desc:'Capitán de los Emperadores Oscuros, dotado de una velocidad extraordinaria.',
  locked:true,cost:410,
  sprite:'assets/sprites/r256.png'
},
{
  id:'r257', equipo:'Emperadores Oscuros', nombre:'Kevin Dragonfly Osc.', original:'Someoka Ryuugo',
  posicion:'Delantero', tipo:'Bosque',
  tiro:88,pase:80,defensa:45,especial:85,
  hissatsu:['Remate Guiverno'],tipoTecnica:'tiro',
  desc:'Potente delantero de los Emperadores Oscuros y antiguo miembro del Raimon.',
  locked:true,cost:410,
  sprite:'assets/sprites/r257.png'
},
{
  id:'r258', equipo:'Los Cuatro Magníficos', nombre:'George Winters', original:'Fuyuki Genbu', posicion:'Delantero', tipo:'Bosque',
  tiro:85,pase:72,defensa:42,especial:88,
  hissatsu:['Fénix oscuro'],tipoTecnica:'tiro',
  desc:'Uno de los Cuatro Magníficos. Delantero de elemento Bosque conocido por su gran potencia ofensiva.',
  locked:true,cost:420,
  sprite:'assets/sprites/r258.webp'
},

{
  id:'r259', equipo:'Los Cuatro Magníficos', nombre:'Alan Sumner', original:'Ryuu Suzuno', posicion:'Defensa', tipo:'Montaña',
  tiro:52,pase:76,defensa:83,especial:86,
  hissatsu:['Cinto astral'],tipoTecnica:'defensa',
  desc:'Uno de los Cuatro Magníficos. Defensa de enorme solidez que destaca por su capacidad para frenar los ataques rivales.',
  locked:true,cost:410,
  sprite:'assets/sprites/r259.webp'
},

{
  id:'r260', equipo:'Los Cuatro Magníficos', nombre:'Verne Spring', original:'Shuu Seiryuu',
  posicion:'Centrocampista', tipo:'Fuego',
  tiro:82,pase:89,defensa:67,especial:88,
  hissatsu:['Cañón dragón'],tipoTecnica:'tiro',
  desc:'Uno de los Cuatro Magníficos. Centrocampista de elemento Fuego con gran talento para organizar el juego y lanzar potentes tiros.',
  locked:true,cost:420,
  sprite:'assets/sprites/r260.jpg'
},

{
  id:'r261', equipo:'Los Cuatro Magníficos', nombre:'Ted Autumn', original:'Akihito Byakko', posicion:'Portero', tipo:'Viento',
  tiro:38,pase:61,defensa:85,especial:83,
  hissatsu:['Manos infinitas'],tipoTecnica:'portero',
  desc:'Uno de los Cuatro Magníficos. Portero de gran nivel famoso por sus extraordinarias técnicas de parada.',
  locked:true,cost:430,
  sprite:'assets/sprites/r261.webp'
},

{
  id:'r262', equipo:'Los Cuatro Magníficos', nombre:'Bernadette Stoker', original:'Karen Toga',
  posicion:'Delantero', tipo:'Fuego',
  tiro:86,pase:75,defensa:44,especial:89,
  hissatsu:['Remate Pegaso'],tipoTecnica:'tiro',
  desc:'Capitana de Los Cuatro Magníficos y una de las delanteras más peligrosas del equipo.',
  locked:true,cost:430,
  sprite:'assets/sprites/r262.png'
},
{
  id:'r263', equipo:'Tarjeteros', nombre:'Clay Ellement', original:'Clay Ellement', posicion:'Centrocampista', tipo:'Montaña',
  tiro:68,pase:70,defensa:62,especial:66,
  hissatsu:['Escáner Defensa'],tipoTecnica:'defensa',
  desc:'Centrocampista de Tarjeteros, tranquilo y con un estilo de juego inteligente.',
  locked:false,
  sprite:'assets/sprites/r263.webp'
},
{
  id:'r264', equipo:'Tarjeteros', nombre:'Gail Ellement', original:'Gail Ellement', posicion:'Defensa', tipo:'Viento',
  tiro:42,pase:66,defensa:70,especial:70,
  hissatsu:['Escaner Defensa'],tipoTecnica:'defensa',
  desc:'Defensa de Tarjeteros muy rápido y difícil de alcanzar.',
  locked:false,
  sprite:'assets/sprites/r264.webp'
},
{
  id:'r265', equipo:'Tarjeteros', nombre:'Bernie Ellement', original:'Bernie Ellement', posicion:'Delantero', tipo:'Fuego',
  tiro:74,pase:68,defensa:40,especial:69,
  hissatsu:['Cañón Dragón'],tipoTecnica:'tiro',
  desc:'Delantero de Tarjeteros apasionado y especializado en el juego ofensivo.',
  locked:false,
  sprite:'assets/sprites/r265.webp'
},
{
  id:'r266', equipo:'Tarjeteros', nombre:'Chucky Cardaway', original:'Chucky Cardaway', posicion:'Delantero', tipo:'Fuego',
  tiro:72,pase:70,defensa:43,especial:65,
  hissatsu:['Carta-Ataque'],tipoTecnica:'regate',
  desc:'Delantero de Tarjeteros de aspecto intimidante que busca a su hermano gemelo.',
  locked:false,
  sprite:'assets/sprites/r266.webp'
},
{
  id:'r267', equipo:'Tarjeteros', nombre:'Woody Ellement', original:'Woody Ellement', posicion:'Defensa', tipo:'Bosque',
  tiro:40,pase:69,defensa:67,especial:68,
  hissatsu:['Descodificación'],tipoTecnica:'regate',
  desc:'Defensa de Tarjeteros rodeado de un aura enigmática y experto en tácticas ilusorias.',
  locked:false,
  sprite:'assets/sprites/r267.webp'
},
{
  id:'r268', equipo:'Tarjeteros', nombre:'Lucien Rarey', original:'Lucien Rarey', posicion:'Centrocampista', tipo:'Viento',
  tiro:61,pase:64,defensa:65,especial:70,
  hissatsu:['Tiro Cegador'],tipoTecnica:'tiro',
  desc:'Centrocampista de Tarjeteros con una presencia llamativa y brillante.',
  locked:false,
  sprite:'assets/sprites/r268.webp'
},
{
  id:'r269', equipo:'Tarjeteros', nombre:'Stackem Skyhigh', original:'Stackem Skyhigh', posicion:'Delantero', tipo:'Fuego',
  tiro:70,pase:65,defensa:42,especial:68,
  hissatsu:['Tornado de Fuego'],tipoTecnica:'tiro',
  desc:'Delantero de Tarjeteros de gran presencia y apasionado por el fútbol.',
  locked:false,
  sprite:'assets/sprites/r269.webp'
},
{
  id:'r270', equipo:'Tarjeteros', nombre:'Deck', original:'Deck', posicion:'Portero', tipo:'Viento',
  tiro:43,pase:56,defensa:72,especial:64,
  hissatsu:['Mandril'],tipoTecnica:'portero',
  desc:'Portero de Tarjeteros en Inazuma Eleven 3.',
  locked:false,
  sprite:'assets/sprites/r270.webp'
},
{
  id:'r271', equipo:'Tarjeteros', nombre:'Cardson', original:'Cardson', posicion:'Defensa', tipo:'Fuego',
  tiro:55,pase:64,defensa:71,especial:67,
  hissatsu:['Pisotón de sumo'],tipoTecnica:'defensa',
  desc:'Defensa de Tarjeteros en Inazuma Eleven 3.',
  locked:false,
  sprite:'assets/sprites/r271.webp'
},
{
  id:'r272', equipo:'Tarjeteros', nombre:'Binder', original:'Binder', posicion:'Centrocampista', tipo:'Fuego',
  tiro:66,pase:69,defensa:69,especial:65,
  hissatsu:['Ataque afilado'],tipoTecnica:'defensa',
  desc:'Centrocampista de Tarjeteros en Inazuma Eleven 3.',
  locked:false,
  sprite:'assets/sprites/r272.webp'
},
{
  id:'r273', equipo:'Neo Raimon', nombre:'Nev Erin', original:'Arashi Rokko', posicion:'Delantero', tipo:'Viento',
  tiro:78,pase:62,defensa:38,especial:70,
  hissatsu:['Tornado Oscuro'],tipoTecnica:'tiro',
  desc:'Un delantero veloz que juega con gran energía incluso en los días más fríos.',
  locked:false,cost:18,
  sprite:'assets/sprites/r273.webp'
},
{
  id:'r274', equipo:'Neo Raimon', nombre:'Christian Dear', original:'Shintaro Takasugi', posicion:'Defensa', tipo:'Bosque',
  tiro:48,pase:58,defensa:67,especial:55,
  hissatsu:['Corte Giratorio'],tipoTecnica:'defensa',
  desc:'Un defensa de Raimon al que le encantan las novedades.',
  locked:false,cost:17,
  sprite:'assets/sprites/r274.webp'
},
{
  id:'r275', equipo:'Neo Raimon', nombre:'Beau Fort', original:'Sho Kazakiri', posicion:'Defensa', tipo:'Viento',
  tiro:45,pase:65,defensa:69,especial:58,
  hissatsu:['Ciclón'],tipoTecnica:'defensa',
  desc:'Un defensa aficionado al ciclismo que se deja llevar por el viento.',
  locked:false,cost:17,
  sprite:'assets/sprites/r275.webp'
},
{
  id:'r276', equipo:'Neo Raimon', nombre:'Alfie Fine', original:'Genki Mouri', posicion:'Portero', tipo:'Bosque',
  tiro:25,pase:42,defensa:68,especial:69,
  hissatsu:['Campo de Fuerza'],tipoTecnica:'portero',
  desc:'Un portero que destaca por sus técnicas defensivas.',
  locked:false,cost:16,
  sprite:'assets/sprites/r276.webp'
},
{
  id:'r277', equipo:'Neo Raimon', nombre:'Billy Blanc', original:'Shiroshi Billy', posicion:'Centrocampista', tipo:'Viento',
  tiro:51,pase:65,defensa:43,especial:57,
  hissatsu:['Acelerón'],tipoTecnica:'regate',
  desc:'Un jugador ligero que destaca por su movilidad.',
  locked:false,cost:15,
  sprite:'assets/sprites/r277.webp'
},
{
  id:'r278', equipo:'Neo Raimon', nombre:'Slim Lanky', original:'Ko Hosoi', posicion:'Portero', tipo:'Viento',
  tiro:22,pase:45,defensa:52,especial:66,
  hissatsu:['Puño Explosivo'],tipoTecnica:'portero',
  desc:'Un portero extremadamente alto y delgado.',
  locked:false,cost:16,
  sprite:'assets/sprites/r278.webp'
},
{
  id:'r279', equipo:'Neo Raimon', nombre:'Fane Club', original:'Club', posicion:'Portero', tipo:'Viento',
  tiro:20,pase:43,defensa:60,especial:63,
  hissatsu:['Despeje a Presión'],tipoTecnica:'portero',
  desc:'Un aspirante a estrella del fútbol que idolatra a los grandes jugadores.',
  locked:false,cost:15,
  sprite:'assets/sprites/r279.webp'
},
{
  id:'r280', equipo:'Neo Raimon', nombre:'Dan Dandy', original:'Dando Dan', posicion:'Defensa', tipo:'Viento',
  tiro:49,pase:55,defensa:64,especial:61,
  hissatsu:['Ataque Afilado'],tipoTecnica:'defensa',
  desc:'Un atleta especializado en salto de altura capaz de elevarse como un cohete.',
  locked:false,cost:17,
  sprite:'assets/sprites/r280.webp'
},
{
  id:'r281', equipo:'Neo Raimon', nombre:'Don Keys', original:'Keys', posicion:'Delantero', tipo:'Fuego',
  tiro:69,pase:58,defensa:32,especial:58,
  hissatsu:['Tiro Giratorio'],tipoTecnica:'tiro',
  desc:'Un delantero de gran potencia ofensiva.',
  locked:false,cost:16,
  sprite:'assets/sprites/r281.webp'
},
{
  id:'r282', equipo:'Neo Raimon', nombre:'Marv Errick', original:'Errick', posicion:'Centrocampista', tipo:'Bosque',
  tiro:48,pase:63,defensa:45,especial:54,
  hissatsu:['Pase Cruzado'],tipoTecnica:'tiro',
  desc:'Un jugador equilibrado que ayuda a conectar el centro del campo.',
  locked:false,cost:15,
  sprite:'assets/sprites/r282.webp'
},
{
  id:'r283', equipo:'Neo Raimon', nombre:'Tony Hacker', original:'Hacker', posicion:'Centrocampista', tipo:'Viento',
  tiro:50,pase:66,defensa:42,especial:59,
  hissatsu:['Regate Aurora'],tipoTecnica:'regate',
  desc:'Un centrocampista hábil capaz de encontrar espacios entre los rivales.',
  locked:false,cost:16,
  sprite:'assets/sprites/r283.webp'
},
{
  id:'r284', equipo:'Neo Raimon', nombre:'Iggy Loyaller', original:'Loyaller', posicion:'Delantero', tipo:'Bosque',
  tiro:67,pase:50,defensa:35,especial:55,
  hissatsu:['Remate Giratorio'],tipoTecnica:'tiro',
  desc:'Un delantero fiel a su equipo y siempre dispuesto a luchar.',
  locked:false,cost:16,
  sprite:'assets/sprites/r284.webp'
},
{
  id:'r285', equipo:'Neo Raimon', nombre:'Alan Mode', original:'Mode', posicion:'Centrocampista', tipo:'Viento',
  tiro:46,pase:64,defensa:44,especial:56,
  hissatsu:['Regate Engañoso'],tipoTecnica:'regate',
  desc:'Un jugador técnico que busca superar a sus rivales con habilidad.',
  locked:false,cost:15,
  sprite:'assets/sprites/r285.webp'
},
{
  id:'r286', equipo:'Neo Raimon', nombre:'Bill Moony', original:'Moony', posicion:'Delantero', tipo:'Viento',
  tiro:64,pase:53,defensa:34,especial:60,
  hissatsu:['Acelerón'],tipoTecnica:'regate',
  desc:'Un delantero rápido que aprovecha su velocidad para atacar.',
  locked:false,cost:16,
  sprite:'assets/sprites/r286.webp'
},
{
  id:'r287', equipo:'Neo Raimon', nombre:"Vinny O'Gaines", original:"O'Gaines",
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:52,pase:61,defensa:47,especial:53,
  hissatsu:['Pase Cruzado'],tipoTecnica:'tiro',
  desc:'Un centrocampista trabajador y equilibrado.',
  locked:false,cost:15,
  sprite:'assets/sprites/r287.webp'
},
{
  id:'r288', equipo:'Neo Raimon', nombre:'Joe Rassock', original:'Rassock', posicion:'Defensa', tipo:'Montaña',
  tiro:38,pase:51,defensa:67,especial:52,
  hissatsu:['Barrido Defensivo'],tipoTecnica:'defensa',
  desc:'Un defensa físico especializado en recuperar balones.',
  locked:false,cost:16,
  sprite:'assets/sprites/r288.webp'
},
{
  id:'r289', equipo:'Neo Raimon', nombre:'Dan Rhino', original:'Rhino',
  posicion:'Defensa', tipo:'Montaña',
  tiro:42,pase:48,defensa:70,especial:55,
  hissatsu:['Ataque Afilado'],tipoTecnica:'defensa',
  desc:'Un defensa fuerte que utiliza su físico para detener los ataques.',
  locked:false,cost:17,
  sprite:'assets/sprites/r289.webp'
},
{
  id:'r290', equipo:'Neo Raimon', nombre:'Roger Rocket', original:'Rocket',
  posicion:'Defensa', tipo:'Viento',
  tiro:43,pase:55,defensa:65,especial:59,
  hissatsu:['Corte Giratorio'],tipoTecnica:'defensa',
  desc:'Un defensa rápido que puede incorporarse con velocidad.',
  locked:false,cost:17,
  sprite:'assets/sprites/r290.webp'
},
{
  id:'r291', equipo:'Neo Raimon', nombre:'Phil Rosey', original:'Rosey',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:49,pase:62,defensa:43,especial:55,
  hissatsu:['Pase Cruzado'],tipoTecnica:'tiro',
  desc:'Un centrocampista que mantiene el juego en movimiento.',
  locked:false,cost:15,
  sprite:'assets/sprites/r291.webp'
},
{
  id:'r292', equipo:'Neo Raimon', nombre:'Ringo Stagg', original:'Stagg', posicion:'Delantero', tipo:'Montaña',
  tiro:68,pase:47,defensa:36,especial:56,
  hissatsu:['Remate Giratorio'],tipoTecnica:'tiro',
  desc:'Un delantero potente que busca finalizar las jugadas.',
  locked:false,cost:16,
  sprite:'assets/sprites/r292.webp'
},
{
  id:'r293', equipo:'Neo Raimon', nombre:'Joe Straiter', original:'Straiter',
  posicion:'Defensa', tipo:'Bosque',
  tiro:40,pase:54,defensa:64,especial:51,
  hissatsu:['Corte Giratorio'],tipoTecnica:'defensa',
  desc:'Un defensa disciplinado que mantiene su posición.',
  locked:false,cost:15,
  sprite:'assets/sprites/r293.webp'
},
{
  id:'r294', equipo:'Neo Raimon', nombre:'Barry Straw', original:'Straw',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:47,pase:60,defensa:42,especial:53,
  hissatsu:['Acelerón'],tipoTecnica:'regate',
  desc:'Un jugador ágil que ayuda a mover el balón rápidamente.',
  locked:false,cost:15,
  sprite:'assets/sprites/r294.webp'
},
{
  id:'r295', equipo:'Neo Raimon', nombre:'Ifan Tassy', original:'Tassy',
  posicion:'Delantero', tipo:'Bosque',
  tiro:63,pase:52,defensa:34,especial:57,
  hissatsu:['Regate Aurora'],tipoTecnica:'regate',
  desc:'Un delantero técnico con recursos para superar defensas.',
  locked:false,cost:15,
  sprite:'assets/sprites/r295.webp'
},
{
  id:'r296', equipo:'Neo Raimon', nombre:'Bill Teller', original:'Teller', posicion:'Defensa', tipo:'Bosque',
  tiro:39,pase:56,defensa:66,especial:54,
  hissatsu:['Barrido Defensivo'],tipoTecnica:'defensa',
  desc:'Un defensa de estilo sólido y trabajador.',
  locked:false,cost:16,
  sprite:'assets/sprites/r296.webp'
},
{
  id:'r297', equipo:'Neo Raimon', nombre:'Tim Toppel', original:'Toppel', posicion:'Portero', tipo:'Bosque',
  tiro:23,pase:45,defensa:50,especial:64,
  hissatsu:['Ultratécnica'],tipoTecnica:'tiro',
  desc:'Un portero pequeño pero capaz de sorprender a jugadores más grandes.',
  locked:false,cost:16,
  sprite:'assets/sprites/r297.webp'
},
{
  id:'r298', equipo:'Neo Raimon', nombre:'Stan Trum', original:'Trum',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:50,pase:62,defensa:44,especial:54,
  hissatsu:['Regate Engañoso'],tipoTecnica:'regate',
  desc:'Un centrocampista equilibrado con buen control del balón.',
  locked:false,cost:15,
  sprite:'assets/sprites/r298.webp'
},
{
  id:'r299', equipo:'Neo Raimon', nombre:'Doug Walker', original:'Walker',
  posicion:'Portero', tipo:'Montaña',
  tiro:21,pase:42,defensa:54,especial:67,
  hissatsu:['Puño Explosivo'],tipoTecnica:'portero',
  desc:'Un portero robusto que utiliza su fuerza para detener disparos.',
  locked:false,cost:17,
  sprite:'assets/sprites/r299.webp'
},
{
  id:'r300', equipo:'Neo Raimon', nombre:'Rob Anchor', original:'Anchor',
  posicion:'Defensa', tipo:'Montaña',
  tiro:38,pase:49,defensa:69,especial:55,
  hissatsu:['Bloqueo'],tipoTecnica:'defensa',
  desc:'Un defensa sólido que actúa como un ancla para su equipo.',
  locked:false,cost:16,
  sprite:'assets/sprites/r300.webp'
},
{
  id:'r301', equipo:'Neo Raimon', nombre:'Lou Beigh', original:'Beigh', posicion:'Centrocampista', tipo:'Viento',
  tiro:46,pase:61,defensa:45,especial:57,
  hissatsu:['Ciclón'],tipoTecnica:'defensa',
  desc:'Un jugador técnico que se mueve con agilidad.',
  locked:false,cost:15,
  sprite:'assets/sprites/r301.webp'
},
{
  id:'r302', equipo:'Neo Raimon', nombre:'Eggbert Heading', original:'Heading',
  posicion:'Defensa', tipo:'Montaña',
  tiro:43,pase:48,defensa:67,especial:52,
  hissatsu:['Cabeza Defensiva'],tipoTecnica:'defensa',
  desc:'Un defensa fuerte en el juego aéreo.',
  locked:false,cost:16,
  sprite:'assets/sprites/r302.webp'
},
{
  id:'r303', equipo:'Neo Raimon', nombre:'Ace Irvin', original:'Irvin', posicion:'Delantero', tipo:'Viento',
  tiro:70,pase:52,defensa:34,especial:62,
  hissatsu:['Tornado Oscuro'],tipoTecnica:'tiro',
  desc:'Un delantero veloz que busca abrir huecos en la defensa.',
  locked:false,cost:17,
  sprite:'assets/sprites/r303.webp'
},
{
  id:'r304', equipo:'Neo Raimon', nombre:'Hal Mullet', original:'Mullet',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:48,pase:60,defensa:46,especial:53,
  hissatsu:['Pase Cruzado'],tipoTecnica:'tiro',
  desc:'Un centrocampista versátil que ayuda tanto en ataque como en defensa.',
  locked:false,cost:15,
  sprite:'assets/sprites/r304.webp'
},
{
  id:'r305', equipo:'Neo Raimon', nombre:'Bobby Peel', original:'Peel', posicion:'Defensa', tipo:'Viento',
  tiro:41,pase:53,defensa:63,especial:55,
  hissatsu:['Robo Rápido'],tipoTecnica:'defensa',
  desc:'Un defensa ágil especializado en robar el balón.',
  locked:false,cost:15,
  sprite:'assets/sprites/r305.webp'
},
{
  id:'r306', equipo:'Neo Raimon', nombre:'Spike Pitt', original:'Pitt', posicion:'Delantero', tipo:'Fuego',
  tiro:67,pase:48,defensa:35,especial:57,
  hissatsu:['Carga Explosiva'],tipoTecnica:'tiro',
  desc:'Un delantero agresivo que apuesta por la potencia.',
  locked:false,cost:16,
  sprite:'assets/sprites/r306.webp'
},
{
  id:'r307', equipo:'Neo Raimon', nombre:'Dex Territy', original:'Territy', posicion:'Defensa', tipo:'Montaña',
  tiro:40,pase:50,defensa:68,especial:54,
  hissatsu:['Barrido Defensivo'],tipoTecnica:'defensa',
  desc:'Un defensa resistente que dificulta el avance rival.',
  locked:false,cost:16,
  sprite:'assets/sprites/r307.webp'
},
{
  id:'r308', equipo:'Neo Raimon', nombre:'Buster Chopps', original:'Chopps', posicion:'Delantero', tipo:'Montaña',
  tiro:71,pase:45,defensa:37,especial:58,
  hissatsu:['Remate Poderoso'],tipoTecnica:'tiro',
  desc:'Un delantero que confía en su potencia física para disparar.',
  locked:false,cost:17,
  sprite:'assets/sprites/r308.webp'
},
{
  id:'r309', equipo:'Neo Raimon', nombre:'Creed Caving', original:'Caving',
  posicion:'Defensa', tipo:'Bosque',
  tiro:39,pase:55,defensa:65,especial:52,
  hissatsu:['Corte Giratorio'],tipoTecnica:'defensa',
  desc:'Un defensa disciplinado que busca cortar las jugadas rivales.',
  locked:false,cost:15,
  sprite:'assets/sprites/r309.webp'
},
{
  id:'r310', equipo:'Neo Raimon', nombre:'Lon Grainger', original:'Grainger',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:51,pase:63,defensa:43,especial:56,
  hissatsu:['Regate Aurora'],tipoTecnica:'regate',
  desc:'Un centrocampista rápido con buen manejo del balón.',
  locked:false,cost:16,
  sprite:'assets/sprites/r310.webp'
},
{
  id:'r311', equipo:'Neo Raimon', nombre:'Vin Fleetwood', original:'Fleetwood', posicion:'Delantero', tipo:'Viento',
  tiro:66,pase:50,defensa:34,especial:60,
  hissatsu:['Acelerón'],tipoTecnica:'regate',
  desc:'Un delantero veloz que busca atacar los espacios.',
  locked:false,cost:16,
  sprite:'assets/sprites/r311.webp'
},
{
  id:'r312', equipo:'Neo Raimon', nombre:'Samuel Peeps', original:'Peeps',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:47,pase:64,defensa:45,especial:54,
  hissatsu:['Pase Cruzado'],tipoTecnica:'tiro',
  desc:'Un centrocampista centrado en distribuir el balón.',
  locked:false,cost:15,
  sprite:'assets/sprites/r312.webp'
},
{
  id:'r313', equipo:'Neo Raimon', nombre:'Edward Albion', original:'Albion', posicion:'Portero', tipo:'Montaña',
  tiro:24,pase:43,defensa:53,especial:68,
  hissatsu:['Puño Explosivo'],tipoTecnica:'portero',
  desc:'Un portero de gran fortaleza física.',
  locked:false,cost:17,
  sprite:'assets/sprites/r313.webp'
},
{
  id:'r314', equipo:'Neo Raimon', nombre:'Chunk Gorman', original:'Gorman', posicion:'Delantero', tipo:'Montaña',
  tiro:76,pase:45,defensa:37,especial:61,
  hissatsu:['Remate Poderoso'],tipoTecnica:'tiro',
  desc:'Un delantero corpulento al que le encanta comer grandes cantidades de arroz.',
  locked:false,cost:18,
  sprite:'assets/sprites/r314.webp'
},
{
  id:'r315', equipo:'Neo Raimon', nombre:'Ace Server', original:'Buruto Uin', posicion:'Portero', tipo:'Viento',
  tiro:24,pase:49,defensa:55,especial:72,
  hissatsu:['Puño Explosivo'],tipoTecnica:'portero',
  desc:'Un prodigio del tenis que destaca también bajo los palos.',
  locked:false,cost:18,
  sprite:'assets/sprites/r315.webp'
},
{
  id:'r316', equipo:'Neo Raimon', nombre:'Rush', original:'Kaito Kakki', posicion:'Centrocampista', tipo:'Bosque',
  tiro:54,pase:68,defensa:43,especial:64,
  hissatsu:['Regate Aurora'],tipoTecnica:'regate',
  desc:'Conocido como el relámpago púrpura, supera rivales gracias a su velocidad.',
  locked:false,cost:18,
  sprite:'assets/sprites/r316.webp'
},
{
  id:'r317', equipo:'Neo Raimon', nombre:'Joe Chugger', original:'Joe Chugger', posicion:'Defensa', tipo:'Fuego',
  tiro:54,pase:68,defensa:69,especial:64,
  hissatsu:['Baile de Llamas'],tipoTecnica:'defensa',
  desc:'Si no se toma un café antes del partido, no logra concentrarse.',
  locked:false,cost:18,
  sprite:'assets/sprites/r317.webp'
},
{
  id:'r318', equipo:'Neo Raimon', nombre:'Mat Halled', original:'Mat Halled',
  posicion:'Defensa', tipo:'Fuego',
  tiro:48,pase:68,defensa:73,especial:70,
  hissatsu:['Cortafuegos'],tipoTecnica:'defensa',
  desc:'Su cinta parece que le da poder.',
  locked:false,cost:18,
  sprite:'assets/sprites/r318.png'
},
{
  id:'r319', equipo:'Neo Raimon', nombre:'Monarch Rome', original:'Monarch Rome', posicion:'Defensa', tipo:'Viento',
  tiro:45,pase:72,defensa:72,especial:69,
  hissatsu:['Proyectil de Ozono'],tipoTecnica:'defensa',
  desc:'Siempre está en calma.',
  locked:false,cost:18,
  sprite:'assets/sprites/r319.webp'
},

// Claustro Sagrado (datos aproximados: nombre real, resto estimado)
{
  id:'r320', equipo:'Claustro Sagrado', nombre:'Crane Kik', original:'Crane Kik', sprite:'assets/sprites/r320.webp',
  posicion:'Portero', tipo:'Bosque',
  tiro:56,pase:67,defensa:80,especial:72,
  hissatsu:['Lanzallamas'],tipoTecnica:'portero',
  desc:'Capitán del Claustro Sagrado, busca la paz interior a través del fútbol.',
  locked:false,cost:18
},
{
  id:'r321', equipo:'Claustro Sagrado', nombre:'Tyke Wando', original:'Tyke Wando', sprite:'assets/sprites/r321.webp',
  posicion:'Delantero', tipo:'Bosque',
  tiro:78,pase:75,defensa:33,especial:69,
  hissatsu:['Remate Giratorio'],tipoTecnica:'tiro',
  desc:'Mano derecha del capitán, muy hábil con las artes marciales.',
  locked:false,cost:18
},
{
  id:'r322', equipo:'Claustro Sagrado', nombre:'Dirk Artz', original:'Dirk Artz', sprite:'assets/sprites/r322.webp',
  posicion:'Delantero', tipo:'Viento',
  tiro:75,pase:74,defensa:36,especial:71,
  hissatsu:['Cañonazo'],tipoTecnica:'tiro',
  desc:'Delantero del Claustro Sagrado, hermano pequeño de Marshall.',
  locked:false,cost:18
},
{
  id:'r323', equipo:'Claustro Sagrado', nombre:'Marshall Artz', original:'Marshall Artz', sprite:'assets/sprites/r323.webp',
  posicion:'Delantero', tipo:'Montaña',
  tiro:71,pase:76,defensa:40,especial:70,
  hissatsu:['Cañon Dragón'],tipoTecnica:'tiro',
  desc:'Delantero disciplinado del Claustro Sagrado, hermano mayor de Dirk.',
  locked:false,cost:18
},
{
  id:'r324', equipo:'Claustro Sagrado', nombre:'Brendan Water', original:'Brendan Water', sprite:'assets/sprites/r324.webp',
  posicion:'Defensa', tipo:'Fuego',
  tiro:44,pase:72,defensa:74,especial:73,
  hissatsu:['Cabeza Defensiva'],tipoTecnica:'defensa',
  desc:'Sereno y constante, no pierde la calma ni bajo presión.',
  locked:false,cost:18
},
{
  id:'r325', equipo:'Claustro Sagrado', nombre:'Bri Spark', original:'Bri Spark', sprite:'assets/sprites/r325.webp',
  posicion:'Defensa', tipo:'Montaña',
  tiro:33,pase:68,defensa:72,especial:68,
  hissatsu:['Tiro Sónico'],tipoTecnica:'tiro',
  desc:'Rápido y con mucho carácter, siempre busca el remate.',
  locked:false,cost:18
},
{
  id:'r326', equipo:'Claustro Sagrado', nombre:'Don Ation', original:'Don Ation', sprite:'assets/sprites/r326.webp',
  posicion:'Delantero', tipo:'Viento',
  tiro:69,pase:71,defensa:32,especial:67,
  hissatsu:['Tiro Sónico'],tipoTecnica:'tiro',
  desc:'Centrocampista del Claustro Sagrado, entrena con los monjes.',
  locked:false,cost:18
},
{
  id:'r327', equipo:'Claustro Sagrado', nombre:'Earnest Bookworm', original:'Earnest Bookworm',
  posicion:'Defensa', tipo:'Bosque',
  tiro:42,pase:62,defensa:70,especial:68,
  hissatsu:['Cabeza Defensiva'],tipoTecnica:'defensa',
  desc:'Estudioso del juego, lee las jugadas antes de que ocurran.',
  locked:false,cost:18
},
{
  id:'r328', equipo:'Claustro Sagrado', nombre:'Ian Telektual', original:'Ian Telektual', sprite:'assets/sprites/r328.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:66,pase:74,defensa:65,especial:70,
  hissatsu:['Giro de Mono'],tipoTecnica:'regate',
  desc:'Mediocentro de temple tranquilo, concentrado en cada disparo.',
  locked:false,cost:18
},
{
  id:'r329', equipo:'Claustro Sagrado', nombre:'Junior Fardream', original:'Junior Fardream', sprite:'assets/sprites/r329.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:67,pase:70,defensa:60,especial:68,
  hissatsu:['Danza del viento'],tipoTecnica:'regate',
  desc:'Soñador que reparte juego con calma desde el centro del campo.',
  locked:false,cost:18
},
{
  id:'r330', equipo:'Claustro Sagrado', nombre:'Lee Dinglite', original:'Lee Dinglite', sprite:'assets/sprites/r330.webp',
  posicion:'Defensa', tipo:'Montaña',
  tiro:47,pase:61,defensa:65,especial:63,
  hissatsu:['Barrido Defensivo'],tipoTecnica:'defensa',
  desc:'Defensa del Claustro Sagrado, firme en cada entrada.',
  locked:false,cost:18
},
// Servicio Secreto (datos aproximados: nombre real, resto estimado)
{
  id:'r331', equipo:'Servicio Secreto', nombre:'Ken Ironwall', original:'Ken Ironwall', sprite:'assets/sprites/r331.webp',
  posicion:'Portero', tipo:'Montaña',
  tiro:22,pase:52,defensa:64,especial:65,
  hissatsu:['Escudo de Fuerza'],tipoTecnica:'portero',
  desc:'Un muro humano bajo los palos del Servicio Secreto.',
  locked:false,cost:18
},
{
  id:'r332', equipo:'Servicio Secreto', nombre:'Timothy Western', original:'Timothy Western', sprite:'assets/sprites/r332.webp',
  posicion:'Defensa', tipo:'Viento',
  tiro:50,pase:69,defensa:66,especial:62,
  hissatsu:['Robo Rápido'],tipoTecnica:'defensa',
  desc:'Agente veterano, defiende sin perder nunca la posición.',
  locked:false,cost:18
},
{
  id:'r333', equipo:'Servicio Secreto', nombre:'Shirley Stevens', original:'Shirley Stevens', sprite:'assets/sprites/r333.webp',
  posicion:'Defensa', tipo:'Bosque',
  tiro:49,pase:68,defensa:71,especial:67,
  hissatsu:['Bloqueo'],tipoTecnica:'defensa',
  desc:'Agente del Servicio Secreto, rápida leyendo al rival.',
  locked:false,cost:18
},
{
  id:'r334', equipo:'Servicio Secreto', nombre:'Wallace Hammond', original:'Wallace Hammond', sprite:'assets/sprites/r334.webp',
  posicion:'Defensa', tipo:'Fuego',
  tiro:48,pase:67,defensa:72,especial:69,
  hissatsu:['Barrido Defensivo'],tipoTecnica:'defensa',
  desc:'Contundente en cada balón dividido.',
  locked:false,cost:18
},
{
  id:'r335', equipo:'Servicio Secreto', nombre:'Ian Smith', original:'Ian Smith', sprite:'assets/sprites/r335.webp',
  posicion:'Defensa', tipo:'Montaña',
  tiro:55,pase:69,defensa:73,especial:65,
  hissatsu:['Cabeza Defensiva'],tipoTecnica:'defensa',
  desc:'Defensa del Servicio Secreto, serio y fiable.',
  locked:false,cost:18
},
{
  id:'r336', equipo:'Servicio Secreto', nombre:'Sid Safehouse', original:'Sid Safehouse', sprite:'assets/sprites/r336.webp',
  posicion:'Defensa', tipo:'Bosque',
  tiro:50,pase:60,defensa:66,especial:72,
  hissatsu:['Robo Rápido'],tipoTecnica:'defensa',
  desc:'Cierra los espacios como si guardara un refugio.',
  locked:false,cost:18
},
{
  id:'r337', equipo:'Servicio Secreto', nombre:'Taylor Firepool', original:'Taylor Firepool', sprite:'assets/sprites/r337.webp',
  posicion:'Centrocampista', tipo:'Fuego',
  tiro:58,pase:68,defensa:55,especial:71,
  hissatsu:['Aikido'],tipoTecnica:'defensa',
  desc:'Centrocampista que combina el aikido con el fútbol junto a Marge Fielding.',
  locked:false,cost:18
},
{
  id:'r338', equipo:'Servicio Secreto', nombre:'Marge Fielding', original:'Marge Fielding', sprite:'assets/sprites/r338.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:66,pase:65,defensa:65,especial:65,
  hissatsu:['Aikido'],tipoTecnica:'defensa',
  desc:'Conocida como Agente M, domina el aikido junto a Taylor Firepool.',
  locked:false,cost:18
},
{
  id:'r339', equipo:'Servicio Secreto', nombre:'Holly Mirror', original:'Holly Mirror', sprite:'assets/sprites/r339.webp',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:67,pase:68,defensa:52,especial:69,
  hissatsu:['Danza del viento'],tipoTecnica:'regate',
  desc:'Centrocampista astuta, difícil de leer para el rival.',
  locked:false,cost:18
},
{
  id:'r340', equipo:'Servicio Secreto', nombre:'Ian Sights', original:'Ian Sights', sprite:'assets/sprites/r340.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:67,pase:65,defensa:54,especial:65,
  hissatsu:['Tiro Sónico'],tipoTecnica:'tiro',
  desc:'Siempre tiene el campo a la vista antes de pasar.',
  locked:false,cost:18
},
{
  id:'r341', equipo:'Servicio Secreto', nombre:'Ryan Tappin', original:'Ryan Tappin', sprite:'assets/sprites/r341.webp',
  posicion:'Centrocampista', tipo:'Fuego',
  tiro:57,pase:68,defensa:64,especial:63,
  hissatsu:['Remate Giratorio'],tipoTecnica:'tiro',
  desc:'Trabajador incansable en el centro del campo.',
  locked:false,cost:18
},
{
  id:'r342', equipo:'Servicio Secreto', nombre:'Joe Kenneddy', original:'Joe Kenneddy', sprite:'assets/sprites/r342.webp',
  posicion:'Delantero', tipo:'Fuego',
  tiro:64,pase:66,defensa:32,especial:67,
  hissatsu:['Chut Granada'],tipoTecnica:'tiro',
  desc:'Delantero del Servicio Secreto, remata sin dudar.',
  locked:false,cost:18
},
{
  id:'r343', equipo:'Servicio Secreto', nombre:'Marshall Firsthand', original:'Marshall Firsthand', sprite:'assets/sprites/r343.webp',
  posicion:'Delantero', tipo:'Montaña',
  tiro:64,pase:63,defensa:43,especial:60,
  hissatsu:['Remate Múltiple'],tipoTecnica:'tiro',
  desc:'Siempre llega primero al balón.',
  locked:false,cost:18
},
{
  id:'r344', equipo:'Alpino', nombre:'Greene Beray', original:'Greene Beray',
  posicion:'Delantero', tipo:'Bosque',
  tiro:66,pase:58,defensa:33,especial:68,
  hissatsu:['Cañonazo'],tipoTecnica:'tiro',
  desc:'Delantero paciente que espera su momento.',
  locked:false,cost:18
},
{
  id:'r345', equipo:'Alpino', nombre:'Linda Shadey', original:'Linda Shadey',
  posicion:'Delantero', tipo:'Viento',
  tiro:67,pase:58,defensa:34,especial:62,
  hissatsu:['Tiro Sónico'],tipoTecnica:'tiro',
  desc:'Se desmarca sin que el rival la vea llegar.',
  locked:false,cost:18
},
// Alpino (datos aproximados: nombre real, resto estimado)
{
  id:'r346', equipo:'Alpino', nombre:'Adam Ropes', original:'Adam Ropes',
  posicion:'Portero', tipo:'Montaña',
  tiro:22,pase:53,defensa:68,especial:74,
  hissatsu:['Manos infinitas'],tipoTecnica:'portero',
  desc:'Portero del Instituto Alpino, curtido en el frío.',
  locked:false,cost:18
},
{
  id:'r347', equipo:'Alpino', nombre:'Milton Bindings', original:'Milton Bindings',
  posicion:'Defensa', tipo:'Montaña',
  tiro:44,pase:68,defensa:71,especial:61,
  hissatsu:['Muro de Hierro'],tipoTecnica:'defensa',
  desc:'Defensa del Alpino, aguanta cualquier embestida.',
  locked:false,cost:18
},
{
  id:'r348', equipo:'Alpino', nombre:'Spike Gleeson', original:'Spike Gleeson',
  posicion:'Defensa', tipo:'Viento',
  tiro:48,pase:61,defensa:72,especial:61,
  hissatsu:['Robo Rápido'],tipoTecnica:'defensa',
  desc:'Defensa del Alpino, duro y rápido en la entrada.',
  locked:false,cost:18
},
{
  id:'r349', equipo:'Alpino', nombre:'Joaquine Downtown', original:'Joaquine Downtown',
  posicion:'Defensa', tipo:'Bosque',
  tiro:50,pase:65,defensa:66,especial:64,
  hissatsu:['Bloqueo'],tipoTecnica:'defensa',
  desc:'Defensa del Alpino que sale jugando desde atrás.',
  locked:false,cost:18
},
{
  id:'r350', equipo:'Alpino', nombre:'Roland Climbstein', original:'Roland Climbstein',
  posicion:'Defensa', tipo:'Montaña',
  tiro:43,pase:61,defensa:74,especial:61,
  hissatsu:['Cabeza Defensiva'],tipoTecnica:'defensa',
  desc:'Escalador nato, sube y baja la banda sin cansarse.',
  locked:false,cost:18
},
{
  id:'r351', equipo:'Alpino', nombre:'Kerry Bootgaiter', original:'Kerry Bootgaiter',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:66,pase:67,defensa:54,especial:70,
  hissatsu:['Espejismo'],tipoTecnica:'regate',
  desc:'Centrocampista del Alpino, incansable en la nieve.',
  locked:false,cost:18
},
{
  id:'r352', equipo:'Alpino', nombre:'Maddox Rock', original:'Maddox Rock',
  posicion:'Centrocampista', tipo:'Montaña',
  tiro:66,pase:72,defensa:60,especial:65,
  hissatsu:['Remate Giratorio'],tipoTecnica:'tiro',
  desc:'Centrocampista sólido como una roca.',
  locked:false,cost:18
},
{
  id:'r353', equipo:'Alpino', nombre:'Quentin Rackner', original:'Quentin Rackner',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:66,pase:67,defensa:54,especial:60,
  hissatsu:['Danza del viento'],tipoTecnica:'regate',
  desc:'Reparte juego con precisión desde el medio campo.',
  locked:false,cost:18
},
{
  id:'r354', equipo:'Alpino', nombre:'Sean Snowfield', original:'Sean Snowfield',
  posicion:'Delantero', tipo:'Viento',
  tiro:71,pase:58,defensa:44,especial:60,
  hissatsu:['Remate Giratorio'],tipoTecnica:'tiro',
  desc:'Delantero del Alpino, frío ante la portería.',
  locked:false,cost:18
},
{
  id:'r355', equipo:'Alpino', nombre:'Robert Skipolson', original:'Robert Skipolson',
  posicion:'Delantero', tipo:'Montaña',
  tiro:71,pase:55,defensa:40,especial:70,
  hissatsu:['Tiro Sónico'],tipoTecnica:'tiro',
  desc:'Delantero del Alpino, potente y directo.',
  locked:false,cost:18
},

// Raimon (Ares) (datos aproximados: nombre real, resto estimado)
{
  id:'r356', equipo:'Raimon Inakuni', nombre:'Sonny Wright', original:'Asuto Inamori', sprite:'assets/sprites/r356.webp',
  posicion:'Delantero', tipo:'Fuego',
  tiro:84,pase:74,defensa:45,especial:80,
  hissatsu:['Ave goleadora'],tipoTecnica:'tiro',
  desc:'Protagonista de la isla de Inakuni; capitán en la final del Fútbol Frontier.',
  locked:false,cost:18
},
{
  id:'r357', equipo:'Raimon Inakuni', nombre:'Maxime Dassier', original:'Tatsumi Michinari', sprite:'assets/sprites/r357.webp',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:74,pase:74,defensa:70,especial:72,
  hissatsu:['Ofensiva danzarina'],tipoTecnica:'tiro',
  desc:'Capitán del Raimon Isla Remota durante el torneo.',
  locked:false,cost:18
},
{
  id:'r358', equipo:'Raimon Inakuni', nombre:'Basile Hardy', original:'Sasuke Kozoumaru', sprite:'assets/sprites/r358.webp',
  posicion:'Delantero', tipo:'Fuego',
  tiro:79,pase:76,defensa:52,especial:75,
  hissatsu:['Tornado de fuego A'],tipoTecnica:'tiro',
  desc:'Delantero del Raimon Isla Remota, obsesionado con su Tornado de fuego.',
  locked:false,cost:18
},
{
  id:'r359', equipo:'Raimon Inakuni', nombre:'Cliff Parker', original:'Takashi Iwato', sprite:'assets/sprites/r359.webp',
  posicion:'Defensa', tipo:'Montaña',
  tiro:48,pase:73,defensa:85,especial:80,
  hissatsu:['El muro'],tipoTecnica:'defensa',
  desc:'El Gólem de la isla: un muro imposible de pasar.',
  locked:false,cost:18
},

// Raimon (Ares) (datos aproximados: nombre real, resto estimado)
{
  id:'r360', equipo:'Raimon Inakuni', nombre:'Elliot Ember', original:'Ryouhei Haizaki', sprite:'assets/sprites/r360.webp',
  posicion:'Delantero', tipo:'Bosque',
  tiro:85,pase:80,defensa:40,especial:85,
  hissatsu:['Chilena de pingüino'],tipoTecnica:'tiro',
  desc:'Estrella de Polaris que se une al Raimon Isla Remota contra el Plenilunio.',
  locked:false,cost:18
},
{
  id:'r361', equipo:'Instituto Plenilunio', nombre:'Heath Moore', original:'Yuuma Nosaka', sprite:'assets/sprites/r361.webp',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:82,pase:86,defensa:70,especial:85,
  hissatsu:['Regate Lunar'],tipoTecnica:'regate',
  desc:'Centrocampista incansable del Plenilunio.',
  locked:false,cost:18
},
{
  id:'r362', equipo:'Raimon Inakuni', nombre:'Valentin Eisner', original:'Kirina Hiura', sprite:'assets/sprites/r362.webp',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:74,pase:82,defensa:67,especial:70,
  hissatsu:['Flecha de hielo','Lanza polar','Tiro meteórico'],tipoTecnica:'tiro',
  desc:'Centrocampista del Raimon Isla Remota con técnicas de hielo.',
  locked:false,cost:18
},
{
  id:'r363', equipo:'Raimon Inakuni', nombre:'Nino Nango', original:'Hanta Hattori', sprite:'assets/sprites/r363.webp',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:71,pase:70,defensa:78,especial:80,
  hissatsu:['Sapo ninja','Jaula gravitatoria'],tipoTecnica:'tiro',
  desc:'Centrocampista ágil del Raimon Isla Remota.',
  locked:false,cost:18
},
{
  id:'r364', equipo:'Raimon Inakuni', nombre:'César Montalbán', original:'Hiro Okuiri', sprite:'assets/sprites/r364.webp',
  posicion:'Centrocampista', tipo:'Montaña',
  tiro:68,pase:72,defensa:68,especial:66,
  hissatsu:['Laberinto'],tipoTecnica:'regate',
  desc:'Centrocampista que desorienta rivales con el Laberinto.',
  locked:false,cost:18
},
{
  id:'r365', equipo:'Raimon Inakuni', nombre:'Adriano Donati', original:'Tetsunosuke Goujin', sprite:'assets/sprites/r365.webp',
  posicion:'Delantero', tipo:'Fuego',
  tiro:82,pase:70,defensa:44,especial:81,
  hissatsu:['Cabezazo fiero','Granizado de fuego'],tipoTecnica:'tiro',
  desc:'Delantero del Raimon Isla Remota, letal de cabeza.',
  locked:false,cost:18
},
{
  id:'r366', equipo:'Raimon Inakuni', nombre:'Trevor Cook', original:'Yuuichirou Mansaku', sprite:'assets/sprites/r366.webp',
  posicion:'Defensa', tipo:'Viento',
  tiro:52,pase:75,defensa:79,especial:77,
  hissatsu:['Viento centelleante'],tipoTecnica:'regate',
  desc:'Defensa veloz del Raimon Isla Remota.',
  locked:false,cost:18
},
{
  id:'r367', equipo:'Raimon Inakuni', nombre:'Kiko Calavento', original:'Masakatsu Hiyori', sprite:'assets/sprites/r367.webp',
  posicion:'Defensa', tipo:'Bosque',
  tiro:54,pase:74,defensa:80,especial:74,
  hissatsu:['Torbellino interceptor','Jaula gravitatoria'],tipoTecnica:'defensa',
  desc:'Defensa del Raimon Isla Remota que recupera el balón con su Torbellino.',
  locked:false,cost:18
},
{
  id:'r368', equipo:'Raimon Inakuni', nombre:'Sandra Fischer', original:'Sandra Fischer', sprite:'assets/sprites/r368.webp',

  posicion:'Portero', tipo:'Viento',

  tiro:30,pase:52,defensa:78,especial:72,

  hissatsu:['Mano oceánica','Velo de sirena'],tipoTecnica:'portero',

  desc:'Portera del Raimon Isla Remota.',

  locked:false,cost:18
},

{
  id:'r369', equipo:'Raimon Inakuni', nombre:'Rolland Bowlby', original:'Rolland Bowlby', sprite:'assets/sprites/r369.webp',

  posicion:'Portero', tipo:'Fuego',

  tiro:28,pase:46,defensa:66,especial:66,

  hissatsu:['Parada ardiente'],tipoTecnica:'portero',

  desc:'Portero del Raimon Isla Remota en el manga de Atsushi Oba.',

  locked:false,cost:18
},

// Instituto Umbrella
{
  id:'r370', equipo:'Umbrella', nombre:'Joe Ingram', original:'Jo Ikegaki',
  posicion:'Portero', tipo:'Fuego',
  tiro:35,pase:48,defensa:72,especial:76,
  hissatsu:['Atajo Tornado'],tipoTecnica:'portero',
  desc:'Portero titular del Instituto Umbrella.',
  locked:false,cost:110,
  sprite:'assets/sprites/r370.webp'
},
{
  id:'r371', equipo:'Umbrella', nombre:'Kendall Sefton', original:'Kendall Sefton',
  posicion:'Defensa', tipo:'Viento',
  tiro:42,pase:55,defensa:70,especial:67,
  hissatsu:['Corte Giratorio'],tipoTecnica:'defensa',
  desc:'Defensa titular del Instituto Umbrella.',
  locked:false,cost:105,
  sprite:'assets/sprites/r371.webp'
},
{
  id:'r372', equipo:'Umbrella', nombre:'Jason Strike', original:'Yasuchi Kikuchi',
  posicion:'Defensa', tipo:'Fuego',
  tiro:48,pase:58,defensa:69,especial:66,
  hissatsu:['Robo Rápido'],tipoTecnica:'defensa',
  desc:'Defensa del Umbrella, muy aficionado al deporte y al entrenamiento físico.',
  locked:false,cost:105,
  sprite:'assets/sprites/r372.webp'
},
{
  id:'r373', equipo:'Umbrella', nombre:'Norman Porter', original:'Norman Porter',
  posicion:'Defensa', tipo:'Montaña',
  tiro:40,pase:52,defensa:73,especial:68,
  hissatsu:['Barrido Defensivo'],tipoTecnica:'defensa',
  desc:'Defensa titular del Instituto Umbrella.',
  locked:false,cost:105,
  sprite:'assets/sprites/r373.webp'
},
{
  id:'r374', equipo:'Umbrella', nombre:'Maxwell Claus', original:'Maxwell Claus',
  posicion:'Defensa', tipo:'Bosque',
  tiro:44,pase:54,defensa:71,especial:65,
  hissatsu:['Giro Bobina'],tipoTecnica:'defensa',
  desc:'Defensa del Umbrella, conocido por su apodo Chops.',
  locked:false,cost:105,
  sprite:'assets/sprites/r374.webp'
},
{
  id:'r375', equipo:'Umbrella', nombre:'Bruce Chaney', original:'Bruce Chaney',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:55,pase:64,defensa:50,especial:62,
  hissatsu:['Equilibrismo'],tipoTecnica:'regate',
  desc:'Centrocampista titular del Instituto Umbrella.',
  locked:false,cost:100,
  sprite:'assets/sprites/r375.webp'
},
{
  id:'r376', equipo:'Umbrella', nombre:'Leroy Rhymes', original:'Leroy Rhymes',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:58,pase:68,defensa:53,especial:70,
  hissatsu:['Equilibrismo'],tipoTecnica:'regate',
  desc:'Centrocampista del Umbrella con buenas capacidades de control del balón.',
  locked:false,cost:110,
  sprite:'assets/sprites/r376.webp'
},
{
  id:'r377', equipo:'Umbrella', nombre:'Mildford Scott', original:'Mildford Scott',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:52,pase:61,defensa:54,especial:64,
  hissatsu:['Escáner Ataque'],tipoTecnica:'regate',
  desc:'Centrocampista titular del Instituto Umbrella.',
  locked:false,cost:100,
  sprite:'assets/sprites/r377.webp'
},
{
  id:'r378', equipo:'Umbrella', nombre:'Lou Edmonds', original:'Yo Idemae',
  posicion:'Delantero', tipo:'Fuego',
  tiro:70,pase:57,defensa:44,especial:72,
  hissatsu:['Tiro Giratorio'],tipoTecnica:'tiro',
  desc:'Capitán del Instituto Umbrella y uno de sus principales jugadores.',
  locked:false,cost:125,
  sprite:'assets/sprites/r378.webp'
},
{
  id:'r379', equipo:'Umbrella', nombre:'Cameron Morefield', original:'Hidetsugu Yasunaga',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:59,pase:67,defensa:52,especial:70,
  hissatsu:['Entrada Huracán'],tipoTecnica:'regate',
  desc:'Centrocampista titular del Umbrella y antiguo tenista de gran talento.',
  locked:false,cost:110,
  sprite:'assets/sprites/r379.webp'
},
{
  id:'r380', equipo:'Umbrella', nombre:'Greg Bernard', original:'Seiji Mizuguchi',
  posicion:'Delantero', tipo:'Bosque',
  tiro:67,pase:72,defensa:51,especial:70,
  hissatsu:['Remate Serpiente'],tipoTecnica:'tiro',
  desc:'Delantero del Umbrella, conocido como Cyborg por sus pases tan precisos.',
  locked:false,cost:120,
  sprite:'assets/sprites/r380.webp'
},
{
  id:'r381', equipo:'Otaku', nombre: 'Sam Idol', original:'Sam Idol',
  posicion:'Portero', tipo:'Montaña',
  tiro:21,pase:36,defensa:70,especial:70,
  hissatsu:['Deslizamiento'],tipoTecnica:'portero',
  desc:'Portero del Otaku.',
  locked:false,cost:120,
  sprite:'assets/sprites/r381.webp'
},
{
  id:'r382', equipo:'Otaku', nombre: 'Light Nobel', original:'Light Nobel',
  posicion:'Defensa', tipo:'Bosque',
  tiro:25,pase:65,defensa:71,especial:68,
  hissatsu:['Bola Falsa'],tipoTecnica:'defensa',
  desc:'Defensa del Otaku.',
  locked:false,cost:120,
  sprite:'assets/sprites/r382.webp'
},
{
  id:'r383', equipo:'Otaku', nombre: 'Walter Valiant', original:'Walter Valiant',
  posicion:'Centrocampista', tipo:'Fuego',
  tiro:70,pase:70,defensa:60,especial:60,
  hissatsu:['Regate Topo'],tipoTecnica:'regate',
  desc:'Centrocampista del Otaku.',
  locked:false,cost:120,
  sprite:'assets/sprites/r383.webp'
},
{
  id:'r384', equipo:'Otaku', nombre:'Gus Gamer', original:'Gus Gamer',
  posicion:'Delantero', tipo:'Fuego',
  tiro:72,pase:55,defensa:38,especial:70,
  hissatsu:['Bola Falsa'],tipoTecnica:'defensa',
  desc:'Delantero del Otaku, de segundo curso.',
  locked:false,cost:120,
  sprite:'assets/sprites/r384.webp'
},
{
  // "Aire" no es un tipo elemental válido de la app (Fuego/Bosque/Viento/
  // Montaña) -- pasado a Viento, mismo criterio que el resto del roster.
  id:'r385', equipo:'Otaku', nombre:'Mark Gambling', original:'Mark Gambling',
  posicion:'Delantero', tipo:'Viento',
  tiro:74,pase:58,defensa:40,especial:72,
  hissatsu:['Combo Perfecto'],tipoTecnica:'tiro',
  desc:'Capitán del Otaku (Manga de Tenya Yabuno), de segundo curso.',
  locked:false,cost:125,
  sprite:'assets/sprites/r385.webp'
},
{
  id:'r386', equipo:'Otaku', nombre:'Theodore Master', original:'Theodore Master',
  posicion:'Delantero', tipo:'Bosque',
  tiro:71,pase:56,defensa:39,especial:69,
  hissatsu:['Doble Salto'],tipoTecnica:'tiro',
  desc:'Delantero del Otaku, de tercer curso.',
  locked:false,cost:120,
  sprite:'assets/sprites/r386.webp'
},
// Inazuma Kids FC (wiki: https://inazuma.fandom.com/es/wiki/Inazuma_Kids_FC).
{
  id:'r387', equipo:'Inazuma Kids', nombre:'Herman Muller', original:'Herman Muller',
  posicion:'Portero', tipo:'Viento',
  tiro:28,pase:42,defensa:70,especial:72,
  hissatsu:['Despeje a presión'],tipoTecnica:'portero',
  desc:'Portero del Inazuma Kids FC, dorsal 1.',
  locked:false,cost:16,
  sprite:'assets/sprites/r387.webp'
},
{
  id:'r388', equipo:'Inazuma Kids', nombre:'Keth Claus', original:'Keth Claus',
  posicion:'Defensa', tipo:'Viento',
  tiro:32,pase:46,defensa:70,especial:60,
  hissatsu:[],
  desc:'Defensa del Inazuma Kids FC, dorsal 2.',
  locked:false,cost:14,
  sprite:'assets/sprites/r388.webp'
},
{
  id:'r389', equipo:'Inazuma Kids', nombre:'Robert Silver', original:'Robert Silver',
  posicion:'Defensa', tipo:'Viento',
  tiro:33,pase:45,defensa:71,especial:59,
  hissatsu:[],
  desc:'Defensa del Inazuma Kids FC, dorsal 3.',
  locked:false,cost:14,
  sprite:'assets/sprites/r389.webp'
},
{
  id:'r390', equipo:'Inazuma Kids', nombre:'Taylor Higgins', original:'Taylor Higgins',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:40,pase:56,defensa:52,especial:58,
  hissatsu:[],
  desc:'Centrocampista del Inazuma Kids FC, dorsal 7.',
  locked:false,cost:15,
  sprite:'assets/sprites/r390.webp'
},
{
  id:'r391', equipo:'Inazuma Kids', nombre:'Jamie Cool', original:'Jamie Cool',
  posicion:'Centrocampista', tipo:'Viento',
  tiro:41,pase:58,defensa:51,especial:60,
  hissatsu:[],
  desc:'Centrocampista del Inazuma Kids FC, dorsal 8.',
  locked:false,cost:15,
  sprite:'assets/sprites/r391.webp'
},
{
  id:'r392', equipo:'Inazuma Kids', nombre:'Hans Randall', original:'Hans Randall',
  posicion:'Delantero', tipo:'Fuego',
  tiro:66,pase:44,defensa:36,especial:64,
  hissatsu:['Acelerón','Tiro del cometa'],tipoTecnica:'tiro',
  desc:'Delantero del Inazuma Kids FC, dorsal 9.',
  locked:false,cost:18,
  sprite:'assets/sprites/r392.webp'
},
{
  id:'r393', equipo:'Inazuma Kids', nombre:'Maddie Moonlight', original:'Maddie Moonlight',
  posicion:'Delantero', tipo:'Bosque',
  tiro:68,pase:46,defensa:37,especial:66,
  hissatsu:['Tiro del cometa'],tipoTecnica:'tiro',
  desc:'Capitana del Inazuma Kids FC, dorsal 11.',
  locked:false,cost:20,
  sprite:'assets/sprites/r393.webp'
},
// Instituto Kirkwood, primer anime (wiki: https://inazuma.fandom.com/es/wiki/Instituto_Kirkwood)
{
  id:'r394', equipo:'Kirkwood', nombre:'Malcolm Night', original:'Malcolm Night',
  posicion:'Defensa', tipo:'Fuego',
  tiro:50,pase:55,defensa:66,especial:60,
  hissatsu:['Corte Giratorio'],tipoTecnica:'defensa',
  desc:'Defensa del Instituto Kirkwood, dorsal 2.',
  locked:false,cost:100,
  sprite:'assets/sprites/r394.webp'
},
{
  id:'r395', equipo:'Kirkwood', nombre:'Alfred Meenan', original:'Alfred Meenan',
  posicion:'Defensa', tipo:'Bosque',
  tiro:48,pase:56,defensa:68,especial:58,
  hissatsu:['Robo Rápido'],tipoTecnica:'defensa',
  desc:'Defensa del Instituto Kirkwood, dorsal 3.',
  locked:false,cost:100,
  sprite:'assets/sprites/r395.webp'
},
{
  id:'r396', equipo:'Kirkwood', nombre:'Ricky Clover', original:'Ricky Clover',
  posicion:'Defensa', tipo:'Montaña',
  tiro:52,pase:54,defensa:65,especial:59,
  hissatsu:['Giro Bobina'],tipoTecnica:'defensa',
  desc:'Defensa del Instituto Kirkwood, dorsal 5.',
  locked:false,cost:100,
  sprite:'assets/sprites/r396.webp'
},
{
  id:'r397', equipo:'Kirkwood', nombre:'Marvin Murdock', original:'Marvin Murdock',
  posicion:'Delantero', tipo:'Fuego',
  tiro:70,pase:62,defensa:45,especial:72,
  hissatsu:['Triángulo Z','Espejismo de Balón'],tipoTecnica:'tiro',
  desc:'Capitán del Instituto Kirkwood, dorsal 9.',
  locked:false,cost:125,
  sprite:'assets/sprites/r397.webp'
},
{
  id:'r398', equipo:'Kirkwood', nombre:'Thomas Murdock', original:'Thomas Murdock',
  posicion:'Delantero', tipo:'Viento',
  tiro:66,pase:58,defensa:42,especial:68,
  hissatsu:['Tornado Inverso'],tipoTecnica:'tiro',
  desc:'Delantero del Instituto Kirkwood, dorsal 10, hermano de Marvin y Tyler.',
  locked:false,cost:115,
  sprite:'assets/sprites/r398.webp'
},
{
  id:'r399', equipo:'Kirkwood', nombre:'Tyler Murdock', original:'Tyler Murdock',
  posicion:'Delantero', tipo:'Montaña',
  tiro:64,pase:57,defensa:43,especial:66,
  hissatsu:['Tornado Inverso'],tipoTecnica:'tiro',
  desc:'Delantero del Instituto Kirkwood, dorsal 11, hermano de Marvin y Thomas.',
  locked:false,cost:110,
  sprite:'assets/sprites/r399.webp'
},
// Equipo Ogro (wiki: https://inazuma.fandom.com/es/wiki/Equipo_Ogro), el
// rival más fuerte de todos -- rival final del Modo Mundial tras el Zeus.
// Delantero, capitán (Bash Lancer, r45) y Mystral Callous (r74) ya
// estaban en el roster con otros ids (personajes repetidos), así que no
// se duplican aquí -- ver WORLD_TOUR_STAGES en world-tour.js. Elemento
// 'Aire' de la wiki pasado a Viento, igual que el resto del roster.
{
  id:'r400', equipo:'Academia Ogre', nombre:'Lars Luceafăr', original:'Lars Luceafăr',
  posicion:'Portero', tipo:'Montaña',
  tiro:40,pase:60,defensa:86,especial:86,
  hissatsu:['Malla Eléctrica'],tipoTecnica:'portero',
  desc:'Portero del Equipo Ogro, dorsal 1.',
  locked:true,cost:210,
  sprite:'assets/sprites/r400.webp'
},
{
  id:'r401', equipo:'Academia Ogre', nombre:'Bump Trungus', original:'Bump Trungus',
  posicion:'Defensa', tipo:'Fuego',
  tiro:60,pase:65,defensa:90,especial:86,
  hissatsu:['Placaje Extremo'],tipoTecnica:'defensa',
  desc:'Defensa del Equipo Ogro, dorsal 2.',
  locked:true,cost:190,
  sprite:'assets/sprites/r401.webp'
},
{
  id:'r402', equipo:'Academia Ogre', nombre:'Lump Trungus', original:'Lump Trungus',
  posicion:'Defensa', tipo:'Viento',
  tiro:58,pase:64,defensa:89,especial:85,
  hissatsu:['Corte Diabólico'],tipoTecnica:'defensa',
  desc:'Defensa del Equipo Ogro, dorsal 3.',
  locked:true,cost:190,
  sprite:'assets/sprites/r402.webp'
},
{
  id:'r403', equipo:'Academia Ogre', nombre:'Radd Ischer', original:'Radd Ischer',
  posicion:'Defensa', tipo:'Bosque',
  tiro:56,pase:63,defensa:87,especial:82,
  hissatsu:['Carga de Elefantes'],tipoTecnica:'defensa',
  desc:'Defensa del Equipo Ogro, dorsal 4.',
  locked:true,cost:180,
  sprite:'assets/sprites/r403.webp'
},
{
  id:'r404', equipo:'Academia Ogre', nombre:'Jynx Jenkins', original:'Jynx Jenkins',
  posicion:'Defensa', tipo:'Bosque',
  tiro:57,pase:62,defensa:86,especial:81,
  hissatsu:['Corte Volcánico'],tipoTecnica:'defensa',
  desc:'Defensa del Equipo Ogro, dorsal 5.',
  locked:true,cost:180,
  sprite:'assets/sprites/r404.webp'
},
{
  id:'r405', equipo:'Academia Ogre', nombre:'Oni Triumvir', original:'Oni Triumvir',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:70,pase:80,defensa:75,especial:88,
  hissatsu:['Gravitación'],tipoTecnica:'defensa',
  desc:'Centrocampista del Equipo Ogro, dorsal 6.',
  locked:true,cost:195,
  sprite:'assets/sprites/r405.webp'
},
{
  id:'r406', equipo:'Academia Ogre', nombre:'Drachen Gunther', original:'Drachen Gunther',
  posicion:'Centrocampista', tipo:'Fuego',
  tiro:72,pase:82,defensa:74,especial:87,
  hissatsu:['Zona Sigma'],tipoTecnica:'defensa',
  desc:'Centrocampista del Equipo Ogro, dorsal 7.',
  locked:true,cost:195,
  sprite:'assets/sprites/r406.webp'
},
{
  id:'r407', equipo:'Academia Ogre', nombre:'Ichabod Stark', original:'Ichabod Stark',
  posicion:'Centrocampista', tipo:'Montaña',
  tiro:74,pase:81,defensa:76,especial:90,
  hissatsu:['Diluvio Letal'],tipoTecnica:'tiro',
  desc:'Centrocampista del Equipo Ogro, dorsal 8.',
  locked:true,cost:200,
  sprite:'assets/sprites/r407.webp'
},
{
  id:'r408', equipo:'Genesis', nombre:'Xene B.', original:'Xene',
  posicion:'Delantero', tipo:'Fuego',
  tiro:90,pase:76,defensa:45,especial:90,
  hissatsu:['Cañon de Meteoritos'],tipoTecnica:'tiro',
  desc:'El verdadero Xene que se hizo amigo de Mark',
  locked:true,cost:400,
  sprite:'assets/sprites/r408.webp'
},
{
  id:'r409', equipo:'Tormenta de Géminis', nombre:'Janus', original:'Janus',
  posicion:'Centrocampista', tipo:'Bosque',
  tiro:81,pase:86,defensa:75,especial:83,
  hissatsu:['Astro Remate'],tipoTecnica:'tiro',
  desc:'Un alienígena que se dedica a destrozar institutos.',
  locked:true,cost:400,
  sprite:'assets/sprites/r409.webp'
},
{
  id:'r410', equipo:'Neo Raimon', nombre:'Zak Wallside', original:'Zak Wallside',
  posicion:'Defensa', tipo:'Montaña',
  tiro:16,pase:70,defensa:80,especial:70,
  hissatsu:['El muro'],tipoTecnica:'defensa',
  desc:'Hermano de Jack y aprendiz.',
  locked:true,cost:100,
  sprite:'assets/sprites/r410.webp'
}

]

// Entrenadores (prueba con 5 conocidos, sin imagen): pertenecen a un equipo y
// dan un pequeño bonus numérico de ataque y de defensa (puntos sobre la
// escala 0-100 del partido), más su propia intensidad (baja/media/alta) y
// estilo de juego (muy_defensiva, defensiva, equilibrado, ofensiva,
// muy_ofensiva), a petición explícita. Se eligen en los drafts (FutDraft y
// Liga) y en el Modo Mundial (por defecto Hillman con el Raimon).
var COACHES = [
  { id: 'c01', nombre: 'Hillman', original: 'Michiya Kudou', equipo: 'Raimon', atk: 3, def: 3, intensidad: 'media', estilo: 'equilibrado', desc: 'El entrenador del Raimon, tranquilo y estratega.' },
  { id: 'c02', nombre: 'Comandante Hillman', original: 'Fuyuka Kudou', equipo: 'Equipo Ogro', atk: 4, def: 2, intensidad: 'alta', estilo: 'ofensiva', desc: 'Directora deportiva del Raimon, apuesta por el ataque.' },
  { id: 'c03', nombre: 'Ray Dark', original: 'Reiji Kageyama', equipo: 'Royal Academy', atk: 3, def: 2, intensidad: 'alta', estilo: 'muy_ofensiva', desc: 'Estratega implacable que lo arriesga todo al ataque.' },
  { id: 'c04', nombre: 'Elzes Killard', original: 'Elzes Killard', equipo: 'Neo Raimon', atk: 3, def: 3, intensidad: 'alta', estilo: 'ofensiva', desc: 'Director del Genesis, exige rendimiento máximo.' },
  { id: 'c05', nombre: 'Zoolan Rice', original: 'Zoolan Rice', equipo: 'Zoolan Team', atk: 2, def: 4, intensidad: 'baja', estilo: 'defensiva', desc: 'Prefiere un equipo cerrado y sin riesgos.' },
  { id: 'c06', nombre: 'Mr. D', original: 'Mr. D', equipo: 'Orfeo', atk: 2, def: 4, intensidad: 'alta', estilo: 'defensivo', desc: 'Frío y calculador, dirige con mano de hierro.' },
  { id: 'c07', nombre: 'Astero Black', original: 'Ray Dark', equipo: 'Earth Eleven', atk: 4, def: 3, intensidad: 'alta', estilo: 'muy_ofensiva', desc: 'Ray Dark, el líder oscuro que lo sacrifica todo por ganar.' },
  { id: 'c08', nombre: 'David Evans', original: 'Daisuke Endou', equipo: 'Pequeños Gigantes', atk: 3, def: 3, intensidad: 'media', estilo: 'equilibrado', desc: 'El entrenador de Inazuma Japón, siempre optimista.' },
  { id: 'c09', nombre: 'Hekyll Jyde', original: 'Hekyll Jyde', equipo: 'Occult', atk: 2, def: 1, intensidad: 'media', estilo: 'ofensiva', desc: 'Entrenador ambicioso que apuesta por el ataque.' },
  { id: 'c10', nombre: 'Stewart Vanguard', original: 'Stewart Vanguard', equipo: 'Servicio Secreto', atk: 2, def: 2, intensidad: 'baja', estilo: 'defensiva', desc: 'Estratega prudente que prioriza no encajar.' },
  { id: 'c11', nombre: 'Nerina Hartland', original: 'Nerina Hartland', equipo: 'Sallys', atk: 2, def: 2, intensidad: 'media', estilo: 'equilibrado', desc: 'Entrenadora equilibrada que cuida cada detalle.' },
  { id: 'c12', nombre: 'Percival Travis', original: 'Percival Travis', equipo: 'Inazuma Japón', atk: 3, def: 3, intensidad: 'media', estilo: 'equilibrado', desc: 'Entrenador de Inazuma Japón, serio y disciplinado.' },
  { id: 'c13', nombre: 'Wonderbot', original: 'Wonderbot', equipo: 'Raimon GO', atk: 2, def: 3, intensidad: 'media', estilo: 'equilibrado', desc: 'El robot entrenador, siempre animando al equipo.' },
  { id: 'c14', nombre: 'Mark Evans adulto', original: 'Mark Evans', equipo: 'Raimon', atk: 4, def: 3, intensidad: 'alta', estilo: 'ofensiva', desc: 'El eterno capitán convertido en entrenador, todo pasión.' },
  { id: 'c15', nombre: 'Jude Sharp adulto', original: 'Jude Sharp', equipo: 'Royal Academy GO', atk: 3, def: 4, intensidad: 'media', estilo: 'equilibrado', desc: 'El estratega de las gafas, ahora desde el banquillo.' },
  { id: 'c16', nombre: 'Destiny Billows', original: 'Destin Billows', equipo: 'Neo Raimon', atk: 3, def: 3, intensidad: 'media', estilo: 'equilibrado', desc: 'Entrenador táctico de gran carisma.' }

];
