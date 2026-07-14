import { useState } from 'react';

/**
 * Hook para manejar la carga de una imagen desde un <input type="file">
 * y convertirla a base64 (data URL), lista para enviar al backend o mostrar en <img>.
 */
export default function useImageUpload(initialValue = '') {
  const [imagen, setImagen] = useState(initialValue);

  const handleImagen = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagen(ev.target.result);
    reader.readAsDataURL(file);
  };

  const limpiarImagen = () => setImagen('');

  return { imagen, setImagen, handleImagen, limpiarImagen };
}