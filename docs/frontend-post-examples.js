/**
 * 📸 Ejemplo de Uso - Crear Publicación con Multimedia (R2)
 * 
 * Este archivo muestra cómo crear publicaciones con imágenes y videos
 * usando el nuevo sistema de Cloudflare R2.
 */

// ============================================
// OPCIÓN 1: FormData (RECOMENDADO - USA R2)
// ============================================

/**
 * Crear publicación con archivos multimedia
 * Los archivos se suben automáticamente a Cloudflare R2
 */
async function createPostWithMedia(contenido, files, privacidad = 'publico') {
    const formData = new FormData();

    // Agregar contenido y configuración
    formData.append('contenido', contenido);
    formData.append('privacidad', privacidad);

    // Agregar archivos (imágenes y/o videos)
    files.forEach(file => {
        formData.append('media', file);
    });

    try {
        const response = await fetch('http://localhost:3001/api/publicaciones', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
                // NO incluir 'Content-Type', el navegador lo configura automáticamente
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ Publicación creada:', data.data);
            return data.data;
        } else {
            console.error('❌ Error:', data.message);
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('❌ Error al crear publicación:', error);
        throw error;
    }
}

// ============================================
// EJEMPLO DE USO EN REACT
// ============================================

import React, { useState } from 'react';

function CreatePostForm() {
    const [contenido, setContenido] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [loading, setLoading] = useState(false);

    // Manejar selección de archivos
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);

        // Validar cantidad (máximo 10)
        if (files.length > 10) {
            alert('Máximo 10 archivos permitidos');
            return;
        }

        // Validar tamaño (máximo 50MB por archivo)
        const invalidFiles = files.filter(f => f.size > 50 * 1024 * 1024);
        if (invalidFiles.length > 0) {
            alert('Algunos archivos superan el límite de 50MB');
            return;
        }

        setSelectedFiles(files);

        // Crear previews
        const newPreviews = files.map(file => ({
            name: file.name,
            type: file.type,
            url: URL.createObjectURL(file)
        }));
        setPreviews(newPreviews);
    };

    // Enviar publicación
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!contenido.trim() && selectedFiles.length === 0) {
            alert('Debes escribir algo o adjuntar archivos');
            return;
        }

        setLoading(true);

        try {
            const post = await createPostWithMedia(contenido, selectedFiles, 'publico');

            console.log('✅ Publicación creada exitosamente:', post);

            // Limpiar formulario
            setContenido('');
            setSelectedFiles([]);
            setPreviews([]);

            // Liberar URLs de preview
            previews.forEach(p => URL.revokeObjectURL(p.url));

            alert('¡Publicación creada exitosamente!');
        } catch (error) {
            console.error('Error:', error);
            alert('Error al crear publicación: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-post-form">
            <h2>Crear Publicación</h2>

            <form onSubmit={handleSubmit}>
                {/* Textarea para contenido */}
                <textarea
                    value={contenido}
                    onChange={(e) => setContenido(e.target.value)}
                    placeholder="¿Qué estás pensando?"
                    rows={4}
                    style={{ width: '100%', padding: '10px' }}
                />

                {/* Input para archivos */}
                <div style={{ marginTop: '10px' }}>
                    <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        id="file-input"
                    />
                    <label
                        htmlFor="file-input"
                        style={{
                            padding: '10px 20px',
                            background: '#007bff',
                            color: 'white',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            display: 'inline-block'
                        }}
                    >
                        📎 Adjuntar Archivos (Máx. 10)
                    </label>
                </div>

                {/* Previews de archivos seleccionados */}
                {previews.length > 0 && (
                    <div style={{ marginTop: '15px' }}>
                        <h4>Archivos seleccionados ({previews.length}/10):</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {previews.map((preview, index) => (
                                <div key={index} style={{ position: 'relative' }}>
                                    {preview.type.startsWith('image/') ? (
                                        <img
                                            src={preview.url}
                                            alt={preview.name}
                                            style={{
                                                width: '100px',
                                                height: '100px',
                                                objectFit: 'cover',
                                                borderRadius: '5px'
                                            }}
                                        />
                                    ) : (
                                        <video
                                            src={preview.url}
                                            style={{
                                                width: '100px',
                                                height: '100px',
                                                objectFit: 'cover',
                                                borderRadius: '5px'
                                            }}
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newFiles = selectedFiles.filter((_, i) => i !== index);
                                            const newPreviews = previews.filter((_, i) => i !== index);
                                            URL.revokeObjectURL(preview.url);
                                            setSelectedFiles(newFiles);
                                            setPreviews(newPreviews);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '5px',
                                            right: '5px',
                                            background: 'red',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '25px',
                                            height: '25px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Botón de enviar */}
                <button
                    type="submit"
                    disabled={loading || (!contenido.trim() && selectedFiles.length === 0)}
                    style={{
                        marginTop: '15px',
                        padding: '10px 30px',
                        background: loading ? '#ccc' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '16px'
                    }}
                >
                    {loading ? '📤 Publicando...' : '📝 Publicar'}
                </button>
            </form>
        </div>
    );
}

export default CreatePostForm;

// ============================================
// OPCIÓN 2: Base64 (LEGACY - NO RECOMENDADO)
// ============================================

/**
 * Convertir archivo a Base64
 * NOTA: No recomendado para archivos grandes
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Crear publicación con base64 (legacy)
 */
async function createPostWithBase64(contenido, imageFiles, videoFiles) {
    // Convertir archivos a base64
    const images = await Promise.all(
        imageFiles.map(file => fileToBase64(file))
    );

    const videos = await Promise.all(
        videoFiles.map(file => fileToBase64(file))
    );

    const response = await fetch('http://localhost:3001/api/publicaciones', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contenido,
            privacidad: 'publico',
            images,
            videos
        })
    });

    return await response.json();
}

// ============================================
// EJEMPLO CON AXIOS
// ============================================

import axios from 'axios';

async function createPostWithAxios(contenido, files) {
    const formData = new FormData();
    formData.append('contenido', contenido);
    formData.append('privacidad', 'publico');

    files.forEach(file => {
        formData.append('media', file);
    });

    try {
        const response = await axios.post(
            'http://localhost:3001/api/publicaciones',
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    console.log(`📤 Progreso: ${percentCompleted}%`);
                }
            }
        );

        return response.data.data;
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        throw error;
    }
}

// ============================================
// VALIDACIONES ÚTILES
// ============================================

/**
 * Validar archivo antes de subirlo
 */
function validateFile(file) {
    const errors = [];

    // Validar tamaño (50MB)
    if (file.size > 50 * 1024 * 1024) {
        errors.push('El archivo supera el límite de 50MB');
    }

    // Validar tipo
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime'
    ];

    if (!allowedTypes.includes(file.type)) {
        errors.push('Tipo de archivo no permitido');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validar múltiples archivos
 */
function validateFiles(files) {
    if (files.length > 10) {
        return {
            valid: false,
            errors: ['Máximo 10 archivos permitidos']
        };
    }

    const allErrors = [];
    files.forEach((file, index) => {
        const validation = validateFile(file);
        if (!validation.valid) {
            allErrors.push(`Archivo ${index + 1}: ${validation.errors.join(', ')}`);
        }
    });

    return {
        valid: allErrors.length === 0,
        errors: allErrors
    };
}
