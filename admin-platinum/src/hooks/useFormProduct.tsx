import { Category } from "@/models/category";
import { Reference } from "@/models/reference";
import { Application } from "@/models/application";
import { useState, useMemo } from "react";

export interface detailsType {
  id?: string | null;
  name: string;
  sku: string;
  brand: string;
  type: "SINGLE" | "KIT" | null;
  description: string;
  category: Pick<Category, "id" | "name"> | null;
  subcategory: { id: string; name: string } | null;
  references: string[];
  imgUrl?: string;
  visibleInCatalog: boolean;
}

export const stateSkeleton = {
  name: "",
  sku: "",
  brand: "",
  type: null,
  description: "",
  category: null,
  subcategory: null,
  references: [],
  imgUrl: "",
  visibleInCatalog: true,
};

export const useFormState = () => {
  const [detailsState, setDetailsState] = useState<detailsType>(stateSkeleton);
  const [attributesState, setAttributesState] = useState<any>({});
  const [referencesState, setReferencesState] = useState({
    references: [] as Reference[],
  });
  const [applicationsState, setApplicationsState] = useState({
    applications: [] as Application[],
  });

  const [canContinue, setCanContinue] = useState(false);

  const isDetailsValid = useMemo(() => {
    return (
      detailsState.name && detailsState.description && detailsState.category
    );
  }, [detailsState]);

  const isReferencesValid = useMemo(() => {
    return referencesState.references.length > 0;
  }, [referencesState]);

  useMemo(() => {
    {
      isDetailsValid &&
        // referencesState.references.length > 0 && // Maybe not required for Step 1?
        setCanContinue(true);
    }
  }, [isDetailsValid, isReferencesValid]);

  return {
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
  };
};
