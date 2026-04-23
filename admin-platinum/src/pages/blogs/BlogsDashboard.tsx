import { PlusCircle, Search } from "lucide-react";
import Layout from "@/components/Layouts/Layout";
import CardSectionLayout from "@/components/Layouts/CardSectionLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { newsContext } from "@/context/news-context";
import { BlogPost } from "@/models/news";
import CardBlogPost from "@/components/CardBlogPost";
import NoData from "@/components/NoData";
import { useMemo, useState, useEffect } from "react";

const BlogsDashboard = () => {
  const { blogPosts, loading, deleteBlogPost, getBlogPosts } = newsContext();
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    getBlogPosts().catch(() => {});
  }, []);

  const filteredBlogs = useMemo(
    () =>
      blogPosts.filter((post: BlogPost) =>
        post.title.toLowerCase().includes(searchFilter.toLowerCase())
      ),
    [searchFilter, blogPosts]
  );

  const listToShow = searchFilter.length > 0 ? filteredBlogs : blogPosts;

  return (
    <Layout>
      <Card className="border-0 shadow-none">
        <CardHeader className="flex flex-row flex-wrap items-start gap-4 p-0 m-0">
          <div className="flex flex-col gap-3">
            <CardTitle>Blogs</CardTitle>
            <CardDescription>
              Gestiona el contenido publicado y sus vínculos relacionados.
            </CardDescription>
          </div>
          <div className="ml-auto flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-[336px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar blog..."
                onChange={(e) => setSearchFilter(e.target.value)}
                value={searchFilter}
                className="w-full rounded-lg bg-background pl-8"
              />
            </div>
            <Link to="/dashboard/blogs/nueva">
              <Button size="sm" className="h-10 px-6 gap-1">
                <PlusCircle className="h-3.5 w-3.5 mr-2" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Crear blog
                </span>
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          {!loading && (
            <div className="mb-3 text-sm text-muted-foreground">
              {listToShow.length} {listToShow.length === 1 ? "blog encontrado" : "blogs encontrados"}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando...</p>
              </div>
            </div>
          ) : listToShow.length === 0 ? (
            <NoData>
              <p className="text-muted-foreground">No hay blogs disponibles.</p>
            </NoData>
          ) : (
            <CardSectionLayout>
              {listToShow.map((blogPost: BlogPost) => (
                <CardBlogPost
                  key={blogPost.id}
                  blogPost={blogPost}
                  deleteItem={deleteBlogPost}
                  editPath="/dashboard/blogs/editar"
                />
              ))}
            </CardSectionLayout>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default BlogsDashboard;
