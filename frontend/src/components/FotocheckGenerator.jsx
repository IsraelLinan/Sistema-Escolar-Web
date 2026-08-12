import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import axios from 'axios';
import { API_URL } from '../config';
import useImageUpload from '../hooks/useImageUpload';

const TIPOS = [
  {
    valor: 'Estudiante', label: '🎓 Estudiante', colorHeader: 'linear-gradient(135deg, #1a6b8a 0%, #1e3a6e 50%, #1a3a5c 100%)',
    colorFranja: 'linear-gradient(90deg, #22c55e, #16a34a)', colorBoton: '#06b6d4', colorBotonHover: '#0891b2',
    etiqueta: 'Carné de Estudiante', fotoFondo: '#dbeafe'
  },
  {
    valor: 'Docente', label: '👨‍🏫 Docente', colorHeader: 'linear-gradient(135deg, #15803d 0%, #166534 50%, #14532d 100%)',
    colorFranja: 'linear-gradient(90deg, #4f8ef7, #2563eb)', colorBoton: '#22c55e', colorBotonHover: '#16a34a',
    etiqueta: 'Carné de Docente', fotoFondo: '#dcfce7'
  },
  {
    valor: 'Auxiliar', label: '👷 Auxiliar', colorHeader: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
    colorFranja: 'linear-gradient(90deg, #4f8ef7, #2563eb)', colorBoton: '#ef4444', colorBotonHover: '#dc2626',
    etiqueta: 'Carné de Auxiliar', fotoFondo: '#fee2e2'
  },
];

const GRADOS = [
  { grupo: 'Primaria', opciones: ['1ro Primaria', '2do Primaria', '3ro Primaria', '4to Primaria', '5to Primaria', '6to Primaria'] },
  { grupo: 'Secundaria', opciones: ['1ro Secundaria', '2do Secundaria', '3ro Secundaria', '4to Secundaria', '5to Secundaria'] },
];

const SECCIONES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function FotocheckGenerator() {
  const [tipo, setTipo] = useState('Estudiante');
  const [orientacion, setOrientacion] = useState('horizontal');
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

  const config = TIPOS.find(t => t.valor === tipo);
  const esEstudiante = tipo === 'Estudiante';

  const cambiarTipo = (nuevoTipo) => {
    setTipo(nuevoTipo);
    setNombre('');
    setGrado('');
    setSeccion('');
    setCodigoBarras('');
    setImagenCodigo(null);
    setError('');
    setExitoGuardar('');
  };

  const buscarCodigo = async () => {
    if (!nombre.trim()) {
      setError(`Ingrese el nombre del ${tipo.toLowerCase()} primero.`);
      return;
    }
    setLoadingCodigo(true);
    setError('');
    try {
      const res = await axios.get(
        `${API_URL}/codigos/buscar?nombre=${encodeURIComponent(nombre.trim())}&tipo=${tipo}`
      );
      setImagenCodigo(res.data.imagen);
      setCodigoBarras(res.data.codigo);
    } catch (e) {
      setError(`No se encontró código para este ${tipo.toLowerCase()}. Genéralo primero en el módulo de códigos.`);
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
      const esVertical = orientacion === 'vertical';
      const pdf = new jsPDF({
        orientation: esVertical ? 'portrait' : 'landscape',
        unit: 'mm',
        format: esVertical ? [54, 85.6] : [85.6, 54],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, esVertical ? 54 : 85.6, esVertical ? 85.6 : 54);
      pdf.save(`fotocheck_${tipo.toLowerCase()}_${nombre || 'persona'}.pdf`);
    } catch (e) {
      setError('Error al exportar el PDF.');
    } finally {
      setLoadingPDF(false);
    }
  };

  const guardarFotocheck = async () => {
    if (!nombre.trim()) {
      setError(`Ingrese el nombre del ${tipo.toLowerCase()}.`);
      return;
    }
    if (!codigoBarras) {
      setError('Primero debes buscar el código de barras.');
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
        grado: esEstudiante ? (grado + (seccion ? ` - ${seccion}` : '')) : '',
        anio,
        foto: foto || '',
        codigo_barras: codigoBarras || '',
        imagen_carnet: imagenCarnet,
        tipo
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
            <h2 className="text-theme text-xl font-bold">Generar Fotocheck</h2>
            <p className="text-muted text-sm">Diseña e imprime el carné del personal escolar</p>
          </div>
        </div>
      </div>

      {/* Selector de tipo y orientación */}
      <div className="bg-theme2 border border-theme rounded-2xl p-4 mb-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <p className="text-muted text-xs font-bold uppercase mb-3">Tipo de Carné</p>
          <div className="flex bg-theme3 border border-theme rounded-xl p-1 flex-wrap">
            {TIPOS.map(t => (
              <button
                key={t.valor}
                onClick={() => cambiarTipo(t.valor)}
                style={tipo === t.valor ? { backgroundColor: t.colorBoton } : {}}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                  tipo === t.valor ? 'text-white' : 'text-muted hover:text-theme'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-muted text-xs font-bold uppercase mb-3">Formato</p>
          <div className="flex bg-theme3 border border-theme rounded-xl p-1">
            <button
              onClick={() => setOrientacion('horizontal')}
              style={orientacion === 'horizontal' ? { backgroundColor: config.colorBoton } : {}}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                orientacion === 'horizontal' ? 'text-white' : 'text-muted hover:text-theme'
              }`}
            >
              ▭ Horizontal
            </button>
            <button
              onClick={() => setOrientacion('vertical')}
              style={orientacion === 'vertical' ? { backgroundColor: config.colorBoton } : {}}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                orientacion === 'vertical' ? 'text-white' : 'text-muted hover:text-theme'
              }`}
            >
              ▯ Vertical
            </button>
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
            <label
              style={{ borderColor: undefined }}
              className="w-full flex items-center gap-3 bg-theme3 border border-dashed border-theme hover:opacity-80 text-muted rounded-xl px-4 py-3 text-sm cursor-pointer transition"
            >
              <span>🏫</span>
              <span>{logoEscuela ? 'Logo cargado ✔' : 'Haz clic para subir el logo'}</span>
              <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
            </label>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-muted text-xs font-bold uppercase mb-1">
              Nombre del {tipo === 'Estudiante' ? 'Estudiante' : tipo === 'Docente' ? 'Docente' : 'Auxiliar'}
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: García López, Juan Carlos"
              className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none"
            />
          </div>

          {/* Grado, Sección y Año (solo Estudiante) o solo Año (Docente/Auxiliar) */}
          {esEstudiante ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-muted text-xs font-bold uppercase mb-1">Grado</label>
                <select
                  value={grado}
                  onChange={e => setGrado(e.target.value)}
                  className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none"
                >
                  <option value="">Seleccionar</option>
                  {GRADOS.map(g => (
                    <optgroup key={g.grupo} label={g.grupo}>
                      {g.opciones.map(o => <option key={o} value={o}>{o}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted text-xs font-bold uppercase mb-1">Sección</label>
                <select
                  value={seccion}
                  onChange={e => setSeccion(e.target.value)}
                  className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none"
                >
                  <option value="">Seleccionar</option>
                  {SECCIONES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-muted text-xs font-bold uppercase mb-1">Año</label>
                <input
                  type="text" value={anio}
                  onChange={e => setAnio(e.target.value)}
                  placeholder="2026"
                  className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-muted text-xs font-bold uppercase mb-1">Año</label>
              <input
                type="text" value={anio}
                onChange={e => setAnio(e.target.value)}
                placeholder="2026"
                className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none"
              />
            </div>
          )}

          {/* Foto */}
          <div>
            <label className="block text-muted text-xs font-bold uppercase mb-1">Fotografía</label>
            <label className="w-full flex items-center gap-3 bg-theme3 border border-dashed border-theme hover:opacity-80 text-muted rounded-xl px-4 py-3 text-sm cursor-pointer transition">
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
              {loadingCodigo ? 'Buscando...' : `🔍 Buscar código del ${tipo.toLowerCase()}`}
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
              style={{ backgroundColor: config.colorBoton }}
              className="flex-1 text-white font-bold py-3 rounded-xl transition text-sm disabled:opacity-50 hover:opacity-90"
            >
              {loadingPDF ? 'Generando...' : '📄 Exportar PDF'}
            </button>
            <button
              onClick={guardarFotocheck}
              disabled={loadingGuardar || !codigoBarras}
              style={{ backgroundColor: config.colorBotonHover }}
              className="flex-1 text-white font-bold py-3 rounded-xl transition text-sm disabled:opacity-50 hover:opacity-90"
              title={!codigoBarras ? 'Primero busca el código de barras' : ''}
            >
              {loadingGuardar ? 'Guardando...' : '💾 Guardar Carnet'}
            </button>
          </div>
        </div>

        {/* Vista previa */}
        <div className="bg-theme2 border border-theme rounded-2xl p-6 flex flex-col items-center justify-center">
          <p className="text-muted text-xs font-bold uppercase mb-4">Vista Previa</p>

          {orientacion === 'horizontal' ? (
            <div
              ref={fotocheckRef}
              style={{ width: '342px', height: '216px', fontFamily: 'Arial, sans-serif' }}
              className="relative rounded-xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div style={{ background: config.colorHeader, height: '50%', position: 'relative' }}>
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
                  {config.etiqueta}
                </div>
              </div>

              {/* Fondo blanco */}
              <div style={{ background: 'white', height: '50%', position: 'relative' }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '8px', background: config.colorFranja
                }} />
                <div style={{
                  position: 'absolute', left: '140px', top: '8px',
                  fontSize: '10px', color: '#333', lineHeight: '1.8'
                }}>
                  <div><span style={{ color: '#666' }}>Nombre  :</span> <strong>{nombre || ''}</strong></div>
                  {esEstudiante ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span><span style={{ color: '#666' }}>Grado :</span> <strong>{grado || ''}</strong></span>
                      {seccion && <span><span style={{ color: '#666' }}>Sección :</span> <strong>{seccion}</strong></span>}
                    </div>
                  ) : (
                    <div><span style={{ color: '#666' }}>Cargo   :</span> <strong>{tipo}</strong></div>
                  )}
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
                    fontSize: '32px', background: config.fotoFondo
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
          ) : (
            <div
              ref={fotocheckRef}
              style={{ width: '216px', height: '342px', fontFamily: 'Arial, sans-serif' }}
              className="relative rounded-xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div style={{ background: config.colorHeader, height: '110px', position: 'relative', flexShrink: 0 }}>
                <div style={{
                  position: 'absolute', inset: 0, opacity: 0.15,
                  backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
                  backgroundSize: '12px 12px'
                }} />
                {/* Logo */}
                <div style={{
                  position: 'absolute', top: '10px', left: '10px',
                  width: '48px', height: '48px', borderRadius: '8px',
                  overflow: 'hidden', background: 'white', padding: '3px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {logoEscuela ? (
                    <img src={logoEscuela} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '20px' }}>🏫</span>
                  )}
                </div>
                {/* Etiqueta */}
                <div style={{
                  position: 'absolute', top: '66px', left: '10px', right: '10px',
                  color: 'white', fontWeight: 'bold', fontSize: '14px',
                  textShadow: '0 1px 3px rgba(0,0,0,0.4)'
                }}>
                  {config.etiqueta}
                </div>
              </div>

              {/* Cuerpo blanco en columna */}
              <div style={{
                background: 'white', flex: 1, position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '16px 10px 0'
              }}>
                {/* Foto circular */}
                <div style={{
                  width: '90px', height: '90px', borderRadius: '50%',
                  border: '3px solid white', overflow: 'hidden', background: '#e5e7eb',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)', marginTop: '-30px',
                  flexShrink: 0
                }}>
                  {foto ? (
                    <img src={foto} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '30px', background: config.fotoFondo
                    }}>👤</div>
                  )}
                </div>

                {/* Nombre */}
                <p style={{
                  fontSize: '13px', fontWeight: 'bold', color: '#1e293b',
                  textAlign: 'center', marginTop: '10px', lineHeight: '1.3'
                }}>{nombre || ''}</p>

                {/* Datos */}
                <div style={{ fontSize: '10px', color: '#333', lineHeight: '1.9', textAlign: 'center', marginTop: '6px' }}>
                  {esEstudiante ? (
                    <>
                      <div><span style={{ color: '#666' }}>Grado:</span> <strong>{grado || ''}</strong>{seccion ? ` "${seccion}"` : ''}</div>
                    </>
                  ) : (
                    <div><span style={{ color: '#666' }}>Cargo:</span> <strong>{tipo}</strong></div>
                  )}
                  <div><span style={{ color: '#666' }}>Año:</span> <strong>{anio || ''}</strong></div>
                </div>

                {/* Espaciador flexible */}
                <div style={{ flex: 1 }} />

                {/* Código de barras */}
                <div style={{
                  width: '100%', background: 'white', borderRadius: '8px',
                  padding: '3px', marginBottom: '14px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
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

                {/* Franja inferior */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '8px', background: config.colorFranja
                }} />
              </div>
            </div>
          )}

          <p className="text-muted text-xs mt-4 text-center">
            {orientacion === 'horizontal'
              ? 'Tamaño real: 85.6 × 54 mm (tarjeta estándar)'
              : 'Tamaño real: 54 × 85.6 mm (tarjeta estándar vertical)'}
          </p>
        </div>
      </div>
    </div>
  );
}