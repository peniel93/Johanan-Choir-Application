import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { Lyric } from '../types';

export type LyricExportFormat = 'pdf' | 'doc' | 'image';

const DEFAULT_EXPORT_DIR = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 64);
}

function toFileBaseName(lyric: Lyric) {
  const numberPrefix = lyric.number != null ? `song_${lyric.number}_` : 'song_';
  const safeTitle = sanitizeFileName(lyric.title || 'lyrics');
  return `${numberPrefix}${safeTitle || 'lyrics'}`;
}

function buildLyricHtml(lyric: Lyric) {
  const transpose = `${(lyric.transpose ?? 0) > 0 ? '+' : ''}${lyric.transpose ?? 0}`;
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          .meta { margin: 0 0 18px; color: #334155; font-size: 14px; }
          .content { white-space: pre-wrap; line-height: 1.7; font-size: 16px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(lyric.title)}</h1>
        <p class="meta">#${lyric.number ?? '-'} • ${escapeHtml(lyric.scale)} • ${escapeHtml(lyric.rhythm)} • Transpose ${transpose}</p>
        <div class="content">${escapeHtml(lyric.content)}</div>
      </body>
    </html>
  `;
}

function wrapTextLines(input: string, maxChars: number) {
  const lines: string[] = [];
  const rawLines = input.split('\n');

  for (const raw of rawLines) {
    const words = raw.split(/\s+/).filter((item) => item.length > 0);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let current = '';
    for (const word of words) {
      const proposal = current ? `${current} ${word}` : word;
      if (proposal.length <= maxChars) {
        current = proposal;
      } else {
        if (current) {
          lines.push(current);
        }
        current = word;
      }
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines;
}

function buildLyricSvg(lyric: Lyric) {
  const title = escapeHtml(lyric.title);
  const meta = escapeHtml(`#${lyric.number ?? '-'} • ${lyric.scale} • ${lyric.rhythm}`);
  const textLines = wrapTextLines(lyric.content, 48).slice(0, 70);
  const lineHeight = 24;
  const startY = 140;
  const content = textLines
    .map((line, index) => {
      const y = startY + index * lineHeight;
      return `<text x="56" y="${y}" font-size="22" fill="#0f172a">${escapeHtml(line)}</text>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="#f8fafc" />
  <rect x="36" y="36" width="1008" height="1848" rx="24" fill="#ffffff" stroke="#bfdbfe" stroke-width="2" />
  <text x="56" y="86" font-size="38" font-weight="700" fill="#1e3a8a">${title}</text>
  <text x="56" y="122" font-size="20" fill="#334155">${meta}</text>
  ${content}
</svg>`;
}

async function ensureExportPath(fileName: string) {
  if (!DEFAULT_EXPORT_DIR) {
    throw new Error('No writable export directory is available.');
  }

  return `${DEFAULT_EXPORT_DIR}${fileName}`;
}

async function removeExistingFile(filePath: string) {
  const info = await FileSystem.getInfoAsync(filePath);
  if (info.exists) {
    await FileSystem.deleteAsync(filePath, { idempotent: true });
  }
}

async function downloadInBrowser(uri: string, fileName: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

async function shareOnNative(uri: string, fileName: string, mimeType: string) {
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: fileName,
  });

  return uri;
}

async function exportPdf(lyric: Lyric) {
  const base = toFileBaseName(lyric);
  const html = buildLyricHtml(lyric);
  const generated = await Print.printToFileAsync({ html, base64: false });
  const targetPath = await ensureExportPath(`${base}.pdf`);
  await removeExistingFile(targetPath);
  await FileSystem.moveAsync({ from: generated.uri, to: targetPath });
  return { uri: targetPath, mimeType: 'application/pdf' };
}

async function exportDoc(lyric: Lyric) {
  const base = toFileBaseName(lyric);
  const html = buildLyricHtml(lyric);
  const targetPath = await ensureExportPath(`${base}.doc`);
  await removeExistingFile(targetPath);
  await FileSystem.writeAsStringAsync(targetPath, html, { encoding: FileSystem.EncodingType.UTF8 });
  return { uri: targetPath, mimeType: 'application/msword' };
}

async function exportImage(lyric: Lyric) {
  const base = toFileBaseName(lyric);
  const svg = buildLyricSvg(lyric);
  const targetPath = await ensureExportPath(`${base}.svg`);
  await removeExistingFile(targetPath);
  await FileSystem.writeAsStringAsync(targetPath, svg, { encoding: FileSystem.EncodingType.UTF8 });
  return { uri: targetPath, mimeType: 'image/svg+xml' };
}

export async function exportLyricFile(lyric: Lyric, format: LyricExportFormat) {
  if (format === 'pdf') {
    return exportPdf(lyric);
  }

  if (format === 'doc') {
    return exportDoc(lyric);
  }

  return exportImage(lyric);
}

export async function downloadLyricExport(lyric: Lyric, format: LyricExportFormat) {
  const output = await exportLyricFile(lyric, format);
  const fileName = `${toFileBaseName(lyric)}.${format === 'pdf' ? 'pdf' : format === 'doc' ? 'doc' : 'svg'}`;

  if (Platform.OS === 'web') {
    await downloadInBrowser(output.uri, fileName);
    return output.uri;
  }

  if (format === 'doc' || format === 'image') {
    return shareOnNative(output.uri, fileName, output.mimeType);
  }

  return output.uri;
}

export async function exportAndShareLyric(lyric: Lyric, format: LyricExportFormat) {
  const output = await exportLyricFile(lyric, format);
  const fileName = `${toFileBaseName(lyric)}.${format === 'pdf' ? 'pdf' : format === 'doc' ? 'doc' : 'svg'}`;

  if (Platform.OS === 'web') {
    await downloadInBrowser(output.uri, fileName);
    return output.uri;
  }

  return shareOnNative(output.uri, fileName, output.mimeType);
}

export async function printLyricPdf(lyric: Lyric) {
  const html = buildLyricHtml(lyric);
  await Print.printAsync({ html });
}

function buildLyricImagePrintHtml(lyric: Lyric) {
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          html, body { margin: 0; padding: 0; background: #f8fafc; }
          body { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
          svg { width: 100%; height: auto; max-width: 1080px; }
        </style>
      </head>
      <body>
        ${buildLyricSvg(lyric)}
      </body>
    </html>
  `;
}

export async function printLyricDoc(lyric: Lyric) {
  const html = buildLyricHtml(lyric);
  await Print.printAsync({ html });
}

export async function printLyricImage(lyric: Lyric) {
  const html = buildLyricImagePrintHtml(lyric);
  await Print.printAsync({ html });
}
