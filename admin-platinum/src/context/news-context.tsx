import { createContext, useContext, useState, useEffect } from "react";
import { BlogPost } from "@/models/news";
import axiosClient from "@/services/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "./auth-context";

interface NewsContextType {
  blogPosts: BlogPost[];
  blogPost: BlogPost | null;
  loading: boolean;
  errorMsg: string;
  addBlogPost: (blogPost: BlogPost) => Promise<void>;
  getBlogPosts: () => Promise<void>;
  getBlogPostById: (id: BlogPost["id"]) => Promise<BlogPost | void>;
  deleteBlogPost: (id: BlogPost["id"]) => Promise<void>;
  updateBlogPost: (id: BlogPost["id"], payload: Partial<BlogPost>) => Promise<boolean>;
}

const NewsContext = createContext<NewsContextType>({} as NewsContextType);

export const newsContext = () => useContext(NewsContext);

export const NewsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const client = axiosClient();
  const { toast } = useToast();
  const { authState } = useAuthContext();

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Start with true to show loader initially
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Only fetch if user is authenticated
    if (authState.isAuthenticated && !authState.loading) {
      getBlogPosts();
    } else if (!authState.loading) {
      // If not authenticated and not loading, clear data
      setBlogPosts([]);
      setLoading(false);
    }
  }, [authState.isAuthenticated, authState.loading]);

  const addBlogPost = async (blogPost: BlogPost) => {
    try {
      setLoading(true);
      await client.post("/blog/posts", blogPost, {
        headers: { "Content-Type": "application/json" },
      });
      await getBlogPosts();
      toast({ title: "Noticia creada correctamente.", variant: "success" });
    } catch (error: any) {
      setErrorMsg(error.response.data.error);
      toast({
        title: "Error al crear noticia",
        variant: "destructive",
        description: errorMsg,
      });
    } finally {
      setLoading(false);
      setErrorMsg("");
    }
  };

  const getBlogPosts = async () => {
    try {
      setLoading(true);
      const data = await client.get("/blog/posts");
      setBlogPosts(data.data?.blogPosts ?? []);
    } catch (error) {
      console.error("Error fetching blogPosts:", error);
      setBlogPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const getBlogPostById = async (id: BlogPost["id"]) => {
    try {
      setLoading(true);
      const data = await client.get(`/blog/posts/${id}`);
      setBlogPost(data.data);
      return data.data;
    } catch (error) {
      console.error("Error fetching blog post:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBlogPost = async (id: BlogPost["id"]) => {
    try {
      setLoading(true);
      await client.delete(`/blog/posts/${id}`);
      await getBlogPosts();
      toast({ title: "Noticia eliminada correctamente.", variant: "success" });
    } catch (error: any) {
      setErrorMsg(error.response.data.error);
      toast({
        title: "Error al eliminar noticia",
        variant: "destructive",
        description: errorMsg,
      });
    } finally {
      setLoading(false);
      setErrorMsg("");
    }
  };

  const updateBlogPost = async (id: BlogPost["id"], payload: Partial<BlogPost>) => {
    try {
      setLoading(true);
      await client.patch(`/blog/posts/${id}`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      await getBlogPosts();
      toast({ title: "Blog actualizado correctamente.", variant: "success" });
      return true;
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || "Error al actualizar blog");
      toast({
        title: "Error al actualizar blog",
        variant: "destructive",
        description: error.response?.data?.error || "No se pudo actualizar el blog",
      });
      return false;
    } finally {
      setLoading(false);
      setErrorMsg("");
    }
  };

  return (
    <NewsContext.Provider
      value={{
        blogPosts,
        blogPost,
        loading,
        errorMsg,
        addBlogPost,
        getBlogPosts,
        getBlogPostById,
        deleteBlogPost,
        updateBlogPost,
      }}
    >
      {children}
    </NewsContext.Provider>
  );
};

// export const useNewsContext = (): NewsContextType => {
//   const context = useContext(NewsContext);
//   if (!context) {
//     throw new Error("useNewsContext must be used within a NewsProvider");
//   }
//   return context;
// };
