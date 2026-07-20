import { Link } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layouts/Layout";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import ImportJobsDashboard from "@/components/importJobs/ImportJobsDashboard";
import { useImportContext } from "@/context/import-context";

const ImportJobsDashboardPage = () => {
  const { showBanner } = useImportContext();

  useEffect(() => {
    showBanner();
  }, [showBanner]);

  return (
    <Layout>
      <ImportJobsDashboard
        headerActions={
          <Link to="/dashboard/producto/importar" className="flex flex-1 lg:flex-none">
            <Button size="sm" className="h-10 px-6 gap-1 w-full lg:w-auto">
              <Upload className="h-3.5 w-3.5 mr-2" />
              Nueva Importación
            </Button>
          </Link>
        }
      />
    </Layout>
  );
};

export default ImportJobsDashboardPage;

