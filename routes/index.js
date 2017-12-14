// ----------------- Twilio Setup -------------------

const twilio = require('twilio');
const MessagingResponse = twilio.twiml.MessagingResponse;
const VoiceResponse = twilio.twiml.VoiceResponse;

var client = twilio(process.env.BUTTON_TWILIO_ACCOUNT_SID, process.env.BUTTON_TWILIO_AUTH_TOKEN);

// ----------------- Firebase Setup -------------------

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
      "project_id": "ayush-im-safe"
    })
  });
}

var db = admin.firestore()

var alertNumbersCollection = db.collection('alertNumbers');

function sendReceivedNotificationToDevice(name, token, confirmation, response) {
  var payload;
  if (confirmation == 0) {
    payload = {
      notification: {
        title: "Alert sent",
        body: "to " + name
      }
    };
  } else if (confirmation == 1) {
    payload = {
      notification: {
        title: name + " responded",
        body: response
      }
    };
  } else if (confirmation == 2) {
    payload = {
      notification: {
        title: "Updated location sent to",
        body: name
      }
    };
  }


  admin.messaging().sendToDevice(token, payload)
    .then(response => {
      console.log("Successfully sent notification to device: " + name)
    })
    .catch(error => {
      console.log("Error sending message to device: " + error);
    })
}

// ------------------- Helper Functions ----------------------------

function cleanNumber(number) {
  number = number.replace(/\D/g, '');
  if (number.length == 11 && number[0] == 1) {
    return number.substring(1)
  } else {
    return number
  }
}

// -------------------- Express App Setup -----------------------------

const express = require('express');
const router = express.Router();

// --------------------- Express Routes ------------------------------

router.post('/voice/twiml', (req, res) => {
  var twimlResponse = new VoiceResponse();

  twimlResponse.say('Distress call activated by I\'m Safe app. Please see your texts for further information.');
  res.send(twimlResponse.toString());
});

router.post('/sendAlert', (req, res) => {
  console.log(req.body.coordinate)
  for (var person in req.body.people) {
    var alertNumber = cleanNumber(req.body.people[person]);

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

    /*client.messages.create({
      to: `${req.body.people[person]}`,
      from: process.env.BUTTON_TWILIO_CALLER_ID,
      body: `Located at (${req.body.coordinate.latitude}, ${req.body.coordinate.longitude})`,
    }, function (err, message) {
      if (err) {
        console.log(err);
      } else {
        //console.log(message.sid);
        console.log(`Message to ${person}, sent successfully`)
      }
    });*/

    client.messages.create({
      to: `${req.body.people[person]}`,
      from: process.env.BUTTON_TWILIO_CALLER_ID,
      body: `https://www.google.com/maps/?q=${req.body.coordinate.latitude},${req.body.coordinate.longitude}`,
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
      messageReceived: false,
      coordinate: {
        latitude: req.body.coordinate.latitude,
        longitude: req.body.coordinate.longitude
      },
      token: req.body.token
    })


    sendReceivedNotificationToDevice(person, req.body.token, 0, "");

  }

  res.send('Alerts sent to contacts')
})

router.post('/cancelAlert', (req, res) => {
  for (var person in req.body.people) {
    var alertNumber = cleanNumber(req.body.people[person]);

    client.messages.create({
      to: `${req.body.people[person]}`,
      from: process.env.BUTTON_TWILIO_CALLER_ID,
      body: `${person}, Alert was cancelled.`,
    }, function (err, message) {
      if (err) {
        console.log(err);
      } else {
        //console.log(message.sid);
        console.log(`Cancel Message to ${person}, sent successfully`)
      }
    });

    alertNumbersCollection.doc(alertNumber).delete();
  }

  res.send('Cancel alerts sent to contacts')
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
          sendReceivedNotificationToDevice(data.name, data.token, 1, req.body.Body);
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


router.post('/updateLocation', (req, res) => {
  console.log(req.body.coordinate)
  for (var person in req.body.people) {
    var alertNumber = cleanNumber(req.body.people[person]);

    /*client.messages.create({
      to: `${req.body.people[person]}`,
      from: process.env.BUTTON_TWILIO_CALLER_ID,
      body: `Located at (${req.body.coordinate.latitude}, ${req.body.coordinate.longitude})`,
    }, function (err, message) {
      if (err) {
        console.log(err);
      } else {
        //console.log(message.sid);
        console.log(`Message to ${person}, sent successfully`)
      }
    });*/

    client.messages.create({
      to: `${req.body.people[person]}`,
      from: process.env.BUTTON_TWILIO_CALLER_ID,
      body: `https://www.google.com/maps/?q=${req.body.coordinate.latitude},${req.body.coordinate.longitude}`,
    }, function (err, message) {
      if (err) {
        console.log(err);
      } else {
        //console.log(message.sid);
        console.log(`Message to ${person}, sent successfully`)
      }
    });

    alertNumbersCollection.doc(alertNumber).set({
      name: person,
      messageReceived: false,
      coordinate: {
        latitude: req.body.coordinate.latitude,
        longitude: req.body.coordinate.longitude
      },
      token: req.body.token
    })


    sendReceivedNotificationToDevice(person, req.body.token, 2, "");

  }

  res.send('Alerts sent to contacts')
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