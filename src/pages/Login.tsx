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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { buildAuthReturnUrl } from "@/lib/auth-redirect";
import { FlaskConical } from "lucide-react";
import { useTheme } from "next-themes";

// El correo de restablecimiento lleva un codigo de 6 digitos, no un enlace.
// Los filtros de seguridad del correo abren los enlaces entrantes para
// comprobarlos, y como los de Supabase son de un solo uso, se los gastaban
// antes de que llegase la persona. Un codigo no se puede "pinchar".
type ForgotStep = "none" | "email" | "code";

const Login: React.FC = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [forgotStep, setForgotStep] = React.useState<ForgotStep>("none");
  const [forgotEmail, setForgotEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [isSendingCode, setIsSendingCode] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const { resolvedTheme } = useTheme();

  // Al validar el codigo abrimos sesion a proposito, para que la persona
  // pueda escribir la contrasena nueva. Ese caso no debe irse al panel.
  const goingToPasswordForm = React.useRef(false);

  React.useEffect(() => {
    if (session && !goingToPasswordForm.current) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, navigate]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = forgotEmail.trim();
    if (!email) {
      toast.error("Introduce tu email.");
      return;
    }

    setIsSendingCode(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setIsSendingCode(false);

    if (error) {
      toast.error("No se pudo enviar el código.", { description: error.message });
      return;
    }

    toast.success("Revisa tu correo.", {
      description: "Te hemos enviado un código de 6 dígitos.",
    });
    setCode("");
    setForgotStep("code");
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.trim();
    if (token.length !== 6) {
      toast.error("El código tiene 6 dígitos.");
      return;
    }

    setIsVerifying(true);
    goingToPasswordForm.current = true;
    const { error } = await supabase.auth.verifyOtp({
      email: forgotEmail.trim(),
      token,
      type: "recovery",
    });
    setIsVerifying(false);

    if (error) {
      goingToPasswordForm.current = false;
      toast.error("El código no vale.", {
        description: "Comprueba que lo has copiado bien, o pide uno nuevo.",
      });
      return;
    }

    navigate("/reset-password", { replace: true });
  };

  const cancelForgot = () => {
    setForgotStep("none");
    setForgotEmail("");
    setCode("");
  };

  if (loading || session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando autenticación...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <FlaskConical className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground">LabFlow</h1>
          <p className="text-sm text-muted-foreground">Gestión de solicitudes de laboratorio</p>
          <h2 className="mt-6 text-lg font-semibold text-foreground">
            {forgotStep === "none" ? "Inicia sesión en tu cuenta" : "Restablecer contraseña"}
          </h2>
        </div>

        {forgotStep === "email" && (
          <form onSubmit={handleSendCode} className="space-y-4 bg-card p-6 rounded-lg border shadow-sm">
            <p className="text-sm text-muted-foreground">
              Introduce el email de tu cuenta y te enviaremos un código de 6 dígitos.
            </p>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                disabled={isSendingCode}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSendingCode}>
              {isSendingCode ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                "Enviar código"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={cancelForgot}
              disabled={isSendingCode}
            >
              Volver al inicio de sesión
            </Button>
          </form>
        )}

        {forgotStep === "code" && (
          <form onSubmit={handleVerifyCode} className="space-y-4 bg-card p-6 rounded-lg border shadow-sm">
            <p className="text-sm text-muted-foreground">
              Escribe el código de 6 dígitos que has recibido por correo. Caduca en una hora.
            </p>
            <div className="space-y-2">
              <Label htmlFor="otp-email">Email</Label>
              <Input
                id="otp-email"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                disabled={isVerifying}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="otp-code">Código</Label>
              <InputOTP
                id="otp-code"
                maxLength={6}
                value={code}
                onChange={setCode}
                disabled={isVerifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" className="w-full" disabled={isVerifying || code.length !== 6}>
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Comprobando...
                </>
              ) : (
                "Continuar"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setCode("");
                setForgotStep("email");
              }}
              disabled={isVerifying}
            >
              No me ha llegado, enviar otro
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={cancelForgot}
              disabled={isVerifying}
            >
              Volver al inicio de sesión
            </Button>
          </form>
        )}

        {forgotStep === "none" && (
          <>
            <div className="bg-card p-6 rounded-lg border shadow-sm">
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
              theme={resolvedTheme === "dark" ? "dark" : "light"}
              redirectTo={buildAuthReturnUrl()}
            />
            </div>
            <div className="text-center space-y-2">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setForgotStep("email")}
              >
                ¿Has olvidado la contraseña?
              </button>
              <br />
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => setForgotStep("code")}
              >
                Ya tengo un código
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
