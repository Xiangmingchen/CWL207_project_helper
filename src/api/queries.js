const pg_config = require('./pg_config')
const pool = new require('pg').Pool(pg_config);

/**
 * Get all theaters in a city (e.g. Mumbai). If undefined, 
 * return all theaters.
 *
 * @param {string} cityName the name of the city.
 */
const getTheaters = (req, res) => {
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
}

module.exports = {
  getTheaters,
}
