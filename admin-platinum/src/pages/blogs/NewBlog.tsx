import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layouts/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { newsContext } from "@/context/news-context";
import { useS3FileManager } from "@/hooks/useS3FileManager";
import MyDropzone from "@/components/Dropzone";
import MarkdownEditor from "@/components/blogs/MarkdownEditor";

const stripHtmlTags = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const NewBlog = () => {
  const navigate = useNavigate();
  const { addBlogPost } = newsContext();
  const { uploadFile } = useS3FileManager();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasDescriptionContent = stripHtmlTags(description) !== "";
  const hasMainContent = stripHtmlTags(content) !== "";

  const canSubmit =
    title.trim() !== "" &&
    hasDescriptionContent &&
    hasMainContent &&
    coverImage != null;

  const handleSubmit = async () => {
    if (!canSubmit || !coverImage) return;
    setSubmitting(true);
    try {
      await new Promise<void>((resolve, reject) => {
        uploadFile(coverImage, (key) => {
          addBlogPost({
            title,
            description,
            content,
            coverImagePath: key,
          });
          resolve();
        }).catch(reject);
      });
      navigate("/dashboard/blogs");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="w-full flex justify-center px-4">
        <Card className="max-w-4xl w-full">
        <CardHeader className="flex flex-row flex-wrap items-center gap-4">
          <Link
            to="/dashboard/blogs"
            className="rounded-lg p-2 border hover:bg-muted inline-flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <CardTitle>Nuevo blog</CardTitle>
            <CardDescription>
              Escribe el contenido con el editor enriquecido de TipTap.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">
              <span className="text-red-500">*</span> Título
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del blog"
              maxLength={255}
            />
          </div>

          <MarkdownEditor
            label="Descripción"
            value={description}
            onChange={setDescription}
            placeholder="Escribe una descripción corta del blog."
            minHeight="120px"
          />

          <div className="space-y-2">
            <Label>
              <span className="text-red-500">*</span> Imagen de portada
            </Label>
            <MyDropzone
              className="p-8"
              file={coverImage}
              fileSetter={setCoverImage}
            />
          </div>

          <MarkdownEditor
            label="Contenido del blog"
            value={content}
            onChange={setContent}
            placeholder="Escribe el contenido del blog. Usa la barra de herramientas para títulos, listas, enlaces, etc."
            minHeight="280px"
          />

          <div className="flex gap-3 pt-4">
            <Link to="/dashboard/blogs">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Guardando..." : "Publicar blog"}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
};

export default NewBlog;
