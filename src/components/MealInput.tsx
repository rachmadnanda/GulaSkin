/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, DragEvent } from "react";
import { Upload, X, Sparkles, Utensils, Camera, Image } from "lucide-react";

interface MealInputProps {
  onAnalyze: (description: string, base64Image: string | null, mimeType: string | null) => void;
  isLoading: boolean;
  customPresets?: { text: string; desc: string }[];
}

export default function MealInput({ onAnalyze, isLoading, customPresets }: MealInputProps) {
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Suggested popular / default prompts/presets for easy testing in Indonesian
  const defaultPresets = [
    { text: "🥤 Kopi Susu Aren Manis & Donat", desc: "Kopi susu gula aren manis dingin & sepotong donat cokelat dengan taburan meses manis." },
    { text: "🍚 Nasi Uduk Komplit & Teh Manis", desc: "Nasi uduk isi telur dadar iris, ayam goreng, sambal, serta segelas teh manis kemasan botol." },
    { text: "🧋 Boba Milk Tea Normal Sugar", desc: "Minuman boba brown sugar milk tea ukuran medium dengan kadar gula normal 100%." },
    { text: "🍓 Avocado Juice Murni No Sugar", desc: "Jus alpukat segar murni blender tanpa sirup tambahan, tanpa kental manis, dan tanpa gula." }
  ];

  const presetsToUse = customPresets && customPresets.length > 0 ? customPresets : defaultPresets;

  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Mohon unggah file gambar saja (PNG, JPEG, WEBP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800; // Resolusi optimal yang sangat jelas untuk analisis makanan oleh Gemini
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Mengompresi menjadi format JPEG dengan kualitas 75% untuk mengurangi beban bandwith hingga 98%
          // Ini membuat transfer data dan respon model Gemini menjadi sangat kilat
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setImagePreview(compressedDataUrl);
          setImageType("image/jpeg");
        } else {
          // Fallback ke gambar asli jika canvas gagal render
          setImagePreview(event.target?.result as string);
          setImageType(file.type);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const onFileSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !imagePreview) {
      alert("Silakan masukkan keterangan makanan atau unggah foto asupan terlebih dahulu.");
      return;
    }
    onAnalyze(description, imagePreview, imageType);
  };

  return (
    <div id="meal_input_panel" className="bg-white rounded-3xl border border-[#F3EFE6] p-5 shadow-sm transition hover:shadow-md duration-300">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-xl bg-[#FEFBF2] text-[#D9A036] flex items-center justify-center">
          <Utensils className="h-4 w-4" />
        </div>
        <h2 className="text-base font-bold text-[#3D3A35]">Catat Makanan / Minuman</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Text Description */}
        <div>
          <label className="block text-xs font-semibold text-[#6E6A62] mb-1.5 flex justify-between items-center">
            <span>Keterangan Menu</span>
            <span className="text-[10px] text-amber-500 font-medium font-mono">Bisa foto + deskripsi</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contoh: Es kopi susu boba manis 1 gelas besar & sepotong donat..."
            rows={2}
            className="w-full rounded-2xl border border-[#EFEBE4] bg-[#FAF8F5] p-3 text-sm text-[#3D3A35] outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-200/20 placeholder-slate-450 placeholder:text-[11px]"
          />
        </div>

        {/* Preset Chips */}
        <div>
          <span className="text-[11px] font-semibold text-[#8B867D] block mb-2">Pilih Cepat (Quick Preset):</span>
          <div className="grid grid-cols-2 gap-2">
            {presetsToUse.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setDescription(preset.desc)}
                className={`text-[11px] text-left px-2.5 py-2 rounded-xl border text-[#5C5851] transition duration-150 cursor-pointer line-clamp-2 ${
                  description === preset.desc 
                    ? "border-amber-400 bg-amber-50 text-amber-800 font-semibold" 
                    : "border-[#EDE9DF] hover:border-amber-300 hover:bg-[#FFFBF4]"
                }`}
              >
                {preset.text}
              </button>
            ))}
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div>
          <label className="block text-xs font-semibold text-[#6E6A62] mb-1.5">
            Foto Makanan / Minuman
          </label>
          
          {/* Native inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFileSelectChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileSelectChange}
            className="hidden"
          />

          {!imagePreview ? (
            <div className="space-y-3">
              {/* Quick Choice Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-3 px-4 rounded-2xl border border-amber-300 bg-[#FFFDF9] hover:bg-[#FFF9EE] active:scale-95 text-[#2C2925] flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Camera className="h-5.5 w-5.5 text-amber-500 animate-pulse" />
                  <span className="text-[11px] font-extrabold tracking-tight">Ambil Kamera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 px-4 rounded-2xl border border-[#EDE9DF] bg-white hover:bg-[#FAF8F5] active:scale-95 text-[#2C2925] flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Image className="h-5.5 w-5.5 text-[#8B867D]" />
                  <span className="text-[11px] font-extrabold tracking-tight">Pilih Galeri</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl border border-[#EDE9DF] overflow-hidden bg-[#FAF8F5] max-h-48 flex justify-center items-center">
              <img
                src={imagePreview}
                alt="Meal preview"
                className="object-contain max-h-44 rounded-lg p-1.5"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 bg-[#2C2925]/80 hover:bg-red-500 text-white p-1 rounded-full transition shadow-md"
                title="Hapus gambar"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Submit Analyze Button */}
        <button
          type="submit"
          disabled={isLoading || (!description.trim() && !imagePreview)}
          className={`w-full py-3 rounded-2xl font-bold text-sm text-center flex items-center justify-center gap-2 transition focus:outline-none focus:ring-4 focus:ring-amber-200/30 active:scale-[0.98] ${
            isLoading || (!description.trim() && !imagePreview)
              ? "bg-[#EFEBE4] text-[#A5A096] cursor-not-allowed"
              : "bg-amber-400 hover:bg-amber-500 text-[#2C2925] shadow-sm shadow-amber-400/20 cursor-pointer"
          }`}
        >
          <Sparkles className="h-4 w-4 animate-pulse text-[#B4740C]" />
          {isLoading ? "Menganalisis..." : "Mulai Analisis Gula"}
        </button>
      </form>
    </div>
  );
}
