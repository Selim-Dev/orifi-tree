/**
 * Static sample data for the POC.
 *
 * Modelled on how a Saudi family tree (شجرة العائلة) is normally kept:
 * patrilineal — the trunk follows the male line, wives are recorded on the
 * husband's node, and daughters appear as leaves without their own sub-branch.
 * Swapping this for a real API payload is the only change needed; the renderer
 * only cares about `children`.
 */

export type Gender = "m" | "f";

export interface Person {
  id: string;
  /** Short given name shown on the leaf. */
  name: string;
  /** Full lineage name shown in the detail panel. */
  full: string;
  latin: string;
  gender: Gender;
  birth?: number;
  death?: number;
  /** Wife / wives, recorded on the husband's node as is customary. */
  spouse?: string;
  title?: string;
  note?: string;
  children?: Person[];
}

export const FAMILY: Person = {
  id: "p1",
  name: "عبدالعزيز",
  full: "عبدالعزيز بن سليمان العريفي",
  latin: "Abdulaziz bin Sulaiman Al-Orifi",
  gender: "m",
  birth: 1928,
  death: 2011,
  spouse: "نورة بنت محمد الدوسري",
  title: "جدّ العائلة",
  note: "وُلد في الأحساء وانتقل إلى الرياض عام ١٩٥٤، ومنه تفرّعت العائلة.",
  children: [
    {
      id: "p2",
      name: "سليمان",
      full: "سليمان بن عبدالعزيز العريفي",
      latin: "Sulaiman bin Abdulaziz",
      gender: "m",
      birth: 1952,
      death: 2019,
      spouse: "لطيفة بنت صالح العتيبي",
      title: "الابن الأكبر",
      children: [
        {
          id: "p8",
          name: "عبدالعزيز",
          full: "عبدالعزيز بن سليمان العريفي",
          latin: "Abdulaziz bin Sulaiman",
          gender: "m",
          birth: 1978,
          spouse: "منى بنت فهد القحطاني",
          children: [
            { id: "p20", name: "سليمان", full: "سليمان بن عبدالعزيز", latin: "Sulaiman", gender: "m", birth: 2006 },
            { id: "p21", name: "نورة", full: "نورة بنت عبدالعزيز", latin: "Noura", gender: "f", birth: 2009 },
            { id: "p22", name: "ريّان", full: "ريّان بن عبدالعزيز", latin: "Rayyan", gender: "m", birth: 2014 },
          ],
        },
        {
          id: "p9",
          name: "خالد",
          full: "خالد بن سليمان العريفي",
          latin: "Khalid bin Sulaiman",
          gender: "m",
          birth: 1981,
          spouse: "سارة بنت ناصر الشمري",
          children: [
            { id: "p23", name: "لطيفة", full: "لطيفة بنت خالد", latin: "Latifa", gender: "f", birth: 2011 },
            { id: "p24", name: "ناصر", full: "ناصر بن خالد", latin: "Nasser", gender: "m", birth: 2016 },
          ],
        },
        { id: "p10", name: "هند", full: "هند بنت سليمان العريفي", latin: "Hind bint Sulaiman", gender: "f", birth: 1985 },
      ],
    },
    {
      id: "p3",
      name: "محمد",
      full: "محمد بن عبدالعزيز العريفي",
      latin: "Mohammed bin Abdulaziz",
      gender: "m",
      birth: 1955,
      spouse: "الجوهرة بنت عبدالله السبيعي",
      children: [
        {
          id: "p11",
          name: "عبدالله",
          full: "عبدالله بن محمد العريفي",
          latin: "Abdullah bin Mohammed",
          gender: "m",
          birth: 1983,
          spouse: "أمل بنت سعد الحربي",
          children: [
            { id: "p25", name: "محمد", full: "محمد بن عبدالله", latin: "Mohammed", gender: "m", birth: 2012 },
            { id: "p26", name: "جواهر", full: "جواهر بنت عبدالله", latin: "Jawaher", gender: "f", birth: 2015 },
            { id: "p27", name: "سعد", full: "سعد بن عبدالله", latin: "Saad", gender: "m", birth: 2019 },
          ],
        },
        { id: "p12", name: "ريم", full: "ريم بنت محمد العريفي", latin: "Reem bint Mohammed", gender: "f", birth: 1986 },
        {
          id: "p13",
          name: "تركي",
          full: "تركي بن محمد العريفي",
          latin: "Turki bin Mohammed",
          gender: "m",
          birth: 1990,
          spouse: "دانة بنت خالد المطيري",
          children: [
            { id: "p28", name: "الجوهرة", full: "الجوهرة بنت تركي", latin: "Al-Jawhara", gender: "f", birth: 2020 },
          ],
        },
      ],
    },
    {
      id: "p4",
      name: "فهد",
      full: "فهد بن عبدالعزيز العريفي",
      latin: "Fahad bin Abdulaziz",
      gender: "m",
      birth: 1959,
      spouse: "مها بنت إبراهيم الزامل",
      children: [
        {
          id: "p14",
          name: "بندر",
          full: "بندر بن فهد العريفي",
          latin: "Bandar bin Fahad",
          gender: "m",
          birth: 1987,
          spouse: "شهد بنت علي العنزي",
          children: [
            { id: "p29", name: "فهد", full: "فهد بن بندر", latin: "Fahad", gender: "m", birth: 2017 },
            { id: "p30", name: "مها", full: "مها بنت بندر", latin: "Maha", gender: "f", birth: 2021 },
          ],
        },
        { id: "p15", name: "لولوة", full: "لولوة بنت فهد العريفي", latin: "Lulwah bint Fahad", gender: "f", birth: 1992 },
      ],
    },
    {
      id: "p5",
      name: "منيرة",
      full: "منيرة بنت عبدالعزيز العريفي",
      latin: "Munira bint Abdulaziz",
      gender: "f",
      birth: 1962,
      death: 2020,
    },
    {
      id: "p6",
      name: "عبدالرحمن",
      full: "عبدالرحمن بن عبدالعزيز العريفي",
      latin: "Abdulrahman bin Abdulaziz",
      gender: "m",
      birth: 1966,
      spouse: "هيا بنت سلطان الدوسري",
      children: [
        {
          id: "p16",
          name: "سلطان",
          full: "سلطان بن عبدالرحمن العريفي",
          latin: "Sultan bin Abdulrahman",
          gender: "m",
          birth: 1993,
          spouse: "رزان بنت ماجد الغامدي",
          children: [
            { id: "p31", name: "عبدالرحمن", full: "عبدالرحمن بن سلطان", latin: "Abdulrahman", gender: "m", birth: 2022 },
          ],
        },
        { id: "p17", name: "غادة", full: "غادة بنت عبدالرحمن العريفي", latin: "Ghada bint Abdulrahman", gender: "f", birth: 1996 },
        { id: "p18", name: "ماجد", full: "ماجد بن عبدالرحمن العريفي", latin: "Majed bin Abdulrahman", gender: "m", birth: 1999 },
      ],
    },
    {
      id: "p7",
      name: "هيا",
      full: "هيا بنت عبدالعزيز العريفي",
      latin: "Haya bint Abdulaziz",
      gender: "f",
      birth: 1970,
      children: [
        { id: "p19", name: "نايف", full: "نايف بن مشعل", latin: "Nayef bin Mishal", gender: "m", birth: 1998 },
      ],
    },
  ],
};

export const GENERATION_LABELS = [
  "الجيل الأول",
  "الجيل الثاني",
  "الجيل الثالث",
  "الجيل الرابع",
  "الجيل الخامس",
];
