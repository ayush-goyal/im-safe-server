// Twilio Credentials 
var accountSid = 'AC2fd77b951b80f4d2e3051381606f1080';
var authToken = '42f109801302c84043f5b96c30f1495d';

//require the Twilio module and create a REST client 
var client = require('twilio')(accountSid, authToken);

client.messages.create({
  to: "+16783309948",
  from: "+16782637809",
  body: "This is the ship that made the Kessel Run in fourteen parsecs?",
}, function (err, message) {
  console.log(message.sid);
});