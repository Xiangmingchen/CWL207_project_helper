var theaterData;        // a list of all theater names for search
var currMovie;          // the movie object, with properties: id, name
var movieData;          // a list of all movie names for search
var currTheaterIds = [];  // theaters that the user have chosen, with id and name
var currNewTheaters = [];   // a list of new theaters associated with current entry
var date_picker;            // date picker
var keymap = {};            // record pressed keys

/**
 * Search for theaters in theaters in the database, show 
 * results in a drop down beneath the search bar
 */
function fuzzySearchTheater() {
  // if we don't have the theater names, report error
  if (!theaterData) {
    displayError("Disconnected, please reload")
    return;
  }

  let searchOptions = {       // search options for Fuse.js
    shouldSort: true,
    threshold: 0.6,
    location: 0,
    distance: 5,
    maxPatternLength: 30,
    minMatchCharLength: 1,
    keys: [ "theater_name", "town_name" ]
  }
  // create a fuzzy search with Fuse.js
  var fuse = new Fuse(theaterData, searchOptions)
  var input = $("#theater-names")[0].value.trim()
  var result = fuse.search(input.slice(0, 30))

  // clear previous results
  var dropdown = $("#theater-dropdown-content")
  dropdown.empty()

  let firstText = "";

  // insert new results
  for (let i = 0; i < result.length && i < 10; i += 1) {
    var text = combineNames(result[i].theater_name, result[i].town_name);
    dropdown.append(`<div class="dropdown-item add-theater" data-id="${result[i].id}">${text}</div>`)

    if (i == 0) firstText = text
  }

  // add the button to add a new theater
  if (result.length < 1 || input.toLowerCase() !== firstText.toLowerCase()) {
    dropdown.append(`<div class="dropdown-item pl-3 text-primary add-theater-popup" data-toggle="modal" data-target="#addTheaterModal"><i class="fas fa-plus mr-2"></i>${titleCase(input)}</div>`)
  }

  // add event listener to add theather
  $(".add-theater").click(addTheater)
  $(".add-theater-popup").click(addTheaterPopup)

  // hide the result list if there is none
  if (result.length > 0 || input.length > 0) {
    $('#theater-dropdown').dropdown("show")
  } else {
    $('#theater-dropdown').dropdown('hide')
  }

}

/**
 * Add a theater to currTheaterIds array and display on page.
 * This should be added as a event listener of a element
 */
function addTheater(event) {
  var theaterName = $(event.target).text();
  var theaterId = $(event.target).data("id");
  if (!currTheaterIds.includes(theaterId)) {
    $("#theater-names").val("")
    currTheaterIds.push(theaterId)
    $("#theater-names-conatiner").append(`<div class="btn btn-outline-primary hover-delete mr-2 mb-2" data-id="${theaterId}">${theaterName}</div>`)
      .children().last().click(removeTheather)
  }
}

function addTheaterPopup(event) {
  $("#newTheaterName").val($(event.target).text())
}

function addNewTheater() {
  var newTheaterName = titleCase($("#newTheaterName")[0].value)
  var newTownName = titleCase($("#newTheaterTown")[0].value)

  if (!newTownName) {
    newTownName = null
  }

  // check whether theater name has value
  if (!newTheaterName) {
    displayModalError("Please enter theater name")
    return
  }

  // check whether the theater already exist
  for (let i = 0; i < theaterData.length; i += 1) {
    // assume the strings from database is already title cased
    if (theaterData[i].theater_name == newTheaterName
      && theaterData[i].town_name == newTownName) {
      displayModalError("This theater already exists")
      return
    }
  }
 
  // add it to new theater list
  currNewTheaters.push({
    theater_name: newTheaterName,
    town_name: newTownName,
  })

  // hide the modal
  $("#addTheaterModal").modal('hide')
  // clear the form
  $("#newTheaterTown").val('')
  $("#theater-names").val('')
  
  // add it to the UI
  $("#theater-names-conatiner").append(`<div class="btn btn-outline-info hover-delete mr-2 mb-2">${combineNames(newTheaterName, newTownName)}</div>`)
    .children().last().click(removeNewTheather)
}

function combineNames(theaterName, townName) {
  return theaterName + (townName ? ' (' + townName + ')' : '')
}

function removeNewTheather(event) {
  var newTheater = $(event.target).text();
  for (let i = 0; i < currNewTheaters.length; i += 1) {
    if (combineNames(currNewTheaters[i].theater_name, 
      currNewTheaters[i].town_name) === newTheater) {
      currNewTheaters.splice(i, 1)
      break;
    }
  }
  $(event.target).remove()
}

// display error on modal (popup)
function displayModalError(message) {
  $("#modal-error-alert").text(message).show()
}

function hideModalAlert() {
  $("#modal-error-alert").hide();
}

/**
 * Search for the movie in movies in the database, show 
 * results in a drop down beneath the search bar
 */
function fuzzySearchMovie() {
  // if we don't have the theater names, report error
  if (!movieData) {
    displayError("Disconnected, please reload")
    return;
  }

  let searchOptions = {       // search options for Fuse.js
    shouldSort: true,
    threshold: 0.6,
    location: 0,
    distance: 5,
    maxPatternLength: 30,
    minMatchCharLength: 1,
    keys: [ "name" ]
  }
  // create a fuzzy search with Fuse.js
  var fuse = new Fuse(movieData, searchOptions)
  var input = $("#movie-name")[0].value
  var result = fuse.search(input.slice(0, 30))

  // make the input red so that user knows it's not final
  $("#movie-name").removeClass("border-success").addClass("border-warning")
  currMovie = null

  // clear previous results
  var dropdown = $("#movie-dropdown-content")
  dropdown.empty()

  // insert new results
  for (let i = 0; i < result.length && i < 10; i += 1) {
    dropdown.append(`<div class="dropdown-item choose-movie" data-id="${result[i].id}">${result[i].name}</div>`)
  }

  if (result.length < 1 || result[0].name.toLowerCase() !== input.toLowerCase()) {
    dropdown.append(`<div class="dropdown-item choose-movie pl-3 text-primary"><i class="fas fa-plus mr-2"></i>${titleCase(input)}</div>`)
  }

  // add event listener 
  $(".choose-movie").click(chooseMovie)

  // hide the result list if there is none
  if (result.length > 0 || input.length > 0) {
    $('#movie-dropdown').dropdown("show")
  } else {
    $('#movie-dropdown').dropdown('hide')
  }

}

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

/**
 * Choose a movie from the dropdown list or add a new movie,
 * if movie is new, movieId will be undefined.
 */
function chooseMovie(event) {
  var movieId = $(event.target).data("id");
  var movieName = $(event.target).text();
  $("#movie-name").val(movieName).removeClass("border-warning").addClass("border-success");
  currMovie = {
    id: movieId,
    name: movieName,
  }
}

/**
 * Remove a theater from currTheaterIds array and from webpage.
 * This function should be added as a event listener of an element.
 */
function removeTheather(event) {
  var theaterId = $(event.target).data("id");
  for (let i = 0; i < currTheaterIds.length; i += 1) {
    if (currTheaterIds[i] == theaterId) {
      currTheaterIds.splice(i, 1)
      break;
    }
  }
  $(event.target).remove()
}

/**
 * Add the current entry to database.
 */
function addEntry() {
  if (!validateInputs()) {
    return
  }

  let entry = {
    date: $("#date").text(),
    movie: currMovie,
    theaterIds: currTheaterIds,
  }
  $.post("/addentry", entry, (data, status) => {
    // clear form
    $("#theater-names-conatiner").empty();
    $("#theater-names").val("")
    $("#movie-name").val("")
    currTheaterIds = [];
    // show success
    $("#success-alert").show();
  })
}

function enterKeyEntry(e) {
  // if enter key is pressed
  if (e.keyCode === 13) {
    var firstChoice = $("#theater-dropdown").children()[0]
    if (firstChoice) {
      firstChoice.click()
    }
  }
}

function cmdEnterAddEntry(e) {
    e = e || event; // to deal with IE
    keymap[e.key] = e.type == 'keydown';

  if (keymap["Enter"] && keymap["Meta"]) {
    addEntry()
  }
}

function validateInputs() {
  let date = $("#date")[0].value;

  if (!currMovie) {
    if ($("#movie-name")[0].value) {
      displayError("Please choose a movie name from the list or add a new movie")
    }
    else {
      displayError("Please enter the movie name")
    }
    return false;
  }

  if (currTheaterIds.length == 0 && currNewTheaters.length == 0) {
    displayError("Please enter at least one theater")
    return false;
  }

  return true; 
}

function hideAlert() {
  $("#success-alert").hide();
  $("#error-alert").hide()
}

function displayError(message) {
  $("#error-alert").text(message).show()
}

function finishAndDownload() {
  $.post("/generateExcel", (fileName) => {
    window.open('/downloadExcel')
  }).catch((xhr) => {
    let error = xhr.responseJSON
    if (error.code == 1) {
      displayError(error.message)
    }
  })
}


/** 
 * This executes when the html loads
 */
$(() => {
  // get all theaters
  $.get("theaters", (data) => {
    theaterData = data
  })
  // get all movies
  $.get("movies", (data) => {
    movieData = data
  })
  $("#add-entry").click(addEntry)
  $("#finish").click(finishAndDownload)
  $("#theater-names").keydown(enterKeyEntry)
  $(this).keydown(cmdEnterAddEntry)
  $(this).keyup(cmdEnterAddEntry)
})
