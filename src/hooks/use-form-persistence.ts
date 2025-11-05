import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';

/**
 * Hook para persistir el estado de un formulario de react-hook-form en localStorage.
 * @param form El objeto devuelto por useForm.
 * @param storageKey La clave única para almacenar los datos en localStorage.
 * @param fieldsToPersist Un array de nombres de campos a persistir.
 */
export function useFormPersistence<TFieldValues extends Record<string, any>>(
  form: UseFormReturn<TFieldValues>,
  storageKey: string,
  fieldsToPersist: (keyof TFieldValues)[]
) {
  const { watch, reset, getValues, setValue } = form;

  // 1. Cargar estado al montar
  useEffect(() => {
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        
        // Solo aplicar los campos que queremos persistir
        const dataToRestore: Partial<TFieldValues> = {};
        fieldsToPersist.forEach(field => {
          if (parsedData[field as string] !== undefined) {
            (dataToRestore as any)[field] = parsedData[field as string];
          }
        });
        
        // Usar reset para establecer los valores iniciales y limpiar el almacenamiento
        // Nota: Usamos setValue en lugar de reset para manejar arrays complejos como 'items'
        Object.entries(dataToRestore).forEach(([key, value]) => {
            // Aseguramos que los arrays se manejen correctamente
            if (Array.isArray(value)) {
                // Si es un array, lo establecemos directamente
                setValue(key as keyof TFieldValues, value as any, { shouldValidate: false, shouldDirty: true });
            } else {
                setValue(key as keyof TFieldValues, value as any, { shouldValidate: false, shouldDirty: true });
            }
        });
        
        console.log(`[FormPersistence] Restored form state for ${storageKey}.`);
      } catch (e) {
        console.error(`[FormPersistence] Failed to parse saved data for ${storageKey}.`, e);
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey, fieldsToPersist, setValue]);

  // 2. Guardar estado en cada cambio
  useEffect(() => {
    const subscription = watch((value) => {
      // Crear un objeto solo con los campos que queremos guardar
      const dataToSave: Partial<TFieldValues> = {};
      fieldsToPersist.forEach(field => {
        (dataToSave as any)[field] = value[field as string];
      });
      
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    });

    return () => subscription.unsubscribe();
  }, [watch, storageKey, fieldsToPersist]);

  // 3. Función para limpiar el estado persistido (llamada después de un envío exitoso)
  const clearPersistence = () => {
    localStorage.removeItem(storageKey);
    console.log(`[FormPersistence] Cleared persisted state for ${storageKey}.`);
  };

  return { clearPersistence };
}