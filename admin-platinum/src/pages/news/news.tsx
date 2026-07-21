import { AlertTriangle, PlusCircle, Search } from "lucide-react";

import Layout from "@/components/Layouts/Layout";
import CardSectionLayout from "@/components/Layouts/CardSectionLayout";

import DashboardPageShell from "@/components/Layouts/DashboardPageShell";
import { Input } from "@/components/ui/input";
import { BlogPost } from "@/models/news";
import CardBlogPost from "@/components/CardBlogPost";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { newsContext } from "@/context/news-context";
import NoData from "@/components/NoData";
import { useMemo, useState } from "react";

const News = () => {
  const { blogPosts, loading, deleteBlogPost } = newsContext();

  const [searchFilter, setSearchFilter] = useState("");

  const filteredBlogPosts = useMemo(
    () =>
      blogPosts.filter((blogPost: BlogPost) =>
        blogPost.title.toLowerCase().includes(searchFilter.toLowerCase())
      ),
    [searchFilter, blogPosts]
  );

  const handleSearchFilter = (e: any) => {
    setSearchFilter(e.target.value);
  };

  return (
    <Layout>
      <DashboardPageShell
        title="Noticias"
        description="Maneja tus noticias creadas en la aplicación"
        filters={
          <>
            <div className="relative flex-1 md:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar Noticia..."
                onChange={handleSearchFilter}
                value={searchFilter}
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
              />
            </div>
            <Link to="/dashboard/noticias/nueva" className="shrink-0">
              <Button size="sm" className="h-10 px-6 gap-1">
                <PlusCircle className="h-3.5 w-3.5 sm:mr-2" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Agregar Noticia
                </span>
              </Button>
            </Link>
          </>
        }
      >
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando...</p>
              </div>
            </div>
          ) : filteredBlogPosts.length === 0 ? (
            <div className="mt-4">
              <NoData>
                <AlertTriangle className="text-[#4E5154]" />
                <p className="text-[#4E5154]">
                  No se ha creado encontrado ninguna noticia
                </p>
                <p className="text-[#94A3B8] font-semibold text-sm">
                  Agrega uno en la parte posterior
                </p>
              </NoData>
            </div>
          ) : (
            <CardSectionLayout>
              {(filteredBlogPosts.length > 0
                ? filteredBlogPosts
                : blogPosts
              ).map((blogPost: BlogPost) => (
                <CardBlogPost
                  key={blogPost.id}
                  blogPost={blogPost}
                  deleteItem={deleteBlogPost}
                />
              ))}
            </CardSectionLayout>
          )}
      </DashboardPageShell>
    </Layout>
  );
};

export default News;
