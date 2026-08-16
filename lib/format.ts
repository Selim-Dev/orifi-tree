const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function toArabicDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);
}

/** "١٩٥٢ – ٢٠١٩" for the deceased, "١٩٧٨ –" for the living. */
export function lifespan(birth: number | undefined, death: number | undefined): string {
  if (!birth && !death) return "";
  if (birth && death) return `${toArabicDigits(birth)} – ${toArabicDigits(death)}`;
  if (birth) return `${toArabicDigits(birth)} –`;
  return `– ${toArabicDigits(death!)}`;
}
