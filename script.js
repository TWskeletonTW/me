document.addEventListener("DOMContentLoaded", () => {
  // Side panel tabs: 公告欄 / 動態 / 願望清單
  const tabButtons = document.querySelectorAll(".side-tab");
  const tabPanels = document.querySelectorAll(".tab-panel");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("aria-controls");
      tabButtons.forEach((b) => {
        const selected = b === btn;
        b.classList.toggle("is-active", selected);
        b.setAttribute("aria-selected", String(selected));
      });
      tabPanels.forEach((panel) => {
        panel.hidden = panel.id !== targetId;
      });
    });
  });

  // Auto-update year in footer
  const yearText = document.querySelector("footer p");
  if (yearText) {
    const year = new Date().getFullYear();
    yearText.textContent = `© ${year} 骷髏. All rights reserved.`;
  }

  // Typewriter effect with blinking caret — runs on every page load.
  // Pulls a random line from status-messages.json; falls back to the HTML text
  // if the file can't be fetched (e.g. opened via file://).
  const statusTextEl = document.querySelector(".status-text");
  const customStatus = document.querySelector(".custom-status");
  if (statusTextEl) {
    const fallback = statusTextEl.textContent.trim();
    let messages = [fallback];
    let lastIndex = -1;
    let startTimer = null;
    let typeTimer = null;

    // Split into grapheme clusters so emoji (flags, ZWJ sequences) never get
    // torn apart mid-typing. Falls back to code-point split on old browsers.
    const splitGraphemes = (str) => {
      if (typeof Intl !== "undefined" && Intl.Segmenter) {
        const seg = new Intl.Segmenter("zh", { granularity: "grapheme" });
        return Array.from(seg.segment(str), (s) => s.segment);
      }
      return Array.from(str);
    };

    const runTypewriter = (text, startDelay) => {
      clearTimeout(startTimer);
      clearInterval(typeTimer);
      const chars = splitGraphemes(text);
      statusTextEl.textContent = "";
      statusTextEl.classList.add("typing");
      let i = 0;
      startTimer = setTimeout(() => {
        typeTimer = setInterval(() => {
          i++;
          statusTextEl.textContent = chars.slice(0, i).join("");
          if (i >= chars.length) {
            clearInterval(typeTimer);
            setTimeout(() => statusTextEl.classList.remove("typing"), 800);
          }
        }, 100);
      }, startDelay);
    };

    const showRandom = (startDelay) => {
      let idx = Math.floor(Math.random() * messages.length);
      if (messages.length > 1 && idx === lastIndex) {
        idx = (idx + 1) % messages.length;
      }
      lastIndex = idx;
      const pick = messages[idx];
      // Strings are used as-is; legacy { emoji, text } objects are merged.
      const text = typeof pick === "string"
        ? pick
        : `${pick.emoji || ""}${pick.text || ""}`;
      runTypewriter(text || fallback, startDelay);
    };

    fetch("status-messages.json")
      .then((res) => res.json())
      .then((list) => {
        if (Array.isArray(list) && list.length) {
          messages = list;
        }
        showRandom(600);
      })
      .catch(() => runTypewriter(fallback, 600));

    if (customStatus) {
      customStatus.addEventListener("click", () => showRandom(150));
    }
  }

  // Typewriter for the about-me paragraph (preserves <br> line breaks)
  const aboutP = document.querySelector('section[aria-labelledby="about-title"] p');
  if (aboutP) {
    const originalHTML = aboutP.innerHTML.trim();
    // Tokenize: HTML tags (like <br>) are single units, other text typed char by char
    const tokens = [];
    let pos = 0;
    while (pos < originalHTML.length) {
      const tagMatch = originalHTML.slice(pos).match(/^<[^>]+>/);
      if (tagMatch) {
        tokens.push(tagMatch[0]);
        pos += tagMatch[0].length;
      } else {
        tokens.push(originalHTML[pos]);
        pos++;
      }
    }

    aboutP.innerHTML = "";
    let j = 0;
    setTimeout(() => {
      aboutP.classList.add("typing");
      const timer = setInterval(() => {
        aboutP.innerHTML = tokens.slice(0, ++j).join("");
        if (j >= tokens.length) {
          clearInterval(timer);
          setTimeout(() => aboutP.classList.remove("typing"), 800);
        }
      }, 20);
    }, 1000);
  }

  // Floating background orbs
  const orbs = [
    { size: 340, x: "8%",  y: "18%", color: "rgba(125, 211, 252, 0.055)", dur: "19s", delay: "0s"   },
    { size: 240, x: "78%", y: "55%", color: "rgba(167, 139, 250, 0.05)",  dur: "25s", delay: "-6s"  },
    { size: 180, x: "48%", y: "78%", color: "rgba(96, 165, 250, 0.065)",  dur: "22s", delay: "-11s" },
    { size: 140, x: "88%", y: "10%", color: "rgba(196, 181, 253, 0.045)", dur: "17s", delay: "-3s"  },
  ];

  orbs.forEach(({ size, x, y, color, dur, delay }) => {
    const el = document.createElement("div");
    el.className = "bg-orb";
    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${x};
      top: ${y};
      background: radial-gradient(circle, ${color}, transparent 70%);
      --orb-dur: ${dur};
      --orb-delay: ${delay};
    `;
    document.body.appendChild(el);
  });

  // 少女樂團派對 遊戲時間：以 2025-12-24 為第 1 天計算，每天 +1
  const gameTimeText = document.querySelector("#game-time-text");
  if (gameTimeText) {
    const start = new Date(2025, 11, 24);
    const now = new Date();
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const days = Math.floor((today - startDay) / 86400000) + 1;
    gameTimeText.textContent = `${days} 天`;
  }

  // Real audio playback for the decorative Apple Music card.
  const musicCard = document.querySelector(".music-card");
  const audio = document.querySelector("#music-player");
  const barFill = document.querySelector(".music-bar-fill");
  const timeTexts = document.querySelectorAll(".music-time");

  if (!musicCard || !audio || !barFill || timeTexts.length < 2) {
    return;
  }

  const currentTimeText = timeTexts[0];
  const durationText = timeTexts[1];

  const setPlayingState = () => {
    const playing = !audio.paused && !audio.ended;
    musicCard.classList.toggle("is-playing", playing);
    musicCard.setAttribute("aria-pressed", String(playing));
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) {
      return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainSeconds = Math.floor(seconds % 60);

    return `${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
  };

  const updateProgress = () => {
    const duration = audio.duration || 0;
    const current = audio.currentTime || 0;
    const percent = duration > 0 ? (current / duration) * 100 : 0;

    barFill.style.width = `${Math.min(percent, 100)}%`;
    currentTimeText.textContent = formatTime(current);
    durationText.textContent = formatTime(duration);
  };

  const toggleAudio = async () => {
    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
      setPlayingState();
    } catch (error) {
      console.warn("Audio playback was blocked:", error);
      setPlayingState();
    }
  };

  audio.addEventListener("loadedmetadata", updateProgress);
  audio.addEventListener("durationchange", updateProgress);
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("play", setPlayingState);
  audio.addEventListener("pause", setPlayingState);
  audio.addEventListener("ended", () => {
    updateProgress();
    setPlayingState();
  });

  musicCard.addEventListener("click", async (event) => {
    const clickedLink = event.target.closest("a");

    if (clickedLink) {
      return;
    }

    await toggleAudio();
  });

  musicCard.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const focusedLink = event.target.closest("a");
    if (focusedLink) {
      return;
    }

    event.preventDefault();
    await toggleAudio();
  });

  updateProgress();
  setPlayingState();
});