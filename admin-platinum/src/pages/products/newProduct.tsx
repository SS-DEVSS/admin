import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Layout from "@/components/Layouts/Layout";
import { Button } from "@/components/ui/button";
import { detailsType, stateSkeleton, useFormState } from "@/hooks/useFormProduct";
import AdditionalInfo from "@/modules/products/AdditionalInfo";
import Details from "@/modules/products/Details";
import { ChevronLeft, Trash2 } from "lucide-react";
import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import { useProducts } from "@/hooks/useProducts";
import { useCategoryContext } from "@/context/categories-context";
import { useToast } from "@/hooks/use-toast";
import { resolveProductNameForSave } from "@/utils/adminFieldVisibility";
import { invalidateProductListCache } from "@/utils/productListCache";
import Loader from "@/components/Loader";
import { Reference } from "@/models/reference";
import { Application } from "@/models/application";
import { persistNewReferences } from "@/services/referenceService";
import axiosClient from "@/services/axiosInstance";

function normalizeAttributeValue(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function buildFormSnapshot(
  details: detailsType,
  attributes: Record<string, unknown>,
  references: Reference[],
  applications: Application[] = [],
): string {
  const categoryId =
    typeof details.category === "string"
      ? details.category
      : details.category?.id ?? null;

  const normalizedAttributes = Object.fromEntries(
    Object.entries(attributes)
      .map(([key, value]): [string, unknown] => [key, normalizeAttributeValue(value)])
      .filter((entry): entry is [string, unknown] => entry[1] !== null)
      .sort(([a], [b]) => a.localeCompare(b)),
  );

  const referenceKeys = references
    .map(
      (reference) =>
        `${reference.id ?? ""}|${reference.referenceBrand ?? ""}|${reference.referenceNumber ?? ""}|${reference.type ?? ""}|${reference.description ?? ""}`,
    )
    .sort();

  const applicationIds = applications
    .map((application) => application.id ?? "")
    .filter(Boolean)
    .sort();

  return JSON.stringify({
    details: {
      sku: details.sku.trim(),
      description: details.description.trim(),
      imgUrl: details.imgUrl ?? "",
      visibleInCatalog: details.visibleInCatalog,
      categoryId,
      subcategoryId: details.subcategory?.id ?? null,
    },
    attributes: normalizedAttributes,
    referenceKeys,
    applicationIds,
  });
}

type InitialFormData = {
  details: detailsType;
  attributes: Record<string, unknown>;
  references: Reference[];
  applications: Application[];
};

function cloneInitialFormData(data: InitialFormData): InitialFormData {
  return {
    details: {
      ...data.details,
      category: data.details.category ? { ...data.details.category } : null,
      subcategory: data.details.subcategory ? { ...data.details.subcategory } : null,
    },
    attributes: { ...data.attributes },
    references: data.references.map((reference) => ({ ...reference })),
    applications: data.applications.map((application) => ({ ...application })),
  };
}

const NewProduct = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { getProductById, createProduct, updateProduct, deleteProduct } = useProducts();
  const { categories } = useCategoryContext();
  const { toast } = useToast();
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const savingStartTimeRef = useRef<number | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(() =>
    id ? null : buildFormSnapshot(stateSkeleton, {}, [], []),
  );
  const initialFormDataRef = useRef<InitialFormData>({
    details: { ...stateSkeleton },
    attributes: {},
    references: [],
    applications: [],
  });
  const [formResetKey, setFormResetKey] = useState(0);
  const loadedProductIdRef = useRef<string | null>(null);

  const handleApplicationsChange = useCallback((applications: Application[]) => {
    setCurrentProduct((prev: { applications?: Application[] } | null) =>
      prev ? { ...prev, applications } : prev,
    );
  }, []);

  const {
    detailsState,
    setDetailsState,
    attributesState,
    setAttributesState,
    referencesState,
    setReferencesState,
    applicationsState,
    setApplicationsState,
    canContinue,
    setCanContinue,
  } = useFormState();

  useEffect(() => {
    loadedProductIdRef.current = null;
  }, [id]);

  useEffect(() => {
    const loadProductData = async () => {
      if (isEditMode && id) {
        const isInitialProductLoad = loadedProductIdRef.current !== id;
        setIsLoadingProduct(true);
        const product = await getProductById(id);
        if (product) {
          setCurrentProduct((prev: { applications?: Application[] } | null) => {
            if (isInitialProductLoad || !prev?.applications?.length) {
              return product;
            }
            return { ...product, applications: prev.applications };
          });
          // 1. Populate Details
          // Find the category object from context based on product.category.id
          const categoryId = product.category?.id || product.category;

          let fullCategory =
            categories.find((c) => c.id === categoryId) || null;

          // If category not found in context, create a basic category object from product data
          if (!fullCategory && product.category) {
            fullCategory = {
              id: product.category.id || product.category,
              name: product.category.name || "Categoría desconocida",
            } as any;
          }

          // Get the first image URL if available
          const firstImage =
            product.images && product.images.length > 0
              ? product.images[0].url
              : "";

          // Get brand from product, or from category's brands if product doesn't have one
          let brandId = product.brand?.id || "";
          if (
            !brandId &&
            fullCategory?.brands &&
            fullCategory.brands.length > 0
          ) {
            // Use the first brand from the category
            brandId = fullCategory.brands[0].id || "";
          }

          const subcategoryFromProduct = (product as any).idSubcategory
            ? {
                id: (product as any).idSubcategory,
                name: (product as any).subcategory?.name ?? "",
              }
            : null;

          setDetailsState({
            id: product.id,
            name: product.name,
            type: product.type,
            description: product.description || "",
            category: fullCategory,
            subcategory: subcategoryFromProduct,
            references: [],
            sku: product.sku || "",
            brand: brandId,
            imgUrl: firstImage,
            visibleInCatalog:
              (product as { visibleInCatalog?: boolean }).visibleInCatalog ??
              (product as { visible_in_catalog?: boolean })
                .visible_in_catalog ??
              true,
          });

          const loadedDetails: detailsType = {
            id: product.id,
            name: product.name,
            type: product.type,
            description: product.description || "",
            category: fullCategory,
            subcategory: subcategoryFromProduct,
            references: [],
            sku: product.sku || "",
            brand: brandId,
            imgUrl: firstImage,
            visibleInCatalog:
              (product as { visibleInCatalog?: boolean }).visibleInCatalog ??
              (product as { visible_in_catalog?: boolean })
                .visible_in_catalog ??
              true,
          };

          // 2. Populate Attributes
          const attrs: any = {};
          if (product.attributeValues && fullCategory) {
            // Get product attributes from category (handle both array and object formats)
            let productAttributes: any[] = [];
            if (Array.isArray(fullCategory.attributes)) {
              productAttributes = fullCategory.attributes.filter(
                (a: any) => a.scope === "PRODUCT",
              );
            } else if (
              fullCategory.attributes &&
              typeof fullCategory.attributes === "object" &&
              "product" in fullCategory.attributes
            ) {
              productAttributes =
                (fullCategory.attributes as { product: any[] }).product || [];
            }

            product.attributeValues.forEach((av: any) => {
              const attributeDef = productAttributes.find(
                (a: any) => a.id === av.idAttribute && a.scope === "PRODUCT",
              );
              if (attributeDef) {
                attrs[attributeDef.name] =
                  av.valueString ||
                  av.valueNumber ||
                  av.valueBoolean ||
                  av.valueDate;
              }
            });
          }
          setAttributesState(attrs);

          // 3. Populate References
          const loadedReferences = product.references ?? [];
          if (loadedReferences.length > 0) {
            setReferencesState({ references: loadedReferences });
          }

          setInitialSnapshot(
            buildFormSnapshot(loadedDetails, attrs, loadedReferences, []),
          );
          initialFormDataRef.current = cloneInitialFormData({
            details: loadedDetails,
            attributes: attrs,
            references: loadedReferences,
            applications: [],
          });

          // 4. Populate Applications (only on initial load for this product)
          if (isInitialProductLoad) {
          // Convert backend applications to frontend format
          // Backend applications have: id, sku, origin, attributeValues
          // Frontend expects: id, referenceBrand, referenceNumber, type, description
          if (product.applications && Array.isArray(product.applications)) {
            const formattedApplications = product.applications.map(
              (app: any) => {
                // Extract key attributes from attributeValues
                // Applications typically have: Modelo, Submodelo, Año, Litros_Motor, etc.
                const getAttributeValue = (attrName: string) => {
                  const attr = app.attributeValues?.find(
                    (av: any) =>
                      av.attribute?.name === attrName ||
                      av.attribute?.name?.toLowerCase() ===
                        attrName.toLowerCase(),
                  );
                  if (!attr) return null;

                  const isYearAttribute =
                    attrName.toLowerCase().includes("año") ||
                    attrName.toLowerCase().includes("anio") ||
                    attrName.toLowerCase().includes("year");

                  // For year attributes, prioritize valueNumber (as it's stored now)
                  if (isYearAttribute) {
                    if (
                      attr.valueNumber !== null &&
                      attr.valueNumber !== undefined
                    ) {
                      return attr.valueNumber;
                    }
                    // Fallback to valueDate if valueNumber not available
                    if (attr.valueDate) {
                      const date = new Date(attr.valueDate);
                      if (!isNaN(date.getTime())) {
                        return date.getFullYear();
                      }
                    }
                    // Last resort: valueString
                    if (attr.valueString) {
                      const str = String(attr.valueString);
                      const yearMatch = str.match(/^(\d{4})/);
                      if (yearMatch) {
                        return parseInt(yearMatch[1], 10);
                      }
                      return str;
                    }
                    return null;
                  }

                  // For non-year attributes, use standard priority
                  return (
                    attr.valueString ||
                    attr.valueNumber ||
                    attr.valueBoolean ||
                    null
                  );
                };

                // Try common attribute names
                const modelo = getAttributeValue("Modelo");
                const submodelo = getAttributeValue("Submodelo");
                const año = getAttributeValue("Año");
                const litrosMotor = getAttributeValue("Litros_Motor");
                const ccMotor = getAttributeValue("CC_Motor");
                const cidMotor = getAttributeValue("CID_Motor");
                const cilindrosMotor = getAttributeValue("Cilindros_Motor");
                const bloqueMotor = getAttributeValue("Bloque_Motor");
                const motor = getAttributeValue("Motor");
                const tipoMotor = getAttributeValue("Tipo_Motor");
                const transmision =
                  getAttributeValue("Transmisión") ||
                  getAttributeValue("Transmision");

                // Build display text from available attributes (prioritize most distinctive ones)
                const parts: string[] = [];

                // Modelo is usually the most distinctive
                if (modelo) parts.push(String(modelo));

                // Submodelo adds more specificity
                if (submodelo) parts.push(String(submodelo));

                // Año is important for differentiation - ensure it's always just the year number
                if (año) {
                  let añoStr = String(año);
                  // If it looks like a timestamp or ISO date, extract just the year
                  if (
                    añoStr.includes("T") ||
                    (añoStr.includes("-") && añoStr.length > 4)
                  ) {
                    const yearMatch = añoStr.match(/^(\d{4})/);
                    if (yearMatch) {
                      añoStr = yearMatch[1];
                    }
                  }
                  // Also handle if it's a number - just convert to string
                  if (typeof año === "number") {
                    añoStr = año.toString();
                  }
                  parts.push(añoStr);
                }

                // Motor information
                if (motor) {
                  parts.push(String(motor));
                } else if (tipoMotor) {
                  parts.push(String(tipoMotor));
                } else if (litrosMotor) {
                  parts.push(`${litrosMotor}L`);
                } else if (ccMotor) {
                  parts.push(`${ccMotor}CC`);
                } else if (cidMotor) {
                  parts.push(`${cidMotor}CID`);
                }

                // Additional motor details if available
                if (cilindrosMotor && !motor) {
                  parts.push(`${cilindrosMotor}cil`);
                }

                if (bloqueMotor) {
                  parts.push(bloqueMotor);
                }

                if (transmision) {
                  parts.push(transmision);
                }

                // If we have no distinctive attributes, don't add anything
                // We'll just use the ID to differentiate

                // Always append a short version of the ID to make each application unique
                // Use last 8 characters of the ID (more readable than first 8)
                const shortId = app.id
                  .substring(app.id.length - 8)
                  .toUpperCase();

                // Build display text: combine attributes with ID
                // NEVER use app.sku as it's the same for all applications
                let displayText = "";
                if (parts.length > 0) {
                  displayText = `${parts.join(" - ")} (${shortId})`;
                } else {
                  // If no attributes, just show the ID
                  displayText = `Aplicación (${shortId})`;
                }

                // Return Application format with displayText for UI display
                const formatted: any = {
                  id: app.id,
                  sku: app.sku || "",
                  origin: app.origin || null,
                  attributeValues: app.attributeValues || [],
                  // Store formatted display text for UI
                  displayText: displayText,
                };

                return formatted;
              },
            );

            setApplicationsState({ applications: formattedApplications });
            initialFormDataRef.current = cloneInitialFormData({
              ...initialFormDataRef.current,
              applications: formattedApplications,
            });
            setInitialSnapshot(
              buildFormSnapshot(
                initialFormDataRef.current.details,
                initialFormDataRef.current.attributes,
                initialFormDataRef.current.references,
                formattedApplications,
              ),
            );
          } else {
            setApplicationsState({ applications: [] });
          }
          loadedProductIdRef.current = id;
          }
        }
        setIsLoadingProduct(false);
      }
    };

    if (categories.length > 0) {
      loadProductData();
    }
  }, [isEditMode, id, categories]); // Depend on categories to ensure they are loaded first

  const hasUnsavedChanges = useMemo(() => {
    if (initialSnapshot === null) return false;
    return (
      buildFormSnapshot(
        detailsState,
        attributesState,
        referencesState.references,
        applicationsState.applications,
      ) !== initialSnapshot
    );
  }, [initialSnapshot, detailsState, attributesState, referencesState, applicationsState.applications]);

  const handleDiscard = () => {
    const initial = cloneInitialFormData(initialFormDataRef.current);
    setDetailsState(initial.details);
    setAttributesState(initial.attributes);
    setReferencesState({ references: initial.references });
    setApplicationsState({ applications: initial.applications });
    setFormResetKey((key) => key + 1);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent double submission

    setIsSubmitting(true);
    const startTime = Date.now();
    savingStartTimeRef.current = startTime;

    try {
      // Validate required fields
      const missingFields: string[] = [];
      if (!detailsState.sku || detailsState.sku.trim() === "") {
        missingFields.push("SKU");
      }
      if (!detailsState.description || detailsState.description.trim() === "") {
        missingFields.push("Descripción");
      }
      if (!detailsState.category) {
        missingFields.push("Categoría");
      }

      if (missingFields.length > 0) {
        toast({
          title: "Error",
          variant: "destructive",
          description: `Por favor completa los siguientes campos requeridos: ${missingFields.join(", ")}`,
        });
        setIsSubmitting(false);
        savingStartTimeRef.current = null;
        return;
      }

      // Get category ID
      const categoryId =
        typeof detailsState.category === "string"
          ? detailsState.category
          : detailsState.category?.id;

      if (!categoryId) {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Por favor selecciona una categoría",
        });
        setIsSubmitting(false);
        savingStartTimeRef.current = null;
        return;
      }

      // Get the category to access attributes
      const category = categories.find((c) => c.id === categoryId);
      if (!category) {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Categoría no encontrada",
        });
        setIsSubmitting(false);
        savingStartTimeRef.current = null;
        return;
      }

      // Get existing product data if editing
      let existingProduct: any = null;
      if (isEditMode && id) {
        existingProduct = await getProductById(id);
      }

      // Format attributes
      const formattedAttributes: any[] = [];
      if (category.attributes) {
        const productAttributes = Array.isArray(category.attributes)
          ? category.attributes.filter((a: any) => a.scope === "PRODUCT")
          : (category.attributes as any)?.product || [];

        productAttributes.forEach((attr: any) => {
          const value = attributesState[attr.name];
          if (value !== undefined && value !== null && value !== "") {
            // Find the attribute value ID if editing
            let idAttributeValue: string | undefined;
            if (isEditMode && existingProduct?.attributeValues) {
              const existingAttrValue = existingProduct.attributeValues.find(
                (av: any) => av.idAttribute === attr.id,
              );
              if (existingAttrValue) {
                idAttributeValue = existingAttrValue.id;
              }
            }

            // In edit mode, only include attributes that already exist (have idAttributeValue)
            // New attributes would need to be created separately, which is not supported by the update endpoint
            if (isEditMode && !idAttributeValue) {
              return; // Skip this attribute
            }

            const attributeValue: any = {
              idAttribute: attr.id,
            };

            // Set the value based on attribute type
            if (
              attr.type === "STRING" ||
              attr.type === "TEXT" ||
              attr.type?.toLowerCase() === "string" ||
              attr.type?.toLowerCase() === "text"
            ) {
              attributeValue.valueString = String(value);
              attributeValue.valueNumber = null;
              attributeValue.valueBoolean = null;
              attributeValue.valueDate = null;
            } else if (
              attr.type === "NUMBER" ||
              attr.type === "NUMERIC" ||
              attr.type === "INTEGER" ||
              attr.type === "DECIMAL" ||
              attr.type?.toLowerCase() === "number" ||
              attr.type?.toLowerCase() === "numeric"
            ) {
              attributeValue.valueNumber = Number(value);
              attributeValue.valueString = null;
              attributeValue.valueBoolean = null;
              attributeValue.valueDate = null;
            } else if (
              attr.type === "BOOLEAN" ||
              attr.type?.toLowerCase() === "boolean"
            ) {
              attributeValue.valueBoolean = Boolean(value);
              attributeValue.valueString = null;
              attributeValue.valueNumber = null;
              attributeValue.valueDate = null;
            } else if (
              attr.type === "DATE" ||
              attr.type?.toLowerCase() === "date"
            ) {
              attributeValue.valueDate =
                value instanceof Date ? value : new Date(value);
              attributeValue.valueString = null;
              attributeValue.valueNumber = null;
              attributeValue.valueBoolean = null;
            }

            // In edit mode, idAttributeValue is required
            if (isEditMode) {
              if (!idAttributeValue) {
                return; // Skip this attribute
              }
              attributeValue.idAttributeValue = idAttributeValue;
            }

            formattedAttributes.push(attributeValue);
          }
        });
      }

      const productName = resolveProductNameForSave(
        detailsState.name,
        detailsState.sku,
      );

      // Format references - new refs are persisted via POST /references (full metadata)
      const currentReferenceIds = referencesState.references
        .map((ref) => ref.id)
        .filter((id): id is string => !!id);

      if (isEditMode && id) {
        await persistNewReferences(id, referencesState.references);

        const idSubcategory = detailsState.subcategory?.id ?? null;
        const productPayload: Record<string, unknown> = {
          name: productName,
          description: detailsState.description || null,
          idSubcategory,
          visibleInCatalog: detailsState.visibleInCatalog,
        };

        if (existingProduct && existingProduct.references) {
          const existingReferenceIds = existingProduct.references
            .map((ref: { id?: string }) => ref.id)
            .filter((refId: string | undefined): refId is string => !!refId);

          const referencesToRemoveIds = existingReferenceIds.filter(
            (refId: string) => !currentReferenceIds.includes(refId),
          );
          const referencesToRemove = existingProduct.references
            .filter((ref: { id?: string }) => referencesToRemoveIds.includes(ref.id))
            .map((ref: { referenceNumber?: string }) => ref.referenceNumber)
            .filter((num: string | undefined): num is string => !!num);

          if (referencesToRemove.length > 0) {
            productPayload.removeReferences = referencesToRemove;
          }
        }

        // Include attributes if there are any
        if (formattedAttributes.length > 0) {
          productPayload.attributes = formattedAttributes;
        }

        // If there's a new image, add it to the payload
        // The backend expects imageUrl or imgUrl
        if (detailsState.imgUrl && detailsState.imgUrl.trim() !== "") {
          // Check if it's a full URL or just a path
          // If it's a full URL (starts with http), use it as imageUrl
          // Otherwise, it's already a path and we can use it as imgUrl
          if (detailsState.imgUrl.startsWith("http")) {
            productPayload.imageUrl = detailsState.imgUrl;
          } else {
            productPayload.imgUrl = detailsState.imgUrl;
          }
        }

        await updateProduct(id, productPayload);

        const existingApplicationIds = (existingProduct?.applications ?? [])
          .map((application: { id?: string }) => application.id)
          .filter((applicationId: string | undefined): applicationId is string =>
            Boolean(applicationId),
          );
        const currentApplicationIds = applicationsState.applications
          .map((application) => application.id)
          .filter((applicationId): applicationId is string => Boolean(applicationId));
        const applicationIdsToDelete = existingApplicationIds.filter(
          (applicationId: string) => !currentApplicationIds.includes(applicationId),
        );

        if (applicationIdsToDelete.length === 1) {
          await axiosClient().delete(`/applications/${applicationIdsToDelete[0]}`);
        } else if (applicationIdsToDelete.length > 1) {
          await axiosClient().delete("/applications/bulk", {
            data: { applicationIds: applicationIdsToDelete },
          });
        }

        toast({
          title: "Producto actualizado",
          variant: "success",
          description: "El producto se ha actualizado correctamente",
        });
      } else {
        // Create product - ProductCreateRequest format
        // Format variants (for SINGLE products, create a variant with the product name)
        const productType = (detailsState.type || "SINGLE").toUpperCase();
        const variants: any[] = [];

        // Always create a variant for SINGLE products (default type)
        // Since type defaults to SINGLE, we should always create a variant
        if (productType === "SINGLE" || !detailsState.type) {
          variants.push({
            name: productName,
            sku: detailsState.sku || null,
            price: null,
            stockQuantity: null,
            attributes: [],
            images: [], // Images will be added after product creation
          });
        }

        const productPayload: any = {
          name: productName,
          sku: detailsState.sku || null,
          description: detailsState.description || null,
          type: productType,
          idCategory: categoryId,
          idSubcategory: detailsState.subcategory?.id ?? null,
          references: [],
          attributes: Array.isArray(formattedAttributes)
            ? formattedAttributes
            : [],
          variants: variants,
        };

        // If there's an image, add it to the payload
        // The backend expects imageUrl or imgUrl
        if (detailsState.imgUrl && detailsState.imgUrl.trim() !== "") {
          // Check if it's a full URL or just a path
          // If it's a full URL (starts with http), use it as imageUrl
          // Otherwise, it's already a path and we can use it as imgUrl
          if (detailsState.imgUrl.startsWith("http")) {
            productPayload.imageUrl = detailsState.imgUrl;
          } else {
            productPayload.imgUrl = detailsState.imgUrl;
          }
        }

        const created = await createProduct(productPayload);

        const createdProductId =
          (created as { id?: string; product?: { id?: string } })?.id ??
          (created as { product?: { id?: string } })?.product?.id;

        if (createdProductId && referencesState.references.length > 0) {
          await persistNewReferences(createdProductId, referencesState.references);
        }

        toast({
          title: "Producto creado",
          variant: "success",
          description: "El producto se ha creado correctamente.",
        });
      }

      // Ensure loader is shown for at least 800ms for better UX
      const elapsed = savingStartTimeRef.current
        ? Date.now() - savingStartTimeRef.current
        : 0;
      const minDisplayTime = 800;
      const remainingTime = Math.max(0, minDisplayTime - elapsed);

      setTimeout(() => {
        setIsSubmitting(false);
        savingStartTimeRef.current = null;
        invalidateProductListCache();
        navigate("/dashboard/productos");
      }, remainingTime);
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      setIsSubmitting(false);
      savingStartTimeRef.current = null;

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Error al guardar el producto";

      toast({
        title: "Error",
        variant: "destructive",
        description: errorMessage,
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!id) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(id);
      toast({ title: "Producto eliminado", variant: "success" });
      invalidateProductListCache();
      navigate("/dashboard/productos");
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Error al eliminar producto";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
      setDeleteOpen(false);
    }
  };

  if (isLoadingProduct) {
    return <Loader fullScreen message="Cargando producto..." />;
  }

  return (
    <>
      {isSubmitting && <Loader fullScreen message="Guardando cambios..." />}
      <Layout>
        <div className="mx-auto w-full max-w-[1400px]">
        <header className="flex justify-between mb-5">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/productos">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <p className="text-xl font-semibold leading-none tracking-tight">
              {isEditMode ? "Editar Producto" : "Nuevo Producto"}
            </p>
          </div>
        </header>
        <section className={`flex flex-col gap-5 w-full ${hasUnsavedChanges ? "pb-28" : "pb-5"}`}>
          <Details
            key={formResetKey}
            detailsState={detailsState}
            setDetailsState={setDetailsState}
            referencesState={referencesState}
            setReferencesState={setReferencesState}
            applicationsState={applicationsState}
            setApplicationsState={setApplicationsState}
            product={isEditMode ? currentProduct : null}
            attributesState={attributesState}
            setAttributesState={setAttributesState}
            setCanContinue={setCanContinue}
            onApplicationsChange={handleApplicationsChange}
          />
          {isEditMode && (
            <>
              <AdditionalInfo
                setCanContinue={setCanContinue}
                product={currentProduct}
              />
              <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
                <h2 className="text-base font-semibold text-destructive">Zona de peligro</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Eliminar este producto borrará de forma permanente imágenes, aplicaciones,
                  referencias y variantes asociadas.
                </p>
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar producto
                </Button>
              </section>
            </>
          )}
        </section>
        </div>
        {hasUnsavedChanges && (
        <section className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t">
          <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 py-4 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={handleDiscard} type="button">
              Descartar
            </Button>
            <Button
              disabled={!canContinue || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting
                ? "Guardando..."
                : isEditMode
                  ? "Guardar cambios"
                  : "Publicar Producto"}
            </Button>
          </div>
        </section>
        )}
      </Layout>

      <ConfirmActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar producto"
        description="Se eliminará este producto de forma permanente."
        consequences={[
          "Imágenes, aplicaciones, referencias y variantes asociadas.",
          "Esta acción no se puede deshacer.",
        ]}
        loading={deleteLoading}
        onConfirm={handleDeleteProduct}
      />
    </>
  );
};

export default NewProduct;
