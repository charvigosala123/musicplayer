// script.js

async function loadMoodSongs() {
  const mood = document.getElementById('moodDropdown').value;
  const songsList = document.getElementById('songsList');
  songsList.innerHTML = '';

  if (!mood) return;

  try {
    const res = await fetch(`/api/get-mood-songs?mood=${mood}`);
    const songs = await res.json();

    if (songs.length === 0) {
      songsList.innerHTML = '<p>No songs found for this mood.</p>';
      return;
    }

    songs.forEach(song => {
      const songDiv = document.createElement('div');
      songDiv.className = 'song-item';
      songDiv.innerHTML = `
        <h3>${song.TRACK_NAME}</h3>
        <p><strong>Artist:</strong> ${song.ARTIST_NAME}</p>
        <audio controls>
          <source src="https://www.youtube.com/watch?v=${song.YOUTUBE_VIDEO_ID}" type="audio/mpeg">
          Your browser does not support the audio element.
        </audio>
        <p><em>Lyrics coming soon...</em></p>
        <hr/>
      `;
      songsList.appendChild(songDiv);
    });
  } catch (error) {
    console.error('Error fetching mood songs:', error);
    songsList.innerHTML = '<p>Error loading songs. Please try again later.</p>';
  }
}
