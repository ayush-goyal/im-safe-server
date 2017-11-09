const twilio = require('twilio');
const MessagingResponse = twilio.twiml.MessagingResponse;
const VoiceResponse = twilio.twiml.VoiceResponse;

var client = twilio(process.env.BUTTON_TWILIO_ACCOUNT_SID, process.env.BUTTON_TWILIO_AUTH_TOKEN);


var admin = require("firebase-admin");

if (process.env.USE_FIREBASE_SERVICE_ACCOUNT_JSON == "true") {
  var serviceAccount = require("../serviceAccountKey.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  admin.initializeApp({
    credential: admin.credential.cert({
      "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    })
  });
}



var db = admin.firestore()

var alertNumbersCollection = db.collection('alertNumbers');

function sendReceivedNotificationToDevice(name, token) {
  var payload = {
    notification: {
      title: "Alert Received",
      body: "by " + name
    }
  };

  admin.messaging().sendToDevice(token, payload)
    .then(response => {
      console.log("Successfully sent notification to device: " + name + " received alert.")
    })
    .catch(error => {
      console.log("Error sending message to device: " + error);
    })
}

function cleanNumber(number) {
  number = number.replace(/\D/g, '');
  if (number.length == 11 && number[0] == 1) {
    return number.substring(1)
  } else {
    return number
  }
}


const express = require('express');
const router = express.Router();

router.post('/voice/twiml', (req, res) => {
  var twimlResponse = new VoiceResponse();

  twimlResponse.say('Alert! This is Ayush');
  res.send(twimlResponse.toString());
});

router.post('/sendAlert', (req, res) => {
  for (var person in req.body.people) {
    var alertNumber = cleanNumber(req.body.people[person]);
    var senderNumber = cleanNumber(req.body.senderNumber);


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

    client.calls.create({
        to: `${req.body.people[person]}`,
        from: process.env.BUTTON_TWILIO_CALLER_ID,
        url: process.env.BUTTON_TWIML_REQUEST_URL
      })
      .then((message) => {
        //console.log(message.responseText);
        console.log(`Call to ${person}, executed successfully`)
      })
      .catch((error) => {
        console.log(error);
      });

    alertNumbersCollection.doc(alertNumber).set({
      name: person,
      senderNumber: senderNumber,
      messageReceived: false,
      token: req.body.token
    }).then(ref => {
      console.log('Added document with ID: ' + ref.id);
    })
  }


  res.send('SMS & Calls sent')
})

router.post('/cancelAlert', (req, res) => {
  for (var person in req.body.people) {
    var alertNumber = cleanNumber(req.body.people[person]);
    var senderNumber = cleanNumber(req.body.senderNumber);


    client.messages.create({
      to: `${req.body.people[person]}`,
      from: process.env.BUTTON_TWILIO_CALLER_ID,
      body: `${person}, Alert was cancelled.`,
    }, function (err, message) {
      if (err) {
        console.log(err);
      } else {
        //console.log(message.sid);
        console.log(`Message to ${person}, sent successfully`)
      }
    });

    alertNumbersCollection.doc(alertNumber).delete();
  }

  res.send('SMS alert cancelled')
})

router.post('/sms', (req, res) => {
  var alertNumber = cleanNumber(req.body.From);

  var alertNumberRef = alertNumbersCollection.doc(alertNumber);
  alertNumberRef.get()
    .then(doc => {
      if (!doc.exists) {
        // No document for number exists
      } else {
        const data = doc.data()
        if (data.messageReceived != true) {
          alertNumberRef.update({
            messageReceived: true
          });
          sendReceivedNotificationToDevice(data.name, data.token);
        }
      }
    })
    .catch(err => {
      console.log('Error getting document: ' + err);
    })

  const twiml = new MessagingResponse();

  twiml.message('Thank you. Please alert the police.')

  res.writeHead(200, {
    'Content-Type': 'text/xml'
  });
  res.end(twiml.toString());
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