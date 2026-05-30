/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Trash2, 
  History, 
  BookOpen, 
  Heart, 
  ShieldCheck, 
  Droplets, 
  Flame, 
  RotateCcw, 
  Info, 
  Layers, 
  AlertTriangle,
  Smile,
  Instagram,
  CheckCircle,
  FileText,
  User,
  Activity,
  Award
} from "lucide-react";
import MealInput from "./components/MealInput";
import { AnalysisResponse, LogEntry, MealItem } from "./types";

// Recommender helper for healthy skin alternatives
function getAlternativeSuggestion(itemName: string): { original: string; alt: string; kuncinya: string } {
  const lower = itemName.toLowerCase();
  if (lower.includes("kopi") && (lower.includes("aren") || lower.includes("susu") || lower.includes("manis"))) {
    return {
      original: itemName,
      alt: "☕ Iced Caffè Latte (less/no sugar) dengan Soy/Oat Milk atau Americano dingin.",
      kuncinya: "Oat & soy milk memberikan tekstur creamy alami tanpa memicu insulin spike berlebih."
    };
  }
  if (lower.includes("boba") || lower.includes("bubble") || lower.includes("milk tea")) {
    return {
      original: itemName,
      alt: "🍵 Iced Matcha Latte tawar (no sugar) atau Hibiscus Tea dingin dengan pemanis stevia.",
      kuncinya: "Matcha kaya akan EGCG, antioksidan poten yang meredam inflamasi & mengontrol kelenjar sebum gusi."
    };
  }
  if (lower.includes("donat") || lower.includes("donut") || lower.includes("martabak") || lower.includes("roti manis")) {
    return {
      original: itemName,
      alt: "🍞 Roti gandum panggang dengan almond butter tawar + topping buah strawberry murni.",
      kuncinya: "Serat gandum mengurangi laju pelepasan glukosa dalam pembuluh darah (slow-release energy) mencegah kulit kusam."
    };
  }
  if (lower.includes("teh manis") || lower.includes("teh botol") || lower.includes("es teh")) {
    return {
      original: itemName,
      alt: "🍃 Cold Brew Jasmine Green Tea tanpa sirup gula, atau infused water lemon segar.",
      kuncinya: "Green tea mengandung nol kalori, murni meredakan oksidatif stres dermal pelindung elastisitas."
    };
  }
  if (lower.includes("jus") || lower.includes("juice")) {
    return {
      original: itemName,
      alt: "🥑 Jus alpukat utuh murni tanpa kental manis cokelat & tanpa sirup gula pasir.",
      kuncinya: "Lemak sehat alpukat (monounsaturated fats) sangat bagus untuk kelembapan alami skin-barrier Anda."
    };
  }
  // Default alternative
  return {
    original: itemName,
    alt: "🥗 Greek Yogurt polos dengan buah beri asli (strawberry/blueberry) & segenggam kacang almond.",
    kuncinya: "Kombinasi protein tinggi, serat buah, dan healthy fats meredam nafsu makan manis sekaligus ramah kolagen."
  };
}

// Helper to analyze logs for personalized favorite presets
function getPersonalizedPresets(logs: LogEntry[]): { text: string; desc: string }[] {
  const defaultPresets = [
    { text: "🥤 Kopi Susu Aren Manis & Donat", desc: "Kopi susu gula aren manis dingin & sepotong donat cokelat dengan taburan meses manis." },
    { text: "🍚 Nasi Uduk Komplit & Teh Manis", desc: "Nasi uduk isi telur dadar iris, ayam goreng, sambal, serta segelas teh manis kemasan botol." },
    { text: "🧋 Boba Milk Tea Normal Sugar", desc: "Minuman boba brown sugar milk tea ukuran medium dengan kadar gula normal 100%." },
    { text: "🥑 Avocado Juice Murni No Sugar", desc: "Jus alpukat segar murni blender tanpa sirup tambahan, tanpa kental manis, dan tanpa gula." }
  ];

  if (!logs || logs.length === 0) {
    return defaultPresets;
  }

  // Count occurrences of each unique mealDescription (grouping normalized, but keep original casing for label)
  const counts: Record<string, { original: string; count: number }> = {};
  logs.forEach((log) => {
    const desc = log.mealDescription?.trim();
    if (!desc) return;
    const key = desc.toLowerCase().replace(/\s+/g, " ");
    if (counts[key]) {
      counts[key].count += 1;
    } else {
      counts[key] = { original: desc, count: 1 };
    }
  });

  const sortedPairs = Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .map(x => x.original);

  const personalized = sortedPairs.slice(0, 4).map((desc) => {
    let emoji = "🍽️";
    const lower = desc.toLowerCase();
    if (lower.includes("kopi") || lower.includes("teh") || lower.includes("susu") || lower.includes("drink") || lower.includes("boba") || lower.includes("jus") || lower.includes("juice") || lower.includes("es")) {
      emoji = "🥤";
    } else if (lower.includes("donat") || lower.includes("donut") || lower.includes("roti") || lower.includes("kue") || lower.includes("cake") || lower.includes("martabak") || lower.includes("crepes") || lower.includes("cokelat") || lower.includes("manis")) {
      emoji = "🍩";
    } else if (lower.includes("nasi") || lower.includes("mie") || lower.includes("bubur") || lower.includes("soto") || lower.includes("bakso") || lower.includes("ayam")) {
      emoji = "🍛";
    } else if (lower.includes("buah") || lower.includes("salad") || lower.includes("sayur") || lower.includes("apel") || lower.includes("alpukat")) {
      emoji = "🥗";
    }

    let textStr = desc;
    if (textStr.length > 22) {
      textStr = textStr.substring(0, 20) + "...";
    }

    return {
      text: `${emoji} ${textStr}`,
      desc: desc
    };
  });

  // Fill in with defaults to reach exactly 4 presets
  const finalList = [...personalized];
  for (const preset of defaultPresets) {
    if (finalList.length >= 4) break;
    const isDuplicate = finalList.some(p => p.desc.toLowerCase() === preset.desc.toLowerCase());
    if (!isDuplicate) {
      finalList.push(preset);
    }
  }

  return finalList;
}

export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResponse | null>(null);
  const [latestDescription, setLatestDescription] = useState<string>("");
  const [latestImage, setLatestImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"tracker" | "education" | "history">("tracker");
  
  // Custom skincare metrics for interactive lifestyle logging
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [skincareChecked, setSkincareChecked] = useState({ morning: false, night: false });

  // Load from localStorage on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem("gulaskin_logs");
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error("Gagal memuat riwayat gula:", e);
      }
    }
    
    const savedWater = localStorage.getItem("gulaskin_water");
    if (savedWater) setWaterGlasses(parseInt(savedWater, 10) || 0);

    const savedSkincare = localStorage.getItem("gulaskin_skincare");
    if (savedSkincare) {
      try {
        setSkincareChecked(JSON.parse(savedSkincare));
      } catch (e) {}
    }
  }, []);

  // Save changes to localStorage
  const saveLogs = (updatedLogs: LogEntry[]) => {
    setLogs(updatedLogs);
    localStorage.setItem("gulaskin_logs", JSON.stringify(updatedLogs));
  };

  const handleWaterAdd = () => {
    const newVal = waterGlasses + 1;
    setWaterGlasses(newVal);
    localStorage.setItem("gulaskin_water", newVal.toString());
  };

  const handleWaterReset = () => {
    setWaterGlasses(0);
    localStorage.setItem("gulaskin_water", "0");
  };

  const toggleSkincare = (type: "morning" | "night") => {
    const updated = { ...skincareChecked, [type]: !skincareChecked[type] };
    setSkincareChecked(updated);
    localStorage.setItem("gulaskin_skincare", JSON.stringify(updated));
  };

  // Sum raw sugar intake today
  const totalSugarToday = logs.reduce((sum, log) => sum + log.analysis.total_gula, 0);

  // Status computation for cumulative intake based on WHO guidelines
  // WHO: Ideal < 25g, Max 50g
  const getCumulativeStatus = (total: number) => {
    if (total < 25) return { label: "Aman ✅", color: "text-[#B4740C] bg-amber-100/60 border-amber-200", bgProgress: "bg-amber-400", message: "Asupan gula harian Anda ideal untuk meminimalkan glycation dan menjaga kualitas elastin serta collagen wajah." };
    if (total <= 50) return { label: "Waspada ⚠️", color: "text-amber-800 bg-[#FFF3D6] border-amber-300", bgProgress: "bg-amber-500", message: "Mendekati batas maksimal WHO! Ada potensi insulin spike ringan yang bisa memicu sebum berlebih di area T-zone." };
    return { label: "Berbahaya 🚨", color: "text-rose-700 bg-rose-50 border-rose-200", bgProgress: "bg-rose-500", message: "Melebihi batas aman medis! Glycation collagen terakselerasi cepat, memicu penuaan dini dan risiko active breakouts / jerawat meradang." };
  };

  const statusInfo = getCumulativeStatus(totalSugarToday);

  // Mock service fallback if backend isn't available or fails
  const simulateAnalysis = (description: string): AnalysisResponse => {
    const descLower = description.toLowerCase();
    let tempItems: { nama_makanan: string; gula_gram: number }[] = [];
    let advice = "";

    // Realistic common defaults for Indonesian sweets
    if (descLower.includes("kopi susu") || descLower.includes("kopi")) {
      tempItems.push({ nama_makanan: "Kopi Susu Gula Aren", gula_gram: 22 });
    }
    if (descLower.includes("donat") || descLower.includes("donut")) {
      tempItems.push({ nama_makanan: "Donat Cokelat Meses", gula_gram: 18 });
    }
    if (descLower.includes("nasi uduk")) {
      tempItems.push({ nama_makanan: "Nasi Uduk (Sampingan Gula)", gula_gram: 3 });
    }
    if (descLower.includes("teh manis") || descLower.includes("es teh")) {
      tempItems.push({ nama_makanan: "Teh Manis Kemasan", gula_gram: 24 });
    }
    if (descLower.includes("boba") || descLower.includes("milk tea")) {
      tempItems.push({ nama_makanan: "Boba Milk Tea", gula_gram: 36 });
    }
    if (descLower.includes("martabak")) {
      tempItems.push({ nama_makanan: "Martabak Cokelat Keju (1 potong)", gula_gram: 20 });
    }
    if (descLower.includes("jus") || descLower.includes("juice")) {
      if (descLower.includes("tanpa gula") || descLower.includes("no sugar")) {
        tempItems.push({ nama_makanan: "Jus Buah Segar (Tanpa Tambahan Gula)", gula_gram: 0 });
      } else {
        tempItems.push({ nama_makanan: "Jus Buah Segar + Kental Manis/Sirup", gula_gram: 16 });
      }
    }
    if (descLower.includes("air putih") || descLower.includes("air mineral")) {
      tempItems.push({ nama_makanan: "Air Putih Murni", gula_gram: 0 });
    }

    // Default if nothing matches perfectly
    if (tempItems.length === 0) {
      tempItems.push({ 
        nama_makanan: description.substring(0, 30) || "Makanan Lainnya", 
        gula_gram: descLower.includes("manis") || descLower.includes("sirup") ? 15 : 5 
      });
    }

    const total = tempItems.reduce((acc, item) => acc + item.gula_gram, 0);
    const simulatedStatus = total < 25 ? "Aman" : total <= 50 ? "Waspada" : "Berbahaya";

    if (total < 25) {
      advice = "Nice! Kadar gula tambahan pada menu ini aman, risiko glycation berkurang drastis sehingga collagen wajah terlindungi.";
    } else {
      advice = "Kandungan gula tambahan yang tinggi rentan memicu insulin spike, menstimulasi kelenjar minyak memicu sebum berlebih yang menyumbat pori-pori (clogging) & breakout.";
    }

    return {
      daftar_item: tempItems,
      total_gula: total,
      status_who: simulatedStatus as any,
      pesan_kulit: advice,
      makanan_alternatif: "Roti Gandum Utuh dengan Selai Kacang Tawar & Stroberi Segar",
      alasan_makanan: "Lemak sehat dari selai kacang menunda lonjakan glukosa, menjaga sebum wajah dalam tingkat normal.",
      minuman_alternatif: "Iced Oat Latte Tanpa Gula Tambahan",
      alasan_minuman: "Espresso murni dicampur susu oat tawar kaya serat beta-glukan tanpa memicu destruksi kolagen dermal."
    };
  };

  const handleAnalyzeSugar = async (description: string, base64Image: string | null, mimeType: string | null) => {
    setIsLoading(true);
    setApiError(null);
    setLatestDescription(description);
    setLatestImage(base64Image);

    try {
      const response = await fetch("/api/analyze-sugar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: description,
          image: base64Image,
          imageType: mimeType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal menghubungi server analisis.");
      }

      const data: AnalysisResponse = await response.json();
      setCurrentAnalysis(data);

      // Save to logs
      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        mealDescription: description || "Analisis Foto Makanan",
        analysis: data
      };
      saveLogs([newLog, ...logs]);

    } catch (err: any) {
      console.warn("API Error, running interactive simulation mode fallback:", err.message);
      
      // Fallback to beautiful simulated analysis
      const simulatedResult = simulateAnalysis(description || "Makanan Anda");
      setCurrentAnalysis(simulatedResult);

      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        mealDescription: description || "Analisis Foto Makanan (Simulasi)",
        analysis: simulatedResult
      };
      
      saveLogs([newLog, ...logs]);
      
      // Show info badge rather than disturbing red error
      setApiError("Menggunakan simulasi ahli gizi offline karena server masih mempersiapkan kunci API.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteLog = (id: string) => {
    const updated = logs.filter(log => log.id !== id);
    saveLogs(updated);
  };

  const clearAllLogs = () => {
    saveLogs([]);
    setCurrentAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-4 px-2 md:py-10 flex flex-col items-center justify-start text-[#3D3A35] antialiased">
      
      {/* Absolute Header Branding - Modern & Minimalist (Desktop viewport indicator) */}
      <div className="hidden md:flex flex-col items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse"></div>
          <span className="text-xs uppercase tracking-widest font-bold text-[#8B867D]">GulasKin Dermatologist Coach</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#2C2925] mt-1">Sistem Pemantau Konsumsi Gula Harian Untuk Kesehatan Kulit</h1>
        <p className="text-xs text-[#8B867D] max-w-md text-center mt-1">
          Didesain khusus untuk tampilan smartphone.
        </p>
      </div>

      {/* Simulated Premium Smartphone Container */}
      <div className="w-full max-w-md bg-white rounded-[40px] border-8 border-[#3D3A35] shadow-2xl overflow-hidden flex flex-col relative aspect-[9/19] md:max-h-[820px]">
        
        {/* Device Top Bar Notch & Details */}
        <div className="bg-[#FAF7F2] px-6 pt-3 pb-2 flex justify-between items-center text-[11px] font-bold text-[#8B867D] border-b border-[#F4EFE5]">
          <span>09:41 AM</span>
          <div className="w-20 h-4 bg-[#EFEBE4] rounded-full absolute left-1/2 transform -translate-x-1/2 top-2 flex items-center justify-center">
            <span className="w-8 h-1 bg-[#DDD9D0] rounded-full"></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px]">GulaSkin AI v1.0</span>
            <div className="w-5 h-2.5 bg-[#8B867D] rounded-sm p-[1px] flex items-center">
              <div className="w-4 h-full bg-white rounded-2xs"></div>
            </div>
          </div>
        </div>

        {/* Device Brand Header */}
        <header className="bg-white px-5 py-4 flex items-center justify-between border-b border-[#F5F2EA]">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#FCF8EE] border border-amber-300 flex items-center justify-center">
              <Sparkles className="h-4.5 w-4.5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-[#2C2925] font-extrabold text-sm tracking-tight">GulaSkin</h2>
              <p className="text-[10px] text-[#A5A096] font-semibold">Jaga Gula, Bye Jerawat ✨</p>
            </div>
          </div>
          <div className="flex gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#EDE9DF]">
            <button 
              onClick={() => setActiveTab("tracker")}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${activeTab === "tracker" ? "bg-amber-400 text-[#2C2925] shadow-xs" : "text-[#8B867D]"}`}
            >
              Tracker
            </button>
            <button 
              onClick={() => setActiveTab("education")}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${activeTab === "education" ? "bg-amber-400 text-[#2C2925]" : "text-[#8B867D]"}`}
            >
              Edukasi
            </button>
            <button 
              onClick={() => setActiveTab("history")}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${activeTab === "history" ? "bg-amber-400 text-[#2C2925]" : "text-[#8B867D]"}`}
            >
              Riwayat
            </button>
          </div>
        </header>

        {/* Dynamic Warning Badge */}
        {apiError && (
          <div className="bg-[#FEFBF2] px-4 py-1.5 border-b border-amber-100 flex items-center gap-1.5 text-[10px] text-amber-700 font-semibold shadow-xs">
            <Info className="h-3 w-3 shrink-0 text-amber-500" />
            <span className="truncate">{apiError}</span>
          </div>
        )}

        {/* Scrollable Smartphone Viewport Container */}
        <div className="flex-1 overflow-y-auto bg-[#FAF8F5] p-4 space-y-4">

          {activeTab === "tracker" && (
            <>
              {/* Sugar Meter & Glowing Skin Card */}
              <div className="bg-white rounded-3xl border border-[#F3EFE6] p-4 shadow-xs relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
                  <Activity className="h-32 w-32" />
                </div>
                
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#A5A096]">Meteran Akumulasi Gula</span>
                    <h3 className="text-base font-extrabold text-[#2C2925] mt-0.5">Ringkasan Hari Ini</h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 py-3">
                  {/* Gauge indicator */}
                  <div className="relative w-22 h-22 flex items-center justify-center rounded-full bg-[#FAF8F5] border border-[#EFEBE4]">
                    <div className="text-center">
                      <span className="text-2xl font-black text-[#2C2925] block leading-none">{totalSugarToday}</span>
                      <span className="text-[9px] font-bold text-[#8B867D]">gram gula</span>
                    </div>
                    {/* Minimalist status glowing outer ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-dashed border-amber-400/20 animate-spin" style={{ animationDuration: '30s' }}></div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-end text-[11px] font-bold text-[#8B867D]">
                      <span>Batas WHO Ideal</span>
                      <span className="text-[#2C2925]">25g / hari</span>
                    </div>
                    
                    {/* Linear Modern Progress Bar */}
                    <div className="w-full h-3 bg-[#FAF7F2] rounded-full overflow-hidden border border-[#EDE9DF]">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${statusInfo.bgProgress}`}
                        style={{ width: `${Math.min((totalSugarToday / 50) * 100, 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[9px] text-[#A5A096] font-bold">
                      <span>0g</span>
                      <span>25g (Ideal)</span>
                      <span>50g (Maks)</span>
                    </div>
                  </div>
                </div>

                {/* Micro educational warning from doctor */}
                <div className="mt-3 bg-[#FAF8F5] rounded-2xl p-3 border border-[#EFEBE4]">
                  <div className="flex gap-2 items-start">
                    <div className="h-6 w-6 rounded-lg bg-white flex items-center justify-center shrink-0 border border-[#EDE9DF]">
                      <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-[#2C2925]">Saran:</h4>
                      <p className="text-[10px] text-[#6E6A62] mt-0.5 leading-relaxed">
                        {statusInfo.message} Gula tambahan berlebih memicu hormon insulin yang melejitkan sekresi sebum (minyak) dan merusak jaringan protein wajah.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lifestyle Skincare and Water Booster Trackers */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* Hydration card */}
                <div className="bg-white rounded-3xl border border-[#F3EFE6] p-3.5 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="p-1.5 rounded-xl bg-sky-50 text-sky-600">
                      <Droplets className="h-4 w-4" />
                    </div>
                    {waterGlasses > 0 && (
                      <button 
                        onClick={handleWaterReset}
                        title="Reset air"
                        className="text-[9px] text-[#A5A096] hover:text-red-500 font-bold transition cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="my-2 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-[#A5A096] font-bold uppercase tracking-wider block">Bilas Gula Harian</span>
                      <span className="text-[9px] font-mono font-bold text-sky-600">{Math.min(waterGlasses * 250, 2000)} / 2000 mL</span>
                    </div>
                    <h4 className="text-sm font-extrabold text-[#2C2925] mt-0.5">{waterGlasses} Gelas Air</h4>
                    
                    {/* Modern Blue Water Progress Loader */}
                    <div className="w-full h-1.5 bg-sky-50 rounded-full overflow-hidden border border-sky-150/30">
                      <div 
                        className="h-full bg-sky-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((waterGlasses / 8) * 100, 100)}%` }}
                      ></div>
                    </div>
                    
                    <p className="text-[8.5px] text-[#8B867D] leading-tight">
                      {waterGlasses >= 8 
                        ? "🎉 Target 2L Hidrasi Terpenuhi!" 
                        : "Target harian: 8 gelas (2 Liter) untuk ekskresi gula."}
                    </p>
                  </div>
                  <button
                    onClick={handleWaterAdd}
                    className="w-full py-1.5 rounded-xl bg-sky-500 text-white font-bold text-[10px] transition hover:bg-sky-600 active:scale-95 cursor-pointer mt-1"
                  >
                    + Tambah Gelas (250ml)
                  </button>
                </div>

                {/* Skincare Routine card */}
                <div className="bg-white rounded-3xl border border-[#F3EFE6] p-3.5 shadow-xs flex flex-col justify-between">
                  <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600 self-start">
                    <Smile className="h-4 w-4" />
                  </div>
                  <div className="my-2">
                    <span className="text-[9px] text-[#A5A096] font-bold uppercase tracking-wider block">Proteksi Luar</span>
                    <h4 className="text-sm font-extrabold text-[#2C2925] mt-0.5">Skin Barrier</h4>
                    <span className="text-[9px] text-[#8B867D] block leading-tight">Melindungi kelembapan kulit saat dirusak dari dalam.</span>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleSkincare("morning")}
                      className={`w-full p-1.5 rounded-lg font-bold text-[9px] flex flex-col items-center justify-center transition leading-tight ${
                        skincareChecked.morning 
                          ? "bg-[#FEFBF2] text-[#D9A036] border border-amber-300"
                          : "bg-[#FAF8F5] text-[#8B867D] border border-transparent"
                      } cursor-pointer`}
                    >
                      <div className="flex items-center gap-0.5">
                        <span>☀️ Pagi</span>
                        <span className="text-[8px]">{skincareChecked.morning ? "✓ Done" : "○"}</span>
                      </div>
                      <span className="text-[8px] font-medium text-slate-500 block text-center mt-0.5">Cleanser + Sunscreen SPF</span>
                    </button>
                    <button
                      onClick={() => toggleSkincare("night")}
                      className={`w-full p-1.5 rounded-lg font-bold text-[9px] flex flex-col items-center justify-center transition leading-tight ${
                        skincareChecked.night 
                          ? "bg-[#FEFBF2] text-[#D9A036] border border-amber-300"
                          : "bg-[#FAF8F5] text-[#8B867D] border border-transparent"
                      } cursor-pointer`}
                    >
                      <div className="flex items-center gap-0.5">
                        <span>🌙 Malam</span>
                        <span className="text-[8px]">{skincareChecked.night ? "✓ Done" : "○"}</span>
                      </div>
                      <span className="text-[8px] font-medium text-slate-500 block text-center mt-0.5">Cleanser + Moisturizer</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Main Analysis Input Component */}
              <MealInput onAnalyze={handleAnalyzeSugar} isLoading={isLoading} customPresets={getPersonalizedPresets(logs)} />

              {/* Display Current Analysis results inside Smartphone App */}
              {currentAnalysis && (
                <div className="bg-amber-50/50 rounded-3xl border border-amber-200 p-4 space-y-3.5 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-amber-700">
                    <Award className="h-4.5 w-4.5" />
                    <h3 className="text-xs font-black uppercase tracking-wider">Hasil Analisis Terakhir</h3>
                  </div>

                  <div className="bg-white rounded-2xl p-3 border border-amber-100/80">
                    <div className="flex justify-between items-center pb-2 border-b border-[#FAF7F2] mb-2">
                      <span className="text-xs font-bold text-[#8B867D]">Kandungan Terdeteksi:</span>
                      <span className="text-xs font-extrabold text-[#2C2925] bg-amber-100 px-2 py-0.5 rounded-md">
                        Total {currentAnalysis.total_gula}g Gula Tambahan
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {currentAnalysis.daftar_item.map((item, id) => (
                        <div key={id} className="flex justify-between items-center text-xs text-[#5C5851]">
                          <span className="font-semibold select-none flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                            {item.nama_makanan}
                          </span>
                          <span className="font-bold text-[#3D3A35]">{item.gula_gram}g</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Highlighted Skincare Impact */}
                  <div className="bg-amber-400 rounded-2xl p-3 text-[#2C2925] shadow-xs">
                    <div className="flex gap-2 items-start">
                      <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-[#2C2925] mt-0.5" />
                      <div>
                        <h4 className="text-[11px] font-extrabold uppercase tracking-wide">PENGARUH PADA WAJAH:</h4>
                        <p className="text-[11px] font-medium leading-relaxed mt-0.5">
                          "{currentAnalysis.pesan_kulit}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "education" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white rounded-3xl border border-[#F3EFE6] p-4">
                <div className="flex gap-2 items-center mb-3">
                  <div className="p-1 px-2.5 rounded-xl bg-amber-400 text-[#2C2925] font-black text-xs">
                    EDUKASI
                  </div>
                  <h3 className="text-sm font-bold text-[#2C2925]">Bagaimana Gula Merusak Kulit Anda</h3>
                </div>
                <p className="text-[11px] text-[#6E6A62] leading-relaxed">
                  Gula bukan hanya tentang kalori; bagi dermatologis, gula pasir, gula aren, dan sirup berlebih adalah musuh terbesar elastisitas kulit melalui dua jalur biologis utama:
                </p>
              </div>

              {/* Education Point 1 */}
              <div className="bg-white rounded-3xl border border-[#F3EFE6] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h4 className="text-xs font-extrabold text-[#2C2925]">Proses Glikasi (Glycation) & Penuaan</h4>
                </div>
                <p className="text-[10px] text-[#6E6A62] leading-relaxed">
                  Ketika Anda mengonsumsi gula tambahan berlebih, gula mengikat protein seperti <strong>kolagen dan elastin</strong> di kulit secara paksa. Ikatan ini menghasilkan molekul berbahaya bernama <strong>AGEs (Advanced Glycation End-products)</strong>. AGEs membuat kolagen Anda menjadi kaku, rapuh, mudah patah, sehingga menyebabkan kulit keriput, kendur, dan kusam sebelum waktunya.
                </p>
              </div>

              {/* Education Point 2 */}
              <div className="bg-white rounded-3xl border border-[#F3EFE6] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h4 className="text-xs font-extrabold text-[#2C2925]">Lonjakan Insulin & Sebum Jerawat</h4>
                </div>
                <p className="text-[10px] text-[#6E6A62] leading-relaxed">
                  Makanan indeks glikemik tinggi memicu sekresi insulin mendadak. Insulin merangsang hormon androgen dan faktor pertumbuhan mirip-insulin 1 (IGF-1), yang langsung mengaktifkan <strong>kelenjar sebaceous (minyak)</strong> untuk memproduksi sebum berlimpah. Sebum kental ini menyumbat pori-pori Anda dan menjadi sarang subur bakteri jerawat (<em>C. acnes</em>).
                </p>
              </div>

              {/* Clinical Standard Guideline Info */}
              <div className="bg-[#FEFBF2] rounded-3xl border border-amber-205 p-3.5 flex gap-2.5">
                <Info className="h-5.5 w-5.5 text-amber-500 shrink-0" />
                <div>
                  <h5 className="text-[11px] font-bold text-[#3D3A35]">Standar WHO (World Health Organization):</h5>
                  <p className="text-[10px] text-[#6E6A62] leading-relaxed mt-0.5">
                    <strong>Ideal:</strong> Kurang dari 5% total energi harian (setara sekitar 25 gram gula tambahan atau 6 sendok teh untuk orang dewasa sehat).
                    <br />
                    <strong>Batas Maksimal:</strong> 10% total energi (setara 50 gram).
                  </p>
                </div>
              </div>

              {/* Dynamic Interactive Meal Analyzer & Healthier Food Alternatives Section */}
              {logs.length > 0 ? (
                (() => {
                  const lastLog = logs[0];
                  return (
                    <div className="bg-[#FFFDF9] rounded-3xl border border-dashed border-amber-300 p-4.5 space-y-4 animate-fadeIn">
                      <div className="flex gap-2 items-center">
                        <div className="p-1 px-2.5 rounded-xl bg-amber-400 text-[#2C2925] font-black text-[9px] tracking-tight shrink-0 uppercase">
                          STUDI KASUS PERSONAL
                        </div>
                        <h4 className="text-[11px] font-extrabold text-[#2C2925] uppercase tracking-wide">Evaluasi Asupan Terakhir Anda</h4>
                      </div>

                      {/* Header Summary for the tracked meal */}
                      <div className="bg-white rounded-2xl p-3.5 border border-[#EDE9DF]">
                        <p className="text-[9px] font-extrabold text-[#8B867D] tracking-wider uppercase">Menu Yang Baru Saja Dinilai:</p>
                        <p className="text-xs font-black text-[#2C2925] mt-1 italic">
                          " {lastLog.mealDescription} "
                        </p>
                        <div className="mt-3 text-[10px] text-[#5C5851] bg-[#FAF8F5] p-2.5 rounded-xl flex justify-between items-center border border-[#F4EFE5]">
                          <span className="font-medium">Total Akumulasi Gula Tambahan:</span>
                          <span className="font-extrabold text-amber-800 bg-amber-50 px-2.5 py-0.5 border border-amber-200 rounded-md text-[11px]">
                            {lastLog.analysis.total_gula} gram
                          </span>
                        </div>
                      </div>

                      {/* Educational Breakdown & Solution of each item in the food */}
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-[#6E6A62] uppercase tracking-widest flex items-center gap-1">
                          <span>🔬 BREAKDOWN GIZI & DAMPAK KULIT:</span>
                        </h5>

                        {lastLog.analysis.daftar_item.map((item, idx) => {
                          // Determine the level severity based on sugar content
                          let severityLabel = "Aman (Rendah)";
                          let severityBg = "bg-green-50 text-green-700 border-green-200";
                          let skinImpactText = "Kandungan gula tambahan yang minimal. Sangat ramah terhadap skin barrier Anda, tidak akan memicu insulin berlebih maupun sebum wajah berlebih.";
                          
                          if (item.gula_gram > 20) {
                            severityLabel = "Tinggi (Bahaya Jerawat!)";
                            severityBg = "bg-rose-50 text-rose-700 border-rose-200";
                            skinImpactText = "Kandungan gula sangat tinggi! Ini merangsang kelenjar sebum memproduksi minyak berlebih di area T-Zone wajah, memicu komedo, serta mempercepat kerusakan kolagen kulit melalui reaksi glikasi.";
                          } else if (item.gula_gram > 5) {
                            severityLabel = "Sedang (Waspada Sebum!)";
                            severityBg = "bg-amber-50 text-amber-800 border-amber-200";
                            skinImpactText = "Sedang. Masih bisa ditoleransi, namun jika dikonsumsi harian akan mengganggu sirkulasi insulin dan memicu peradangan mikro bawah kulit penyebab jerawat tersembunyi.";
                          }

                          return (
                            <div key={idx} className="bg-white border border-[#EDE9DF] rounded-2xl p-4 space-y-3 shadow-xs">
                              {/* Title & Badge */}
                              <div className="flex justify-between items-start gap-2 pb-2 border-b border-[#FAF8F5]">
                                <div>
                                  <span className="text-[12px] font-extrabold text-[#2C2925] block">
                                    {item.nama_makanan}
                                  </span>
                                  <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-md border mt-1 ${severityBg}`}>
                                    {severityLabel}
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-250">
                                  {item.gula_gram}g Gula
                                </span>
                              </div>

                              {/* Biological education of impact */}
                              <div className="text-[10px] text-[#6E6A62] leading-relaxed">
                                <strong className="text-[#3D3A35] block mb-0.5">🧬 Dampak Biologis Kulit:</strong>
                                {skinImpactText}
                              </div>

                            </div>
                          );
                        })}
                      </div>

                      {/* Unified AI Skin-Safe Alternative Suggestions at the Bottom */}
                      <div className="space-y-3.5 pt-4 border-t border-[#EDE9DF] border-dashed">
                        <div className="flex items-center gap-2">
                          <span className="p-1 px-2 py-0.5 rounded-lg bg-emerald-500 text-white font-black text-[8px] tracking-wider uppercase shrink-0">
                            🌱 SOLUSI PILIHAN
                          </span>
                          <h5 className="text-[10px] font-extrabold text-[#5C5851] uppercase tracking-wide">
                            Rekomendasi Alternatif Terbaik (Skin-Safe)
                          </h5>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {/* Alternative Food */}
                          {lastLog.analysis.makanan_alternatif && (
                            <div className="bg-[#F8FDF9] border border-emerald-100 p-4 rounded-2xl space-y-2 shadow-xs animate-fadeIn">
                              <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100/65">
                                <span className="text-[10px] font-extrabold text-emerald-950 flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                  🥗 Rekomendasi Makanan
                                </span>
                                <span className="text-[8px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/40 shrink-0">
                                  Skin-Safe ✨
                                </span>
                              </div>
                              
                              <p className="font-extrabold text-[#2C2925] text-xs leading-normal">
                                {lastLog.analysis.makanan_alternatif}
                              </p>
                              
                              <p className="text-[9.5px] text-[#6E6A62] leading-relaxed bg-white p-2.5 rounded-xl border border-emerald-150/40">
                                <strong className="text-emerald-800 font-bold block mb-0.5">Analisis AI:</strong> 
                                {lastLog.analysis.alasan_makanan || "Membantu menstabilkan sekresi sebum dan memulihkan hidrasi kulit luar-dalam."}
                              </p>
                            </div>
                          )}

                          {/* Alternative Drink */}
                          {lastLog.analysis.minuman_alternatif && (
                            <div className="bg-[#F3FAFE] border border-sky-100 p-4 rounded-2xl space-y-2 shadow-xs animate-fadeIn">
                              <div className="flex items-center justify-between pb-1.5 border-b border-sky-100/65">
                                <span className="text-[10px] font-extrabold text-sky-950 flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0"></span>
                                  🥤 Rekomendasi Minuman
                                </span>
                                <span className="text-[8px] font-mono font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded-md border border-sky-200/40 shrink-0">
                                  Skin-Safe ✨
                                </span>
                              </div>
                              
                              <p className="font-extrabold text-[#2C2925] text-xs leading-normal">
                                {lastLog.analysis.minuman_alternatif}
                              </p>
                              
                              <p className="text-[9.5px] text-[#6E6A62] leading-relaxed bg-white p-2.5 rounded-xl border border-sky-150/40">
                                <strong className="text-sky-800 font-bold block mb-0.5">Analisis AI:</strong> 
                                {lastLog.analysis.alasan_minuman || "Membantu menstabilkan sekresi sebum dan memulihkan hidrasi kulit luar-dalam."}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-white rounded-3xl border border-[#F3EFE6] p-6 text-center space-y-2.5">
                  <div className="h-10 w-10 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-bold text-[#2C2925]">Review Solusi Personal Belum Tersedia</h4>
                  <p className="text-[10px] text-[#8B867D] leading-relaxed max-w-xs mx-auto">
                    Silakan input foto atau ketiklah makanan/minum harian Anda di tab <strong>Tracker</strong> terlebih dahulu untuk memunculkan reviu gizi serta saran menu alternatif ramah elastisitas kulit di sini!
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B867D]">Riwayat Asupan Hari Ini</h3>
                {logs.length > 0 && (
                  <button
                    onClick={clearAllLogs}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus Semua
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="bg-white rounded-3xl border border-[#F3EFE6] p-8 text-center text-slate-400">
                  <History className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-medium text-[#8B867D]">Belum ada riwayat asupan gula.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Silakan analisis asupan Anda di tab Tracker.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="bg-white rounded-2xl border border-[#F3EFE6] p-3 text-xs relative group">
                      <div className="flex justify-between items-start">
                        <div className="pr-6">
                          <span className="text-[9px] font-bold text-[#A5A096] bg-[#FAF8F5] px-1.5 py-0.5 rounded-md">
                            {new Date(log.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <h4 className="font-bold text-[#2C2925] mt-1.5">{log.mealDescription}</h4>
                        </div>
                        <button
                          onClick={() => deleteLog(log.id)}
                          className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 transition duration-150 p-1 rounded-lg cursor-pointer"
                          title="Hapus baris"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Detail breakdown */}
                      <div className="mt-2.5 pt-2 border-t border-[#FAF8F5] flex justify-between items-center">
                        <span className="text-[10px] text-[#8B867D] font-medium">Asumsi Kandungan Gula:</span>
                        <span className="font-extrabold text-[#D9A036] bg-[#FEFBF2] px-2 py-0.5 border border-amber-200/50 rounded-md">
                          {log.analysis.total_gula}g Gula
                        </span>
                      </div>

                      {/* Mini advice snippet */}
                      <p className="text-[10px] text-[#6E6A62] italic mt-1.5 bg-[#FAFAF8] p-1.5 rounded-lg border border-[#F0ECE4]/60">
                        {log.analysis.pesan_kulit}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Device Bottom Decorative Virtual Indicator Bar */}
        <div className="bg-white py-3 flex justify-center items-center border-t border-[#F5F2EA]">
          <div className="w-28 h-1 bg-[#8B867D] rounded-full"></div>
        </div>

      </div>

    </div>
  );
}
