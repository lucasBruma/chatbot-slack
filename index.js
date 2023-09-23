const { App } = require("@slack/bolt");
require("dotenv").config();

const questions = [
  "¿Cómo te llamas?",
  "¿Cuál es tu edad?",
  "¿Dónde vives?",
  "¿Cuál es tu ocupación?",
  "¿Qué pasatiempos tienes?",
];

const answers = [];

let currentQuestion = 0;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.APP_TOKEN,
});

(async () => {
  const port = 3000;
  await app.start(process.env.PORT || port);
  console.log("Bolt app started!!");
})();

app.message("hola", async ({ command, say }) => {
  try {
    await say("Bienvenido al cuestionario!");
    await say(questions[currentQuestion]);
  } catch (error) {
    console.error(error);
  }
});

app.message(async ({ message, say }) => {
  const answer = message.text;

  if (answer && !answer.includes("hola")) {
    answers.push(answer);
    currentQuestion++;

    if (currentQuestion < questions.length) {
      await say(questions[currentQuestion]);
    } else {
      await say(
        "Gracias por completar el cuestionario. Conversación finalizada."
      );
    }
  } else if (!answer.includes("hola")) {
    await say("Por favor, proporciona una respuesta válida.");
  }
});
