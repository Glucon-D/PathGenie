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

export const generateQuiz = async (moduleName, numQuestions = 5) => {
  if (!moduleName || typeof moduleName !== "string") {
    throw new Error("Invalid module name provided");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Generate a 5-question quiz for the topic: "${moduleName}" with 4 options each and the correct answer marked.
    
    **Requirements:**
    - Each question should test understanding of ${moduleName} concepts
    - Include a mix of difficulty levels (basic to advanced)
    - Provide 4 answer options for each question (a, b, c, d format)
    - Clearly mark the correct answer
    - Format as a JSON object:

    {
      "questions": [
        {
          "question": "Question text here?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 0,
          "explanation": "Brief explanation of why this is correct"
        },
        // 4 more questions following the same format
      ]
    }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const cleanText = sanitizeJSON(text);
      const quizData = JSON.parse(cleanText);
      
      if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
        throw new Error("Invalid quiz format");
      }

      return quizData;
    } catch (error) {
      console.error("Quiz parsing error:", error);
      // Fallback quiz if parsing fails
      return {
        questions: [
          {
            question: `What is the main focus of ${moduleName}?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 0,
            explanation: "This is the correct answer based on the module content."
          },
          {
            question: `Which of these is NOT related to ${moduleName}?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 1,
            explanation: "This option is unrelated to the topic."
          },
          {
            question: `What is a key principle in ${moduleName}?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 2,
            explanation: "This principle is fundamental to understanding the topic."
          },
          {
            question: `How does ${moduleName} apply to real-world scenarios?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 3,
            explanation: "This reflects the practical application of the concept."
          },
          {
            question: `What advanced technique is associated with ${moduleName}?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 0,
            explanation: "This is an advanced technique in this field."
          }
        ]
      };
    }
  } catch (error) {
    throw new Error(`Failed to generate quiz: ${error.message}`);
  }
};

// Helper function to retry API calls
const retry = async (fn, retries = MAX_RETRIES, delay = RETRY_DELAY) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying... Attempts left: ${retries - 1}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay);
    }
    throw error;
  }
};

// Consolidated function that handles both topic-based and career-based learning paths
export const generateLearningPath = async (goal, options = { type: 'topic', detailed: false }) => {
  if (!goal || typeof goal !== "string") {
    throw new Error("Invalid goal/topic provided");
  }
  
  // Determine if we're generating a simple topic path or a detailed career path
  const isCareerPath = options.type === 'career';
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: isCareerPath ? "gemini-1.5-pro" : "gemini-1.5-flash" 
    });

    let prompt;
    
    if (isCareerPath) {
      prompt = `Create a structured learning path for someone who wants to learn about "${goal}". 
      Design a series of modules (between 5-7) that progressively build knowledge from basics to advanced concepts.
      
      Return the result as a JSON array with this structure:
      [
        {
          "title": "Module title",
          "description": "Brief description of what will be covered in this module",
          "estimatedTime": "Estimated time to complete (e.g., '2-3 hours')",
          "content": "Detailed content overview with key points to learn"
        }
      ]
      
      Make sure the content is comprehensive, accurate, and follows a logical progression from fundamentals to more complex topics.`;
    } else {
      prompt = `Generate a comprehensive learning path for: "${goal}"
      Requirements:
      - Create exactly 5 progressive modules
      - Each module should build upon previous knowledge
      - Focus on practical, hands-on learning
      - Include both theoretical and practical aspects
      
      Return ONLY a JSON array with exactly 5 strings in this format:
      ["Module 1: [Clear Title]", "Module 2: [Clear Title]", "Module 3: [Clear Title]", "Module 4: [Clear Title]", "Module 5: [Clear Title]"]
      `;
    }

    const result = await (isCareerPath ? 
      retry(() => model.generateContent(prompt)) : 
      model.generateContent(prompt));
      
    const text = isCareerPath ? result.response.text() : result.response.text();

    try {
      // Extract JSON from the response
      const cleanText = sanitizeJSON(text);
      
      if (isCareerPath) {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const jsonString = jsonMatch[0];
          const modulesData = JSON.parse(jsonString);
          
          // Validate and clean the data
          const cleanedModules = modulesData.map(module => ({
            title: module.title || `Learning ${goal}`,
            description: module.description || `Learn about ${goal}`,
            estimatedTime: module.estimatedTime || "1-2 hours",
            content: module.content || `This module will teach you about ${goal}`
          }));
          
          return cleanedModules;
        } else {
          throw new Error("Failed to parse JSON");
        }
      } else {
        const modules = JSON.parse(cleanText);
        if (!Array.isArray(modules) || modules.length !== 5) {
          throw new Error("Invalid response format");
        }
        return modules;
      }
    } catch (error) {
      console.error("Parsing error:", error);
      
      if (isCareerPath) {
        // Return a fallback career learning path
        return [
          {
            title: `Introduction to ${goal}`,
            description: `Learn the fundamentals of ${goal}`,
            estimatedTime: "1-2 hours",
            content: `This module introduces the basic concepts of ${goal}.`
          },
          {
            title: `${goal} Fundamentals`,
            description: `Understand the core principles of ${goal}`,
            estimatedTime: "2-3 hours",
            content: `Build a solid foundation in ${goal} by mastering the essential concepts.`
          },
          {
            title: `Practical ${goal}`,
            description: `Apply your knowledge through practical exercises`,
            estimatedTime: "3-4 hours",
            content: `Practice makes perfect. In this module, you'll apply your theoretical knowledge.`
          },
          {
            title: `Advanced ${goal}`,
            description: `Dive deeper into advanced concepts`,
            estimatedTime: "3-4 hours",
            content: `Take your skills to the next level with advanced techniques and methodologies.`
          },
          {
            title: `${goal} in the Real World`,
            description: `Learn how to apply your skills in real-world scenarios`,
            estimatedTime: "2-3 hours",
            content: `Discover how professionals use these skills in industry settings.`
          }
        ];
      } else {
        // Return a fallback simple learning path
        return [
          `Module 1: Introduction to ${goal}`,
          `Module 2: Core Concepts of ${goal}`,
          `Module 3: Intermediate ${goal} Techniques`,
          `Module 4: Advanced ${goal} Applications`,
          `Module 5: Real-world ${goal} Projects`,
        ];
      }
    }
  } catch (error) {
    console.error("Error generating learning path:", error);
    
    if (isCareerPath) {
      // Return a fallback career learning path
      return [
        {
          title: `Introduction to ${goal}`,
          description: `Learn the fundamentals of ${goal}`,
          estimatedTime: "1-2 hours",
          content: `This module introduces the basic concepts of ${goal}.`
        },
        {
          title: `${goal} Fundamentals`,
          description: `Understand the core principles of ${goal}`,
          estimatedTime: "2-3 hours",
          content: `Build a solid foundation in ${goal} by mastering the essential concepts.`
        },
        {
          title: `Practical ${goal}`,
          description: `Apply your knowledge through practical exercises`,
          estimatedTime: "3-4 hours",
          content: `Practice makes perfect. In this module, you'll apply your theoretical knowledge.`
        },
        {
          title: `Advanced ${goal}`,
          description: `Dive deeper into advanced concepts`,
          estimatedTime: "3-4 hours",
          content: `Take your skills to the next level with advanced techniques and methodologies.`
        },
        {
          title: `${goal} in the Real World`,
          description: `Learn how to apply your skills in real-world scenarios`,
          estimatedTime: "2-3 hours",
          content: `Discover how professionals use these skills in industry settings.`
        }
      ];
    } else {
      // Return a fallback simple learning path
      return [
        `Module 1: Introduction to ${goal}`,
        `Module 2: Core Concepts of ${goal}`,
        `Module 3: Intermediate ${goal} Techniques`,
        `Module 4: Advanced ${goal} Applications`,
        `Module 5: Real-world ${goal} Projects`,
      ];
    }
  }
};
