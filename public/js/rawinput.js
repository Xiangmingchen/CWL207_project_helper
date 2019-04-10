var allTheaterNames;        // a list of all theater names for search
var currTheaterNames = [];  // theaters that the user have chosen
var searchOptions = {       // search options for Fuse.js
  shouldSort: true,
  threshold: 0.6,
  location: 0,
  distance: 5,
  maxPatternLength: 30,
  minMatchCharLength: 1,
  keys: [ "name" ]
}

/**
 * Search for theaters in the excel sheet first column, show 
 * results in a drop down beneath the search bar
 *
 */
function fuzzySearchTheater() {
  // if we don't have the theater names yet, get them and try again
  if (!allTheaterNames) {
    getTheaterNames(fuzzySearchTheater);
    return;
  }

  // create a fuzzy search with Fuse.js
  var fuse = new Fuse(allTheaterNames, searchOptions)
  var result = fuse.search($("#theater-names")[0].value.slice(0, 30))

  // clear previous results
  var dropdown = $("#theater-dropdown")
  dropdown.empty()

  // insert new results
  for (let i = 0; i < result.length && i < 10; i += 1) {
    dropdown.append(`<div class="dropdown-item add-theater">${result[i].name}</div>`)
  }

  // add event listener to add theather
  $(".add-theater").click(addTheather)

  // hide the result list if there is none
  if (result.length > 0) {
    $('.dropdown-toggle').dropdown("show")
  } else {
    $('.dropdown-toggle').dropdown('hide')
  }

}

/**
 * Get theater names from server with "/excelinfo" api. On success push 
 * all theater names to allTeatherNames array
 *
 * @param {function} callback call back function to run after getting the theater names
 */
function getTheaterNames(callback) {
  $.get("/excelinfo", (excel) => {
    var worksheet = excel.Sheets[excel.SheetNames[0]];
    var cell = worksheet["A2"];
    var col = "A";
    allTheaterNames = [];
    for (let row = 3; cell != undefined; row += 1) {
      allTheaterNames.push({ name: cell.v })
      cell = worksheet[col + row];
    }

    callback()
  })
}

/**
 * Add a theater to currTheaterNames array and display on page.
 * This should be added as a event listener of a element
 */
function addTheather(event) {
  var theaterName = $(event.target).text();
  if (!currTheaterNames.includes(theaterName)) {
    currTheaterNames.push(theaterName)
    $("#theater-names-conatiner").append(`<div class="btn btn-outline-primary hover-delete mr-2 mb-2">${theaterName}</div>`)
      .children().last().click(removeTheather)
  }
}

/**
 * Remove a theater from currTheaterNames array and from webpage.
 * This should be added as a event listener of an element.
 */
function removeTheather(event) {
  var theaterName = $(event.target).text();
  for (let i = 0; i < currTheaterNames.length; i += 1) {
    if (currTheaterNames[i] == theaterName) {
      currTheaterNames.splice(i, 1)
      break;
    }
  }
  $(event.target).remove()
}

function addEntry() {

}
