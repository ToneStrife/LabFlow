// Los tipos de React 18 no declaran el evento "cancel" del <input type="file">,
// que el navegador dispara cuando el usuario cierra el selector sin elegir nada.
// Existe en el DOM y la app lo usa; React lo incorpora en sus tipos a partir de
// la version 19. Hasta entonces, lo declaramos aqui.
import "react";

declare module "react" {
  interface InputHTMLAttributes<T> {
    onCancel?: React.ReactEventHandler<T>;
  }
}
