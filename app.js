/**
 * This is an example of a basic node.js script that performs
 * the Client Credentials oAuth2 flow to get song data
 */

const request = require('request'); // "Request" library

const client_id = require('./credentials').client_id
const client_secret = require('./credentials').client_secret
const keys = ['C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab','A','A#/Bb','B']
const playlistid = '3NiJp846OseLL5Y2AgtsZd'

// your application requests authorization
const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
        'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
    },
    form: {
        grant_type: 'client_credentials'
    },
    json: true
};

request.post(authOptions, async function (error, response, body) {
    if (!error && response.statusCode === 200) {
        // use the access token to access the Spotify Web API
        let token = body.access_token;

        let total_tracks = (await getSpotifyEntity(`https://api.spotify.com/v1/playlists/${playlistid}`, token)).tracks.total

        let tracks = [];
        let album_promises = {}
        let artist_promises = {}
        let batches = []
        let fetched = 0;
        for(let i = 0; i < total_tracks; i += 100) {
            batches.push(new Promise(async resolve => {
                // get our main batch of track data
                let batch = await getSpotifyEntity(`https://api.spotify.com/v1/playlists/${playlistid}/tracks?offset=${i}&limit=100`, token)

                // start all our requests for more joined data
                let track_features_promise = getSpotifyEntity(`https://api.spotify.com/v1/audio-features/?ids=${batch.items.map(item => item.track.id).join(',')}`, token)
                    .then(value => value.audio_features)
                for(let j = 0; j < batch.items.length; j += 1) {
                    tracks[i+j] = batch.items[j];

                    let albumid = batch.items[j].track.album.id
                    if (!(albumid in album_promises)) {
                        // use a cache so we can ask for album info only once
                        album_promises[albumid] = getSpotifyEntity(batch.items[j].track.album.href, token)
                    }

                    for(artist of batch.items[j].track.artists) {
                        // use a cache so we can ask for each artist only once
                        if (!(artist.id in artist_promises)) {
                            artist_promises[artist.id] = getSpotifyEntity(artist.href, token)
                        }
                    }
                }

                // wait for everything to come in/retry and join in new data
                let track_features = await track_features_promise
                for(let j = 0; j < batch.items.length; j += 1) {
                    if(!tracks[i+j]) {
                        console.log(`${i} ${j} ${batch.items.length}`)
                    }
                    tracks[i+j].album = await album_promises[batch.items[j].track.album.id];

                    let genres = new Set();
                    for(artist of tracks[i+j].track.artists) {
                        let artist_info = await artist_promises[artist.id]
                        for(genre of artist_info.genres){
                            genres.add(genre)
                        }
                    }
                    tracks[i+j].genres = Array.from(genres).join(';')

                    tracks[i+j].features = track_features[j]

                    fetched++;
                    process.stderr.write(`\r${fetched}/${total_tracks}`)
                }
                resolve()
            }));
        }

        await Promise.all(batches.concat(Object.values(album_promises)));

        let track_strings = tracks.map(item => {
            let time_m = Math.floor(item.track.duration_ms / (1000*60))
            let time_s = Math.floor((item.track.duration_ms - time_m*1000*60) / 1000)
            if (time_s<10) {
                time_s = `0${time_s}`
            }
            return `"${item.album.name}",` +
            `"${(item.album.artists||[]).map(artist => artist.name).join(';')}",` +
            `${(new Date(item.album.release_date)).toISOString().substr(0,10)},` +
            `"${item.album.label}",` +
            `"${item.track.name}",`+
            `"${item.track.artists.map(artist => artist.name).join(';')}",`+
            `${item.genres},`+
            `${time_m}:${time_s},` +
            `${keys[item.features.key]},` +
            `${item.features.mode ? 'Major' : 'Minor'},` +
            `${Math.ceil(item.features.danceability*100)}%,` +
            `${item.features.instrumentalness > 0.5 ? 'Instrumental' : 'Non-instrumental'},` +
            `${item.features.speechiness > 0.5 ? 'Spoken' : 'Non-spoken'},` +
            `${item.features.loudness},` +
            `${item.features.tempo},`
        })
        console.log('Name,Artists,Release,Label,Track,Track Artists,Artist Genres,Time,Key,Major/Minor,Danceability,Instrumental,Spoken Word,Loudness DB,BPM')
        for(track_string of track_strings){
            console.log(track_string)
        }
    }
});

function getSpotifyEntity(href, token) {
    return new Promise(async (resolve) => {
        let options = {
            url: href,
            headers: {
                'Authorization': 'Bearer ' + token
            },
            json: true
        };
        let retry = false;
        do {
            await new Promise(r => request.get(options, async function (error, response, body) {
                if (error || !body || body.error) {
                    retry = true;
                }
                else {
                    retry = false;
                    resolve(body);
                }
                r();
            }));
            // wait 1-2 seconds to retry
            await new Promise(r => setTimeout(r, 1000 + Math.floor(Math.random() * 1000)));
        } while (retry);
    });
}

