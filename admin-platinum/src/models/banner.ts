export interface Banner {
  id: string;
  desktopUrl: string;
  mobileUrl: string;
  title?: string | null;
  altText?: string | null;
  sortOrder?: number;
  order?: number;
}
