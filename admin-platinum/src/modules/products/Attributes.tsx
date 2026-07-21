import { useMemo, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Product } from "@/models/product";
import DynamicComponent from "@/components/DynamicComponent";
import { CategoryAtributes } from "@/models/category";
import { useCategoryContext } from "@/context/categories-context";
import { translateAttributeName } from "@/utils/attributeTranslations";

type AttributesProps = {
  setCanContinue: React.Dispatch<React.SetStateAction<boolean>>;
  product?: Product | null;
  categoryId?: string;
  attributesState: any;
  setAttributesState: React.Dispatch<React.SetStateAction<any>>;
  embedded?: boolean;
};

const Attributes = ({
  setCanContinue,
  categoryId,
  attributesState,
  setAttributesState,
  embedded = false,
}: AttributesProps) => {
  const { categories } = useCategoryContext();

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId);
  }, [categories, categoryId]);

  // Helper to get product attributes from category
  const getProductAttributes = useMemo(() => {
    if (!selectedCategory?.attributes) return [];

    let attrs: CategoryAtributes[] = [];
    if (Array.isArray(selectedCategory.attributes)) {
      attrs = selectedCategory.attributes.filter((attr) => attr.scope === "PRODUCT");
    } else if (
      typeof selectedCategory.attributes === "object" &&
      "product" in selectedCategory.attributes
    ) {
      attrs = (selectedCategory.attributes as { product: CategoryAtributes[] }).product || [];
    }

    return attrs;
  }, [selectedCategory]);

  const handleAttributeChange = (name: string, value: any) => {
    setAttributesState((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Validation logic
  useEffect(() => {
    const productAttributes = getProductAttributes;
    if (!productAttributes.length) {
      setCanContinue(true); // No attributes to fill
      return;
    }

    const isValid = productAttributes.every((attr: CategoryAtributes) => {
      if (attr.required) {
        return (
          attributesState[attr.name] !== undefined &&
          attributesState[attr.name] !== ""
        );
      }
      return true;
    });

    setCanContinue(isValid);
  }, [attributesState, getProductAttributes, setCanContinue]);

  if (!categoryId) {
    if (embedded) return null;
    return (
      <Card className="w-full flex flex-col">
        <CardContent className="py-10 text-center">
          <p>Por favor selecciona una categoría en el paso anterior.</p>
        </CardContent>
      </Card>
    );
  }

  const fields = (
    <>
      {getProductAttributes.map((attribute: CategoryAtributes) => (
        <div key={attribute.id} className="basis-full sm:basis-[48%]">
          <Label className="mb-2 block">
            {attribute.required && <span className="text-red-500 mr-1">*</span>}
            {translateAttributeName(attribute.name, false)}
          </Label>
          <DynamicComponent
            type={attribute.type}
            name={attribute.name}
            required={attribute.required}
            value={attributesState[attribute.name] || ""}
            onChange={(value) => handleAttributeChange(attribute.name, value)}
          />
        </div>
      ))}
      {getProductAttributes.length === 0 && (
        <p className="text-muted-foreground w-full text-center">
          Esta categoría no tiene atributos definidos.
        </p>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">
            Atributos{selectedCategory?.name ? `: ${selectedCategory.name}` : ""}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ingrese los atributos asociados a la categoría
          </p>
        </div>
        <div className="flex flex-wrap justify-between gap-4">{fields}</div>
      </div>
    );
  }

  return (
    <Card className="w-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Atributos de Categoría: {selectedCategory?.name}</CardTitle>
        <CardDescription>
          Ingrese los atributos asociados a la categoría
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap justify-between gap-4">
        {fields}
      </CardContent>
    </Card>
  );
};
export default Attributes;
