const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

var client = twilio(process.env.BUTTON_TWILIO_ACCOUNT_SID, process.env.BUTTON_TWILIO_AUTH_TOKEN);


const express = require('express');
const router = express.Router();

router.post('/voice', (req, res) => {
  for (var person in req.body.people) {
    client.calls.create({
        to: `${req.body.people[person]}`,
        from: process.env.BUTTON_TWILIO_CALLER_ID,
        url: 'https://501a540a.ngrok.io/voice/twiml'
      })
      .then((message) => {
        //console.log(message.responseText);
        console.log(`Call to ${person}, executed successfully`)
      })
      .catch((error) => {
        console.log(error);
      });
  }
  res.send('Numbers Called')
});

router.post('/voice/twiml', (req, res) => {
  var twimlResponse = new VoiceResponse();

  twimlResponse.say('Alert! This is Ayush');
  res.send(twimlResponse.toString());
});

router.post('/sms', (req, res) => {
  for (var person in req.body.people) {
    client.messages.create({
      to: `${req.body.people[person]}`,
      from: process.env.BUTTON_TWILIO_CALLER_ID,
      body: `${person}, Alert!`,
    }, function (err, message) {
      if (err) {
        console.log(err);
      } else {
        //console.log(message.sid);
        console.log(`Message to ${person}, sent successfully`)
      }
    });
  }
  res.send('SMS sent')
})

module.exports = router;



/*
function tokenGenerator() {
  const identity = 'Jameston Happletree';
  const capability = new ClientCapability({
    accountSid: BUTTON_TWILIO_ACCOUNT_SID,
    authToken: BUTTON_TWILIO_AUTH_TOKEN,
  });

  capability.addScope(new ClientCapability.IncomingClientScope(identity));
  capability.addScope(new ClientCapability.OutgoingClientScope({
    applicationSid: BUTTON_TWILIO_TWIML_APP_SID,
    clientName: identity,
  }));

  // Include identity and token in a JSON response
  return {
    identity: identity,
    token: capability.toJwt(),
  };
};


function isAValidPhoneNumber(number) {
  return /^[\d\+\-\(\) ]+$/.test(number);
}



router.get('/token', (req, res) => {
  res.send(tokenGenerator());
});
*/