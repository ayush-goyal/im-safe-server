const http = require('http');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

require('dotenv').config()

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json())


var routes = require('./routes/index');
app.use('/', routes);


const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Express server running on port ' + port);
})