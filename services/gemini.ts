import { GoogleGenAI } from "@google/genai";
import { ProductionBatch, Material, Accessory, MaterialUsage, SizeTarget } from "../types";

// Helper for parsing potentially stringified JSON fields from production batches
const safeParse = <T>(data: any): T[] => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(data) ? data : [];
};

export const analyzeProductionData = async (
  batch: ProductionBatch, 
  materials: Material[], 
  accessories: Accessory[]
) => {
  // Always use the named parameter for API key initialization directly from process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Fix: changed materialsUsed to materials_used to match ProductionBatch interface
  const parsedMaterials = safeParse<MaterialUsage>(batch.materials_used);
  const parsedTargets = safeParse<SizeTarget>(batch.targets);

  const materialDetails = parsedMaterials.map(m => {
    const mat = materials.find(x => x.id === m.materialId);
    return `${mat?.name}: ${m.qty} ${mat?.unit} @ Rp${m.snapshotPrice}`;
  }).join(', ');

  const totalTarget = parsedTargets.reduce((acc, t) => acc + (t.targetQty || 0), 0);

  const prompt = `
    Analyze this convection production batch:
    Batch Code: ${batch.code}
    Type: ${batch.type}
    Materials: ${materialDetails}
    Target Total Qty: ${totalTarget}
    Current Stage: ${batch.current_stage}
    Status: ${batch.status}
    Actual Output: ${batch.actual_output || 'N/A'}
    QC Pass Rate (Pcs): ${batch.res_qc || 'N/A'}

    Please provide a short executive summary (max 150 words) focusing on:
    1. Efficiency of material usage.
    2. Cost analysis (high level).
    3. Suggestions for improvement in the next batch.
    
    Answer in Bahasa Indonesia.
  `;

  try {
    // Use ai.models.generateContent to query GenAI with the model name and prompt.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // The response.text property returns the extracted string output.
    return response.text;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "Gagal memuat analisis AI saat ini.";
  }
};