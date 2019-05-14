const router = require('express').Router()

// root directory for html
var sendFileOptions = {
  root: __dirname + '/../pages/',
}

// urls
router.get('/', (req, res) => {
  res.sendFile('index.html', sendFileOptions)
})

// APIs
// Input movie and theaters page
router.post('/rawinput', (req, res) => {
  if (!req.session.excel) {
    if (!req.files.excel) {
      res.status(500).send('Add excel sheet!') // TODO make error handler
      return
    }
    // read in the excel
    var workbook = XLSX.read(req.files.excel.data, { type: 'buffer' })

    req.session.excel = workbook;
  }

  // month in the form "1970-01" of string
  req.session.month = req.body.month
  req.session.netid = req.body.netid

  res.render('rawinput', {
    month: req.body.month
  })
})

// return a excel workbook object
router.get('/excelinfo', (req, res) => {
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
router.post('/addentry', (req, res) => {
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
router.post("/generateExcel", (req, res) => {
  // if the current session doesn't have excel
  if (!req.session.excel) {
    res.status(400) .send({
        message: "Please reupload excel template",
        code: 1,
      })
    return
  }

  // get first worksheet
  var workbook = req.session.excel;
  var worksheet = workbook.Sheets[workbook.SheetNames[0]];
  // create theater to row number map if we don't have one
  if (!req.session.theaterToRow) {
    req.session.theaterToRow = buildTheaterToRowMap(worksheet)
  }

  // overwrite the first row 
  let secondDayOfMon = new Date(req.session.month + "-02Z");
  let UTCString = secondDayOfMon.toUTCString().split(" ");
  for (let col = 1; col < daysInMonth(req.session.month) + 1; col += 1) {
    let topCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })]
    if (!topCell) {
      worksheet[XLSX.utils.encode_cell({ r: 0, c: col })] = {}
      topCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    }
    let dateString = [ col, UTCString[2], UTCString[3].slice(2) ].join("-")
    topCell.v = dateString;
  }

  // delete everything that's after the last day of month on the 
  // first row
  for (let col = daysInMonth(req.session.month) + 1; col <= XLSX.utils.decode_range(worksheet['!ref']).e.c; col += 1) {
    let topCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })]
    if (topCell) {
      topCell.v = "";
    }
  }

  // write the movies to the excel sheet
  if (req.session.entryList) {
    // sort the array by date
    sortByDate(req.session.entryList)

    let entryList = req.session.entryList;
    let theaterToRow = req.session.theaterToRow;

    // loop through each date
    for (let i = 0; i < entryList.length; i += 1) {
      // write date to top cell
      let date = new Date(entryList[i].date + "Z");
      let UTCString = date.toUTCString().split(" ");
      let col = parseInt(UTCString[1])

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
  }

  // write to file, make directory if necessory
  mkdirp('download', (err) => {
    if (err) {
      throw err;
    }
    let fileName = __dirname + downloadDir + req.session.netid + "_main.xlsx";
    req.session.fileName = fileName;
    XLSX.writeFile(workbook, fileName) 
    res.sendStatus(200)
  })
})

router.get('/downloadExcel', (req, res) => {
  if (!req.session.fileName) {
    res.sendStatus(400)
    return
  }
  res.download(req.session.fileName);
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
    theaterToRow[cell.v] = row - 1
    row += 1
    cell = worksheet[col + row];
  }

  return theaterToRow;
}

/**
 * Return number of days in a month of a year
 *
 * @param {string} month a string in the form "yyyy-mm"
 * @returns {number} number of days in this month
 */
function daysInMonth (yearMonthSring) {
  let year = parseInt(yearMonthSring.slice(0, 4))
  let month = parseInt(yearMonthSring.slice(-2))
  return new Date(year, month, 0).getDate();
}

module.exports = router
