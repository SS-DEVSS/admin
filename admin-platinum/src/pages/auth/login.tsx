import CredentialsLayout from "@/components/Layouts/CredentialsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuthContext } from "@/context/auth-context";

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuthContext();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      navigate("/dashboard/productos");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CredentialsLayout
      logo={
        <img
          src="/login_back.webp"
          alt="Platinum Driveline"
          className="h-20 w-auto max-w-[280px] object-contain opacity-90 sm:h-20"
        />
      }
    >
      <div className="grid gap-2 text-center">
        <h1 className="text-3xl font-bold text-brand-navy">Iniciar Sesión</h1>
        <p className="text-balance text-muted-foreground">
          Ingresa las credenciales para acceder al sistema
        </p>
      </div>
      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-brand-navy">
            Correo
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={handleEmailChange}
            required
            className="border-gray-200 focus-visible:ring-brand-orange"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password" className="text-brand-navy">
            Contraseña
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            required
            className="border-gray-200 focus-visible:ring-brand-orange"
          />
        </div>
        {error && (
          <div className="text-center text-sm text-red-500">{error}</div>
        )}
        <Button
          type="submit"
          className="w-full bg-brand-orange text-white transition-colors duration-200 hover:bg-[#D9680F]"
          disabled={loading}
        >
          {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </Button>
        <Link
          to="/olvide-mi-contrasena"
          className="block text-center text-sm text-brand-navy underline-offset-4 hover:underline"
        >
          Recuperar contraseña
        </Link>
      </form>
    </CredentialsLayout>
  );
};

export default Login;
