import { Item } from "@/models/product";

export type BlogRelatedLinks = {
  productIds: string[];
  references: string[];
  applications: string[];
};

const EMPTY_RELATED_LINKS: BlogRelatedLinks = {
  productIds: [],
  references: [],
  applications: [],
};

const RELATED_LINKS_MARKER = "BLOG_RELATED_LINKS";
const RELATED_LINKS_REGEX = new RegExp(`<!--${RELATED_LINKS_MARKER}:([\\s\\S]*?)-->`, "g");

export const emptyRelatedLinks = (): BlogRelatedLinks => ({ ...EMPTY_RELATED_LINKS });

export const parseContentWithRelatedLinks = (
  content: string
): { cleanContent: string; relatedLinks: BlogRelatedLinks } => {
  let parsedLinks = emptyRelatedLinks();
  const matched = content.match(RELATED_LINKS_REGEX);

  if (matched && matched.length > 0) {
    const rawMarker = matched[matched.length - 1];
    const jsonPayload = rawMarker
      .replace(`<!--${RELATED_LINKS_MARKER}:`, "")
      .replace("-->", "")
      .trim();

    try {
      const parsed = JSON.parse(jsonPayload);
      parsedLinks = {
        productIds: Array.isArray(parsed?.productIds)
          ? parsed.productIds.filter((v: unknown) => typeof v === "string")
          : [],
        references: Array.isArray(parsed?.references)
          ? parsed.references.filter((v: unknown) => typeof v === "string")
          : [],
        applications: Array.isArray(parsed?.applications)
          ? parsed.applications.filter((v: unknown) => typeof v === "string")
          : [],
      };
    } catch {
      parsedLinks = emptyRelatedLinks();
    }
  }

  const cleanContent = content.replace(RELATED_LINKS_REGEX, "").trim();
  return { cleanContent, relatedLinks: parsedLinks };
};

export const serializeContentWithRelatedLinks = (
  cleanContent: string,
  relatedLinks: BlogRelatedLinks
): string => {
  const normalized: BlogRelatedLinks = {
    productIds: Array.from(new Set(relatedLinks.productIds.map((v) => v.trim()).filter(Boolean))),
    references: Array.from(new Set(relatedLinks.references.map((v) => v.trim()).filter(Boolean))),
    applications: Array.from(new Set(relatedLinks.applications.map((v) => v.trim()).filter(Boolean))),
  };

  const hasLinks =
    normalized.productIds.length > 0 ||
    normalized.references.length > 0 ||
    normalized.applications.length > 0;

  if (!hasLinks) return cleanContent.trim();

  const marker = `<!--${RELATED_LINKS_MARKER}:${JSON.stringify(normalized)}-->`;
  return `${cleanContent.trim()}\n${marker}`;
};

export type ResolvedBlogRelatedLinks = {
  products: { id: string; label: string; adminHref: string }[];
  references: string[];
  applications: string[];
};

export const resolveRelatedLinks = (
  relatedLinks: BlogRelatedLinks,
  products: Item[] = []
): ResolvedBlogRelatedLinks => {
  const productMap = new Map(products.map((product) => [product.id, product]));
  return {
    products: relatedLinks.productIds.map((id) => {
      const product = productMap.get(id);
      return {
        id,
        label: product?.name ?? id,
        adminHref: `/dashboard/producto/${id}`,
      };
    }),
    references: relatedLinks.references,
    applications: relatedLinks.applications,
  };
};
