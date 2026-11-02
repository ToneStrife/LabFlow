import React from "react";
import RequestForm from "@/components/RequestForm";

import { pageTitleClass, pageDescriptionClass } from "@/lib/layout";
const NewRequest = () => {
  return (
    // Más estrecho que el resto de páginas: una línea de formulario de 1000 px
    // se lee mal, el ojo pierde la relación entre etiqueta y campo.
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-5">
      <div>
        <h1 className={pageTitleClass}>Nueva solicitud</h1>
        <p className={pageDescriptionClass}>
          Rellena los datos, adjunta el presupuesto (PDF, imagen o captura) si ya lo tienes y añade los artículos.
        </p>
      </div>
      <RequestForm />
    </div>
  );
};

export default NewRequest;
