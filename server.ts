/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase JSON body limits for base64 image uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Server-side Gemini API Client Setup
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY is not defined in the environment variables.");
}

// API endpoint for analyzing sugar and skin impact
app.post("/api/analyze-sugar", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "Kunci API Gemini (GEMINI_API_KEY) belum terkonfigurasi. Silakan konfigurasikan melalui panel Settings > Secrets di Google AI Studio.",
      });
    }

    const { description, image, imageType } = req.body;

    if (!description && !image) {
      return res.status(400).json({
        error: "Mohon sediakan teks deskripsi makanan atau unggah foto asupan Anda.",
      });
    }

    const parts: any[] = [];

    // Add user description if present
    if (description) {
      parts.push({
        text: `Teks Pengguna: "${description}"`,
      });
    }

    // Add image portion if present
    if (image && imageType) {
      // Remove data url prefix if present (e.g., data:image/png;base64,...)
      const base64Data = image.split(",")[1] || image;
      parts.push({
        inlineData: {
          mimeType: imageType,
          data: base64Data,
        },
      });
    }

    // Always append instruction for analysis context
    parts.push({
      text: "Silakan analisis makanan/minuman tersebut di atas secara akurat dan hitung kandungan gula tambahan (added sugar) dalam gram.",
    });

    // Define System Instruction matching user rules
    const systemInstruction = `Anda adalah seorang ahli gizi klinis dan spesialis perawatan kulit (dermatologis) profesional.
Tugas Anda adalah menganalisis asupan makanan dan minuman pengguna dari gambar yang diunggah, teks deskripsi, atau keduanya.
Fokus utama Anda adalah mengestimasi kandungan "gula tambahan" (added sugar) dalam gram (bukan total karbohidrat atau gula alami murninya buah utuh, melainkan kental manis, sirup gula, sukrosa, gula aren, dsb yang sengaja ditambahkan).

ATURAN ANALISIS:
1. Identifikasi setiap item makanan/minuman yang ada di gambar atau disebutkan dalam teks. Jika gambar tidak jelas, berikan tebakan terbaik yang paling menyehatkan/realistis.
2. Berikan estimasi kandungan gula tambahan (dalam gram) per item secara realistis berdasarkan standar umum medis / gizi.
3. Berikan SATU makanan alternatif pengganti secara keseluruhan yang paling sehat, rendah gula, dan ramah elastin/skin-barrier (makanan_alternatif), serta berikan alasan klinis/biologis yang mendalam (alasan_makanan) mengapa makanan tersebut sangat baik melindungi elastin, kolagen, serta mencegah penyumbatan pori atau kemunculan sebum berlebih.
4. Berikan SATU minuman alternatif pengganti secara keseluruhan yang paling sehat, rendah gula, dan ramah elastin/skin-barrier (minuman_alternatif), serta berikan alasan klinis/biologis yang mendalam (alasan_minuman) mengapa minuman tersebut ramah bagi kelembapan dermis raga.
5. Hitung total keseluruhan gula tambahan (added sugar) dalam gram.
6. Tentukan status berdasarkan batas harian WHO:
   - "Aman" jika total_gula < 25g
   - "Waspada" jika total_gula diantara 25g - 50g (inklusif)
   - "Berbahaya" jika total_gula > 50g
7. Buat satu kalimat pesan motivasi yang menghubungkan asupan gula ini dengan kesehatan kulit wajah (khususnya pencegahan inflamasi kulit, sebum berlebih, glikasi kolagen yang memicu keriput dini, atau jerawat). Pesan harus ditulis dalam Bahasa Indonesia yang suportif dan profesional.

Anda wajib merespons sepenuhnya dalam format JSON yang valid menggunakan skema yang ditentukan.`;

    // Define strict response schema in Indonesian according to requirements
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        daftar_item: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nama_makanan: {
                type: Type.STRING,
                description: "Nama instan makanan atau minuman yang berhasil diidentifikasi."
              },
              gula_gram: {
                type: Type.INTEGER,
                description: "Estimasi kandungan gula tambahan dalam gram per penyajian."
              }
            },
            required: ["nama_makanan", "gula_gram"]
          },
          description: "Daftar semua item makanan/minuman yang diidentifikasi."
        },
        total_gula: {
          type: Type.INTEGER,
          description: "Total akumulasi seluruh gula tambahan (added sugar) dalam gram."
        },
        status_who: {
          type: Type.STRING,
          description: "Status status_who berdasarkan batas harian WHO bergizi: 'Aman' | 'Waspada' | 'Berbahaya'."
        },
        pesan_kulit: {
          type: Type.STRING,
          description: "Satu kalimat motivasi/edukatif dermatolog tentang keterkaitan asupan ini dengan kulit wajah."
        },
        makanan_alternatif: {
          type: Type.STRING,
          description: "Satu rekomendasi makanan sehat skin-safe pengganti menu makanan yang dinilai."
        },
        alasan_makanan: {
          type: Type.STRING,
          description: "Alasan klinis/dermatologis kenapa rekomendasi makanan sehat ini ramah kulit, kolagen, dan sebum."
        },
        minuman_alternatif: {
          type: Type.STRING,
          description: "Satu rekomendasi minuman sehat skin-safe pengganti menu minuman yang dinilai."
        },
        alasan_minuman: {
          type: Type.STRING,
          description: "Alasan klinis/dermatologis kenapa rekomendasi minuman sehat ini ramah kulit, kelembapan dermis, dan sebum."
        }
      },
      required: ["daftar_item", "total_gula", "status_who", "pesan_kulit", "makanan_alternatif", "alasan_makanan", "minuman_alternatif", "alasan_minuman"]
    };

    console.log("Mengirim request ke Gemini 3.5 Flash...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2, // low temperature for precise, predictable calculations
      },
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("Tanggapan kosong dari Gemini.");
    }

    const parsedJson = JSON.parse(textResponse.trim());
    return res.json(parsedJson);

  } catch (error: any) {
    console.error("Analisis Error:", error);
    return res.status(500).json({
      error: "Terjadi kesalahan saat berkomunikasi dengan AI. " + (error.message || ""),
    });
  }
});

// Setup Vite & static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
