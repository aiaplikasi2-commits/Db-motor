/**
 * AI Service for JUAL MOTOR
 * Calls backend Gemini endpoint to polish motor listing copywriting
 */

export async function refineMotorAdWithAI(text: string): Promise<string> {
  if (!text || !text.trim()) {
    throw new Error('Silakan tulis keterangan motor terlebih dahulu');
  }

  const response = await fetch('/api/ai/refine-ad', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: text.trim() }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Gagal memperbaiki kalimat dengan AI (${response.status})`);
  }

  const data = await response.json();
  if (!data.refinedText) {
    throw new Error('Respon AI kosong. Silakan coba lagi.');
  }

  return data.refinedText;
}
