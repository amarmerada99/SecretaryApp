let lmSession;

          

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

  //create new session
  outputEl.textContent = "Preparing model...";
  lmSession = await LanguageModel.create({
    expectedInputs: [
      {type: "text", languages: ["en"]}
    ],
    expectedOutputs: [
      {type: "text", languages: ["en"]}
    ],
    //define purpose
    tools: [{
      name: "getWeather",
          description: "get weather by latitude and longitude",
        inputSchema:{
          type: "object",
          properties:{
            latitude: {
              type: "number",
              description: "The latitude of the point",
            },
            longitude: {
              type: "number",
              description: "the longitude of the point",
            },
          },
          required: ["latitude", "longitude"],
        },
        async execute({latitude, longitude}){
          const res = await fetch("https://api.weather.gov/points/" + latitude + "," + longitude);
          const data = await res.json();
          return data;
        }}],

    initialPrompts:[
      {role: "system",
        content: `You are the users helpful secretary. You can use tools 
        to help the user if they request specific actions. Don't reiterate 
        this sentence or the previous one in response. 

        you can call exactly and only the following tools:
        -getWeather: get weather by latitude and longitude
        
        If you need information you cannot know yet, you must use a tool, 
        and if you use a tool, you must respond with a single JSON object
        of the form: {"tool":"<toolName>","arguments":{...}} when you return this object, return ONLY this object,
        dont add the word "json" outside of it
        
        Do NOT answer the user yet if you call a tool. After you receive
        tool results, you will be called again with role: "tool", context
        and THEN you answer the user in natural language`
      }
    ],
  });

  lmSession.tools={
    getWeather: lmSession.expectedInputs
    ? lmSession.expectedInputs : undefined,
  };

  lmSession.tools={
    getWeather: {
      async execute ({latitude, longitude}){
        const res= await fetch(`https://api.weather.gov/points/${latitude},${longitude}`);
        const data = await res.json();
        return data;
      },

    },
  };

  return lmSession;
}

async function runTurn(session, userPrompt){
  console.log("runTurn called");
  let finalMessage = false;
  
  const primaryResponse = await session.prompt([
    {role: "user", content: userPrompt}
  ]);

  //check to see if tool was called
  let toolCall;
  try{
    toolCall = JSON.parse(primaryResponse);
    console.log(toolCall);
  } catch{
    toolCall = null;
  }

  //if there is no tool property, assume primary response is a string & return
  if(!toolCall || !toolCall.tool){
    console.log("no tool call");
    return typeof primaryResponse === "string" ? primaryResponse :primaryResponse.text ?? String(primaryResponse);
  }

  //find specified tool
  console.log(session);
  console.log(session.tools);
  console.log(toolCall.tool);
  const tool = session.tools[toolCall.tool];
  if(!tool){
    return `Error: model asked for unknown tool${toolCall.tool} ${Tools}`;
  }

  const toolResult = await tool.execute(toolCall.arguments || {});

  console.log(toolResult);
  const finalResponse = await session.prompt([
    {role: "user", content: userPrompt},
    {
      role: "tool",
      name: toolCall.tool,
      content: JSON.stringify(toolResult)
    }
  ]);

  return typeof finalResponse === "string" ?finalResponse : finalResponse?.text ?? String(finalResponse);
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

    output.textContent = "Generating...";
    const result = await runTurn(session, userPrompt.trim());

    console.log("result after tool is allegedly called: " + result);
    output.textContent = result;
  } catch (err) {
    console.error(err);
    if (!output.textContent) output.textContent = "something went wrong";
  }
}

async function getEmailById(){

}

async function getAllEmails(){

}

async function createEmail(){

}