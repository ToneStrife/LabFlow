"use client";

import React from "react";
import RequestForm from "@/components/RequestForm";

const NewRequest = () => {
  return (
    // Más estrecho que el resto de páginas: una línea de formulario de 1000 px
    // se lee mal, el ojo pierde la relación entre etiqueta y campo.
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nueva solicitud</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rellena los datos, adjunta la cotización si ya la tienes y añade los artículos.
        </p>
      </div>
      <RequestForm />
    </div>
  );
};

export default NewRequest;
