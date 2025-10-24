"use client";

import React from "react";
import RequestForm from "@/components/RequestForm"; // Import the new form component

const NewRequest = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Crear Nueva Solicitud</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Rellena el siguiente formulario para enviar una nueva solicitud de productos de laboratorio. Puedes añadir múltiples artículos a una sola solicitud.
      </p>
      <RequestForm />
    </div>
  );
};

export default NewRequest;