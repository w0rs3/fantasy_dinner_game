export const CHAPTERS = Object.freeze([
  {
    id: 'tapas', number: 1, icon: '⚓', color: '#b74d3b',
    name: { de: 'Tapasinsel', en: 'Tapas Island' },
    course: { de: 'Tapas', en: 'Tapas' },
    subtitle: { de: 'Hafenstadt der ersten Vorräte', en: 'Harbour of first provisions' },
    atmosphere: { de: 'Salzluft, Glocken und geschäftige Händler begleiten die Crew.', en: 'Salt air, bells, and bustling merchants accompany the crew.' },
    description: { de: 'Spanische Tapas, ofenwarmes Brot und die erste Aufteilung der Küchencrew.', en: 'Spanish tapas, warm bread, and the first division of the galley crew.' },
    locations: [
      { de: 'Hafenbecken', en: 'Harbour Basin' }, { de: 'Leuchtturm', en: 'Lighthouse' },
      { de: 'Dorfplatz', en: 'Village Square' }, { de: 'Marktgasse', en: 'Market Lane' },
      { de: 'Olivenhain', en: 'Olive Grove' }, { de: 'Schmugglersteg', en: 'Smuggler’s Pier' }
    ],
    playMinutes: 28, eatingMinutes: 15
  },
  {
    id: 'soup', number: 2, icon: '♨', color: '#688c4c',
    name: { de: 'Nebelinsel', en: 'Mist Island' },
    course: { de: 'Suppe', en: 'Soup' },
    subtitle: { de: 'Die Suche nach dem Suppenkessel', en: 'The search for the soup cauldron' },
    atmosphere: { de: 'Nebel zieht durch die Täler und verbirgt neue Vorräte.', en: 'Mist drifts through the valleys and hides new provisions.' },
    description: { de: 'Eine improvisierte klare Suppe oder Cremesuppe aus den erspielten Gemüsen und Einlagen.', en: 'An improvised clear or cream soup made from the vegetables and extras won in play.' },
    locations: [
      { de: 'Nebelquelle', en: 'Mist Spring' }, { de: 'Kräuterhütte', en: 'Herb Hut' },
      { de: 'Pilzwald', en: 'Mushroom Wood' }, { de: 'Moorsteg', en: 'Mooring Walk' },
      { de: 'Steinbruch', en: 'Quarry' }, { de: 'Altes Pumpwerk', en: 'Old Pump House' }
    ],
    playMinutes: 32, eatingMinutes: 15
  },
  {
    id: 'salad', number: 3, icon: '❧', color: '#73994e',
    name: { de: 'Dschungelinsel', en: 'Jungle Island' },
    course: { de: 'Salat', en: 'Salad' },
    subtitle: { de: 'Der grüne Tempelpfad', en: 'The green temple path' },
    atmosphere: { de: 'Warme Blätter, alte Ruinen und frische Früchte säumen den Pfad.', en: 'Warm leaves, old ruins, and fresh fruit line the path.' },
    description: { de: 'Blattsalat, Gemüse, Früchte, Kerne und ein erspieltes Dressing.', en: 'Leaf salad, vegetables, fruit, seeds, and a dressing chosen by play.' },
    locations: [
      { de: 'Dschungeltor', en: 'Jungle Gate' }, { de: 'Tempelgarten', en: 'Temple Garden' },
      { de: 'Papageienpfad', en: 'Parrot Trail' }, { de: 'Wasserfall', en: 'Waterfall' },
      { de: 'Ruinenhof', en: 'Ruined Court' }, { de: 'Grüner Altar', en: 'Green Altar' }
    ],
    playMinutes: 24, eatingMinutes: 12
  },
  {
    id: 'main', number: 4, icon: '♨', color: '#73508f',
    name: { de: 'Vulkaninsel', en: 'Volcano Island' },
    course: { de: 'Hauptgericht', en: 'Main Course' },
    subtitle: { de: 'Die Festung des Hauptgerichts', en: 'The fortress of the main course' },
    atmosphere: { de: 'Glühende Pfade, Schmiedehämmer und der Duft des Lagerfeuers weisen den Weg.', en: 'Glowing paths, smithing hammers, and campfire aromas guide the way.' },
    description: { de: 'Fleisch, Restgemüse und Früchte garen gemeinsam im Bratschlauch.', en: 'Meat, remaining vegetables, and fruit roast together in a roasting bag.' },
    locations: [
      { de: 'Aschehafen', en: 'Ash Harbour' }, { de: 'Schmiede', en: 'Forge' },
      { de: 'Lavabrücke', en: 'Lava Bridge' }, { de: 'Festungstor', en: 'Fortress Gate' },
      { de: 'Vulkanküche', en: 'Volcano Galley' }, { de: 'Feuerplateau', en: 'Fire Plateau' }
    ],
    playMinutes: 48, eatingMinutes: 24
  },
  {
    id: 'dessert', number: 5, icon: '♧', color: '#b26d32',
    name: { de: 'Tropeninsel', en: 'Tropical Island' },
    course: { de: 'Dessert', en: 'Dessert' },
    subtitle: { de: 'Die Lagune der süßen Schätze', en: 'Lagoon of sweet treasures' },
    atmosphere: { de: 'Süße Düfte, warmer Sand und funkelnde Lagunen teilen die Crew.', en: 'Sweet aromas, warm sand, and glittering lagoons divide the crew.' },
    description: { de: 'Zwei Teams entwickeln unterschiedliche Eis- und Fruchtkreationen.', en: 'Two teams create different ice-cream and fruit combinations.' },
    locations: [
      { de: 'Palmenstrand', en: 'Palm Beach' }, { de: 'Obstplantage', en: 'Fruit Plantation' },
      { de: 'Zuckerpfad', en: 'Sugar Trail' }, { de: 'Lagune', en: 'Lagoon' },
      { de: 'Eishöhle', en: 'Ice Cave' }, { de: 'Sonnenpavillon', en: 'Sun Pavilion' }
    ],
    playMinutes: 24, eatingMinutes: 12
  },
  {
    id: 'cocktails', number: 6, icon: '✦', color: '#28788f',
    name: { de: 'Piratenbucht', en: 'Pirate Cove' },
    course: { de: 'Cocktails', en: 'Cocktails' },
    subtitle: { de: 'Der letzte Kurs vor der Schatztruhe', en: 'The final course before the treasure' },
    atmosphere: { de: 'Laternen, Brandung und ferne Piratenrufe begleiten das Finale.', en: 'Lanterns, surf, and distant pirate calls accompany the finale.' },
    description: { de: 'Ein alkoholischer und ein alkoholfreier Cocktail aus den letzten Früchten.', en: 'One alcoholic and one alcohol-free cocktail made from the remaining fruit.' },
    locations: [
      { de: 'Strandbar', en: 'Beach Bar' }, { de: 'Schiffswrack', en: 'Shipwreck' },
      { de: 'Eishöhle', en: 'Ice Cave' }, { de: 'Anlegesteg', en: 'Landing Pier' },
      { de: 'Kapitänsdeck', en: 'Captain’s Deck' }, { de: 'Schatzbucht', en: 'Treasure Bay' }
    ],
    playMinutes: 20, eatingMinutes: 8
  }
]);

export function getChapter(chapterIndex) {
  return CHAPTERS[chapterIndex];
}

export const EXPECTED_SESSION_MINUTES = 12 + CHAPTERS.reduce(
  (total, chapter) => total + chapter.playMinutes + chapter.eatingMinutes,
  0
);
