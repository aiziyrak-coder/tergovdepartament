/**
 * Builds protocol HTML in the exact format of the real interrogation protocol (bayonnoma).
 * Matches the structure of official documents: title, date, times, person data 1-15, legal preamble, Savol/Javob dialogue.
 */

import type { DialogSegment, ProtocolMetadata } from "../types";
import type { ProtocolTemplateEntry } from "../config/protocolTemplates";

/** Person data labels (Cyrillic) as in the real protocol form — 15 items. */
const PERSON_DATA_LABELS_CYRL: string[] = [
  "Фамиляси, исми, шарифи",
  "Тугʻилган куни",
  "Тугʻилган жойи",
  "Миллати",
  "Фуқаролиги",
  "Маълумоти",
  "Иш жойи",
  "Яшаш жойи",
  "Оилавий аҳволи",
  "Пасорти",
  "Судланганлиги",
  "Харбий хизмати",
  "Жабрланувчи / Гувоҳ",
  "Айбланувчи",
  "Телефони",
];

/** Legal preamble for victim/witness interrogation (ЖПК 66, 117, ЖК 261, 264). */
const LEGAL_PREAMBLE_CYRL =
  "Гувоҳ: адвокатнинг юридик ёрдамидан фойдаланиш; тергов таракатларида адвокат билан бирга иштирок этиш; сўроқ юритилгандан тинч билмаса, уни она тилида курсатувлар бериш; сўроқ бўйномаси билан танишиш, униа бўйномача ва узгартиришлар киритиш; курсатувлар беришда изма белиглар ва таржимонлардан фойдаланиш; сўроқ бўйномаси билан танишиб чикиш, униа бўйномача ва узгартиришлар киритиш; курсатувлар беришда изма белиглар ва таржимонлардан фойдаланиш; унинг сўроқ тилининг давири ва суднин таракатларида таркатлар усбурида шикоят келтириш; сўроқ бўйномаси билан танишиб чикиш, униа бўйномача ва узгартиришлар киритиш; курсатувлар беришда изма белиглар ва таржимонлардан фойдаланиш; унинг сўроқ тилининг давири ва суднин таракатларида таркатлар усбурида шикоят келтириш; суриштирувчи, терговчи, прокурор ва суднин чақирувига биноан тизимгор бўлиши; уни бўйича узига маълум тилда курсатув бериши; уни бўйича узига маълум бўлган тилда сўроқ тилувчинин рухсатисиз, терговчининг, прокурорнинг ва суднин таракатлари таркибида иштирок этишдан бош тортишга ҳақли. " +
  "Гувоҳ: суриштирувчи, терговчи, прокурор ва суднин чақирувига биноан тизимгор бўлиши; уни бўйича берилган саволларга жавоб бериши; берилган саволларга жавоб бериши; уни бўйича узига маълум тилда курсатув бериши; уни бўйича узига маълум бўлган тилда сўроқ тилувчинин рухсатисиз, терговчининг, прокурорнинг ва суднин таракатлари таркибида иштирок этишдан бош тортишга ҳақли. Ўзбуру холатда узига маълум тилда курсатув бериши ва тергов ва суд мажлисида рухсат этилганларни сўроқ тилувчинин рухсатисиз, терговчининг, прокурорнинг ва суднин таракатлари таркибида иштирок этишдан бош тортишга ҳақли. " +
  "Гувоҳ узсриза сабабларда кўра келмаган таъдирда усбурида Кодексни 261, 264-моддаларида назарда тутилган тартибда мажбурий тутилади. " +
  "Гувоҳ курсатув беришдан бош тортишга ҳақли бўлган тортиқлик, шунингадек индекс бўла туриб курсатув беришни бўйномача белигланган тарзида жавоббор бўлади.";

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
    "", // passport — often filled separately
    getMeta(meta, "conviction"),
    "", // military
    templateRoleToCyrillicLabel(templateRole),
    "", // accused
    "", // phone
  ];
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
  const title = useCyrillic ? toCyrillicTitle(template.title) : template.title;
  const caseNumber = getMeta(meta, "caseNumber");
  const city = getMeta(meta, "city");
  const date = getMeta(meta, "date");
  const startTime = getMeta(meta, "startTime");
  const endTime = getMeta(meta, "endTime");
  const investigatorName = getMeta(meta, "investigatorName");
  const investigatorRank = getMeta(meta, "investigatorRank");
  const officeNumber = getMeta(meta, "officeNumber");
  const personName = getMeta(meta, "personName");
  const roleLabel = templateRoleToCyrillicLabel(template.role);
  const personShortName = personName ? personName.split(/\s+/).map((s) => (s[0] || "")).join(".") : "";

  const personValues = getPersonDataValues(meta, template.role);
  const personRows = PERSON_DATA_LABELS_CYRL.map(
    (label, i) => `<tr><td>${i + 1}. ${escapeHtml(label)}</td><td>${escapeHtml(personValues[i] || "")}</td></tr>`
  ).join("");

  const isWitnessOrVictim =
    /гувоҳ|жабрланувчи|guvoh|jabrlanuvchi/i.test(template.role) ||
    /ГУВОҲ|ЖАБРЛАНУВЧИ|GUVOH|JABRLANUVCHI/.test(template.title);
  const legalBlock = isWitnessOrVictim ? LEGAL_PREAMBLE_CYRL : (template.legalInfo || LEGAL_PREAMBLE_CYRL);

  const dialogueBlocks: string[] = [];
  let needRoleHeader = true;
  for (let i = 0; i < transcript.length; i++) {
    const seg = transcript[i];
    const text = (seg.text || "").trim();
    if (!text) continue;
    if (isInvestigatorSegment(seg)) {
      dialogueBlocks.push(`<p><strong>Савол:</strong> ${escapeHtml(text)}</p>`);
    } else {
      if (needRoleHeader) {
        dialogueBlocks.push(
          `<p><strong>${escapeHtml(roleLabel)}:</strong> _________ ${escapeHtml(personShortName || "____________")}</p>`
        );
        needRoleHeader = false;
      }
      dialogueBlocks.push(`<p><strong>Жавоб:</strong> ${escapeHtml(text)}</p>`);
    }
  }
  const dialogueHtml = dialogueBlocks.length ? dialogueBlocks.join("\n") : "<p><em>Сўроқ матни йўқ.</em></p>";

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="uz">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.35; margin: 2cm; }
  h1 { font-size: 14pt; text-align: center; margin-bottom: 12pt; font-weight: bold; }
  .meta { margin-bottom: 12pt; }
  .meta p { margin: 2pt 0; }
  table.person-data { width: 100%; border-collapse: collapse; margin: 12pt 0; }
  table.person-data td { border: 1px solid #000; padding: 4pt 8pt; vertical-align: top; }
  table.person-data td:first-child { width: 35%; font-weight: bold; }
  .legal { margin: 12pt 0; text-align: justify; }
  .dialogue p { margin: 6pt 0 6pt 1em; }
  .signature { margin-top: 24pt; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<div class="meta">
  <p>${escapeHtml(date)}</p>
  <p>${escapeHtml(city)}</p>
  <p>ИИБ ${escapeHtml(officeNumber)} тергов бўлими катта терговчиси ${escapeHtml(investigatorRank)} ${escapeHtml(investigatorName)}</p>
  ${caseNumber ? `<p>Жиноят иши № ${escapeHtml(caseNumber)}</p>` : ""}
  <p>Сўроқ бошланди: соат ${escapeHtml(startTime || "____")} да</p>
  <p>Сўроқ тамомланди: ${escapeHtml(endTime || "____")} да</p>
</div>
<table class="person-data">
${personRows}
</table>
<div class="legal">${escapeHtml(legalBlock)}</div>
<div class="dialogue">
${dialogueHtml}
</div>
<div class="signature">
  <p><strong>Сўроқ қилдим:</strong> ${escapeHtml(investigatorRank)} ${escapeHtml(investigatorName)}</p>
</div>
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
    "JABRLANUVCHINI SO'ROQ QILISH": "ЖАБРЛАНУВЧИНИ СЎРЎҚ ҚИЛИШ БАЁННОМАСИ",
    "GUVOHNІ SO'ROQ QILISH": "ГУВОҲНИ СЎРЎҚ ҚИЛИШ БАЁННОМАСИ",
    "GUVOHNI SO'ROQ QILISH": "ГУВОҲНИ СЎРЎҚ ҚИЛИШ БАЁННОМАСИ",
    "GUMON QILINUVCHINI SO'ROQ QILISH": "ГУМОН ҚИЛИНУВЧИНИ СЎРЎҚ ҚИЛИШ БАЁННОМАСИ",
    "AYBLANUVCHINI SO'ROQ QILISH": "АЙБЛАНУВЧИНИ СЎРЎҚ ҚИЛИШ БАЁННОМАСИ",
    "YUZLASHTIRISH BAYONNOMASI": "ЮЗЛАШТИРИШ БАЁННОМАСИ",
  };
  const t = (latinTitle || "").toUpperCase().trim();
  return map[t] || latinTitle;
}
