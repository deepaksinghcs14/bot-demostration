// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const path = require('path');
const { ConnectorClient, MicrosoftAppCredentials } = require('botframework-connector');

const cron = require("node-cron");
const express = require("express");
const fs = require("fs");
const axios = require('axios')
app = express();

const dotenv = require('dotenv');
// Import required bot configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

const restify = require('restify');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter } = require('botbuilder');

const { ProactiveBot } = require('./bot');
const { createClient } = require('pexels');

// This bot's main dialog.
const { EchoBot } = require('./bot');
const res = {"results":[{"Name":"test","DOB":"28-11","DOJ":"13-02"}]};

// Create HTTP server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

const conversationReferences = {};

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    channelService: process.env.ChannelService,
    openIdMetadata: process.env.BotOpenIdMetadata
});

// Catch-all for errors.
const onTurnErrorHandler = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Set the onTurnError for the singleton BotFrameworkAdapter.
adapter.onTurnError = onTurnErrorHandler;

// Create the main dialog.
const myBot = new EchoBot(conversationReferences);

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // Route to main dialog.
        await myBot.run(context);
    });
});

// Listen for Upgrade requests for Streaming.
server.on('upgrade', (req, socket, head) => {
    // Create an adapter scoped to this WebSocket connection to allow storing session data.
    const streamingAdapter = new BotFrameworkAdapter({
        appId: process.env.MicrosoftAppId,
        appPassword: process.env.MicrosoftAppPassword
    });
    // Set onTurnError for the BotFrameworkAdapter created for each connection.
    streamingAdapter.onTurnError = onTurnErrorHandler;

    streamingAdapter.useWebSocket(req, socket, head, async (context) => {
        // After connecting via WebSocket, run this logic for every request sent over
        // the WebSocket connection.
        await myBot.run(context);
    });
});

// Listen for incoming notifications and send proactive messages to users.
// to send messages to - http://munni-9dc9.azurewebsites.net/api/notify?message=testing+here
server.get('/api/notify', async (req, res) => {
    try{        
                // If you encounter permission-related errors when sending this message, see
                // https://aka.ms/BotTrustServiceUrl
        message = req._url.query.split("=")[1]
        if(message!=undefined){
            await sendToChannel(decodeURIComponent(message).split("+").join(" "),"channel_id");
        }
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.write('<html><body><h1>Proactive messages have been sent.</h1></body></html>');
        res.end();
    }catch(err){
        console.log(err);
    }
});

//To send message to celebration - http://munni-9dc9.azurewebsites.net/api/celebration?message=testing+here

server.get('/api/celebration', async (req, res) => {
    try{        
                // If you encounter permission-related errors when sending this message, see
                // https://aka.ms/BotTrustServiceUrl
        message = req._url.query.split("=")[1]
        if(message!=undefined){
            await sendToChannel(decodeURIComponent(message).split("+").join(" ")+ ' <at>परिषद</at>\n',"channel_id");
        }
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.write('<html><body><h1>Proactive messages have been sent.</h1></body></html>');
        res.end();
    }catch(err){
        console.log(err);
    }
});



async function sendToChannel(message,channelId) {
    MicrosoftAppCredentials.trustServiceUrl('service_url');

    var credentials = new MicrosoftAppCredentials('app_id', 'app_pass');
    var client = new ConnectorClient(credentials, { baseUri: 'service_url' });

    var conversationResponse = await client.conversations.createConversation({
        bot: {
            id: 'app_id',
            name: 'Sheela'
        },
        isGroup: true,
        conversationType: "channel",
        channelData: {
            channel: { id: channelId }
        },
        activity: {
            type: 'message',
            text: message
        }
    });
}

//cron for sending daily quotes every day
cron.schedule("00 1 * * *", function() {
  randomQuote();
  sendCelebrations();
});

cron.schedule("00 4 * * *", function() {
  sendCelebrations();
});

//cron for sending fun fact every hour
cron.schedule("0 */8 * * 1-5", function() {
  randomFact();
});

async function randomQuote() {
    const  response = await axios.get('https://quotes.rest/qod?category=inspire&language=en');
    const qod = response.data.contents.quotes[0];
    const img = qod.background;
    sendToChannelWithImage(qod.quote+ ' - ' +qod.author,"channel_id",img);
}

async function randomFact() {
    const  response = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
    const qod = response.data.text;
    sendToChannel(qod,"channel_id");
}


async function sendCelebrations(){
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    today = dd + "-" + mm;
    const results = res.results;
    for(var i=0;i<results.length;i++){
        const emp = results[i];
        if(emp.DOB === today){
            const firstName = emp.Name.split(" ")[0];
            sendToChannel("Today is "+emp.Name+"'s BirthDay, Happy BirthDay "+firstName+" 🥳🥳🥳 🎂🎂🎂 🍲🍲🍲","channel_id")
        }
        if(emp.DOJ === today){
            const firstName = emp.Name.split(" ")[0];
            sendToChannel("Today is the day when "+emp.Name+" joined us, Thanks for being with us "+firstName+" , together we win 🗜️🗜️🗜️","channel_id")
        }
    }
}

async function sendToChannelWithImage(message,channelId,img) {
    MicrosoftAppCredentials.trustServiceUrl('service_url');

    var credentials = new MicrosoftAppCredentials('app_id', 'app_pass');
    var client = new ConnectorClient(credentials, { baseUri: 'service_url' });

    var conversationResponse = await client.conversations.createConversation({
        bot: {
            id: 'app_id',
            name: 'Sheela'
        },
        isGroup: true,
        conversationType: "channel",
        channelData: {
            channel: { id: channelId }
        },
        activity: {
            type: 'message',
            text: "<strong>"+message+"</strong> <br> <img src='"+img+"' width='500' height='400' alt='quoteImage'></img>"
        }
    });
}



// sendToChannelWithImage("test",'channel_id','https://media.wired.com/photos/5b8999943667562d3024c321/master/w_2560%2Cc_limit/trash2-01.jpg')
