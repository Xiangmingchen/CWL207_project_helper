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
  let query = {
    name: 'get-theaters',
    text: "SELECT * FROM theaters ORDER BY theater_name;",
  }
  pool.query(query, (error, results) => {
    res.status(200).json(results.rows)
  })
})

/**
 * Get all movies in the database.
 */
router.get('/movies', (req, res) => {
  let query = {
    name: 'get-movies',
    text: "SELECT * FROM movies;"
  }
  pool.query(query, (error, results) => {
    if (error) throw error
    res.status(200).json(results.rows)
  })
})

// for nav bar
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

// new entry page
router.get('/newentry', (req, res) => {
  req.session.netid = 'fake_netid'
  res.render('NewEntry', {
    routes: routes,
    url: 'newentry',
    username: req.session.netid
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
    username: req.session.netid
  })
})

/**
 * Add entry to entry list. Request should have the following format data.
 * The theater ids are their ids in the database.
 * {
 *   date: "1973-01-01",
 *   movie: {
 *     id: 32 (or null if the movie is new),
 *     name: "Rakhi Aur Hathkadi" (if id is not null, name does not matter),
 *   }
 *   theaterIds: [ 1, 34, 2, ... ]
 *   newTheaters: [
 *     {
 *       theater_name: "Deepak",
 *       town_name: "Delisle Road",
 *     },
 *     ...
 *   ]
 * }
 */
router.post('/addentry', (req, res) => {
  let newEntry = req.body;
  let query;

  // sanity checks
  if (!newEntry.movie.id && !newEntry.movie.name) throw 'Movie name and id are empty'

  // add netid as a property
  newEntry.netid = req.session.netid

  if (!newEntry.theaterIds) {
    newEntry.theaterIds = []
  }

  // insert the movie into database if it's new
  if (!newEntry.movie.id) {
    newEntry.movie.name = titleCase(newEntry.movie.name)
    query = {
      text: 'INSERT INTO movies (name) VALUES ($1) RETURNING *;',
      values: [ newEntry.movie.name ]
    }
    pool.query(query).then((result) => { 
      newEntry.movie.id = result.rows[0].id
      addTheaters(newEntry, res) 
    })
  }
  // if this movie was in database
  else {
    addTheaters(newEntry, res)
  }

})

/**
 * Add new theaters to database when necessary
 */
function addTheaters(newEntry, res) {
  // insert the new theater into database 
  if (newEntry.newTheaters && newEntry.newTheaters.length > 0) {
    let text = "INSERT INTO theaters (theater_name, town_name, city_name) VALUES (";
    for (let i = 0; i < newEntry.newTheaters.length; i++) {
      let j = i * 3 + 1;
      text += `$${j}, $${j+1}, $${j+2}`
      if (i != newEntry.newTheaters.length - 1) {
        text += "), ("
      } else {
        text += ")"
      }
    }
    text += " RETURNING id;"

    let values = []
    newEntry.newTheaters.forEach((elem) => {
      if (!elem.theater_name) throw "Theater name is empty"
      values.push(elem.theater_name)
      values.push(elem.town_name)
      // TODO: Notice that Mumbai is HARD CODED to be the city
      values.push("Mumbai")
    })
    let query = { text: text, values: values }
    pool.query(query).then((result) => {
      result.rows.forEach((row) => {
        newEntry.theaterIds.push(row.id)
      })
      createEntry(newEntry, res)
    })
  }
  // there is no new theaters
  else {
    createEntry(newEntry, res)
  }
}

// record this entry
function createEntry(newEntry, res) {
  if (!newEntry.netid) throw "Not logged in!"

  let query = {
    text: "INSERT INTO entries (user_netid) VALUES ($1) RETURNING id;",
    values: [ newEntry.netid ],
  }

  pool.query(query).then((result) => {
    newEntry.entryId = result.rows[0].id
    addShowings(newEntry, res)
  }).catch((e) => {throw e.message})
}

// insert each movie - theater pair as a showing on this date
function addShowings(newEntry, res) {
  let text = `INSERT INTO showings (show_date, movies_id, newspapers_id,
    theaters_id, entries_id) VALUES (`
  for (let i = 0; i < newEntry.theaterIds.length; i++) {
    let j = i * 5 + 1;
    text += `$${j}, $${j+1}, $${j+2}, $${j+3}, $${j+4}, $${j+5}`
    if (i != newEntry.theaterIds.length - 1) {
      text += "), ("
    } else {
      text += ")"
    }
  }
  text += ";"

  let values = []
  newEntry.theaterIds.forEach((theaterId) => {
    if (isNaN(theaterId)) throw "Theater id is not a number"
    values.push(newEntry.date) // show_date
    values.push(newEntry.movie.id) // movies_id
    // TODO: Notice that newspaper id is HARD CODED 
    values.push(1) // newspapers_id
    values.push(theaterId) // theaters_id
    values.push(entryId) // entries_id
  })
  let query = { text: text, values: values }
  pool.query(query).then((res) => {
    // success
    res.sendStatus(200)
  }).catch((e) => { throw e.message })
}


router.get('/*', (req, res) => {
  res.redirect('newentry')
})

/**
 * Turn a string into title case
 */
function titleCase(str) {
  str = str.toLowerCase().trim();
  str = str.split(' ');
  str = str.filter((string) => { return string !== "" })

  for (var i = 0; i < str.length; i++) {
    str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
  }
  return str.join(' '); 
}

module.exports = router
