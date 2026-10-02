import { Product } from '../types';

/**
 * Comprehensive Roman Urdu / Urdu / Hindi <-> English bilingual synonym mapping
 * for wholesale restaurant & food supplies.
 */
export const BILINGUAL_SYNONYMS: Record<string, string[]> = {
  sugar: ['sugar', 'cheeni', 'chini', 'shakar', 'shaker', 'white sugar', 'refined sugar', 'khand'],
  rice: ['rice', 'chawal', 'chaawal', 'basmati', 'kainat', 'super basmati', 'sela', 'sella', 'toota', 'steam rice'],
  flour: ['flour', 'atta', 'aata', 'chakki atta', 'chakki aata', 'wheat flour', 'maida', 'fine atta', 'suji', 'sooji'],
  oil: ['oil', 'cooking oil', 'ghee', 'banaspati', 'vanaspati', 'tel', 'tail', 'canola oil', 'mustard oil', 'sarson ka tel', 'dalda'],
  daal_moong: ['daal moong', 'moong daal', 'moong', 'dhuli moong', 'yellow lentil', 'yellow daal'],
  daal_chana: ['daal chana', 'chana daal', 'chana', 'chole', 'safaid chana', 'safed chana', 'white chana', 'kala chana', 'black chana', 'gram'],
  daal_masoor: ['daal masoor', 'masoor daal', 'masoor', 'red lentil', 'lal daal'],
  daal_mash: ['daal mash', 'daal maash', 'mash daal', 'maash daal', 'mash', 'maash', 'urad daal', 'urad'],
  tomato: ['tomato', 'tomatoes', 'tamatar', 'tamater'],
  onion: ['onion', 'onions', 'piyaz', 'pyaz', 'piaz', 'lal piyaz'],
  potato: ['potato', 'potatoes', 'aloo', 'alu'],
  garlic: ['garlic', 'lehsan', 'lassan', 'lehasan', 'thoom'],
  ginger: ['ginger', 'adrak', 'adruk'],
  salt: ['salt', 'namak', 'lahori namak', 'iodized salt', 'kala namak'],
  red_chilli: ['red chilli', 'red chili', 'lal mirch', 'surkh mirch', 'chilli powder', 'darra mirch', 'kashmiri mirch', 'mirch powder', 'mirch'],
  green_chilli: ['green chilli', 'green chili', 'hari mirch', 'sabz mirch'],
  capsicum: ['capsicum', 'shimla mirch', 'bell pepper'],
  turmeric: ['turmeric', 'haldi', 'haldi powder'],
  cumin: ['cumin', 'zeera', 'zira', 'safaid zeera', 'safed zeera', 'white zeera', 'kala zeera'],
  coriander: ['coriander', 'dhania', 'dhaniya', 'sabz dhania', 'pisa dhania', 'coriander powder'],
  black_pepper: ['black pepper', 'kali mirch', 'siyah mirch'],
  cardamom: ['cardamom', 'elaichi', 'ilaichi', 'choti elaichi', 'sabz elaichi', 'bari elaichi'],
  cinnamon: ['cinnamon', 'darchini', 'daarchini'],
  cloves: ['clove', 'cloves', 'laung', 'long'],
  beef: ['beef', 'gosht', 'bada gosht', 'bara gosht', 'cow meat', 'bachia', 'bachia gosht', 'bief'],
  mutton: ['mutton', 'chota gosht', 'bakra gosht', 'bakra', 'goat meat', 'lamb'],
  chicken: ['chicken', 'murghi', 'kukkad', 'broiler', 'chicken boneless', 'chicken breast', 'chicken whole', 'murgh'],
  mince: ['mince', 'keema', 'qeema', 'kema', 'beef mince', 'chicken mince', 'mutton mince', 'beef keema'],
  milk: ['milk', 'doodh', 'dudh', 'fresh milk'],
  yogurt: ['yogurt', 'curd', 'dahi', 'dhee'],
  butter: ['butter', 'makhan', 'maska'],
  cheese: ['cheese', 'paneer', 'panir'],
  eggs: ['eggs', 'egg', 'anday', 'ande', 'baiza', 'desi ande'],
  packaging: ['packaging', 'box', 'dabba', 'shopper', 'thela', 'plastic container', 'bag', 'carton', 'peti', 'lifafa'],
  cleaning: ['soap', 'surf', 'detergent', 'bleach', 'phenyl', 'cleaner', 'dishwash', 'sabun'],
  tea: ['tea', 'chai', 'chaye', 'patti', 'tea leaves', 'green tea', 'kahwa'],
};

/**
 * Normalizes strings by lowercasing, stripping special chars, and trimming
 */
export function cleanText(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if two terms are bilingual synonyms of each other
 */
export function areBilingualSynonyms(termA: string, termB: string): boolean {
  const cleanA = cleanText(termA);
  const cleanB = cleanText(termB);

  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  // Search through all synonym groups
  for (const group of Object.values(BILINGUAL_SYNONYMS)) {
    const aMatches = group.some((syn) => cleanA === cleanText(syn));
    const bMatches = group.some((syn) => cleanB === cleanText(syn));
    if (aMatches && bMatches) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a search term matches a product name either directly or via bilingual synonyms.
 * E.g., searchTerm "cheeni" matches "Sugar", searchTerm "chawal" matches "Basmati Rice".
 */
export function isBilingualMatch(searchTerm: string, targetName: string): boolean {
  const cleanSearch = cleanText(searchTerm);
  const cleanTarget = cleanText(targetName);

  if (!cleanSearch || !cleanTarget) return false;
  if (cleanTarget === cleanSearch) return true;

  // Direct word boundary match
  if (new RegExp(`\\b${cleanSearch}\\b`, 'i').test(cleanTarget) || new RegExp(`\\b${cleanTarget}\\b`, 'i').test(cleanSearch)) {
    return true;
  }

  // Check synonym groups
  for (const group of Object.values(BILINGUAL_SYNONYMS)) {
    const searchInGroup = group.some((syn) => {
      const cSyn = cleanText(syn);
      return cleanSearch === cSyn || new RegExp(`\\b${cSyn}\\b`, 'i').test(cleanSearch);
    });
    const targetInGroup = group.some((syn) => {
      const cSyn = cleanText(syn);
      return cleanTarget === cSyn || new RegExp(`\\b${cSyn}\\b`, 'i').test(cleanTarget);
    });
    if (searchInGroup && targetInGroup) {
      return true;
    }
  }

  // Check individual words
  const searchWords = cleanSearch.split(' ').filter((w) => w.length >= 3);
  const targetWords = cleanTarget.split(' ').filter((w) => w.length >= 3);

  for (const sWord of searchWords) {
    for (const tWord of targetWords) {
      if (sWord === tWord || areBilingualSynonyms(sWord, tWord)) return true;
    }
  }

  return false;
}

/**
 * Finds a product in the catalog using bilingual Roman Urdu / Urdu <-> English matching.
 */
export function findProductByBilingualName(query: string, products: Product[]): Product | undefined {
  if (!query || !products || products.length === 0) return undefined;
  const cleanQ = cleanText(query);
  if (!cleanQ) return undefined;

  let bestProduct: Product | undefined = undefined;
  let highestScore = 0;

  for (const p of products) {
    if (!p || !p.name) continue;
    const cleanName = cleanText(p.name);
    let score = 0;

    // 1. Direct exact or ID / SKU match: 100 points
    if (
      (p.id && p.id.toLowerCase() === cleanQ) ||
      (p.sku && p.sku.toLowerCase() === cleanQ) ||
      cleanName === cleanQ
    ) {
      score = 100;
    }
    // 2. Direct whole-word match in name: 80 points
    else if (new RegExp(`\\b${cleanQ}\\b`, 'i').test(cleanName)) {
      score = 80;
    }
    // 3. Synonym group match: 60 points
    else {
      for (const group of Object.values(BILINGUAL_SYNONYMS)) {
        const qMatches = group.some((syn) => {
          const cSyn = cleanText(syn);
          return cleanQ === cSyn || new RegExp(`\\b${cSyn}\\b`, 'i').test(cleanQ);
        });
        const nameMatches = group.some((syn) => {
          const cSyn = cleanText(syn);
          return cleanName === cSyn || new RegExp(`\\b${cSyn}\\b`, 'i').test(cleanName);
        });

        if (qMatches && nameMatches) {
          score = Math.max(score, 60);
        }
      }

      // 4. Token-level synonym match: 50 points, or token exact match: 40 points
      if (score === 0) {
        const qTokens = cleanQ.split(' ').filter((t) => t.length >= 3);
        const nameTokens = cleanName.split(' ').filter((t) => t.length >= 3);

        for (const qt of qTokens) {
          for (const nt of nameTokens) {
            if (areBilingualSynonyms(qt, nt)) {
              score = Math.max(score, 50);
            } else if (qt === nt) {
              score = Math.max(score, 40);
            }
          }
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestProduct = p;
    }
  }

  return highestScore > 0 ? bestProduct : undefined;
}

/**
 * Extracts multiple products and their quantities from natural language text
 * e.g., "10 kg cheeni aur 20 kg chawal"
 */
export function extractBilingualProductsFromText(
  text: string,
  products: Product[]
): { product: Product; quantity: number; unit?: string }[] {
  const results: { product: Product; quantity: number; unit?: string }[] = [];
  const clean = cleanText(text);

  for (const prod of products) {
    if (!prod || !prod.name) continue;
    const prodName = cleanText(prod.name);
    let matched = false;

    // Check direct name
    if (clean.includes(prodName)) {
      matched = true;
    } else {
      // Check synonyms of this product
      for (const group of Object.values(BILINGUAL_SYNONYMS)) {
        const prodInGroup = group.some((s) => prodName === s || prodName.includes(s));
        if (prodInGroup) {
          const textMatchesSynonym = group.some((s) => {
            const rx = new RegExp(`\\b${s}\\b`, 'i');
            return rx.test(clean);
          });
          if (textMatchesSynonym) {
            matched = true;
            break;
          }
        }
      }
    }

    if (matched) {
      let qty = 1;
      let matchedUnit: string | undefined = prod.unit;

      const possibleKeywords = [prodName];
      for (const group of Object.values(BILINGUAL_SYNONYMS)) {
        if (group.some((s) => prodName === s || prodName.includes(s))) {
          possibleKeywords.push(...group);
        }
      }

      for (const kw of possibleKeywords) {
        if (!clean.includes(kw)) continue;
        const regexes = [
          new RegExp(`(\\d+)\\s*(?:kg|kilo|liter|litre|can|carton|peti|bag|bori|box|piece|pc|dz|dozen)?\\s*${kw}`, 'i'),
          new RegExp(`${kw}\\s*(\\d+)\\s*(?:kg|kilo|liter|litre|can|carton|peti|bag|bori|box|piece|pc)?`, 'i'),
        ];
        for (const rx of regexes) {
          const m = text.match(rx);
          if (m && m[1]) {
            qty = parseInt(m[1], 10);
            break;
          }
        }
      }

      if (!results.some((r) => r.product.id === prod.id)) {
        results.push({
          product: prod,
          quantity: qty,
          unit: matchedUnit,
        });
      }
    }
  }

  return results;
}
