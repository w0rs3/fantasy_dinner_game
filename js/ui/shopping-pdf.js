import { INGREDIENTS, SHOPPING_STAPLES, suggestQuantity } from '../data/ingredients.js';

const A4 = Object.freeze({ width: 595.28, height: 841.89 });
const MARGIN = 36;
const COLUMN_GAP = 16;
const COLUMN_WIDTH = (A4.width - (MARGIN * 2) - COLUMN_GAP) / 2;
const CONTENT_TOP = 748;
const CONTENT_BOTTOM = 44;

const SHOPPING_GROUPS = Object.freeze([
  { id: 'staples', de: 'Allgemeiner Küchenvorrat', en: 'Shared kitchen pantry', items: SHOPPING_STAPLES, staple: true },
  { id: 'tapas', de: 'Tapas & Brot', en: 'Tapas & bread' },
  { id: 'vegetable', de: 'Gemüse', en: 'Vegetables' },
  { id: 'meat', de: 'Fleisch', en: 'Meat' },
  { id: 'pantry', de: 'Suppenbasis, Salat & Dressings', en: 'Soup base, salad & dressings' },
  { id: 'fruit', de: 'Obst', en: 'Fruit' },
  { id: 'dessert', de: 'Dessert', en: 'Dessert' },
  { id: 'alcohol', de: 'Optionale Spirituosen', en: 'Optional spirits' },
  { id: 'drinks', de: 'Cocktails & Getränke', en: 'Cocktails & drinks' }
]);

function localizedCustomName(customName, language) {
  if (typeof customName === 'string') return customName.trim();
  return String(customName?.[language] ?? '').trim();
}

function displayName(item, customNames, language) {
  const original = item.name[language];
  const custom = localizedCustomName(customNames?.[item.id], language);
  if (!custom || custom === original) return original;
  return language === 'de'
    ? `${custom} (Original: ${original})`
    : `${custom} (original: ${original})`;
}

export function buildShoppingListSections({ playerCount = 6, language = 'de', ingredientNames = {}, shoppingStapleNames = {} } = {}) {
  const crewSize = Math.min(10, Math.max(6, Number(playerCount) || 6));
  return SHOPPING_GROUPS.map((group) => {
    const source = group.staple ? group.items : INGREDIENTS.filter((ingredient) => ingredient.category === group.id);
    const customNames = group.staple ? shoppingStapleNames : ingredientNames;
    return {
      id: group.id,
      title: group[language] ?? group.de,
      items: source.map((item) => ({
        id: item.id,
        name: displayName(item, customNames, language),
        originalName: item.name[language],
        quantity: suggestQuantity(item, crewSize, language),
        optional: item.shoppingOptional === true
      }))
    };
  });
}

function glyphWidth(character) {
  if (character === ' ') return 0.28;
  if ('ilI.,:;!|'.includes(character)) return 0.27;
  if ('mwMW@%&'.includes(character)) return 0.82;
  if ('ABCDEFGHJKLMNOPQRSTUVWXYZ'.includes(character)) return 0.64;
  if ('0123456789'.includes(character)) return 0.55;
  return 0.52;
}

function textWidth(text, fontSize, bold = false) {
  return [...String(text)].reduce((sum, character) => sum + glyphWidth(character), 0) * fontSize * (bold ? 1.035 : 1);
}

function wrapText(text, maxWidth, fontSize, bold = false) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  const pushLongWord = (word) => {
    let part = '';
    for (const character of word) {
      if (part && textWidth(part + character, fontSize, bold) > maxWidth) {
        lines.push(part);
        part = character;
      } else part += character;
    }
    return part;
  };
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, fontSize, bold) <= maxWidth) {
      line = candidate;
      return;
    }
    if (line) lines.push(line);
    line = textWidth(word, fontSize, bold) <= maxWidth ? word : pushLongWord(word);
  });
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function itemLayout(item, language) {
  const optional = item.optional ? (language === 'de' ? ' - optional' : ' - optional') : '';
  const lines = wrapText(`${item.name} - ${item.quantity}${optional}`, COLUMN_WIDTH - 22, 8.6, true);
  return { ...item, lines, height: Math.max(35, 24 + (lines.length * 9.5)) };
}

function layoutPages(sections, language) {
  const pages = [[]];
  let pageIndex = 0;
  let column = 0;
  let y = CONTENT_TOP;
  const columnX = () => MARGIN + (column * (COLUMN_WIDTH + COLUMN_GAP));
  const advanceColumn = () => {
    column += 1;
    if (column > 1) {
      pageIndex += 1;
      pages.push([]);
      column = 0;
    }
    y = CONTENT_TOP;
  };
  const addHeading = (title, continued = false) => {
    const suffix = continued ? (language === 'de' ? ' (Fortsetzung)' : ' (continued)') : '';
    pages[pageIndex].push({ kind: 'heading', x: columnX(), y, title: `${title}${suffix}` });
    y -= 22;
  };

  sections.forEach((section) => {
    const items = section.items.map((item) => itemLayout(item, language));
    if (y - 22 - (items[0]?.height ?? 0) < CONTENT_BOTTOM) advanceColumn();
    addHeading(section.title);
    items.forEach((item) => {
      if (y - item.height < CONTENT_BOTTOM) {
        advanceColumn();
        addHeading(section.title, true);
      }
      pages[pageIndex].push({ kind: 'item', x: columnX(), y, ...item });
      y -= item.height;
    });
    y -= 7;
  });
  return pages;
}

const CP1252 = Object.freeze({
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87,
  'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91,
  '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98,
  '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f
});

function winAnsiBytes(value) {
  return [...String(value)].map((character) => {
    const code = character.codePointAt(0);
    if (code <= 0xff) return code;
    return CP1252[character] ?? 0x3f;
  });
}

function hexText(value) {
  return `<${winAnsiBytes(value).map((byte) => byte.toString(16).padStart(2, '0')).join('')}>`;
}

function drawText(value, x, y, size, font = 'F1', gray = 0.12) {
  return `q ${gray} g BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${hexText(value)} Tj ET Q\n`;
}

function pageContent(placements, pageNumber, pageCount, playerCount, language) {
  const title = language === 'de' ? 'Adventure Dinner - Einkaufsliste' : 'Adventure Dinner - Shopping list';
  const subtitle = language === 'de'
    ? `${playerCount} Personen - Abhaken oder Ersatz direkt darunter notieren`
    : `${playerCount} players - Tick items or note a substitute directly below`;
  const replacement = language === 'de' ? 'Ersatz:' : 'Substitute:';
  const pageLabel = language === 'de' ? `Seite ${pageNumber} von ${pageCount}` : `Page ${pageNumber} of ${pageCount}`;
  let content = '';
  content += drawText(title, MARGIN, 800, 18, 'F2', 0.08);
  content += drawText(subtitle, MARGIN, 779, 9.5, 'F1', 0.28);
  content += `0.72 G 0.8 w ${MARGIN} 765 m ${(A4.width - MARGIN).toFixed(2)} 765 l S\n`;
  placements.forEach((placement) => {
    if (placement.kind === 'heading') {
      content += `0.94 g ${placement.x.toFixed(2)} ${(placement.y - 17).toFixed(2)} ${COLUMN_WIDTH.toFixed(2)} 18 re f\n`;
      content += drawText(placement.title, placement.x + 6, placement.y - 13, 9.5, 'F2', 0.12);
      return;
    }
    const bottom = placement.y - placement.height;
    content += `0.32 G 0.9 w ${(placement.x + 1).toFixed(2)} ${(placement.y - 13).toFixed(2)} 9 9 re S\n`;
    placement.lines.forEach((line, index) => {
      content += drawText(line, placement.x + 16, placement.y - 9 - (index * 9.5), 8.6, 'F2', 0.1);
    });
    content += drawText(replacement, placement.x + 16, bottom + 7, 7.5, 'F1', 0.38);
    const labelWidth = textWidth(replacement, 7.5) + 5;
    content += `0.65 G 0.45 w ${(placement.x + 16 + labelWidth).toFixed(2)} ${(bottom + 5.5).toFixed(2)} m ${(placement.x + COLUMN_WIDTH - 3).toFixed(2)} ${(bottom + 5.5).toFixed(2)} l S\n`;
    content += `0.88 G 0.35 w ${placement.x.toFixed(2)} ${bottom.toFixed(2)} m ${(placement.x + COLUMN_WIDTH).toFixed(2)} ${bottom.toFixed(2)} l S\n`;
  });
  content += drawText('Adventure Dinner', MARGIN, 24, 7.5, 'F2', 0.42);
  content += drawText(pageLabel, A4.width - MARGIN - textWidth(pageLabel, 7.5, false), 24, 7.5, 'F1', 0.42);
  return content;
}

function asciiBytes(value) {
  return new TextEncoder().encode(value);
}

function concatenate(chunks) {
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
}

function assemblePdf(contents) {
  const fontRegularId = 3;
  const fontBoldId = 4;
  const pageObjectIds = contents.map((_, index) => 5 + (index * 2));
  const objects = new Map();
  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(2, `<< /Type /Pages /Count ${contents.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] >>`);
  objects.set(fontRegularId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.set(fontBoldId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  contents.forEach((content, index) => {
    const pageId = pageObjectIds[index];
    const contentId = pageId + 1;
    const streamBytes = asciiBytes(content);
    objects.set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.set(contentId, `<< /Length ${streamBytes.length} >>\nstream\n${content}\nendstream`);
  });

  const maxObjectId = Math.max(...objects.keys());
  const header = asciiBytes('%PDF-1.4\n%ADVG\n');
  const chunks = [header];
  const offsets = Array(maxObjectId + 1).fill(0);
  let offset = header.length;
  for (let id = 1; id <= maxObjectId; id += 1) {
    const object = asciiBytes(`${id} 0 obj\n${objects.get(id)}\nendobj\n`);
    offsets[id] = offset;
    chunks.push(object);
    offset += object.length;
  }
  const xrefOffset = offset;
  const xref = [`xref\r\n0 ${maxObjectId + 1}\r\n`, '0000000000 65535 f\r\n'];
  for (let id = 1; id <= maxObjectId; id += 1) xref.push(`${String(offsets[id]).padStart(10, '0')} 00000 n\r\n`);
  xref.push(`trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  chunks.push(asciiBytes(xref.join('')));
  return concatenate(chunks);
}

export function createShoppingListPdf(options = {}) {
  const language = options.language === 'en' ? 'en' : 'de';
  const playerCount = Math.min(10, Math.max(6, Number(options.playerCount) || 6));
  const sections = buildShoppingListSections({ ...options, language, playerCount });
  const pages = layoutPages(sections, language);
  const contents = pages.map((placements, index) => pageContent(placements, index + 1, pages.length, playerCount, language));
  return assemblePdf(contents);
}

export function downloadShoppingListPdf(options = {}) {
  const language = options.language === 'en' ? 'en' : 'de';
  const playerCount = Math.min(10, Math.max(6, Number(options.playerCount) || 6));
  const bytes = createShoppingListPdf({ ...options, language, playerCount });
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = language === 'de'
    ? `adventure-dinner-einkaufsliste-${playerCount}-personen.pdf`
    : `adventure-dinner-shopping-list-${playerCount}-players.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return anchor.download;
}
