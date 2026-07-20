import { v4 as uuidv4 } from "uuid";
import { Link, useNavigate } from "react-router-dom";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layouts/Layout";
import { ChevronDown, ChevronLeft, PlusCircle, SquarePlus } from "lucide-react";
import { BlogPost } from "@/models/news";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import NewsComponent from "@/components/NewsComponent";
import { newsContext } from "@/context/news-context";
import MyDropzone from "@/components/Dropzone";
import { useS3FileManager } from "@/hooks/useS3FileManager";

type BlogPostCUProps = {
  blogPost?: BlogPost | null;
};

interface FormTypes {
  title: string;
  description: string;
  coverImagePath: string;
  content: string;
}
const FormInitialState = {
  title: "",
  description: "",
  coverImagePath: "",
  content: "",
};

enum ComponentTypes {
  NONE = "",
  TITLE = "h1",
  SUBTITLE = "h3",
  PARAGRAPH = "p",
  IMAGE = "img",
}

export interface Component {
  id?: string;
  type: ComponentTypes;
  title: string;
  content: string;
}

const BlogPostCU = ({ blogPost }: BlogPostCUProps) => {
  const { addBlogPost } = newsContext();
  const navigate = useNavigate();
  const { uploadFile } = useS3FileManager();

  const [form, setForm] = useState<FormTypes>(FormInitialState);
  const [image, setImage] = useState<File | null>(null);
  const [components, setComponents] = useState<Component[]>([]);

  useEffect(() => {
    if (blogPost) {
      setForm(blogPost);
      setImage({ name: blogPost.coverImagePath } as File);
      const parsedComponents = parseContentToComponents(blogPost.content);
      setComponents(parsedComponents);
    }
  }, [blogPost]);

  useEffect(() => {
    if (image?.name && image.name !== form.coverImagePath) {
      setForm((prevForm) => ({
        ...prevForm,
        coverImagePath: image.name,
      }));
    }
  }, [image]);

  const handleFormInput = (e: any) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });
  };

  const validateForm = useMemo(
    () =>
      form.title.trim() !== "" &&
      form.description.trim() !== "" &&
      components.length > 0 &&
      components.every((component: Component) => component.content !== ""),
    [form, components]
  );

  const handleSubmit = async () => {
    if (!image) return;
    
    let contentString = "";
    components.forEach((component) => {
      contentString += `<${component.type}>${component.content}</${component.type}>`;
    });

    const updatedForm = { ...form, content: contentString };

    uploadFile(image, (key) => {
      addBlogPost({ ...updatedForm, coverImagePath: key });
      navigate("/dashboard/noticias");
    });
  };

  const returnComponent = async (selectedComponent: ComponentTypes) => {
    let type: ComponentTypes = ComponentTypes.NONE;
    let title = "";
    switch (selectedComponent) {
      case "h1":
        type = ComponentTypes.TITLE;
        title = "Título";
        break;
      case "h3":
        type = ComponentTypes.SUBTITLE;
        title = "Sub Título";
        break;
      case "p":
        type = ComponentTypes.PARAGRAPH;
        title = "Párrafo";
        break;
    }

    const newComponent = {
      id: uuidv4(),
      type,
      title,
      content: "",
    };

    setComponents((prevComponents) => [...prevComponents, newComponent]);
  };

  const parseContentToComponents = (contentString: string): Component[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(contentString, "text/html");
    const nodes = Array.from(doc.body.childNodes);

    return nodes.map((node) => {
      const type = node.nodeName.toLowerCase() as ComponentTypes;
      const content = node.textContent || "";
      return {
        id: uuidv4(),
        type,
        title:
          type === "h1" ? "Título" : type === "h3" ? "Sub Título" : "Párrafo",
        content,
      };
    });
  };

  return (
    <Layout>
      <section className="max-w-[1000px] mx-auto">
        <header className="flex justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard/noticias">
              <Card className="p-2">
                <ChevronLeft className="h-4 w-4" />
              </Card>
            </Link>
            <p className="text-2xl font-semibold leading-none tracking-tight">
              {blogPost ? `${blogPost.title}` : "Nueva Noticia"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard/noticias">
              <Button variant={"outline"}>Cancelar</Button>
            </Link>
            {!blogPost ? (
              <Button
                size="sm"
                disabled={!validateForm}
                className="h-10 px-6 gap-1"
                onClick={handleSubmit}
              >
                <PlusCircle className="h-3.5 w-3.5 sm:mr-2" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Agregar Noticia
                </span>
              </Button>
            ) : (
              <Button disabled size="sm" className="h-10 px-6 gap-1">
                Actualizar Noticia
              </Button>
            )}
          </div>
        </header>
        <Card x-chunk="dashboard-07-chunk-0" className="mt-4">
          <CardHeader>
            <CardTitle>Detalles de la Noticia</CardTitle>
            <CardDescription>
              Ingrese los detalles de la noticia que desea crear.{" "}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="title">
                  <span className="text-redLabel">*</span>Título
                </Label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  className="w-full"
                  placeholder="Título de la noticia"
                  value={blogPost ? blogPost.title : form.title}
                  maxLength={255}
                  onChange={handleFormInput}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="description">
                  <span className="text-redLabel">*</span>Descripción
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Lorem ipsum dolor sit amet."
                  value={blogPost ? blogPost.description : form.description}
                  onChange={handleFormInput}
                  maxLength={526}
                  className="min-h-20"
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="coverImagePath">Imagen de portada</Label>
                <MyDropzone
                  className="p-10"
                  file={image}
                  fileSetter={setImage}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card x-chunk="dashboard-07-chunk-0" className="mt-4">
          <CardHeader>
            <CardTitle>Contenido de la Noticia</CardTitle>
            <CardDescription>
              Use los bloques para crear el contenido de su noticia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {components &&
                components.map((component: Component) => (
                  <NewsComponent
                    key={component.id}
                    component={component}
                    components={components}
                    setComponents={setComponents}
                  />
                ))}
            </div>
            <div className="border border-dashed rounded-lg mt-3 p-4 px-6 flex justify-between">
              <div className="flex items-center gap-3">
                <SquarePlus className="w-8 h-8 fill-slate-400 text-white" />
                <p className="text-[#94A3B8]">Agregar Bloque</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <ChevronDown className="w-6 h-6 text-slate-400 hover:outline-none" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>
                    Elige el componente deseado
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => returnComponent(ComponentTypes.TITLE)}
                  >
                    Título
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => returnComponent(ComponentTypes.SUBTITLE)}
                  >
                    Sub título
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => returnComponent(ComponentTypes.PARAGRAPH)}
                  >
                    Párrafo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
};

export default BlogPostCU;
