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
var date_picker;            // date picker

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
    $("#theater-names").val("")
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
  if (!validateInputs()) {
    return
  }

  let entry = {
    date: $("#month").text() + "-" + $("#date")[0].value,
    movieName: $("#movie-name")[0].value,
    theaterNames: currTheaterNames,
  }
  $.post("/addentry", entry, (data, status) => {
    // clear form
    $("#theater-names-conatiner").empty();
    $("#theater-names").val("")
    $("#movie-name").val("")
    currTheaterNames = [];
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

function validateInputs() {
  let date = $("#date")[0].value;
  if (!date) {
    displayError("Please enter a date")
    return false;
  }

  if (!$("#movie-name")[0].value) {
    displayError("Please enter the movie name")
    return false;
  }

  if (currTheaterNames.length == 0) {
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
  let minDate = new Date($("#month").text() + "-01");
  minDate.setDate(minDate.getDate() + 1)
  let maxDate = new Date(minDate);
  maxDate.setMonth(maxDate.getMonth() + 1)
  maxDate.setDate(0)

  date_picker = datepicker(document.querySelector("#date"), {
    formatter: (el, date, instance) => {
      el.value = date.toISOString().split('T')[0].slice(-2);
    },
    minDate: minDate,
    maxDate: maxDate,
    dateSelected: minDate
  })

  $("#add-entry").click(addEntry)
  $("#finish").click(finishAndDownload)
  $("#theater-names").keydown(enterKeyEntry)
})
