import { ProtocolType } from "../types";

/**
 * Single source of truth for all protocol types (tergov turlari).
 * Used by SmartProtocol (Jonli so'roq), Stenogram (Audio tahlil), and document generation
 * so that all created documents and stenogrammas follow the same legal template.
 */
export interface ProtocolTemplateEntry {
  title: string;
  code: string;
  role: string;
  legalInfo: string;
}

export const PROTOCOL_TEMPLATES: Record<ProtocolType, ProtocolTemplateEntry> = {
  [ProtocolType.GUMONLANUVCHI]: {
    title: "GUMON QILINUVCHINI SO'ROQ QILISH",
    code: "JPK 112-modda",
    role: "Gumonlanuvchi",
    legalInfo:
      "Гумон қилинувчини сўроқ қилиш унинг ҳуқуқ ва мажбуриятларини (ЖПК 48-модда) тушунтиришдан бошланади. У сўроққа адвокат билан келишга ва кўрсатув беришдан бош тортишга ҳақли.",
  },
  [ProtocolType.GUVOH]: {
    title: "GUVOHNI SO'ROQ QILISH",
    code: "JPK 96-modda",
    role: "Guvoh",
    legalInfo:
      "Гувоҳнинг ҳуқуқ ва мажбуриятлари (ЖПК 66-модда). Гувоҳ била туриб ёлғон кўрсатма берганлик учун жиноий жавобгарликка тортилиши ҳақида (ЖК 238-модда) огоҳлантирилиши шарт.",
  },
  [ProtocolType.AYBLANUVCHI]: {
    title: "AYBLANUVCHINI SO'ROQ QILISH",
    code: "JPK 112-modda",
    role: "Ayblanuvchi",
    legalInfo:
      "Айбланувчининг ҳуқуқлари (ЖПК 46-модда): Айблов моҳиятини билиш, далиллар билан танишиш, ҳимоячига эга бўлиш. Сўроқ пайтида руҳий ёки жисмоний тазйиқ ўтказиш тақиқланади.",
  },
  [ProtocolType.JABRLANUVCHI]: {
    title: "JABRLANUVCHINI SO'ROQ QILISH",
    code: "JPK 96-modda",
    role: "Jabrlanuvchi",
    legalInfo:
      "Жабрланувчига етказилган зарарни қоплашни талаб қилиш, иш материаллари билан танишиш ҳуқуқлари тушунтирилади (ЖПК 55-модда).",
  },
  [ProtocolType.YUZLASHTIRISH]: {
    title: "YUZLASHTIRISH BAYONNOMASI",
    code: "JPK 123-modda",
    role: "Ikkinchi Taraf",
    legalInfo:
      "Юзлаштириш илгари сўроқ қилинган икки шахснинг кўрсатувларида жиддий қарама-қаршиликлар бўлган ҳолларда ўтказилади.",
  },
};
