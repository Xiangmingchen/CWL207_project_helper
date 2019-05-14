const express = require('express')
const fileUpload = require('express-fileupload')
const session = require('express-session')
const XLSX = require('xlsx')
const mkdirp = require('mkdirp')

const app = express()

var port = process.env.PORT || 3001

var downloadDir = '../download/';

// set up 
app.set('view engine', 'ejs') // use ejs redner views
app.use(express.urlencoded({ extended: true })) // use parser to parse request
app.use(express.json())
app.use(express.static('src/static')) // static file folder
app.use(fileUpload()) // able to upload file
app.use(session({ // use session
  secret: 'cptbtptpbcptdtptp',
  resave: true,
  saveUninitialized: false,
}))

// routes
app.use("/datainput", require('./api/data'))

// port
app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})

