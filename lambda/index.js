const Alexa = require('ask-sdk-core');
const spanishTool = require('./spanishStrings');
const arrayTool = require('./array-tools');
const words = require('./words');

/* CONSTANTS */

const appTitle = '21 Game';

const numbersCount = 21;
const maxFails = 4;
const numbers = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno'];

const welcomeMessage = '¡Bienvenido al juego del 21! Rellenad vuestras bebidas y que comienze el juego. Para comenzar un nuevo juego puedes decir "comenzar".';
const startGameMessage = 'Decid en orden los números, de uno en uno, del 1 al 21. ¡Empieza el juego! Que el primer jugador diga "uno" y los siguientes continuen la secuencia.';
const exitSkillMessage = '¿Ya se ha acabado la bebida? ¡Nos vemos en la próxima!';
const helpMessage = 'El juego 21 es un juego de grupo, en orden hay que decir todos los numeros, de uno en uno, del 1 al 21. Al acabar una ronda, cambiaré uno de los números por otro número o palabra y habrá que decirlo en su lugar. ¡El que se equivoque al decir un número bebe! Dí "Comenzar" para empezar el juego';
const endGameMessage = '¡Enhorabuena habéis terminado el juego! Ahora bebed todos para celebrarlo';

const positiveMessages = ["Bien", "Siguiente", "Correcto", "Exacto"];

/* INTENT HANDLERS */

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        // Set attributes as no started game
        var attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.gameStarted = false;
        handlerInput.attributesManager.setSessionAttributes(attributes);

        // Response
        return handlerInput.responseBuilder
            .speak(welcomeMessage)
            .reprompt(helpMessage)
            .withSimpleCard(appTitle, welcomeMessage)
            .getResponse();
    }
};

const GameIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
                && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GameIntentHandler';

    },
    handle(handlerInput) {
        // Set positions to change Array
        var positionsToChange = [];
        for (var i = 0; i < numbersCount; i++) {
            positionsToChange.push(i);
        }
        arrayTool.shuffle(positionsToChange);

        // Initialize game attributes
        var attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.gameStarted = true;
        attributes.numbers = numbers;
        attributes.positionsToChange = positionsToChange;
        attributes.currentNumber = 0;
        attributes.rounds = 0;
        attributes.fails = 0;
        handlerInput.attributesManager.setSessionAttributes(attributes);

        // Response
        return handlerInput.responseBuilder
            .speak(startGameMessage)
            .reprompt(startGameMessage)
            .getResponse();
    },
};

const RoundIntentHandler = {
    canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RoundIntentHandler';
    },
    handle(handlerInput) {

        // Get Attributes data
        var attributes = handlerInput.attributesManager.getSessionAttributes();
        var numberSet = attributes.numbers;
        const current = attributes.currentNumber;
        const currentRound = attributes.rounds;

        // If game isn't started show help message
        if (!attributes.gameStarted) {
            return handlerInput.responseBuilder
                .speak(helpMessage)
                .reprompt(helpMessage)
                .getResponse();
        }

        // Check if number is correct
        const correctsSlots = compareSlots(handlerInput.requestEnvelope.request.intent.slots, numberSet, current);

        // Set correct / incorrect message
        var speakOutput = '';
        var repromptOutput = '';
        if (correctsSlots > 0) {
            attributes.currentNumber += correctsSlots;
            attributes.fails = 0;

            speakOutput = '¡' + positiveMessages[Math.floor(Math.random() * positiveMessages.length)] + '!';
            repromptOutput = '¡Siguiente!';

            if (correctsSlots > 1) {
                speakOutput += ' Has dicho correctamente ' + correctsSlots + ' consecutivos.';
            }

        } else {

            speakOutput = wrongNumber(handlerInput);
            repromptOutput = speakOutput;
        }

        // If the number is correct
        if (attributes.currentNumber >= numbersCount) {
            // Game Finished
            if (currentRound === numbersCount) {
                speakOutput = endGameMessage;

                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .withShouldEndSession(true)
                    .getResponse();
            }
            // Next Game Round
            else {
                var positionsToChange = attributes.positionsToChange;
                var position = positionsToChange.pop();
                numberSet[position] = words.words[Math.floor(Math.random() * words.words.length)];

                attributes.numbers = numberSet;
                attributes.currentNumber = 0;
                attributes.rounds += 1;
                attributes.positionsToChange = positionsToChange;

                speakOutput = '¡Ronda finalizada! Ahora en el número ' + spanishTool.NumberToLetters(parseInt((position + 1), 10)).toString().toLowerCase() + ' hay que decir: "' + numberSet[position] + '". ¡Que el siguiente jugador empieze diciendo el primero!';
                repromptOutput = '¡Que el siguiente jugador empieze por el primero!';
            }
        }

    // Response
    handlerInput.attributesManager.setSessionAttributes(attributes);
    return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
                && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        var speakOutput = '';
        var attributes = handlerInput.attributesManager.getSessionAttributes();

        if (!attributes.gameStarted) {
            speakOutput = helpMessage;
        } else {
            speakOutput = wrongNumber(handlerInput);
        }

        return handlerInput.responseBuilder
            .speak(helpMessage)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(exitSkillMessage)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        var attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.gameStarted = false;
        handlerInput.attributesManager.setSessionAttributes(attributes);

        return handlerInput.responseBuilder.getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`++++ Error handled: ${error.stack}`);
        return handlerInput.responseBuilder
            .speak(helpMessage)
            .reprompt(helpMessage)
            .getResponse();
    }
};

/* HELPER FUNCTIONS */

function compareSlots(slots, values, valuesIndex) {
    var correctSlots = 0;
    for (var i = 0; i < numbersCount; i++) {
        var slot  = "roundText" + String.fromCharCode("A".charCodeAt(0) + i);

        if (Object.prototype.hasOwnProperty.call(slots, slot) && slots[slot].value !== undefined && valuesIndex + correctSlots < values.length) {
            var slotArray = slots[slot].value.toString().split(' ');
            for (const slotValue in slotArray) {
                // Si es una palabra
                if (spanishTool.NormalizeString(slotArray[slotValue]).toLowerCase() === spanishTool.NormalizeString(values[valuesIndex + correctSlots].toString()).toLowerCase()) {
                    correctSlots ++;
                }
                // Si es un número
                else if (!isNaN(parseInt(slotArray[slotValue], 10)) && spanishTool.NumberToLetters(parseInt(slotArray[slotValue], 10)).toString().toLowerCase() === values[valuesIndex + correctSlots].toString().toLowerCase()) {
                    correctSlots ++;
                }
                // Si no coincide con el actual termina
                else {
                    return correctSlots;
                }
            }
        }
    }

    return correctSlots;
}

    /*function oldCompareSlots(slots, values, valuesIndex) {
        var correctSlots = 0;
        for (const slot in slots) {
            if (Object.prototype.hasOwnProperty.call(slots, slot) && slots[slot].value !== undefined && valuesIndex + correctSlots < values.length) {
                var slotArray = slots[slot].value.toString().split(' ');
                for (const slotValue in slotArray) {
                    // Si es una palabra
                    if (spanishTool.NormalizeString(slotArray[slotValue]).toLowerCase() === spanishTool.NormalizeString(values[valuesIndex + correctSlots].toString()).toLowerCase()) {
                        correctSlots ++;
                    }
                    // Si es un número
                    else if (!isNaN(parseInt(slotArray[slotValue], 10)) && spanishTool.NumberToLetters(parseInt(slotArray[slotValue], 10)).toString().toLowerCase() === values[valuesIndex + correctSlots].toString().toLowerCase()) {
                        correctSlots ++;
                    }
                    // Si es un número pero Alexa a unificado los números
                    else if (!isNaN(parseInt(slotArray[slotValue], 10)) && valuesIndex + correctSlots < 10) {
                        for (const digit in slotArray[slotValue]) {
                            if(spanishTool.NumberToLetters(parseInt(slotArray[slotValue][digit], 10)).toString().toLowerCase() === values[valuesIndex + correctSlots].toString().toLowerCase()) {
                                correctSlots ++;
                            } else {
                                return correctSlots;
                            }
                        }
                    } else {
                        return correctSlots;
                    }
                }
            }
        }

        return correctSlots;
    }*/

function wrongNumber(handlerInput) {
    var attributes = handlerInput.attributesManager.getSessionAttributes();
    const numberSet = attributes.numbers;
    const current = attributes.currentNumber;

    var text = '';

    if (attributes.fails < maxFails) {
        attributes.fails = attributes.fails + 1;
        handlerInput.attributesManager.setSessionAttributes(attributes);

        text = '¡Te has equivocado! Bebe y el siguiente jugador ';
        if (current > 0) {
            text = text + 'continúe la secuencia diciendo el siguiente a: "' + numberSet[current - 1] + '".';
        } else {
            text = text + 'diga el correspondiente al primero.';
        }
    } else {
        text = 'Parece que necesitáis ayuda, ahora toca decir: "' + numberSet[current] + '". Que el siguiente jugador lo diga para continuar el juego.';
    }

    return text;
}

/* LAMBDA SETUP */

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        GameIntentHandler,
        RoundIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();
