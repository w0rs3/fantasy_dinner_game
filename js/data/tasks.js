import { CHAPTERS } from './chapters.js';

const task = (titleDe, titleEn, instructionDe, instructionEn, area, people = [1, 2], timerMinutes = 0, options = {}) => ({
  title: { de: titleDe, en: titleEn },
  instruction: { de: instructionDe, en: instructionEn },
  area,
  people,
  timerMinutes,
  estimatedMinutes: options.estimatedMinutes ?? timerMinutes ?? 0,
  kind: options.kind ?? (options.timingMode === 'background' ? 'background' : 'challenge'),
  timingMode: options.timingMode ?? 'challenge',
  backgroundMinutes: options.backgroundMinutes ?? (options.timingMode === 'background' ? timerMinutes : 0),
  challengeMinutes: options.challengeMinutes ?? null,
  ingredientTags: options.ingredientTags ?? [],
  safety: options.safety ?? null,
  courseStyles: options.courseStyles ?? null
});

const DEFAULT_ESTIMATED_MINUTES = Object.freeze({
  oven: 8, 'cold-prep': 6, serving: 4, quality: 3, cleanup: 5,
  vegetables: 7, hotplate: 7, blender: 5, seasoning: 3, protein: 7,
  garnish: 3, fruit: 6, dressing: 5, assembly: 6, cold: 5,
  optional: 3, sauce: 5, mixing: 6, alcoholic: 6, 'alcohol-free': 6,
  safety: 3, story: 2, planning: 4
});

const BLUEPRINTS = Object.freeze({
  tapas: [
    task('Der Plan des Hafenmeisters', 'The Harbourmaster’s Plan', 'Teilt Tapas, Ofenaufgaben und Anrichten sinnvoll unter der Crew auf.', 'Divide tapas, oven work, and plating sensibly across the crew.', 'planning', [2, 3]),
    task('Datteln in Speck rollen', 'Wrap the Dates', 'Umwickelt jede Dattel gleichmäßig mit Speck und legt die Rollen mit Abstand auf ein vorbereitetes Blech. Noch nicht backen.', 'Wrap every date evenly in bacon and space the rolls on a prepared tray. Do not bake them yet.', 'cold-prep', [2, 3], 0, { estimatedMinutes: 6, challengeMinutes: 7, ingredientTags: ['tapas-dates', 'bacon'] }),
    task('Brot in den Ofen schieben', 'Put the Bread in the Oven', 'Heizt den Ofen nach Packungsangabe vor, legt die Baguettes sicher hinein und stellt den separaten Brottimer. Dieser Schritt endet, sobald die Ofentür geschlossen ist.', 'Preheat according to the packet, put the baguettes safely into the oven, and set the separate bread timer. This step ends once the oven door is closed.', 'oven', [1, 2], 0, { estimatedMinutes: 3, challengeMinutes: 4, ingredientTags: ['baguettes'], safety: 'hotOven' }),
    task('Vorräte vom Markt', 'Market Provisions', 'Ordnet Oliven, Käse, Schinken und Schafs- oder Ziegenkäse auf gut erreichbaren Platten an.', 'Arrange olives, cheese, ham, and sheep or goat cheese on easy-to-reach platters.', 'cold-prep', [2, 3], 0, { ingredientTags: ['olives', 'cheese', 'serrano', 'goat-cheese'] }),
    task('Die zwei Saucen', 'The Two Sauces', 'Füllt Aioli und Tomaten-Paprika-Dip getrennt ab, stellt passende Löffel bereit und kennzeichnet beide.', 'Decant aioli and tomato-pepper dip separately, add serving spoons, and label both.', 'cold-prep', [1, 2], 0, { ingredientTags: ['aioli', 'tomato-pepper-dip'] }),
    task('Das erste Deckmahl', 'The First Deck Meal', 'Prüft Temperatur, Portionsverteilung und Vollständigkeit, dann serviert alle Tapas gemeinsam.', 'Check temperature, portioning, and completeness, then serve all tapas together.', 'serving', [2, 3]),
    task('Flaggen auf den Platten', 'Flags on the Platters', 'Gestaltet eine klare Reihenfolge auf dem Tisch, sodass jede Person alle Bestandteile erreichen kann.', 'Create a clear table order so everyone can reach every component.', 'serving', [1, 2]),
    task('Wache am Backofen', 'Watch at the Oven', 'Kontrolliert Bräunung und Gargrad ohne unnötig Hitze entweichen zu lassen.', 'Check browning and doneness without letting unnecessary heat escape.', 'quality', [1, 1]),
    task('Brotmesser des Smutjes', 'The Cook’s Bread Knife', 'Schneidet das warme Brot sicher in gut teilbare Stücke.', 'Cut the warm bread safely into easy-to-share pieces.', 'serving', [1, 2], 0, { safety: 'knife' }),
    task('Der faire Vorrat', 'The Fair Provision', 'Schätzt Portionen für die Crew ab und ergänzt knappe Platten, bevor serviert wird.', 'Estimate portions for the crew and top up sparse platters before serving.', 'quality', [1, 2]),
    task('Freie Fläche in der Kombüse', 'Clear Space in the Galley', 'Räumt Verpackungen weg, reinigt Arbeitsflächen und stellt heiße Bleche sicher ab.', 'Remove packaging, clean worktops, and place hot trays safely.', 'cleanup', [1, 2], 0, { safety: 'hotOven' }),
    task('Gruß aus der Hafenstadt', 'Greeting from the Harbour', 'Erfindet einen kurzen Trinkspruch oder Serviersatz für den Beginn der Reise.', 'Invent a short toast or serving line to begin the voyage.', 'story', [1, 2]),
    task('Speckdatteln in den Ofen schieben', 'Put the Bacon Dates in the Oven', 'Schiebt das vorbereitete Blech in den heißen Ofen, stellt 15 Minuten ein und bestätigt den Start. Die Garzeit läuft danach ohne Münzdruck im Hintergrund.', 'Put the prepared tray into the hot oven, set 15 minutes, and confirm the start. Cooking then continues in the background without coin pressure.', 'oven', [1, 2], 15, { timingMode: 'background', ingredientTags: ['tapas-dates', 'bacon'], safety: 'hotOven' }),
    task('Speckdatteln herausholen', 'Remove the Bacon Dates', 'Prüft die Speckdatteln nach Ablauf des Ofentimers auf sichere Bräunung, holt das Blech heraus und stellt es hitzefest ab.', 'When the oven timer ends, check the bacon dates for safe browning, remove the tray, and place it on a heatproof surface.', 'oven', [1, 2], 0, { estimatedMinutes: 3, challengeMinutes: 4, ingredientTags: ['tapas-dates', 'bacon'], safety: 'hotOven' }),
    task('Brot backen lassen', 'Let the Bread Bake', 'Lasst das Brot nach Packungsangabe etwa acht Minuten backen. Der Timer läuft ohne Belohnung oder Strafe im Hintergrund.', 'Let the bread bake according to the packet for about eight minutes. The timer runs in the background without reward or penalty.', 'oven', [1, 1], 8, { timingMode: 'background', ingredientTags: ['baguettes'], safety: 'hotOven' }),
    task('Brot aus dem Ofen holen', 'Remove the Bread from the Oven', 'Holt die Baguettes nach dem Timer sicher heraus und lasst sie kurz auf einer hitzefesten Fläche ruhen. Geschnitten wird erst im nächsten Questschritt.', 'Remove the baguettes safely after the timer and rest them briefly on a heatproof surface. Slicing is a later quest step.', 'oven', [1, 2], 0, { estimatedMinutes: 2, challengeMinutes: 3, ingredientTags: ['baguettes'], safety: 'hotOven' })
  ],
  soup: [
    task('Der Rat am Nebelkessel', 'Council at the Mist Cauldron', 'Wählt aus dem Menüplan eine stimmige Suppengrundlage und entscheidet gemeinsam über Fleisch oder vegetarische Einlage.', 'Choose a coherent soup base from the menu plan and decide together on meat or a vegetable extra.', 'planning', [2, 3]),
    task('Gemüse aus dem Moor', 'Vegetables from the Moor', 'Wascht und schält nur, was es fachlich benötigt. Trennt Abfälle direkt von nutzbaren Resten.', 'Wash and peel only what needs it. Separate waste from useful trimmings immediately.', 'vegetables', [2, 3], 0, { safety: 'knife' }),
    task('Das Messer der Kräuterfrau', 'The Herb Keeper’s Knife', 'Schneidet die ausgewählten Gemüse in ähnlich große Stücke, damit sie gleichmäßig garen.', 'Cut the selected vegetables into similar-sized pieces so they cook evenly.', 'vegetables', [2, 3], 0, { safety: 'knife' }),
    task('Röstaromen im Nebel', 'Toasting in the Mist', 'Schwitzt geeignete Zutaten kontrolliert mit etwas Grundvorrat an, löscht mit Wasser ab und stellt eine ruhige, sichere Hitze ein. Brühe ist Grundvorrat und keine erspielte Zutat.', 'Sweat suitable ingredients carefully with a little pantry staple, add water, and set a safe gentle heat. Stock is a pantry staple, not a played ingredient.', 'hotplate', [1, 2], 0, { estimatedMinutes: 7, challengeMinutes: 8, safety: 'hotPan' }),
    task('Erste Kesselwache', 'First Cauldron Watch', 'Lasst die Suppe fünf Minuten ruhig garen. Wenn der Hintergrundtimer endet, prüft Hitze und Flüssigkeitsstand und markiert die Wache erledigt; die nächste Wache geht an eine andere freie Person.', 'Let the soup simmer gently for five minutes. When the background timer ends, check heat and liquid level and mark the watch complete; the next watch goes to another free player.', 'hotplate', [1, 1], 5, { timingMode: 'background', safety: 'hotPan' }),
    task('Der ruhige Mixer', 'The Steady Blender', 'Nur bei Cremesuppe: Püriert portionsweise, haltet den Deckel sicher und passt die Konsistenz vorsichtig mit Wasser oder Grundvorrat an.', 'Cream soup only: blend in batches, secure the lid, and carefully adjust consistency with water or a pantry staple.', 'blender', [2, 2], 0, { estimatedMinutes: 6, challengeMinutes: 7, safety: 'hotLiquids', courseStyles: ['cream'] }),
    task('Kräuterzeichen', 'Herbal Signs', 'Wählt frische Kräuter und Gewürze nach Geschmack; gebt empfindliche Kräuter erst spät hinzu.', 'Choose fresh herbs and seasoning to taste; add delicate herbs late.', 'seasoning', [1, 2]),
    task('Einlage aus dem Pilzwald', 'Extra from the Mushroom Wood', 'Falls Fleisch zugeordnet wurde, bereitet es getrennt, hygienisch und vollständig durchgegart vor. Andernfalls bereitet eine feste Gemüse-, Nuss- oder Kerneinlage mundgerecht vor.', 'If meat was assigned, prepare it separately, hygienically, and cook it through. Otherwise prepare a firm vegetable, nut, or seed extra in bite-sized pieces.', 'protein', [1, 2]),
    task('Die erste Kesselprobe', 'The First Cauldron Tasting', 'Prüft Salz, Säure, Schärfe und Textur mit einem sauberen Probierlöffel.', 'Check salt, acidity, heat, and texture with a clean tasting spoon.', 'quality', [2, 2]),
    task('Knusperbeute im Nebel', 'Crunch from the Mist', 'Falls Croûtons, Nüsse oder Kerne zugeordnet sind, bereitet sie trocken vor und gebt sie erst beim Servieren auf die Suppe.', 'If croutons, nuts, or seeds were assigned, prepare them dry and add them only when serving.', 'garnish', [1, 1]),
    task('Schalen für die Mannschaft', 'Bowls for the Crew', 'Wärmt geeignete Schalen vor und verteilt die Suppe gleichmäßig.', 'Warm suitable bowls and portion the soup evenly.', 'serving', [2, 3]),
    task('Kesselwache aufräumen', 'Clear the Cauldron Watch', 'Stellt verwendete Geräte sicher ab, weicht den Topf nach dem Servieren ein und reinigt Spritzer sofort.', 'Secure used equipment, soak the pot after serving, and wipe splashes immediately.', 'cleanup', [1, 2]),
    task('Zweite Kesselwache', 'Second Cauldron Watch', 'Übernehmt den Kessel für weitere fünf Minuten. Prüft nach dem Hintergrundtimer Hitze, Flüssigkeit und Gargrad; rührt nur bei Bedarf.', 'Take over the cauldron for another five minutes. After the background timer, check heat, liquid, and doneness; stir only if needed.', 'hotplate', [1, 1], 5, { timingMode: 'background', safety: 'hotPan' }),
    task('Dritte Kesselwache', 'Third Cauldron Watch', 'Übernehmt die letzte fünfminütige Kesselwache. Prüft danach, ob alle harten Zutaten weich genug für den gewählten Suppenstil sind.', 'Take the final five-minute cauldron watch. Then check that all firm ingredients are tender enough for the chosen soup style.', 'hotplate', [1, 1], 5, { timingMode: 'background', safety: 'hotPan' }),
    task('Klare Suppe vollenden', 'Finish the Clear Soup', 'Nur bei klarer Suppe: Lasst die Einlagen sichtbar, schöpft bei Bedarf Schaum ab und balanciert Flüssigkeit, Salz und Säure ohne zu pürieren.', 'Clear soup only: keep the pieces visible, skim if needed, and balance liquid, salt, and acidity without blending.', 'quality', [1, 2], 0, { estimatedMinutes: 5, challengeMinutes: 6, courseStyles: ['clear'] })
  ],
  salad: [
    task('Der Plan des grünen Altars', 'Plan of the Green Altar', 'Bestimmt das Verhältnis aus Blattsalat, Gemüse, Obst, Nüssen und Kernen.', 'Decide the balance of leaves, vegetables, fruit, nuts, and seeds.', 'planning', [2, 3]),
    task('Blätter am Wasserfall', 'Leaves at the Waterfall', 'Wascht den Blattsalat gründlich und trocknet ihn gut, damit das Dressing haftet.', 'Wash the leaves thoroughly and dry them well so the dressing will coat them.', 'cold-prep', [2, 2], 0, { ingredientTags: ['lettuce'] }),
    task('Früchte des Tempelgartens', 'Fruit of the Temple Garden', 'Wascht und schneidet die geplanten Früchte in salattaugliche Stücke.', 'Wash and cut the planned fruit into salad-sized pieces.', 'fruit', [1, 2], 0, { safety: 'knife' }),
    task('Dressing der Entdecker', 'Explorer’s Dressing', 'Wählt Joghurt oder Öl-Essig als Basis und balanciert sie mit Honig, Senf und Säure.', 'Choose yoghurt or oil and vinegar as the base and balance it with honey, mustard, and acidity.', 'dressing', [2, 2]),
    task('Die große Dschungelschale', 'The Great Jungle Bowl', 'Gebt feste Zutaten zuerst und empfindliche Blätter zuletzt in eine ausreichend große Schale.', 'Place sturdy ingredients in a large bowl first and delicate leaves last.', 'assembly', [2, 3]),
    task('Der letzte grüne Pfad', 'The Final Green Path', 'Hebt das Dressing erst kurz vor dem Servieren vorsichtig unter und richtet den Salat an.', 'Fold in the dressing gently just before serving and plate the salad.', 'serving', [2, 3]),
    task('Gemüse aus dem Ruinenhof', 'Vegetables from the Ruined Court', 'Schneidet die tatsächlich zugeordneten Gemüse gleichmäßig, aber nicht zu klein.', 'Cut the vegetables actually assigned to this course evenly without making them too small.', 'vegetables', [1, 2], 0, { safety: 'knife' }),
    task('Kerne am Papageienpfad', 'Seeds on the Parrot Trail', 'Röstet geeignete Nüsse und Kerne kurz trocken an und lasst sie vor dem Salat abkühlen.', 'Toast suitable nuts and seeds briefly in a dry pan and cool before adding.', 'hotplate', [1, 1], 0, { safety: 'hotPan' }),
    task('Die erste Gartenprobe', 'The First Garden Tasting', 'Prüft das Dressing einzeln und anschließend an einem kleinen Probebissen.', 'Taste the dressing alone and then on a small sample bite.', 'quality', [2, 2]),
    task('Frische Kräuter', 'Fresh Herbs', 'Zupft oder schneidet Kräuter erst kurz vor dem Mischen und verwendet auch geeignete Stiele.', 'Pick or cut herbs shortly before mixing and use suitable stems too.', 'seasoning', [1, 2]),
    task('Schalen des Tempels', 'Bowls of the Temple', 'Stellt Teller, Besteck und Servierlöffel bereit, ohne den Arbeitsweg zu blockieren.', 'Set out plates, cutlery, and serving spoons without blocking the work area.', 'serving', [1, 2]),
    task('Der saubere Pfad', 'The Clear Path', 'Räumt Messer und Bretter weg, wischt feuchte Flächen und lagert übrige Zutaten kühl.', 'Put away knives and boards, wipe damp surfaces, and refrigerate remaining ingredients.', 'cleanup', [1, 2])
  ],
  main: [
    task('Kriegsrat der Festung', 'Fortress Council', 'Legt fest, welche erspielten Fleischstücke, Gemüse, Früchte, Nüsse oder Kerne gemeinsam in den Bratschlauch kommen.', 'Decide which won cuts of meat, vegetables, fruit, nuts, or seeds will share the roasting bag.', 'planning', [2, 3]),
    task('Das große Feuerpaket', 'The Great Fire Parcel', 'Heizt den Ofen passend vor. Bereitet Fleisch getrennt vor, schichtet Gemüse und höchstens zwei Früchte im Bratschlauch, verteilt das Fleisch darüber und verschließt ihn nach Herstellerangabe. Noch nicht garen.', 'Preheat appropriately. Prepare meat separately, layer vegetables and no more than two fruits in the roasting bag, arrange the meat above, and close it according to its instructions. Do not start cooking yet.', 'oven', [2, 3], 0, { estimatedMinutes: 8, challengeMinutes: 9, safety: 'rawMeat' }),
    task('Beute aus der Schmiede', 'Forge Provisions', 'Kontrolliert, ob alle Fleisch-, Gemüse- und Fruchtportionen im Ofen sind. Reinigt danach sofort Rohfleischflächen und Werkzeuge.', 'Confirm that all meat, vegetable, and fruit portions are in the oven. Then immediately clean raw-meat surfaces and tools.', 'protein', [2, 3], 0, { safety: 'rawMeat' }),
    task('Schichten aus der Mine', 'Layers from the Mine', 'Verteilt feste Gemüse, Nüsse oder Kerne gleichmäßig zwischen den übrigen Zutaten, damit jede Portion etwas davon enthält.', 'Distribute firm vegetables, nuts, or seeds evenly among the other ingredients so every portion receives some.', 'assembly', [2, 2]),
    task('Die Festungsprobe', 'The Fortress Check', 'Prüft den Fortschritt nach Geräte- und Packungshinweisen. Öffnet den Bratschlauch noch nicht und passt nur bei Bedarf Temperatur oder Zeit an.', 'Check progress according to appliance and packaging guidance. Do not open the roasting bag yet; adjust temperature or time only if necessary.', 'quality', [1, 2], 0, { safety: 'hotOven' }),
    task('Ruhe vor dem Festmahl', 'Rest before the Feast', 'Nehmt das Blech vorsichtig heraus und lasst das Gericht fünf Minuten ruhen. Der Ruhe-Timer läuft ohne Münzdruck; öffnet den Schlauch erst danach vom Gesicht weg.', 'Remove the tray carefully and let the dish rest for five minutes. The resting timer has no coin pressure; only then open the bag away from your face.', 'oven', [2, 2], 5, { timingMode: 'background', safety: 'hotSteam' }),
    task('Zeichen der Schmiede', 'The Forge Mark', 'Kontrolliert, ob große Stücke gleichmäßig verteilt sind und empfindliche Zutaten nicht direkt an der heißesten Stelle liegen.', 'Check that large pieces are distributed evenly and delicate ingredients are not sitting at the hottest point.', 'quality', [2, 2], 0, { safety: 'hotOven' }),
    task('Obst am Lavapfad', 'Fruit on the Lava Path', 'Falls Obst zugeordnet ist, schneidet es groß genug, dass es beim Garen Struktur behält; andernfalls bestätigt diesen Schritt ohne Vorbereitung.', 'If fruit was assigned, cut it large enough to retain structure while roasting; otherwise confirm this step without preparation.', 'fruit', [1, 2], 0, { safety: 'knife' }),
    task('Die letzte Festungsprobe', 'The Final Fortress Check', 'Prüft, ob das Fleisch vollständig und gleichmäßig durchgegart ist. Im Zweifel mit einem sauberen Fleischthermometer an allen Stellen mindestens 70 °C für zwei Minuten prüfen. Packungs- und Gerätehinweise haben Vorrang; verlängert die Garzeit im Zweifel.', 'Check that the meat is thoroughly and evenly cooked. If in doubt, use a clean meat thermometer and verify at least 70 °C for two minutes throughout. Packaging and appliance instructions take priority; extend cooking when in doubt.', 'quality', [2, 2], 0, { safety: 'foodTemperature' }),
    task('Sauce aus dem Schatzsaft', 'Sauce from the Treasure Juices', 'Fangt austretenden Saft sicher auf und entscheidet, ob er direkt oder kurz reduziert serviert wird.', 'Collect the cooking juices safely and decide whether to serve directly or reduce briefly.', 'sauce', [1, 2], 0, { safety: 'hotPan' }),
    task('Platten der Feuerwache', 'Platters of the Fire Watch', 'Richtet Fleisch, Gemüse und Früchte übersichtlich an und haltet rohe Kontaktflächen fern.', 'Arrange meat, vegetables, and fruit clearly and keep raw-contact surfaces away.', 'serving', [2, 3]),
    task('Die gereinigte Schmiede', 'The Clean Forge', 'Reinigt alle Flächen und Werkzeuge mit Rohfleischkontakt gründlich und räumt heiße Geräte sicher weg.', 'Clean every surface and tool that touched raw meat thoroughly and put hot equipment away safely.', 'cleanup', [2, 3], 0, { safety: 'rawMeat' }),
    task('Bratschlauch im Ofen', 'Roasting Bag in the Oven', 'Schiebt das verschlossene Feuerpaket in den Ofen und lasst es 35 Minuten nach Geräte- und Packungshinweisen garen. Diese Ofenzeit läuft ohne Münzbelohnung oder Strafe im Hintergrund.', 'Put the sealed fire parcel in the oven and cook it for 35 minutes according to appliance and packaging guidance. This oven time runs in the background without coin reward or penalty.', 'oven', [1, 2], 35, { timingMode: 'background', safety: 'hotOven' }),
    task('Letzte Ofenetappe', 'Final Oven Stage', 'Gart das Gericht nach der Zwischenkontrolle weitere zehn Minuten oder so lange, wie Packung und Gargrad es verlangen. Der Timer ist nur eine Erinnerung, keine Deadline.', 'After the progress check, cook for another ten minutes or as long as packaging and doneness require. The timer is a reminder, not a deadline.', 'oven', [1, 2], 10, { timingMode: 'background', safety: 'hotOven' })
  ],
  dessert: [
    task('Zwei Crews an der Lagune', 'Two Crews at the Lagoon', 'Teilt euch in zwei möglichst gleich große Teams und gebt jeder Gruppe einen eigenen Arbeitsbereich.', 'Split into two similar-sized teams and give each one its own work area.', 'planning', [2, 3]),
    task('Früchte der Plantage', 'Plantation Fruit', 'Wascht und schneidet die geplanten Früchte; haltet Garnitur und zu verarbeitende Stücke getrennt.', 'Wash and cut the planned fruit; keep garnish separate from fruit to be processed.', 'fruit', [2, 3], 0, { safety: 'knife' }),
    task('Die warme Fruchtbeute', 'Warm Fruit Treasure', 'Entscheidet zwischen karamellisiertem Obst, Obstsalat oder Püree und bereitet eine Variante in kleinen Schritten vor.', 'Choose caramelised fruit, fruit salad, or purée and prepare one option in small steps.', 'fruit', [2, 2], 8, { safety: 'hotSugar' }),
    task('Eis aus der Höhle', 'Ice from the Cave', 'Plant Vanilleeis und – falls zugeordnet – die zweite Eissorte so, dass beide Kreationen ausreichend und unterscheidbar bleiben.', 'Plan the vanilla ice cream and, if assigned, the second flavour so both creations remain sufficient and distinct.', 'cold', [1, 2]),
    task('Die zwei Schatzpläne', 'The Two Treasure Plans', 'Ein Team entwickelt eine fruchtige Richtung; das andere kombiniert die übrigen zugeordneten Zutaten zu einer klar unterscheidbaren Variante.', 'One team develops a fruity direction; the other combines the remaining assigned ingredients into a clearly distinct variation.', 'assembly', [4, 6]),
    task('Kühle Wache', 'The Cool Watch', 'Stellt vorbereitete Bestandteile zehn Minuten kühl. Die Kühlzeit läuft als Erinnerung im Hintergrund und ist keine Münz-Challenge.', 'Chill prepared components for ten minutes. The chilling time is a background reminder, not a coin challenge.', 'cold', [1, 2], 10, { timingMode: 'background' }),
    task('Süße Wolken', 'Sweet Clouds', 'Bereitet eine luftige oder cremige Komponente aus euren Grundvorräten vor und haltet sie bis zum Servieren kalt.', 'Prepare an airy or creamy component from your basic pantry and keep it cold until serving.', 'cold', [1, 2]),
    task('Garnitur aus der Truhe', 'Garnish from the Chest', 'Bereitet die zugeordneten Streusel, Schokolade, Nüsse oder Kerne getrennt vor, damit beide Teams bewusst dosieren können.', 'Prepare the assigned sprinkles, chocolate, nuts, or seeds separately so both teams can dose them deliberately.', 'garnish', [1, 2]),
    task('Die erste Lagunenprobe', 'The First Lagoon Tasting', 'Prüft Süße, Temperatur und Textur beider Kreationen und ändert nur einen Punkt gleichzeitig.', 'Check sweetness, temperature, and texture of both creations and change only one point at a time.', 'quality', [2, 2]),
    task('Optionale Geisterbeute', 'Optional Spirit Treasure', 'Falls gewünscht, gebt Likör oder Spirituose nur in klar gekennzeichnete Erwachsenenportionen.', 'If desired, add liqueur or spirit only to clearly marked adult portions.', 'optional', [1, 2]),
    task('Zwei Reihen am Sonnenpavillon', 'Two Rows at the Sun Pavilion', 'Richtet beide Dessertvarianten erkennbar getrennt und mit gleichmäßigen Portionen an.', 'Plate both dessert variations separately and in even portions.', 'serving', [2, 3]),
    task('Die kalte Kombüse', 'The Cold Galley', 'Stellt Eis sofort zurück, lagert Obst kühl und wischt klebrige Arbeitsflächen.', 'Return ice cream immediately, refrigerate fruit, and wipe sticky worktops.', 'cleanup', [1, 2])
  ],
  cocktails: [
    task('Der Plan des Barkeepers', 'The Bartender’s Plan', 'Teilt die Crew in ein alkoholisches und ein alkoholfreies Team und kennzeichnet die Arbeitsbereiche.', 'Split the crew into an alcoholic and an alcohol-free team and label the work areas.', 'planning', [2, 3]),
    task('Früchte aus der Piratenkiste', 'Fruit from the Pirate Crate', 'Wascht und schneidet übrige Früchte; reserviert schöne Stücke für die Garnitur.', 'Wash and cut remaining fruit; reserve attractive pieces for garnish.', 'fruit', [2, 3], 0, { safety: 'knife' }),
    task('Saft aus dem Schiffswrack', 'Juice from the Shipwreck', 'Presst oder zerdrückt geeignete Früchte und verteilt den Grundsaft auf beide Teams.', 'Press or crush suitable fruit and divide the base juice between both teams.', 'mixing', [2, 2]),
    task('Mischung der Freibeuter', 'The Freebooter Mix', 'Falls eine Spirituose zugeordnet ist, baut die alkoholische Mischung schrittweise mit Saft, Säure und Wasser auf. Andernfalls kennzeichnet diese Mischung ebenfalls als alkoholfrei.', 'If a spirit was assigned, build the alcoholic mix gradually with juice, acidity, and water. Otherwise mark this mix as alcohol-free as well.', 'alcoholic', [2, 3]),
    task('Mischung der Steuermänner', 'The Helmsman Mix', 'Baut die alkoholfreie Mischung mit Saft, Frucht, Säure und Mineralwasser eigenständig auf.', 'Build the alcohol-free mix independently with juice, fruit, acidity, and mineral water.', 'alcohol-free', [2, 3]),
    task('Das letzte Glas', 'The Final Glass', 'Kennzeichnet beide Varianten eindeutig, verteilt Eis und serviert alle Gläser gemeinsam.', 'Label both versions unmistakably, distribute ice, and serve every glass together.', 'serving', [2, 3]),
    task('Vorrat aus der Eishöhle', 'Supply from the Ice Cave', 'Stellt ausreichend Eis bereit, ohne den Arbeitsbereich mit Schmelzwasser zu überfluten.', 'Set out enough ice without flooding the workspace with meltwater.', 'cold', [1, 2], 0, { ingredientTags: ['ice-cubes'] }),
    task('Süße Beute', 'Sweet Treasure', 'Passt Süße in kleinen Schritten an und probiert nach jeder Änderung mit einem frischen Löffel.', 'Adjust sweetness in small steps and taste after every change with a fresh spoon.', 'quality', [1, 2]),
    task('Säure der Brandung', 'Acidity of the Surf', 'Balanciert beide Varianten getrennt mit Zitrone, Limette oder anderer Fruchtsäure.', 'Balance both versions separately with lemon, lime, or another fruit acidity.', 'quality', [1, 2]),
    task('Der Shaker des Smutjes', 'The Cook’s Shaker', 'Entscheidet je Mischung zwischen Rühren, Schütteln oder Mixen und arbeitet portionsweise.', 'Choose stirring, shaking, or blending for each mix and work in batches.', 'mixing', [2, 2]),
    task('Flaggen der beiden Crews', 'Flags of the Two Crews', 'Kennzeichnet alkoholische und alkoholfreie Gläser dauerhaft und verwechslungssicher.', 'Mark alcoholic and alcohol-free glasses permanently and unmistakably.', 'safety', [1, 2]),
    task('Freie Fläche hinter der Bar', 'Clear Space behind the Bar', 'Verschließt Flaschen, räumt Messer weg und wischt klebrige oder nasse Flächen.', 'Close bottles, put away knives, and wipe sticky or wet surfaces.', 'cleanup', [1, 2])
  ]
});

const QUEST_NAMES = Object.freeze({
  tapas: {
    plan: { de: 'Hafenplan', en: 'Harbour Plan' }, dates: { de: 'Speckdatteln', en: 'Bacon Dates' },
    bread: { de: 'Ofenbrot', en: 'Oven Bread' }, cold: { de: 'Kalte Platten', en: 'Cold Platters' },
    serve: { de: 'Erstes Deckmahl', en: 'First Deck Meal' }, cleanup: { de: 'Klare Kombüse', en: 'Clear Galley' }, story: { de: 'Hafengeschichte', en: 'Harbour Story' }
  },
  soup: {
    plan: { de: 'Suppenplan', en: 'Soup Plan' }, vegetables: { de: 'Gemüse vorbereiten', en: 'Prepare Vegetables' },
    cauldron: { de: 'Kesselreise', en: 'Cauldron Voyage' }, finish: { de: 'Suppe vollenden', en: 'Finish the Soup' },
    extras: { de: 'Einlage & Garnitur', en: 'Extras & Garnish' }, serve: { de: 'Kessel servieren', en: 'Serve the Cauldron' }, cleanup: { de: 'Kessel klar machen', en: 'Clear the Cauldron' }
  },
  salad: {
    plan: { de: 'Salatplan', en: 'Salad Plan' }, prep: { de: 'Frische vorbereiten', en: 'Prepare Fresh Ingredients' },
    dressing: { de: 'Dressingroute', en: 'Dressing Route' }, assemble: { de: 'Dschungelschale', en: 'Jungle Bowl' },
    serve: { de: 'Grüner Pfad', en: 'Green Path' }, cleanup: { de: 'Sauberer Pfad', en: 'Clear Path' }
  },
  main: {
    plan: { de: 'Festungsplan', en: 'Fortress Plan' }, prep: { de: 'Feuerpaket vorbereiten', en: 'Prepare the Fire Parcel' },
    oven: { de: 'Ofenreise', en: 'Oven Voyage' }, finish: { de: 'Festmahl vollenden', en: 'Finish the Feast' },
    serve: { de: 'Festungstafel', en: 'Fortress Table' }, cleanup: { de: 'Schmiede reinigen', en: 'Clean the Forge' }
  },
  dessert: {
    plan: { de: 'Lagunenplan', en: 'Lagoon Plan' }, fruit: { de: 'Fruchtbeute', en: 'Fruit Treasure' },
    cold: { de: 'Kühle Kreationen', en: 'Chilled Creations' }, finish: { de: 'Süße Garnitur', en: 'Sweet Garnish' },
    serve: { de: 'Sonnenpavillon', en: 'Sun Pavilion' }, cleanup: { de: 'Kalte Kombüse', en: 'Cold Galley' }
  },
  cocktails: {
    plan: { de: 'Barplan', en: 'Bar Plan' }, fruit: { de: 'Fruchtbasis', en: 'Fruit Base' },
    mixes: { de: 'Zwei Mischungen', en: 'Two Mixes' }, finish: { de: 'Balance & Sicherheit', en: 'Balance & Safety' },
    serve: { de: 'Letzte Gläser', en: 'Final Glasses' }, cleanup: { de: 'Bar klar machen', en: 'Clear the Bar' }
  }
});

const QUEST_ASSIGNMENTS = Object.freeze({
  tapas: ['plan', 'dates', 'bread', 'cold', 'cold', 'serve', 'serve', 'dates', 'bread', 'serve', 'cleanup', 'story', 'dates', 'dates', 'bread', 'bread'],
  soup: ['plan', 'vegetables', 'vegetables', 'cauldron', 'cauldron', 'finish', 'finish', 'extras', 'finish', 'extras', 'serve', 'cleanup', 'cauldron', 'cauldron', 'finish'],
  salad: ['plan', 'prep', 'prep', 'dressing', 'assemble', 'serve', 'prep', 'prep', 'dressing', 'prep', 'serve', 'cleanup'],
  main: ['plan', 'prep', 'prep', 'prep', 'oven', 'oven', 'prep', 'prep', 'finish', 'finish', 'serve', 'cleanup', 'oven', 'oven'],
  dessert: ['plan', 'fruit', 'fruit', 'cold', 'cold', 'cold', 'cold', 'finish', 'finish', 'finish', 'serve', 'cleanup'],
  cocktails: ['plan', 'fruit', 'fruit', 'mixes', 'mixes', 'serve', 'finish', 'finish', 'finish', 'mixes', 'finish', 'cleanup']
});

/*
 * Only real kitchen work enters the live assignment deck. The prerequisite
 * state is either `started` (parallel work is safe) or `done` (the result is
 * physically needed before the next task can begin).
 */
const WORKFLOW = Object.freeze({
  tapas: {
    skip: [0, 7, 11],
    requires: {
      12: [[1, 'done']], 13: [[12, 'done']], 14: [[2, 'done']], 15: [[14, 'done']],
      8: [[15, 'done']], 9: [[3, 'done'], [4, 'done']],
      5: [[3, 'done'], [4, 'done'], [6, 'done'], [8, 'done'], [9, 'done'], [13, 'done']],
      10: [[5, 'done']]
    }
  },
  soup: {
    skip: [0],
    requires: {
      2: [[1, 'done']], 3: [[2, 'done'], [7, 'done']], 4: [[3, 'done']],
      12: [[4, 'done']], 13: [[12, 'done']], 5: [[13, 'done']], 14: [[13, 'done']],
      8: [[6, 'done'], [7, 'done']],
      10: [[8, 'done']], 11: [[10, 'done']]
    },
    requiresAny: { 8: [[5, 'done'], [14, 'done']] }
  },
  salad: {
    skip: [0],
    requires: {
      4: [[1, 'done'], [2, 'done'], [3, 'done'], [6, 'done'], [7, 'done'], [9, 'done']],
      8: [[4, 'done']], 5: [[8, 'done']], 11: [[5, 'done']]
    }
  },
  main: {
    skip: [0],
    requires: {
      1: [[2, 'done'], [3, 'done'], [6, 'done'], [7, 'done'], [9, 'done']],
      12: [[1, 'done']], 4: [[12, 'done']], 13: [[4, 'done']], 5: [[13, 'done']], 8: [[5, 'done']],
      10: [[8, 'done']], 11: [[10, 'done']]
    }
  },
  dessert: {
    skip: [0, 9],
    requires: {
      2: [[1, 'done']], 4: [[1, 'done'], [3, 'done']], 5: [[2, 'done'], [4, 'done']],
      8: [[5, 'done'], [6, 'done'], [7, 'done']], 10: [[8, 'done']], 11: [[10, 'done']]
    }
  },
  cocktails: {
    skip: [0],
    requires: {
      2: [[1, 'done']], 3: [[2, 'done']], 4: [[2, 'done']],
      7: [[3, 'done'], [4, 'done']], 8: [[3, 'done'], [4, 'done']], 9: [[3, 'done'], [4, 'done']],
      5: [[7, 'done'], [8, 'done'], [9, 'done'], [10, 'done']], 11: [[5, 'done']]
    }
  }
});

export function buildTaskDeck(chapterIndex) {
  const chapter = CHAPTERS[chapterIndex];
  const blueprints = BLUEPRINTS[chapter.id];
  const questSteps = new Map();
  return blueprints.map((blueprint, blueprintIndex) => {
    const number = blueprintIndex * 2 + 1;
    const estimatedMinutes = blueprint.estimatedMinutes || blueprint.backgroundMinutes || DEFAULT_ESTIMATED_MINUTES[blueprint.area] || 4;
    const questId = QUEST_ASSIGNMENTS[chapter.id][blueprintIndex] ?? 'plan';
    const questStep = (questSteps.get(questId) ?? 0) + 1;
    questSteps.set(questId, questStep);
    return {
      ...blueprint,
      estimatedMinutes,
      challengeMinutes: blueprint.timingMode === 'background' ? 0 : (blueprint.challengeMinutes ?? Math.max(2, Math.min(8, estimatedMinutes))),
      id: `A${chapterIndex + 1}-${String(number).padStart(2, '0')}`,
      chapterId: chapter.id,
      questId,
      questName: QUEST_NAMES[chapter.id][questId],
      questStep,
      variant: 0,
      blueprintIndex,
      playable: !WORKFLOW[chapter.id].skip.includes(blueprintIndex),
      prerequisites: (WORKFLOW[chapter.id].requires[blueprintIndex] ?? []).map(([requiredBlueprintIndex, state]) => ({ requiredBlueprintIndex, state })),
      alternativePrerequisites: (WORKFLOW[chapter.id].requiresAny?.[blueprintIndex] ?? []).map(([requiredBlueprintIndex, state]) => ({ requiredBlueprintIndex, state })),
      coreLocationIndex: null
    };
  });
}

export const TASK_DECKS = Object.freeze(CHAPTERS.map((_, index) => buildTaskDeck(index)));

export function getPlayableQuestLines(chapterIndex) {
  const cards = TASK_DECKS[chapterIndex].filter((card) => card.playable);
  const cardByBlueprint = new Map(cards.map((card) => [card.blueprintIndex, card]));
  const dependencies = new Map(cards.map((card) => [card.id, new Set(
    [...(card.prerequisites ?? []), ...(card.alternativePrerequisites ?? [])]
      .map((requirement) => cardByBlueprint.get(requirement.requiredBlueprintIndex)?.id)
      .filter(Boolean)
  )]));
  const ordered = [];
  const remaining = new Set(cards.map((card) => card.id));
  while (remaining.size) {
    const next = cards
      .filter((card) => remaining.has(card.id) && [...dependencies.get(card.id)].every((taskId) => !remaining.has(taskId)))
      .sort((a, b) => a.blueprintIndex - b.blueprintIndex)[0];
    // The workflow is expected to be acyclic. Keeping a deterministic fallback
    // makes an older saved catalogue recoverable if custom content violates it.
    const selected = next ?? cards.filter((card) => remaining.has(card.id)).sort((a, b) => a.blueprintIndex - b.blueprintIndex)[0];
    ordered.push(selected);
    remaining.delete(selected.id);
  }
  const lines = new Map();
  ordered.forEach((card) => {
      if (!lines.has(card.questId)) lines.set(card.questId, []);
      lines.get(card.questId).push(card);
  });
  return [...lines.values()];
}

export function getCoreTask(chapterIndex, locationIndex) {
  return TASK_DECKS[chapterIndex].find((taskCard) => taskCard.coreLocationIndex === locationIndex);
}

export function validateTaskCatalog() {
  const tasks = TASK_DECKS.flat();
  const ids = new Set(tasks.map((entry) => entry.id));
  const titlesDe = new Set(tasks.map((entry) => entry.title.de));
  const titlesEn = new Set(tasks.map((entry) => entry.title.en));
  return {
    total: tasks.length,
    uniqueIds: ids.size,
    uniqueGermanTitles: titlesDe.size,
    uniqueEnglishTitles: titlesEn.size,
    valid: tasks.length === blueprintsTotal() && ids.size === tasks.length && titlesDe.size === tasks.length && titlesEn.size === tasks.length
  };
}

function blueprintsTotal() {
  return Object.values(BLUEPRINTS).reduce((total, entries) => total + entries.length, 0);
}
