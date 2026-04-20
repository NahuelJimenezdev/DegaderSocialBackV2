# Diseño de Alertas Estilo iOS (Glassmorphism)

Este documento describe las características visuales y técnicas para replicar el estilo de alertas de iOS en la web, utilizando Tailwind CSS.

## 🎨 Características Visuales

1.  **Glassmorphism (Efecto Vidrio):**
    *   Fondo translúcido con desenfoque: `backdrop-blur-xl`.
    *   Color base con opacidad: `bg-white/90` (claro) o `bg-gray-800/90` (oscuro).
    *   Bordes sutiles para profundidad: `border border-white/20`.

2.  **Backdrop (Fondo Oscurecido):**
    *   El fondo detrás de la alerta se oscurece y desenfoca para centrar la atención.
    *   Clases: `bg-black/30 backdrop-blur-sm`.

3.  **Tipografía y Layout:**
    *   **Título:** Texto oscuro/blanco, peso `font-semibold`, tamaño `text-lg`.
    *   **Mensaje:** Texto gris (`text-gray-500`), tamaño `text-[15px]`, espaciado `leading-relaxed`.
    *   **Iconografía:** Icono circular centrado en la parte superior con fondo suave (`bg-blue-100` + `text-blue-600`).

4.  **Botones (Stack Vertical):**
    *   En móvil/iOS, los botones de acción suelen apilarse verticalmente.
    *   **Acción Principal:** Texto azul (`text-blue-600`), `font-semibold`.
    *   **Cancelar:** Texto gris o azul, separado por una línea divisoria (`border-t`).
    *   **Feedback Táctil:** Estados `active:bg-gray-100` para simular el toque nativo.

5.  **Animaciones de Entrada:**
    *   `animate-in fade-in zoom-in-95 duration-200`: Efecto de aparecer suavemente ("pop-up").

## 💻 Código Base (Componente React)

```jsx
<div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
  {/* 1. Backdrop */}
  <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
  
  {/* 2. Contenedor de la Alerta */}
  <div className="relative w-full max-w-xs bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
    
    {/* 3. Contenido (Icono + Texto) */}
    <div className="p-6 text-center">
      {/* Icono */}
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">lock</span>
      </div>
      
      {/* Título & Mensaje */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 leading-tight">Título</h3>
      <p className="text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed">Mensaje descriptivo.</p>
    </div>

    {/* 4. Botones Stacked */}
    <div className="flex flex-col border-t border-gray-200 dark:border-gray-700/50">
      <button className="w-full py-3.5 text-[17px] text-blue-600 dark:text-blue-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/30 active:bg-gray-100 transition-colors">
        Acción Principal
      </button>
      
      <div className="border-t border-gray-200 dark:border-gray-700/50">
        <button className="w-full py-3.5 text-[17px] text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700/30 active:bg-gray-100 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  </div>
</div>
```
