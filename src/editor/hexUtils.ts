export function formatHexByte(byte: number): string {
  return (byte & 0xff).toString(16).padStart(2, "0").toUpperCase();
}

export function formatHexOffset(offset: number, padding = 8): string {
  return Math.max(0, offset).toString(16).padStart(padding, "0").toUpperCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB (${bytes.toLocaleString()} bytes)`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB (${bytes.toLocaleString()} bytes)`;
}

export function isPrintableAscii(byte: number): boolean {
  return byte >= 32 && byte <= 126;
}

export function toAsciiChar(byte: number): string {
  return isPrintableAscii(byte) ? String.fromCharCode(byte) : "·";
}

export function parseOffsetInput(input: string, maxOffset: number): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let parsed: number;
  if (/^0x/i.test(trimmed)) {
    parsed = parseInt(trimmed.slice(2), 16);
  } else if (/^[0-9a-f]+$/i.test(trimmed) && /[a-f]/i.test(trimmed)) {
    parsed = parseInt(trimmed, 16);
  } else {
    parsed = parseInt(trimmed, 10);
  }
  if (isNaN(parsed) || parsed < 0) return null;
  return Math.min(parsed, Math.max(0, maxOffset));
}

export type ByteInspectorData = {
  offset: number;
  uint8: number;
  int8: number;
  binary: string;
  ascii: string;
  uint16Le: number | null;
  uint16Be: number | null;
  int16Le: number | null;
  int16Be: number | null;
  uint32Le: number | null;
  uint32Be: number | null;
  int32Le: number | null;
  int32Be: number | null;
  float32Le: number | null;
};

export function readIntegerValues(data: Uint8Array, offset: number): ByteInspectorData | null {
  if (offset < 0 || offset >= data.length) return null;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const uint8 = view.getUint8(offset);
  const int8 = view.getInt8(offset);
  const binary = uint8.toString(2).padStart(8, "0");
  const ascii = isPrintableAscii(uint8) ? `'${String.fromCharCode(uint8)}'` : "<non-printable>";

  let uint16Le: number | null = null;
  let uint16Be: number | null = null;
  let int16Le: number | null = null;
  let int16Be: number | null = null;
  if (offset + 2 <= data.length) {
    uint16Le = view.getUint16(offset, true);
    uint16Be = view.getUint16(offset, false);
    int16Le = view.getInt16(offset, true);
    int16Be = view.getInt16(offset, false);
  }

  let uint32Le: number | null = null;
  let uint32Be: number | null = null;
  let int32Le: number | null = null;
  let int32Be: number | null = null;
  let float32Le: number | null = null;
  if (offset + 4 <= data.length) {
    uint32Le = view.getUint32(offset, true);
    uint32Be = view.getUint32(offset, false);
    int32Le = view.getInt32(offset, true);
    int32Be = view.getInt32(offset, false);
    float32Le = view.getFloat32(offset, true);
  }

  return {
    offset,
    uint8,
    int8,
    binary,
    ascii,
    uint16Le,
    uint16Be,
    int16Le,
    int16Be,
    uint32Le,
    uint32Be,
    int32Le,
    int32Be,
    float32Le,
  };
}

export function searchBuffer(data: Uint8Array, query: string, mode: "text" | "hex"): number[] {
  if (!query.trim() || data.length === 0) return [];

  let needle: Uint8Array;
  if (mode === "text") {
    needle = new TextEncoder().encode(query);
  } else {
    // Hex mode: strip spaces and punctuation
    const hex = query.replace(/[^0-9a-fA-F]/g, "");
    if (hex.length === 0 || hex.length % 2 !== 0) return [];
    needle = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      needle[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
  }

  if (needle.length === 0 || needle.length > data.length) return [];

  const results: number[] = [];
  const max = data.length - needle.length;
  for (let i = 0; i <= max; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (data[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      results.push(i);
      // Cap at 1000 matches to prevent memory exhaustion
      if (results.length >= 1000) break;
    }
  }

  return results;
}
