import { useState } from "react";
import {
  LayoutGrid,
  Menu,
  Package,
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

const sidebarNavIdle =
  "text-white/70 transition-all hover:bg-white/10 hover:text-white";
const sidebarNavActive =
  "bg-brand-orange text-[#002858] hover:bg-[#D9680F] hover:text-[#002858] [&_svg]:text-[#002858]";

const BrandLogo = ({
  showLabel,
  variant = "dark",
}: {
  showLabel: boolean;
  variant?: "dark" | "light";
}) => (
  <div
    className={`flex items-center gap-2 font-semibold ${
      variant === "light" ? "text-white" : "text-brand-navy"
    }`}
  >
    <img
      src="/favicon-platinum.svg"
      alt="Platinum Driveline"
      className="h-8 w-8 shrink-0 object-contain"
    />
    {showLabel ? <span className="truncate">Platinum Driveline</span> : null}
  </div>
);

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
          ? `flex items-center gap-3 rounded-lg px-3 py-3 my-2 first:mt-0 ${
              isActive ? sidebarNavActive : sidebarNavIdle
            }`
          : `flex h-9 w-9 items-center justify-center rounded-lg my-1 ${
              isActive ? sidebarNavActive : sidebarNavIdle
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
        `flex items-center gap-3 rounded-lg px-3 py-4 ${
          isActive ? `${sidebarNavActive} mr-6` : sidebarNavIdle
        }`
      }
    >
      <Icon className="h-4 w-4" />
      {text}
    </NavLink>
  );

  const catalogLinkClass = menuLarge
    ? `flex items-center gap-3 rounded-lg px-3 py-3 my-2 ${sidebarNavIdle}`
    : `flex h-9 w-9 items-center justify-center rounded-lg my-1 ${sidebarNavIdle}`;
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
        } hidden border-r border-white/10 bg-[#002858] md:block shrink-0`}
      >
        <div className="flex h-full max-h-screen flex-col overflow-hidden">
          <div
            className={`${!menuLarge ? "mx-auto px-0" : "px-4 lg:px-6"
              } flex h-14 shrink-0 items-center border-b border-white/10 lg:h-[60px]`}
          >
            <BrandLogo showLabel={menuLarge} variant="light" />
          </div>
          <nav
            className={`${!menuLarge ? "items-center flex flex-col" : "px-2 lg:px-4"
              } text-sm font-medium flex flex-1 min-h-0 flex-col`}
          >
              <TooltipProvider delayDuration={0}>
                <section
                  className={`flex-1 py-1 ${
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
                <div
                  className={`mt-auto shrink-0 ${menuLarge ? "p-4 pt-0" : "flex flex-col items-center py-4"}`}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={
                          menuLarge
                            ? `flex items-center gap-3 rounded-lg px-3 py-3 my-2 cursor-pointer ${sidebarNavIdle}`
                            : `flex h-9 w-9 items-center justify-center rounded-lg my-1 cursor-pointer ${sidebarNavIdle}`
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
                  {!menuLarge ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg my-1 text-white/70 transition-all hover:bg-white/10 hover:text-red-300 cursor-pointer"
                          onClick={handleLogout}
                        >
                          <LogOut className="h-4 w-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Cerrar Sesión</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div
                      className="flex items-center gap-3 rounded-lg px-3 py-3 my-2 text-white/70 transition-all hover:bg-white/10 hover:text-red-300 cursor-pointer"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      <p>Cerrar Sesión</p>
                    </div>
                  )}
                </div>
              </TooltipProvider>
          </nav>
        </div>
      </div>
      <header className="p-3 md:p-0">
        <Sheet>
          <div className="flex justify-between">
            <div className="flex items-center md:hidden">
              <BrandLogo showLabel />
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
          <SheetContent side="left" className="flex flex-col bg-[#002858] text-white border-white/10">
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
                className={`flex items-center gap-3 rounded-lg px-3 py-4 ${sidebarNavIdle}`}
              >
                <ExternalLink className="h-4 w-4" />
                Ver catálogo
              </a>
            </nav>
            <div className="mt-auto">
              <div
                className={`flex items-center gap-3 rounded-lg px-3 py-4 cursor-pointer ${sidebarNavIdle} hover:text-red-300`}
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
