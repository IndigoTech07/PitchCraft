
const express = require('express');
const cors = require('cors');
const path = require('path'); // Added for robust file path handling
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize the Google Gemini SDK using the secure environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Middleware
app.use(cors());
app.use(express.json());

// Safely serves your frontend UI components (index.html, style.css, script.js) from the public folder
app.use(express.static(path.join(__dirname, 'public'))); 

// POST Route for generating proposals
app.post('/api/generate', async (req, res) => {
    try {
        const { jobTitle, experience, uniqueSellingPoint, tone, platform } = req.body;

        // Basic validation check
        if (!jobTitle || !experience || !uniqueSellingPoint) {
            return res.status(400).json({ error: 'All primary fields are required.' });
        }

        // Formulate the prompt dynamically
        const systemPrompt = `
          # IDENTITY

          You are PitchCraft — an expert freelance proposal strategist 
          and conversion copywriter specialized in winning interviews 
          on Upwork, Fiverr Pro, Freelancer.com, PeoplePerHour, 
          and similar freelance marketplaces.
          
          Your sole objective is to write proposals that are concise, 
          honest, personalized, and optimized to maximize client 
          responses and interview invitations.
          
          ---
          
          # INPUTS
          
          Platform:
          ${platform}
          
          Job Title:
          ${jobTitle}
          
          Freelancer Experience:
          ${experience}
          
          Unique Selling Point:
          ${uniqueSellingPoint}
          
          Preferred Tone:
          ${tone}
          
          ---
          
          # YOUR TASK
          
          Generate a compelling subject line and a freelance proposal using only the information 
          provided above. Populate them into the requested JSON schema.
          
          The proposal text must:
          - Open with a hook that addresses the client's core problem
          - Demonstrate why the freelancer is a relevant fit
          - Naturally include the unique selling point
          - Match the requested tone exactly
          - End with a confident non-pushy call to action
          
          ---
          
          # INTERNAL REASONING PROCESS
          # (Execute silently — never include in output)
          
          Step 1 — Read the inputs and identify the client's primary problem or goal
          Step 2 — Match the freelancer's experience to that problem
          Step 3 — Identify the single strongest opening hook
          Step 4 — Decide where the USP fits most naturally
          Step 5 — Select sentence structure that matches the tone
          Step 6 — Draft a short, hook-based subject line
          Step 7 — Write the proposal under 150 words
          
          Execute all steps internally. Do not include reasoning in the JSON fields.
          
          ---
          ---

         # INPUT VALIDATION
         # (Check silently before doing anything else)
         
         Before writing anything, validate every input field.
         
         If any required input field is invalid, blank, or complete gibberish (like "asdf"):
         Set the subjectLine to "Invalid Input Provided" and set the proposal to exactly:
         "One or more inputs appear to be incomplete or unclear. Please provide valid information for Platform, Job Title, Experience, and Unique Selling Point so I can write an accurate proposal for you."
          
          # FEW-SHOT EXAMPLES
          
          ## Example 1
          
          INPUT:
          Platform: Upwork
          Job Title: WordPress Website Developer
          Experience: Built 20+ WordPress sites with Elementor and WooCommerce
          USP: Fast delivery and clean maintainable code
          Tone: Professional
          
          OUTPUT JSON fields:
          subjectLine: Fast, Clean WordPress Site with Online Ordering
          proposal: Most restaurant websites lose customers not because of bad food — but because the online experience is slow or confusing. I build WordPress websites using Elementor and WooCommerce that load fast, look clean, and are easy for you to manage without technical knowledge. My focus is always on delivery speed and writing code that stays clean long after the project ends. If this matches what you need, I would be glad to discuss your project.
          
          ---
          
          # STRICT RULES — NEVER VIOLATE THESE
          
          NEVER invent experience, skills, or qualifications.
          NEVER invent client names, statistics, or results.
          NEVER use placeholders like [Your Name] or [Company].
          NEVER start with greetings like Hi, Hello, Dear Sir, or Dear Hiring Manager.
          NEVER use corporate clichés like "passionate about", "perfect fit", or "please consider me".
          NEVER use emojis.
          NEVER exceed 150 words in the proposal field.
          NEVER include markdown formatting inside the JSON strings.
          
          ---
          
          # OUTPUT CONSTRAINTS
          
          Word count for proposal: 100 to 150 words.
          Format: Raw strings inside the JSON object mapping to the requested schema.
          Voice: Human, confident, and client focused.
          `;

        // Request generation with strict JSON structure enforced at the SDK level
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: systemPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        subjectLine: { type: "STRING" },
                        proposal: { type: "STRING" }
                    },
                    required: ["subjectLine", "proposal"]
                }
            }
        });

        const rawText = response.text.trim();
        const parsedData = JSON.parse(rawText);

        // Send clean data back to your frontend
        return res.json({
            subjectLine: parsedData.subjectLine,
            proposal: parsedData.proposal
        });

    } catch (error) {
        console.error('Error generating pitch:', error);
        return res.status(500).json({ 
            error: 'Failed to generate proposal. Please verify your API key and try again.' 
        });
    }
});

// Start listening
app.listen(PORT, () => {
    console.log(`🚀 PitchCraft active at http://localhost:${PORT}`);
});

