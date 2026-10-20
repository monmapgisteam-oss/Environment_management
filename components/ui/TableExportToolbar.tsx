'use client';

import { HiClipboardCopy, HiDocumentText, HiPrinter, HiTable } from 'react-icons/hi';

type Props = {
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
  fileName?: string;
};

const pdfPage = {
  width: 841.89,
  height: 595.28,
};

function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function dataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = String(text || '-').split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const lines = wrapCanvasText(context, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => {
    const suffix = index === maxLines - 1 && wrapCanvasText(context, text, maxWidth).length > maxLines ? '...' : '';
    context.fillText(`${line}${suffix}`, x, y + index * lineHeight);
  });
}

function renderPdfPages(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const canvasWidth = 1684;
  const canvasHeight = 1190;
  const margin = 44;
  const titleHeight = 52;
  const headerHeight = 58;
  const rowHeight = 54;
  const usableWidth = canvasWidth - margin * 2;
  const rowsPerPage = Math.max(1, Math.floor((canvasHeight - margin * 2 - titleHeight - headerHeight) / rowHeight));
  const colRatios = [0.04, 0.12, 0.14, 0.13, 0.19, 0.12, 0.1, 0.12, 0.14];
  const totalRatio = colRatios.slice(0, headers.length).reduce((sum, value) => sum + value, 0);
  const colWidths = headers.map((_, index) => (usableWidth * (colRatios[index] || 0.1)) / totalRatio);
  const pages: Uint8Array[] = [];
  const pageCount = Math.max(1, Math.ceil(rows.length / rowsPerPage));

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext('2d');
    if (!context) continue;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = '#0f172a';
    context.font = '700 30px Arial, sans-serif';
    context.fillText('Ерөнхий үнэлгээний дүгнэлт', margin, margin + 6);
    context.font = '400 18px Arial, sans-serif';
    context.fillStyle = '#64748b';
    context.fillText(`Хуудас ${pageIndex + 1}/${pageCount}`, canvasWidth - margin - 120, margin + 6);

    let x = margin;
    const headerY = margin + titleHeight;
    context.fillStyle = '#0F766E';
    context.fillRect(margin, headerY, usableWidth, headerHeight);
    context.strokeStyle = '#dbeafe';
    context.lineWidth = 1;
    context.font = '700 15px Arial, sans-serif';
    context.fillStyle = '#ffffff';
    headers.forEach((header, index) => {
      context.strokeRect(x, headerY, colWidths[index], headerHeight);
      drawWrappedText(context, header, x + 8, headerY + 20, colWidths[index] - 16, 17, 2);
      x += colWidths[index];
    });

    const pageRows = rows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    context.font = '400 15px Arial, sans-serif';
    pageRows.forEach((row, rowIndex) => {
      const y = headerY + headerHeight + rowIndex * rowHeight;
      context.fillStyle = rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
      context.fillRect(margin, y, usableWidth, rowHeight);
      context.strokeStyle = '#e2e8f0';
      x = margin;
      row.forEach((cell, cellIndex) => {
        context.strokeRect(x, y, colWidths[cellIndex], rowHeight);
        context.fillStyle = '#0f172a';
        drawWrappedText(context, String(cell ?? '-'), x + 8, y + 20, colWidths[cellIndex] - 16, 17, 2);
        x += colWidths[cellIndex];
      });
    });

    pages.push(dataUrlBytes(canvas.toDataURL('image/jpeg', 0.92)));
  }

  return { pages, width: canvasWidth, height: canvasHeight };
}

function buildPdf(imagePages: Uint8Array[], imageWidth: number, imageHeight: number) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    length += bytes.length;
  };

  const addObject = (id: number, body: Array<string | Uint8Array> | string) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    if (Array.isArray(body)) {
      body.forEach(push);
    } else {
      push(body);
    }
    push('\nendobj\n');
  };

  push('%PDF-1.4\n');
  addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
  const pageIds = imagePages.map((_, index) => 3 + index * 3);
  addObject(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);

  imagePages.forEach((image, index) => {
    const pageObjectId = 3 + index * 3;
    const imageObjectId = pageObjectId + 1;
    const contentObjectId = pageObjectId + 2;
    const imageName = `Im${index + 1}`;
    const content = `q\n${pdfPage.width} 0 0 ${pdfPage.height} 0 0 cm\n/${imageName} Do\nQ`;

    addObject(
      pageObjectId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfPage.width} ${pdfPage.height}] /Resources << /XObject << /${imageName} ${imageObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
    addObject(imageObjectId, [
      `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`,
      image,
      '\nendstream',
    ]);
    addObject(contentObjectId, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  const xrefOffset = length;
  push(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (let id = 1; id < offsets.length; id += 1) {
    push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const output = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  return output;
}

export default function TableExportToolbar({ headers, rows, fileName = 'table' }: Props) {
  const matrix = [headers, ...rows];

  const handleCopy = async () => {
    const text = matrix.map((row) => row.map((cell) => String(cell ?? '')).join('\t')).join('\n');
    await navigator.clipboard.writeText(text);
  };

  const downloadExcel = () => {
    const content = matrix.map((row) => row.map((cell) => csvCell(cell)).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const rendered = renderPdfPages(headers, rows);
    const pdf = buildPdf(rendered.pages, rendered.width, rendered.height);
    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-900">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-xs font-bold uppercase tracking-wide text-emerald-700">Экспорт</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3.5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          <HiClipboardCopy size={17} />
          Хуулах
        </button>
        <button
          type="button"
          onClick={downloadExcel}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3.5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          <HiTable size={17} />
          Excel
        </button>
        <button
          type="button"
          onClick={downloadPdf}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3.5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          <HiDocumentText size={17} />
          PDF
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3.5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          <HiPrinter size={17} />
          Хэвлэх
        </button>
      </div>
    </div>
  );
}
