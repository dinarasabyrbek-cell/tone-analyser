# Tone Analyser — Requirements

## Overview

A single-page HTML tool called **Tone Analyser** that connects to the Claude API. Delivered as a single `.html` file with no external libraries.

---

## UI Elements

| Element | Details |
|---|---|
| API Key input | Password-type input field at the top of the page |
| Text area | Large, labelled "Paste your writing here" |
| Analyse button | Blue (`#2563EB`), labelled "Analyse Tone" |
| Results box | Light blue background (`#EFF6FF`), shown after a successful response |
| Spinner | Displayed while awaiting the API response |
| Error box | Red background, shown on API or network errors |
| Reset button | Labelled "Clear & Start Again", resets all fields and output |

---

## Behaviour

### On clicking "Analyse Tone"
1. Read the API key and the pasted text.
2. Show a spinner and disable the button.
3. Send the text to the Claude API using `fetch()`.
   - **Provider:** OpenRouter (`https://openrouter.ai/api/v1/chat/completions`)
   - **Model:** `anthropic/claude-sonnet-4-6`
   - **System prompt:**
     > "You are a professional writing coach. Analyse the tone of the writing. Respond with three sections: OVERALL TONE, WHAT'S WORKING (3 bullets), WHAT TO CONSIDER (3 bullets). Be specific."
4. On success: hide the spinner and display the response in the light blue results box.
5. On error: hide the spinner and display the error message in a red error box.

### On clicking "Clear & Start Again"
- Clear the text area, results box, and error box.
- Re-enable the Analyse button.
- Keep the API key field populated (user convenience).

---

## Technical Constraints

- Single `.html` file — all CSS and JavaScript inline.
- No external libraries or CDN dependencies.
- API calls made client-side via `fetch()`.
