import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY, {
  apiUrl:
    "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const validateModuleContent = (content) => {
  if (!content?.title || !Array.isArray(content?.sections)) return false;
  if (content.sections.length === 0) return false;
  
  // Validate each section has required fields
  return content.sections.every(section => 
    section.title && 
    typeof section.content === 'string' && 
    section.content.length > 50
  );
};

const cleanCodeExample = (codeExample) => {
  if (!codeExample) return null;
  try {
    // Clean any markdown code blocks from the code
    const cleanCode = codeExample.code
      ?.replace(/```[\w]*\n?/g, '')  // Remove code block markers
      ?.replace(/```$/gm, '')        // Remove ending markers
      ?.replace(/^\/\/ /gm, '')      // Clean comments
      ?.trim();

    return {
      language: codeExample.language || 'javascript',
      code: cleanCode || '',
      explanation: codeExample.explanation || ''
    };
  } catch (error) {
    console.error('Code cleaning error:', error);
    return null;
  }
};

const sanitizeContent = (text) => {
  try {
    // Remove markdown code blocks and other problematic characters
    return text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/`/g, '')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\')
      .trim();
  } catch (error) {
    console.error('Content sanitization error:', error);
    return text;
  }
};

const sanitizeJSON = (text) => {
  try {
    // Extract JSON object/array from response
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) return text;
    
    return jsonMatch[0]
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/\\[^"\\\/bfnrtu]/g, '\\\\')
      .replace(/\\n/g, ' ')
      .replace(/\r?\n|\r/g, ' ')
      .replace(/```(?:json)?|/g, '')
      .trim();
  } catch (error) {
    console.error('JSON sanitization error:', error);
    return text;
  }
};

export const generateLearningPath = async (topic) => {
  if (!topic || typeof topic !== "string") {
    throw new Error("Invalid topic provided");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Generate a comprehensive learning path for: "${topic}"
    Requirements:
    - Create exactly 5 progressive modules
    - Each module should build upon previous knowledge
    - Focus on practical, hands-on learning
    - Include both theoretical and practical aspects
    
    Return ONLY a JSON array with exactly 5 strings in this format:
    ["Module 1: [Clear Title]", "Module 2: [Clear Title]", "Module 3: [Clear Title]", "Module 4: [Clear Title]", "Module 5: [Clear Title]"]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const cleanText = sanitizeJSON(text);
      const modules = JSON.parse(cleanText);
      if (!Array.isArray(modules) || modules.length !== 5) {
        throw new Error("Invalid response format");
      }
      return modules;
    } catch (error) {
      console.error("Parsing error:", error);
      return [
        `Module 1: Introduction to ${topic}`,
        `Module 2: Core Concepts of ${topic}`,
        `Module 3: Intermediate ${topic} Techniques`,
        `Module 4: Advanced ${topic} Applications`,
        `Module 5: Real-world ${topic} Projects`,
      ];
    }
  } catch (error) {
    throw new Error(`Failed to generate learning path: ${error.message}`);
  }
};

const isCodeRelatedTopic = (topic) => {
  const techKeywords = {
    programming: ['javascript', 'python', 'java', 'coding', 'programming', 'typescript'],
    web: ['html', 'css', 'react', 'angular', 'vue', 'frontend', 'backend', 'fullstack'],
    database: ['sql', 'database', 'mongodb', 'postgres'],
    software: ['api', 'development', 'software', 'git', 'devops', 'algorithms'],
    tech: ['computer science', 'data structures', 'networking', 'cloud']
  };

  const lowerTopic = topic.toLowerCase();
  return Object.values(techKeywords).some(category => 
    category.some(keyword => lowerTopic.includes(keyword))
  );
};

export const generateModuleContent = async (moduleName, options = { detailed: false }) => {
  if (!moduleName || typeof moduleName !== "string") {
    throw new Error("Invalid module name provided");
  }

  let lastError = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const isTechTopic = isCodeRelatedTopic(moduleName);

      const prompt = `Create educational content for: "${moduleName}"
      Type: ${isTechTopic ? 'Technical/Programming' : 'General'}
      Level: ${options.detailed ? 'Advanced' : 'Basic'}

      ${isTechTopic ? `Important: EVERY section must include:
      - Practical code examples with explanations
      - Working code snippets that demonstrate concepts
      - Best practices and common patterns
      - Error handling where relevant` : ''}

      Return a JSON object strictly following this structure:
      {
        "title": "${moduleName}",
        "type": "${isTechTopic ? 'technical' : 'general'}",
        "sections": [
          {
            "title": "Section Title",
            "content": "Detailed explanation",
            "keyPoints": ["Key point 1", "Key point 2"],
            ${isTechTopic ? `"codeExample": {
              "language": "${getAppropriateLanguage(moduleName)}",
              "code": "// Include working code here\\nfunction example() {\\n  // code implementation\\n}",
              "explanation": "Explain how the code works"
            }` : '"codeExample": null'}
          }
        ]
      }`;

      const result = await model.generateContent(prompt);
      let text = result.response.text();
      
      // Enhanced JSON cleaning and parsing
      text = sanitizeJSON(text);
      const content = JSON.parse(text);

      if (!validateModuleContent(content)) {
        throw new Error('Invalid content structure');
      }

      // Process and clean content
      content.sections = content.sections.map(section => ({
        ...section,
        content: sanitizeContent(section.content),
        codeExample: section.codeExample ? cleanCodeExample(section.codeExample) : null
      }));

      return content;
    } catch (error) {
      lastError = error;
      await sleep(RETRY_DELAY);
    }
  }

  throw lastError || new Error('Failed to generate content');
};

// Add helper function to determine appropriate language
const getAppropriateLanguage = (topic) => {
  const topicLower = topic.toLowerCase();
  const languageMap = {
    javascript: ['javascript', 'js', 'node', 'react', 'vue', 'angular'],
    python: ['python', 'django', 'flask'],
    java: ['java', 'spring'],
    html: ['html', 'markup'],
    css: ['css', 'styling', 'scss'],
    sql: ['sql', 'database', 'mysql', 'postgresql'],
    typescript: ['typescript', 'ts'],
  };

  for (const [lang, keywords] of Object.entries(languageMap)) {
    if (keywords.some(keyword => topicLower.includes(keyword))) {
      return lang;
    }
  }
  return 'javascript'; // default language
};

export const generateFlashcards = async (topic, numCards = 5) => {
  if (!topic || typeof topic !== "string") {
    throw new Error("Invalid topic provided");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Generate ${numCards} educational flashcards on "${topic}" with increasing difficulty.
    
    **Requirements:**
    - The **front side (question)** must be **short and clear**.
    - The **back side (answer)** must be **detailed (3-4 sentences) and informative**.
    - Ensure **difficulty increases from Flashcard 1 to ${numCards}**:
      - Start with **basic concepts**.
      - Progress to **intermediate details**.
      - End with **advanced questions requiring deeper understanding**.
    - Format the response **strictly** as a JSON array:

    [
      { "id": 1, "frontHTML": "Basic question?", "backHTML": "Detailed easy explanation." },
      { "id": 2, "frontHTML": "Intermediate question?", "backHTML": "Detailed intermediate explanation." },
      { "id": ${numCards}, "frontHTML": "Advanced question?", "backHTML": "Detailed advanced explanation." }
    ]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const cleanText = sanitizeJSON(text);
      const flashcards = JSON.parse(cleanText);

      if (!Array.isArray(flashcards) || flashcards.length !== numCards) {
        throw new Error("Invalid flashcard format");
      }

      return flashcards;
    } catch (error) {
      console.error("Flashcard parsing error:", error);
      return Array.from({ length: numCards }, (_, i) => ({
        id: i + 1,
        frontHTML: `Basic to advanced ${topic} question ${i + 1}?`,
        backHTML: `Detailed answer explaining ${topic} at difficulty level ${
          i + 1
        }.`,
      }));
    }
  } catch (error) {
    throw new Error(`Failed to generate flashcards: ${error.message}`);
  }
};

export const generateQuizData = async (topic, numQuestions = 5) => {
  if (!topic || typeof topic !== "string") {
    throw new Error("Invalid topic provided");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `Generate a quiz on "${topic}" with ${numQuestions} questions.
    
    **Requirements:**
    - Each question should be **clear and well-structured**.
    - Include **single-choice and multiple-choice** questions randomly.
    - Provide **4 answer options** for each question.
    - Clearly indicate the **correct answer(s)**.
    - Give a **short explanation** for the correct answer.
    - Assign **points (default: 10 per question)**.
    - Format the response as a **JSON array**:

    [
      {
        "question": "Example question?",
        "questionType": "single",
        "answers": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Option A",
        "explanation": "Short explanation here.",
        "point": 10
      },
      {
        "question": "Another example?",
        "questionType": "multiple",
        "answers": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": ["Option B", "Option C"],
        "explanation": "Short explanation here.",
        "point": 10
      }
    ]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const cleanText = sanitizeJSON(text);
      const quizData = JSON.parse(cleanText);

      if (!Array.isArray(quizData) || quizData.length !== numQuestions) {
        throw new Error("Invalid quiz format");
      }

      return { nrOfQuestions: numQuestions.toString(), questions: quizData };
    } catch (error) {
      console.error("Quiz parsing error:", error);
      return { nrOfQuestions: "0", questions: [] };
    }
  } catch (error) {
    throw new Error(`Failed to generate quiz: ${error.message}`);
  }
};

export const generateChatResponse = async (message, context) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Create context-aware prompt
    const contextPrompt = `
      Context:
      Topic: ${context['What topic would you like to discuss today?'] || 'General'}
      Level: ${context["What's your current knowledge level in this topic? (Beginner/Intermediate/Advanced)"] || 'Intermediate'}
      Focus: ${context['What specific aspects would you like to focus on?'] || 'General understanding'}
      
      Be concise and helpful. Answer the following: ${message}
    `;

    const result = await model.generateContent(contextPrompt);
    return result.response.text();
  } catch (error) {
    console.error('Chat generation error:', error);
    throw new Error('Failed to generate response');
  }
};
