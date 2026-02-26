/**
 * Builds protocol HTML in the exact format of the real interrogation protocol (bayonnoma).
 * Matches the structure of official documents: title, date, times, person data 1-15, legal preamble, Savol/Javob dialogue.
 */

import type { DialogSegment, ProtocolMetadata } from "../types";
import type { ProtocolTemplateEntry } from "../config/protocolTemplates";

/** Person data labels (Cyrillic) as in the real protocol form — 15 items. */
const PERSON_DATA_LABELS_CYRL: string[] = [
  "Фамилияси, исми, шарифи",
  "Туғилган куни",
  "Туғилган жойи",
  "Миллати",
  "Фуқаролиги",
  "Маълумоти, касби",
  "Иш жойи, лавозими",
  "Яшаш жойи",
  "Оилавий аҳволи",
  "Паспорти",
  "Судланганлиги",
  "Харбий хизматга мажбурлиги",
  "Жабрланувчига алоқаси",
  "Айбланувчига алоқаси",
  "Телефони",
];

/** Legal preamble for victim/witness interrogation (ЖПК 66, 117, ЖК 261, 264). */
const WITNESS_LEGAL_PARAGRAPHS_CYRL: string[] = [
  "Гувоҳ: адвокатнинг юридик ёрдамидан фойдаланиш; тергов ҳаракатларида адвокат билан бирга иштирок этиш; сўроқ юритилаётган тилни билмаса ёки етарлича билмаса, ўз она тилида кўрсатувлар бериш ва бу ҳолда таржимон хизматидан фойдаланиш; унинг сўроқ қилинишида иштирок этувчи таржимонни рад қилиш; кўрсатувларини ўз қўли билан ёзиб бериш; ўзига қарши кўрсатув бермаслик; сўроқ баённомаси билан танишиш, унга қўшимча ва ўзгартишлар киритиш; кўрсатувлар беришда ёзма белгилар ва ҳужжатлардан фойдаланиш; ўз манфаатларини ҳимоя қилиш учун суриштирувчининг, терговчининг, прокурорнинг ва суднинг ҳаракатлари ҳамда қарорлари устидан шикоятлар келтириш ҳуқуқига эга.",
  "Гувоҳ: суриштирувчи, терговчи, прокурор ва суднинг чақирувига биноан ҳозир бўлиши; иш бўйича ўзига маълум ҳамма нарса ҳақида ҳаққоний сўзлаб бериши; берилган саволларга жавоб қайтариши; иш бўйича ўзига маълум бўлган ҳолатларни сўроқ қилувчининг рухсатисиз ошкор этмаслиги; ишнинг тергови ва суд мажлиси вақтида тартибга риоя этиши шарт.",
  "Гувоҳ узрсиз сабабга кўра келмаган тақдирда ушбу Кодекснинг 261, 264-моддаларида назарда тутилган тартибда мажбурий равишда олиб келиниши мумкин.",
  "Гувоҳ кўрсатув беришдан бош тортганлик, шунингдек била туриб ёлғон кўрсатув берганлик учун қонунда белгиланган тарзда жавобгар бўлади.",
];

const MONTHS_CYRL = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

function getMeta(m: ProtocolMetadata | Record<string, unknown>, key: string): string {
  const v = (m as Record<string, unknown>)[key];
  return v != null ? String(v).trim() : "";
}

/** Values for the 15 person data fields from metadata and template role. */
function getPersonDataValues(
  meta: ProtocolMetadata | Record<string, unknown>,
  templateRole: string
): string[] {
  return [
    getMeta(meta, "personName"),
    getMeta(meta, "birthDate"),
    getMeta(meta, "birthPlace"),
    getMeta(meta, "nationality"),
    getMeta(meta, "citizenship"),
    getMeta(meta, "education"),
    getMeta(meta, "workPlace"),
    getMeta(meta, "address"),
    getMeta(meta, "familyStatus"),
    getMeta(meta, "idDocument"),
    getMeta(meta, "conviction"),
    getMeta(meta, "deputyStatus"),
    getMeta(meta, "relationVictim"),
    getMeta(meta, "relationSuspect"),
    getMeta(meta, "phoneNumber"),
  ];
}

function toCyrillicDate(dateText: string): string {
  const d = new Date(dateText);
  if (Number.isNaN(d.getTime())) return dateText;
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS_CYRL[d.getMonth()] ?? "";
  const year = d.getFullYear();
  return `${year} йил ${day} ${month}`;
}

function buildPersonShortSignature(personName: string): string {
  const parts = personName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const surname = parts[0];
    const nameInitial = (parts[1][0] || "").toUpperCase();
    return `${nameInitial}.${surname}`;
  }
  if (parts.length === 1) return parts[0];
  return "____________";
}

function getArticlesByTemplate(template: ProtocolTemplateEntry): string {
  const role = (template.role || "").toLowerCase();
  if (role.includes("guvoh") || role.includes("гувоҳ")) return "96-107, 114-120";
  if (role.includes("jabrlanuvchi") || role.includes("жабрланувчи")) return "95-107, 114-120";
  if (role.includes("ayblanuvchi") || role.includes("айбланувчи")) return "46, 111-120";
  if (role.includes("gumon") || role.includes("гумон")) return "48, 111-120";
  return "96-107, 114-120";
}

function templateRoleToCyrillicLabel(role: string): string {
  const r = (role || "").toLowerCase();
  if (r.includes("jabrlanuvchi") || r.includes("жабрланувчи")) return "Жабрланувчи";
  if (r.includes("guvoh") || r.includes("гувоҳ")) return "Гувоҳ";
  if (r.includes("ayblanuvchi") || r.includes("айбланувчи")) return "Айбланувчи";
  if (r.includes("gumon")) return "Гумон қилинувчи";
  return "Гувоҳ";
}

/** Detects if segment is from investigator (Savol) or from person (Javob). */
function isInvestigatorSegment(segment: DialogSegment): boolean {
  const name = (segment.speakerName || "").toLowerCase();
  const id = (segment.speakerId || "").toLowerCase();
  return (
    id === "investigator" ||
    id === "tergovchi" ||
    name.includes("tergovchi") ||
    name.includes("investigator") ||
    name.includes("сўроқ") ||
    name.includes("терговчи")
  );
}

/**
 * Builds full protocol HTML in real bayonnoma format.
 * Dialogue is rendered as: "Гувоҳ: _________ F.I.SH", then alternating "Савол:" / "Жавоб:".
 */
export function buildRealProtocolHtml(
  template: ProtocolTemplateEntry,
  meta: ProtocolMetadata | Record<string, unknown>,
  transcript: DialogSegment[],
  options?: { useCyrillicTitle?: boolean }
): string {
  const useCyrillic = options?.useCyrillicTitle !== false;
  const rawTitle = useCyrillic ? toCyrillicTitle(template.title) : template.title;

  /**
   * Always ensure the heading ends with "БАЁННОМАСИ".
   * Split into two lines: main action phrase (uppercase) + БАЁННОМАСИ on its own line.
   */
  const headingTitleHtml = (() => {
    let normalized = (rawTitle || "").trim().toUpperCase();

    // Strip any existing БАЁННОМАСИ variant to avoid duplication before re-adding
    const suffix = "БАЁННОМАСИ";
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length).trim();
    }

    // Always render as two lines: action phrase + БАЁННОМАСИ
    return `${escapeHtml(normalized)}<br/>${suffix}`;
  })();
  const caseNumber = getMeta(meta, "caseNumber");
  const city = getMeta(meta, "city");
  const date = toCyrillicDate(getMeta(meta, "date"));
  const startTime = getMeta(meta, "startTime");
  const endTime = getMeta(meta, "endTime");
  const investigatorName = getMeta(meta, "investigatorName");
  const investigatorRank = getMeta(meta, "investigatorRank");
  const officeNumber = getMeta(meta, "officeNumber");
  const personName = getMeta(meta, "personName");
  const roleLabel = templateRoleToCyrillicLabel(template.role);
  const personShortName = buildPersonShortSignature(personName);
  const articles = getArticlesByTemplate(template);

  const personValues = getPersonDataValues(meta, template.role);
  const personRows = PERSON_DATA_LABELS_CYRL.map(
    (label, i) => `<tr><td>${i + 1}.${escapeHtml(label)}</td><td>${escapeHtml(personValues[i] || "")}</td></tr>`
  ).join("");

  const isWitnessOrVictim =
    /гувоҳ|жабрланувчи|guvoh|jabrlanuvchi/i.test(template.role) ||
    /ГУВОҲ|ЖАБРЛАНУВЧИ|GUVOH|JABRLANUVCHI/.test(template.title);
  const legalIntro = isWitnessOrVictim
    ? `Ўзбекистон Республикаси ЖПКнинг 66-моддасида кўрсатилган ${roleLabel.toLowerCase()}нинг ҳуқуқ ва мажбуриятлари:`
    : `${roleLabel}нинг ҳуқуқ ва мажбуриятлари:`;

  const dialogueBlocks: string[] = [];
  let needRoleHeader = true;
  for (let i = 0; i < transcript.length; i++) {
    const seg = transcript[i];
    const text = (seg.text || "").trim();
    if (!text) continue;
    if (isInvestigatorSegment(seg)) {
      dialogueBlocks.push(`<p class="qa"><strong>Савол:</strong> ${escapeHtml(text)}</p>`);
    } else {
      if (needRoleHeader) {
        dialogueBlocks.push(
          `<p class="role-sign"><strong>${escapeHtml(roleLabel)}</strong> _________ ${escapeHtml(personShortName || "____________")}</p>`
        );
        needRoleHeader = false;
      }
      dialogueBlocks.push(`<p class="qa"><strong>Жавоб:</strong> ${escapeHtml(text)}</p>`);
      /* Guvoh/role ikki marta chiqmasin — faqat birinchi Javob oldida role-sign */
    }
  }
  const dialogueHtml = dialogueBlocks.length
    ? dialogueBlocks.join("\n")
    : "<p class=\"qa\"><em>Сўроқ матни йўқ.</em></p>";

  const legalParagraphs = isWitnessOrVictim
    ? WITNESS_LEGAL_PARAGRAPHS_CYRL.map((p) => `<p class="legal-paragraph">${escapeHtml(p)}</p>`).join("\n")
    : `<p class="legal-paragraph">${escapeHtml(template.legalInfo || "")}</p>`;

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="uz">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(rawTitle)}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.35; margin: 2cm auto; max-width: 21cm; padding: 0 2cm; color: #000; }
  h1 { font-size: 14pt; text-align: center; margin: 0 0 14pt 0; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2px; }
  .doc-wrap { max-width: 21cm; margin: 0 auto; }
  .intro { text-align: justify; text-indent: 30pt; margin: 0 0 10pt 0; font-size: 14pt; }
  .time-row { width: 100%; border-collapse: collapse; margin: 10pt 0 6pt 0; }
  .time-row td { width: 50%; font-weight: bold; text-decoration: underline; font-size: 14pt; }
  .time-row td:last-child { text-align: right; }
  table.person-data { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt 0; table-layout: fixed; }
  table.person-data td { border: 1px solid #000; padding: 3.5pt 6pt; vertical-align: top; font-size: 14pt; }
  table.person-data td:first-child { width: 41%; font-weight: bold; }
  .legal-title { font-weight: bold; text-align: justify; margin: 10pt 0 6pt 0; font-size: 14pt; }
  .legal-paragraph { text-align: justify; text-indent: 30pt; margin: 0 0 4pt 0; font-size: 14pt; }
  .legal-note { text-align: justify; margin: 8pt 0 10pt 0; text-indent: 30pt; font-size: 14pt; }
  .role-sign { text-align: right; font-size: 14pt; font-weight: bold; margin: 9pt 0 5pt 0; }
  .qa { text-align: justify; margin: 2pt 0 6pt 0; font-size: 14pt; line-height: 1.3; }
  .answer-lines { margin: 4pt 0 12pt 0; }
  .answer-lines hr { border: none; border-top: 1px solid #000; margin: 6pt 0; }
  .bottom-signatures { width: 100%; border-collapse: collapse; margin-top: 14pt; }
  .bottom-signatures td { width: 50%; font-size: 14pt; font-weight: bold; vertical-align: top; }
  .bottom-signatures td:last-child { text-align: right; }
</style>
</head>
<body>
<h1>${headingTitleHtml}</h1>
<p style="font-size:14pt;font-family:'Times New Roman',serif;margin:0 0 12pt 0;padding:0;overflow:hidden;line-height:1.4;"><span style="float:right;display:inline-block;">${escapeHtml(city)}</span>${escapeHtml(date)}</p>
<p class="intro">
  ${escapeHtml(city)} ИИБ ${escapeHtml(officeNumber)} тергов бўлими катта терговчиси ${escapeHtml(investigatorRank)} ${escapeHtml(investigatorName)},
  ушбу куни иш юритувимда бўлган ${caseNumber ? `${escapeHtml(caseNumber)}-сонли жиноят иши бўйича` : "жиноят иши бўйича"} хизмат хонамда, табиий ёруғликда
  Ўзбекистон Республикаси ЖПКнинг ${escapeHtml(articles)}-моддаларига асосланиб, ${escapeHtml(roleLabel.toLowerCase())} тариқасида сўроқ қилдим.
</p>
<table class="time-row">
  <tr>
    <td>Сўроқ бошланди: соат ${escapeHtml(startTime || "____")} да</td>
    <td>Сўроқ тамомланди: ${escapeHtml(endTime || "____")} да</td>
  </tr>
</table>
<table class="person-data">
${personRows}
</table>
<p class="legal-title">${escapeHtml(legalIntro)}</p>
${legalParagraphs}
<p class="legal-note">
  Ўзбекистон Республикаси ЖПКнинг 117-моддасига мувофиқ, ${escapeHtml(roleLabel.toLowerCase())} ${escapeHtml(personShortName)}га
  унинг Ўзбекистон Республикаси ЖПКнинг 66-моддасида кўрсатилган ҳуқуқ ва мажбуриятлари тушунтирилди.
</p>
<div class="dialogue">
${dialogueHtml}
</div>
<p class="qa"><strong>Савол:</strong> Айтингчи сизга тақдим этилган сўроқ баённомаси билан танишиб чиқдингизми, сизнинг сўзларингиз баённомада тўғри қайд этилганми, баённомага қўшимча ва эътирозларингиз борми?</p>
<p class="qa"><strong>Жавоб:</strong>______________________________________________________________________________________________________</p>
<div class="answer-lines">
  <hr />
  <hr />
  <hr />
</div>
<table class="bottom-signatures">
  <tr>
    <td>${escapeHtml(roleLabel)}:</td>
    <td>${escapeHtml(personShortName)}</td>
  </tr>
  <tr>
    <td style="padding-top:10pt;">Сўроқ қилдим:</td>
    <td style="padding-top:10pt;">${escapeHtml(investigatorName)}</td>
  </tr>
</table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Converts Latin protocol title to Cyrillic for official-style output. */
function toCyrillicTitle(latinTitle: string): string {
  const map: Record<string, string> = {
    "JABRLANUVCHINI SO'ROQ QILISH": "ЖАБРЛАНУВЧИНИ СЎРОҚ ҚИЛИШ БАЁННОМАСИ",
    "GUVOHNІ SO'ROQ QILISH": "ГУВОҲНИ СЎРОҚ ҚИЛИШ БАЁННОМАСИ",
    "GUVOHNI SO'ROQ QILISH": "ГУВОҲНИ СЎРОҚ ҚИЛИШ БАЁННОМАСИ",
    "GUMON QILINUVCHINI SO'ROQ QILISH": "ГУМОН ҚИЛИНУВЧИНИ СЎРОҚ ҚИЛИШ БАЁННОМАСИ",
    "AYBLANUVCHINI SO'ROQ QILISH": "АЙБЛАНУВЧИНИ СЎРОҚ ҚИЛИШ БАЁННОМАСИ",
    "YUZLASHTIRISH BAYONNOMASI": "ЮЗЛАШТИРИШ БАЁННОМАСИ",
  };
  const t = (latinTitle || "").toUpperCase().trim();
  return map[t] || latinTitle;
}
