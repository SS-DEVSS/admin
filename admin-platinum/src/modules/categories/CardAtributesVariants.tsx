import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  CategoryAttributeApi,
  CategoryAtributes,
  CategoryAttributesTypes,
  typesArray,
} from "@/models/category";
import { PlusCircle, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// Mapeo de tipos técnicos a nombres amigables para el usuario
const typeDisplayNames: Record<CategoryAttributesTypes, string> = {
  [CategoryAttributesTypes.STRING]: "Texto",
  [CategoryAttributesTypes.NUMERIC]: "Número",
  [CategoryAttributesTypes.DATE]: "Fecha",
  [CategoryAttributesTypes.BOOLEAN]: "Verdadero/Falso",
};
import { useEffect } from "react";
import { useMemo } from "react";
import { Dispatch } from "react";
import { formTypes } from "./CatgegoryCU";
import CardAttributeTable from "@/components/CardAttributeTable";
import { useCategoryContext } from "@/context/categories-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CardAtributesVariantsProps = {
  form: formTypes;
  setForm: Dispatch<React.SetStateAction<formTypes>>;
  title: "Atributos de Producto" | "Atributos de Variantes" | "Atributos de Aplicaciones";
  description: string;
};

enum AttributeScope {
  PRODUCT = "PRODUCT",
  VARIANT = "VARIANT",
  APPLICATION = "APPLICATION",
  REFERENCE = "REFERENCE",
}

interface AttributeFormType {
  name: string;
  csv_name?: string;
  display_name?: string;
  type: CategoryAttributesTypes | string;
  required: boolean | null;
  order?: number;
  scope?: AttributeScope;
  visibleInCatalog?: boolean;
  visibleInProductDetail?: boolean;
}

const AttributeFormInitialState = {
  name: "",
  csv_name: "",
  display_name: "",
  type: "",
  required: null,
};

interface AttributesType {
  productAttributes: CategoryAtributes[];
  variantAttributes: CategoryAtributes[];
  applicationAttributes: CategoryAtributes[];
}

const CardAtributesVariants = ({
  form,
  setForm,
  title,
  description,
}: CardAtributesVariantsProps) => {
  const { category } = useCategoryContext();
  const [type, setType] = useState<AttributeScope>(AttributeScope.PRODUCT);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("add");
  const [currentAttribute, setCurrentAttribute] =
    useState<CategoryAtributes | null>(null);
  const [attributeForm, setAttributeForm] = useState<AttributeFormType>(
    AttributeFormInitialState
  );
  const [attributes, setAttributes] = useState<AttributesType>({
    productAttributes: [],
    variantAttributes: [],
    applicationAttributes: [],
  });

  useEffect(() => {
    if (title === "Atributos de Producto") {
      setType(AttributeScope.PRODUCT);
    } else if (title === "Atributos de Variantes") {
      setType(AttributeScope.VARIANT);
    } else if (title === "Atributos de Aplicaciones") {
      setType(AttributeScope.APPLICATION);
    }
  }, [title]);

  useEffect(() => {
    if (category && form.attributes && Array.isArray(form.attributes) && form.attributes.length) {
      const tempArray = form.attributes;

      const productAttributes: CategoryAtributes[] = [];
      const variantAttributes: CategoryAtributes[] = [];
      const applicationAttributes: CategoryAtributes[] = [];

      tempArray.forEach((attribute: CategoryAtributes) => {
        if (attribute.scope === "PRODUCT") {
          productAttributes.push(attribute);
        } else if (attribute.scope === "VARIANT") {
          variantAttributes.push(attribute);
        } else if (attribute.scope === "APPLICATION") {
          applicationAttributes.push(attribute);
        }
      });

      setAttributes({
        ...attributes,
        productAttributes,
        variantAttributes,
        applicationAttributes,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    if (category && form?.attributes && Array.isArray(form.attributes)) {
      const productAttributes = form.attributes.filter(attr => attr.scope === "PRODUCT") || [];
      const variantAttributes = form.attributes.filter(attr => attr.scope === "VARIANT") || [];
      const applicationAttributes = form.attributes.filter(attr => attr.scope === "APPLICATION") || [];

      const tempArray = [...productAttributes, ...variantAttributes, ...applicationAttributes];

      const updatedProductAttributes: CategoryAtributes[] = [];
      const updatedVariantAttributes: CategoryAtributes[] = [];
      const updatedApplicationAttributes: CategoryAtributes[] = [];

      tempArray.forEach((attribute: CategoryAtributes) => {
        if (attribute.scope === "PRODUCT") {
          updatedProductAttributes.push(attribute);
        } else if (attribute.scope === "VARIANT") {
          updatedVariantAttributes.push(attribute);
        } else if (attribute.scope === "APPLICATION") {
          updatedApplicationAttributes.push(attribute);
        }
      });

      setAttributes({
        productAttributes: updatedProductAttributes,
        variantAttributes: updatedVariantAttributes,
        applicationAttributes: updatedApplicationAttributes,
      });
    }
  }, [category, form?.attributes]);

  useEffect(() => {
    if (form.attributes && Array.isArray(form.attributes) && form.attributes.length) {
      const productAttrs = form.attributes.filter(
        (attr) => attr.scope === "PRODUCT"
      );
      const variantAttrs = form.attributes.filter(
        (attr) => attr.scope === "VARIANT"
      );
      const applicationAttrs = form.attributes.filter(
        (attr) => attr.scope === "APPLICATION"
      );
      setAttributes({
        productAttributes: productAttrs,
        variantAttributes: variantAttrs,
        applicationAttributes: applicationAttrs,
      });
    }
  }, [form.attributes]);

  const handleAttributeForm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAttributeForm({
      ...attributeForm,
      [name]: value,
    });
  };

  const validateForm = useMemo(() => {
    return (
      (attributeForm.display_name || attributeForm.name).trim() !== "" &&
      attributeForm.csv_name?.trim() !== "" &&
      typeof attributeForm.required === "boolean" &&
      typesArray.includes(attributeForm.type as CategoryAttributesTypes)
    );
  }, [attributeForm]);

  // console.log(currentAttribute);

  const handleAddClick = () => {
    setCurrentAttribute(null);
    setDialogMode("add");
    setIsDialogOpen(true);
  };

  const handleAddPredefinedField = (displayName: string, fieldType: string, csvName: string) => {
    const order =
      type === AttributeScope.PRODUCT
        ? attributes.productAttributes.length
        : type === AttributeScope.VARIANT
          ? attributes.variantAttributes.length
          : attributes.applicationAttributes.length;

    const payload: CategoryAtributes = {
      name: displayName,
      display_name: displayName,
      csv_name: csvName,
      required: false,
      type: fieldType as CategoryAttributesTypes,
      scope: type as AttributeScope,
      order: order,
      visibleInCatalog: true,
      visibleInProductDetail: true,
    };

    setForm((prev) => ({
      ...prev,
      attributes: [...prev.attributes, payload],
    }));

    setAttributes((prev) => ({
      ...prev,
      ...(type === AttributeScope.PRODUCT
        ? { productAttributes: [...prev.productAttributes, payload] }
        : type === AttributeScope.VARIANT
          ? { variantAttributes: [...prev.variantAttributes, payload] }
          : { applicationAttributes: [...prev.applicationAttributes, payload] }),
    }));
  };

  const handleEditClick = (attribute: CategoryAtributes) => {
    setDialogMode("edit");
    setIsDialogOpen(true);

    setCurrentAttribute(attribute);

    // Normalizar el tipo a minúsculas para que coincida con el enum
    const normalizedType = attribute.type?.toLowerCase() || attribute.type;
    // Asegurar que el tipo coincida con uno de los valores del enum
    const validType = typesArray.includes(normalizedType as CategoryAttributesTypes)
      ? normalizedType
      : (attribute.type?.toLowerCase() === "number" || attribute.type?.toLowerCase() === "numeric"
        ? CategoryAttributesTypes.NUMERIC
        : attribute.type?.toLowerCase() === "boolean"
          ? CategoryAttributesTypes.BOOLEAN
          : attribute.type?.toLowerCase() === "date"
            ? CategoryAttributesTypes.DATE
            : CategoryAttributesTypes.STRING);

    const a = attribute as CategoryAttributeApi;

    setAttributeForm({
      name: a.name,
      csv_name: a.csv_name ?? a.csvName ?? "",
      display_name: a.display_name ?? a.displayName ?? a.name,
      type: validType,
      required: attribute.required ?? false,
      order: attribute.order ?? 0,
      scope: attribute.scope as AttributeScope | undefined,
      visibleInCatalog: attribute.visibleInCatalog ?? true,
      visibleInProductDetail: attribute.visibleInProductDetail ?? true,
    });
  };

  const reorderAttributesInForm = (
    scope: "PRODUCT" | "VARIANT" | "APPLICATION",
    orderedForScope: CategoryAtributes[]
  ) => {
    const reindexed = orderedForScope.map((attr, index) => ({ ...attr, order: index }));
    setForm((prev) => {
      const pickScope = (s: "PRODUCT" | "VARIANT" | "APPLICATION") =>
        s === scope
          ? reindexed
          : prev.attributes
              .filter((a) => a.scope === s)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return {
        ...prev,
        attributes: [
          ...pickScope("PRODUCT"),
          ...pickScope("VARIANT"),
          ...pickScope("APPLICATION"),
        ],
      };
    });
    setAttributes((prev) => ({
      ...prev,
      ...(scope === "PRODUCT"
        ? { productAttributes: reindexed }
        : scope === "VARIANT"
          ? { variantAttributes: reindexed }
          : { applicationAttributes: reindexed }),
    }));
  };

  const handleDeleteClick = (name: string) => {
    let tempList: CategoryAtributes[] = [];
    if (type === AttributeScope.PRODUCT) {
      tempList = attributes.productAttributes.filter((attribute: CategoryAtributes) =>
        attribute.name !== name && attribute.display_name !== name
      );
      setAttributes({
        ...attributes,
        productAttributes: tempList,
      });
    } else if (type === "VARIANT") {
      tempList = attributes.variantAttributes.filter((attribute: CategoryAtributes) =>
        attribute.name !== name && attribute.display_name !== name
      );
      setAttributes({
        ...attributes,
        variantAttributes: tempList,
      });
    } else if (type === "APPLICATION") {
      tempList = attributes.applicationAttributes.filter((attribute: CategoryAtributes) =>
        attribute.name !== name && attribute.display_name !== name
      );
      setAttributes({
        ...attributes,
        applicationAttributes: tempList,
      });
    }

    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.filter((attr) =>
        attr.name !== name && attr.display_name !== name
      ),
    }));
  };

  const handleSubmit = () => {
    let order = 0;
    if (type === "PRODUCT") {
      order = attributes.productAttributes.length;
    } else if (type === "VARIANT") {
      order = attributes.variantAttributes.length;
    } else if (type === "APPLICATION") {
      order = attributes.applicationAttributes.length;
    }

    const finalDisplayName = attributeForm.display_name || attributeForm.name;
    const finalCsvName = attributeForm.csv_name?.trim() || "";

    const payload: CategoryAtributes = {
      ...attributeForm,
      name:
        dialogMode === "add"
          ? finalDisplayName
          : (currentAttribute?.name ?? finalDisplayName),
      csv_name: finalCsvName,
      display_name: finalDisplayName,
      required: attributeForm.required ?? false,
      type: attributeForm.type as CategoryAttributesTypes,
      scope: (dialogMode === "add" ? type : (attributeForm.scope ?? currentAttribute?.scope ?? type)) as "PRODUCT" | "VARIANT" | "APPLICATION",
      order: dialogMode === "add" ? order : (attributeForm.order ?? currentAttribute?.order ?? 0),
      visibleInCatalog: attributeForm.visibleInCatalog ?? true,
      visibleInProductDetail: attributeForm.visibleInProductDetail ?? true,
      ...(dialogMode === "edit" && currentAttribute?.id ? { id: currentAttribute.id } : {}),
    };

    if (dialogMode === "add") {
      // Adding a new attribute
      setForm((prev) => ({
        ...prev,
        attributes: [...prev.attributes, payload],
      }));

      setAttributes((prev) => ({
        ...prev,
        ...(type === "PRODUCT"
          ? { productAttributes: [...prev.productAttributes, payload] }
          : type === "VARIANT"
            ? { variantAttributes: [...prev.variantAttributes, payload] }
            : { applicationAttributes: [...prev.applicationAttributes, payload] }),
      }));
    } else if (dialogMode === "edit") {
      // Al editar, buscar por id si existe, sino por name
      const matchAttribute = (attr: CategoryAtributes) => {
        if (currentAttribute?.id && attr.id) {
          return attr.id === currentAttribute.id;
        }
        return attr.name === currentAttribute?.name ||
          (attr.display_name && attr.display_name === currentAttribute?.display_name) ||
          (attr.display_name && attr.display_name === currentAttribute?.name);
      };

      setForm((prev) => ({
        ...prev,
        attributes: prev.attributes.map((attr) =>
          matchAttribute(attr) ? payload : attr
        ),
      }));

      setAttributes((prev) => ({
        ...prev,
        ...(type === "PRODUCT"
          ? {
            productAttributes: prev.productAttributes.map((attr) =>
              matchAttribute(attr) ? payload : attr
            ),
          }
          : type === "VARIANT"
            ? {
              variantAttributes: prev.variantAttributes.map((attr) =>
                matchAttribute(attr) ? payload : attr
              ),
            }
            : {
              applicationAttributes: prev.applicationAttributes.map((attr) =>
                matchAttribute(attr) ? payload : attr
              ),
            }),
      }));
    }

    setIsDialogOpen(false);
    setCurrentAttribute(null);
  };

  useEffect(() => {
    if (!isDialogOpen) {
      setAttributeForm(AttributeFormInitialState);
    }
  }, [isDialogOpen]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{title}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {title === "Atributos de Producto"
                    ? "Este campo es la plantilla para productos de la categoría que estás creando. Los atributos definidos aquí se aplicarán a todos los productos de esta categoría."
                    : title === "Atributos de Variantes"
                      ? "Este campo es la plantilla para variantes de la categoría que estás creando. Los atributos definidos aquí se aplicarán a las variantes de los productos de esta categoría."
                      : "Este campo es la plantilla para aplicaciones de la categoría que estás creando. Los atributos definidos aquí se aplicarán a las aplicaciones de los productos de esta categoría."}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {type === "PRODUCT" ? (
          <CardAttributeTable
            handleEditClick={handleEditClick}
            title={title}
            attributes={attributes.productAttributes}
            handleDeleteClick={handleDeleteClick}
            onReorder={(ordered) => reorderAttributesInForm("PRODUCT", ordered)}
          />
        ) : type === "VARIANT" ? (
          <CardAttributeTable
            handleEditClick={handleEditClick}
            title={title}
            attributes={attributes.variantAttributes}
            handleDeleteClick={handleDeleteClick}
            onReorder={(ordered) => reorderAttributesInForm("VARIANT", ordered)}
          />
        ) : (
          <CardAttributeTable
            handleEditClick={handleEditClick}
            title={title}
            attributes={attributes.applicationAttributes}
            handleDeleteClick={handleDeleteClick}
            onReorder={(ordered) => reorderAttributesInForm("APPLICATION", ordered)}
          />
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-center gap-2 border-t p-4">
        {/* Campos predefinidos */}
        {type === "PRODUCT" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => handleAddPredefinedField("Sistema", "string", "sistema")}
              disabled={attributes.productAttributes.length >= 20 || attributes.productAttributes.some(a => a.name === "Sistema" || a.display_name === "Sistema")}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Sistema
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => handleAddPredefinedField("Tipo", "string", "tipo")}
              disabled={attributes.productAttributes.length >= 20 || attributes.productAttributes.some(a => a.name === "Tipo" || a.display_name === "Tipo")}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Tipo
            </Button>
          </>
        )}
        {type === "VARIANT" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => handleAddPredefinedField("Color", "string", "color")}
              disabled={attributes.variantAttributes.length >= 20 || attributes.variantAttributes.some(a => a.name === "Color" || a.display_name === "Color")}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Color
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => handleAddPredefinedField("Tamaño", "string", "tamaño")}
              disabled={attributes.variantAttributes.length >= 20 || attributes.variantAttributes.some(a => a.name === "Tamaño" || a.display_name === "Tamaño")}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Tamaño
            </Button>
          </>
        )}
        {type === "APPLICATION" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => handleAddPredefinedField("Fabricante", "string", "fabricante")}
              disabled={attributes.applicationAttributes.length >= 20 || attributes.applicationAttributes.some(a => a.name === "Modelo" || a.display_name === "Modelo")}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Fabricante
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => handleAddPredefinedField("Modelo", "string", "modelo")}
              disabled={attributes.applicationAttributes.length >= 20 || attributes.applicationAttributes.some(a => a.name === "Modelo" || a.display_name === "Modelo")}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Modelo
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => handleAddPredefinedField("Submodelo", "string", "submodelo")}
              disabled={attributes.applicationAttributes.length >= 20 || attributes.applicationAttributes.some(a => a.name === "Submodelo" || a.display_name === "Submodelo")}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Submodelo
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => handleAddPredefinedField("Año", "date", "año")}
              disabled={attributes.applicationAttributes.length >= 20 || attributes.applicationAttributes.some(a => a.name === "Año" || a.display_name === "Año")}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Año
            </Button>
          </>
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <>
              {title === "Atributos de Producto" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                  onClick={handleAddClick}
                  disabled={attributes.productAttributes.length >= 20}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Agregar Atributos de Producto
                </Button>
              )}
              {title === "Atributos de Variantes" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                  onClick={handleAddClick}
                  disabled={attributes.variantAttributes.length >= 20}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Agregar Atributos de Variantes
                </Button>
              )}
              {title === "Atributos de Aplicaciones" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                  onClick={handleAddClick}
                  disabled={attributes.applicationAttributes.length >= 20}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Agregar Atributos de Aplicaciones
                </Button>
              )}
            </>
          </DialogTrigger>
          <DialogContent className="w-[90%] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="mb-2">
                {dialogMode === "edit"
                  ? title === "Atributos de Producto"
                    ? "Editar Atributo de Producto"
                    : title === "Atributos de Variantes"
                      ? "Editar Atributo de Variante"
                      : "Editar Atributo de Aplicación"
                  : title === "Atributos de Producto"
                    ? "Agregar Atributo de Producto"
                    : title === "Atributos de Variantes"
                      ? "Agregar Atributo de Variante"
                      : "Agregar Atributo de Aplicación"}
              </DialogTitle>
              <DialogDescription>
                {dialogMode === "edit"
                  ? title === "Atributos de Producto"
                    ? "Editar un atributo de producto existente."
                    : title === "Atributos de Variantes"
                      ? "Editar un atributo de variante existente."
                      : "Editar un atributo de aplicación existente."
                  : title === "Atributos de Producto"
                    ? "Agregar un nuevo atributo de producto al sistema."
                    : title === "Atributos de Variantes"
                      ? "Agregar un nuevo atributo de variante al sistema."
                      : "Agregar un nuevo atributo de aplicación al sistema."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Label htmlFor="display_name">
                Nombre para Mostrar<span className="text-redLabel">*</span>
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>El nombre del atributo que se mostrará a los usuarios en el sistema (ej: "Modelo", "Año", "Color")</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="display_name"
              name="display_name"
              type="text"
              placeholder="ej. Modelo, Año, Color"
              value={attributeForm.display_name || ""}
              onChange={(e) => {
                const value = e.target.value;
                if (dialogMode === "edit") {
                  setAttributeForm({
                    ...attributeForm,
                    display_name: value,
                  });
                } else {
                  setAttributeForm({
                    ...attributeForm,
                    display_name: value,
                    name: value,
                  });
                }
              }}
              required
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="csv_name">
                Nombre CSV<span className="text-redLabel">*</span>
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>El nombre que se usará para mapear este atributo cuando se importen datos desde un CSV. Debe ser único y sin espacios ni acentos (ej: modelo, año, color)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="csv_name"
              name="csv_name"
              type="text"
              placeholder="ej. modelo, año, color (sin espacios ni acentos)"
              value={attributeForm.csv_name || ""}
              onChange={handleAttributeForm}
              required
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="data-type">
                Tipo de Dato<span className="text-redLabel">*</span>
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>El tipo de dato que almacenará este atributo: Texto (para nombres, descripciones), Número (para valores numéricos), Fecha (para fechas), o Verdadero/Falso (para valores booleanos)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={attributeForm.type}
              onValueChange={(value) =>
                setAttributeForm({
                  ...attributeForm,
                  type: value,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona tipo de dato" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Tipos de Datos</SelectLabel>
                  {typesArray.map((type) => (
                    <SelectItem key={type} value={type}>
                      {typeDisplayNames[type as CategoryAttributesTypes] || type}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label>
                Requerido<span className="text-redLabel">*</span>
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Si el atributo es opcional, los productos/variantes/aplicaciones pueden no tener este valor. Si es requerido, debe tener un valor siempre</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <RadioGroup
              value={
                attributeForm.required === null
                  ? ""
                  : attributeForm.required == true
                    ? "true"
                    : "false"
              }
              onValueChange={(value) =>
                setAttributeForm({
                  ...attributeForm,
                  required: value === "true" ? true : false,
                })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="r1" />
                <Label htmlFor="r1">Sí</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="r2" />
                <Label htmlFor="r2">No</Label>
              </div>
            </RadioGroup>

            {title === "Atributos de Producto" && (
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-sm font-medium">Visibilidad en catálogo</p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="visibleInCatalog"
                    checked={attributeForm.visibleInCatalog ?? true}
                    onCheckedChange={(checked) =>
                      setAttributeForm({
                        ...attributeForm,
                        visibleInCatalog: checked === true,
                      })
                    }
                  />
                  <Label htmlFor="visibleInCatalog" className="cursor-pointer font-normal">
                    Mostrar en grid del catálogo
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="visibleInProductDetail"
                    checked={attributeForm.visibleInProductDetail ?? true}
                    onCheckedChange={(checked) =>
                      setAttributeForm({
                        ...attributeForm,
                        visibleInProductDetail: checked === true,
                      })
                    }
                  />
                  <Label htmlFor="visibleInProductDetail" className="cursor-pointer font-normal">
                    Mostrar en detalle de producto
                  </Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                disabled={
                  !validateForm ||
                  (type === "PRODUCT" && attributes.productAttributes.length >= 20) ||
                  (type === "VARIANT" && attributes.variantAttributes.length >= 20) ||
                  (type === "APPLICATION" && attributes.applicationAttributes.length >= 20)
                }
                type="submit"
                onClick={handleSubmit}
              >
                {dialogMode === "edit" ? "Guardar Cambios" : "Agregar Atributo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
};

export default CardAtributesVariants;
