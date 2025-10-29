"use client";

import React from 'react';
import { useFCM } from '@/hooks/use-fcm';

const FCMManager: React.FC = () => {
  // Simplemente llamamos al hook para inicializar la lógica
  useFCM();
  
  // Este componente no renderiza nada visible
  return null;
};

export default FCMManager;