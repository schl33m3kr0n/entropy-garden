/** Cipher wheel glyph pools by script / category (desktop matrix rain).
 *  Pruned for 16px monospace: drops blank code points. */

// ─── Symbols (script-neutral) ───────────────────────────────────────────────

/** BMP symbols for desktop monospace cipher wheels. */
export const CIPHER_BMP_SAFE_EXTRA =
    "♠♣♥♦" +
    "←→↑↓↔⇐⇒" +
    "◆●▪■▲▼" +
    "✦✧✩✪✫✭✯" +
    "∀∃∅∈∉";

/** Mathematical operators & BMP decorative symbols. */
export const CIPHER_MATH_DECORATIVE =
    "∑∆∞≈µ¥£€¢±∂∇√∝∠∧∨∩∪∵∼≅≠≤≥⊂⊃⊆⊇⊕⊗─□△▽◇○◎★☆♀♂☼";

/** Decorative reference marks. */
export const DECORATIVE_CIPHER_CHARS =
    "※⁂⁜⊙⊛⟠❀❖✡";

// ─── Numerals (multi-script) ──────────────────────────────────────────────────

/** Western, fullwidth, Roman, and CJK digit forms. */
export const CIPHER_NUMERALS_WEST_EAST =
    "0123456789" +
    "０１２３４５６７８９" +
    "ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ" +
    "〇一二三四五六七八九";

/** Arabic-Indic and Eastern Arabic-Indic digits. */
export const CIPHER_NUMERALS_ARABIC =
    "٠١٢٣٤٥٦٧٨٩" +
    "۰۱۲۳۴۵۶۷۸۹";

/** South & Southeast Asian digit sets. */
export const CIPHER_NUMERALS_INDIC =
    "०१२३४५६७८९" +
    "০১২৩৪৫৬৭৮৯" +
    "౦౧౨౩౪౫౬౭౮౯" +
    "೦೧೨೩೪೫೬೭೮೯" +
    "൦൧൨൩൪൫൬൭൮൯";

export const CIPHER_NUMERALS_SEA =
    "༠༡༢༣༤༥༦༧༨༩" +
    "๐๑๒๓๔๕๖๗๘๙" +
    "០១២៣៤៥៦៧៨៩" +
    "၀၁၂၃၄၅၆၇၈၉";

/** Cherokee (0–9) numerals. */
export const CIPHER_NUMERALS_OTHER =
    "ᏐᏑᏒᏓᏔᏕᏖᏗᏘ";

export const CIPHER_NUMERALS =
    CIPHER_NUMERALS_WEST_EAST +
    CIPHER_NUMERALS_ARABIC +
    CIPHER_NUMERALS_INDIC +
    CIPHER_NUMERALS_SEA +
    CIPHER_NUMERALS_OTHER;

/** Non-ASCII numerals for iOS / Safari cipher wheels (ASCII 0–9 added separately in pool). */
export const CIPHER_NUMERALS_LITE =
    "０１２３４５６７８９" +
    "ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ" +
    "〇一二三四五六七八九" +
    "٠١٢٣٤٥٦٧٨٩" +
    "০১২৩৪৫৬৭৮৯" +
    "๐๑๒๓๔๕๖๗๘๙" +
    "ᏐᏑᏒᏓᏔᏕᏖᏗᏘ";

// ─── Europe ───────────────────────────────────────────────────────────────────

/** Basic Latin alphabet — anchors legibility amid exotic scripts. */
export const CIPHER_LATIN =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Latin extended, phonetic, and archaic Latin. */
export const CIPHER_LATIN_EXTENDED =
    "ÆÐÞßǷȜƩƱƲƷƸƎƔƜɅꜲꜨꜬꜮꜴꜶꝎꝠꝏꟿƁƇƊƑƓƘƤƬƳȡȴȶɁɃɆɎ×÷";

/** Greek (classic, archaic). */
export const CIPHER_GREEK =
    "αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩϫϞ";

/** Cyrillic and related letters. */
export const CIPHER_CYRILLIC =
    "ѢѪѦѮѰѲѴѶѸѠѾѼӁӃӇӋӚӜӞӠӢӤӦӨӪӬӮӰӲӴӶӸӺӼӾԂԄԆԈԊԌԎԐԒЖЗЛФЦЧШЩЪЫЬЭЮЯ";

/** Elder Futhark runes. */
export const CIPHER_RUNIC =
    "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";

// ─── Caucasus ─────────────────────────────────────────────────────────────────

/** Armenian uppercase (Mesropian). */
export const ARMENIAN_CIPHER_UPPER =
    "ԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆՇՈՉՊՋՌՍՎՏՐՑՒՓՔՕՖ";

/** Armenian lowercase. */
export const ARMENIAN_CIPHER_LOWER =
    "աբգդեզէըթժիխծկհձղճմնշոչպջռսվտրցւփ";

/** Armenian punctuation & ligature-adjacent marks. */
export const ARMENIAN_CIPHER_PUNCT =
    "ֆքօ֍";

export const ARMENIAN_CIPHER_CHARS =
    ARMENIAN_CIPHER_UPPER + ARMENIAN_CIPHER_LOWER + ARMENIAN_CIPHER_PUNCT;

/** Georgian Mkhedruli (basic letters only). */
export const CIPHER_GEORGIAN =
    "აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ";

// ─── Middle East ─────────────────────────────────────────────────────────────

/** Hebrew aleph-bet + finals + geresh/gershayim/maqaf. */
export const HEBREW_CIPHER_CHARS =
    "אבגדהוזחטיכךלמםנןסעפףצץקרשת״־";

/** Arabic (isolated letters + hamza/alef variants). */
export const CIPHER_ARABIC =
    "ابتثجحخدذرزسشصضطظعغفقكلمنهويأإآءىةؤئ";

// ─── Central & Himalayan Asia ─────────────────────────────────────────────────

/** Tibetan (consonants + base vowel carrier). */
export const CIPHER_TIBETAN =
    "ཀཁགངཅཆཇཉཏཐདནཔཕབམཙཚཛཝཞཟའཡརལཤསཧཨ";

// ─── East Asia ────────────────────────────────────────────────────────────────

/** CJK ideographs (theme words). */
export const CIPHER_CJK =
    "道可非常名無天地之始有萬物母故欲以觀其妙徼此兩者同出而異謂玄又衆門无极阴阳气虚禅空觉悟幻仁义礼智信理天命心变";

/** Japanese kana. */
export const CIPHER_KANA =
    "ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネハバパヒビピフブプヘマミムメモャヤュユョヨラリルレロヮワヰヱヲ" +
    "ンヴヵヶ";

/** Hangul jamo & syllables. */
export const CIPHER_HANGUL =
    "가나다라마바사아자차카타파하고구그기노누느니도두드디로루르리모무므미보부브비소수스시오우으이조주즈지초추츠치코쿠크키토투트티포푸프피호후흐히";

// ─── South Asia — Indo-Aryan ──────────────────────────────────────────────────

export const CIPHER_DEVANAGARI = "पफबभमयरलवशषसहअआइईउऊऋएऐओऔॐॠ";

export const CIPHER_BENGALI = "অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহ";

// ─── South Asia — Dravidian ───────────────────────────────────────────────────

export const CIPHER_TELUGU = "కఖగఘఙచఛజఝఞటఠడఢణతథదధనపఫబభమయరలవశషసహ";

export const CIPHER_KANNADA =
    "ಅಆಇಈಉಊಋಎಏಐಒಓಔಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಲವಶಷಸಹಳ";

export const CIPHER_MALAYALAM = "അആഇഈഉഊഋഎഏഐഒഓഔകഖഗഘങചഛജഝഞടഠഡഢണതഥദധനപഫബഭമയരലവശഷസഹ";

// ─── South Asia — Sri Lanka ───────────────────────────────────────────────────

export const CIPHER_SINHALA = "අආඇඈඉඊඋඌඍඑඒඓඔඕඖකඛගඝඞඟචඡජඣඤඥඦටඨඩඪණඬතථදධනඳපඵබභමඹයරලවශෂසහළෆ";

// ─── Southeast Asia ───────────────────────────────────────────────────────────

export const CIPHER_MYANMAR = "ကခဂဃငစဆဇဈညဋဌဍ႑ဏတထဒဓနပဖဗဘမယရလဝသဟဠအ";

export const CIPHER_THAI = "กขคฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสห";

export const CIPHER_KHMER = "កខគឃងចឆជឈញដឋឌឍណតថទធនបផពភមយរលវសហឡអ";

/** Baybayin (Philippines). */
export const CIPHER_BAYBAYIN = "ᜀᜁᜂᜃᜄᜅᜆᜇᜈᜉᜊᜋᜌᜎᜏᜐᜑ";

// ─── West Africa ──────────────────────────────────────────────────────────────

/** Vai syllabary (sample glyphs). */
export const CIPHER_VAI =
    "ꔀꔃꔉꔊꔋꔌꔚꔛꔤꔥꔪ";

// ─── Indigenous Americas ──────────────────────────────────────────────────────

/** Cherokee syllabary. */
export const CIPHER_CHEROKEE =
    "ᎡᎢᎣᎤᎥᎦᎧᎨᎩᎪᎬᎭᎮᎯᎰᎱᎲᎳᎴᎵᎶᎷᎸᎹᎺᎻᎼᎽᎾᎿᏀᏁᏂᏃᏄᏅᏆᏇᏈᏉᏊᏋᏌᏍᏎᏏᏐᏑᏓᏔᏕᏖᏘᏙᏚᏛᏜᏝᏞᏟᏠᏡᏢᏣᏤᏥᏦᏧᏨᏩᏪᏫᏬᏭᏮᏯ" +
    "ᏰᏱᏲᏳᏴᏵᏸᏹᏺᏻᏼᏽ";

/** Desktop matrix rain — concatenation order matches regional sections above. */
export const FULL_MATRIX_CHARS =
    CIPHER_BMP_SAFE_EXTRA +
    CIPHER_MATH_DECORATIVE +
    DECORATIVE_CIPHER_CHARS +
    CIPHER_NUMERALS +
    CIPHER_LATIN +
    CIPHER_LATIN_EXTENDED +
    CIPHER_GREEK +
    CIPHER_CYRILLIC +
    CIPHER_RUNIC +
    ARMENIAN_CIPHER_CHARS +
    CIPHER_GEORGIAN +
    HEBREW_CIPHER_CHARS +
    CIPHER_ARABIC +
    CIPHER_TIBETAN +
    CIPHER_CJK +
    CIPHER_KANA +
    CIPHER_HANGUL +
    CIPHER_DEVANAGARI +
    CIPHER_BENGALI +
    CIPHER_TELUGU +
    CIPHER_KANNADA +
    CIPHER_MALAYALAM +
    CIPHER_SINHALA +
    CIPHER_MYANMAR +
    CIPHER_THAI +
    CIPHER_KHMER +
    CIPHER_BAYBAYIN +
    CIPHER_VAI +
    CIPHER_CHEROKEE;
