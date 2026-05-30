/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MealItem {
  nama_makanan: string;
  gula_gram: number;
}

export interface AnalysisResponse {
  daftar_item: MealItem[];
  total_gula: number;
  status_who: 'Aman' | 'Waspada' | 'Berbahaya';
  pesan_kulit: string;
  makanan_alternatif: string;
  alasan_makanan: string;
  minuman_alternatif: string;
  alasan_minuman: string;
}

export interface LogEntry {
  id: string;
  timestamp: string; // ISO string
  mealDescription: string;
  analysis: AnalysisResponse;
}
