import { CHAPTERS } from './chapters.js';

const task = (titleDe, titleEn, instructionDe, instructionEn, area, people = [1, 2], timerMinutes = 0, options = {}) => ({
  title: { de: titleDe, en: titleEn },
  instruction: { de: instructionDe, en: instructionEn },
  area,
  people,
  timerMinutes,
  estimatedMinutes: options.estimatedMinutes ?? timerMinutes ?? 0,
  kind: options.kind ?? options.timingMode ?? 'challenge',
  timingMode: options.timingMode ?? 'challenge',
  backgroundMinutes: options.backgroundMinutes ?? (options.timingMode === 'background' ? timerMinutes : 0),
  challengeMinutes: options.challengeMinutes ?? null,
  ingredientTags: options.ingredientTags ?? [],
  ingredientRequirement: options.ingredientRequirement ?? null,
  safety: options.safety ?? null,
  courseStyles: options.courseStyles ?? null,
  repeatOnRelief: options.repeatOnRelief ?? false,
  automatic: options.automatic ?? false,
  unassigned: options.unassigned ?? false,
  completionLabel: options.completionLabel ?? null
});

const DEFAULT_ESTIMATED_MINUTES = Object.freeze({
  oven: 8, 'cold-prep': 6, serving: 4, quality: 3, cleanup: 5,
  vegetables: 7, hotplate: 7, blender: 5, seasoning: 3, protein: 7,
  garnish: 3, fruit: 6, dressing: 5, assembly: 6, cold: 5,
  optional: 3, sauce: 5, mixing: 6, alcoholic: 6, 'alcohol-free': 6,
  safety: 3, story: 2, planning: 4, reset: 5
});

const BLUEPRINTS = Object.freeze({
  tapas: [
    task('Der Plan des Hafenmeisters', 'The Harbourmaster’s Plan', 'Teilt Tapas, Ofenaufgaben und Anrichten sinnvoll unter der Crew auf.', 'Divide tapas, oven work, and plating sensibly across the crew.', 'planning', [2, 3]),
    task('Datteln in Speck rollen', 'Wrap the Dates', 'Umwickelt jede Dattel gleichmäßig mit Speck und legt die Rollen mit der Naht nach unten auf einen vorbereiteten Teller. Noch nicht braten.', 'Wrap every date evenly with bacon and place the rolls seam-side down on a prepared plate. Do not fry them yet.', 'cold-prep', [2, 3], 0, { estimatedMinutes: 6, challengeMinutes: 7, ingredientTags: ['tapas-dates', 'bacon'] }),
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
    task('Speckdatteln in der Pfanne braten', 'Fry the Bacon Dates', 'Legt die Speckdatteln mit der Naht nach unten in eine große Pfanne und bratet sie bei mittlerer Hitze ohne zusätzliches Fett. Wendet sie regelmäßig, bis der Speck rundum knusprig und durchgehend heiß ist. Dafür läuft kein Spieltimer; hakt die Aufgabe nach Gargrad ab.', 'Place the bacon dates seam-side down in a large frying pan and fry them over medium heat without extra fat. Turn them regularly until the bacon is crisp all around and piping hot throughout. No game timer runs for this step; check it off when the food is done.', 'hotplate', [1, 2], 0, { timingMode: 'manual', estimatedMinutes: 7, ingredientTags: ['tapas-dates', 'bacon'], safety: 'hotPan' }),
    task('Speckdatteln aus der Pfanne nehmen', 'Remove the Bacon Dates from the Pan', 'Nehmt die fertig gebratenen Speckdatteln mit einer Zange aus der Pfanne, lasst überschüssiges Fett kurz auf Küchenpapier abtropfen und haltet sie bis zum Servieren warm.', 'Lift the fried bacon dates from the pan with tongs, drain excess fat briefly on kitchen paper, and keep them warm until serving.', 'hotplate', [1, 2], 0, { estimatedMinutes: 3, challengeMinutes: 4, ingredientTags: ['tapas-dates', 'bacon'], safety: 'hotPan' }),
    task('Brot backen lassen', 'Let the Bread Bake', 'Backt das Brot nach Packungsangabe und kontrolliert Bräunung sowie Gargrad. Dafür läuft kein Spieltimer; hakt die Aufgabe ab, sobald das Brot fertig ist.', 'Let the bread bake according to the packet and check its browning and doneness. No game timer runs for this step; check it off once the bread is ready.', 'oven', [1, 1], 0, { timingMode: 'manual', estimatedMinutes: 8, ingredientTags: ['baguettes'], safety: 'hotOven' }),
    task('Brot aus dem Ofen holen', 'Remove the Bread from the Oven', 'Holt die Baguettes nach dem Timer sicher heraus und lasst sie kurz auf einer hitzefesten Fläche ruhen. Geschnitten wird erst im nächsten Questschritt.', 'Remove the baguettes safely after the timer and rest them briefly on a heatproof surface. Slicing is a later quest step.', 'oven', [1, 2], 0, { estimatedMinutes: 2, challengeMinutes: 3, ingredientTags: ['baguettes'], safety: 'hotOven' })
  ],
  soup: [
    task('Der Rat am Nebelkessel', 'Council at the Mist Cauldron', 'Wählt aus dem Menüplan eine stimmige Suppengrundlage und entscheidet gemeinsam über Fleisch oder vegetarische Einlage.', 'Choose a coherent soup base from the menu plan and decide together on meat or a vegetable extra.', 'planning', [2, 3]),
    task('Gemüse aus dem Moor', 'Vegetables from the Moor', 'Wascht und schält nur, was es fachlich benötigt. Trennt Abfälle direkt von nutzbaren Resten.', 'Wash and peel only what needs it. Separate waste from useful trimmings immediately.', 'vegetables', [2, 3], 0, { safety: 'knife' }),
    task('Das Messer der Kräuterfrau', 'The Herb Keeper’s Knife', 'Schneidet die ausgewählten Gemüse in ähnlich große Stücke, damit sie gleichmäßig garen.', 'Cut the selected vegetables into similar-sized pieces so they cook evenly.', 'vegetables', [2, 3], 0, { safety: 'knife' }),
    task('Röstaromen im Nebel', 'Toasting in the Mist', 'Schwitzt geeignete Zutaten kontrolliert mit etwas Grundvorrat an, löscht mit Wasser ab und stellt eine ruhige, sichere Hitze ein. Brühe ist Grundvorrat und keine erspielte Zutat.', 'Sweat suitable ingredients carefully with a little pantry staple, add water, and set a safe gentle heat. Stock is a pantry staple, not a played ingredient.', 'hotplate', [1, 2], 0, { estimatedMinutes: 7, challengeMinutes: 8, safety: 'hotPan' }),
    task('Kesselwache', 'Cauldron Watch', 'Lasst die Suppe fünf Minuten ruhig garen. Prüft anschließend Hitze, Flüssigkeitsstand und Gargrad. Ist sie noch nicht fertig, löst die Wache ab: Dieselbe Kesselwache kommt dann wieder oben auf den Aufgabenstapel und wird von einer anderen freien Person übernommen. Wiederholt das ohne feste Obergrenze, bis die Suppe wirklich fertig ist.', 'Let the soup simmer gently for five minutes, then check its heat, liquid level, and doneness. If it is not ready, relieve the watch: the same Cauldron Watch returns to the top of the task deck for another free player. Repeat without a fixed limit until the soup is genuinely done.', 'hotplate', [1, 1], 5, { timingMode: 'background', safety: 'hotPan', repeatOnRelief: true }),
    task('Der ruhige Mixer', 'The Steady Blender', 'Nur bei Cremesuppe: Püriert portionsweise, haltet den Deckel sicher und passt die Konsistenz vorsichtig mit Wasser oder Grundvorrat an.', 'Cream soup only: blend in batches, secure the lid, and carefully adjust consistency with water or a pantry staple.', 'blender', [2, 2], 0, { estimatedMinutes: 6, challengeMinutes: 7, safety: 'hotLiquids', courseStyles: ['cream'] }),
    task('Kräuterzeichen', 'Herbal Signs', 'Wählt frische Kräuter und Gewürze aus dem allgemeinen Grundvorrat nach Geschmack; gebt empfindliche Kräuter erst spät hinzu.', 'Choose fresh herbs and seasoning from the shared pantry to taste; add delicate herbs late.', 'seasoning', [1, 2]),
    task('Einlage aus dem Pilzwald', 'Extra from the Mushroom Wood', 'Falls Fleisch zugeordnet wurde, bereitet es getrennt, hygienisch und vollständig durchgegart vor. Andernfalls bereitet eine feste Gemüse-, Nuss- oder Kerneinlage mundgerecht vor. Dafür läuft kein Spieltimer; entscheidet nach sicherem Gargrad.', 'If meat was assigned, prepare it separately, hygienically, and cook it through. Otherwise prepare a firm vegetable, nut, or seed extra in bite-sized pieces. No game timer runs; decide by safe doneness.', 'protein', [1, 2], 0, { timingMode: 'manual', estimatedMinutes: 7, safety: 'foodTemperature' }),
    task('Die erste Kesselprobe', 'The First Cauldron Tasting', 'Prüft Salz, Säure, Schärfe und Textur mit einem sauberen Probierlöffel.', 'Check salt, acidity, heat, and texture with a clean tasting spoon.', 'quality', [2, 2]),
    task('Knusperbeute im Nebel', 'Crunch from the Mist', 'Falls Croûtons, Nüsse oder Kerne zugeordnet sind, bereitet sie trocken vor und gebt sie erst beim Servieren auf die Suppe.', 'If croutons, nuts, or seeds were assigned, prepare them dry and add them only when serving.', 'garnish', [1, 1], 0, { ingredientRequirement: { ids: ['croutons', 'nuts', 'seeds'] } }),
    task('Schalen für die Mannschaft', 'Bowls for the Crew', 'Wärmt geeignete Schalen vor und verteilt die Suppe gleichmäßig.', 'Warm suitable bowls and portion the soup evenly.', 'serving', [2, 3]),
    task('Kesselwache aufräumen', 'Clear the Cauldron Watch', 'Stellt verwendete Geräte sicher ab, weicht den Topf nach dem Servieren ein und reinigt Spritzer sofort.', 'Secure used equipment, soak the pot after serving, and wipe splashes immediately.', 'cleanup', [1, 2]),
    task('Klare Suppe vollenden', 'Finish the Clear Soup', 'Nur bei klarer Suppe: Lasst die Einlagen sichtbar, schöpft bei Bedarf Schaum ab und balanciert Flüssigkeit, Salz und Säure ohne zu pürieren.', 'Clear soup only: keep the pieces visible, skim if needed, and balance liquid, salt, and acidity without blending.', 'quality', [1, 2], 0, { estimatedMinutes: 5, challengeMinutes: 6, courseStyles: ['clear'] }),
    task('Tapastafel abräumen', 'Clear the Tapas Table', 'Sammelt Teller, Schalen, Besteck und leere Tapasplatten ein, bringt Reste sicher in die Küche und wischt den Tisch frei. Erst danach beginnt die Zutatenwahl für die Suppe.', 'Collect plates, bowls, cutlery, and empty tapas platters, take leftovers safely to the kitchen, and wipe the table clear. Soup ingredient selection begins only afterwards.', 'reset', [2, 3], 0, { estimatedMinutes: 5, challengeMinutes: 6 })
  ],
  salad: [
    task('Der Plan des grünen Altars', 'Plan of the Green Altar', 'Bestimmt das Verhältnis aus den tatsächlich zugeordneten Blättern, Gemüsen, Früchten, Fleischsorten, Nüssen und Kernen.', 'Decide the balance of the leaves, vegetables, fruit, meat, nuts, and seeds actually assigned to the salad.', 'planning', [2, 3]),
    task('Blätter am Wasserfall', 'Leaves at the Waterfall', 'Wascht den Blattsalat gründlich und trocknet ihn gut, damit das Dressing haftet.', 'Wash the leaves thoroughly and dry them well so the dressing will coat them.', 'cold-prep', [2, 2], 0, { ingredientTags: ['lettuce'], ingredientRequirement: { ids: ['lettuce'] } }),
    task('Früchte des Tempelgartens', 'Fruit of the Temple Garden', 'Wascht und schneidet die geplanten Früchte in salattaugliche Stücke.', 'Wash and cut the planned fruit into salad-sized pieces.', 'fruit', [1, 2], 0, { safety: 'knife', ingredientRequirement: { categories: ['fruit'] } }),
    task('Dressing der Entdecker', 'Explorer’s Dressing', 'Wählt Joghurt oder Öl und Essig aus dem Grundvorrat als Basis. Verwendet Honig oder Senf nur, wenn sie dem Salat zugeordnet wurden, und balanciert Süße, Salz und Säure.', 'Choose yoghurt or oil and vinegar from the shared pantry as the base. Use honey or mustard only if assigned to the salad, then balance sweetness, salt, and acidity.', 'dressing', [2, 2]),
    task('Die große Dschungelschale', 'The Great Jungle Bowl', 'Gebt feste Zutaten und gegebenenfalls das abgekühlte, durchgegarte Fleisch zuerst in eine ausreichend große Schale. Empfindliche Blätter kommen zuletzt dazu.', 'Place sturdy ingredients and any cooled, fully cooked meat in a large bowl first. Add delicate leaves last.', 'assembly', [2, 3]),
    task('Der letzte grüne Pfad', 'The Final Green Path', 'Hebt das Dressing erst kurz vor dem Servieren vorsichtig unter und richtet den Salat an.', 'Fold in the dressing gently just before serving and plate the salad.', 'serving', [2, 3]),
    task('Gemüse aus dem Ruinenhof', 'Vegetables from the Ruined Court', 'Schneidet die tatsächlich zugeordneten Gemüse gleichmäßig, aber nicht zu klein.', 'Cut the vegetables actually assigned to this course evenly without making them too small.', 'vegetables', [1, 2], 0, { safety: 'knife', ingredientRequirement: { categories: ['vegetable'], excludeIds: ['lettuce'] } }),
    task('Kerne am Papageienpfad', 'Seeds on the Parrot Trail', 'Röstet die zugeordneten Nüsse oder Kerne kurz trocken an und lasst sie vor dem Salat abkühlen.', 'Toast the assigned nuts or seeds briefly in a dry pan and cool them before adding them to the salad.', 'hotplate', [1, 1], 0, { safety: 'hotPan', ingredientRequirement: { ids: ['nuts', 'seeds'] } }),
    task('Die erste Gartenprobe', 'The First Garden Tasting', 'Prüft das Dressing einzeln und anschließend an einem kleinen Probebissen.', 'Taste the dressing alone and then on a small sample bite.', 'quality', [2, 2]),
    task('Kräuter aus dem Grundvorrat', 'Herbs from the Shared Pantry', 'Wählt passende frische Kräuter frei zum Abschmecken und zupft oder schneidet sie erst kurz vor dem Mischen.', 'Freely choose suitable fresh herbs for final seasoning and pick or cut them only shortly before mixing.', 'seasoning', [1, 2]),
    task('Schalen des Tempels', 'Bowls of the Temple', 'Stellt Teller, Besteck und Servierlöffel bereit, ohne den Arbeitsweg zu blockieren.', 'Set out plates, cutlery, and serving spoons without blocking the work area.', 'serving', [1, 2]),
    task('Der saubere Pfad', 'The Clear Path', 'Räumt Messer und Bretter weg, wischt feuchte Flächen und lagert übrige Zutaten kühl.', 'Put away knives and boards, wipe damp surfaces, and refrigerate remaining ingredients.', 'cleanup', [1, 2]),
    task('Suppenschalen abräumen', 'Clear the Soup Bowls', 'Sammelt Suppenschalen, Löffel und Serviergefäße ein, sichert heiße oder volle Schalen und wischt den Tisch frei. Erst danach beginnt die Zutatenwahl für den Salat.', 'Collect soup bowls, spoons, and serving dishes, handle hot or full bowls safely, and wipe the table clear. Salad ingredient selection begins only afterwards.', 'reset', [2, 3], 0, { estimatedMinutes: 5, challengeMinutes: 6 }),
    task('Salatfleisch mundgerecht schneiden', 'Cut the Salad Meat', 'Schneidet das dem Salat zugeordnete rohe Fleisch auf einem separaten Brett in kleine, gleichmäßige Stücke. Reinigt danach sofort Hände, Messer, Brett und alle Kontaktflächen.', 'Cut the raw meat assigned to the salad into small, even pieces on a separate board. Immediately clean hands, knife, board, and every contact surface afterwards.', 'protein', [1, 2], 0, { estimatedMinutes: 6, challengeMinutes: 7, safety: 'rawMeat', ingredientRequirement: { categories: ['meat'] } }),
    task('Salatfleisch in der Pfanne braten', 'Fry the Salad Meat', 'Bratet die Fleischstücke in einer sauberen Pfanne vollständig durch. Prüft den Gargrad am dicksten Stück und lasst das Fleisch anschließend in einem sauberen Gefäß kurz abkühlen, bevor es in den Salat kommt. Dafür läuft kein Spieltimer.', 'Fry the meat pieces in a clean pan until fully cooked. Check doneness at the thickest piece, then let the meat cool briefly in a clean container before adding it to the salad. No game timer runs for this step.', 'hotplate', [1, 2], 0, { timingMode: 'manual', estimatedMinutes: 8, safety: 'foodTemperature', ingredientRequirement: { categories: ['meat'] } })
  ],
  main: [
    task('Kriegsrat der Festung', 'Fortress Council', 'Legt fest, wie die erspielten Fleischstücke, Gemüse, Früchte, Nüsse und Kerne gemeinsam im Bratschlauch gegart werden.', 'Decide how the won meat, vegetables, fruit, nuts, and seeds will cook together in the roasting bag.', 'planning', [2, 3]),
    task('Fleisch für das Feuerpaket', 'Meat for the Fire Parcel', 'Bereitet das zugeordnete Fleisch auf einem eigenen Brett vor, entfernt nur nötige Abschnitte und portioniert es passend für gleichmäßiges Garen. Reinigt danach sofort Hände, Messer, Brett und Kontaktflächen.', 'Prepare the assigned meat on a separate board, trim only where necessary, and portion it for even cooking. Immediately clean hands, knife, board, and contact surfaces afterwards.', 'protein', [2, 3], 0, { estimatedMinutes: 8, challengeMinutes: 8, safety: 'rawMeat', ingredientRequirement: { categories: ['meat'] } }),
    task('Gemüse für den Bratschlauch', 'Vegetables for the Roasting Bag', 'Wascht und schneidet alle zugeordneten Gemüse in robuste, ähnlich große Stücke. Kartoffeln und anderes festes Gemüse dürfen kleiner sein als schnell garende Sorten.', 'Wash and cut every assigned vegetable into sturdy, similarly sized pieces. Potatoes and other firm vegetables may be smaller than quick-cooking varieties.', 'vegetables', [2, 3], 0, { estimatedMinutes: 8, challengeMinutes: 8, safety: 'knife', ingredientRequirement: { categories: ['vegetable'] } }),
    task('Obst für das Feuerpaket', 'Fruit for the Fire Parcel', 'Falls Obst zugeordnet ist, entkernt und schneidet es in große Stücke, damit es im Bratschlauch Struktur behält und nur eine fruchtige Note abgibt.', 'If fruit is assigned, stone or core it and cut it into large pieces so it keeps some structure in the roasting bag and adds only a fruity note.', 'fruit', [1, 2], 0, { estimatedMinutes: 5, challengeMinutes: 6, safety: 'knife', ingredientRequirement: { categories: ['fruit'] } }),
    task('Sauce der Feuerbucht', 'Fire Bay Sauce', 'Rührt aus trockenem Wein, Sojasauce und passenden Gewürzen eine kräftige, aber nicht zu salzige Sauce an. Ergänzt bei Bedarf etwas Wasser oder Öl sowie nur passende erspielte Zutaten wie Honig oder Senf. Die Sauce kommt später vollständig in den Bratschlauch.', 'Mix dry wine, soy sauce, and suitable seasonings into a strong but not overly salty sauce. Add a little water or oil if needed and only suitable played ingredients such as honey or mustard. All of this sauce will later go into the roasting bag.', 'sauce', [1, 2], 0, { estimatedMinutes: 6, challengeMinutes: 7 }),
    task('Glut in der Festung', 'Heat in the Fortress', 'Heizt den Ofen rechtzeitig auf die Temperatur vor, die Bratschlauch, Gerät und verwendetes Fleisch verlangen. Stellt ein ausreichend großes tiefes Blech oder eine ofenfeste Form bereit.', 'Preheat the oven in time to the temperature required by the roasting bag, appliance, and chosen meat. Set out a sufficiently large deep tray or ovenproof dish.', 'oven', [1, 1], 0, { estimatedMinutes: 3, challengeMinutes: 4, safety: 'hotOven' }),
    task('Das große Feuerpaket befüllen', 'Fill the Great Fire Parcel', 'Legt den Bratschlauch nach Packungsangabe in die Form. Gebt Gemüse, Obst, Nüsse oder Kerne und anschließend das Fleisch hinein, verteilt die vorbereitete Sauce darüber und sorgt dafür, dass die Zutaten nicht zu dicht gepresst liegen.', 'Place the roasting bag in the dish according to its instructions. Add vegetables, fruit, nuts or seeds, then the meat; pour over the prepared sauce and keep the ingredients from being packed too tightly.', 'assembly', [2, 3], 0, { estimatedMinutes: 7, challengeMinutes: 8, safety: 'rawMeat' }),
    task('Feuerpaket verschließen und einschiffen', 'Seal and Load the Fire Parcel', 'Verschließt beziehungsweise öffnet den Bratschlauch exakt nach Packungsangabe, legt ihn sicher in die Form und schiebt ihn so in den Ofen, dass die Folie keine Heizfläche berührt. Dieser Schritt endet, sobald die Ofentür geschlossen ist.', 'Seal or vent the roasting bag exactly as its package directs, place it safely in the dish, and put it into the oven without letting the film touch a heating element. This step ends once the oven door is closed.', 'oven', [1, 2], 0, { estimatedMinutes: 3, challengeMinutes: 4, safety: 'hotOven' }),
    task('Bratschlauch backen lassen', 'Let the Roasting Bag Bake', 'Der Bratschlauch gart jetzt nach den Hinweisen für Gerät, Packung und verwendetes Fleisch. Diese Aufgabe ist niemandem zugewiesen und bleibt während des Backens in der Aufgabenliste offen. Kontrolliert bei Bedarf Lage, Flüssigkeit und Garfortschritt, ohne unnötig Hitze entweichen zu lassen. Bestätigt „Backen ist fertig“ erst, wenn alles vollständig und gleichmäßig gegart ist; im Zweifel müssen an allen Stellen mindestens 70 °C für zwei Minuten erreicht sein.', 'The roasting bag now cooks according to the appliance, package, and meat instructions. This task is assigned to nobody and remains open in the task list while baking. Check its position, liquid, and cooking progress when needed without releasing unnecessary heat. Confirm “Baking is finished” only when everything is thoroughly and evenly cooked; if in doubt, verify at least 70 °C for two minutes throughout.', 'oven', [0, 0], 0, { timingMode: 'manual', estimatedMinutes: 45, safety: 'foodTemperature', automatic: true, unassigned: true, completionLabel: { de: 'Backen ist fertig', en: 'Baking is finished' } }),
    task('Ruhe vor dem Festmahl', 'Rest before the Feast', 'Nehmt die Form vorsichtig heraus und lasst den geschlossenen Bratschlauch fünf Minuten ruhen. Öffnet ihn erst danach mit Abstand und vom Gesicht weg, damit heißer Dampf sicher entweicht.', 'Remove the dish carefully and rest the closed roasting bag for five minutes. Only then open it from a distance and away from your face so hot steam can escape safely.', 'oven', [1, 2], 5, { timingMode: 'background', safety: 'hotSteam' }),
    task('Sauce aus dem Bratschlauch vollenden', 'Finish the Roasting-Bag Sauce', 'Fangt die heiße Sauce sicher auf, probiert sie mit einem sauberen Löffel und serviert sie direkt oder reduziert sie kurz. Korrigiert Salz und Säure vorsichtig, da Sojasauce und Garfond bereits kräftig sein können.', 'Collect the hot sauce safely, taste it with a clean spoon, and serve it directly or reduce it briefly. Adjust salt and acidity carefully because soy sauce and cooking juices may already be strong.', 'sauce', [1, 2], 0, { estimatedMinutes: 5, challengeMinutes: 6, safety: 'hotPan' }),
    task('Platten der Feuerwache', 'Platters of the Fire Watch', 'Richtet Fleisch, Gemüse, Obst und weitere Bestandteile gemeinsam mit der Sauce übersichtlich an und haltet rohe Kontaktflächen konsequent fern.', 'Arrange the meat, vegetables, fruit, other components, and sauce clearly while keeping raw-contact surfaces strictly away.', 'serving', [2, 3]),
    task('Die gereinigte Schmiede', 'The Clean Forge', 'Reinigt alle Flächen und Werkzeuge mit Rohfleischkontakt gründlich, entsorgt den Bratschlauch sicher und räumt heiße Geräte erst nach dem Abkühlen weg.', 'Clean every surface and tool that touched raw meat, dispose of the roasting bag safely, and put hot equipment away only after it has cooled.', 'cleanup', [2, 3], 0, { safety: 'rawMeat' }),
    task('Salatteller abräumen', 'Clear the Salad Plates', 'Sammelt Salatschalen, Teller, Besteck und Servierlöffel ein, stellt Reste kühl und wischt den Tisch vollständig frei. Erst danach beginnt die Zutatenwahl für den Hauptgang.', 'Collect salad bowls, plates, cutlery, and serving spoons, refrigerate leftovers, and wipe the table completely clear. Main-course ingredient selection begins only afterwards.', 'reset', [2, 3], 0, { estimatedMinutes: 5, challengeMinutes: 6 })
  ],
  dessert: [
    task('Zwei Crews an der Lagune', 'Two Crews at the Lagoon', 'Teilt euch in zwei möglichst gleich große Teams und gebt jeder Gruppe einen eigenen Arbeitsbereich.', 'Split into two similar-sized teams and give each one its own work area.', 'planning', [2, 3]),
    task('Früchte der Plantage', 'Plantation Fruit', 'Wascht und schneidet die geplanten Früchte; haltet Garnitur und zu verarbeitende Stücke getrennt.', 'Wash and cut the planned fruit; keep garnish separate from fruit to be processed.', 'fruit', [2, 3], 0, { safety: 'knife' }),
    task('Die warme Fruchtbeute', 'Warm Fruit Treasure', 'Entscheidet zwischen karamellisiertem Obst, Obstsalat oder Püree und bereitet eine Variante in kleinen Schritten vor.', 'Choose caramelised fruit, fruit salad, or purée and prepare one option in small steps.', 'fruit', [2, 2], 8, { safety: 'hotSugar' }),
    task('Eis aus der Höhle', 'Ice from the Cave', 'Plant Vanilleeis und – falls zugeordnet – die zweite Eissorte so, dass beide Kreationen ausreichend und unterscheidbar bleiben.', 'Plan the vanilla ice cream and, if assigned, the second flavour so both creations remain sufficient and distinct.', 'cold', [1, 2]),
    task('Die zwei Schatzpläne', 'The Two Treasure Plans', 'Ein Team entwickelt eine fruchtige Richtung; das andere kombiniert die übrigen zugeordneten Zutaten zu einer klar unterscheidbaren Variante.', 'One team develops a fruity direction; the other combines the remaining assigned ingredients into a clearly distinct variation.', 'assembly', [4, 6]),
    task('Kühle Wache', 'The Cool Watch', 'Stellt vorbereitete Bestandteile zehn Minuten kühl. Die Kühlzeit läuft als Erinnerung im Hintergrund und ist keine Münz-Challenge.', 'Chill prepared components for ten minutes. The chilling time is a background reminder, not a coin challenge.', 'cold', [1, 2], 10, { timingMode: 'background' }),
    task('Süße Wolken', 'Sweet Clouds', 'Bereitet eine luftige oder cremige Komponente aus euren Grundvorräten vor und haltet sie bis zum Servieren kalt.', 'Prepare an airy or creamy component from your basic pantry and keep it cold until serving.', 'cold', [1, 2]),
    task('Garnitur aus der Truhe', 'Garnish from the Chest', 'Bereitet die zugeordneten Streusel, Schokolade, Nüsse oder Kerne getrennt vor, damit beide Teams bewusst dosieren können.', 'Prepare the assigned sprinkles, chocolate, nuts, or seeds separately so both teams can dose them deliberately.', 'garnish', [1, 2], 0, { ingredientRequirement: { ids: ['sprinkles', 'chocolate', 'nuts', 'seeds'] } }),
    task('Die erste Lagunenprobe', 'The First Lagoon Tasting', 'Prüft Süße, Temperatur und Textur beider Kreationen und ändert nur einen Punkt gleichzeitig.', 'Check sweetness, temperature, and texture of both creations and change only one point at a time.', 'quality', [2, 2]),
    task('Optionale Geisterbeute', 'Optional Spirit Treasure', 'Falls gewünscht, gebt die dem Dessert zugeordnete Spirituose nur in klar gekennzeichnete Erwachsenenportionen.', 'If desired, add the spirit assigned to the dessert only to clearly marked adult portions.', 'optional', [1, 2], 0, { ingredientRequirement: { categories: ['alcohol'] } }),
    task('Zwei Reihen am Sonnenpavillon', 'Two Rows at the Sun Pavilion', 'Richtet beide Dessertvarianten erkennbar getrennt und mit gleichmäßigen Portionen an.', 'Plate both dessert variations separately and in even portions.', 'serving', [2, 3]),
    task('Die kalte Kombüse', 'The Cold Galley', 'Stellt Eis sofort zurück, lagert Obst kühl und wischt klebrige Arbeitsflächen.', 'Return ice cream immediately, refrigerate fruit, and wipe sticky worktops.', 'cleanup', [1, 2]),
    task('Hauptgang abräumen', 'Clear the Main Course', 'Sammelt Teller, Besteck, Platten und Saucengefäße ein, bringt Reste sicher in die Küche und wischt den Tisch frei. Erst danach beginnt die Zutatenwahl für das Dessert.', 'Collect plates, cutlery, platters, and sauce dishes, take leftovers safely to the kitchen, and wipe the table clear. Dessert ingredient selection begins only afterwards.', 'reset', [2, 3], 0, { estimatedMinutes: 6, challengeMinutes: 7 })
  ],
  cocktails: [
    task('Der Plan des Barkeepers', 'The Bartender’s Plan', 'Die zu Beginn dieses Gangs gewählten Cocktail-Teams übernehmen ihre jeweilige Mischung; gemeinsame Grundlagen bereitet die ganze Crew vor.', 'The cocktail teams chosen at the start of this course take charge of their respective mixes; the whole crew prepares shared bases.', 'planning', [2, 3]),
    task('Früchte aus der Piratenkiste', 'Fruit from the Pirate Crate', 'Wascht und schneidet übrige Früchte; reserviert schöne Stücke für die Garnitur.', 'Wash and cut remaining fruit; reserve attractive pieces for garnish.', 'fruit', [2, 3], 0, { safety: 'knife' }),
    task('Saft aus dem Schiffswrack', 'Juice from the Shipwreck', 'Presst oder zerdrückt geeignete Früchte und verteilt den Grundsaft auf beide Teams.', 'Press or crush suitable fruit and divide the base juice between both teams.', 'mixing', [2, 2]),
    task('Mischung der Freibeuter', 'The Freebooter Mix', 'Das alkoholische Team baut seine Mischung mit den ein bis drei zugeordneten Spirituosensorten schrittweise aus Saft, Säure und Wasser auf und probiert die Balance selbst.', 'The alcoholic team gradually builds its mix with the one to three assigned spirits, juice, acidity, and water and tastes the balance themselves.', 'alcoholic', [2, 3]),
    task('Mischung der Steuermänner', 'The Helmsman Mix', 'Baut die alkoholfreie Mischung mit Saft, Frucht, Säure und Mineralwasser eigenständig auf.', 'Build the alcohol-free mix independently with juice, fruit, acidity, and mineral water.', 'alcohol-free', [2, 3]),
    task('Das letzte Glas', 'The Final Glass', 'Kennzeichnet beide Varianten eindeutig, verteilt den verbindlichen Eiswürfel-Grundvorrat und serviert alle Gläser gemeinsam.', 'Label both versions unmistakably, distribute the required ice-cube supply, and serve every glass together.', 'serving', [2, 3]),
    task('Vorrat aus der Eishöhle', 'Supply from the Ice Cave', 'Stellt den verbindlichen Eiswürfel-Grundvorrat für beide Cocktails bereit, ohne den Arbeitsbereich mit Schmelzwasser zu überfluten.', 'Set out the required ice-cube supply for both cocktails without flooding the workspace with meltwater.', 'cold', [1, 2]),
    task('Süße Beute', 'Sweet Treasure', 'Passt Süße in kleinen Schritten an und probiert nach jeder Änderung mit einem frischen Löffel.', 'Adjust sweetness in small steps and taste after every change with a fresh spoon.', 'quality', [1, 2]),
    task('Säure der Brandung', 'Acidity of the Surf', 'Balanciert beide Varianten getrennt mit Zitrone, Limette oder anderer Fruchtsäure.', 'Balance both versions separately with lemon, lime, or another fruit acidity.', 'quality', [1, 2]),
    task('Die gewählte Mischtechnik', 'The Chosen Mixing Technique', 'Setzt für beide Cocktails die zuvor verbindlich gewählte Technik um: gerührte Mischungen werden im Krug gründlich kalt gerührt, gemixte Mischungen portionsweise im Mixer verarbeitet.', 'Carry out the previously chosen technique for both cocktails: stir stirred mixes thoroughly and cold in a jug, and blend mixed drinks in batches.', 'mixing', [2, 2]),
    task('Flaggen der beiden Crews', 'Flags of the Two Crews', 'Kennzeichnet alkoholische und alkoholfreie Gläser dauerhaft und verwechslungssicher.', 'Mark alcoholic and alcohol-free glasses permanently and unmistakably.', 'safety', [1, 2]),
    task('Freie Fläche hinter der Bar', 'Clear Space behind the Bar', 'Verschließt Flaschen, räumt Messer weg und wischt klebrige oder nasse Flächen.', 'Close bottles, put away knives, and wipe sticky or wet surfaces.', 'cleanup', [1, 2]),
    task('Desserttisch abräumen', 'Clear the Dessert Table', 'Sammelt Dessertschalen, Löffel und Garniturschälchen ein, stellt Eis und empfindliche Reste sofort kalt und wischt den Tisch frei. Erst danach beginnt die Zutatenwahl für die Cocktails.', 'Collect dessert bowls, spoons, and garnish dishes, return ice cream and delicate leftovers to the cold immediately, and wipe the table clear. Cocktail ingredient selection begins only afterwards.', 'reset', [2, 3], 0, { estimatedMinutes: 5, challengeMinutes: 6 })
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
    extras: { de: 'Einlage & Garnitur', en: 'Extras & Garnish' }, serve: { de: 'Kessel servieren', en: 'Serve the Cauldron' }, cleanup: { de: 'Kessel klar machen', en: 'Clear the Cauldron' }, reset: { de: 'Tapastafel klarmachen', en: 'Clear the Tapas Table' }
  },
  salad: {
    plan: { de: 'Salatplan', en: 'Salad Plan' },
    leaves: { de: 'Blätter vorbereiten', en: 'Prepare Leaves' }, fruit: { de: 'Früchte vorbereiten', en: 'Prepare Fruit' },
    vegetables: { de: 'Gemüse vorbereiten', en: 'Prepare Vegetables' }, crunch: { de: 'Nüsse & Kerne', en: 'Nuts & Seeds' },
    seasoning: { de: 'Kräuterroute', en: 'Herb Route' },
    protein: { de: 'Salatfleisch', en: 'Salad Meat' },
    dressing: { de: 'Dressingroute', en: 'Dressing Route' }, assemble: { de: 'Dschungelschale', en: 'Jungle Bowl' },
    serve: { de: 'Grüner Pfad', en: 'Green Path' }, cleanup: { de: 'Sauberer Pfad', en: 'Clear Path' }, reset: { de: 'Suppentafel klarmachen', en: 'Clear the Soup Table' }
  },
  main: {
    plan: { de: 'Festungsplan', en: 'Fortress Plan' }, meat: { de: 'Fleisch vorbereiten', en: 'Prepare Meat' },
    vegetables: { de: 'Gemüse vorbereiten', en: 'Prepare Vegetables' }, fruit: { de: 'Obst vorbereiten', en: 'Prepare Fruit' },
    sauce: { de: 'Backschlauch-Sauce', en: 'Roasting-Bag Sauce' }, preheat: { de: 'Ofen vorbereiten', en: 'Prepare Oven' },
    assembly: { de: 'Feuerpaket befüllen', en: 'Fill the Fire Parcel' }, oven: { de: 'Ofenreise', en: 'Oven Voyage' }, finish: { de: 'Festmahl vollenden', en: 'Finish the Feast' },
    serve: { de: 'Festungstafel', en: 'Fortress Table' }, cleanup: { de: 'Schmiede reinigen', en: 'Clean the Forge' }, reset: { de: 'Salattafel klarmachen', en: 'Clear the Salad Table' }
  },
  dessert: {
    plan: { de: 'Lagunenplan', en: 'Lagoon Plan' }, fruit: { de: 'Fruchtbeute', en: 'Fruit Treasure' },
    cold: { de: 'Kühle Kreationen', en: 'Chilled Creations' }, finish: { de: 'Süße Garnitur', en: 'Sweet Garnish' },
    serve: { de: 'Sonnenpavillon', en: 'Sun Pavilion' }, cleanup: { de: 'Kalte Kombüse', en: 'Cold Galley' }, reset: { de: 'Festtafel klarmachen', en: 'Clear the Feast Table' }
  },
  cocktails: {
    plan: { de: 'Barplan', en: 'Bar Plan' }, fruit: { de: 'Fruchtbasis', en: 'Fruit Base' },
    alcoholic: { de: 'Alkoholische Crew-Mischung', en: 'Alcoholic Crew Mix' },
    'alcohol-free': { de: 'Alkoholfreie Crew-Mischung', en: 'Alcohol-free Crew Mix' },
    mixes: { de: 'Gemeinsame Mischtechnik', en: 'Shared Mixing Technique' }, finish: { de: 'Balance & Sicherheit', en: 'Balance & Safety' },
    serve: { de: 'Letzte Gläser', en: 'Final Glasses' }, cleanup: { de: 'Bar klar machen', en: 'Clear the Bar' }, reset: { de: 'Desserttisch klarmachen', en: 'Clear the Dessert Table' }
  }
});

const QUEST_ASSIGNMENTS = Object.freeze({
  tapas: ['plan', 'dates', 'bread', 'cold', 'cold', 'serve', 'serve', 'dates', 'bread', 'serve', 'cleanup', 'story', 'dates', 'dates', 'bread', 'bread'],
  soup: ['plan', 'vegetables', 'vegetables', 'cauldron', 'cauldron', 'finish', 'finish', 'extras', 'finish', 'extras', 'serve', 'cleanup', 'finish', 'reset'],
  salad: ['plan', 'leaves', 'fruit', 'dressing', 'assemble', 'serve', 'vegetables', 'crunch', 'dressing', 'seasoning', 'serve', 'cleanup', 'reset', 'protein', 'protein'],
  main: ['plan', 'meat', 'vegetables', 'fruit', 'sauce', 'preheat', 'assembly', 'oven', 'oven', 'finish', 'finish', 'serve', 'cleanup', 'reset'],
  dessert: ['plan', 'fruit', 'fruit', 'cold', 'cold', 'cold', 'cold', 'finish', 'finish', 'finish', 'serve', 'cleanup', 'reset'],
  cocktails: ['plan', 'fruit', 'fruit', 'alcoholic', 'alcohol-free', 'serve', 'finish', 'finish', 'finish', 'mixes', 'finish', 'cleanup', 'reset']
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
      5: [[3, 'done'], [4, 'done'], [8, 'done'], [9, 'done'], [13, 'done']],
      6: [[5, 'done']],
      10: [[5, 'done']]
    }
  },
  soup: {
    skip: [0],
    requires: {
      2: [[1, 'done']], 3: [[2, 'done'], [7, 'done']], 4: [[3, 'done']],
      5: [[4, 'done']], 12: [[4, 'done']],
      8: [[6, 'done'], [7, 'done']],
      10: [[8, 'done']], 11: [[10, 'done']]
    },
    requiresAny: { 8: [[5, 'done'], [12, 'done']] }
  },
  salad: {
    skip: [0],
    requires: {
      4: [[1, 'done'], [2, 'done'], [3, 'done'], [6, 'done'], [7, 'done'], [9, 'done'], [14, 'done']],
      8: [[4, 'done']], 5: [[8, 'done']], 11: [[5, 'done']], 14: [[13, 'done']]
    }
  },
  main: {
    skip: [0],
    requires: {
      6: [[1, 'done'], [2, 'done'], [3, 'done'], [4, 'done'], [5, 'done']],
      7: [[6, 'done']], 8: [[7, 'done']], 9: [[8, 'done']],
      10: [[9, 'done']], 11: [[10, 'done']], 12: [[11, 'done']]
    }
  },
  dessert: {
    skip: [0],
    requires: {
      2: [[1, 'done']], 4: [[1, 'done'], [3, 'done']], 5: [[2, 'done'], [4, 'done']],
      8: [[5, 'done'], [6, 'done'], [7, 'done']], 9: [[8, 'done']], 10: [[8, 'done'], [9, 'done']], 11: [[10, 'done']]
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
  const deck = blueprints.map((blueprint, blueprintIndex) => {
    const number = blueprintIndex * 2 + 1;
    const estimatedMinutes = blueprint.estimatedMinutes || blueprint.backgroundMinutes || DEFAULT_ESTIMATED_MINUTES[blueprint.area] || 4;
    const questId = QUEST_ASSIGNMENTS[chapter.id][blueprintIndex] ?? 'plan';
    const questStep = (questSteps.get(questId) ?? 0) + 1;
    questSteps.set(questId, questStep);
    return {
      ...blueprint,
      estimatedMinutes,
      challengeMinutes: ['background', 'manual'].includes(blueprint.timingMode) ? 0 : (blueprint.challengeMinutes ?? Math.max(2, Math.min(8, estimatedMinutes))),
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
  const addDoneRequirements = (card, requiredCards) => {
    const existing = new Set(card.prerequisites.map((requirement) => requirement.requiredBlueprintIndex));
    requiredCards.forEach((requiredCard) => {
      if (requiredCard.id === card.id || existing.has(requiredCard.blueprintIndex)) return;
      card.prerequisites.push({ requiredBlueprintIndex: requiredCard.blueprintIndex, state: 'done' });
      existing.add(requiredCard.blueprintIndex);
    });
  };
  const preparationCards = deck.filter((card) => card.playable && !['serve', 'cleanup', 'reset'].includes(card.questId));
  const servingCards = deck.filter((card) => card.playable && card.questId === 'serve');
  const cleanupCards = deck.filter((card) => card.playable && card.questId === 'cleanup');
  const completedCourseCards = deck.filter((card) => card.playable && !['cleanup', 'reset'].includes(card.questId));
  servingCards.forEach((card) => addDoneRequirements(card, preparationCards));
  cleanupCards.forEach((card) => addDoneRequirements(card, completedCourseCards));
  return deck;
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
