/** Cipher wheel glyph pools by script / category (desktop matrix rain).
 *  Pruned via scripts/dev/glyph-audit.html (16px monospace): drops blank + missing-glyph (tofu) code points. */

// ─── European & Middle Eastern ─────────────────────────────────────────────

/** Latin extended, phonetic, and archaic Latin. */
export const CIPHER_LATIN_EXTENDED =
    "ÆÐÞǷȜƩƱƲƷƸƎƔƜɅꜲꜨꜬꜮꜴꜶꝎꝠꝏꟄꟿƁƇƊƑƓƘƤƬƳȡȴȶɁɃɆɎ×÷";

/** Greek (classic & archaic). */
export const CIPHER_GREEK =
    "ϫϞ";

/** Elder Futhark runes. */
export const CIPHER_RUNIC =
    "ᚠᚢᚦᚬᚱᚴᚼᚽᚾᚿᛋᛏᛐᛒᛘᛚᛦ";

/** Hebrew aleph-bet + finals + geresh/gershayim/maqaf. */
export const HEBREW_CIPHER_CHARS =
    "אבגדהוזחטיכךלמםנןסעפףצץקרשת״־";

/** Arabic (monospace-safe subset). */
export const CIPHER_ARABIC =
    "آأئةتثطظ";

/** Cyrillic and related letters. */
export const CIPHER_CYRILLIC =
    "ѢѪѦѮѰѲѴѶѸѠѾѼӁӃӇӋӚӜӞӠӢӤӦӨӪӬӮӰӲӴӶӸӺӼӾԂԄԆԈԊԌԎԐԒЖЗЛФЦЧШЩЪЫЬЭЮЯ";

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

// ─── Symbols & operators ───────────────────────────────────────────────────

/** Mathematical operators & BMP decorative symbols. */
export const CIPHER_MATH_DECORATIVE =
    "∑∆∞≈µ¥£€¢±∂∇√∝∠∧∨∩∪∵∼≅≠≤≥⊂⊃⊆⊇⊕⊗─□△▽◇○◎★☆♀♂☼";

/** Decorative reference marks. */
export const DECORATIVE_CIPHER_CHARS =
    "※⁂⁜⊙⊛⟠❀❖✡";

// ─── East Asian ──────────────────────────────────────────────────────────────

/** CJK ideographs (theme words). */
export const CIPHER_CJK =
    "道无极阴阳气玄虚禅空觉悟幻仁义礼智信理天命心变";

/** Japanese kana. */
export const CIPHER_KANA =
    "ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネハバパヒビピフブプヘマミムメモャヤュユョヨラリルレロヮワヰヱヲ" +
    "ンヴヵヶ";

/** Hangul jamo & syllables. */
export const CIPHER_HANGUL =
    "가나다라마바사아자차카타파하고구그기노누느니도두드디로루르리모무므미보부브비소수스시오우으이조주즈지초추츠치코쿠크키토투트티포푸프피호후흐히";

// ─── South Asian ─────────────────────────────────────────────────────────────

export const CIPHER_DEVANAGARI = "पफबभमयरलवशषसहअआइईउऊऋएऐओऔॐॠ";

export const CIPHER_BENGALI = "অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহ";

export const CIPHER_TELUGU = "కఖగఘఙచఛజఝఞటఠడఢణతథదధనపఫబభమయరలవశషసహ";

export const CIPHER_MALAYALAM = "അആഇഈഉഊഋഎഏഐഒഓഔകഖഗഘങചഛജഝഞടഠഡഢണതഥദധനപഫബഭമയരലവശഷസഹ";

export const CIPHER_SINHALA = "අආඇඈඉඊඋඌඍඑඒඓඔඕඖකඛගඝඞඟචඡජඣඤඥඦටඨඩඪණඬතථදධනඳපඵබභමඹයරලවශෂසහළෆ";

// ─── Southeast Asian ─────────────────────────────────────────────────────────

export const CIPHER_MYANMAR = "ကခဂဃငစဆဇဈညဋဌဍ႑ဏတထဒဓနပဖဗဘမယရလဝသဟဠအ";

export const CIPHER_THAI = "กขคฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสห";

export const CIPHER_KHMER = "កខគឃងចឆជឈញដឋឌឍណតថទធនបផពភមយរលវសហឡអ";

export const CIPHER_BAYBAYIN = "ᜀᜁᜂᜃᜄᜅᜆᜇᜈᜉᜊᜋᜌᜎᜏᜐᜑ";

// ─── Indigenous Americas ─────────────────────────────────────────────────────

/** Cherokee syllabary. */
export const CIPHER_CHEROKEE =
    "ᎡᎢᎣᎤᎥᎦᎧᎨᎩᎪᎬᎭᎮᎯᎰᎱᎲᎳᎴᎵᎶᎷᎸᎹᎺᎻᎼᎽᎾᎿᏀᏁᏂᏃᏄᏅᏆᏇᏈᏉᏊᏋᏌᏍᏎᏏᏐᏑᏓᏔᏕᏖᏘᏙᏚᏛᏜᏝᏞᏟᏠᏡᏢᏣᏤᏥᏦᏧᏨᏩᏪᏫᏬᏭᏮᏯ" +
    "ᏰᏱᏲᏳᏴᏵᏸᏹᏺᏻᏼᏽ";

/** Canadian Aboriginal Syllabics (Unicode U+1400–U+167F). */
export const CIPHER_SYLLABICS_1 =
    "᐀ᐁᐂᐃᐄᐅᐆᐇᐈᐉᐊᐋᐌᐍᐎᐏᐐᐑᐒᐓᐔᐕᐖᐗᐘᐙᐚᐛᐜᐝᐞᐟᐠᐡᐢᐣᐤᐥᐦᐨᐩᐪᐫᐬᐭᐮᐯᐰᐱᐲᐳᐴᐵᐶᐷᐸᐹᐺᐻᐼᐽᐾᐿᑀᑁᑂᑃᑄᑅᑆᑇᑈᑉᑋᑌᑍ" +
    "ᑎᑏ";
export const CIPHER_SYLLABICS_2 =
    "ᑐᑑᑒᑓᑔᑗᑘᑙᑚᑛᑜᑝᑞᑟᑠᑡᑢᑣᑤᑥᑦᑧᑨᑩᑪᑫᑬᑭᑮᑯᑰᑱᑲᑳᑴᑵᑶᑷᑸᑹᑺᑻᑼᑽᑾᑿᒀᒁᒂᒃᒄᒅᒆᒇᒈᒉᒊᒍᒎᒏᒐᒑᒒᒓᒔᒖᒗᒘᒙᒚᒛᒜᒝᒞᒟ";
export const CIPHER_SYLLABICS_3 =
    "ᒠᒡᒢᒣᒤᒩᒪᒫᒬᒭᒮᒰᒲᒴᒶᒷᒸᒹᒺᒻᒼᒽᒾᒿᓀᓁᓂᓃᓄᓅᓆᓇᓈᓉᓊᓋᓌᓍᓎᓏᓐᓑᓒᓓᓔᓕᓖᓚᓛᓜᓝᓞᓟᓠᓡᓢᓤᓦᓧᓨᓩᓪᓫᓬᓭᓮᓯ";
export const CIPHER_SYLLABICS_4 =
    "ᓰᓱᓲᓳᓴᓵᓶᓷᓸᓹᓺᓻᓼᓽᓾᓿᔀᔁᔂᔃᔄᔅᔆᔇᔈᔉᔊᔋᔌᔍᔎᔏᔐᔑᔒᔓᔔᔕᔖᔗᔘᔙᔚᔛᔜᔝᔞᔟᔠᔡᔢᔣᔤᔥᔦᔧᔨᔩᔪᔫᔬᔭᔮᔯᔰᔱᔲᔳᔴᔵᔶᔷᔸᔹᔺᔻ" +
    "ᔼᔽᔾᔿ";
export const CIPHER_SYLLABICS_5 =
    "ᕀᕁᕂᕃᕄᕅᕆᕇᕈᕉᕊᕋᕌᕍᕎᕏᕐᕑᕒᕓᕔᕕᕖᕗᕘᕙᕚᕛᕜᕝᕞᕟᕠᕡᕢᕣᕤᕥᕦᕧᕨᕩᕪᕫᕬᕭᕮᕯᕰᕱᕲᕴᕵᕶᕷᕸᕹᕺᕻᕼᕽᕾᕿᖀᖁᖂᖃᖄᖅᖆᖇᖈᖉᖊᖋᖌ" +
    "ᖍᖎᖏ";
export const CIPHER_SYLLABICS_6 =
    "ᖐᖑᖒᖓᖔᖕᖖᖗᖘᖙᖚᖛᖜᖝᖞᖟᖠᖡᖤᖥᖦᖧᖨᖩᖪᖫᖬᖭᖮᖯᖰᖱᖲᖳᖴᖵᖶᖷᖸᖹᖺᖻᖼᖽᖾᖿᗀᗁᗂᗃᗄᗅᗆᗇᗈᗉᗊᗋᗌᗍᗎᗏᗐᗑᗒᗓᗔᗕᗖᗗᗘᗙᗚᗛᗜᗝ" +
    "ᗞᗟ";
export const CIPHER_SYLLABICS_7 =
    "ᗠᗡᗢᗣᗤᗥᗦᗧᗨᗩᗪᗫᗬᗭᗯᗰᗱᗲᗳᗴᗵᗶᗷᗸᗹᗺᗻᗼᗽᗾᗿᘀᘁᘂᘃᘄᘅᘆᘇᘈᘉᘊᘋᘌᘍᘎᘏᘐᘑᘒᘓᘔᘕᘖᘗᘘᘙᘚᘛᘜᘝᘞᘟᘠᘡᘢᘣᘤᘥᘦᘧᘨᘩᘪᘫᘬ" +
    "ᘭᘮᘯ";
export const CIPHER_SYLLABICS_8 =
    "ᘰᘱᘲᘳᘴᘵᘶᘷᘸᘹᘺᘻᘼᘽᘾᘿᙀᙁᙂᙃᙄᙅᙆᙇᙈᙉᙊᙋᙌᙍᙎᙏᙐᙑᙒᙓᙔᙕᙖᙗᙘᙙᙚᙛᙜᙝᙞᙟᙠᙡᙢᙣᙤᙥᙦᙧᙨᙩᙪᙫᙬ᙭᙮ᙯᙰᙱᙲᙳᙴᙵᙶᙷᙸᙹᙺᙻ" +
    "ᙼᙽᙾᙿ";

export const CIPHER_CANADIAN_SYLLABICS =
    CIPHER_SYLLABICS_1 +
    CIPHER_SYLLABICS_2 +
    CIPHER_SYLLABICS_3 +
    CIPHER_SYLLABICS_4 +
    CIPHER_SYLLABICS_5 +
    CIPHER_SYLLABICS_6 +
    CIPHER_SYLLABICS_7 +
    CIPHER_SYLLABICS_8;

// ─── Caucasus, Ethiopian & other scripts ───────────────────────────────────

/** Georgian Mkhedruli + Asomtavruli / Nuskhuri supplement. */
export const CIPHER_GEORGIAN =
    "აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰჱჲჳჴჵჶჷჸჹჺႠႡႢႣႤႥႦႧႨႩႪႫႬႭႮႯႰႱႲႳႴႵႶႷႸႹႺႻႼႽႾႿჀ";

/** Georgian Mtavruli. */
export const CIPHER_GEORGIAN_MTAVRULI =
    "ⴀⴁⴂⴃⴄⴅⴆⴇⴈⴉⴊⴋⴌⴍⴎⴏⴐⴑⴒⴓⴔⴕⴖⴗⴘⴙⴚⴛⴜⴝⴞⴟⴠ";

/** Vai syllabary (sample glyphs). */
export const CIPHER_VAI =
    "ꔀꔃꔉꔊꔋꔌꔚꔛꔤꔥꔪ";

export const CIPHER_ETHIOPIC = "ሀለሐመሠረሰቀበተኀነአከወዐዘየደገጠጰጸፀፈፐ";

// ─── Alchemical (Unicode 1F700–1F77F; omit missing-glyph code points) ───────

export const ALCHEMICAL_CIPHER_1 =
    "🜁🜂🜃🜄🜅🜆🜇🜈🜉🜊🜋🜌🜍🜎🜏🜐🜑🜒🜓🜔🜕🜖🜗🜘🜙🜛🜜🜝🜞🜟🜠🜡🜢🜣🜤🜥";
export const ALCHEMICAL_CIPHER_2 =
    "🜦🜧🜨🜩🜪🜫🜬🜭🜮🜯🜰🜱🜲🜳🜵🜶🜷🜸🜹🜻🜼🜾🜿🝀🝁🝂🝃🝅🝈🝉🝊🝋";
export const ALCHEMICAL_CIPHER_3 =
    "🝌🝍🝎🝏🝒🝓🝔🝕🝖🝗🝘🝝🝡🝢🝣🝤🝥🝦🝧🝨🝩🝪🝫🝬🝭🝮🝰🝱";
export const ALCHEMICAL_CIPHER_4 =
    "🝲🝳";

export const ALCHEMICAL_CIPHER_CHARS =
    ALCHEMICAL_CIPHER_1 +
    ALCHEMICAL_CIPHER_2 +
    ALCHEMICAL_CIPHER_3 +
    ALCHEMICAL_CIPHER_4;

/** Desktop matrix rain — concatenation order matches category sections above. */
export const FULL_MATRIX_CHARS =
    CIPHER_LATIN_EXTENDED +
    CIPHER_GREEK +
    CIPHER_MATH_DECORATIVE +
    DECORATIVE_CIPHER_CHARS +
    HEBREW_CIPHER_CHARS +
    CIPHER_ARABIC +
    CIPHER_DEVANAGARI +
    CIPHER_CYRILLIC +
    CIPHER_CJK +
    CIPHER_GEORGIAN +
    CIPHER_KANA +
    CIPHER_RUNIC +
    CIPHER_BENGALI +
    CIPHER_TELUGU +
    CIPHER_HANGUL +
    CIPHER_ETHIOPIC +
    CIPHER_MYANMAR +
    CIPHER_MALAYALAM +
    CIPHER_BAYBAYIN +
    CIPHER_CHEROKEE +
    CIPHER_CANADIAN_SYLLABICS +
    CIPHER_KHMER +
    CIPHER_THAI +
    CIPHER_SINHALA +
    ARMENIAN_CIPHER_CHARS +
    ALCHEMICAL_CIPHER_CHARS +
    CIPHER_GEORGIAN_MTAVRULI +
    CIPHER_VAI;
