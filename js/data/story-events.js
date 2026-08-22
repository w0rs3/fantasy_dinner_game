import { CHAPTERS } from './chapters.js';

const entry = (de, en, quiz = null) => ({ de, en, quiz });

const LOCATION_STORIES = Object.freeze([
  [
    entry(
      ['Die Crew gleitet in das Hafenbecken, während Möwen über den schiefen Masten kreisen.', 'An der Kaimauer hängt eine blaue Glocke, die nur für Schiffe mit friedlicher Absicht geläutet wird.', 'Als ihr Ton über das Wasser zieht, öffnen die Händler schweigend ihre ersten Vorratskisten.'],
      ['The crew glides into the Harbour Basin while gulls circle above the crooked masts.', 'A blue bell hangs on the quay and is rung only for ships arriving in peace.', 'As its note travels across the water, the merchants silently open their first provision crates.'],
      { de: 'Welche Farbe hat die Glocke am Hafenbecken?', en: 'What colour is the bell at the Harbour Basin?', correct: { de: 'Blau', en: 'Blue' }, wrong: [{ de: 'Rot', en: 'Red' }, { de: 'Golden', en: 'Golden' }] }
    ),
    entry(
      ['Der Leuchtturm steht auf einem Felsen, den jede Welle wie eine Trommel schlägt.', 'Seine Hüterin poliert einen großen Kupferspiegel, der das Licht weit über die Riffe wirft.', 'Der Strahl zeigt immer auf die sicherste Passage, selbst wenn der Wind alle Flaggen verdreht.'],
      ['The Lighthouse stands on a rock that every wave strikes like a drum.', 'Its keeper polishes a great copper mirror that throws the light far across the reefs.', 'The beam always points toward the safest passage even when the wind twists every flag.'],
      { de: 'Woraus besteht der große Spiegel im Leuchtturm?', en: 'What is the great mirror in the Lighthouse made from?', correct: { de: 'Kupfer', en: 'Copper' }, wrong: [{ de: 'Silber', en: 'Silver' }, { de: 'Glas', en: 'Glass' }] }
    ),
    entry(
      ['Auf dem Dorfplatz plätschert ein Brunnen in Form eines freundlichen Kraken.', 'Die Kinder werfen Olivenkerne hinein und wünschen vorbeiziehenden Crews eine volle Speisekammer.', 'Ein alter Fischer behauptet, der Krake habe noch nie ein ehrliches Schiff leer ausgehen lassen.'],
      ['A fountain shaped like a friendly octopus splashes in the Village Square.', 'Children toss olive stones into it and wish passing crews a full pantry.', 'An old fisher claims the octopus has never let an honest ship leave empty-handed.'],
      { de: 'Was werfen die Kinder in den Brunnen auf dem Dorfplatz?', en: 'What do the children toss into the fountain in the Village Square?', correct: { de: 'Olivenkerne', en: 'Olive stones' }, wrong: [{ de: 'Kupfermünzen', en: 'Copper coins' }, { de: 'Muscheln', en: 'Shells' }] }
    ),
    entry(
      ['Die Marktgasse ist so schmal, dass sich die bunten Sonnensegel über euren Köpfen berühren.', 'Unter einer roten Markise verkauft eine Gewürzhändlerin Mischungen mit Namen wie Kanonendonner und Rückenwind.', 'Ihr Papagei ruft bei jedem Handel, man solle niemals den ersten Preis bezahlen.'],
      ['Market Lane is so narrow that the colourful awnings touch above your heads.', 'Beneath a red canopy, a spice merchant sells blends named Cannon Thunder and Tailwind.', 'Her parrot calls during every trade that nobody should ever pay the first price.']
    ),
    entry(
      ['Im Olivenhain stehen die Bäume in krummen Reihen wie eine schweigende Mannschaft.', 'Der älteste Stamm wurde von einem Blitz geteilt und trägt trotzdem jedes Jahr besonders viele Früchte.', 'Die Bewohner binden ein silbernes Band daran, bevor sie zu einer langen Reise aufbrechen.'],
      ['The trees of the Olive Grove stand in crooked rows like a silent crew.', 'The oldest trunk was split by lightning yet still bears the most fruit every year.', 'The islanders tie a silver ribbon around it before setting out on a long voyage.']
    ),
    entry(
      ['Der Schmugglersteg liegt halb verborgen zwischen hohen Lagerhäusern.', 'Seine dritte Planke knarrt so laut, dass heimliche Besucher stets verraten werden.', 'Unter dem Geländer findet ihr einen Kreideanker, das alte Zeichen für einen sicheren Rückweg.'],
      ['Smuggler’s Pier lies half hidden between tall warehouses.', 'Its third plank creaks so loudly that secret visitors are always betrayed.', 'Beneath the rail you find a chalk anchor, the old sign for a safe return route.']
    )
  ],
  [
    entry(
      ['An der Nebelquelle quillt warmer Dunst aus einer steinernen Schale im Boden.', 'Daneben steckt eine eiserne Kelle, mit der Reisende angeblich den Nebel teilen können.', 'Als die Crew sie anhebt, wird für einen Augenblick ein schmaler Pfad sichtbar.'],
      ['At Mist Spring, warm vapour rises from a stone bowl in the ground.', 'An iron ladle rests beside it and is said to let travellers part the mist.', 'When the crew lifts it, a narrow path becomes visible for a moment.'],
      { de: 'Welcher Gegenstand liegt an der Nebelquelle?', en: 'Which object rests at Mist Spring?', correct: { de: 'Eine eiserne Kelle', en: 'An iron ladle' }, wrong: [{ de: 'Ein goldener Becher', en: 'A golden cup' }, { de: 'Ein Holzschwert', en: 'A wooden sword' }] }
    ),
    entry(
      ['Die Kräuterhütte duckt sich unter einem Dach aus Moos und gebogenen Ästen.', 'Über der Tür hängen blaue Kräuterbündel, deren Duft die lästigen Moormotten fernhält.', 'Im Inneren zeichnet eine Kräuterkundige sichere Wege mit grüner Kreide auf den Tisch.'],
      ['The Herb Hut crouches beneath a roof of moss and bent branches.', 'Blue herb bundles hang above the door, and their scent keeps the marsh moths away.', 'Inside, a herbalist draws safe routes across the table with green chalk.'],
      { de: 'Welche Farbe haben die Kräuterbündel über der Hüttentür?', en: 'What colour are the herb bundles above the hut door?', correct: { de: 'Blau', en: 'Blue' }, wrong: [{ de: 'Gelb', en: 'Yellow' }, { de: 'Weiß', en: 'White' }] }
    ),
    entry(
      ['Im Pilzwald leuchten blasse Hüte zwischen den Wurzeln wie kleine Monde.', 'Sie wachsen in vollkommenen Kreisen, die selbst die schwarzen Raben nicht überfliegen.', 'Die Crew folgt den freien Zwischenräumen und hört tief im Wald einen Kessel klappern.'],
      ['Pale caps glow between the roots of Mushroom Wood like tiny moons.', 'They grow in perfect circles that even the black ravens refuse to cross.', 'The crew follows the open spaces and hears a cauldron rattling deep in the wood.'],
      { de: 'Welche Tiere meiden die Pilzkreise?', en: 'Which animals avoid the mushroom circles?', correct: { de: 'Schwarze Raben', en: 'Black ravens' }, wrong: [{ de: 'Weiße Hasen', en: 'White rabbits' }, { de: 'Rote Füchse', en: 'Red foxes' }] }
    ),
    entry(
      ['Der Moorsteg schwankt über dunklem Wasser, in dem kein Himmel zu sehen ist.', 'Kleine Laternen glimmen grün, sobald die nächste Planke sicher belastet werden kann.', 'Die Crew setzt Schritt für Schritt über und lässt das Flüstern im Schilf hinter sich.'],
      ['The Mooring Walk sways above dark water in which no sky can be seen.', 'Small lanterns glow green whenever the next plank is safe to step on.', 'The crew crosses one careful step at a time and leaves the whispering reeds behind.']
    ),
    entry(
      ['Im Steinbruch ragen graue Wände wie die Seiten einer aufgeschlagenen Chronik empor.', 'Einige Steine singen tiefe Töne, kurz bevor Regen über die Insel zieht.', 'Die Arbeiter lauschen ihnen genauer als jeder Wetterfahne.'],
      ['Grey walls rise in the Quarry like the pages of an open chronicle.', 'Some stones sing low notes shortly before rain crosses the island.', 'The workers trust them more than any weather vane.']
    ),
    entry(
      ['Das Alte Pumpwerk erwacht mit einem Husten aus Dampf und rostigem Metall.', 'In seiner Mitte sitzt ein Messingrad mit genau sieben Speichen, das die verborgenen Leitungen steuert.', 'Als es sich dreht, fließt klares Wasser zum verlassenen Kesselraum.'],
      ['The Old Pump House wakes with a cough of steam and rusty metal.', 'At its centre sits a brass wheel with exactly seven spokes controlling the hidden pipes.', 'When it turns, clear water flows toward the abandoned cauldron room.']
    )
  ],
  [
    entry(
      ['Das Dschungeltor besteht aus zwei überwucherten Säulen und dem steinernen Kopf eines Jaguars.', 'In einem Auge des Tieres steckt ein schwarzer Obsidian, der im grünen Schatten funkelt.', 'Als die Crew darunter hindurchgeht, ziehen sich die Ranken langsam hinter ihr zusammen.'],
      ['The Jungle Gate is formed by two overgrown pillars and the stone head of a jaguar.', 'A black piece of obsidian sits in one of the animal’s eyes and glitters in the green shade.', 'As the crew passes beneath it, the vines slowly close behind them.'],
      { de: 'Was funkelt im Auge des Jaguars am Dschungeltor?', en: 'What glitters in the jaguar’s eye at the Jungle Gate?', correct: { de: 'Schwarzer Obsidian', en: 'Black obsidian' }, wrong: [{ de: 'Ein Rubin', en: 'A ruby' }, { de: 'Eine Perle', en: 'A pearl' }] }
    ),
    entry(
      ['Der Tempelgarten ist in vier Beete aufgeteilt, die genau nach den Himmelsrichtungen zeigen.', 'Im nördlichen Beet wächst ausschließlich duftende Minze zwischen hellen Steinen.', 'Eine verwitterte Inschrift warnt davor, die Pflanzen gegen den Lauf der Sonne zu ernten.'],
      ['The Temple Garden is divided into four beds pointing exactly toward the compass directions.', 'Only fragrant mint grows in the northern bed among pale stones.', 'A weathered inscription warns against harvesting the plants against the path of the sun.'],
      { de: 'Was wächst im nördlichen Beet des Tempelgartens?', en: 'What grows in the northern bed of the Temple Garden?', correct: { de: 'Minze', en: 'Mint' }, wrong: [{ de: 'Rosmarin', en: 'Rosemary' }, { de: 'Lavendel', en: 'Lavender' }] }
    ),
    entry(
      ['Der Papageienpfad teilt sich immer wieder zwischen breiten Farnen.', 'Rote Federn an den Ästen markieren die sichere Abzweigung, während blaue Federn zu sumpfigem Boden führen.', 'Über euch kommentiert ein unsichtbarer Papagei jeden Richtungswechsel mit einem empörten Krächzen.'],
      ['Parrot Trail splits again and again between broad ferns.', 'Red feathers on the branches mark the safe fork, while blue feathers lead toward marshy ground.', 'Above you, an unseen parrot comments on every turn with an indignant squawk.'],
      { de: 'Welche Federn markieren am Papageienpfad den sicheren Weg?', en: 'Which feathers mark the safe route on Parrot Trail?', correct: { de: 'Rote Federn', en: 'Red feathers' }, wrong: [{ de: 'Blaue Federn', en: 'Blue feathers' }, { de: 'Weiße Federn', en: 'White feathers' }] }
    ),
    entry(
      ['Der Wasserfall fällt wie ein silberner Vorhang in ein tiefes, klares Becken.', 'Hinter dem Wasser liegt ein trockener Felsvorsprung mit drei alten Tonbechern.', 'Die Crew füllt sie, und für einen Moment klingt das Rauschen wie ferner Applaus.'],
      ['The Waterfall drops like a silver curtain into a deep clear pool.', 'Behind the water lies a dry ledge holding three old clay cups.', 'The crew fills them, and for a moment the roar sounds like distant applause.']
    ),
    entry(
      ['Im Ruinenhof liegen zerbrochene Säulen zwischen riesigen Blättern.', 'Ein Bodenmosaik zeigt einen Affen mit einer Krone aus Bananen.', 'Unter einer losen Platte entdeckt die Crew eine steinerne Schale für frische Früchte.'],
      ['Broken pillars lie among giant leaves in the Ruined Court.', 'A floor mosaic shows a monkey wearing a crown of bananas.', 'Beneath a loose tile, the crew discovers a stone bowl for fresh fruit.']
    ),
    entry(
      ['Der Grüne Altar ist vollständig mit Moos bedeckt und dennoch vollkommen eben.', 'In seiner Mitte sammelt eine flache Schale jeden Tropfen Regenwasser.', 'Blätter, die darin gewaschen werden, bleiben der Legende nach bis zum Sonnenuntergang frisch.'],
      ['The Green Altar is completely covered in moss yet perfectly level.', 'A shallow bowl at its centre catches every drop of rainwater.', 'Leaves washed in it are said to remain fresh until sunset.']
    )
  ],
  [
    entry(
      ['Der Aschehafen liegt an einem Strand aus schwarzem Sand, der unter den Stiefeln warm bleibt.', 'Massive Eisenringe halten die Schiffe fest, wenn heiße Böen vom Vulkan herabstürzen.', 'Ein Lotse reicht der Crew ein Tuch gegen die Asche und weist zur Schmiede.'],
      ['Ash Harbour lies on a beach of black sand that remains warm beneath your boots.', 'Massive iron rings hold ships fast when hot gusts tumble down from the volcano.', 'A pilot hands the crew a cloth against the ash and points toward the Forge.'],
      { de: 'Welche Farbe hat der Sand am Aschehafen?', en: 'What colour is the sand at Ash Harbour?', correct: { de: 'Schwarz', en: 'Black' }, wrong: [{ de: 'Weiß', en: 'White' }, { de: 'Rot', en: 'Red' }] }
    ),
    entry(
      ['In der Schmiede stehen drei Ambosse nebeneinander unter einer rußigen Decke.', 'Der kleinste von ihnen klingt beim Anschlagen so hell wie eine Schiffsglocke.', 'Die Schmiedin sagt, nur dieser Ton verrate reines und belastbares Metall.'],
      ['Three anvils stand side by side beneath the sooty roof of the Forge.', 'The smallest rings as brightly as a ship’s bell when struck.', 'The smith says only that sound reveals pure and dependable metal.'],
      { de: 'Welcher Amboss klingt in der Schmiede wie eine Schiffsglocke?', en: 'Which anvil rings like a ship’s bell in the Forge?', correct: { de: 'Der kleinste Amboss', en: 'The smallest anvil' }, wrong: [{ de: 'Der größte Amboss', en: 'The largest anvil' }, { de: 'Der mittlere Amboss', en: 'The middle anvil' }] }
    ),
    entry(
      ['Die Lavabrücke spannt sich über einen glühenden Strom und vibriert bei jedem Schritt.', 'Blaue Kristalle wachsen an ihrem Geländer und bleiben selbst in der Hitze überraschend kühl.', 'Die Crew hält sich daran fest und überquert die Schlucht ohne stehen zu bleiben.'],
      ['Lava Bridge spans a glowing river and trembles with every step.', 'Blue crystals grow along its rail and remain surprisingly cool even in the heat.', 'The crew grips them and crosses the gorge without stopping.'],
      { de: 'Welche Farbe haben die kühlen Kristalle an der Lavabrücke?', en: 'What colour are the cool crystals on Lava Bridge?', correct: { de: 'Blau', en: 'Blue' }, wrong: [{ de: 'Grün', en: 'Green' }, { de: 'Orange', en: 'Orange' }] }
    ),
    entry(
      ['Das Festungstor ist mit einem bronzenen Rad in Form einer Sonne verriegelt.', 'Entgegen jeder Erwartung öffnet es sich nach innen und gibt einen stillen Hof frei.', 'Über dem Bogen steht, dass Geduld stärker sei als Feuer.'],
      ['Fortress Gate is locked by a bronze wheel shaped like the sun.', 'Against every expectation, it opens inward to reveal a silent courtyard.', 'Above the arch, an inscription says patience is stronger than fire.']
    ),
    entry(
      ['Die Vulkanküche wurde direkt in den warmen Fels der Festung gebaut.', 'Über der größten Feuerstelle hängt eine kupferne Haube in Form eines schlafenden Drachen.', 'Jeder aufsteigende Duft lässt seine dünnen Metallflügel leise klappern.'],
      ['The Volcano Galley was built directly into the warm rock of the fortress.', 'A copper hood shaped like a sleeping dragon hangs above the largest hearth.', 'Every rising aroma makes its thin metal wings rattle softly.']
    ),
    entry(
      ['Auf dem Feuerplateau stehen sechs Basaltstühle um eine flache Schale voller Glut.', 'Von hier wirkt das Meer dunkelblau und der Rauch des Vulkans beinahe violett.', 'Die Crew erkennt, dass dieser Ort seit Generationen für große Festessen genutzt wird.'],
      ['Six basalt chairs stand around a shallow bowl of embers on Fire Plateau.', 'From here the sea looks dark blue and the volcanic smoke almost violet.', 'The crew realises that this place has hosted great feasts for generations.']
    )
  ],
  [
    entry(
      ['Am Palmenstrand liegt der Sand weich und hell zwischen ruhigen Wellen.', 'Eine einzelne krumme Palme zeigt mit ihrer Spitze genau auf eine verborgene Süßwasserquelle.', 'Die Crew füllt ihre Becher und hört Kokosnüsse hoch über sich gegeneinander klopfen.'],
      ['The sand of Palm Beach lies soft and pale beside calm waves.', 'A single crooked palm points directly toward a hidden freshwater spring.', 'The crew fills its cups and hears coconuts knocking together high overhead.'],
      { de: 'Worauf zeigt die krumme Palme am Palmenstrand?', en: 'What does the crooked palm on Palm Beach point toward?', correct: { de: 'Eine Süßwasserquelle', en: 'A freshwater spring' }, wrong: [{ de: 'Eine Schatztruhe', en: 'A treasure chest' }, { de: 'Ein Schiffswrack', en: 'A shipwreck' }] }
    ),
    entry(
      ['Die Obstplantage zieht sich in ordentlichen Reihen einen sonnigen Hang hinauf.', 'Kleine Messingglöckchen zwischen den Bäumen halten neugierige Affen von den reifen Früchten fern.', 'Der Plantagenmeister trägt ein Hemd mit einem auffälligen Mangomuster.'],
      ['The Fruit Plantation climbs a sunny slope in neat rows.', 'Small brass bells between the trees keep curious monkeys away from the ripe fruit.', 'The plantation keeper wears a shirt covered in a bold mango pattern.'],
      { de: 'Was hält auf der Obstplantage die Affen fern?', en: 'What keeps the monkeys away at the Fruit Plantation?', correct: { de: 'Messingglöckchen', en: 'Brass bells' }, wrong: [{ de: 'Bunte Fahnen', en: 'Colourful flags' }, { de: 'Holztrommeln', en: 'Wooden drums' }] }
    ),
    entry(
      ['Der Zuckerpfad schimmert im Sonnenlicht, obwohl hier kein Schnee liegt.', 'Weiße Steine am Wegesrand glitzern nachts wie verstreute Zuckerkristalle.', 'Eine Tafel bittet Reisende freundlich, die Steine nur anzusehen und niemals zu probieren.'],
      ['Sugar Trail shimmers in the sunlight although no snow lies here.', 'White stones beside the path glitter at night like scattered sugar crystals.', 'A sign politely asks travellers to look at the stones and never taste them.'],
      { de: 'Was sollen Reisende mit den weißen Steinen am Zuckerpfad nicht tun?', en: 'What must travellers not do with the white stones on Sugar Trail?', correct: { de: 'Sie probieren', en: 'Taste them' }, wrong: [{ de: 'Sie ansehen', en: 'Look at them' }, { de: 'An ihnen vorbeigehen', en: 'Walk past them' }] }
    ),
    entry(
      ['Die Lagune liegt windstill zwischen Felsen und blühenden Büschen.', 'Kleine Fische leuchten türkis, sobald süßer Fruchtsaft ins Wasser tropft.', 'Die Crew hält ihre Vorräte gut fest und beobachtet das flackernde Licht.'],
      ['The Lagoon lies still between rocks and flowering bushes.', 'Small fish glow turquoise whenever sweet fruit juice drips into the water.', 'The crew holds its supplies carefully and watches the flickering light.']
    ),
    entry(
      ['Die Eishöhle öffnet sich hinter einem Vorhang aus langen, kalten Wurzeln.', 'Eine tiefblaue Wand im Inneren schmilzt selbst dann nicht, wenn draußen die Mittagssonne brennt.', 'Eiszapfen klingen im Luftzug wie ein vorsichtig gespieltes Glockenspiel.'],
      ['The Ice Cave opens behind a curtain of long cold roots.', 'A deep-blue wall inside never melts even when the noon sun burns outside.', 'Icicles chime in the draught like a gently played glockenspiel.']
    ),
    entry(
      ['Der Sonnenpavillon trägt ein Dach aus bernsteinfarbenen Glasscheiben.', 'Sein runder Tisch lässt sich drehen, damit Speisen stets im Schatten bleiben.', 'Als die Crew eintritt, wandert ein goldener Lichtfleck langsam über den Boden.'],
      ['The Sun Pavilion has a roof made from amber-coloured glass panes.', 'Its round table can turn so that food always remains in the shade.', 'As the crew enters, a golden patch of light moves slowly across the floor.']
    )
  ],
  [
    entry(
      ['Die Strandbar wurde aus dem Mast eines alten Handelsschiffs und breiten Planken gebaut.', 'Über dem Tresen hängt eine kleine Glocke, die jede neue Bestellung ankündigt.', 'Der Barkeeper behauptet, sie könne zwischen mutigen und langweiligen Getränken unterscheiden.'],
      ['The Beach Bar was built from the mast of an old merchant ship and broad planks.', 'A small bell above the counter announces every new order.', 'The bartender claims it can tell brave drinks from boring ones.'],
      { de: 'Was hängt über dem Tresen der Strandbar?', en: 'What hangs above the counter at the Beach Bar?', correct: { de: 'Eine kleine Glocke', en: 'A small bell' }, wrong: [{ de: 'Ein goldenes Steuerrad', en: 'A golden wheel' }, { de: 'Eine rote Laterne', en: 'A red lantern' }] }
    ),
    entry(
      ['Das Schiffswrack liegt schräg im Sand, als wäre es mitten in einer Welle erstarrt.', 'In der Kapitänskajüte ist ein Kompass an den Tisch genagelt, dessen Nadel unbeirrbar landeinwärts zeigt.', 'Zwischen den Planken findet die Crew eine noch lesbare Karte der Bucht.'],
      ['The Shipwreck lies tilted in the sand as though frozen halfway through a wave.', 'In the captain’s cabin, a compass is nailed to the table and its needle points stubbornly inland.', 'Between the planks, the crew finds a chart of the cove that can still be read.'],
      { de: 'Wohin zeigt der festgenagelte Kompass im Schiffswrack?', en: 'Where does the nailed-down compass in the Shipwreck point?', correct: { de: 'Landeinwärts', en: 'Inland' }, wrong: [{ de: 'Auf das offene Meer', en: 'Out to sea' }, { de: 'Nach Norden', en: 'North' }] }
    ),
    entry(
      ['Die Eishöhle der Piratenbucht ist kleiner als die Höhle der Tropeninsel und riecht nach Salz.', 'In einer Nische steht ein gefrorenes Fass, auf dessen Deckel zwei gekreuzte Schlüssel eingeritzt sind.', 'Niemand kennt das Schloss dazu, doch das Zeichen taucht auch auf alten Cocktailbechern auf.'],
      ['The Ice Cave in Pirate Cove is smaller than the Tropical Island cave and smells of salt.', 'A frozen barrel stands in a niche with two crossed keys carved into its lid.', 'Nobody knows the matching lock, but the same sign appears on old cocktail cups.'],
      { de: 'Welches Zeichen ist in das gefrorene Fass geritzt?', en: 'Which symbol is carved into the frozen barrel?', correct: { de: 'Zwei gekreuzte Schlüssel', en: 'Two crossed keys' }, wrong: [{ de: 'Drei Sterne', en: 'Three stars' }, { de: 'Ein einzelner Anker', en: 'A single anchor' }] }
    ),
    entry(
      ['Am Anlegesteg hängen Seile mit Dutzenden verschiedener Knoten.', 'Jeder Knoten trägt auf einem Holzschild den Namen einer früheren Kapitänin oder eines früheren Kapitäns.', 'Die Crew ergänzt einen einfachen neuen Knoten für ihre eigene Reise.'],
      ['Dozens of different knots hang from the ropes at Landing Pier.', 'Each knot bears a wooden tag naming a former captain.', 'The crew adds one simple new knot for its own voyage.']
    ),
    entry(
      ['Das Kapitänsdeck überragt die Bucht und ist von Laternen umgeben.', 'Dem großen Steuerrad fehlt ausgerechnet die Speiche, die nach Osten zeigen würde.', 'Trotzdem dreht es sich im Abendwind langsam in Richtung Schatzbucht.'],
      ['Captain’s Deck overlooks the cove and is surrounded by lanterns.', 'The great wheel is missing the very spoke that would point east.', 'Even so, it turns slowly toward Treasure Bay in the evening wind.']
    ),
    entry(
      ['Die Schatzbucht wirkt bei hoher Flut wie ein gewöhnlicher Halbmond aus Sand.', 'Bei sinkendem Wasser erscheint jedoch ein Felsen in Form eines grinsenden Schädels.', 'In seinem Schatten wartet die letzte Truhe, deren Inhalt nur für die ganze Crew bestimmt ist.'],
      ['At high tide, Treasure Bay looks like an ordinary crescent of sand.', 'As the water falls, a rock shaped like a grinning skull appears.', 'The final chest waits in its shadow, and its contents are meant for the whole crew.']
    )
  ]
]);

const locationKey = (chapterIndex, locationIndex) => `${chapterIndex}:${locationIndex}`;
const rotateAnswers = (answers, offset) => answers.map((_, index) => answers[(index + offset) % answers.length]);
const question = (de, en, correctDe, correctEn, wrong1De, wrong1En, wrong2De, wrong2En) => ({
  de,
  en,
  correct: { de: correctDe, en: correctEn },
  wrong: [{ de: wrong1De, en: wrong1En }, { de: wrong2De, en: wrong2En }]
});

const ISLAND_STORIES = Object.freeze([
  {
    de: [
      'Die Tapasinsel ist eine lebhafte Hafeninsel, deren weiße Häuser sich dicht um die geschützte Bucht drängen.',
      'Über dem höchsten Dach weht ein rotes Segel mit einem silbernen Anker als Zeichen für friedliche Gäste.',
      'Die Inselbewohner begrüßen ankommende Crews mit kleinen Tellern und tauschen Neuigkeiten gegen einen ehrlichen Trinkspruch.',
      'Wer die Insel friedlich umrundet, darf am Abend die große Messingglocke am Rathaus läuten.'
    ],
    en: [
      'Tapas Island is a lively harbour island whose white houses crowd around a sheltered bay.',
      'A red sail bearing a silver anchor flies above the highest roof as a sign for peaceful visitors.',
      'The islanders welcome arriving crews with small plates and trade news for an honest toast.',
      'Anyone who circles the island in peace may ring the great brass bell at the town hall that evening.'
    ],
    quizzes: [
      question('Welches Zeichen trägt das rote Segel der Tapasinsel?', 'Which symbol appears on the red sail of Tapas Island?', 'Einen silbernen Anker', 'A silver anchor', 'Einen goldenen Kraken', 'A golden octopus', 'Eine blaue Krone', 'A blue crown'),
      question('Aus welchem Material besteht die große Glocke am Rathaus?', 'What is the great bell at the town hall made from?', 'Messing', 'Brass', 'Kupfer', 'Copper', 'Silber', 'Silver')
    ]
  },
  {
    de: [
      'Die Nebelinsel liegt über warmen unterirdischen Quellen, deren Dampf jeden Morgen durch Felsspalten steigt.',
      'Die Fährleute orientieren sich im dichten Weiß an drei kurzen Hornstößen, die von Tal zu Tal beantwortet werden.',
      'An sicheren Kreuzungen hängen violette Schilfbündel, während unmarkierte Pfade tiefer ins Moor führen.',
      'Im Inselinneren soll ein alter Kessel stehen, der niemals ganz auskühlt.'
    ],
    en: [
      'Mist Island rests above warm underground springs whose steam rises through cracks in the rock each morning.',
      'The ferrymen navigate the dense white mist by three short horn calls answered from valley to valley.',
      'Purple bundles of reeds mark safe crossings, while unmarked paths lead deeper into the marsh.',
      'An ancient cauldron said never to grow completely cold waits in the island’s interior.'
    ],
    quizzes: [
      question('Was erzeugt jeden Morgen den Nebel der Nebelinsel?', 'What creates the mist on Mist Island each morning?', 'Warme unterirdische Quellen', 'Warm underground springs', 'Ein gefrorener See', 'A frozen lake', 'Rauchende Lagerfeuer', 'Smoking campfires'),
      question('Wie viele kurze Hornstöße weisen den Fährleuten den Weg?', 'How many short horn calls guide the ferrymen?', 'Drei', 'Three', 'Zwei', 'Two', 'Sieben', 'Seven')
    ]
  },
  {
    de: [
      'Die Dschungelinsel wird von einem so dichten Blätterdach bedeckt, dass selbst mittags grünes Dämmerlicht herrscht.',
      'Steinerne Jaguare bewachen die alten Wege zwischen Fluss, Ruinen und Tempelgärten.',
      'Forscher markieren sichere Rückwege mit gelben Schnüren, die hoch genug hängen, um nicht von Tieren fortgetragen zu werden.',
      'Unter der Insel fließt ein klarer Strom, der an Wasserfällen und Quellen wieder ans Licht tritt.'
    ],
    en: [
      'Jungle Island is covered by such a dense canopy that green twilight remains even at midday.',
      'Stone jaguars guard the old paths between river, ruins, and temple gardens.',
      'Explorers mark safe return routes with yellow cords hung high enough that animals cannot carry them away.',
      'A clear current flows beneath the island and returns to daylight at waterfalls and springs.'
    ],
    quizzes: [
      question('Welche Tiere bewachen als Steinfiguren die alten Wege?', 'Which animals guard the old paths as stone figures?', 'Jaguare', 'Jaguars', 'Papageien', 'Parrots', 'Affen', 'Monkeys'),
      question('Welche Farbe haben die Schnüre für sichere Rückwege?', 'What colour are the cords marking safe return routes?', 'Gelb', 'Yellow', 'Rot', 'Red', 'Blau', 'Blue')
    ]
  },
  {
    de: [
      'Die Vulkaninsel erhebt sich wie ein Ring aus schwarzem Basalt um einen rauchenden Gipfel.',
      'Schmieden, Festungsmauern und Küchen nutzen dieselbe Erdwärme, die durch sorgfältig gemauerte Kanäle geleitet wird.',
      'Bei Sonnenuntergang schimmert der Vulkanrauch violett, obwohl die Glut darunter orange bleibt.',
      'Vor großen Festen gießt die Inselwache einen Becher Wasser auf einen warmen Stein und hört am Zischen, ob der Wind günstig steht.'
    ],
    en: [
      'Volcano Island rises like a ring of black basalt around a smoking summit.',
      'Forges, fortress walls, and kitchens share the same geothermal heat carried through carefully built channels.',
      'At sunset the volcanic smoke shimmers violet although the embers beneath remain orange.',
      'Before great feasts, the island watch pours a cup of water onto a warm stone and judges the wind by its hiss.'
    ],
    quizzes: [
      question('Aus welchem Gestein besteht der Ring der Vulkaninsel?', 'Which rock forms the ring of Volcano Island?', 'Schwarzer Basalt', 'Black basalt', 'Weißer Marmor', 'White marble', 'Roter Sandstein', 'Red sandstone'),
      question('Was gießt die Inselwache vor großen Festen auf einen warmen Stein?', 'What does the island watch pour onto a warm stone before great feasts?', 'Einen Becher Wasser', 'A cup of water', 'Eine Schale Öl', 'A bowl of oil', 'Einen Krug Wein', 'A jug of wine')
    ]
  },
  {
    de: [
      'Die Tropeninsel besitzt sieben Süßwasserquellen, die zwischen Palmen, Obstgärten und warmen Lagunen hervortreten.',
      'Eine goldene Geckofigur gilt als Inselzeichen und ist an jedem Wegweiser zu finden.',
      'Zum Sonnenuntergang erklingen vom Strand zwei tiefe Muschelhorn-Töne, damit alle Ernteboote sicher zurückkehren.',
      'Die Bewohner teilen reife Früchte zuerst mit Gästen und lagern den Rest in kühlen Felshöhlen.'
    ],
    en: [
      'Tropical Island has seven freshwater springs emerging among palms, orchards, and warm lagoons.',
      'A golden gecko figure is the island emblem and appears on every signpost.',
      'At sunset two low conch-horn notes sound from the beach so every harvest boat returns safely.',
      'The islanders share ripe fruit with guests first and store the rest in cool rock caves.'
    ],
    quizzes: [
      question('Welches Tier zeigt das goldene Inselzeichen der Tropeninsel?', 'Which animal appears on Tropical Island’s golden emblem?', 'Einen Gecko', 'A gecko', 'Einen Delfin', 'A dolphin', 'Einen Papagei', 'A parrot'),
      question('Wie viele tiefe Muschelhorn-Töne erklingen bei Sonnenuntergang?', 'How many low conch-horn notes sound at sunset?', 'Zwei', 'Two', 'Drei', 'Three', 'Fünf', 'Five')
    ]
  },
  {
    de: [
      'Die Piratenbucht liegt verborgen unter einer schwarzen Klippe und dient freien Crews seit Generationen als friedlicher Zufluchtsort.',
      'Drei bernsteinfarbene Laternen am Eingang bedeuten, dass Waffen verstaut und Streitigkeiten an Land gelassen werden.',
      'Ein alter Kompass ist über der Strandbar festgenagelt und zeigt stets zur schmalen Einfahrt der Bucht.',
      'Nach dem ältesten Gesetz der Bucht muss der letzte Schatz einer Reise mit der gesamten Crew geteilt werden.'
    ],
    en: [
      'Pirate Cove lies hidden beneath a black cliff and has served free crews as a peaceful refuge for generations.',
      'Three amber lanterns at the entrance mean that weapons must be stowed and quarrels left ashore.',
      'An old compass is nailed above the beach bar and always points toward the cove’s narrow entrance.',
      'Under the cove’s oldest law, the final treasure of a voyage must be shared with the entire crew.'
    ],
    quizzes: [
      question('Wie viele bernsteinfarbene Laternen markieren den Eingang der Piratenbucht?', 'How many amber lanterns mark the entrance to Pirate Cove?', 'Drei', 'Three', 'Zwei', 'Two', 'Sechs', 'Six'),
      question('Mit wem muss der letzte Schatz nach dem ältesten Gesetz geteilt werden?', 'Who must share the final treasure under the oldest law?', 'Mit der gesamten Crew', 'The entire crew', 'Nur mit dem Kapitän', 'Only the captain', 'Mit der Inselwache', 'The island watch')
    ]
  }
]);

const DETAIL_QUESTIONS = Object.freeze([
  [
    [question('Welche Tiere kreisen über den schiefen Masten des Hafenbeckens?', 'Which animals circle above the crooked masts of the Harbour Basin?', 'Möwen', 'Gulls', 'Raben', 'Ravens', 'Fledermäuse', 'Bats'), question('Was öffnen die Händler nach dem Glockenton?', 'What do the merchants open after the bell rings?', 'Ihre ersten Vorratskisten', 'Their first provision crates', 'Das Stadttor', 'The town gate', 'Ein Segel', 'A sail')],
    [question('Welches Material hat der große Spiegel im Leuchtturm?', 'What is the great mirror in the Lighthouse made from?', 'Kupfer', 'Copper', 'Silber', 'Silver', 'Glas', 'Glass'), question('Wohin zeigt der Lichtstrahl des Leuchtturms?', 'Where does the Lighthouse beam point?', 'Zur sichersten Passage', 'Toward the safest passage', 'Zum Dorfplatz', 'Toward the Village Square', 'Zum höchsten Berg', 'Toward the highest mountain')],
    [question('Welche Form hat der Brunnen auf dem Dorfplatz?', 'What shape is the fountain in the Village Square?', 'Ein freundlicher Krake', 'A friendly octopus', 'Ein Seepferdchen', 'A seahorse', 'Ein Segelschiff', 'A sailing ship'), question('Was werfen die Kinder in den Brunnen?', 'What do the children toss into the fountain?', 'Olivenkerne', 'Olive stones', 'Kupfermünzen', 'Copper coins', 'Muscheln', 'Shells')],
    [question('Welche Farbe hat die Markise der Gewürzhändlerin?', 'What colour is the spice merchant’s canopy?', 'Rot', 'Red', 'Blau', 'Blue', 'Grün', 'Green'), question('Wer rät dazu, nie den ersten Preis zu bezahlen?', 'Who advises never paying the first price?', 'Der Papagei', 'The parrot', 'Der Leuchtturmwärter', 'The lighthouse keeper', 'Ein Affe', 'A monkey')],
    [question('Was teilte den ältesten Olivenbaum?', 'What split the oldest olive tree?', 'Ein Blitz', 'Lightning', 'Eine Axt', 'An axe', 'Ein Sturmsegel', 'A storm sail'), question('Welche Farbe hat das Band am ältesten Baum?', 'What colour is the ribbon on the oldest tree?', 'Silbern', 'Silver', 'Rot', 'Red', 'Blau', 'Blue')],
    [question('Welche Planke am Schmugglersteg knarrt besonders laut?', 'Which plank on Smuggler’s Pier creaks especially loudly?', 'Die dritte', 'The third', 'Die erste', 'The first', 'Die siebte', 'The seventh'), question('Welches Zeichen findet die Crew unter dem Geländer?', 'Which sign does the crew find beneath the rail?', 'Einen Kreideanker', 'A chalk anchor', 'Einen roten Stern', 'A red star', 'Drei Kreise', 'Three circles')]
  ],
  [
    [question('Welcher Gegenstand liegt an der Nebelquelle?', 'Which object rests at Mist Spring?', 'Eine eiserne Kelle', 'An iron ladle', 'Ein goldener Becher', 'A golden cup', 'Ein Holzschwert', 'A wooden sword'), question('Was wird sichtbar, als die Crew die Kelle anhebt?', 'What becomes visible when the crew lifts the ladle?', 'Ein schmaler Pfad', 'A narrow path', 'Eine Schatztruhe', 'A treasure chest', 'Ein Segel', 'A sail')],
    [question('Welche Farbe haben die Kräuterbündel über der Hüttentür?', 'What colour are the herb bundles above the hut door?', 'Blau', 'Blue', 'Gelb', 'Yellow', 'Weiß', 'White'), question('Womit zeichnet die Kräuterkundige sichere Wege?', 'What does the herbalist use to draw safe routes?', 'Mit grüner Kreide', 'Green chalk', 'Mit schwarzer Kohle', 'Black charcoal', 'Mit roter Tinte', 'Red ink')],
    [question('Welche Tiere meiden die Pilzkreise?', 'Which animals avoid the mushroom circles?', 'Schwarze Raben', 'Black ravens', 'Weiße Hasen', 'White rabbits', 'Rote Füchse', 'Red foxes'), question('Welches Geräusch hört die Crew tief im Pilzwald?', 'Which sound does the crew hear deep in Mushroom Wood?', 'Einen klappernden Kessel', 'A rattling cauldron', 'Eine Kirchenglocke', 'A church bell', 'Eine Geige', 'A violin')],
    [question('Welche Farbe zeigen die Laternen bei einer sicheren Planke?', 'What colour do the lanterns show for a safe plank?', 'Grün', 'Green', 'Rot', 'Red', 'Violett', 'Purple'), question('Was ist im dunklen Wasser unter dem Moorsteg nicht zu sehen?', 'What cannot be seen in the dark water beneath the Mooring Walk?', 'Der Himmel', 'The sky', 'Das Schilf', 'The reeds', 'Die Laternen', 'The lanterns')],
    [question('Woran erinnern die Wände des Steinbruchs?', 'What do the Quarry walls resemble?', 'An eine aufgeschlagene Chronik', 'An open chronicle', 'An ein Piratensegel', 'A pirate sail', 'An einen Kessel', 'A cauldron'), question('Welches Wetter kündigen die singenden Steine an?', 'Which weather do the singing stones predict?', 'Regen', 'Rain', 'Schnee', 'Snow', 'Windstille', 'Calm weather')],
    [question('Wie viele Speichen hat das Messingrad im Alten Pumpwerk?', 'How many spokes does the brass wheel in the Old Pump House have?', 'Sieben', 'Seven', 'Fünf', 'Five', 'Neun', 'Nine'), question('Wohin leitet das Rad klares Wasser?', 'Where does the wheel send clear water?', 'Zum verlassenen Kesselraum', 'To the abandoned cauldron room', 'Zum Dorfplatz', 'To the Village Square', 'In den Steinbruch', 'Into the Quarry')]
  ],
  [
    [question('Was funkelt im Auge des Jaguars am Dschungeltor?', 'What glitters in the jaguar’s eye at the Jungle Gate?', 'Schwarzer Obsidian', 'Black obsidian', 'Ein Rubin', 'A ruby', 'Eine Perle', 'A pearl'), question('Was geschieht hinter der Crew nach dem Durchqueren des Tors?', 'What happens behind the crew after passing through the gate?', 'Die Ranken schließen sich', 'The vines close', 'Eine Brücke klappt hoch', 'A bridge rises', 'Fackeln gehen an', 'Torches light up')],
    [question('Was wächst im nördlichen Beet des Tempelgartens?', 'What grows in the northern bed of the Temple Garden?', 'Minze', 'Mint', 'Rosmarin', 'Rosemary', 'Lavendel', 'Lavender'), question('Wie sind die vier Beete des Tempelgartens ausgerichtet?', 'How are the four Temple Garden beds aligned?', 'Nach den Himmelsrichtungen', 'To the compass directions', 'Nach den Jahreszeiten', 'To the seasons', 'Nach den Mondphasen', 'To the moon phases')],
    [question('Welche Federn markieren den sicheren Weg?', 'Which feathers mark the safe route?', 'Rote Federn', 'Red feathers', 'Blaue Federn', 'Blue feathers', 'Weiße Federn', 'White feathers'), question('Wohin führen die blauen Federn am Papageienpfad?', 'Where do the blue feathers on Parrot Trail lead?', 'Zu sumpfigem Boden', 'Toward marshy ground', 'Zum Wasserfall', 'Toward the Waterfall', 'Zum Grünen Altar', 'Toward the Green Altar')],
    [question('Wie viele alte Tonbecher liegen hinter dem Wasserfall?', 'How many old clay cups lie behind the Waterfall?', 'Drei', 'Three', 'Zwei', 'Two', 'Sechs', 'Six'), question('Woran erinnert das Rauschen für einen Moment?', 'What does the roar briefly sound like?', 'An fernen Applaus', 'Distant applause', 'An Kanonendonner', 'Cannon fire', 'An ein Schlaflied', 'A lullaby')],
    [question('Welches Tier zeigt das Mosaik im Ruinenhof?', 'Which animal appears in the Ruined Court mosaic?', 'Einen Affen', 'A monkey', 'Einen Jaguar', 'A jaguar', 'Einen Papagei', 'A parrot'), question('Woraus besteht die Krone des Tieres im Mosaik?', 'What is the animal’s crown in the mosaic made from?', 'Aus Bananen', 'Bananas', 'Aus Federn', 'Feathers', 'Aus Goldmünzen', 'Gold coins')],
    [question('Was sammelt die Schale auf dem Grünen Altar?', 'What does the bowl on the Green Altar collect?', 'Regenwasser', 'Rainwater', 'Blütenblätter', 'Flower petals', 'Münzen', 'Coins'), question('Wie lange bleiben dort gewaschene Blätter der Legende nach frisch?', 'How long are leaves washed there said to remain fresh?', 'Bis zum Sonnenuntergang', 'Until sunset', 'Bis zum nächsten Morgen', 'Until the next morning', 'Genau eine Stunde', 'Exactly one hour')]
  ],
  [
    [question('Welche Farbe hat der Sand am Aschehafen?', 'What colour is the sand at Ash Harbour?', 'Schwarz', 'Black', 'Weiß', 'White', 'Rot', 'Red'), question('Was reicht der Lotse der Crew gegen die Asche?', 'What does the pilot give the crew against the ash?', 'Ein Tuch', 'A cloth', 'Einen Helm', 'A helmet', 'Einen Eimer Wasser', 'A bucket of water')],
    [question('Welcher Amboss klingt wie eine Schiffsglocke?', 'Which anvil rings like a ship’s bell?', 'Der kleinste', 'The smallest', 'Der größte', 'The largest', 'Der mittlere', 'The middle'), question('Wie viele Ambosse stehen in der Schmiede nebeneinander?', 'How many anvils stand side by side in the Forge?', 'Drei', 'Three', 'Zwei', 'Two', 'Fünf', 'Five')],
    [question('Welche Farbe haben die kühlen Kristalle an der Lavabrücke?', 'What colour are the cool crystals on Lava Bridge?', 'Blau', 'Blue', 'Grün', 'Green', 'Orange', 'Orange'), question('Was tut die Lavabrücke bei jedem Schritt?', 'What does Lava Bridge do with every step?', 'Sie vibriert', 'It trembles', 'Sie wird länger', 'It grows longer', 'Sie leuchtet weiß', 'It glows white')],
    [question('Welche Form hat das bronzene Rad am Festungstor?', 'What shape is the bronze wheel at Fortress Gate?', 'Eine Sonne', 'A sun', 'Ein Mond', 'A moon', 'Ein Anker', 'An anchor'), question('In welche Richtung öffnet sich das Festungstor?', 'In which direction does Fortress Gate open?', 'Nach innen', 'Inward', 'Nach außen', 'Outward', 'Nach oben', 'Upward')],
    [question('Welche Form hat die kupferne Haube in der Vulkanküche?', 'What shape is the copper hood in the Volcano Galley?', 'Ein schlafender Drache', 'A sleeping dragon', 'Ein Kraken', 'An octopus', 'Ein Vulkan', 'A volcano'), question('Was lässt die Metallflügel der Haube klappern?', 'What makes the hood’s metal wings rattle?', 'Aufsteigende Düfte', 'Rising aromas', 'Die Kirchenglocke', 'The church bell', 'Fallende Münzen', 'Falling coins')],
    [question('Wie viele Basaltstühle stehen auf dem Feuerplateau?', 'How many basalt chairs stand on Fire Plateau?', 'Sechs', 'Six', 'Vier', 'Four', 'Acht', 'Eight'), question('Welche Farbe scheint der Vulkanrauch vom Plateau aus zu haben?', 'What colour does the volcanic smoke appear from the plateau?', 'Beinahe violett', 'Almost violet', 'Leuchtend grün', 'Bright green', 'Schneeweiß', 'Snow white')]
  ],
  [
    [question('Worauf zeigt die krumme Palme am Palmenstrand?', 'What does the crooked palm on Palm Beach point toward?', 'Eine Süßwasserquelle', 'A freshwater spring', 'Eine Schatztruhe', 'A treasure chest', 'Ein Schiffswrack', 'A shipwreck'), question('Was hört die Crew hoch über sich gegeneinander klopfen?', 'What does the crew hear knocking together high above?', 'Kokosnüsse', 'Coconuts', 'Glocken', 'Bells', 'Holzschilder', 'Wooden signs')],
    [question('Was hält auf der Obstplantage die Affen fern?', 'What keeps the monkeys away at the Fruit Plantation?', 'Messingglöckchen', 'Brass bells', 'Bunte Fahnen', 'Colourful flags', 'Holztrommeln', 'Wooden drums'), question('Welches Muster trägt das Hemd des Plantagenmeisters?', 'Which pattern is on the plantation keeper’s shirt?', 'Mangos', 'Mangoes', 'Anker', 'Anchors', 'Papageien', 'Parrots')],
    [question('Was sollen Reisende mit den weißen Steinen nicht tun?', 'What must travellers not do with the white stones?', 'Sie probieren', 'Taste them', 'Sie ansehen', 'Look at them', 'An ihnen vorbeigehen', 'Walk past them'), question('Woran erinnern die weißen Steine nachts?', 'What do the white stones resemble at night?', 'An verstreute Zuckerkristalle', 'Scattered sugar crystals', 'An glühende Kohlen', 'Glowing coals', 'An Olivenkerne', 'Olive stones')],
    [question('Welche Farbe haben die leuchtenden Fische in der Lagune?', 'What colour are the glowing fish in the Lagoon?', 'Türkis', 'Turquoise', 'Rot', 'Red', 'Golden', 'Golden'), question('Was bringt die Fische zum Leuchten?', 'What makes the fish glow?', 'Tropfender Fruchtsaft', 'Dripping fruit juice', 'Der Mondschein', 'Moonlight', 'Ein Glockenton', 'A bell ring')],
    [question('Welche Farbe hat die Wand, die in der Eishöhle nicht schmilzt?', 'What colour is the wall that never melts in the Ice Cave?', 'Tiefblau', 'Deep blue', 'Bernsteinfarben', 'Amber', 'Silbern', 'Silver'), question('Woran erinnert der Klang der Eiszapfen?', 'What does the sound of the icicles resemble?', 'An ein Glockenspiel', 'A glockenspiel', 'An eine Trommel', 'A drum', 'An Möwenrufe', 'Gull cries')],
    [question('Woraus besteht das Dach des Sonnenpavillons?', 'What is the Sun Pavilion roof made from?', 'Aus bernsteinfarbenem Glas', 'Amber-coloured glass', 'Aus Palmblättern', 'Palm leaves', 'Aus blauem Metall', 'Blue metal'), question('Warum lässt sich der runde Tisch drehen?', 'Why can the round table turn?', 'Damit Speisen im Schatten bleiben', 'So food remains in the shade', 'Damit er Musik spielt', 'So it plays music', 'Damit Münzen sortiert werden', 'So coins can be sorted')]
  ],
  [
    [question('Was hängt über dem Tresen der Strandbar?', 'What hangs above the counter at the Beach Bar?', 'Eine kleine Glocke', 'A small bell', 'Ein goldenes Steuerrad', 'A golden wheel', 'Eine rote Laterne', 'A red lantern'), question('Woraus wurde die Strandbar gebaut?', 'What was the Beach Bar built from?', 'Aus einem alten Mast und Planken', 'An old mast and planks', 'Aus schwarzem Basalt', 'Black basalt', 'Aus Tempelsäulen', 'Temple columns')],
    [question('Wohin zeigt der festgenagelte Kompass im Schiffswrack?', 'Where does the nailed-down compass in the Shipwreck point?', 'Landeinwärts', 'Inland', 'Auf das offene Meer', 'Out to sea', 'Nach Norden', 'North'), question('Was findet die Crew zwischen den Planken des Wracks?', 'What does the crew find between the wreck’s planks?', 'Eine lesbare Karte der Bucht', 'A readable chart of the cove', 'Eine goldene Krone', 'A golden crown', 'Ein silbernes Band', 'A silver ribbon')],
    [question('Welches Zeichen ist in das gefrorene Fass geritzt?', 'Which symbol is carved into the frozen barrel?', 'Zwei gekreuzte Schlüssel', 'Two crossed keys', 'Drei Sterne', 'Three stars', 'Ein einzelner Anker', 'A single anchor'), question('Wonach riecht die Eishöhle der Piratenbucht?', 'What does Pirate Cove’s Ice Cave smell of?', 'Nach Salz', 'Salt', 'Nach Minze', 'Mint', 'Nach Rauch', 'Smoke')],
    [question('Was steht auf den Holzschildern an den Knoten?', 'What is written on the wooden tags by the knots?', 'Namen früherer Kapitäne', 'Names of former captains', 'Cocktailrezepte', 'Cocktail recipes', 'Münzwerte', 'Coin values'), question('Was ergänzt die Crew am Anlegesteg?', 'What does the crew add at Landing Pier?', 'Einen eigenen einfachen Knoten', 'A simple knot of its own', 'Eine blaue Glocke', 'A blue bell', 'Einen Basaltstuhl', 'A basalt chair')],
    [question('Welche Speiche fehlt dem Steuerrad auf dem Kapitänsdeck?', 'Which spoke is missing from the wheel on Captain’s Deck?', 'Die nach Osten', 'The east-pointing one', 'Die nach Norden', 'The north-pointing one', 'Die nach Westen', 'The west-pointing one'), question('Wohin dreht sich das Steuerrad im Abendwind?', 'Where does the wheel turn in the evening wind?', 'Zur Schatzbucht', 'Toward Treasure Bay', 'Zum Schiffswrack', 'Toward the Shipwreck', 'Zur Strandbar', 'Toward the Beach Bar')],
    [question('Welche Form hat der Felsen bei sinkendem Wasser?', 'What shape is the rock when the water falls?', 'Ein grinsender Schädel', 'A grinning skull', 'Ein schlafender Drache', 'A sleeping dragon', 'Ein freundlicher Krake', 'A friendly octopus'), question('Für wen ist der Inhalt der letzten Truhe bestimmt?', 'Who is the final chest’s contents meant for?', 'Für die ganze Crew', 'The whole crew', 'Nur für den Kapitän', 'Only the captain', 'Für den Barkeeper', 'The bartender')]
  ]
]);

export const ISLAND_STORY_CARDS = Object.freeze(ISLAND_STORIES.map((island, chapterIndex) => ({
  id: `SI${chapterIndex + 1}`,
  storyKind: 'island',
  mandatory: true,
  chapterId: CHAPTERS[chapterIndex].id,
  chapterIndex,
  title: {
    de: `${CHAPTERS[chapterIndex].name.de} · Inselchronik`,
    en: `${CHAPTERS[chapterIndex].name.en} · Island Chronicle`
  },
  story: { de: island.de.join(' '), en: island.en.join(' ') }
})));

export const LOCATION_STORY_CARDS = Object.freeze(LOCATION_STORIES.flatMap((stories, chapterIndex) =>
  stories.map((story, locationIndex) => ({
    id: `SL${chapterIndex + 1}-${locationIndex + 1}`,
    storyKind: 'location',
    mandatory: true,
    chapterId: CHAPTERS[chapterIndex].id,
    chapterIndex,
    locationIndex,
    locationKey: locationKey(chapterIndex, locationIndex),
    title: {
      de: `${CHAPTERS[chapterIndex].locations[locationIndex].de} · Ortschronik der ${CHAPTERS[chapterIndex].name.de}`,
      en: `${CHAPTERS[chapterIndex].locations[locationIndex].en} · Chronicle of ${CHAPTERS[chapterIndex].name.en}`
    },
    story: { de: story.de.join(' '), en: story.en.join(' ') }
  }))
));

const islandDetailQuizzes = ISLAND_STORIES.flatMap((island, chapterIndex) => island.quizzes.map((quiz, quizIndex) => {
  const sourceCard = ISLAND_STORY_CARDS[chapterIndex];
  const rawAnswers = [
    { id: 'correct', label: quiz.correct },
    ...quiz.wrong.map((label, index) => ({ id: `wrong-${index + 1}`, label }))
  ];
  return {
    id: `SQ${chapterIndex + 1}-I${quizIndex + 1}`,
    storyKind: 'quiz',
    quizKind: 'island-detail',
    chapterId: CHAPTERS[chapterIndex].id,
    sourceStoryId: sourceCard.id,
    title: {
      de: `Inselerinnerung ${quizIndex + 1} · ${CHAPTERS[chapterIndex].name.de}`,
      en: `Island Memory ${quizIndex + 1} · ${CHAPTERS[chapterIndex].name.en}`
    },
    question: { de: quiz.de, en: quiz.en },
    answers: rotateAnswers(rawAnswers, (chapterIndex + quizIndex) % rawAnswers.length),
    correctAnswerId: 'correct',
    requirements: { storyIds: [sourceCard.id] }
  };
}));

const locationDetailQuizzes = LOCATION_STORIES.flatMap((stories, chapterIndex) => stories.flatMap((story, locationIndex) => DETAIL_QUESTIONS[chapterIndex][locationIndex].map((quiz, quizIndex) => {
  const sourceCard = LOCATION_STORY_CARDS.find((card) => card.chapterIndex === chapterIndex && card.locationIndex === locationIndex);
  const rawAnswers = [
    { id: 'correct', label: quiz.correct },
    ...quiz.wrong.map((label, index) => ({ id: `wrong-${index + 1}`, label }))
  ];
  const answers = rotateAnswers(rawAnswers, (chapterIndex + locationIndex + quizIndex) % rawAnswers.length);
  return {
    id: `SQ${chapterIndex + 1}-D${locationIndex + 1}-${quizIndex + 1}`,
    storyKind: 'quiz',
    quizKind: 'location-detail',
    chapterId: CHAPTERS[chapterIndex].id,
    sourceStoryId: sourceCard.id,
    title: {
      de: `Erinnerung ${quizIndex + 1} an ${CHAPTERS[chapterIndex].locations[locationIndex].de} · ${CHAPTERS[chapterIndex].name.de}`,
      en: `Memory ${quizIndex + 1} of ${CHAPTERS[chapterIndex].locations[locationIndex].en} · ${CHAPTERS[chapterIndex].name.en}`
    },
    question: { de: quiz.de, en: quiz.en },
    answers,
    correctAnswerId: 'correct',
    requirements: { storyIds: [sourceCard.id] }
  };
})));

const routeQuestionTemplates = [
  { de: 'Welchen dieser Orte hat die Crew auf der {island} bereits besucht?', en: 'Which of these places has the crew already visited on {island}?' },
  { de: 'Welcher Ort liegt auf dieser Insel bereits hinter der Crew?', en: 'Which location on this island is already behind the crew?' },
  { de: 'Welcher Name gehört schon in das Logbuch dieser Insel?', en: 'Which name already belongs in this island’s logbook?' },
  { de: 'An welchem dieser Orte war die Crew auf dieser Insel bereits?', en: 'Which of these locations has the crew already reached on this island?' }
];

const routeQuizzes = CHAPTERS.flatMap((chapter, chapterIndex) => routeQuestionTemplates.map((template, routeIndex) => {
  const visited = chapter.locations[routeIndex];
  const futureIndices = [4, 5];
  const futureA = chapter.locations[futureIndices[0]];
  const futureB = chapter.locations[futureIndices[1]];
  const rawAnswers = [
    { id: 'correct', label: visited },
    { id: 'wrong-1', label: futureA },
    { id: 'wrong-2', label: futureB }
  ];
  return {
    id: `SQ${chapterIndex + 1}-R${routeIndex + 1}`,
    storyKind: 'quiz',
    quizKind: 'route',
    chapterId: chapter.id,
    title: { de: `Route der ${chapter.name.de} · ${visited.de}`, en: `Route across ${chapter.name.en} · ${visited.en}` },
    question: {
      de: template.de.replace('{island}', chapter.name.de),
      en: template.en.replace('{island}', chapter.name.en)
    },
    answers: rotateAnswers(rawAnswers, (chapterIndex + routeIndex) % rawAnswers.length),
    correctAnswerId: 'correct',
    requirements: {
      visitedLocationIds: [locationKey(chapterIndex, routeIndex)],
      unvisitedLocationIds: futureIndices.map((locationIndex) => locationKey(chapterIndex, locationIndex))
    }
  };
}));

export const STORY_QUIZ_CARDS = Object.freeze([...islandDetailQuizzes, ...locationDetailQuizzes, ...routeQuizzes]);
export const MANDATORY_STORY_CARDS = Object.freeze([...ISLAND_STORY_CARDS, ...LOCATION_STORY_CARDS]);
export const STORY_CARDS = Object.freeze([...MANDATORY_STORY_CARDS, ...STORY_QUIZ_CARDS]);

export function storyCardById(storyCardId) {
  return STORY_CARDS.find((card) => card.id === storyCardId) ?? null;
}

export function locationStoryCard(chapterIndex, locationIndex) {
  return LOCATION_STORY_CARDS.find((card) => card.chapterIndex === chapterIndex && card.locationIndex === locationIndex) ?? null;
}

export function islandStoryCard(chapterIndex) {
  return ISLAND_STORY_CARDS.find((card) => card.chapterIndex === chapterIndex) ?? null;
}

export function storyLocationKey(chapterIndex, locationIndex) {
  return locationKey(chapterIndex, locationIndex);
}

export function validateStoryCatalog() {
  const ids = new Set(STORY_CARDS.map((card) => card.id));
  const titlesDe = new Set(STORY_CARDS.map((card) => card.title.de));
  const titlesEn = new Set(STORY_CARDS.map((card) => card.title.en));
  return {
    total: STORY_CARDS.length,
    islandStories: ISLAND_STORY_CARDS.length,
    locationStories: LOCATION_STORY_CARDS.length,
    quizzes: STORY_QUIZ_CARDS.length,
    islandDetailQuizzes: islandDetailQuizzes.length,
    locationDetailQuizzes: locationDetailQuizzes.length,
    routeQuizzes: routeQuizzes.length,
    valid: STORY_CARDS.length === 150 && ISLAND_STORY_CARDS.length === 6 && LOCATION_STORY_CARDS.length === 36 &&
      islandDetailQuizzes.length === 12 && locationDetailQuizzes.length === 72 && routeQuizzes.length === 24 && STORY_QUIZ_CARDS.length === 108 &&
      ids.size === STORY_CARDS.length && titlesDe.size === STORY_CARDS.length && titlesEn.size === STORY_CARDS.length
  };
}
