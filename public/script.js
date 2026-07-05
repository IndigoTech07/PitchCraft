document.addEventListener('DOMContentLoaded', () => {
    // Core Form & Action Elements
    const form = document.getElementById('proposalForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const subjectOutput = document.getElementById('subjectOutput');
    const proposalOutput = document.getElementById('proposalOutput');
    const copyBtn = document.getElementById('copyBtn');
    const regenerateBtn = document.getElementById('regenerateBtn');

    // Form Input Elements
    const jobTitleInput = document.getElementById('jobTitle');
    const experienceInput = document.getElementById('experience');
    const uspInput = document.getElementById('usp');
    const toneSelect = document.getElementById('tone');
    const platformSelect = document.getElementById('platform');

    // Global Cache for the Regenerate Feature
    let lastSavedData = null;

    // --- 1. CHARACTER COUNTER & VALIDATION FEATURE ---
    // Dynamically inject counter elements below text fields
    createCharCounter(jobTitleInput, 100);
    createCharCounter(experienceInput, 500);
    createCharCounter(uspInput, 200);

    function createCharCounter(inputElement, maxChars) {
        const counter = document.createElement('span');
        counter.className = 'char-counter';
        counter.style.cssText = 'font-size: 0.75rem; color: var(--text-muted); text-align: right; margin-top: 0.25rem; display: block;';
        counter.innerText = `0 / ${maxChars} characters`;
        inputElement.parentNode.appendChild(counter);

        inputElement.addEventListener('input', () => {
            const currentLength = inputElement.value.length;
            counter.innerText = `${currentLength} / ${maxChars} characters`;
            
            if (currentLength > maxChars) {
                counter.style.color = '#ef4444'; // Red if exceeded
            } else {
                counter.style.color = 'var(--text-muted)';
            }
            validateForm();
        });
    }

    // Disable generate button if essential fields are empty
    function validateForm() {
        if (!jobTitleInput.value.trim() || !experienceInput.value.trim() || !uspInput.value.trim()) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.5";
        } else {
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
        }
    }
    // Initial validation check on boot
    validateForm();


    // --- 2. CORE SUBMIT & GENERATE FLOW ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            jobTitle: jobTitleInput.value.trim(),
            experience: experienceInput.value.trim(),
            uniqueSellingPoint: uspInput.value.trim(),
            tone: toneSelect.value,
            platform: platformSelect.value
        };

        lastSavedData = payload; // Cache inputs for regeneration
        await generateProposal(payload);
    });

    async function generateProposal(data) {
        // --- 3. LOADING STATE FEATURE ---
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-icon">⚡</span> Crafting...';
        submitBtn.style.cursor = 'not-allowed';
        
        subjectOutput.innerText = 'Analyzing job description...';
        proposalOutput.innerText = 'Consulting Gemini AI to build your winning pitch...';
        
        // Remove old word counters if they exist
        removeWordCountBadge();

        copyBtn.disabled = true;
        regenerateBtn.disabled = true;

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            // --- 4. ERROR HANDLING FEATURE ---
            if (!response.ok) throw new Error('API server down or limit reached.');

            const result = await response.json();

            // Populate text
            subjectOutput.innerText = result.subjectLine;
            proposalOutput.innerText = result.proposal;

            subjectOutput.classList.remove('placeholder-text');
            proposalOutput.classList.remove('placeholder-text');

            // --- 5. WORD COUNT FEATURE ---
            displayWordCount(result.proposal);

            // Activate control buttons
            copyBtn.disabled = false;
            regenerateBtn.disabled = false;

        } catch (err) {
            console.error(err);
            // Soft failure user message
            subjectOutput.innerText = 'Generation Interrupted';
            proposalOutput.innerText = 'Something went wrong. Please try again or check your inputs.';
            proposalOutput.style.color = '#426c5e'; // soft red highlight
            
            copyBtn.disabled = true;
            regenerateBtn.disabled = true;
        } finally {
            // Restore original button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Generate Proposal';
            submitBtn.style.cursor = 'pointer';
            validateForm();
        }
    }


    // --- 6. REGENERATE BUTTON FEATURE ---
    regenerateBtn.addEventListener('click', () => {
        if (lastSavedData) {
            // We slightly modify the context implicitly via timestamp to trigger an alternate Gemini path
            const tweakedData = { ...lastSavedData, timestamp: Date.now() };
            generateProposal(tweakedData);
        }
    });


    // --- 7. COPY BUTTON FEATURE ---
    copyBtn.addEventListener('click', () => {
        const textToCopy = proposalOutput.innerText;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyBtn.innerText;
            copyBtn.innerText = 'Copied! ✅';
            copyBtn.style.backgroundColor = '#10b981'; // Green accent animation
            
            setTimeout(() => {
                copyBtn.innerText = originalText;
                copyBtn.style.backgroundColor = ''; // Reset
            }, 2000);
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    });


    // --- HELPERS ---
    function displayWordCount(text) {
        removeWordCountBadge();
        const wordCount = text.trim().split(/\s+/).length;
        
        const badge = document.createElement('div');
        badge.id = 'wordCountBadge';
        badge.innerText = `${wordCount} words`;
        badge.style.cssText = 'font-size: 0.8rem; font-weight: 600; padding: 0.25rem 0.6rem; border-radius: 4px; display: inline-block; margin-top: 0.5rem;';

        // Check if within our strict 100-150 word standard range
        if (wordCount >= 100 && wordCount <= 150) {
            badge.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
            badge.style.color = '#34d399'; // Safe Green
        } else {
            badge.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
            badge.style.color = '#fbbf24'; // Warning Amber
        }

        proposalOutput.parentNode.appendChild(badge);
    }

    function removeWordCountBadge() {
        const existingBadge = document.getElementById('wordCountBadge');
        if (existingBadge) existingBadge.remove();
    }
});
