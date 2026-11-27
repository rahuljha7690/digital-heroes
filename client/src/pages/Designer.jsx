
import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Canvas, Rect, IText, FabricImage } from 'fabric';
import {
  ArrowLeft,
  Type,
  ImagePlus,
  Download,
  Trash2,
} from 'lucide-react';

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 500;

// Printable area inside the canvas
const PRINT_AREA = {
  left: 50,
  top: 50,
  width: 600,
  height: 400,
};

const Designer = () => {
  const { slug } = useParams();

  const canvasElementRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const imageInputRef = useRef(null);

  const [text, setText] = useState('Your design text');
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState('#111827');
  const [canvasReady, setCanvasReady] = useState(false);

  // Initialise Fabric canvas
  useEffect(() => {
    if (!canvasElementRef.current) return;

    const canvas = new Canvas(canvasElementRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    });

    fabricCanvasRef.current = canvas;

    // Printable boundary
    const printBoundary = new Rect({
      left: PRINT_AREA.left,
      top: PRINT_AREA.top,
      width: PRINT_AREA.width,
      height: PRINT_AREA.height,
      fill: 'rgba(249, 115, 22, 0.025)',
      stroke: '#f97316',
      strokeWidth: 2,
      strokeDashArray: [8, 5],
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });

    canvas.add(printBoundary);
    canvas.sendObjectToBack(printBoundary);

    // Keep selected objects inside printable boundary
    const keepInsidePrintArea = (event) => {
      const object = event.target;
      if (!object) return;

      object.setCoords();

      const bounds = object.getBoundingRect();

      let deltaX = 0;
      let deltaY = 0;

      if (bounds.left < PRINT_AREA.left) {
        deltaX = PRINT_AREA.left - bounds.left;
      }

      if (bounds.top < PRINT_AREA.top) {
        deltaY = PRINT_AREA.top - bounds.top;
      }

      if (
        bounds.left + bounds.width >
        PRINT_AREA.left + PRINT_AREA.width
      ) {
        deltaX =
          PRINT_AREA.left +
          PRINT_AREA.width -
          (bounds.left + bounds.width);
      }

      if (
        bounds.top + bounds.height >
        PRINT_AREA.top + PRINT_AREA.height
      ) {
        deltaY =
          PRINT_AREA.top +
          PRINT_AREA.height -
          (bounds.top + bounds.height);
      }

      if (deltaX !== 0 || deltaY !== 0) {
        object.set({
          left: object.left + deltaX,
          top: object.top + deltaY,
        });

        object.setCoords();
      }
    };

    canvas.on('object:moving', keepInsidePrintArea);
    canvas.on('object:scaling', keepInsidePrintArea);
    canvas.on('object:rotating', keepInsidePrintArea);

    canvas.requestRenderAll();
    setCanvasReady(true);

    return () => {
      canvas.off('object:moving', keepInsidePrintArea);
      canvas.off('object:scaling', keepInsidePrintArea);
      canvas.off('object:rotating', keepInsidePrintArea);
      canvas.dispose();

      fabricCanvasRef.current = null;
      setCanvasReady(false);
    };
  }, []);

  // Add editable text
  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const textObject = new IText(text || 'Your text', {
      left: 150,
      top: 150,
      fontSize: Number(fontSize),
      fill: textColor,
      fontFamily: 'Arial',
      editable: true,
      padding: 8,
      cornerColor: '#f97316',
      borderColor: '#f97316',
      cornerSize: 10,
      transparentCorners: false,
    });

    canvas.add(textObject);
    canvas.setActiveObject(textObject);
    canvas.requestRenderAll();
  };

  // Upload a PNG or JPG image
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    const canvas = fabricCanvasRef.current;

    if (!file || !canvas) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      alert('Please upload a PNG or JPG image.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be 5 MB or less.');
      event.target.value = '';
      return;
    }

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;

        reader.readAsDataURL(file);
      });

      const image = await FabricImage.fromURL(dataUrl);

      const maxWidth = PRINT_AREA.width * 0.5;
      const maxHeight = PRINT_AREA.height * 0.5;

      const scale = Math.min(
        maxWidth / image.width,
        maxHeight / image.height,
        1
      );

      image.set({
        left: PRINT_AREA.left + 40,
        top: PRINT_AREA.top + 40,
        scaleX: scale,
        scaleY: scale,
        cornerColor: '#f97316',
        borderColor: '#f97316',
        transparentCorners: false,
      });

      canvas.add(image);
      canvas.setActiveObject(image);
      canvas.requestRenderAll();
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Unable to load this image.');
    }

    event.target.value = '';
  };

  // Delete selected object
  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();

    if (activeObject) {
      canvas.remove(activeObject);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
  };

  // Export design as PNG
  const exportDesign = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.discardActiveObject();
    canvas.requestRenderAll();

    const dataUrl = canvas.toDataURL({
      format: 'png',
      multiplier: 2,
      left: PRINT_AREA.left,
      top: PRINT_AREA.top,
      width: PRINT_AREA.width,
      height: PRINT_AREA.height,
    });

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${slug || 'design'}-preview.png`;
    link.click();
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-orange-600"
        >
          <ArrowLeft size={17} />
          Back to products
        </Link>

        <div className="mt-7">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-600">
            Digital Heroes / Design Studio
          </p>

          <h1 className="mt-2 text-3xl font-black text-gray-950 md:text-4xl">
            Create your design.
          </h1>

          <p className="mt-2 text-gray-500">
            Product: {slug?.replaceAll('-', ' ')}
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* Canvas area */}
          <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold text-gray-900">
                Design canvas
              </h2>

              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                Orange boundary = printable area
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl bg-gray-100 p-3">
              <div className="mx-auto w-fit">
                <canvas ref={canvasElementRef} />
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-400">
              Select an object to move, resize or rotate it.
              Double-click text to edit it.
            </p>
          </section>

          {/* Editing toolbar */}
          <aside className="h-fit space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

            <div>
              <h2 className="font-bold text-gray-900">
                Design tools
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Add and customise artwork.
              </p>
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-5">
              <label className="block text-sm font-bold text-gray-800">
                Add text
              </label>

              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Enter your text"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />

              <label className="block text-xs font-medium text-gray-500">
                Font size
              </label>

              <input
                type="number"
                min="8"
                max="150"
                value={fontSize}
                onChange={(event) =>
                  setFontSize(
                    Math.min(150, Math.max(8, Number(event.target.value) || 8))
                  )
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />

              <label className="block text-xs font-medium text-gray-500">
                Text colour
              </label>

              <input
                type="color"
                value={textColor}
                onChange={(event) => setTextColor(event.target.value)}
                className="h-10 w-full cursor-pointer rounded-lg border border-gray-200 p-1"
              />

              <button
                type="button"
                onClick={addText}
                disabled={!canvasReady}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                <Type size={17} />
                Add text to design
              </button>
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-5">
              <label className="block text-sm font-bold text-gray-800">
                Upload logo
              </label>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleImageUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={!canvasReady}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ImagePlus size={17} />
                Choose PNG / JPG
              </button>

              <p className="text-xs text-gray-400">
                Maximum image size: 5 MB.
              </p>
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={deleteSelected}
                disabled={!canvasReady}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={17} />
                Delete selected object
              </button>

              <button
                type="button"
                onClick={exportDesign}
                disabled={!canvasReady}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                <Download size={17} />
                Export PNG preview
              </button>
            </div>

          </aside>
        </div>
      </div>
    </main>
  );
};

export default Designer;
