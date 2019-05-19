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
    if (error) res.status(400).send( error )
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
  if (!newEntry.movie.id && !newEntry.movie.name) res.status(400).send( 'Movie name and id are empty' )

  // add netid as a property
  newEntry.netid = req.session.netid

  if (!newEntry.theaterIds) {
    newEntry.theaterIds = []
  }

  // insert the movie into database if it's new
  if (!newEntry.movie.id) {
    newEntry.movie.name = titleCase(newEntry.movie.name)
    // check whetehr there was a movie with the same name
    query = {
      text: 'SELECT * FROM movies WHERE name = $1;',
      values: [ newEntry.movie.name ]
    }
    pool.query(query).then((result) => {
      // this movie was in the database
      if (result.rows.length > 0) { 
        newEntry.movie.id = result.rows[0].id
        addANewTheater(newEntry, res, 0)
      }
      // this movie is new
      else {
        query = {
          text: 'INSERT INTO movies (name) VALUES ($1) RETURNING *;',
          values: [ newEntry.movie.name ]
        }
        pool.query(query).then((result) => { 
          newEntry.movie.id = result.rows[0].id
          addANewTheater(newEntry, res, 0)
        })
      }
    }).catch((e) => {res.status(400).send( e.message) })

  }
  // if this movie was in database
  else {
    addANewTheater(newEntry, res, 0)
  }

})

/**
 * Add the new theater at index theaterIdx. If there is no more theaters
 * to add, move on to add entry.
 * For each theater, check whether it is already in the database.
 */
function addANewTheater(newEntry, res, theaterIdx) {
  // if there are no more theaters to add
  if (!newEntry.newTheaters || theaterIdx == newEntry.newTheaters.length) {
    createEntry(newEntry, res)
    return
  }
  var currTheater = newEntry.newTheaters[theaterIdx];
  currTheater.theater_name = titleCase(currTheater.theater_name)
  // note that if town name is provided as null, this will turn it into emptry string
  currTheater.town_name = titleCase(currTheater.town_name)

  // check whether the current theater is in database
  var values = [ currTheater.theater_name,
                 currTheater.town_name,
                 'Mumbai', // TODO city is hard coded
               ]
  let query = {
    text: `SELECT * FROM theaters WHERE theater_name = $1 
          AND town_name = $2 AND city_name = $3;`,
    values: values
  }
  pool.query(query).then((result) => { 
    // this theater already in database
    if (result.rows.length > 0) {
      newEntry.theaterIds.push(result.rows[0].id)
      addANewTheater(newEntry, res, theaterIdx + 1)
    }
    // insert this theater
    else {
      query = {
        text:  "INSERT INTO theaters (theater_name, town_name, city_name) VALUES ($1, $2, $3) RETURNING id;",
        values: values
      }
      pool.query(query).then((result) => {
        newEntry.theaterIds.push(result.rows[0].id)
        addANewTheater(newEntry, res, theaterIdx + 1)
      })
    }
  }).catch((e) => {res.status(400).send( e.message) })

}

// record this entry
function createEntry(newEntry, res) {
  if (!newEntry.netid) res.status(400).send( "Not logged in!" )

  let query = {
    text: "INSERT INTO entries (user_netid) VALUES ($1) RETURNING id;",
    values: [ newEntry.netid ],
  }

  pool.query(query).then((result) => {
    newEntry.entryId = result.rows[0].id
    addShowings(newEntry, res)
  }).catch((e) => {res.status(400).send( e.message) })
}

// insert each movie - theater pair as a showing on this date
function addShowings(newEntry, res) {
  let text = `INSERT INTO showings (show_date, movies_id, newspapers_id,
    theaters_id, entries_id) VALUES (`
  for (let i = 0; i < newEntry.theaterIds.length; i++) {
    let j = i * 5 + 1;
    text += `$${j}, $${j+1}, $${j+2}, $${j+3}, $${j+4}`
    if (i != newEntry.theaterIds.length - 1) {
      text += "), ("
    } else {
      text += ")"
    }
  }
  text += ";"

  let values = []
  newEntry.theaterIds.forEach((theaterId) => {
    if (isNaN(theaterId)) res.status(400).send( "Theater id is not a number" )
    values.push(newEntry.date) // show_date
    values.push(newEntry.movie.id) // movies_id
    // TODO: Notice that newspaper id is HARD CODED 
    values.push(1) // newspapers_id
    values.push(theaterId) // theaters_id
    values.push(newEntry.entryId) // entries_id
  })
  let query = { text: text, values: values }
  pool.query(query).then((result) => {
    // success
    res.sendStatus(200)
  }).catch((e) => { res.status(400).send( e.message )})
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
