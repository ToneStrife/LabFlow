"use client";

import React from "react";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { buildAuthRedirectTo } from "@/lib/auth-redirect";

const Login: React.FC = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [forgotEmail, setForgotEmail] = React.useState("");
  const [isSendingReset, setIsSendingReset] = React.useState(false);

  React.useEffect(() => {
    if (session) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = forgotEmail.trim();
    if (!email) {
      toast.error("Introduce tu email.");
      return;
    }

    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildAuthRedirectTo("/reset-password"),
    });
    setIsSendingReset(false);

    if (error) {
      toast.error("No se pudo enviar el email.", { description: error.message });
      return;
    }

    toast.success("Revisa tu correo.", {
      description: "Te hemos enviado un enlace para restablecer la contraseña.",
    });
    setShowForgotPassword(false);
    setForgotEmail("");
  };

  if (loading || session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando autenticación...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {showForgotPassword ? "Restablecer contraseña" : "Inicia sesión en tu cuenta"}
          </h2>
        </div>

        {showForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-4 bg-white p-6 rounded-lg border shadow-sm">
            <p className="text-sm text-muted-foreground">
              Introduce el email de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.
            </p>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                disabled={isSendingReset}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSendingReset}>
              {isSendingReset ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                "Enviar enlace"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setShowForgotPassword(false)}
              disabled={isSendingReset}
            >
              Volver al inicio de sesión
            </Button>
          </form>
        ) : (
          <>
            <Auth
              supabaseClient={supabase}
              providers={[]}
              view="sign_in"
              showLinks={false}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: 'hsl(var(--primary))',
                      brandAccent: 'hsl(var(--primary-foreground))',
                    },
                  },
                },
              }}
              theme="light"
              redirectTo={buildAuthRedirectTo("/dashboard")}
            />
            <div className="text-center space-y-2">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setShowForgotPassword(true)}
              >
                ¿Has olvidado la contraseña?
              </button>
              <p className="text-sm text-muted-foreground">
                Si no tienes cuenta, contacta con un administrador para recibir una invitación.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
