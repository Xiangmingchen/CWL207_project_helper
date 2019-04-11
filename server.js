const express = require('express')
const fileUpload = require('express-fileupload')
const session = require('express-session')
const XLSX = require('xlsx')

const app = express()

// root directory for html
var sendFileOptions = {
  root: __dirname + '/views/',
}

var port = process.env.PORT || 3000

var downloadDir = '/download/';

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
    req.session.entryList = []
  }

  res.render('rawinput', {
    month: req.body.month
  })
})

// return a excel workbook object
app.get('/excelinfo', (req, res) => {
  if (!req.session.excel) {
    throw new Error("No excel sheet uploaded!")
  }
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
    if (req.session.entryList[i].date === newEntry.date) {
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


  // success
  res.sendStatus(200)
})

/**
 * Fill up the excel sheet based on current entry list
 * Write workbook to server and respond with download link
 */
app.get("/downloadExcel", (req, res) => {
  if (!req.session.entryList) {
    throw new Error("No entry yet")
  }

  if (!req.session.excel) {
    throw new Error("No excel uploaded");
  }

  // sort the array by date
  sortByDate(req.session.entryList)

  // get first worksheet
  var workbook = req.session.excel;
  var worksheet = workbook.Sheets[workbook.SheetNames[0]];
  // create theater to row number map if we don't have one
  if (!req.session.theaterToRow) {
    req.session.theaterToRow = buildTheaterToRowMap(worksheet)
  }

  let entryList = req.session.entryList;
  let theaterToRow = req.session.theaterToRow;

  // loop through each date
  for (let col = 1, i = 0; i < entryList.length; i += 1, col += 1) {
    // write date to top cell
    let topCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })]
    let date = new Date(entryList[i].date + "Z");
    let UTCString = date.toUTCString().split(" ");
    let dateString = [ UTCString[1], UTCString[2], UTCString[3].slice(2) ].join("-")
    topCell.v = dateString;

    // loop through each movie
    entryList[i].movies.forEach((movie) => {
      // loop through each theater
      movie.theaterNames.forEach((theaterName) => {
        // write movie name to that cell
        let row = theaterToRow[theaterName];
        let cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { t: 's' }
        }
        worksheet[cellAddress].v = movie.movieName
      })
    })
  }

  // write to file
  //// TODO better name to avoid conflict
  let fileName = __dirname + downloadDir + 'yournetid_main.xlsx'
  XLSX.writeFile(workbook, fileName) 
  res.download(fileName);
})

function sortByDate(array) {
  array.sort((a, b) => {
    return new Date(a.date) > new Date(b.date)
  })
}

function buildTheaterToRowMap(worksheet) {
  let cell = worksheet["A2"];
  let col = "A";
  let theaterToRow = {};
  let row = 2;

  while (cell != undefined) {
    theaterToRow[cell.v] = row
    row += 1
    cell = worksheet[col + row];
  }

  return theaterToRow;
}

// port
app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})

