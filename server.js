const express = require('express')
const fileUpload = require('express-fileupload')
const session = require('express-session')
const XLSX = require('xlsx')

const app = express()

// root directory for html
var sendFileOptions = {
  root: __dirname + '/views/',
}

// set up 
app.set('view engine', 'ejs') // use ejs redner views
app.use(express.urlencoded()) // use parser to parse request
app.use(express.json())
app.use(express.static('public')) // static file folder
app.use(fileUpload()) // able to upload file
app.use(session({ // use session
  'secret': 'cptbtptpbcptdtptp'
}))

// urls
app.get('/', (req, res) => {
  res.sendFile('index.html', sendFileOptions)
})

// APIs
// Input movie and theaters page
app.post('/rawinput', (req, res) => {
  console.log(req.files)
  console.log(req.body)

  if (!req.session.excel) {
    if (!req.files.excel) {
      res.status(500).send('Add excel sheet!') // TODO make error handler
      return
    }
    // read in the excel
    var workbook = XLSX.read(req.files.excel.data, { type: 'buffer' })

    req.session.excel = workbook;
  }

  res.render('rawinput', {
    date: req.body.date,
  })
})

app.get('/excelinfo', (req, res) => {
  res.send(req.session.excel)
})

// port
app.listen(3000, () => {
  console.log("App listening on port 3000")
})

