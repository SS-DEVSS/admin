import DetailsCard from "@/components/products/DetailsCard";
import ReferencesCard from "@/components/products/ReferencesCard";
import ApplicationsCard from "@/components/products/ApplicationsCard";
import Attributes from "@/modules/products/Attributes";
import { detailsType } from "@/hooks/useFormProduct";
import { Reference } from "@/models/reference";
import { Application } from "@/models/application";
import { Product } from "@/models/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import ProductTechnicalSheetsCard from "@/components/products/ProductTechnicalSheetsCard";

type DetailsInterface = {
  detailsState: detailsType;
  setDetailsState: React.Dispatch<React.SetStateAction<detailsType>>;
  referencesState: {
    references: Reference[];
  };
  setReferencesState: React.Dispatch<
    React.SetStateAction<{ references: Reference[] }>
  >;
  applicationsState: {
    applications: Application[];
  };
  setApplicationsState: React.Dispatch<
    React.SetStateAction<{ applications: Application[] }>
  >;
  product?: Product | null;
  attributesState?: any;
  setAttributesState?: React.Dispatch<React.SetStateAction<any>>;
  setCanContinue?: React.Dispatch<React.SetStateAction<boolean>>;
};
const Details = ({
  detailsState,
  setDetailsState,
  referencesState,
  setReferencesState,
  applicationsState,
  setApplicationsState,
  product,
  attributesState,
  setAttributesState,
  setCanContinue,
}: DetailsInterface) => {
  const isEditMode = !!product;

  return (
    <section className="flex flex-col gap-3 w-full">
      <DetailsCard state={detailsState} setState={setDetailsState} product={product} />
      
      {attributesState && setAttributesState && setCanContinue && (
        <Attributes
          setCanContinue={setCanContinue}
          categoryId={typeof detailsState.category === 'string' ? detailsState.category : detailsState.category?.id || undefined}
          attributesState={attributesState}
          setAttributesState={setAttributesState}
        />
      )}
      
      {isEditMode ? (
        <>
          <ReferencesCard state={referencesState} setState={setReferencesState} product={product} />
          <ApplicationsCard state={applicationsState} setState={setApplicationsState} product={product} />
          <ProductTechnicalSheetsCard productId={product?.id} />
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Referencias
              </CardTitle>
              <CardDescription>
                Las referencias se deben importar después de crear el producto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Una vez que hayas creado el producto, podrás importar las referencias desde la sección de importación de referencias.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Aplicaciones
              </CardTitle>
              <CardDescription>
                Las aplicaciones se deben importar después de crear el producto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Una vez que hayas creado el producto, podrás importar las aplicaciones desde la sección de importación de aplicaciones.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
};

export default Details;
