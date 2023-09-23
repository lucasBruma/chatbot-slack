const { App } = require("@slack/bolt");
require("dotenv").config();
const admin = require("firebase-admin");
var serviceAccount = require("./admin.json");
var questionnaire = require("./questionnaire");
// var questions = require("./questions.js");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://chatbot-slack-f8022-default-rtdb.firebaseio.com",
  authDomain: "chatbot-slack-f8022.firebaseapp.com",
});

const answers = [];

const db = admin.firestore();

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

app.message(async ({ message, say }) => {
  const answer = message.text;

  if (answer && !answer.includes("hola")) {
    answers[slug].push(answer);
    // Avanzar a la siguiente pregunta
    currentQuestion++;

    // Comprobar si todas las preguntas de la sección actual han sido respondidas
    if (
      currentQuestion >= questionnaire[currentSection].specificQuestions.length
    ) {
      // Comprobar si hemos llegado al final del cuestionario
      if (currentSection >= questionnaire.length - 1) {
        await db.collection("proyecto").add({
          usuario: message.username,
          titulo: answers["titulo"],
          descripcion: answers["descripcion"],
          skillsRequeridas: answers["skillsRequeridas"],
          alcance: answers["alcance"],
          // cronograma: answers["cronograma"],
          // presupuesto: answers["presupuesto"],
          // comunicacion: answers["comunicacion"],
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        await say(
          "Gracias por completar el cuestionario. En breves estaremos en contacto!."
        );
        return;
      }

      // Si no, avanzar a la siguiente sección
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

// Confirmation message listener
app.message(/confirm:(\w+):(\w+)/, async ({ message, say, context }) => {
  try {
    const matches = context.matches;
    const questionnaireId = matches[1];
    const developerSlackId = matches[2];

    // Find the questionnaire in the database by ID
    const questionnaireDoc = await db.collection('proyecto').doc(questionnaireId).get();
    
    if(!questionnaireDoc.exists) {
      await say('Invalid questionnaire ID.');
      return;
    }

    // Update the questionnaire with the selected developer's ID and set confirmed to true
    await questionnaireDoc.ref.update({
      developerId: developerSlackId,
      confirmed: true
    });

    // Notify the initial user
    const userSlackId = questionnaireDoc.data().usuario;
    app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: userSlackId,
      text: `Great news! A developer has been selected for your project.`
    });

  } catch (error) {
    console.error(error);
    await say('An error occurred. Please try again.');
  }
});
