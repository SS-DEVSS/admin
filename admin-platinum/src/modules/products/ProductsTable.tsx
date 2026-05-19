import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { MoreVertical, Upload, Star, FolderOpen, ChevronLeft, ChevronRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { productService } from "@/services/productService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link, useNavigate } from "react-router-dom";
import { Item, Variant } from "@/models/product";
import { useProducts } from "@/hooks/useProducts";
import { Category } from "@/models/category";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MyDropzone from "@/components/Dropzone";
import { useS3FileManager } from "@/hooks/useS3FileManager";
import { useToast } from "@/hooks/use-toast";
import axiosClient from "@/services/axiosInstance";
import { convertImageToWebP } from "@/utils/imageConverter";
import FeatureProductModal from "@/components/products/FeatureProductModal";
import { Product } from "@/models/product";
import { Application } from "@/models/application";
import FilePickerModal from "@/components/files/FilePickerModal";

interface DataTableProps {
  category?: Category | null;
  searchFilter?: string;
  subcategoryId?: string | null;
}

const DataTable = ({ category, searchFilter, subcategoryId }: DataTableProps) => {
  const navigate = useNavigate();
  const [mappedData, setMappedData] = useState<Variant[]>([]);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");
  const [previewVariant, setPreviewVariant] = useState<Variant | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const uploadInProgressRef = useRef(false);
  const lastUploadedFileRef = useRef<string>("");
  const { uploading } = useS3FileManager();
  const { toast } = useToast();
  const client = axiosClient();
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [selectedProductForFeature, setSelectedProductForFeature] = useState<Product | null>(null);
  const [selectedProductApplications, setSelectedProductApplications] = useState<Application[]>([]);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const { getProductById } = useProducts();

  const [products, setProducts] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(searchFilter || '');
  const [goToPageValue, setGoToPageValue] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [catalogVisibilityPending, setCatalogVisibilityPending] = useState(false);
  const [catalogVisibilityTargetIds, setCatalogVisibilityTargetIds] = useState<string[]>([]);
  const catalogVisibilityPendingRef = useRef(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchFilter || '');
      setPage(1); // Reset to first page when search changes
    }, 500);

    return () => clearTimeout(timer);
  }, [searchFilter]);

  // Fetch products by category with pagination and search
  useEffect(() => {
    const fetchProducts = async () => {
      if (!category?.id) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const params: Record<string, any> = {
          page,
          pageSize,
        };

        if (debouncedSearch && debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }
        if (subcategoryId && subcategoryId.trim()) {
          params.idSubcategory = subcategoryId.trim();
        }
        params.includeHidden = true;

        const response = await client.get(`/products/category/${category.id}`, { params });
        const { products: fetchedProducts, total: totalItems, totalPages: pages } = response.data;

        setProducts(fetchedProducts || []);
        setTotalItems(totalItems || 0);
        setTotalPages(pages || 1);
      } catch (error) {
        console.error('[ProductsTable] Error fetching products:', error);
        setProducts([]);
        setTotalItems(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category?.id, page, pageSize, debouncedSearch, subcategoryId, refreshKey]);

  const getProductIdFromRow = (row: Variant & { _originalItem?: Item | null }) =>
    row._originalItem?.id || row.idProduct || row.id;

  const handleCatalogVisibility = useCallback(async (
    productIds: string[],
    visibleInCatalog: boolean
  ) => {
    const uniqueIds = [...new Set(productIds)];
    if (uniqueIds.length === 0 || catalogVisibilityPendingRef.current) return;

    catalogVisibilityPendingRef.current = true;
    setCatalogVisibilityPending(true);
    setCatalogVisibilityTargetIds(uniqueIds);

    try {
      const { updatedCount } = await productService.bulkUpdateCatalogVisibility(
        uniqueIds,
        visibleInCatalog
      );
      if (updatedCount === 0) {
        throw new Error("No se actualizó ningún producto");
      }
      toast({
        title: "Éxito",
        description: visibleInCatalog
          ? "Productos visibles en el catálogo."
          : "Productos ocultos del catálogo.",
        variant: "success",
      });
      setRowSelection({});
      setRefreshKey((key) => key + 1);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (error instanceof Error ? error.message : null) ||
        "No se pudo actualizar la visibilidad en catálogo.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      catalogVisibilityPendingRef.current = false;
      setCatalogVisibilityPending(false);
      setCatalogVisibilityTargetIds([]);
    }
  }, [toast]);

  const handleImageClick = (variant: Variant) => {
    setSelectedVariant(variant);
    setImageFile({} as File); // Reset file when opening dialog
    setSelectedImageUrl(null); // Reset selected image URL
    lastUploadedFileRef.current = ""; // Reset last uploaded file
    uploadInProgressRef.current = false; // Reset upload flag
    setIsUploading(false);
    setImageDialogOpen(true);
  };

  const handlePreviewImage = (imageUrl: string, variant?: Variant) => {
    setPreviewImageUrl(imageUrl);
    setPreviewVariant(variant || null);
    setPreviewDialogOpen(true);
  };

  // Obtener la URL de la imagen actual del variant seleccionado
  const getCurrentImageUrl = (): string | undefined => {
    // If we have a selected image URL (from file picker), show that first
    if (selectedImageUrl) return selectedImageUrl;

    if (!selectedVariant) return undefined;
    const images = selectedVariant.images;
    if (images && Array.isArray(images) && images.length > 0) {
      return images[images.length - 1].url;
    }
    return undefined;
  };

  const handleDeleteImage = async (variant?: Variant | null) => {
    const variantToDelete = variant || selectedVariant;
    if (!variantToDelete || isDeleting) return;

    const isPseudoVariant = variantToDelete.id === variantToDelete.idProduct;

    if (!isPseudoVariant) {
      toast({
        title: "No se puede eliminar la imagen de un variant desde aquí",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await client.delete(`/products/${variantToDelete.id}/images`);

      toast({
        title: "Imagen eliminada correctamente",
        variant: "success",
      });

      // Refresh current page
      setPage(page);

      setPreviewDialogOpen(false);
      setImageDialogOpen(false);
      setSelectedVariant(null);
      setPreviewVariant(null);
      setImageFile({} as File);
    } catch (error: any) {
      toast({
        title: "Error al eliminar imagen",
        variant: "destructive",
        description: error.response?.data?.error || error.message || "Error desconocido",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileSelect = async (fileUrl: string) => {
    if (!selectedVariant) return;

    // Show preview immediately
    setSelectedImageUrl(fileUrl);
    setFilePickerOpen(false);
    setIsUploading(true);

    try {
      const isPseudoVariant = selectedVariant.id === selectedVariant.idProduct;

      if (isPseudoVariant) {
        // For SINGLE products, use PATCH with imageUrl
        await client.patch(`/products/${selectedVariant.id}`, {
          imageUrl: fileUrl,
        });

        toast({
          title: "Imagen actualizada correctamente",
          variant: "success",
        });

        // Refresh current page
        setPage(page);
      } else {
        // For variants, use PATCH with imageUrl
        await client.patch(`/variants/${selectedVariant.id}`, {
          imageUrl: fileUrl,
        });

        toast({
          title: "Imagen actualizada correctamente",
          variant: "success",
        });

        // Refresh current page
        setPage(page);
      }

      // Update the variant's image URL in local state for immediate preview
      setMappedData((prevData) => {
        return prevData.map((variant) => {
          if (variant.id === selectedVariant.id) {
            const existingImages = variant.images || [];
            const lastOrder = existingImages.length > 0 && existingImages[existingImages.length - 1]?.order !== undefined
              ? existingImages[existingImages.length - 1].order
              : -1;
            const newImage = {
              id: `temp-${Date.now()}`,
              url: fileUrl,
              order: lastOrder + 1,
            };
            return {
              ...variant,
              images: [...existingImages, newImage],
            } as Variant;
          }
          return variant;
        });
      });

      // Close dialog after a short delay to show success
      setTimeout(() => {
        setImageDialogOpen(false);
        setImageFile({} as File);
        setSelectedVariant(null);
        setSelectedImageUrl(null);
      }, 500);
    } catch (error: any) {
      toast({
        title: "Error al actualizar imagen",
        variant: "destructive",
        description: error.response?.data?.error || error.message || "Error desconocido",
      });
      setSelectedImageUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async () => {
    // Prevent multiple simultaneous uploads
    if (uploadInProgressRef.current || isUploading || !selectedVariant || !imageFile?.name) {
      return;
    }

    // Check if this file was already uploaded
    const fileIdentifier = `${imageFile.name}-${imageFile.size}-${imageFile.lastModified}`;
    if (lastUploadedFileRef.current === fileIdentifier) {
      return;
    }

    uploadInProgressRef.current = true;
    setIsUploading(true);
    lastUploadedFileRef.current = fileIdentifier;

    try {
      // Check if this is a real variant or a pseudo-variant (product without variants)
      // If idProduct === id, it means it's a SINGLE product without variants
      const isPseudoVariant = selectedVariant.id === selectedVariant.idProduct;

      if (isPseudoVariant) {
        // For SINGLE products, use the POST /products/:id/images endpoint
        // This endpoint accepts files directly and creates ProductImage records
        // We'll use replace=true query parameter to replace existing images

        // Convertir imagen a WebP antes de subir
        let fileToUpload = imageFile;
        if (imageFile.type.startsWith('image/')) {
          try {
            fileToUpload = await convertImageToWebP(imageFile);
          } catch (error) {
            fileToUpload = imageFile;
          }
        }

        const formData = new FormData();
        formData.append('images', fileToUpload);

        await client.post(`/products/${selectedVariant.id}/images?replace=true`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        toast({
          title: "Imagen actualizada correctamente",
          variant: "success",
        });

        // Fetch the updated product to get the new image
        try {
          const updatedProduct = await client.get(`/products/${selectedVariant.id}`);
          const productData = updatedProduct.data;

          // Try to get images from different possible locations
          let updatedImages: any[] = [];

          // Check if images are directly on the product
          if (productData.images && Array.isArray(productData.images)) {
            updatedImages = productData.images;
          }
          // Check if images are in variants (for SINGLE products, there might be a default variant)
          else if (productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0) {
            updatedImages = productData.variants[0].images || [];
          }

          // Update the local state with the new product data
          setMappedData((prevData) => {
            return prevData.map((variant) => {
              if (variant.id === selectedVariant.id) {
                return {
                  ...variant,
                  images: updatedImages
                };
              }
              return variant;
            });
          });

          // Refresh current page
          setPage(page);
        } catch (error) {
          // If fetching fails, refresh current page
          setPage(page);
        }
      } else {
        // For variants, we need to upload the file first, then use PATCH with imageUrl
        // Since there's no POST /variants/:id/images endpoint, we'll use the file upload endpoint
        // and then PATCH with the imageUrl

        // Convertir imagen a WebP antes de subir
        let fileToUpload = imageFile;
        if (imageFile.type.startsWith('image/')) {
          try {
            fileToUpload = await convertImageToWebP(imageFile);
          } catch (error) {
            fileToUpload = imageFile;
          }
        }

        // Upload the file to get the URL
        const formData = new FormData();
        formData.append('file', fileToUpload);

        const fileUploadResponse = await client.post('/files/images', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const imageUrl = fileUploadResponse.data.url;

        // Now update the variant with the imageUrl
        await client.patch(`/variants/${selectedVariant.id}`, {
          imageUrl: imageUrl,
        });

        toast({
          title: "Imagen actualizada correctamente",
          variant: "success",
        });

        // Fetch the updated variant to get the new image
        try {
          const updatedVariant = await client.get(`/variants/${selectedVariant.id}`);
          const updatedImages = (updatedVariant.data as any).images || [];

          // Update the local state with the new variant data
          setMappedData((prevData) => {
            return prevData.map((variant) => {
              if (variant.id === selectedVariant.id) {
                return {
                  ...variant,
                  images: updatedImages
                };
              }
              return variant;
            });
          });
        } catch (error) {
          // If fetching fails, refresh current page
          setPage(page);
        }
      }

      setImageDialogOpen(false);
      setImageFile({} as File);
      setSelectedVariant(null);
      lastUploadedFileRef.current = "";
      uploadInProgressRef.current = false;
      setIsUploading(false);
    } catch (error: any) {
      let errorMessage = "Error desconocido";
      if (error.response?.status === 404) {
        errorMessage = `Endpoint no encontrado. El ${selectedVariant.id === selectedVariant.idProduct ? 'producto' : 'variant'} con ID ${selectedVariant.id} no existe o el endpoint no está disponible.`;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error al subir imagen",
        variant: "destructive",
        description: errorMessage,
      });
      uploadInProgressRef.current = false;
      setIsUploading(false);
      lastUploadedFileRef.current = ""; // Reset to allow retry
    }
  };

  // Only trigger upload when a new file is selected (not on every render)
  useEffect(() => {
    if (imageFile && imageFile.name && selectedVariant && !uploadInProgressRef.current && !isUploading) {
      const fileIdentifier = `${imageFile.name}-${imageFile.size}-${imageFile.lastModified}`;
      if (lastUploadedFileRef.current !== fileIdentifier) {
        handleImageUpload();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFile?.name, imageFile?.size, imageFile?.lastModified]); // Only trigger when file actually changes

  const flattenVariants = (items: Item[]): Variant[] => {
    if (items.length) {
      return items.flatMap((item: Item): Variant[] => {
        const variants = item.variants;

        // If no variants (e.g. SINGLE product), map the item itself as a row
        if (!variants || variants.length === 0) {
          // Create a pseudo-variant from the main item
          // Check if the item has images directly or if we need to fetch them
          // The backend might return images in the item or we need to check variants
          const itemImages = (item as any).images || [];
          const itemSku = (item as any).sku || "";
          const itemAttributeValues = item.attributeValues || [];
          const itemDescription = item.description || "";

          return [{
            id: item.id,
            idProduct: item.id,
            sku: itemSku,
            name: item.name,
            description: itemDescription, // Include description from item
            type: item.type, // Include type from item
            price: 0,
            stockQuantity: 0,
            technicalSheets: [],
            images: itemImages, // Use images from item if available
            kitItems: [],
            attributeValues: itemAttributeValues as any, // Preserve attribute values from item
            productAttributeValues: itemAttributeValues, // Also set for product attributes lookup
            references: item.references || [], // Include references from item
            applications: (item as any).applications || [], // Include applications if available
          } as Variant];
        }

        return variants.map((variant: Variant): Variant => {
          // Get description from parent item if variant doesn't have one
          const variantDescription = (variant as any).description || item.description || "";

          return {
            ...variant,
            // Include description from parent item if variant doesn't have one
            description: variantDescription,
            // Preserve attributeValues from the variant, don't override with empty array
            attributeValues: (variant.attributeValues || []) as any,
            // Ensure images are preserved from the variant
            images: variant.images || [],
            // Include type from the parent item if not in variant
            ...((variant as any).type ? {} : { type: item.type }),
            // Include references and applications from parent item
            references: item.references || [],
            applications: (item as any).applications || [],
          } as any;
        });
      });
    }
    return [];
  };

  const columns = useMemo(() => {

    // Build base columns
    const baseColumns = [
      {
        id: "select",
        header: ({ table }: { table: { getIsAllPageRowsSelected: () => boolean; toggleAllPageRowsSelected: (value: boolean) => void } }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Seleccionar todos"
          />
        ),
        cell: ({ row }: { row: { getIsSelected: () => boolean; toggleSelected: (value: boolean) => void } }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Seleccionar fila"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "featured",
        header: "",
        cell: ({ row }: { row: any }) => {
          const productId = (row.original as any)?._originalItem?.id || (row.original as any)?.idProduct || row.original.id;

          // Try to get product from row data first (from _originalItem), then fall back to products array
          const rowProduct = (row.original as any)?._originalItem;
          const productFromArray = products?.find((p: any) => p.id === productId);
          // Prefer rowProduct (from _originalItem) as it's already in the row data
          const product = rowProduct || productFromArray;

          // Check both camelCase and snake_case for isFeatured
          const isFeatured = product?.isFeatured || product?.is_featured || false;
          const productApplications = (product as any)?.applications || [];

          return (
            <div className="flex items-center justify-center">
              <Star
                className={`h-5 w-5 cursor-pointer transition-colors ${isFeatured ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-400"
                  }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProductForFeature(product || null);
                  setSelectedProductApplications(productApplications);
                  setFeatureModalOpen(true);
                }}
              />
            </div>
          );
        },
      },
      {
        accessorKey: "images",
        header: "",
        cell: ({ row }: { row: any }) => (
          <div
            className="w-12 h-12 bg-white border border-gray-200 rounded-md cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleImageClick(row.original)}
          >
            {row.getValue("images") && Array.isArray(row.getValue("images")) && row.getValue("images").length > 0 ? (
              <img
                className="m-auto aspect-square p-1 w-full h-full object-contain rounded-md cursor-pointer"
                src={row.getValue("images")[row.getValue("images").length - 1].url}
                alt={row.original.name}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreviewImage(row.getValue("images")[row.getValue("images").length - 1].url, row.original);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-center text-xs text-gray-500">
                <Upload className="w-4 h-4" />
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }: { row: any }) => {
          const productId = getProductIdFromRow(row.original);
          const skuValue = row.getValue("sku") || row.original?.sku || "";

          if (!skuValue) {
            return <div className="text-sm font-medium">-</div>;
          }

          return (
            <div
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/dashboard/producto/${productId}`);
              }}
              className="text-sm font-medium text-blue-600 underline cursor-pointer"
            >
              {skuValue}
            </div>
          );
        },
      },
    ];

    const initialColumns = baseColumns;

    // Add type column
    initialColumns.push({
      accessorKey: "type",
      header: "Composición",
      cell: ({ row }: { row: any }) => {
        return (
          <div>
            {row.getValue("type") === "SINGLE" ? "Componente" : "Kit"}
          </div>
        );
      },
    });

    const catalogVisibilityColumn = [
      {
        id: "catalogVisibility",
        header: "Catálogo",
        cell: ({ row }: { row: { original: Variant & { _originalItem?: Item | null } } }) => {
          const productId = getProductIdFromRow(row.original);
          const isUpdating = catalogVisibilityTargetIds.includes(productId);
          const product =
            row.original._originalItem ||
            products.find((p) => p.id === productId);
          const visible =
            product?.visibleInCatalog ??
            (product as { visible_in_catalog?: boolean })?.visible_in_catalog ??
            true;
          if (isUpdating) {
            return (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Actualizando...
              </span>
            );
          }
          return (
            <span className={visible ? "text-green-700" : "text-muted-foreground"}>
              {visible ? "Visible" : "Oculto"}
            </span>
          );
        },
      },
    ];

    const actionColumn = [
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }: { row: { original: Variant & { _originalItem?: Item | null } } }) => {
          const productId = getProductIdFromRow(row.original);
          const product =
            row.original._originalItem ||
            products.find((p) => p.id === productId);
          const visible =
            product?.visibleInCatalog ??
            (product as { visible_in_catalog?: boolean })?.visible_in_catalog ??
            true;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/50">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4 text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <Link to={`/dashboard/producto/${productId}`}>
                  <DropdownMenuItem data-prevent-navigation>Editar</DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                  disabled={catalogVisibilityPending}
                  onSelect={(event) => {
                    event.preventDefault();
                    if (catalogVisibilityPending) return;
                    void handleCatalogVisibility([productId], !visible);
                  }}
                >
                  {catalogVisibilityTargetIds.includes(productId) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : visible ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Ocultar del catálogo
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Mostrar en catálogo
                    </>
                  )}
                </DropdownMenuItem>
                {/* <DropdownMenuItem
                  onClick={() => {
                    openModal({
                      title: "Borrar Producto",
                      description:
                        "Estas seguro que deseas eliminar este producto?",
                      handleDelete: () => handleDeleteProduct(row.original.id),
                    });
                  }}
                >
                  Eliminar
                </DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];

    return [
      ...initialColumns,
      ...catalogVisibilityColumn,
      ...actionColumn,
    ];
  }, [
    navigate,
    products,
    handleCatalogVisibility,
    catalogVisibilityPending,
    catalogVisibilityTargetIds,
  ]);

  useEffect(() => {
    // Products are already filtered by category from backend, no need to filter again
    const flattenedData = flattenVariants(products);
    // También guardar el item original para cada variant para tener acceso a references y applications
    const flattenedWithItem = flattenedData.map((variant) => {
      const originalItem = products.find(item =>
        item.id === variant.idProduct || (item.variants?.some(v => v.id === variant.id) || (!item.variants || item.variants.length === 0) && item.id === variant.id)
      );
      return {
        ...variant,
        _originalItem: originalItem || null, // Guardar el item original para acceso a references
      };
    });
    setMappedData(flattenedWithItem as Variant[]);
  }, [products]);

  // Search is now handled by backend, no need for frontend filtering

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable<Variant>({
    data: mappedData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true, // Use backend pagination
    pageCount: totalPages,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row, index) => String(index),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
  });

  const selectedProductIds = useMemo(() => {
    return Object.keys(rowSelection)
      .map((rowId) => {
        const index = Number(rowId);
        const row = mappedData[index];
        return row
          ? getProductIdFromRow(row as Variant & { _originalItem?: Item | null })
          : null;
      })
      .filter((id): id is string => !!id);
  }, [rowSelection, mappedData]);

  return (
    <div className="mt-6">
      {selectedProductIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3">
          <span className="text-sm font-medium">
            {selectedProductIds.length} seleccionado(s)
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={catalogVisibilityPending}
            onClick={() => void handleCatalogVisibility(selectedProductIds, true)}
          >
            {catalogVisibilityPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Mostrar en catálogo
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={catalogVisibilityPending}
            onClick={() => void handleCatalogVisibility(selectedProductIds, false)}
          >
            {catalogVisibilityPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <EyeOff className="mr-2 h-4 w-4" />
            )}
            Ocultar del catálogo
          </Button>
        </div>
      )}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Cambiar Imagen del Producto</DialogTitle>
                <DialogDescription>
                  {selectedVariant && `Sube una nueva imagen para: ${selectedVariant.name}`}
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilePickerOpen(true)}
                type="button"
                disabled={uploading || isUploading}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Buscar en archivos
              </Button>
            </div>
          </DialogHeader>
          <div className="py-4">
            <MyDropzone
              file={imageFile}
              fileSetter={setImageFile}
              type="image"
              className="p-8 min-h-[200px]"
              currentImageUrl={getCurrentImageUrl()}
              onImageClick={() => {
                const currentUrl = getCurrentImageUrl();
                if (currentUrl && selectedVariant) {
                  handlePreviewImage(currentUrl, selectedVariant);
                }
              }}
            />
            {(uploading || isUploading) && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {selectedImageUrl ? "Asociando imagen al producto..." : "Subiendo imagen..."}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-row justify-between sm:justify-between">
            {getCurrentImageUrl() && (
              <Button
                variant="destructive"
                onClick={() => handleDeleteImage()}
                disabled={uploading || isUploading || isDeleting}
              >
                {isDeleting ? "Eliminando..." : "Eliminar Imagen"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setImageDialogOpen(false)}
              disabled={uploading || isUploading}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FilePickerModal
        open={filePickerOpen}
        onOpenChange={setFilePickerOpen}
        onSelectFile={handleFileSelect}
        filterType="image"
      />
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Vista Previa de Imagen</DialogTitle>
            {previewVariant && (
              <DialogDescription>
                Producto: {previewVariant.name}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="py-4 flex justify-center">
            {previewImageUrl && (
              <img
                src={previewImageUrl}
                alt="Vista previa"
                className="max-w-full max-h-[500px] object-contain rounded-lg"
              />
            )}
          </div>
          {previewVariant && previewVariant.id === previewVariant.idProduct && (
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => handleDeleteImage(previewVariant)}
                disabled={isDeleting}
              >
                {isDeleting ? "Eliminando..." : "Eliminar Imagen"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPreviewDialogOpen(false)}
              >
                Cerrar
              </Button>
            </DialogFooter>
          )}
          {previewVariant && previewVariant.id !== previewVariant.idProduct && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPreviewDialogOpen(false)}
              >
                Cerrar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <div className="flex justify-center items-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-muted-foreground">Cargando productos...</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No existen resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {totalItems > 0 && (
        <div className="flex items-center justify-between space-x-4 py-4 flex-wrap gap-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalItems)} de {totalItems} productos
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers with ellipsis */}
            <div className="flex items-center space-x-1">
              {(() => {
                const pages: (number | string)[] = [];
                const maxVisible = 5;

                if (totalPages <= maxVisible) {
                  // Show all pages if total is small
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // Always show first page
                  pages.push(1);

                  if (page <= 3) {
                    // Near the beginning: 1, 2, 3, 4, ..., last
                    for (let i = 2; i <= 4; i++) {
                      pages.push(i);
                    }
                    pages.push('...');
                    pages.push(totalPages);
                  } else if (page >= totalPages - 2) {
                    // Near the end: 1, ..., last-3, last-2, last-1, last
                    pages.push('...');
                    for (let i = totalPages - 3; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    // In the middle: 1, ..., page-1, page, page+1, ..., last
                    pages.push('...');
                    pages.push(page - 1);
                    pages.push(page);
                    pages.push(page + 1);
                    pages.push('...');
                    pages.push(totalPages);
                  }
                }

                return pages.map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    );
                  }
                  const pageNum = p as number;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      className="min-w-[2.5rem]"
                      onClick={() => setPage(pageNum)}
                      disabled={loading}
                    >
                      {pageNum}
                    </Button>
                  );
                });
              })()}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Go to page */}
            <div className="flex items-center space-x-2 ml-4 pl-4 border-l">
              <span className="text-sm text-muted-foreground">Ir a:</span>
              <Input
                type="number"
                min={1}
                max={totalPages}
                value={goToPageValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoToPageValue(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    const pageNum = parseInt(goToPageValue);
                    if (pageNum >= 1 && pageNum <= totalPages) {
                      setPage(pageNum);
                      setGoToPageValue('');
                    }
                  }
                }}
                className="w-16 h-8 text-center"
                placeholder={page.toString()}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      )}
      <FeatureProductModal
        open={featureModalOpen}
        onOpenChange={setFeatureModalOpen}
        product={selectedProductForFeature}
        applications={selectedProductApplications}
        isCurrentlyFeatured={selectedProductForFeature?.isFeatured || false}
        currentFeaturedApplicationId={selectedProductForFeature?.featuredApplicationId || null}
        onSuccess={async () => {
          // Refresh current page
          setPage(page);
          // Force a re-render by updating the selected product state
          if (selectedProductForFeature) {
            // Refetch the specific product to get updated featured status
            const updatedProduct = await getProductById(selectedProductForFeature.id);
            if (updatedProduct) {
              setSelectedProductForFeature(updatedProduct);
            }
          }
        }}
      />
    </div>
  );
};

export default DataTable;
