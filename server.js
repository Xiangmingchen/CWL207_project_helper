const express = require('express')
const session = require('express-session')
const mkdirp = require('mkdirp')

const app = express()
const baseUrl = '/datainput'

var port = process.env.PORT || 3001

var downloadDir = './download/';

// set up 
app.set('view engine', 'ejs') // use ejs redner views
app.set('views', __dirname + '/src/views')
app.use(express.urlencoded({ extended: true })) // use parser to parse request
app.use(express.json())
app.use(baseUrl, express.static('src/static')) // static file folder
app.use(session({ // use session
  secret: 'cptbtptpbcptdtptp',
  resave: true,
  saveUninitialized: false,
}))

// routes
app.use(`${baseUrl}`, require('./src/api/data'))
app.get(`${baseUrl}/helper`, (req, res) => {
  res.send(require("./src/util"))
})

// port
app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})

