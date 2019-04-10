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
app.use(express.urlencoded({ extended: true })) // use parser to parse request
app.use(express.json())
app.use(express.static('public')) // static file folder
app.use(fileUpload()) // able to upload file
app.use(session({ // use session
  secret: 'cptbtptpbcptdtptp',
  resave: true,
  saveUninitialized: false,
}))

// urls
app.get('/', (req, res) => {
  res.sendFile('index.html', sendFileOptions)
})

// APIs
// Input movie and theaters page
app.post('/rawinput', (req, res) => {
  if (!req.session.excel) {
    if (!req.files.excel) {
      res.status(500).send('Add excel sheet!') // TODO make error handler
      return
    }
    // read in the excel
    var workbook = XLSX.read(req.files.excel.data, { type: 'buffer' })

    req.session.excel = workbook;
  }

  res.render('rawinput')
})

// return a excel workbook object
app.get('/excelinfo', (req, res) => {
  res.send(req.session.excel)
})

// add entry to entry list
/**
 * Add entry to entry list. Request should have the following format data
 * {
 *   date: "1973-01-01",
 *   movieName: "Rakhi Aur Hathkadi",
 *   theaterNames: [
 *     "Naaz",
 *     "Capitol",
 *     ...
 *   ]
 * }
 */
app.post('/addentry', (req, res) => {
  if (!req.session.entryList) {
    req.session.entryList = []
  }

  /**
   * Each entry follows this format, entryList is a list of these
   * {
   *  date: "1970-03-01",
   *  movies: [
   *    { 
   *      movieName: "Subha-o-Sham",
   *      theaterNames: [
   *        "Apsara",
   *        "Rex",
   *        "Lotus",
   *       ]
   *    },
   *    ...
   *  ]}
   */
  let dateIndex = undefined;
  let newEntry = req.body;
  console.log(newEntry)

  // look for the date in the entry list
  for (let i = 0; i < req.session.entryList.length; i += 1) {
    if (req.session.entryList[i].date == newEntry.date) {
      dateIndex = i;
      break;
    }
  }
  // if we can't find it, add a new entry with that date
  if (dateIndex === undefined) {
    let newDateEntry = {
      date: newEntry.date,
      movies: [{
        movieName: newEntry.movieName,
        theaterNames: newEntry.theaterNames
      }]
    }
    req.session.entryList.push(newDateEntry)
  }
  // if we found it, add the new movie to that date
  else {
    let newMovieEntry = {
      movieName: newEntry.movieName,
      theaterNames: newEntry.theaterNames
    }
    req.session.entryList[dateIndex].movies.push(newMovieEntry);
  }

  console.log(req.session.entryList)

  // success
  res.sendStatus(200)
})

// port
app.listen(3000, () => {
  console.log("App listening on port 3000")
})

