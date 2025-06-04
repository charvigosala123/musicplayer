// Check for token
const token = localStorage.getItem("token");
if (!token) {
  alert("Unauthorized access. Please log in.");
  window.location.href = "/";
}

const usernameSpan = document.getElementById("username");

function parseJWT(token) {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

const userData = parseJWT(token);
if (userData && userData.username) {
  usernameSpan.textContent = userData.username;
}

// Fetch songs by mood
function selectMood(mood) {
  fetch(`/songs?mood=${mood}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(songs => {
      const container = document.getElementById("song-list");
      container.innerHTML = `<h3>Songs for "${mood}" mood:</h3>`;
      if (songs.length === 0) {
        container.innerHTML += "<p>No songs found.</p>";
      } else {
        songs.forEach(song => {
          container.innerHTML += `
            <div class="song-card">
              <img src="${song.THUMBNAIL_URL}" alt="Thumbnail" width="100"/>
              <p><strong>${song.TITLE}</strong> by ${song.ARTIST}</p>
              <a href="https://www.youtube.com/watch?v=${song.YOUTUBE_ID}" target="_blank">Play</a>
            </div>`;
        });
      }
    })
    .catch(err => {
      console.error("Error fetching songs:", err);
    });
}
