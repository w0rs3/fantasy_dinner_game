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
    passive: { de: 'Bei Zutatenfunden durch Ereignisse werden drei gültige Zutaten angeboten und eine davon wird gewählt.', en: 'When an event finds ingredients, three valid ingredients are offered and one is chosen.' },
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
  },
  {
    id: 'lucky', icon: '☘', name: { de: 'Glückspilz', en: 'Lucky One' }, color: '#4f9f72',
    passive: { de: 'Münzverluste durch den eigenen Zug oder eine eigene Aufgabe fallen immer um 1 Münze geringer aus.', en: 'Coin losses caused by this player’s turn or one of their tasks are always reduced by 1 coin.' },
    active: { de: 'Die nächste passende Aufgaben-Challenge erhält 2 Minuten mehr Zeit. Ihre Münzwertung wird dafür um 2 verschlechtert: 2 Münzen weniger Gewinn oder 2 Münzen mehr Verlust.', en: 'The next eligible task challenge gets 2 extra minutes. Its coin score is worsened by 2: gain 2 fewer coins or lose 2 more coins.' },
    activeCode: 'extendNextTask', uses: 3
  },
  {
    id: 'unlucky', icon: '☂', name: { de: 'Pechvogel', en: 'Unlucky One' }, color: '#866497',
    passive: { de: 'Münzverluste durch den eigenen Zug oder eine eigene Aufgabe fallen immer um 1 Münze höher aus.', en: 'Coin losses caused by this player’s turn or one of their tasks are always increased by 1 coin.' },
    active: { de: 'Die nächste passende Aufgaben-Challenge erhält 2 Minuten weniger Zeit. Ihre Münzwertung wird dafür um 2 verbessert: 2 Münzen mehr Gewinn oder 2 Münzen weniger Verlust.', en: 'The next eligible task challenge gets 2 fewer minutes. Its coin score is improved by 2: gain 2 extra coins or lose 2 fewer coins.' },
    activeCode: 'shortenNextTask', uses: 3
  },
  {
    id: 'gambler', icon: '⚄', name: { de: 'Gambler', en: 'Gambler' }, color: '#b66b4a',
    passive: { de: 'Bei Ereignissen mit normalerweise 5 Münzen Verlust würfelt der Gambler einen zusätzlichen W6. Die Augenzahl bestimmt stattdessen den Münzverlust.', en: 'On events that would normally lose 5 coins, the Gambler rolls an extra d6. The result determines the coin loss instead.' },
    active: { de: 'Einmal pro Gang würfeln: 6 = +6, 5 = +4, 4 = +2, 3 = −2, 2 = −4, 1 = −6 Münzen.', en: 'Roll once per course: 6 = +6, 5 = +4, 4 = +2, 3 = −2, 2 = −4, 1 = −6 coins.' },
    activeCode: 'gambleCoins', uses: 6
  }
]);

const ROLE_USAGE = Object.freeze({
  cook: {
    passiveUsage: { de: 'Bei der Auswahl einer Zutatenkarte mit Effekt erscheint „Nehmen, Effekt als Koch ignorieren“. Die Zutat bleibt im Gangkorb; nur ihr Karteneffekt entfällt.', en: 'When choosing an ingredient card with an effect, “Take it and ignore the effect as Cook” appears. The ingredient stays in the course basket; only its card effect is skipped.' },
    activeUsage: { de: 'Während der Zutatenphase, nachdem eine noch nicht fest zugeordnete Zutatenkarte mit Effekt gezogen wurde. Kostet 1 Einsatz und ist höchstens einmal pro Zug möglich.', en: 'During the ingredient stage, after drawing an ingredient card with an effect that is not yet locked. Costs 1 use and can be used at most once per turn.' },
    activeButton: { de: 'Letzten Zutateneffekt wiederholen', en: 'Repeat last ingredient effect' }
  },
  scout: {
    passiveUsage: { de: 'Automatisch im Ziehschritt: Vor dem Ziehen wird der Titel der nächsten passenden Ereigniskarte angezeigt. Dafür gibt es keinen Button und keinen begrenzten Einsatz.', en: 'Automatic during the draw step: the title of the next matching event card is shown before it is drawn. It has no button and no limited uses.' },
    activeUsage: { de: 'Solange eine Ereigniskarte offen und noch nicht abgeschlossen ist. Die offene Karte wird abgelegt und sofort ersetzt; kostet 1 Einsatz und ist höchstens einmal pro Zug möglich.', en: 'While an event card is face up and not yet resolved. The open card is discarded and immediately replaced; costs 1 use and can be used at most once per turn.' },
    activeButton: { de: 'Offenes Ereignis ersetzen', en: 'Replace open event' }
  },
  merchant: {
    passiveUsage: { de: 'Automatisch bei Zutatenfunden durch Ereignisse: Es werden drei gültige Zutaten angeboten und eine davon wird gewählt. Dafür gibt es keinen eigenen Button.', en: 'Automatic when an event finds ingredients: three valid ingredients are offered and one is chosen. It has no separate button.' },
    activeUsage: { de: 'Während der Zutatenphase in einem freien Zieh- oder Ereignisschritt. Öffnet zwei beliebige gültige Zutaten zur Auswahl; kostet 1 Einsatz und ist höchstens einmal pro Zug möglich.', en: 'During the ingredient stage in a free draw or event step. Opens two valid ingredients of any kind to choose from; costs 1 use and can be used at most once per turn.' },
    activeButton: { de: 'Zwei beliebige Zutaten ziehen', en: 'Draw two ingredients' }
  },
  smith: {
    passiveUsage: { de: 'Nach einem Würfelwurf und vor dessen Bestätigung erscheint „Noch einmal würfeln · Schmied“. Das alte Ergebnis wird ersetzt; die aktive Fähigkeit wird dabei nicht verbraucht.', en: 'After a die roll and before confirming it, “Roll again · Smith” appears. The old result is replaced; this does not consume the active ability.' },
    activeUsage: { de: 'Nach einem Würfelwurf und vor dessen Bestätigung. Wählt −1 oder +1; das Ergebnis bleibt zwischen 1 und 6. Kostet 1 Einsatz und ist höchstens einmal pro Zug möglich.', en: 'After a die roll and before confirming it. Choose −1 or +1; the result stays between 1 and 6. Costs 1 use and can be used at most once per turn.' },
    activeButton: { de: 'Würfelergebnis verändern', en: 'Adjust die result' }
  },
  herbalist: {
    passiveUsage: { de: 'Während der Zutatenphase in einem freien Zieh- oder Ereignisschritt. Der Button zieht genau eine gültige Gemüsekarte; die aktive Fähigkeit wird dabei nicht verbraucht.', en: 'During the ingredient stage in a free draw or event step. The button draws exactly one valid vegetable card; this does not consume the active ability.' },
    passiveButton: { de: 'Eine Gemüsekarte ziehen (passiv)', en: 'Draw one vegetable card (passive)' },
    activeUsage: { de: 'Während der Zutatenphase in einem freien Zieh- oder Ereignisschritt. Öffnet zwei gültige Gemüsekarten zur Auswahl; kostet 1 Einsatz und ist höchstens einmal pro Zug möglich.', en: 'During the ingredient stage in a free draw or event step. Opens two valid vegetable cards to choose from; costs 1 use and can be used at most once per turn.' },
    activeButton: { de: 'Zwei Gemüsekarten ziehen', en: 'Draw two vegetable cards' }
  },
  hunter: {
    passiveUsage: { de: 'Während der Zutatenphase in einem freien Zieh- oder Ereignisschritt. Der Button zieht genau eine gültige Fleischkarte; die aktive Fähigkeit wird dabei nicht verbraucht.', en: 'During the ingredient stage in a free draw or event step. The button draws exactly one valid meat card; this does not consume the active ability.' },
    passiveButton: { de: 'Eine Fleischkarte ziehen (passiv)', en: 'Draw one meat card (passive)' },
    activeUsage: { de: 'Während der Zutatenphase in einem freien Zieh- oder Ereignisschritt. Öffnet zwei gültige Fleischkarten zur Auswahl; kostet 1 Einsatz und ist höchstens einmal pro Zug möglich.', en: 'During the ingredient stage in a free draw or event step. Opens two valid meat cards to choose from; costs 1 use and can be used at most once per turn.' },
    activeButton: { de: 'Zwei Fleischkarten ziehen', en: 'Draw two meat cards' }
  },
  gatherer: {
    passiveUsage: { de: 'Während der Zutatenphase in einem freien Zieh- oder Ereignisschritt. Der Button zieht genau eine gültige Obstkarte; die aktive Fähigkeit wird dabei nicht verbraucht.', en: 'During the ingredient stage in a free draw or event step. The button draws exactly one valid fruit card; this does not consume the active ability.' },
    passiveButton: { de: 'Eine Obstkarte ziehen (passiv)', en: 'Draw one fruit card (passive)' },
    activeUsage: { de: 'Während der Zutatenphase in einem freien Zieh- oder Ereignisschritt. Öffnet zwei gültige Obstkarten zur Auswahl; kostet 1 Einsatz und ist höchstens einmal pro Zug möglich.', en: 'During the ingredient stage in a free draw or event step. Opens two valid fruit cards to choose from; costs 1 use and can be used at most once per turn.' },
    activeButton: { de: 'Zwei Obstkarten ziehen', en: 'Draw two fruit cards' }
  },
  treasurer: {
    passiveUsage: { de: 'Automatisch beim Start des Hauptgerichts: Eine passende, global verfügbare Zutat landet im Gangkorb. Dafür gibt es keinen Button und die aktive Fähigkeit wird nicht verbraucht.', en: 'Automatic when the main course starts: one suitable globally available ingredient is placed in the course basket. It has no button and does not consume the active ability.' },
    activeUsage: { de: 'Während der Zutatenphase in einem freien Zieh- oder Ereignisschritt. Öffnet alle gültigen globalen Zutaten zur Auswahl und legt eine in den Gangkorb; kostet 1 Einsatz und ist höchstens einmal pro Zug möglich.', en: 'During the ingredient stage in a free draw or event step. Opens all valid global ingredients and places one in the course basket; costs 1 use and can be used at most once per turn.' },
    activeButton: { de: 'Freie Zutat für den Gang sichern', en: 'Secure a free ingredient for the course' }
  },
  alchemist: {
    passiveUsage: { de: 'Während der Zutatenphase nach einer noch nicht fest zugeordneten Zutat, wenn eine gültige Alternative derselben Kategorie verfügbar ist. Der Tausch verbraucht keinen aktiven Einsatz.', en: 'During the ingredient stage after an ingredient that is not yet locked, when a valid alternative in the same category is available. The swap does not consume an active use.' },
    passiveButton: { de: 'Letzte Zutat tauschen (passiv)', en: 'Swap last ingredient (passive)' },
    activeUsage: { de: 'Während der Zutatenphase nach einer noch nicht fest zugeordneten Zutat, wenn eine passende Alternative verfügbar ist. Kostet 1 Einsatz und ist höchstens einmal pro Zug möglich.', en: 'During the ingredient stage after an ingredient that is not yet locked, when a suitable alternative is available. Costs 1 use and can be used at most once per turn.' },
    activeButton: { de: 'Letzte Zutat tauschen (aktiv)', en: 'Swap last ingredient (active)' }
  },
  tactician: {
    passiveUsage: { de: 'Solange eine Ereigniskarte offen und noch nicht ausgeführt ist. Der Button schließt genau dieses Ereignis ohne seinen Effekt ab; die aktive Fähigkeit wird dabei nicht verbraucht.', en: 'While an event card is face up and has not yet been carried out. The button completes that event without its effect; this does not consume the active ability.' },
    passiveButton: { de: 'Ereignis ohne Wirkung abschließen (passiv)', en: 'Complete event without effect (passive)' },
    activeUsage: { de: 'Solange eine Ereigniskarte offen und noch nicht abgeschlossen ist. Die offene Karte wird zurückgemischt und durch eine neue ersetzt; kostet 1 Einsatz und ist höchstens einmal pro Zug möglich.', en: 'While an event card is face up and not yet resolved. The open card is shuffled back and replaced; costs 1 use and can be used at most once per turn.' },
    activeButton: { de: 'Ereignisstapel mischen und neu ziehen', en: 'Shuffle event deck and redraw' }
  },
  lucky: {
    passiveUsage: { de: 'Automatisch bei jedem negativen Münzeffekt im eigenen Zug und bei jeder eigenen Aufgabe – auch wenn die aktive Fähigkeit auf dieser Aufgabe liegt. Der gemeinsame Verlust sinkt um 1, kann aber nie zu einem Gewinn werden.', en: 'Automatic on every negative coin effect during this player’s turn and on every task assigned to them, including a task modified by the active ability. The shared loss is reduced by 1 but can never become a gain.' },
    activeUsage: { de: 'In einem freien, abgeschlossenen Kartenschritt vormerken. Die Fähigkeit wartet auf die nächste zugeteilte Arbeits-Challenge mit Spieltimer, verlängert sie um 2 Minuten und verschlechtert deren Münzwertung um 2. Unbewertete Hintergrund- und Gargrad-Aufgaben verbrauchen die Vormerkung nicht. Kostet 1 Einsatz und ist höchstens einmal pro Zug möglich.', en: 'Arm it during a free, settled card step. It waits for the next assigned scored work challenge, adds 2 minutes, and worsens its coin score by 2. Unscored background and doneness tasks do not consume it. Costs 1 use and can be used at most once per turn.' },
    activeButton: { de: 'Nächster Aufgaben-Challenge +2 Minuten geben', en: 'Give next task challenge +2 minutes' }
  },
  unlucky: {
    passiveUsage: { de: 'Automatisch bei jedem negativen Münzeffekt im eigenen Zug und bei jeder eigenen Aufgabe – auch wenn die aktive Fähigkeit auf dieser Aufgabe liegt. Der gemeinsame Verlust steigt um 1.', en: 'Automatic on every negative coin effect during this player’s turn and on every task assigned to them, including a task modified by the active ability. The shared loss increases by 1.' },
    activeUsage: { de: 'In einem freien, abgeschlossenen Kartenschritt vormerken. Die Fähigkeit wartet auf die nächste zugeteilte Arbeits-Challenge mit mehr als 2 Minuten, verkürzt sie um 2 Minuten und verbessert deren Münzwertung um 2. Kürzere, unbewertete Hintergrund- und Gargrad-Aufgaben verbrauchen die Vormerkung nicht. Kostet 1 Einsatz und ist höchstens einmal pro Zug möglich.', en: 'Arm it during a free, settled card step. It waits for the next assigned scored work challenge longer than 2 minutes, removes 2 minutes, and improves its coin score by 2. Shorter, unscored background and doneness tasks do not consume it. Costs 1 use and can be used at most once per turn.' },
    activeButton: { de: 'Nächste Aufgaben-Challenge −2 Minuten setzen', en: 'Set next task challenge to −2 minutes' }
  },
  gambler: {
    passiveUsage: { de: 'Automatisch, wenn im eigenen Zug ein Ereigniseffekt normalerweise genau 5 Münzen kosten würde. Vor dem Abzug erscheint ein zusätzlicher W6; bei einer 1 verliert die Crew 1 Münze, bei einer 6 verliert sie 6. Dafür gibt es keinen Button.', en: 'Automatic when an event effect during this player’s turn would normally cost exactly 5 coins. An extra d6 appears before the deduction; on a 1 the crew loses 1 coin, on a 6 it loses 6. It has no button.' },
    activeUsage: { de: 'In einem freien, abgeschlossenen Kartenschritt würfeln. Das Ergebnis und die Münzänderung werden sofort angezeigt. Kostet 1 Einsatz, ist höchstens einmal pro Zug und ausdrücklich nur einmal pro Gang möglich.', en: 'Roll during a free, settled card step. The result and coin change are shown immediately. Costs 1 use, can be used at most once per turn, and is explicitly limited to once per course.' },
    activeButton: { de: 'Gambler-Wurf für diesen Gang', en: 'Gambler roll for this course' }
  }
});

export function getRole(roleId) {
  const role = ROLES.find((entry) => entry.id === roleId);
  return role ? { ...role, ...ROLE_USAGE[roleId] } : null;
}
