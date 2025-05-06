document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const audio = document.getElementById("audio");
  const playBtn = document.getElementById("play");
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");
  const title = document.getElementById("title");
  const artist = document.getElementById("artist");
  const cover = document.getElementById("cover");
  const progress = document.getElementById("progress");
  const progressContainer = document.querySelector(".progress-bar");
  const currentTimeEl = document.getElementById("current-time");
  const durationEl = document.getElementById("duration");
  const volumeSlider = document.getElementById("volume");
  const playlistContainer = document.getElementById("playlist-items");
  const equalizer = document.querySelector(".equalizer");
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const favoritesContainer = document.getElementById("favorites-items");
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabs = document.querySelectorAll(".tab-content");

  // Default songs (as fallback)
  const defaultSongs = [
    {
      id: 1,
      title: "Trance 85",
      artist: "Free Music Archive",
      cover: "/api/placeholder/500/500?text=Trance+85",
      src: "https://cdn.freesound.org/previews/524/524828_4929134-lq.mp3",
      duration: "0:30",
    },
    {
      id: 2,
      title: "Synth Wave",
      artist: "Electronic Studio",
      cover: "/api/placeholder/500/500?text=Synth+Wave",
      src: "https://cdn.freesound.org/previews/560/560935_2262127-lq.mp3",
      duration: "0:45",
    },
    {
      id: 3,
      title: "Urban Groove",
      artist: "Beats Collection",
      cover: "/api/placeholder/500/500?text=Urban+Groove",
      src: "https://cdn.freesound.org/previews/253/253652_4548252-lq.mp3",
      duration: "0:40",
    },
    {
      id: 4,
      title: "Peaceful Piano",
      artist: "Relaxing Sounds",
      cover: "/api/placeholder/500/500?text=Peaceful+Piano",
      src: "https://cdn.freesound.org/previews/612/612095_5674468-lq.mp3",
      duration: "0:27",
    },
    {
      id: 5,
      title: "Guitar Melody",
      artist: "Acoustic Sessions",
      cover: "/api/placeholder/500/500?text=Guitar+Melody",
      src: "https://cdn.freesound.org/previews/438/438979_2211949-lq.mp3",
      duration: "0:32",
    },
  ];
  let songs = [];

  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

  let songIndex = 0;
  let isPlaying = false;
  let currentPlaylist = [];

  const napsterApiKey = "ZTVhYTU3MWEtZjRhNy00MmRmLWJiZDAtNjQwNTAwN2E0ODhi"; //Demo key
  const napsterBaseUrl = "https://api.napster.com/v2.2";

  // Initialize Player
  async function init() {
    showLoading("library-tab", "Loading your music library...");

    try {
      const apiSongs = await fetchTopSongs();
      songs = apiSongs.length > 0 ? apiSongs : defaultSongs;
    } catch (error) {
      console.error("Error loading from API:", error);
      showNotification("Failed to load songs from API. Using default songs.");
      songs = defaultSongs;
    }

    currentPlaylist = songs;
    loadSong(songs[songIndex]);
    createPlaylist();
    updatePlaylistActiveItem();
    loadFavorites();
    audio.volume = volumeSlider.value;

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        const tabId = button.getAttribute("data-tab");
        tabs.forEach((tab) => {
          tab.style.display = "none";
        });
        document.getElementById(tabId).style.display = "block";
      });
    });

    tabButtons[0].click();
  }

  function showLoading(containerId, message) {
    const container = document.getElementById(containerId);
    const loadingEl = document.createElement("div");
    loadingEl.className = "loading";
    loadingEl.textContent = message || "Loading...";

    if (container) {
      const contentArea = container.querySelector("ul") || container;
      contentArea.innerHTML = "";
      contentArea.appendChild(loadingEl);
    }
  }

  // Fetch top songs from Napster API
  async function fetchTopSongs(limit = 20) {
    try {
      const response = await fetch(
        `${napsterBaseUrl}/tracks/top?apikey=${napsterApiKey}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch top tracks");
      }

      const data = await response.json();

      if (data.tracks && data.tracks.length > 0) {
        return data.tracks.map((track) => ({
          id: track.id,
          title: track.name,
          artist: track.artistName,
          cover: track.albumId
            ? `https://api.napster.com/imageserver/v2/albums/${track.albumId}/images/500x500.jpg`
            : `/api/placeholder/500/500?text=${encodeURIComponent(track.name)}`,
          src:
            track.previewURL ||
            `https://listen.hs.llnwd.net/g3/prvw/4/2/4/${track.id}.mp3`,
          duration: formatTime(track.playbackSeconds || 30),
        }));
      }
      return [];
    } catch (error) {
      console.error("Error fetching top songs:", error);
      return [];
    }
  }

  // Create Playlist Items
  function createPlaylist() {
    playlistContainer.innerHTML = "";
    currentPlaylist.forEach((song, index) => {
      const li = createSongListItem(song, index, () => {
        songIndex = index;
        loadSong(currentPlaylist[songIndex]);
        playSong();
        updatePlaylistActiveItem();
      });

      playlistContainer.appendChild(li);
    });
  }

  function createSongListItem(song, index, clickHandler) {
    const li = document.createElement("li");
    const isFavorite = favorites.some((fav) => fav.id === song.id);

    li.innerHTML = `
          <div class="song-info">
            <div class="song-title">${song.title}</div>
            <div class="song-artist">${song.artist}</div>
          </div>
          <div class="song-actions">
            <span class="duration">${song.duration || "0:00"}</span>
            <button class="favorite-btn ${isFavorite ? "active" : ""}">
            <i class="${isFavorite ? "fas" : "far"} fa-heart"></i>
            </button>

          </div>
        `;

    li.addEventListener("click", (e) => {
      if (!e.target.closest(".favorite-btn")) {
        clickHandler();
      }
    });

    const favoriteBtn = li.querySelector(".favorite-btn");
    favoriteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(song);

      favoriteBtn.classList.toggle("active");
      const icon = favoriteBtn.querySelector("i");
      icon.classList.toggle("fas");
      icon.classList.toggle("far");

      loadFavorites();
    });

    return li;
  }

  function updatePlaylistActiveItem() {
    const playlistItems = document.querySelectorAll("#playlist-items li");
    playlistItems.forEach((item, index) => {
      if (index === songIndex) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  function toggleFavorite(song) {
    const index = favorites.findIndex((fav) => fav.id === song.id);

    if (index === -1) {
      favorites.push(song);
      showNotification(`Added "${song.title}" to favorites`);
    } else {
      favorites.splice(index, 1);
      showNotification(`Removed "${song.title}" from favorites`);
    }

    localStorage.setItem("favorites", JSON.stringify(favorites));
    loadFavorites();
    refreshSongListUIs();
  }
  function refreshSongListUIs() {
    if (currentPlaylist === songs) {
      createPlaylist();
      updatePlaylistActiveItem();
    }

    if (searchResults && searchResults.children.length > 0) {
      const currentSearchSongs = Array.from(searchResults.children).map(
        (li) => {
          return {
            id: li.dataset.songId,
            title: li.querySelector(".song-title")?.textContent || "",
            artist: li.querySelector(".song-artist")?.textContent || "",
            duration: li.querySelector(".duration")?.textContent || "0:00",
          };
        }
      );

      searchResults.innerHTML = "";
      currentSearchSongs.forEach((song, index) => {
        const fullSong = songs.find((s) => s.id === song.id) || song;
        const li = createSongListItem(fullSong, index, () => {
          currentPlaylist = currentSearchSongs;
          songIndex = index;
          loadSong(currentPlaylist[songIndex]);
          playSong();
        });
        searchResults.appendChild(li);
      });
    }
  }

  function loadFavorites() {
    favoritesContainer.innerHTML = "";

    if (favorites.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "empty-message";
      emptyMsg.textContent = "Your favorites list is empty";
      favoritesContainer.appendChild(emptyMsg);
      return;
    }

    favorites.forEach((song, index) => {
      const li = createSongListItem(song, index, () => {
        currentPlaylist = favorites;
        songIndex = index;
        loadSong(currentPlaylist[songIndex]);
        playSong();
      });

      favoritesContainer.appendChild(li);
    });
  }

  // Show notification
  function showNotification(message) {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.classList.add("show");

    setTimeout(() => {
      notification.classList.remove("show");
    }, 3000);
  }

  // Search for songs using Napster API
  async function searchSongs(query) {
    try {
      showLoading("search-results", "Searching...");

      const response = await fetch(
        `${napsterBaseUrl}/search?apikey=${napsterApiKey}&query=${encodeURIComponent(
          query
        )}&type=track&limit=10`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch search results");
      }

      const data = await response.json();
      searchResults.innerHTML = "";

      if (
        data.search &&
        data.search.data &&
        data.search.data.tracks &&
        data.search.data.tracks.length > 0
      ) {
        const searchResultTracks = data.search.data.tracks.map((track) => ({
          id: track.id,
          title: track.name,
          artist: track.artistName,
          cover: track.albumId
            ? `https://api.napster.com/imageserver/v2/albums/${track.albumId}/images/500x500.jpg`
            : `/api/placeholder/500/500?text=${encodeURIComponent(track.name)}`,
          src:
            track.previewURL ||
            `https://listen.hs.llnwd.net/g3/prvw/4/2/4/${track.id}.mp3`,
          duration: formatTime(track.playbackSeconds || 30),
        }));

        searchResultTracks.forEach((song, index) => {
          const li = createSongListItem(song, index, () => {
            // Create a new playlist from search results
            currentPlaylist = searchResultTracks;
            songIndex = index;
            loadSong(currentPlaylist[songIndex]);
            playSong();
          });

          searchResults.appendChild(li);
        });
      } else {
        searchResults.innerHTML =
          '<div class="empty-message">No results found</div>';
      }
    } catch (error) {
      console.error("Search error:", error);
      searchResults.innerHTML = `
            <div class="error-message">
              <p>Error searching for songs. Please try again later.</p>
              <p>Note: If the API is unavailable, you can still use the built-in songs from the Library tab.</p>
            </div>
          `;
    }
  }

  async function searchByGenre(genreName) {
    try {
      showLoading("search-results", `Loading ${genreName} tracks...`);

      const genreResponse = await fetch(
        `${napsterBaseUrl}/genres?apikey=${napsterApiKey}`
      );

      if (!genreResponse.ok) {
        throw new Error("Failed to fetch genres");
      }

      const genreData = await genreResponse.json();
      const genre = genreData.genres.find(
        (g) => g.name.toLowerCase() === genreName.toLowerCase()
      );

      if (!genre) {
        throw new Error(`Genre '${genreName}' not found`);
      }

      const tracksResponse = await fetch(
        `${napsterBaseUrl}/genres/${genre.id}/tracks/top?apikey=${napsterApiKey}&limit=10`
      );

      if (!tracksResponse.ok) {
        throw new Error("Failed to fetch tracks for genre");
      }

      const tracksData = await tracksResponse.json();
      searchResults.innerHTML = "";

      if (tracksData.tracks && tracksData.tracks.length > 0) {
        const genreTracks = tracksData.tracks.map((track) => ({
          id: track.id,
          title: track.name,
          artist: track.artistName,
          cover: track.albumId
            ? `https://api.napster.com/imageserver/v2/albums/${track.albumId}/images/500x500.jpg`
            : `/api/placeholder/500/500?text=${encodeURIComponent(track.name)}`,
          src:
            track.previewURL ||
            `https://listen.hs.llnwd.net/g3/prvw/4/2/4/${track.id}.mp3`,
          duration: formatTime(track.playbackSeconds || 30),
        }));

        genreTracks.forEach((song, index) => {
          const li = createSongListItem(song, index, () => {
            currentPlaylist = genreTracks;
            songIndex = index;
            loadSong(currentPlaylist[songIndex]);
            playSong();
          });

          searchResults.appendChild(li);
        });
      } else {
        searchResults.innerHTML = `<div class="empty-message">No tracks found for ${genreName}</div>`;
      }
    } catch (error) {
      console.error(`Error searching for ${genreName} tracks:`, error);
      searchResults.innerHTML = `
          <div class="error-message">
            <p>Error loading ${genreName} tracks. Please try again later.</p>
          </div>
        `;
    }
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" + secs : secs}`;
  }

  function loadSong(song) {
    title.textContent = song.title;
    artist.textContent = song.artist;
    audio.src = song.src;
    cover.src = song.cover;

    audio.addEventListener("loadedmetadata", () => {
      const durationMinutes = Math.floor(audio.duration / 60);
      let durationSeconds = Math.floor(audio.duration % 60);
      if (durationSeconds < 10) {
        durationSeconds = `0${durationSeconds}`;
      }
      durationEl.textContent = `${durationMinutes}:${durationSeconds}`;
    });

    audio.addEventListener("error", () => {
      console.error("Error loading audio:", song.src);
      showNotification(
        `Error loading audio: ${song.title}. Try another track.`
      );
    });
  }

  function playSong() {
    playBtn.querySelector("i").classList.replace("fa-play", "fa-pause");
    document.querySelector(".equalizer").style.display = "flex";
    document.querySelector(".album-cover").classList.add("playing");
    audio.play().catch((error) => {
      console.error("Playback error:", error);
      showNotification("Playback error. Please try another track.");
    });
    isPlaying = true;
  }

  function pauseSong() {
    playBtn.querySelector("i").classList.replace("fa-pause", "fa-play");
    document.querySelector(".equalizer").style.display = "none";
    document.querySelector(".album-cover").classList.remove("playing");
    audio.pause();
    isPlaying = false;
  }

  function prevSong() {
    songIndex--;
    if (songIndex < 0) {
      songIndex = currentPlaylist.length - 1;
    }
    loadSong(currentPlaylist[songIndex]);
    updatePlaylistActiveItem();
    if (isPlaying) playSong();
  }

  function nextSong() {
    songIndex++;
    if (songIndex > currentPlaylist.length - 1) {
      songIndex = 0;
    }
    loadSong(currentPlaylist[songIndex]);
    updatePlaylistActiveItem();
    if (isPlaying) playSong();
  }

  function updateProgress(e) {
    const { duration, currentTime } = e.srcElement;

    if (isNaN(duration) || duration === 0) {
      return;
    }

    const progressPercent = (currentTime / duration) * 100;
    progress.style.width = `${progressPercent}%`;

    const durationMinutes = Math.floor(duration / 60);
    let durationSeconds = Math.floor(duration % 60);
    if (durationSeconds < 10) {
      durationSeconds = `0${durationSeconds}`;
    }

    const currentMinutes = Math.floor(currentTime / 60);
    let currentSeconds = Math.floor(currentTime % 60);
    if (currentSeconds < 10) {
      currentSeconds = `0${currentSeconds}`;
    }

    if (durationSeconds) {
      durationEl.textContent = `${durationMinutes}:${durationSeconds}`;
    }

    currentTimeEl.textContent = `${currentMinutes}:${currentSeconds}`;
  }

  function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    audio.currentTime = (clickX / width) * duration;
  }

  function setVolume() {
    audio.volume = volumeSlider.value;

    const volumeIcons = document.querySelectorAll(".volume-container i");

    if (audio.volume > 0.7) {
      volumeIcons[0].className = "fas fa-volume-down";
      volumeIcons[1].className = "fas fa-volume-up";
    } else if (audio.volume > 0.1) {
      volumeIcons[0].className = "fas fa-volume-down";
      volumeIcons[1].className = "fas fa-volume-down";
    } else {
      volumeIcons[0].className = "fas fa-volume-off";
      volumeIcons[1].className = "fas fa-volume-down";
    }

    if (audio.volume === 0) {
      volumeIcons[0].className = "fas fa-volume-mute";
      volumeIcons[1].className = "fas fa-volume-off";
    }
  }

  function addGenreButtons() {
    const popularGenres = ["Pop", "Rock", "Hip-Hop", "R&B", "Electronic"];
    const genreContainer = document.createElement("div");
    genreContainer.className = "genre-buttons";
    genreContainer.innerHTML = "<h4>Popular Genres</h4>";

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    popularGenres.forEach((genre) => {
      const button = document.createElement("button");
      button.className = "genre-btn";
      button.textContent = genre;
      button.addEventListener("click", () => {
        searchByGenre(genre);
        searchInput.value = `Genre: ${genre}`;
      });
      buttonContainer.appendChild(button);
    });

    genreContainer.appendChild(buttonContainer);

    const searchContainer = document.querySelector(".search-container");
    searchContainer.insertBefore(
      genreContainer,
      document.querySelector(".search-results")
    );
  }

  // Event Listeners
  playBtn.addEventListener("click", () => {
    isPlaying ? pauseSong() : playSong();
  });

  prevBtn.addEventListener("click", prevSong);
  nextBtn.addEventListener("click", nextSong);

  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("ended", nextSong);

  progressContainer.addEventListener("click", setProgress);
  volumeSlider.addEventListener("input", setVolume);

  // Search form submit
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query.length > 0) {
      if (query.toLowerCase().startsWith("genre:")) {
        const genre = query.substring(6).trim();
        searchByGenre(genre);
      } else {
        searchSongs(query);
      }

      tabButtons.forEach((btn) => {
        if (btn.getAttribute("data-tab") === "search-tab") {
          btn.click();
        }
      });
    }
  });

  document.addEventListener("keydown", (e) => {
    if (document.activeElement === searchInput) return;

    switch (e.key) {
      case " ":
        e.preventDefault();
        isPlaying ? pauseSong() : playSong();
        break;
      case "ArrowRight":
        audio.currentTime += 5;
        break;
      case "ArrowLeft":
        audio.currentTime -= 5;
        break;
      case "ArrowUp":
        volumeSlider.value = Math.min(parseFloat(volumeSlider.value) + 0.1, 1);
        setVolume();
        break;
      case "ArrowDown":
        volumeSlider.value = Math.max(parseFloat(volumeSlider.value) - 0.1, 0);
        setVolume();
        break;
    }
  });

  addGenreButtons();

  init();
});
