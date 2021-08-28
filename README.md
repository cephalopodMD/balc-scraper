# Spotify BALC scraper

efficiently grabs and joins song, artist, and album metadata from spotify with batching and network retry for a given playlist and outputs as csv

## setup
make sure you have node installed and ready to go in the command line

> npm i
 
note, this package only relies the requests package because it was just easier to adapt from spotify's example projects

create an spotify developer account and app as described here https://developer.spotify.com/documentation/web-api/quick-start/

copy credentials_empty.js to a new file named credentials.js and replace CLIENT_ID and CLIENT_SECRET with your spotify app's credentials

## run
> node app.js

optionally you can pipe to a csv file if you actually want to use the thing

> node app.js > balc.csv

## future improvements for others to make
- command line flags to choose your own playlist (or for bonus points, parse a link to a playlist)
- host as a web service that generalizes to other playlists
- more data (I'm not really using everything in the output)
- find a better way to get genre
- other output formats for better vis/analysis
- more efficient use of async/await (I probably didn't optimize completely)
- batch album/artist queries (max is 20 and 50 at a time iirc)
- join with other data outside spotify (lyrics, ratings, idk)
- maybe remove the requests dependency
