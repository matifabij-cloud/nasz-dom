import type { ShoppingCategory } from '../../core/supabase/database.types'

/** Działy sklepu — w kolejności, w jakiej pokazują się na liście. */
export const CATEGORIES: { id: ShoppingCategory; label: string }[] = [
  { id: 'warzywa', label: 'Warzywa i owoce' },
  { id: 'pieczywo', label: 'Pieczywo' },
  { id: 'nabial', label: 'Nabiał' },
  { id: 'mieso', label: 'Mięso i ryby' },
  { id: 'mrozonki', label: 'Mrożonki' },
  { id: 'suche', label: 'Produkty suche' },
  { id: 'napoje', label: 'Napoje' },
  { id: 'chemia', label: 'Chemia i higiena' },
  { id: 'inne', label: 'Inne' },
]

/**
 * Słownik: początki słów (bez polskich znaków) → dział.
 * „mlek” pasuje do: mleko, mleka, mlekiem… Wygrywa najdłuższe dopasowanie,
 * więc „serwetki” (serwetk) nie trafią do nabiału przez „ser”.
 * Frazy ze spacją są sprawdzane najpierw, w całej nazwie.
 */
const KEYWORDS: Record<Exclude<ShoppingCategory, 'inne'>, string[]> = {
  warzywa: [
    'warzyw', 'owoc', 'ziemniak', 'kartofl', 'pomidor', 'ogor', 'cebul', 'czosn', 'marchew', 'marchw',
    'pietrusz', 'natk', 'seler', 'por', 'kapust', 'salat', 'rukol', 'roszpunk', 'rzodkiew', 'papryk',
    'brokul', 'kalafior', 'cukini', 'baklazan', 'dyni', 'dynia', 'burak', 'szpinak', 'koper', 'szczypior',
    'pieczark', 'grzyb', 'kukurydza kolby', 'awokado', 'imbir', 'jablk', 'jablek', 'gruszk', 'gruszek',
    'banan', 'pomarancz', 'mandaryn', 'cytryn', 'limonk', 'grejpfrut', 'winogron', 'truskaw', 'malin',
    'borowk', 'jagod', 'porzeczk', 'wisni', 'czeresn', 'sliwk', 'sliwek', 'brzoskwin', 'nektaryn',
    'arbuz', 'melon', 'ananas', 'kiwi', 'mango', 'granat', 'fasolka szparagowa', 'rzodkiewk',
  ],
  pieczywo: [
    'chleb', 'chlebek', 'pieczyw', 'bulk', 'bulecz', 'bagiet', 'rogal', 'rogalik', 'croissant',
    'drozdzowk', 'kajzer', 'grahamk', 'ciabatt', 'tortill', 'ciast', 'sernik',
    'szarlotk', 'babk', 'chalk', 'pita', 'tost',
  ],
  nabial: [
    'mlek', 'mleczk', 'ser', 'serek', 'sera', 'twarog', 'twarozek', 'jogurt', 'kefir', 'maslank',
    'smietan', 'masl', 'margaryn', 'jaj', 'jajk', 'jajek', 'mozzarell', 'feta', 'parmezan', 'gouda',
    'skyr', 'danonk', 'serek wiejski', 'mascarpone', 'ricott', 'halloumi', 'camembert', 'brie',
  ],
  mieso: [
    'mies', 'kurczak', 'kurczat', 'filet', 'piers', 'udk', 'udek', 'udzik', 'skrzydel', 'schab',
    'karkow', 'boczek', 'boczk', 'szynk', 'kielbas', 'parowk', 'parowek', 'kabanos', 'salam', 'pasztet',
    'mielon', 'wolowin', 'wieprzow', 'indyk', 'kaczk', 'wedlin', 'poledwic', 'ryb', 'losos', 'dorsz',
    'tunczyk', 'sledz', 'sledzi', 'makrel', 'pstrag', 'krewetk', 'golonk', 'zeberk', 'watrob',
    'watrobk', 'salceson', 'kaszank', 'mortadel', 'frankfurter', 'mintaj', 'tilapi', 'karp',
  ],
  mrozonki: [
    'mrozon', 'mrozonk', 'lody', 'lodow', 'lod', 'pizz', 'frytk', 'pierog', 'nugget', 'paluszki rybne',
    'warzywa na patelnie', 'kopytk', 'knedl', 'zapiekank',
  ],
  suche: [
    'makaron', 'spaghetti', 'penne', 'swiderk', 'nitk', 'ryz', 'kasz', 'maka', 'maki', 'cukier', 'cukr',
    'sol', 'pieprz', 'przypraw', 'olej', 'oliw', 'ocet', 'platki', 'platk', 'musli', 'granol',
    'konserw', 'groszek', 'kukurydz', 'fasol', 'ciecierzyc', 'soczewic', 'sos', 'ketchup', 'keczup',
    'majonez', 'musztard', 'chrzan', 'dzem', 'konfitur', 'miod', 'nutell', 'krem czekoladowy',
    'czekolad', 'ciastk', 'ciasteczk', 'herbatnik', 'wafel', 'wafl', 'baton', 'cukierk', 'zelk',
    'chips', 'chrup', 'paluszk', 'orzech', 'orzeszk', 'migdal', 'rodzynk', 'bakali', 'slonecznik',
    'pestk', 'budyn', 'galaretk', 'kisiel', 'proszek do pieczenia', 'soda oczyszczona', 'drozdz',
    'bulion', 'koncentrat', 'passat', 'przecier', 'pomidory w puszce', 'zupk', 'kakao', 'bulka tarta',
    'tunczyk w puszce', 'oliwki', 'mieszank', 'kawa', 'kaw', 'herbat',
  ],
  napoje: [
    'wod', 'woda', 'sok', 'soki', 'napoj', 'nektar', 'cola', 'coca', 'pepsi', 'fanta', 'sprite',
    'piw', 'wino', 'win', 'wodk', 'oranzad', 'lemoniad', 'kompot', 'syrop', 'tonik', 'izoton',
    'energetyk', 'mleko roslinne', 'napoj roslinny',
  ],
  chemia: [
    'papier', 'recznik', 'chusteczk', 'chusteczek', 'serwetk', 'serwetek', 'plyn', 'proszek', 'kapsulk', 'tabletki do zmyw',
    'zmywar', 'mydl', 'szampon', 'odzywk', 'zel', 'pasta do zeb', 'szczoteczk', 'nic dentystyczn',
    'dezodorant', 'antyperspir', 'krem', 'balsam', 'pieluch', 'podpask', 'wkladk', 'tampon', 'patyczk',
    'wacik', 'platki kosmetyczne', 'golark', 'maszynk', 'pianka do golenia', 'work', 'gabk', 'zmywak',
    'scierk', 'domestos', 'ludwik', 'perwoll', 'vanish', 'cif', 'ajax', 'plukank', 'odplamiacz',
    'wybielacz', 'odswiezacz', 'foli', 'toalet', 'sol do zmywarki', 'nablyszczacz', 'odkamieniacz',
    'chlor', 'mleczko do czyszczenia', 'srodek', 'kosmetyk', 'farba do wlosow', 'lakier',
  ],
}

/** Małe litery, bez polskich znaków i interpunkcji. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const entries = Object.entries(KEYWORDS) as [ShoppingCategory, string[]][]
const phrases = entries
  .flatMap(([cat, words]) => words.filter((w) => w.includes(' ')).map((w) => [cat, w] as const))
  .sort((a, b) => b[1].length - a[1].length)
const stems = entries.flatMap(([cat, words]) => words.filter((w) => !w.includes(' ')).map((w) => [cat, w] as const))

/** Słowa, które nic nie mówią o produkcie (ilości, jednostki). */
const SKIP = new Set(['szt', 'sztuk', 'sztuki', 'kg', 'g', 'dag', 'dkg', 'l', 'ml', 'litr', 'litry', 'opak', 'opakowanie', 'paczka', 'paczki', 'butelka', 'butelki', 'puszka', 'puszki', 'karton', 'zgrzewka', 'kilo', 'pol', 'x', 'duzy', 'duze', 'duza', 'maly', 'male', 'mala'])

/**
 * Zgaduje dział po nazwie. Decyduje pierwsze rozpoznane słowo —
 * w „sok pomarańczowy” liczy się „sok” (Napoje), nie „pomarańcz”.
 */
export function detectCategory(name: string): ShoppingCategory {
  const text = normalize(name)
  for (const [cat, phrase] of phrases) {
    if (text.includes(phrase)) return cat
  }
  for (const word of text.split(' ')) {
    if (!word || SKIP.has(word) || /^\d+$/.test(word)) continue
    let best: ShoppingCategory | null = null
    let bestLen = 0
    for (const [cat, stem] of stems) {
      if (stem.length > bestLen && word.startsWith(stem)) {
        best = cat
        bestLen = stem.length
      }
    }
    if (best) return best
  }
  return 'inne'
}
