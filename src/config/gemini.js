import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY, {
  apiUrl:
    "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",
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
    // First, remove markdown code block markers
    let cleanedText = text.replace(/```(?:json)?/g, '').trim();
    
    // Extract JSON object/array from response
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) return text;
    
    // Clean up the extracted JSON
    let jsonText = jsonMatch[0]
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\\[^"\\\/bfnrtu]/g, '\\\\')          // Fix invalid escapes
      .replace(/\\n/g, ' ')                          // Replace newlines with spaces
      .replace(/\r?\n|\r/g, ' ')                     // Replace carriage returns
      .replace(/,\s*}/g, '}')                        // Fix trailing commas
      .replace(/,\s*\]/g, ']')                       // Fix trailing commas
      .trim();
    
    // Validate if it's parseable
    JSON.parse(jsonText);
    
    return jsonText;
  } catch (error) {
    console.error('JSON sanitization error:', error);
    
    // More aggressive fallback cleaning
    try {
      // Try to find and fix common JSON issues
      let attempt = text
        .replace(/```(?:json)?|```/g, '')  // Remove code blocks
        .replace(/\/\//g, '')              // Remove comments
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":') // Ensure property names are quoted
        .replace(/,(\s*[}\]])/g, '$1')     // Remove trailing commas
        .trim();
      
      const match = attempt.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      return match ? match[0] : text;
    } catch (e) {
      return text; // Return original if all attempts fail
    }
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

export const generateQuizData = async (topic, numQuestions, moduleContent = "") => {
  try {
    // Check if we have valid content to work with
    const hasContent = moduleContent && moduleContent.trim().length > 50;
    
    // Extract the topic title from formats like "Module 1: Introduction to React"
    let cleanTopic = topic;
    if (topic.includes(":")) {
      cleanTopic = topic.split(":")[1].trim();
    } else if (topic.match(/Module\s+\d+/i)) {
      // If topic only contains "Module X", extract from moduleContent
      if (hasContent) {
        const firstLine = moduleContent.split('\n')[0];
        if (firstLine && firstLine.includes(':')) {
          cleanTopic = firstLine.split(':')[1].trim();
        }
      }
    }
    
    const result = await genAI.generateContent(`
      Create a quiz about "${cleanTopic}" with exactly ${numQuestions} questions.
      ${hasContent ? "Use the following content to create relevant questions:\n" + moduleContent.substring(0, 5000) : ""}
      
      Each question should be directly relevant to the topic "${cleanTopic}" and ${hasContent ? "based on the provided content." : "a typical course on this subject."}
      
      Each question should have:
      - A clear and challenging question
      - 4 answer options (A, B, C, D)
      - The correct answer(s)
      - A brief explanation of why the answer is correct
      - A point value (10 points by default)
      - A question type (either "single" for single-choice or "multiple" for multiple-choice)

      Return the quiz in this exact JSON format:
      {
        "topic": "${cleanTopic}",
        "questions": [
          {
            "question": "Question text goes here?",
            "answers": ["Answer A", "Answer B", "Answer C", "Answer D"],
            "correctAnswer": ["Answer A"], 
            "explanation": "Explanation of correct answer",
            "point": 10,
            "questionType": "single"
          },
          ...more questions...
        ]
      }
      
      For multiple-choice questions where more than one answer is correct, use the format:
      "correctAnswer": ["Answer A", "Answer C"]
      and set questionType to "multiple".
      
      Make sure all JSON is valid and question counts match exactly ${numQuestions}.
      If you cannot generate content on this specific topic, focus on generating questions about ${cleanTopic.split(' ').slice(0, 3).join(' ')}.
    `);

    const resultText = result.response.text();
    
    // Extract JSON from the response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }

    const quizData = JSON.parse(jsonMatch[0]);
    
    // Ensure the topic is properly set in the response
    if (!quizData.topic || quizData.topic === "${topic}" || quizData.topic === cleanTopic) {
      quizData.topic = topic; // Use original topic for display purposes
    }
    
    return quizData;
  } catch (error) {
    console.error("Error generating quiz:", error);
    
    // Create a fallback quiz with the original topic
    return {
      topic: topic,
      questions: Array.from({ length: numQuestions }, (_, i) => ({
        question: `Question ${i + 1} about ${topic}?`,
        answers: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: ["Option A"],
        explanation: `This is the correct answer for question ${i + 1} about ${topic}.`,
        point: 10,
        questionType: "single"
      }))
    };
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

export const generatePersonalizedCareerPaths = async (userData) => {
  if (!userData || typeof userData !== "object") {
    throw new Error("Invalid user data provided");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `
    Create 4 highly personalized career/learning paths for a user with the following profile:
    
    Name: ${userData.name || 'Anonymous'}
    Age: ${userData.age || 'Unknown'}
    Career Goal: "${userData.careerGoal || 'Improve technical skills'}"
    Current Skills: ${JSON.stringify(userData.skills || [])}
    Interests: ${JSON.stringify(userData.interests || [])}
    
    For each career path:
    1. Give it a specific, personalized name that aligns with their career goal and interests
    2. Create between 5-8 modules (fewer for simpler topics, more for complex ones)
    3. Make each module build logically on the previous ones
    4. Tailor the content to leverage their existing skills and knowledge
    5. Each career path should have a clear end goal that helps them progress toward their stated career objective
    
    Return EXACTLY 4 career paths in this JSON format:
    [
      {
        "pathName": "Personalized path name based on their profile",
        "description": "A brief description of this career path and how it helps them achieve their goal",
        "difficulty": "beginner|intermediate|advanced",
        "estimatedTimeToComplete": "X months",
        "relevanceScore": 95, // How relevant this path is to their profile (0-100)
        "modules": [
          {
            "title": "Module 1: Module Title",
            "description": "Brief description of what this module covers",
            "estimatedHours": 8, // Vary based on topic complexity
            "keySkills": ["skill1", "skill2"]
          },
          // More modules...
        ]
      },
      // 3 more paths...
    ]
    
    Make sure the career paths are varied but all relevant to their profile. Paths should leverage their existing skills but push them toward their stated career goal. Module count should vary based on topic complexity.
    `;

    const result = await retry(() => model.generateContent(prompt));
    const text = result.response.text();
    
    try {
      const cleanText = sanitizeJSON(text);
      const careerPaths = JSON.parse(cleanText);
      
      if (!Array.isArray(careerPaths) || careerPaths.length !== 4) {
        throw new Error("Invalid career paths format");
      }
      
      // Validate and clean up each career path
      return careerPaths.map(path => ({
        pathName: path.pathName || "Career Path",
        description: path.description || `A learning path toward ${userData.careerGoal}`,
        difficulty: ["beginner", "intermediate", "advanced"].includes(path.difficulty) ? 
          path.difficulty : "intermediate",
        estimatedTimeToComplete: path.estimatedTimeToComplete || "3 months",
        relevanceScore: typeof path.relevanceScore === 'number' ? 
          Math.max(0, Math.min(100, path.relevanceScore)) : 85,
        modules: Array.isArray(path.modules) ? 
          path.modules.map((module, idx) => ({
            title: module.title || `Module ${idx + 1}`,
            description: module.description || "Learn important skills in this area",
            estimatedHours: typeof module.estimatedHours === 'number' ? module.estimatedHours : 8,
            keySkills: Array.isArray(module.keySkills) ? module.keySkills : []
          })) : 
          generateDefaultModules(path.pathName || "Career Path", 5)
      }));
    } catch (error) {
      console.error("Career path parsing error:", error);
      
      // Generate fallback career paths
      return generateFallbackCareerPaths(userData);
    }
  } catch (error) {
    console.error("Error generating personalized career paths:", error);
    throw error;
  }
};

// Helper function to generate default modules for fallback
const generateDefaultModules = (pathName, count) => {
  return Array.from({ length: count }, (_, i) => ({
    title: `Module ${i + 1}: ${pathName} Fundamentals ${i + 1}`,
    description: `Learn essential concepts and skills related to ${pathName}`,
    estimatedHours: 8,
    keySkills: []
  }));
};

// Generate fallback career paths if the API fails
const generateFallbackCareerPaths = (userData) => {
  const goal = userData.careerGoal || "tech career";
  const interests = userData.interests || ["programming", "technology"];
  const skills = userData.skills || ["basic coding"];
  
  return [
    {
      pathName: `${goal} Fundamentals`,
      description: `Master the core concepts needed for a successful career in ${goal}`,
      difficulty: "beginner",
      estimatedTimeToComplete: "3 months",
      relevanceScore: 90,
      modules: generateDefaultModules(`${goal} Fundamentals`, 5)
    },
    {
      pathName: `Advanced ${interests[0] || "Tech"} Specialization`,
      description: `Deepen your knowledge in ${interests[0] || "technology"} to stand out in your career`,
      difficulty: "intermediate",
      estimatedTimeToComplete: "4 months",
      relevanceScore: 85,
      modules: generateDefaultModules(`${interests[0] || "Tech"} Specialization`, 6)
    },
    {
      pathName: `${skills[0] || "Coding"} Mastery`,
      description: `Build upon your existing ${skills[0] || "coding"} skills to reach expert level`,
      difficulty: "advanced",
      estimatedTimeToComplete: "5 months",
      relevanceScore: 80,
      modules: generateDefaultModules(`${skills[0] || "Coding"} Mastery`, 7)
    },
    {
      pathName: `Practical ${goal} Projects`,
      description: `Apply your knowledge through hands-on projects relevant to ${goal}`,
      difficulty: "intermediate",
      estimatedTimeToComplete: "3 months",
      relevanceScore: 88,
      modules: generateDefaultModules(`${goal} Projects`, 5)
    }
  ];
};
