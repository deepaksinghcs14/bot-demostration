const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');
const { ActivityHandler, MessageFactory, TurnContext } = require('botbuilder');

class EchoBot extends ActivityHandler {
    constructor(conversationReferences) {
        super();
        this.conversationReferences = conversationReferences;
        this.onConversationUpdate(async (context, next) => {
            this.addConversationReference(context.activity);
            await next();
        });

        this.onMessage(async (context, next) => {
            if(context.activity.text!=undefined){
                const replyText = await sendMessage('project_id',context.activity.text);
                await context.sendActivity(MessageFactory.text(replyText, replyText));
            }

            await next();
        });
        /**
         *  when member is removed from the chat
         */
        this.onMembersRemoved(async(context,next)=>{

            const membersRemoved = context.activity.membersRemoved;
            const welcomeText = 'आपकी याद आएगी ';
            for (let cnt = 0; cnt < membersRemoved.length; ++cnt) {
                if (membersRemoved[cnt].id !== context.activity.recipient.id) {
                    if(membersRemoved[cnt].name!=undefined){
                        await context.sendActivity(MessageFactory.text(welcomeText+membersRemoved[cnt].name, 
                            welcomeText+membersRemoved[cnt].name));
                    }else{
                        await context.sendActivity(MessageFactory.text('आपकी याद आएगी', 
                        'आपकी याद आएगी'));
                    }
                }
            }

            await next();
        });
        /**
         * when user adds some reaction
         */
         this.onReactionsAdded(async(context,next)=>{ 
            //  console.log(context.activity);
             const replyText = await sendMessage('project_id',context.activity.reactionsAdded[0].type);
             await context.sendActivity(MessageFactory.text(replyText, replyText));
             await next();
         });
        
       

        this.onMembersAdded(async (context, next) => {

            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'आपका स्वागत है ';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    if(membersAdded[cnt].name!=undefined){
                        await context.sendActivity(MessageFactory.text(welcomeText+membersAdded[cnt].name, 
                            welcomeText+membersAdded[cnt].name));
                    }else{
                        await context.sendActivity(MessageFactory.text('आपका स्वागत है', 
                        'आपका स्वागत है'));
                    }
                }
            }

            await next();
        });
        
        /**
       * Send a query to the dialogflow agent, and return the query result.
       * @param {string} projectId The project to be used
       */
      async function sendMessage(projectId = 'your-project-id',message) {
        // A unique identifier for the given session
        
        const sessionId = uuid.v4();

        // Create a new session
        const privateKey = "dialogflow_secret_key";
        const clientEmail = "dialogflow_client_id";
         const config = {
          credentials: {
            private_key: privateKey,
            client_email: clientEmail
          }
        }
        
        const sessionClient = new dialogflow.SessionsClient(config);
        const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

        const request = {
          session: sessionPath,
          queryInput: {
            text: {
              // The query to send to the dialogflow agent
              text: message,
              // The language used by the client (en-US)
              languageCode: 'en-US',
            },
          },
        };
        // Send request and log result
        const responses = await sessionClient.detectIntent(request);
        console.log('Detected intent');
        const result = responses[0].queryResult;
        return result.fulfillmentText;
      }
        
    }
    
    addConversationReference(activity) {
        const conversationReference = TurnContext.getConversationReference(activity);
        this.conversationReferences[conversationReference.conversation.id] = conversationReference;
   }
}

module.exports.EchoBot = EchoBot;
