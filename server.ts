import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

// Increase payload limit for base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Gemini SDK with User-Agent as required by skill
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const uploadsDir = path.resolve(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Target Google Drive Folder ID from specification
const DRIVE_TARGET_FOLDER_ID = '1RYaaDoEhuxFuWq2zfyleAbtdIgpd6I8_';

/**
 * AI Refine Motor Ad Endpoint
 * Refines ad text while preserving strict factual integrity
 */
app.post('/api/ai/refine-ad', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Teks motor wajib diisi' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Teks terlalu panjang (maks 5000 karakter)' });
    }

    const systemInstruction = `Anda adalah asisten pemasaran motor profesional untuk sales motor di Indonesia.
Tugas Anda adalah merapikan ejaan, tata bahasa, dan memformat teks iklan jual motor agar menarik, rapi, meyakinkan, dan siap dibagikan ke WhatsApp serta Facebook Marketplace.

ATURAN WAJIB DAN KETAT:
1. Pertahankan SELURUH fakta asli yang dituliskan oleh pengguna (merek, tipe model, kapasitas mesin cc, tahun produksi, warna motor, kondisi mesin/bodi, status pajak, kelengkapan surat STNK/BPKB, serta harga jika ada).
2. DILARANG KERAS mengarang, mereka-reka, atau menambahkan informasi yang TIDAK disebutkan (seperti mengarang angka kilometer, mengarang garansi dealer, mengarang harga baru, atau klaim mulus jika tidak ditulis).
3. Jika informasi tertentu tidak disebutkan pengguna, jangan menebak atau membuat asumsi.
4. Tampilkan harga HANYA JIKA pengguna secara eksplisit menuliskannya dalam teks asal. Format harga dengan rapi (misal: Rp21.000.000).
5. Format iklan harus rapi dan terstruktur:
   - JUDUL MENARIK & JELAS DENGAN HURUF KAPITAL (misal: "HONDA VARIO 160 TAHUN 2023 - PAJAK PANJANG")
   - Poin-poin spesifikasi & kondisi yang jelas menggunakan emoji rapi (seperti ✅, 🏍️, 📋, 💰)
   - Status surat-surat & pajak
   - Keterangan harga dan nego (hanya jika ada di teks input)
   - Call to action sopan dan jelas untuk hubungi sales / cek unit langsung.
6. Kembalikan HANYA teks iklan jadi yang siap diposting, tanpa pembuka/penutup basa-basi dari AI.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Berikut teks draft dari pengguna untuk diperbaiki:\n\n"${text.trim()}"`,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });
    } catch (primaryErr: any) {
      console.warn('Primary model error, attempting fallback to gemini-3.8-flash:', primaryErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Berikut teks draft dari pengguna untuk diperbaiki:\n\n"${text.trim()}"`,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });
    }

    const refinedText = response.text?.trim() || '';
    if (!refinedText) {
      return res.status(500).json({ error: 'Gagal membuat teks iklan dari AI' });
    }

    return res.json({ refinedText });
  } catch (error: any) {
    console.error('Error in /api/ai/refine-ad:', error);
    return res.status(500).json({
      error: error?.message || 'Terjadi kesalahan saat memproses AI. Silakan coba lagi.',
    });
  }
});

/**
 * Image & Drive Upload Endpoint
 * Always saves image to server /uploads folder, and if Google Drive token is present,
 * synchronizes to the target Drive folder. Never fails with 401.
 */
app.post('/api/drive/upload', async (req, res) => {
  try {
    const { fileName, mimeType, base64Data } = req.body;
    if (!fileName || !base64Data) {
      return res.status(400).json({ error: 'Nama file dan data gambar wajib disertakan' });
    }

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const contentType = mimeType || 'image/jpeg';

    // 1. Always save file locally on server for fast, 100% reliable image serving
    const localFilePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(localFilePath, buffer);

    const localUrl = `/uploads/${encodeURIComponent(fileName)}`;
    let fileId = `IMG_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let viewUrl = localUrl;
    let downloadUrl = localUrl;
    let drivePreviewUrl = `https://drive.google.com/drive/folders/${DRIVE_TARGET_FOLDER_ID}`;
    let thumbnailUrl = localUrl;

    // 2. If Bearer token is provided, upload to Google Drive
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1];
      try {
        const metadata = {
          name: fileName,
          parents: [DRIVE_TARGET_FOLDER_ID],
          description: 'Foto motor dari aplikasi JUAL MOTOR',
        };

        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const multipartRequestBody = Buffer.concat([
          Buffer.from(
            delimiter +
              'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
              JSON.stringify(metadata) +
              delimiter +
              `Content-Type: ${contentType}\r\n\r\n`
          ),
          buffer,
          Buffer.from(closeDelimiter),
        ]);

        const driveRes = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
              'Content-Length': multipartRequestBody.length.toString(),
            },
            body: multipartRequestBody,
          }
        );

        if (driveRes.ok) {
          const driveData = await driveRes.json();
          fileId = driveData.id;
          viewUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
          downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
          drivePreviewUrl = driveData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
          thumbnailUrl = viewUrl;

          // Attempt public read permission
          fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: 'reader', type: 'anyone' }),
          }).catch(() => {});
        }
      } catch (driveErr) {
        console.warn('Google Drive sync skipped, using local URL:', driveErr);
      }
    }

    return res.json({
      fileId,
      fileName,
      mimeType: contentType,
      size: buffer.length,
      viewUrl,
      downloadUrl,
      drivePreviewUrl,
      thumbnailUrl,
    });
  } catch (error: any) {
    console.error('Upload exception:', error);
    return res.status(500).json({ error: error?.message || 'Server error processing image' });
  }
});

/**
 * Delete File Endpoint
 */
app.delete('/api/drive/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({ error: 'File ID tidak valid' });
    }

    // Delete from Drive if token present and real Drive ID
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && !fileId.startsWith('IMG_')) {
      const accessToken = authHeader.split(' ')[1];
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (err) {
        console.warn('Drive deletion error:', err);
      }
    }

    return res.json({ success: true, fileId });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Server error deleting file' });
  }
});

/**
 * Google Drive Folder Verification Endpoint
 */
app.get('/api/drive/check-folder', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Autentikasi Google Drive diperlukan' });
    }
    const accessToken = authHeader.split(' ')[1];

    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${DRIVE_TARGET_FOLDER_ID}?fields=id,name,capabilities`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!driveRes.ok) {
      const errText = await driveRes.text();
      return res.status(driveRes.status).json({
        accessible: false,
        folderId: DRIVE_TARGET_FOLDER_ID,
        error: errText,
      });
    }

    const data = await driveRes.json();
    return res.json({
      accessible: true,
      folderId: DRIVE_TARGET_FOLDER_ID,
      folderName: data.name,
      canAddChildren: data.capabilities?.canAddChildren ?? true,
    });
  } catch (error: any) {
    return res.status(500).json({ accessible: false, error: error?.message });
  }
});

// Mount Vite or serve static
async function startServer() {
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`JUAL MOTOR server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
