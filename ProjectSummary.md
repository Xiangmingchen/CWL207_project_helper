# Indian Newspaper Reader Project Summary
## Goal
Help student gather movie and theater data faster and make the process more convenient.

## Format
We are creating a web application that takes in student's entry and store it either in excel sheet or directly to database.

## Prototype
Click [here](https://cwl207-project.herokuapp.com/ ) to see a prototype we have for our website.

Currently we have these functionalities on the welcome page
- Upload excel sheet template: in order to read theater names from the leftmost column
- Month input: to enforce all entries to be in the same month
- NetID input: for distinct file name

And these functionalities on the main entry page
- Date input: change which date of the month the entries are for
- Movie name input: type in movie name
- Theater fuzzy search: type in theater name to get a list of close theater name candidates and select from them
- Add entry: click this button to add the current entry
- Finish and download: click this button to download current progress. You will not lose the progress by clicking it.

Here are some keyboard shortcuts to speed things up
- After typing something into theater name, hit `Enter` to input the top theater name in the list.
- Hit `Cmd + Enter` on Mac to add entry

## Problems with the current version
- [ ] The session used on server side is not connected to database. This means if multiple users are using this website, they will lose their data. Moreover the server may crush anytime due to memory leak.
- [ ] Cannot add theater names that are not already in the excel template.
- [ ] Cannot modify previous entries. The current workaround for this is to reenter a entry with the same theater.

## Future features to add
- [ ] Save data directly to database and avoid the excel step
- [ ] Use Illinois shibboleth log in or NetID to keep track to student's progress on their individual project
