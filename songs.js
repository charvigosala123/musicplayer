const LASTFM_API_KEY = '3b26d410a416531852ee91dbd9a5839f';
const YOUTUBE_API_KEY = 'AIzaSyA0CWR_dgbEfE-lzH1b64TvIDEtra-YRMI';

const params = new URLSearchParams(window.location.search);
const mood = params.get('feeling') || 'happy';

document.getElementById('page-title').textContent = `Songs for mood: ${mood}`;

const songList = document.getElementById('song-list');

let player;
let currentVideoId = null;
let currentPlayingCard = null;
let currentTrackName = '';
let currentArtistName = '';
let trackQueue = [];
let currentTrackIndex = -1;

const playerBar = document.getElementById('player-bar');
const playerSongInfo = document.getElementById('player-song-info');
const btnPlay = document.getElementById('player-play');
const btnPause = document.getElementById('player-pause');
const btnStop = document.getElementById('player-stop');
const volumeSlider = document.getElementById('player-volume');

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      window.onYouTubeIframeAPIReady = () => resolve();
      document.head.appendChild(tag);
    }
  });
}

function createOrLoadPlayer(videoId) {
  return new Promise((resolve) => {
    if (player && currentVideoId === videoId) {
      player.playVideo();
      resolve();
    } else if (player) {
      player.loadVideoById(videoId);
      currentVideoId = videoId;
      resolve();
    } else {
      const playerDiv = document.createElement('div');
      playerDiv.id = 'yt-audio-player';
      playerDiv.style.width = '1px';
      playerDiv.style.height = '1px';
      playerDiv.style.position = 'absolute';
      playerDiv.style.left = '-9999px';
      playerDiv.style.top = '0';
      document.body.appendChild(playerDiv);

      player = new YT.Player('yt-audio-player', {
        height: '1',
        width: '1',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          disablekb: 1,
        },
        events: {
          onReady: (event) => {
            event.target.playVideo();
            resolve();
          },
          onStateChange: onPlayerStateChange,
        },
      });

      currentVideoId = videoId;
    }
  });
}

function stopPlayer() {
  if (player) {
    player.stopVideo();
  }
}

function pausePlayer() {
  if (player) {
    player.pauseVideo();
  }
}

function onPlayerStateChange(event) {
  switch(event.data) {
    case YT.PlayerState.PLAYING:
      btnPlay.disabled = true;
      btnPause.disabled = false;
      btnStop.disabled = false;

      const token = localStorage.getItem('token');
      if (token && currentTrackName) {
        fetch('/api/user/history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
          },
          body: JSON.stringify({ song_name: currentTrackName }),
        })
        .then(response => {
          if (response.ok) {
            console.log('✔️ History saved:', currentTrackName);
          } else {
            console.error('❌ Failed to save history');
          }
        })
        .catch(err => console.error('🚨 History error:', err));
      }

      break;
    case YT.PlayerState.PAUSED:
      btnPlay.disabled = false;
      btnPause.disabled = true;
      btnStop.disabled = false;
      break;
    case YT.PlayerState.ENDED:
      if (currentTrackIndex >= 0 && currentTrackIndex < trackQueue.length - 1) {
        const nextTrack = trackQueue[currentTrackIndex + 1];
        currentTrackIndex++;
        currentTrackName = nextTrack.trackName;
        currentArtistName = nextTrack.artistName;

        createOrLoadPlayer(nextTrack.videoId).then(() => {
          playerSongInfo.textContent = `${nextTrack.trackName} — ${nextTrack.artistName}`;
          setVolume(volumeSlider.value);

          if (currentPlayingCard) {
            toggleSongButtons(currentPlayingCard, false);
          }

          const cards = document.querySelectorAll('.song-card');
          cards.forEach(card => {
            const title = card.querySelector('.song-title').textContent;
            const artist = card.querySelector('.artist-name').textContent.replace(/^by /, '');
            if (title === nextTrack.trackName && artist === nextTrack.artistName) {
              currentPlayingCard = card;
              toggleSongButtons(card, true);
            }
          });
        });
      } else {
        resetPlayerBar();
      }
      break;
    default:
      break;
  }
}

function resetPlayerBar() {
  btnPlay.disabled = true;
  btnPause.disabled = true;
  btnStop.disabled = true;
  volumeSlider.disabled = true;
  playerBar.style.visibility = 'hidden';
  playerSongInfo.textContent = 'No song playing';

  if (currentPlayingCard) {
    toggleSongButtons(currentPlayingCard, false);
    currentPlayingCard = null;
  }
}

function toggleSongButtons(card, isPlaying) {
  const playBtn = card.querySelector('.play-button');
  const pauseBtn = card.querySelector('.pause-button');
  const stopBtn = card.querySelector('.stop-button');

  playBtn.disabled = isPlaying;
  pauseBtn.disabled = !isPlaying;
  stopBtn.disabled = !isPlaying;
}

function setVolume(value) {
  if (player) {
    player.setVolume(value);
  }
}

const cacheKey = `ytCache_${mood}`;

function renderSongs(tracks) {
  songList.innerHTML = '';

  if (tracks.length === 0) {
    songList.innerHTML = '<p>No playable YouTube videos found for these songs.</p>';
    return;
  }

  trackQueue = tracks;

  tracks.forEach(({ trackName, artistName, videoId }) => {
    const card = document.createElement('div');
    card.className = 'song-card';

    card.innerHTML = `
      <div class="song-title">${trackName}</div>
      <div class="artist-name">by ${artistName}</div>
      <button class="play-button">▶️ Play</button>
      <button class="pause-button" disabled>⏸ Pause</button>
      <button class="stop-button" disabled>⏹ Stop</button>
    `;

    const lyricsBtn = document.createElement('button');
    lyricsBtn.textContent = '🎤 Lyrics';
    lyricsBtn.className = 'lyrics-button';
    lyricsBtn.addEventListener('click', () => {
      const query = new URLSearchParams({
        song: trackName,
        artist: artistName,
      });
const mood = new URLSearchParams(window.location.search).get('feeling') || 'happy';
window.open(`lyrics.html?song=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}&mood=${encodeURIComponent(mood)}`, '_blank');
});

    card.appendChild(lyricsBtn);

    const playBtn = card.querySelector('.play-button');
    const pauseBtn = card.querySelector('.pause-button');
    const stopBtn = card.querySelector('.stop-button');

    playBtn.addEventListener('click', async () => {
      if (currentPlayingCard && currentPlayingCard !== card) {
        toggleSongButtons(currentPlayingCard, false);
      }

      await createOrLoadPlayer(videoId);

      toggleSongButtons(card, true);

      playerBar.style.visibility = 'visible';
      playerSongInfo.textContent = `${trackName} — ${artistName}`;
      btnPlay.disabled = true;
      btnPause.disabled = false;
      btnStop.disabled = false;
      volumeSlider.disabled = false;
      setVolume(volumeSlider.value);

      currentPlayingCard = card;
      currentTrackName = trackName;
      currentArtistName = artistName;

      currentTrackIndex = trackQueue.findIndex(t =>
        t.trackName === trackName && t.artistName === artistName
      );
    });

    pauseBtn.addEventListener('click', () => {
      pausePlayer();
      toggleSongButtons(card, false);
      btnPlay.disabled = false;
      btnPause.disabled = true;
    });

    stopBtn.addEventListener('click', () => {
      stopPlayer();
      resetPlayerBar();
    });

    songList.appendChild(card);
  });
}

volumeSlider.addEventListener('input', () => {
  setVolume(volumeSlider.value);
});

btnPlay.addEventListener('click', () => {
  if (player) {
    player.playVideo();
  }
});

btnPause.addEventListener('click', () => {
  pausePlayer();
});

btnStop.addEventListener('click', () => {
  stopPlayer();
  resetPlayerBar();
});

(async () => {
  try {
    let cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedTracks = JSON.parse(cached);
      renderSongs(cachedTracks);
      document.getElementById('page-title').textContent = `Songs for mood: ${mood}`;
      await loadYouTubeAPI();
      return;
    }

    const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${mood}&api_key=${LASTFM_API_KEY}&format=json`);
    const data = await response.json();
    const tracks = data.tracks.track.slice(0, 10);

    await loadYouTubeAPI();

    const playableTracks = [];

    for (const track of tracks) {
      const query = `${track.name} ${track.artist.name}`;
      const ytResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`);
      const ytData = await ytResponse.json();

      if (ytData.items && ytData.items.length > 0) {
        const videoId = ytData.items[0].id.videoId;
        playableTracks.push({
          trackName: track.name,
          artistName: track.artist.name,
          videoId,
        });
      }
    }

    if (playableTracks.length === 0) {
      songList.innerHTML = '<p>No playable YouTube videos found for these songs.</p>';
    } else {
      sessionStorage.setItem(cacheKey, JSON.stringify(playableTracks));
      renderSongs(playableTracks);
    }

    document.getElementById('page-title').textContent = `Songs for mood: ${mood}`;
  } catch (error) {
    songList.innerHTML = `<p>Failed to load songs. Try again later.</p>`;
    console.error('Error fetching songs:', error);
  }
})();

document.getElementById('history-btn').addEventListener('click', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please login first.');
    return;
  }

  fetch('/api/user/history', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
  .then(response => {
    if (response.status === 401) {
      alert('Session expired. Please login again.');
      window.location.href = '/login';
      return;
    }
    if (!response.ok) throw new Error('Failed to fetch history');
    return response.json();
  })
  .then(historyData => {
    const historyContainer = document.getElementById('history-container');
    if (!historyContainer) {
      alert('History container element missing in your HTML!');
      return;
    }

    if (historyData.length === 0) {
      historyContainer.innerHTML = '<p>No history found.</p>';
      return;
    }

    historyContainer.innerHTML = historyData.map(item =>
      `<div class="history-item">${item.song_name} — Played at ${new Date(item.played_at).toLocaleString()}</div>`
    ).join('');
  })
  .catch(err => {
    console.error('Error fetching history:', err);
    alert('Error fetching history data.');
  });

});
