import { extractYearFromDate } from "./applicationYear";

type ApplicationLike = {
  id?: string;
  origin?: string | null;
  sku?: string;
  attributeValues?: Array<{
    idAttribute?: string;
    valueString?: string | null;
    valueNumber?: number | null;
    valueBoolean?: boolean | null;
    valueDate?: string | Date | null;
    attribute?: { name?: string } | null;
  }>;
};

const isYearAttributeName = (name: string): boolean => {
  const normalized = name.toLowerCase();
  return normalized.includes("año") || normalized.includes("anio") || normalized.includes("year");
};

export const getApplicationAttributeValue = (
  application: ApplicationLike,
  attrName: string
): string | number | boolean | null => {
  const attr = application.attributeValues?.find((av) => {
    const name = av.attribute?.name || "";
    return name === attrName || name.toLowerCase() === attrName.toLowerCase();
  });
  if (!attr) return null;

  const attrLabel = attr.attribute?.name || attrName;
  if (isYearAttributeName(attrLabel)) {
    if (attr.valueNumber !== null && attr.valueNumber !== undefined) {
      return attr.valueNumber;
    }
    if (attr.valueDate) {
      const year = extractYearFromDate(attr.valueDate);
      if (year !== null) return year;
    }
    if (attr.valueString) {
      const str = String(attr.valueString);
      const rangeMatch = str.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
      if (rangeMatch) return rangeMatch[1];
      const yearMatch = str.match(/^(\d{4})/);
      if (yearMatch) return parseInt(yearMatch[1], 10);
      return str;
    }
    return null;
  }

  if (attr.valueString !== null && attr.valueString !== undefined && attr.valueString !== "") {
    return attr.valueString;
  }
  if (attr.valueNumber !== null && attr.valueNumber !== undefined) return attr.valueNumber;
  if (attr.valueBoolean !== null && attr.valueBoolean !== undefined) return attr.valueBoolean;
  if (attr.valueDate) {
    const year = extractYearFromDate(attr.valueDate);
    if (year !== null) return year;
  }
  return null;
};

export const extractApplicationYear = (application: ApplicationLike): number | null => {
  const attr = application.attributeValues?.find((av) =>
    isYearAttributeName(av.attribute?.name || "")
  );

  if (attr) {
    if (attr.valueNumber !== null && attr.valueNumber !== undefined) {
      return typeof attr.valueNumber === "number"
        ? attr.valueNumber
        : parseInt(String(attr.valueNumber), 10);
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
      if (!isNaN(singleYear)) return singleYear;
    }
  }

  const añoValue = getApplicationAttributeValue(application, "Año");
  if (añoValue === null || añoValue === undefined) return null;

  if (typeof añoValue === "number") return añoValue;
  if (typeof añoValue === "string") {
    const rangeMatch = añoValue.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
    if (rangeMatch) return parseInt(rangeMatch[1], 10);
    const singleYear = parseInt(añoValue, 10);
    if (!isNaN(singleYear)) return singleYear;
  }
  return null;
};

export const getApplicationGroupingKey = (application: ApplicationLike): string => {
  const origin = application.origin || "";
  const fabricante = getApplicationAttributeValue(application, "Fabricante") || "";
  const modelo = getApplicationAttributeValue(application, "Modelo") || "";
  const submodelo = getApplicationAttributeValue(application, "Submodelo") || "";
  const litrosMotor = getApplicationAttributeValue(application, "Litros_Motor") || "";
  const ccMotor = getApplicationAttributeValue(application, "CC_Motor") || "";
  const cidMotor = getApplicationAttributeValue(application, "CID_Motor") || "";
  const cilindrosMotor = getApplicationAttributeValue(application, "Cilindros_Motor") || "";
  const bloqueMotor = getApplicationAttributeValue(application, "Bloque_Motor") || "";
  const motor =
    getApplicationAttributeValue(application, "Motor") ||
    getApplicationAttributeValue(application, "Motor_Descripcion") ||
    "";
  const tipoMotor = getApplicationAttributeValue(application, "Tipo_Motor") || "";
  const transmision =
    getApplicationAttributeValue(application, "Transmisión") ||
    getApplicationAttributeValue(application, "Transmision") ||
    getApplicationAttributeValue(application, "Especificaciones") ||
    "";

  return `${origin}|${fabricante}|${modelo}|${submodelo}|${litrosMotor}|${ccMotor}|${cidMotor}|${cilindrosMotor}|${bloqueMotor}|${motor}|${tipoMotor}|${transmision}`;
};

export const buildGroupedApplicationLabel = (applications: ApplicationLike[]): string => {
  if (applications.length === 0) return "";

  const first = applications[0];
  const years = applications
    .map((app) => extractApplicationYear(app))
    .filter((year): year is number => year !== null)
    .sort((a, b) => a - b);

  const yearLabel =
    years.length === 0
      ? null
      : years[0] === years[years.length - 1]
        ? String(years[0])
        : `${years[0]}-${years[years.length - 1]}`;

  const parts: string[] = [];
  const fabricante = getApplicationAttributeValue(first, "Fabricante");
  const modelo = getApplicationAttributeValue(first, "Modelo");
  const submodelo = getApplicationAttributeValue(first, "Submodelo");
  const motor =
    getApplicationAttributeValue(first, "Motor") ||
    getApplicationAttributeValue(first, "Motor_Descripcion");
  const tipoMotor = getApplicationAttributeValue(first, "Tipo_Motor");
  const litrosMotor = getApplicationAttributeValue(first, "Litros_Motor");
  const ccMotor = getApplicationAttributeValue(first, "CC_Motor");
  const cidMotor = getApplicationAttributeValue(first, "CID_Motor");
  const cilindrosMotor = getApplicationAttributeValue(first, "Cilindros_Motor");
  const bloqueMotor = getApplicationAttributeValue(first, "Bloque_Motor");
  const transmision =
    getApplicationAttributeValue(first, "Transmisión") ||
    getApplicationAttributeValue(first, "Transmision") ||
    getApplicationAttributeValue(first, "Especificaciones");

  if (fabricante) parts.push(String(fabricante));
  if (modelo) parts.push(String(modelo));
  if (submodelo) parts.push(String(submodelo));
  if (yearLabel) parts.push(yearLabel);

  if (motor) parts.push(String(motor));
  else if (tipoMotor) parts.push(String(tipoMotor));
  else {
    if (bloqueMotor) parts.push(String(bloqueMotor));
    if (cilindrosMotor) parts.push(`${cilindrosMotor}cil`);
    if (litrosMotor) parts.push(`${litrosMotor}L`);
    else if (ccMotor) parts.push(`${ccMotor}CC`);
    else if (cidMotor) parts.push(`${cidMotor}CID`);
  }

  if (transmision) parts.push(String(transmision));
  if (parts.length === 0 && first.origin) parts.push(String(first.origin));

  return parts.join(" - ").trim();
};

const buildApplicationLabelForYearPart = (
  first: ApplicationLike,
  yearPart: string | null
): string => {
  const parts: string[] = [];
  const fabricante = getApplicationAttributeValue(first, "Fabricante");
  const modelo = getApplicationAttributeValue(first, "Modelo");
  const submodelo = getApplicationAttributeValue(first, "Submodelo");
  const motor =
    getApplicationAttributeValue(first, "Motor") ||
    getApplicationAttributeValue(first, "Motor_Descripcion");
  const tipoMotor = getApplicationAttributeValue(first, "Tipo_Motor");
  const litrosMotor = getApplicationAttributeValue(first, "Litros_Motor");
  const ccMotor = getApplicationAttributeValue(first, "CC_Motor");
  const cidMotor = getApplicationAttributeValue(first, "CID_Motor");
  const cilindrosMotor = getApplicationAttributeValue(first, "Cilindros_Motor");
  const bloqueMotor = getApplicationAttributeValue(first, "Bloque_Motor");
  const transmision =
    getApplicationAttributeValue(first, "Transmisión") ||
    getApplicationAttributeValue(first, "Transmision") ||
    getApplicationAttributeValue(first, "Especificaciones");

  if (fabricante) parts.push(String(fabricante));
  if (modelo) parts.push(String(modelo));
  if (submodelo) parts.push(String(submodelo));
  if (yearPart) parts.push(yearPart);

  if (motor) parts.push(String(motor));
  else if (tipoMotor) parts.push(String(tipoMotor));
  else {
    if (bloqueMotor) parts.push(String(bloqueMotor));
    if (cilindrosMotor) parts.push(`${cilindrosMotor}cil`);
    if (litrosMotor) parts.push(`${litrosMotor}L`);
    else if (ccMotor) parts.push(`${ccMotor}CC`);
    else if (cidMotor) parts.push(`${cidMotor}CID`);
  }

  if (transmision) parts.push(String(transmision));
  if (parts.length === 0 && first.origin) parts.push(String(first.origin));

  return parts.join(" - ").trim();
};

const buildApplicationLabelForYear = (
  first: ApplicationLike,
  year: number | null
): string => buildApplicationLabelForYearPart(first, year !== null ? String(year) : null);

export const collapseConsecutiveYears = (years: number[]): string => {
  if (years.length === 0) return "";
  if (years.length === 1) return String(years[0]);

  const sorted = [...years].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? String(start) : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? String(start) : `${start}-${end}`);
  return ranges.join(", ");
};

export type GroupedApplicationSuggestion = {
  id: string;
  fullLabel: string;
  baseLabel: string;
  years: number[];
  yearRangeLabel: string | null;
  labelForYear: (year: number) => string;
  formatWithYears: (years: number[]) => string;
};

export type LinkedApplicationDisplayItem = {
  key: string;
  displayLabel: string;
  storedLabels: string[];
  group?: GroupedApplicationSuggestion;
  /** Años incluidos en este vínculo (para editar uno a uno). */
  editableYears: Array<{ year: number; label: string }>;
};

const toEditableYears = (
  group: GroupedApplicationSuggestion,
  years: number[]
): Array<{ year: number; label: string }> =>
  years.map((year) => ({ year, label: group.labelForYear(year) }));

export const getGroupedApplicationSuggestions = (
  applications: ApplicationLike[] | undefined | null
): GroupedApplicationSuggestion[] => {
  if (!applications?.length) return [];

  const groups = new Map<string, ApplicationLike[]>();
  applications.forEach((application) => {
    const key = getApplicationGroupingKey(application);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(application);
  });

  return Array.from(groups.entries()).map(([id, groupApps]) => {
    const first = groupApps[0];
    const years = Array.from(
      new Set(
        groupApps
          .map((app) => extractApplicationYear(app))
          .filter((year): year is number => year !== null)
      )
    ).sort((a, b) => a - b);

    const yearRangeLabel =
      years.length === 0
        ? null
        : years.length === 1
          ? String(years[0])
          : `${years[0]}-${years[years.length - 1]}`;

    const fullLabel = buildGroupedApplicationLabel(groupApps);
    const baseLabel = buildApplicationLabelForYear(first, null);

    return {
      id,
      fullLabel,
      baseLabel,
      years,
      yearRangeLabel,
      labelForYear: (year: number) => buildApplicationLabelForYear(first, year),
      formatWithYears: (selectedYears: number[]) => {
        if (selectedYears.length === 0) return baseLabel;
        if (selectedYears.length === 1) {
          return buildApplicationLabelForYear(first, selectedYears[0]);
        }
        return buildApplicationLabelForYearPart(
          first,
          collapseConsecutiveYears(selectedYears)
        );
      },
    };
  });
};

export const getLinkedApplicationDisplayItems = (
  linkedApplications: string[],
  groups: GroupedApplicationSuggestion[]
): LinkedApplicationDisplayItem[] => {
  const remaining = new Set(linkedApplications);
  const items: LinkedApplicationDisplayItem[] = [];

  for (const group of groups) {
    if (remaining.has(group.fullLabel)) {
      items.push({
        key: `full:${group.id}`,
        displayLabel: group.fullLabel,
        storedLabels: [group.fullLabel],
        group,
        editableYears: toEditableYears(group, group.years),
      });
      remaining.delete(group.fullLabel);
      continue;
    }

    const matchedYears = group.years.filter((year) =>
      remaining.has(group.labelForYear(year))
    );

    if (matchedYears.length === 0) continue;

    matchedYears.forEach((year) => remaining.delete(group.labelForYear(year)));

    items.push({
      key: `years:${group.id}:${matchedYears.join(",")}`,
      displayLabel: group.formatWithYears(matchedYears),
      storedLabels: matchedYears.map((year) => group.labelForYear(year)),
      group,
      editableYears: toEditableYears(group, matchedYears),
    });
  }

  for (const label of linkedApplications) {
    if (!remaining.has(label)) continue;
    items.push({
      key: `manual:${label}`,
      displayLabel: label,
      storedLabels: [label],
      editableYears: [],
    });
    remaining.delete(label);
  }

  return items;
};

/** Quita un año concreto; si estaba como rango completo, lo descompone en años sueltos. */
export const removeApplicationYearFromLinked = (
  linkedApplications: string[],
  group: GroupedApplicationSuggestion,
  yearLabelToRemove: string
): string[] => {
  if (linkedApplications.includes(group.fullLabel)) {
    const individualYears = group.years
      .map((year) => group.labelForYear(year))
      .filter((label) => label !== yearLabelToRemove);

    return linkedApplications
      .filter((label) => label !== group.fullLabel)
      .concat(individualYears);
  }

  return linkedApplications.filter((label) => label !== yearLabelToRemove);
};

export const isApplicationGroupFullyLinked = (
  group: GroupedApplicationSuggestion,
  linkedApplications: string[]
): boolean => {
  if (linkedApplications.includes(group.fullLabel)) return true;
  if (group.years.length === 0) return false;
  return group.years.every((year) =>
    linkedApplications.includes(group.labelForYear(year))
  );
};

export const getGroupedApplicationLabels = (
  applications: ApplicationLike[] | undefined | null
): string[] => {
  if (!applications?.length) return [];

  const groups = new Map<string, ApplicationLike[]>();
  applications.forEach((application) => {
    const key = getApplicationGroupingKey(application);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(application);
  });

  return Array.from(groups.values())
    .map((group) => buildGroupedApplicationLabel(group))
    .filter(Boolean);
};

/** Etiqueta legible para una sola aplicación (sin agrupar). */
export const applicationLabel = (application: unknown): string => {
  if (typeof application === "string") return application;
  if (!application || typeof application !== "object") return "";
  return buildGroupedApplicationLabel([application as ApplicationLike]);
};

export type StoredApplicationDisplayItem = {
  key: string;
  displayLabel: string;
};

const YEAR_SEGMENT_PATTERN = /^\d{4}(?:\s*[-–]\s*\d{4})?(?:,\s*\d{4}(?:\s*[-–]\s*\d{4})?)*$/;

const getLabelBaseParts = (
  label: string
): { prefix: string; suffix: string } | null => {
  const parts = label.split(" - ");
  const yearIndex = parts.findIndex((part) => YEAR_SEGMENT_PATTERN.test(part.trim()));
  if (yearIndex === -1) return null;

  return {
    prefix: parts.slice(0, yearIndex).join(" - "),
    suffix: parts.slice(yearIndex + 1).join(" - "),
  };
};

const buildLabelFromBaseParts = (
  prefix: string,
  yearPart: string,
  suffix: string
): string => [prefix, yearPart, suffix].filter(Boolean).join(" - ");

const extractYearsFromStoredLabel = (label: string): number[] => {
  const parts = label.split(" - ");
  const yearSegment = parts.find((part) => YEAR_SEGMENT_PATTERN.test(part.trim()));
  if (!yearSegment) return [];

  const years: number[] = [];
  yearSegment.split(",").forEach((chunk) => {
    const trimmed = chunk.trim();
    const rangeMatch = trimmed.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let year = start; year <= end; year++) years.push(year);
      return;
    }
    const single = parseInt(trimmed, 10);
    if (!isNaN(single)) years.push(single);
  });

  return years;
};

/** Agrupa etiquetas guardadas (strings) para mostrar rangos en lectura. */
export const getStoredApplicationDisplayItems = (
  applications: string[]
): StoredApplicationDisplayItem[] => {
  if (!applications.length) return [];

  const grouped = new Map<
    string,
    { prefix: string; suffix: string; years: Set<number>; fallbackLabel: string }
  >();
  const manual: StoredApplicationDisplayItem[] = [];

  applications.forEach((label) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    const base = getLabelBaseParts(trimmed);
    if (!base) {
      manual.push({ key: `manual:${trimmed}`, displayLabel: trimmed });
      return;
    }

    const groupKey = `${base.prefix}||${base.suffix}`;
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        prefix: base.prefix,
        suffix: base.suffix,
        years: new Set(),
        fallbackLabel: trimmed,
      });
    }

    const entry = grouped.get(groupKey)!;
    extractYearsFromStoredLabel(trimmed).forEach((year) => entry.years.add(year));
  });

  const groupedItems = Array.from(grouped.entries()).map(([groupKey, entry]) => {
    if (entry.years.size === 0) {
      return { key: groupKey, displayLabel: entry.fallbackLabel };
    }

    const yearPart = collapseConsecutiveYears(
      Array.from(entry.years).sort((a, b) => a - b)
    );
    return {
      key: groupKey,
      displayLabel: buildLabelFromBaseParts(entry.prefix, yearPart, entry.suffix),
    };
  });

  return [...groupedItems, ...manual];
};

export const formatStoredApplicationsSummary = (applications: string[]): string => {
  const items = getStoredApplicationDisplayItems(applications);
  if (!items.length) return "Sin aplicaciones asociadas.";
  return items.map((item) => item.displayLabel).join("; ");
};
