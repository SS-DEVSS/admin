export const createYearDate = (year: number): Date => new Date(Date.UTC(year, 0, 1));

export const extractYearFromDate = (
  dateValue: Date | string | null | undefined
): number | null => {
  if (dateValue == null) return null;

  const trimmed = String(dateValue).trim();
  if (/^\d{4}$/.test(trimmed)) {
    const year = Number(trimmed);
    return Number.isNaN(year) ? null : year;
  }

  const isoYearMatch = trimmed.match(/^(\d{4})-\d{2}-\d{2}/);
  if (isoYearMatch) {
    return Number(isoYearMatch[1]);
  }

  const date = dateValue instanceof Date ? dateValue : new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCFullYear();
};

export const isYearAttributeName = (name: string): boolean => {
  const normalized = name.toLowerCase();
  return normalized.includes("año") || normalized.includes("anio") || normalized.includes("year");
};

type YearAttributeValue = {
  valueString?: string | null;
  valueNumber?: number | null;
  valueDate?: string | Date | null;
  attribute?: { name?: string } | null;
};

export const extractYearFromAttributeValue = (
  attr: YearAttributeValue
): number | null => {
  if (attr.valueNumber !== null && attr.valueNumber !== undefined) {
    const year =
      typeof attr.valueNumber === "number"
        ? attr.valueNumber
        : parseInt(String(attr.valueNumber), 10);
    return Number.isNaN(year) ? null : year;
  }

  if (attr.valueDate) {
    const year = extractYearFromDate(attr.valueDate);
    if (year !== null) return year;
  }

  if (attr.valueString) {
    const str = String(attr.valueString);
    const rangeMatch = str.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
    if (rangeMatch) return parseInt(rangeMatch[1], 10);
    const singleYear = parseInt(str, 10);
    if (!Number.isNaN(singleYear)) return singleYear;
  }

  return null;
};

export const extractApplicationYear = (
  attributeValues: YearAttributeValue[] | undefined | null
): number | null => {
  if (!attributeValues?.length) return null;

  const yearAttr = attributeValues.find((attr) =>
    isYearAttributeName(attr.attribute?.name || "")
  );
  if (!yearAttr) return null;

  return extractYearFromAttributeValue(yearAttr);
};
