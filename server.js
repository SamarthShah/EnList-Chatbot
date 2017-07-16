var restify = require('restify');
var builder = require('botbuilder');
var https = require('https');
var CONFIG=require('./config')

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: CONFIG.appId,
    appPassword: CONFIG.appPassword
});

var bot = new builder.UniversalBot(connector);
// Listen for messages from users 
server.post('/api/messages', connector.listen());

// 
// Intent Manager
//
var intents = new builder.IntentDialog();
bot.dialog('/', intents);

intents.matches(/^(hi|hello|how are you|get started)/i, [
    function (session) {
        session.send('Hello %s! I am Enlist bot. I can help you search and apply for relevant volunteer opportunities available at various NGOs in India. ', session.message.user.name.split(" ")[0]);
        session.send("You can search for relevent opportunity by sending 'search GURGAON' command. ");
    }
]);

intents.matches(/^(search|volunteer)/i, [
    function (session) {
        var options = {
            host: 'hacking2-gigapro.c9users.io',
            port: 443,
            method: 'GET',
            path: '/project',
            // authentication headers
            headers: {
                'Content-Type': 'application/json'
            }
        };
        //this is the call
        request = https.request(options, function (res) {
            var body = "";
            res.on('data', function (data) {
                body += data;
            });
            res.on('end', function () {
                //here we have the full response, html or json object
                var volunteer_projects_json = JSON.parse(body);
                var response = "";
                var cards = [];
                for (var i = 0; i < volunteer_projects_json.length; i++) {
                    if(volunteer_projects_json[i].title==undefined || volunteer_projects_json[i].title.toLowerCase().search(session.message.text.substring(7).toLowerCase())==-1){
                        continue;
                    }
                    var single_card = new builder.HeroCard(session)
                        .title(volunteer_projects_json[i].title)
                        .subtitle("By  " + volunteer_projects_json[i].ngo.name + " on " +  new Date(volunteer_projects_json[i].eventDate).toDateString())
                        .images([
                            builder.CardImage.create(session, volunteer_projects_json[i].image)
                        ])
                        .buttons([
                            builder.CardAction.openUrl(session, 'https://www.facebook.com/SamarthTestPage/', 'Learn More')
                        ]);
                    cards.push(single_card);
                }
                // create reply with Carousel AttachmentLayout
                var reply = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                if(cards.length==0){
                    builder.Prompts.choice(session, "Currently there are no volunteer opportunities available at "+session.message.text.substring(7)+" You can subscribe to get update for future event at "+session.message.text.substring(7), "Subscribe|No. Thanks.")
                    session.send();
                }
                else{
                    session.send(reply);
                }
                
                //session.send(response);
            })
            res.on('error', function (e) {
                console.log("Got error: " + e.message);
            });
        });
        // request.write(requestData);
        request.end();

    }
]);

intents.matches(/^bye/i, [
    function (session) {
        session.send("Bye %s ! You can always come back and check relevant opportunity for yourself", session.message.user.name.split(" ")[0]);
    }
]);

intents.matches(/^(help|need help)/i, [
    function (session) {
        session.send("%s! You can search for relevent opportunity by sending 'search GURGAON' command. ", session.message.user.name.split(" ")[0]);
        session.send("For more details and to view your dashboard install app '' from the play store.");
    }
]);
