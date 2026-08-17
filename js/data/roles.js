export const ROLES = Object.freeze([
  {
    id: 'cook', icon: '♨', name: { de: 'Koch', en: 'Cook' }, color: '#d86a4c',
    passive: { de: 'Einmal pro Gang kann der Effekt einer Zutatenkarte ignoriert werden.', en: 'Once per course, the effect of an ingredient card may be ignored.' },
    active: { de: 'Löst den Effekt der zuletzt gezogenen Zutatenkarte erneut aus.', en: 'Trigger the last ingredient card effect again.' },
    activeCode: 'repeatIngredient', uses: 2
  },
  {
    id: 'scout', icon: '⌖', name: { de: 'Kundschafter', en: 'Scout' }, color: '#6aaa87',
    passive: { de: 'Die nächste Ereigniskarte ist vor dem Ziehen als Vorschau sichtbar.', en: 'The next event card is previewed before it is drawn.' },
    active: { de: 'Legt die aktuelle Ereigniskarte ab und zieht eine neue.', en: 'Discard the current event and draw a new one.' },
    activeCode: 'replaceEvent', uses: 2
  },
  {
    id: 'merchant', icon: '◇', name: { de: 'Händler', en: 'Merchant' }, color: '#d8a94c',
    passive: { de: 'Bei Zutatenfunden darf statt der obersten die zweite Karte genommen werden.', en: 'On ingredient draws, the second card may be taken instead of the top card.' },
    active: { de: 'Zieht zwei Zutatenkarten und behaltet eine.', en: 'Draw two ingredient cards and keep one.' },
    activeCode: 'chooseIngredient', uses: 2
  },
  {
    id: 'smith', icon: '⚒', name: { de: 'Schmied', en: 'Smith' }, color: '#8ca0aa',
    passive: { de: 'Ein Würfelwurf pro Gang darf wiederholt werden.', en: 'One die roll per course may be rerolled.' },
    active: { de: 'Verändert den aktuellen Würfelwurf um +1 oder −1.', en: 'Adjust the current die roll by +1 or −1.' },
    activeCode: 'adjustDie', uses: 3
  },
  {
    id: 'herbalist', icon: '❧', name: { de: 'Kräuterkundige', en: 'Herbalist' }, color: '#79a95f',
    passive: { de: 'Einmal pro Gang darf sofort eine Gemüsekarte gezogen werden.', en: 'Once per course, immediately draw one vegetable card.' },
    active: { de: 'Entdeckt sofort zwei Gemüsekarten und behaltet eine.', en: 'Discover two vegetable cards immediately and keep one.' },
    activeCode: 'chooseVegetable', uses: 2
  },
  {
    id: 'hunter', icon: '➶', name: { de: 'Jäger', en: 'Hunter' }, color: '#a96d57',
    passive: { de: 'Einmal pro Gang darf sofort eine Fleischkarte gezogen werden.', en: 'Once per course, immediately draw one meat card.' },
    active: { de: 'Entdeckt sofort zwei Fleischkarten und behaltet eine.', en: 'Discover two meat cards immediately and keep one.' },
    activeCode: 'chooseMeat', uses: 2
  },
  {
    id: 'gatherer', icon: '♧', name: { de: 'Sammler', en: 'Gatherer' }, color: '#cb8650',
    passive: { de: 'Einmal pro Gang darf sofort eine Obstkarte gezogen werden.', en: 'Once per course, immediately draw one fruit card.' },
    active: { de: 'Entdeckt sofort zwei Obstkarten und behaltet eine.', en: 'Discover two fruit cards immediately and keep one.' },
    activeCode: 'chooseFruit', uses: 2
  },
  {
    id: 'treasurer', icon: '♜', name: { de: 'Schatzmeister', en: 'Treasurer' }, color: '#d7b766',
    passive: { de: 'Vor dem Hauptgericht wird eine noch freie Zutat automatisch gesichert.', en: 'Before the main course, one free ingredient is secured automatically.' },
    active: { de: 'Sichert sofort eine unentdeckte Zutat für den aktuellen Gang.', en: 'Secure an undiscovered ingredient for the current course.' },
    activeCode: 'reserveIngredient', uses: 2
  },
  {
    id: 'alchemist', icon: '⚗', name: { de: 'Alchemist', en: 'Alchemist' }, color: '#8b75b5',
    passive: { de: 'Einmal pro Gang darf eine entdeckte Zutat derselben Kategorie getauscht werden.', en: 'Once per course, a discovered ingredient may be swapped within its category.' },
    active: { de: 'Tauscht die zuletzt entdeckte Zutat gegen eine passende Alternative.', en: 'Swap the last discovered ingredient for a suitable alternative.' },
    activeCode: 'swapIngredient', uses: 2
  },
  {
    id: 'tactician', icon: '✦', name: { de: 'Taktiker', en: 'Tactician' }, color: '#638aa9',
    passive: { de: 'Ein Ereigniseffekt pro Gang darf ohne Auswirkung abgeschlossen werden.', en: 'One event effect per course may be completed without applying it.' },
    active: { de: 'Mischt den verbleibenden Ereignisstapel und deckt eine neue Karte auf.', en: 'Shuffle the remaining event deck and reveal a new card.' },
    activeCode: 'shuffleEvents', uses: 2
  }
]);

export function getRole(roleId) {
  return ROLES.find((role) => role.id === roleId);
}
