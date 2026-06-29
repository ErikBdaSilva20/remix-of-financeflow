import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Sem log em produção — evita confirmar rotas inexistentes via DevTools
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Ops! Página não encontrada</p>
        <Link to="/" className="text-primary underline hover:text-primary/80">
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
