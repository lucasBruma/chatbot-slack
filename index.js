const { App } = require("@slack/bolt");
require("dotenv").config();
const admin = require("firebase-admin");
var serviceAccount = require("./admin.json");
var questionnaire = require("./questionnaire");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://chatbot-slack-f8022-default-rtdb.firebaseio.com",
  authDomain: "chatbot-slack-f8022.firebaseapp.com",
});

const answers = [];

const db = admin.database();

let currentSection = 0;
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
    await askNextQuestion(say);
  } catch (error) {
    console.error(error);
  }
});

app.message(async ({ message, say, client }) => {
  const answer = message.text;

  // Obtengo mail del usuario que envio mensaje
  const userInfo = await client.users.info({
    user: message.user,
    token: process.env.SLACK_BOT_TOKEN,
  });

  if (answer && !answer.includes("hola")) {
    if (!answers[questionnaire[currentSection].slug]) {
      answers[questionnaire[currentSection].slug] = [];
    }

    answers[questionnaire[currentSection].slug].push(answer);

    // Avanzar a la siguiente pregunta
    currentQuestion++;

    // Comprobar si todas las preguntas de la sección actual han sido respondidas
    if (
      currentQuestion >= questionnaire[currentSection].specificQuestions.length
    ) {
      // Comprobar si hemos llegado al final del cuestionario
      if (currentSection >= questionnaire.length - 1) {
        const ref = db.ref("proyecto");
        const newProjectRef = ref.push();
        newProjectRef.set({
          usuario: message.user,
          email: userInfo.user.profile.email,
          respuestas: answers,
        });

        await say(
          "Gracias por completar el cuestionario. En breves estaremos en contacto!."
        );
        return;
      }

      currentSection++;
      currentQuestion = 0;
    }

    await askNextQuestion(say);
  } else if (!answer.includes("hola")) {
    await say("Por favor, proporciona una respuesta válida.");
  }
});

async function askNextQuestion(say) {
  if (currentQuestion == 0) {
    await say(questionnaire[currentSection].nameSection);
  }
  await say(questionnaire[currentSection].specificQuestions[currentQuestion]);
}
