import { useState } from "react";
import {
  LayoutGrid,
  Menu,
  Package,
  Package2,
  ShoppingCart,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Import,
  Folder,
  Star,
  ExternalLink,
  Newspaper,
  BookOpen,
  Dock,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "../ui/button";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthContext } from "@/context/auth-context";
import { useImportContext } from "@/context/import-context";

type MenuItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
};

const menuItems: MenuItem[] = [
  { href: "/dashboard/marcas", icon: ShoppingCart, text: "Marcas" },
  { href: "/dashboard/categorias", icon: LayoutGrid, text: "Categorías" },
  { href: "/dashboard/productos", icon: Package, text: "Productos" },
  { href: "/dashboard/productos-destacados", icon: Star, text: "Productos Destacados" },
  { href: "/dashboard/boletines", icon: Newspaper, text: "Boletines" },
  { href: "/dashboard/blogs", icon: BookOpen, text: "Blogs" },
  { href: "/dashboard/banners", icon: Dock, text: "Banners" },
  { href: "/dashboard/importaciones", icon: Import, text: "Importaciones" },
  { href: "/dashboard/archivos", icon: Folder, text: "Administrador de Archivos" },
  // { href: "/noticias", icon: Megaphone, text: "Noticias" },
  // { href: "/ajustes", icon: Settings, text: "Ajustes" },
];

const catalogUrl =
  import.meta.env.VITE_CATALOG_URL ?? "https://platinum-web-six.vercel.app";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [menuLarge, setMenuLarge] = useState<boolean>(false);
  const { signOut } = useAuthContext();
  const { importState, bannerDismissed } = useImportContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      navigate("/login");
    }
  };

  const LinkComponent = ({
    href,
    icon: Icon,
    text,
  }: {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    text: string;
  }) => (
    <NavLink
      to={href}
      className={({ isActive }) =>
        menuLarge
          ? `flex items-center gap-3 rounded-lg px-3 py-3 my-2 first:mt-0 text-muted-foreground transition-all hover:text-primary ${
              isActive ? "bg-black text-white hover:text-slate-300" : ""
            }`
          : `flex h-9 w-9 items-center justify-center rounded-lg my-1 text-muted-foreground transition-all hover:text-primary ${
              isActive ? "bg-black text-white hover:text-slate-300" : ""
            }`
      }
    >
      {!menuLarge ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Icon className="h-4 w-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{text}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <>
          <Icon className="h-4 w-4" />
          <p>{text}</p>
        </>
      )}
    </NavLink>
  );

  const LinkComponentMobile = ({
    href,
    icon: Icon,
    text,
  }: {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    text: string;
  }) => (
    <NavLink
      to={href}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-4 text-muted-foreground transition-all hover:text-primary ${isActive ? "bg-black text-white mr-6" : ""
        }`
      }
    >
      <Icon className="h-4 w-4" />
      {text}
    </NavLink>
  );

  const catalogLinkClass = menuLarge
    ? "flex items-center gap-3 rounded-lg px-3 py-3 my-2 text-muted-foreground transition-all hover:text-primary hover:bg-accent"
    : "flex h-9 w-9 items-center justify-center rounded-lg my-1 text-muted-foreground transition-all hover:text-primary hover:bg-accent";
  const catalogLinkContent = () => (
    <a
      href={catalogUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={catalogLinkClass}
    >
      <ExternalLink className="h-4 w-4 shrink-0" />
      {menuLarge && <span>Ver catálogo</span>}
    </a>
  );

  return (
    <div className="flex-col md:flex md:flex-row h-screen w-full">
      <div
        className={`${
          !menuLarge ? "w-14 overflow-x-hidden" : "w-[280px]"
        } hidden border-r bg-muted/40 md:block shrink-0`}
      >
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div
            className={`${!menuLarge ? "mx-auto px-0" : "px-4 lg:px-6"
              } flex h-14 items-center border-b lg:h-[60px]`}
          >
            <div className="flex items-center gap-2 font-semibold">
              <Package2 className="h-6 w-6" />
              {menuLarge && <span>Platinum Driveline</span>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav
              className={`${!menuLarge ? "items-center flex flex-col" : "px-2 lg:px-4"
                } text-sm font-medium flex flex-col gap-5 h-full`}
            >
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={
                        menuLarge
                          ? "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary cursor-pointer hover:bg-accent"
                          : "flex h-9 w-9 items-center justify-center rounded-lg my-1 text-muted-foreground transition-all hover:text-primary cursor-pointer hover:bg-accent"
                      }
                      onClick={() => setMenuLarge(!menuLarge)}
                    >
                      {menuLarge ? (
                        <PanelLeftClose className="h-4 w-4" />
                      ) : (
                        <PanelLeftOpen className="h-4 w-4" />
                      )}
                      {menuLarge && <p>Colapsar Menú</p>}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{menuLarge ? "Colapsar menú lateral" : "Expandir menú lateral"}</p>
                  </TooltipContent>
                </Tooltip>
                <section
                  className={`flex-1 min-h-0 overflow-y-auto py-1 ${
                    !menuLarge ? "flex flex-col items-center px-1" : ""
                  }`}
                >
                  {menuItems.map((item) => (
                    <LinkComponent
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      text={item.text}
                    />
                  ))}
                  <div className={!menuLarge ? "flex flex-col items-center" : ""}>
                    {!menuLarge ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {catalogLinkContent()}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver catálogo</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      catalogLinkContent()
                    )}
                  </div>
                </section>
                <div className="my-auto py-4 shrink-0">
                  {!menuLarge && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg my-1 text-muted-foreground transition-all hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
                          onClick={handleLogout}
                        >
                          <LogOut className="h-4 w-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Cerrar Sesión</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
            </nav>
          </div>
          {!menuLarge ? (
            <></>
          ) : (
            <div className="mt-auto p-4">
              <div
                className="flex items-center gap-3 rounded-lg px-3 py-3 my-2 text-muted-foreground transition-all hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <p>Cerrar Sesión</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <header className="p-3 md:p-0">
        <Sheet>
          <div className="flex justify-between">
            <div className="flex items-center md:hidden gap-2 font-semibold">
              <Package2 className="h-6 w-6" />
              <span>Platinum Driveline</span>
            </div>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
          </div>
          <SheetContent side="left" className="flex flex-col">
            <nav className="grid gap-2 text-lg font-medium">
              {menuItems.map((item) => (
                <LinkComponentMobile
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  text={item.text}
                />
              ))}
              <a
                href={catalogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-4 text-muted-foreground transition-all hover:text-primary"
              >
                <ExternalLink className="h-4 w-4" />
                Ver catálogo
              </a>
            </nav>
            <div className="mt-auto">
              <div
                className="flex items-center gap-3 rounded-lg px-3 py-4 text-muted-foreground transition-all hover:text-primary cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>
      <div className={`flex-1 overflow-y-auto px-4 md:px-6 py-0 md:my-5 min-w-0 ${importState.isImporting && !bannerDismissed ? 'pt-20' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default Layout;
