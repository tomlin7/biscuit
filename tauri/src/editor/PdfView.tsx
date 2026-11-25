import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { basename } from "../workspace/path";
import { IconButton } from "../ui/IconButton";
import "./PdfView.css";

// Set worker source URL for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface Props {
  path: string;
}

export function PdfView({ path }: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState<string>("1");

  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // Load PDF Document when path changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    setPageInput("1");
    setScale(1.0);
    setRotation(0);

    async function loadPdf() {
      try {
        let data: Uint8Array;
        // In Tauri environment, load via plugin-fs readFile
        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          data = await readFile(path);
        } else {
          // Browser fallback
          const res = await fetch(convertFileSrc(path));
          if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch file`);
          const buf = await res.arrayBuffer();
          data = new Uint8Array(buf);
        }

        if (cancelled) return;

        if (loadingTaskRef.current) {
          void loadingTaskRef.current.destroy();
        }

        const loadingTask = pdfjsLib.getDocument({
          data,
          cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/cmaps/",
          cMapPacked: true,
        });
        loadingTaskRef.current = loadingTask;

        const doc = await loadingTask.promise;
        if (cancelled) {
          void loadingTask.destroy();
          return;
        }

        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          console.error("PDF load error:", err);
          setError(err?.message || "Failed to load PDF document");
          setLoading(false);
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore cancel error
        }
        renderTaskRef.current = null;
      }
      if (loadingTaskRef.current) {
        void loadingTaskRef.current.destroy();
        loadingTaskRef.current = null;
      }
      pdfDocRef.current = null;
    };
  }, [path]);

  // Keep page input in sync with currentPage
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Render current page when pdfDoc, currentPage, scale, or rotation changes
  useEffect(() => {
    const doc = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || loading || error || currentPage < 1) return;

    let cancelled = false;

    async function renderPage() {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
            await renderTaskRef.current.promise.catch(() => {});
          } catch {
            // ignore
          }
          renderTaskRef.current = null;
        }

        const page = await doc!.getPage(currentPage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale, rotation });
        const context = canvas!.getContext("2d");
        if (!context) return;

        // Scale canvas for sharp rendering on high-DPI screens
        const outputScale = window.devicePixelRatio || 1;
        canvas!.width = Math.floor(viewport.width * outputScale);
        canvas!.height = Math.floor(viewport.height * outputScale);
        canvas!.style.width = `${Math.floor(viewport.width)}px`;
        canvas!.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        const renderContext = {
          canvas: canvas!,
          canvasContext: context,
          viewport,
          transform,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException" && !cancelled) {
          console.error("PDF page render error:", err);
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        renderTaskRef.current = null;
      }
    };
  }, [currentPage, scale, rotation, loading, error]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const parsed = parseInt(pageInput, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
        setCurrentPage(parsed);
      } else {
        setPageInput(String(currentPage));
      }
    }
  };

  const handlePageInputBlur = () => {
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
      setCurrentPage(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const fileName = basename(path);

  return (
    <div className="pdf-view" data-testid="pdf-view">
      <div className="pdf-view__toolbar">
        <div className="pdf-view__toolbar-section">
          <IconButton
            icon={ChevronLeft}
            label="Previous page"
            size={14}
            disabled={currentPage <= 1 || loading || Boolean(error)}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          />
          <div className="pdf-view__page-indicator">
            <input
              type="text"
              className="pdf-view__page-input"
              value={pageInput}
              disabled={loading || Boolean(error) || numPages <= 1}
              onChange={handlePageInputChange}
              onKeyDown={handlePageInputKeyDown}
              onBlur={handlePageInputBlur}
              aria-label="Current page"
            />
            <span className="pdf-view__page-total">/ {numPages || 1}</span>
          </div>
          <IconButton
            icon={ChevronRight}
            label="Next page"
            size={14}
            disabled={currentPage >= numPages || loading || Boolean(error)}
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
          />
        </div>

        <div className="pdf-view__separator" />

        <div className="pdf-view__toolbar-section">
          <IconButton
            icon={Minus}
            label="Zoom out"
            size={14}
            disabled={loading || Boolean(error) || scale <= 0.25}
            onClick={() => setScale((s) => Math.max(0.25, Math.round((s - 0.25) * 100) / 100))}
          />
          <button
            type="button"
            className="pdf-view__zoom-label"
            title="Reset zoom to 100%"
            disabled={loading || Boolean(error)}
            onClick={() => setScale(1.0)}
          >
            {Math.round(scale * 100)}%
          </button>
          <IconButton
            icon={Plus}
            label="Zoom in"
            size={14}
            disabled={loading || Boolean(error) || scale >= 4.0}
            onClick={() => setScale((s) => Math.min(4.0, Math.round((s + 0.25) * 100) / 100))}
          />
          <IconButton
            icon={RotateCcw}
            label="Reset zoom"
            size={14}
            disabled={loading || Boolean(error)}
            onClick={() => setScale(1.0)}
          />
        </div>

        <div className="pdf-view__separator" />

        <div className="pdf-view__toolbar-section">
          <IconButton
            icon={RotateCcw}
            label="Rotate counter-clockwise"
            size={14}
            disabled={loading || Boolean(error)}
            onClick={() => setRotation((r) => (r + 270) % 360)}
          />
          <IconButton
            icon={RotateCw}
            label="Rotate clockwise"
            size={14}
            disabled={loading || Boolean(error)}
            onClick={() => setRotation((r) => (r + 90) % 360)}
          />
        </div>

        <div className="pdf-view__spacer" />

        <div className="pdf-view__file-label" title={path}>
          <FileText size={13} className="pdf-view__file-icon" />
          <span>{fileName}</span>
        </div>
      </div>

      <div className="pdf-view__stage">
        {loading && (
          <div className="pdf-view__status">
            <Loader2 size={24} className="pdf-view__spinner" />
            <span>Loading PDF...</span>
          </div>
        )}

        {error && (
          <div className="pdf-view__error">
            <AlertCircle size={20} className="pdf-view__error-icon" />
            <div className="pdf-view__error-message">
              <strong>Error loading PDF</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="pdf-view__canvas-container">
            <canvas ref={canvasRef} className="pdf-view__canvas" />
          </div>
        )}
      </div>
    </div>
  );
}
