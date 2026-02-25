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
    title: "ГУМОН ҚИЛИНУВЧИНИ СЎРОҚ ҚИЛИШ",
    code: "ЖПК 112-модда",
    role: "Гумон қилинувчи",
    legalInfo:
      "Гумон қилинувчини сўроқ қилиш унинг ҳуқуқ ва мажбуриятларини (ЖПК 48-модда) тушунтиришдан бошланади. У сўроққа адвокат билан келишга ва кўрсатув беришдан бош тортишга ҳақли.",
  },
  [ProtocolType.GUVOH]: {
    title: "ГУВОҲНИ СЎРОҚ ҚИЛИШ",
    code: "ЖПК 66-модда",
    role: "Гувоҳ",
    legalInfo:
      "Гувоҳнинг ҳуқуқ ва мажбуриятлари (ЖПК 66-модда). Гувоҳ била туриб ёлғон кўрсатма берганлик учун жиноий жавобгарликка тортилиши ҳақида (ЖК 238-модда) огоҳлантирилиши шарт.",
  },
  [ProtocolType.AYBLANUVCHI]: {
    title: "АЙБЛАНУВЧИНИ СЎРОҚ ҚИЛИШ",
    code: "ЖПК 112-модда",
    role: "Айбланувчи",
    legalInfo:
      "Айбланувчининг ҳуқуқлари (ЖПК 46-модда): Айблов моҳиятини билиш, далиллар билан танишиш, ҳимоячига эга бўлиш. Сўроқ пайтида руҳий ёки жисмоний тазйиқ ўтказиш тақиқланади.",
  },
  [ProtocolType.JABRLANUVCHI]: {
    title: "ЖАБРЛАНУВЧИНИ СЎРОҚ ҚИЛИШ",
    code: "ЖПК 96-модда",
    role: "Жабрланувчи",
    legalInfo:
      "Жабрланувчига етказилган зарарни қоплашни талаб қилиш, иш материаллари билан танишиш ҳуқуқлари тушунтирилади (ЖПК 55-модда).",
  },
  [ProtocolType.YUZLASHTIRISH]: {
    title: "ЮЗЛАШТИРИШ БАЁННОМАСИ",
    code: "ЖПК 123-модда",
    role: "Иккинчи Тараф",
    legalInfo:
      "Юзлаштириш илгари сўроқ қилинган икки шахснинг кўрсатувларида жиддий қарама-қаршиликлар бўлган ҳолларда ўтказилади.",
  },
};
