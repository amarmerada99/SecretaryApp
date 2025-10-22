let lmSession = null;

document.addEventListener('DOMContentLoaded', function(){
   document.getElementById('sendPrompt').addEventListener('click', async () => {
        const userInput = document.getElementById('promptInput').value;
        await reply(userInput);
      });
});


async function ensureModelSession(outputEl) {
  console.log("model creation function called");
  // check API presence
  if (typeof LanguageModel === "undefined") {
    outputEl.textContent = "This browser doesn't expose the Prompt API (LanguageModel). Try the latest Chrome/Edge Dev/Canary.";
    throw new Error("LanguageModel API not available");
  }

  // check API availability
  const availability = await LanguageModel.availability();
  if (availability === "unavailable") {
    outputEl.textContent = "Built-in model unavailable on this device/browser.";
    throw new Error("Model unavailable");
  }

  // 3) create session & download model if necessary
  outputEl.textContent = "Preparing model…";
  lmSession = await LanguageModel.create({
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        if (e.total && e.total > 0) {
          const pct = Math.round((e.loaded / e.total) * 100);
          outputEl.textContent = `Downloading model… ${pct}%`;
        } else {
          outputEl.textContent = "Downloading model…";
        }
      });
    }
  });

  return lmSession;
}

async function reply(userPrompt) {
  console.log("reply function called");
  const output = document.getElementById("responseOutput");

  if (!userPrompt?.trim()) {
    output.textContent = "Please enter a prompt!";
    return;
  }

  try {
    // make sure session has been initialized and the model has been loaded
    const session = lmSession ?? await ensureModelSession(output);

    output.textContent = "Generating…";
    const result = await session.prompt(
      "Respond to the following in Haiku form: " + userPrompt.trim()
    );

    output.textContent = typeof result === "string" ? result : (result?.text ?? String(result));
  } catch (err) {
    console.error(err);
    if (!output.textContent) output.textContent = "something went wrong";
  }
}