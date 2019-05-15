const router = require('express').Router()
const pg_config = require('./pg_config')
const pool = new require('pg').Pool(pg_config);

/**
 * Get all theaters in a city (e.g. Mumbai). If undefined, 
 * return all theaters.
 *
 * @param {string} cityName the name of the city.
 */
router.get('/theaters', (req, res) => {
  pool.query(`
    SELECT * FROM theaters 
    ${req.body.cityName ? 
      'WHERE city_name = ' + req.body.cityName : ''
    }
    ORDER BY theater_name;
  `, (error, results) => {
    if (error) throw error
    res.status(200).json(results.rows)
  })
})

// root directory for html
var sendFileOptions = {
  root: __dirname + '/../pages/',
}

const routes = [
  {
    url: "newentry",
    tabname: "New Entry",
  },
  {
    url: "pastentries",
    tabname: "Past Entries",
  },
]

// urls
router.get('/newentry', (req, res) => {
  res.render('NewEntry', {
    routes: routes,
    url: 'newentry',
    username: 'xc14'
  })
})

/**
 * Render the movie, theater page for a specific date
 *
 * @param {string} date in the format of "yyyy-mm-dd"
 */
router.post('/newentrydetail', (req, res) => {
  res.render('NewEntryDetail', {
    date: req.body.date,
    routes: routes,
    url: 'newentrydetail',
    username: 'xc14'
  })
})

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

router.get('/*', (req, res) => {
  res.redirect('newentry')
})

module.exports = router
