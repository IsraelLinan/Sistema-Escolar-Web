import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import axios from 'axios';
import useImageUpload from '../hooks/useImageUpload';
import { API_URL } from '../config';

export default function FotocheckGenerator() {
  const { imagen: foto, handleImagen: handleFoto } = useImageUpload(null);
  const { imagen: logoEscuela, handleImagen: handleLogo } = useImageUpload(null);
  const [nombre, setNombre] = useState('');
  const [grado, setGrado] = useState('');
  const [seccion, setSeccion] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [codigoBarras, setCodigoBarras] = useState('');
  const [imagenCodigo, setImagenCodigo] = useState(null);
  const [loadingCodigo, setLoadingCodigo] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingGuardar, setLoadingGuardar] = useState(false);
  const [error, setError] = useState('');
  const [exitoGuardar, setExitoGuardar] = useState('');
  const fotocheckRef = useRef(null);

  const buscarCodigo = async () => {
    if (!nombre.trim()) {
      setError('Ingrese el nombre del estudiante primero.');
      return;
    }
    setLoadingCodigo(true);
    setError('');
    try {
      const res = await axios.get(
        `${API_URL}/codigos/buscar?nombre=${encodeURIComponent(nombre.trim())}`
      );
      setImagenCodigo(res.data.imagen);
      setCodigoBarras(res.data.codigo);
    } catch (e) {
      setError('No se encontró código para este estudiante. Genéralo primero en el módulo de códigos.');
    } finally {
      setLoadingCodigo(false);
    }
  };

  const exportarPDF = async () => {
    if (!fotocheckRef.current) return;
    setLoadingPDF(true);
    try {
      const canvas = await html2canvas(fotocheckRef.current, {
        scale: 3, useCORS: true, backgroundColor: null,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape', unit: 'mm', format: [85.6, 54],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 54);
      pdf.save(`fotocheck_${nombre || 'estudiante'}.pdf`);
    } catch (e) {
      setError('Error al exportar el PDF.');
    } finally {
      setLoadingPDF(false);
    }
  };

  const guardarFotocheck = async () => {
    if (!nombre.trim()) {
      setError('Ingrese el nombre del estudiante.');
      return;
    }
    setLoadingGuardar(true);
    setError('');
    setExitoGuardar('');
    try {
      const canvas = await html2canvas(fotocheckRef.current, {
        scale: 3, useCORS: true, backgroundColor: null,
      });
      const imagenCarnet = canvas.toDataURL('image/png');
      await axios.post(`${API_URL}/fotochecks/guardar`, {
        nombre_escuela: '',
        logo_escuela: logoEscuela || '',
        nombre,
        grado: grado + (seccion ? ` - ${seccion}` : ''),
        anio,
        foto: foto || '',
        codigo_barras: codigoBarras || '',
        imagen_carnet: imagenCarnet,
        tipo: 'Estudiante'
      });
      setExitoGuardar('✔ Carnet guardado. Puedes verlo en el módulo Carnets.');
      setTimeout(() => setExitoGuardar(''), 4000);
    } catch (e) {
      setError('Error al guardar el carnet.');
    } finally {
      setLoadingGuardar(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Encabezado */}
      <div className="bg-theme2 border border-theme rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4">
          <span className="text-5xl">🪪</span>
          <div>
            <h2 className="text-theme text-xl font-bold">Generar Fotocheck Escolar</h2>
            <p className="text-muted text-sm">Diseña e imprime el carné del estudiante</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Formulario */}
        <div className="bg-theme2 border border-theme rounded-2xl p-6 space-y-4">
          <p className="text-muted text-xs font-bold uppercase mb-2">Datos del Carné</p>

          {/* Logo escuela */}
          <div>
            <label className="block text-muted text-xs font-bold uppercase mb-1">Logo de la Escuela</label>
            <label className="w-full flex items-center gap-3 bg-theme3 border border-dashed border-theme hover:border-[#06b6d4] text-muted rounded-xl px-4 py-3 text-sm cursor-pointer transition">
              <span>🏫</span>
              <span>{logoEscuela ? 'Logo cargado ✔' : 'Haz clic para subir el logo'}</span>
              <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
            </label>
          </div>

          {/* Nombre estudiante */}
          <div>
            <label className="block text-muted text-xs font-bold uppercase mb-1">Nombre del Estudiante</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: García López Juan Carlos"
              className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#06b6d4]"
            />
          </div>

          {/* Grado, Sección y Año */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-muted text-xs font-bold uppercase mb-1">Grado</label>
              <select
                value={grado}
                onChange={e => setGrado(e.target.value)}
                className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#06b6d4]"
              >
                <option value="">Seleccionar</option>
                <optgroup label="Primaria">
                  <option value="1ro Primaria">1ro Primaria</option>
                  <option value="2do Primaria">2do Primaria</option>
                  <option value="3ro Primaria">3ro Primaria</option>
                  <option value="4to Primaria">4to Primaria</option>
                  <option value="5to Primaria">5to Primaria</option>
                  <option value="6to Primaria">6to Primaria</option>
                </optgroup>
                <optgroup label="Secundaria">
                  <option value="1ro Secundaria">1ro Secundaria</option>
                  <option value="2do Secundaria">2do Secundaria</option>
                  <option value="3ro Secundaria">3ro Secundaria</option>
                  <option value="4to Secundaria">4to Secundaria</option>
                  <option value="5to Secundaria">5to Secundaria</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-muted text-xs font-bold uppercase mb-1">Sección</label>
              <select
                value={seccion}
                onChange={e => setSeccion(e.target.value)}
                className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#06b6d4]"
              >
                <option value="">Seleccionar</option>
                {['A','B','C','D','E','F','G','H'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-muted text-xs font-bold uppercase mb-1">Año</label>
              <input
                type="text"
                value={anio}
                onChange={e => setAnio(e.target.value)}
                placeholder="2026"
                className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#06b6d4]"
              />
            </div>
          </div>

          {/* Foto */}
          <div>
            <label className="block text-muted text-xs font-bold uppercase mb-1">Fotografía</label>
            <label className="w-full flex items-center gap-3 bg-theme3 border border-dashed border-theme hover:border-[#06b6d4] text-muted rounded-xl px-4 py-3 text-sm cursor-pointer transition">
              <span>📷</span>
              <span>{foto ? 'Foto cargada ✔' : 'Haz clic para subir una foto'}</span>
              <input type="file" accept="image/*" onChange={handleFoto} className="hidden" />
            </label>
          </div>

          {/* Código de barras */}
          <div>
            <label className="block text-muted text-xs font-bold uppercase mb-1">Código de Barras</label>
            <button
              onClick={buscarCodigo}
              disabled={loadingCodigo}
              className="w-full bg-theme3 hover:bg-theme border border-theme text-theme font-bold py-3 rounded-xl transition text-sm disabled:opacity-50"
            >
              {loadingCodigo ? 'Buscando...' : '🔍 Buscar código del estudiante'}
            </button>
            {imagenCodigo && (
              <p className="text-[#22c55e] text-xs mt-1">✔ Código encontrado y cargado</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-[#ef444420] border border-[#ef4444] text-[#ef4444] rounded-xl px-4 py-2 text-sm">
              ✗ {error}
            </div>
          )}

          {/* Éxito */}
          {exitoGuardar && (
            <div className="bg-[#22c55e20] border border-[#22c55e] text-[#22c55e] rounded-xl px-4 py-2 text-sm">
              {exitoGuardar}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={exportarPDF}
              disabled={loadingPDF}
              className="flex-1 bg-[#06b6d4] hover:bg-[#0891b2] text-white font-bold py-3 rounded-xl transition text-sm disabled:opacity-50"
            >
              {loadingPDF ? 'Generando...' : '📄 Exportar PDF'}
            </button>
            <button
              onClick={guardarFotocheck}
              disabled={loadingGuardar}
              className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-3 rounded-xl transition text-sm disabled:opacity-50"
            >
              {loadingGuardar ? 'Guardando...' : '💾 Guardar Carnet'}
            </button>
          </div>
        </div>

        {/* Vista previa */}
        <div className="bg-theme2 border border-theme rounded-2xl p-6 flex flex-col items-center justify-center">
          <p className="text-muted text-xs font-bold uppercase mb-4">Vista Previa</p>

          <div
            ref={fotocheckRef}
            style={{ width: '342px', height: '216px', fontFamily: 'Arial, sans-serif' }}
            className="relative rounded-xl overflow-hidden shadow-2xl"
          >
            {/* Header azul */}
            <div style={{
              background: 'linear-gradient(135deg, #1a6b8a 0%, #1e3a6e 50%, #1a3a5c 100%)',
              height: '50%', position: 'relative',
            }}>
              <div style={{
                position: 'absolute', inset: 0, opacity: 0.15,
                backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
                backgroundSize: '12px 12px'
              }} />
              {/* Logo */}
              <div style={{
                position: 'absolute', top: '8px', right: '10px',
                width: '70px', height: '70px', borderRadius: '8px',
                overflow: 'hidden', background: 'white', padding: '3px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {logoEscuela ? (
                  <img src={logoEscuela} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '28px' }}>🏫</span>
                )}
              </div>
              {/* Etiqueta */}
              <div style={{
                position: 'absolute', bottom: '10px', right: '12px',
                color: 'white', fontWeight: 'bold', fontSize: '16px',
                textShadow: '0 1px 3px rgba(0,0,0,0.4)'
              }}>
                Carné de Estudiante
              </div>
            </div>

            {/* Fondo blanco */}
            <div style={{ background: 'white', height: '50%', position: 'relative' }}>
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: '8px', background: 'linear-gradient(90deg, #22c55e, #16a34a)'
              }} />
              <div style={{
                position: 'absolute', left: '140px', top: '8px',
                fontSize: '10px', color: '#333', lineHeight: '1.8'
              }}>
                <div><span style={{ color: '#666' }}>Nombre  :</span> <strong>{nombre || ''}</strong></div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span><span style={{ color: '#666' }}>Grado :</span> <strong>{grado || ''}</strong></span>
                  {seccion && <span><span style={{ color: '#666' }}>Sección :</span> <strong>{seccion}</strong></span>}
                </div>
                <div><span style={{ color: '#666' }}>Año      :</span> <strong>{anio || ''}</strong></div>
              </div>
            </div>

            {/* Foto circular */}
            <div style={{
              position: 'absolute', left: '12px', top: '18px',
              width: '100px', height: '100px', borderRadius: '50%',
              border: '3px solid white', overflow: 'hidden', background: '#e5e7eb',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              {foto ? (
                <img src={foto} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '32px', background: '#dbeafe'
                }}>👤</div>
              )}
            </div>

            {/* Código de barras */}
            <div style={{
              position: 'absolute', left: '6px', bottom: '14px',
              width: '116px', background: 'white', borderRadius: '8px', padding: '3px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}>
              {imagenCodigo ? (
                <img src={imagenCodigo} alt="barcode" style={{ width: '100%', height: '30px', objectFit: 'contain' }} />
              ) : (
                <div style={{
                  height: '30px', background: '#f3f4f6', borderRadius: '6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '8px', color: '#9ca3af'
                }}>código de barras</div>
              )}
            </div>
          </div>

          <p className="text-muted text-xs mt-4 text-center">
            Tamaño real: 85.6 × 54 mm (tarjeta estándar)
          </p>
        </div>
      </div>
    </div>
  );
}