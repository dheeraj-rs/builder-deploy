const API_KEY =
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  'AIzaSyAhJB5h3btdONhVYXcjvalk5ePTBm9JBgM';
const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function generateWebsiteCode(
  prompt: string,
  conversationHistory: Array<{ role: string; content: string }>
) {
  try {
    const systemPrompt = `You are an expert web developer. Generate complete, production-ready HTML, CSS, and JavaScript code based on user requirements.

    IMPORTANT: Respond ONLY with valid JSON in this exact format:
    {
      "html": "complete HTML code here",
      "css": "complete CSS code here",
      "js": "complete JavaScript code here (or empty string if not needed)"
    }

    Requirements:
    - Generate modern, responsive, beautiful designs
    - Use semantic HTML5
    - Include inline styles or style tags for CSS
    - Make it production-ready
    - Do not include markdown code blocks or explanations
    - Return ONLY the JSON object`;

    const messages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...conversationHistory.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
      { role: 'user', parts: [{ text: prompt }] },
    ];

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0]?.content?.parts[0]?.text || '';

    let cleanedText = generatedText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText
        .replace(/^```json\n?/, '')
        .replace(/\n?```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleanedText);

    return {
      html: parsed.html || '',
      css: parsed.css || '',
      js: parsed.js || '',
    };
  } catch (error) {
    console.error('Error generating website code:', error);
    throw error;
  }
}

export async function chatWithAI(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>
) {
  try {
    const messages = conversationHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    messages.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (
      data.candidates[0]?.content?.parts[0]?.text ||
      'Sorry, I could not generate a response.'
    );
  } catch (error) {
    console.error('Error chatting with AI:', error);
    throw error;
  }
}
