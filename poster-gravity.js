const s = (sketch) => {
  let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies;

  let engine, world;
  let words = [];
  let gravinputField,
    gravgenerateButton,
    gravdownloadButton,
    gravcharCounter,
    gravshareButton,
    gravtoastMessage,
    gravrefreshButton;
  let started = false;
  let lastMessage = "";
  let lastColors = {};

  // supabase
  const supabaseUrl = "https://cafvwneulpuypprppknp.supabase.co";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhZnZ3bmV1bHB1eXBwcnBwa25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjU5ODcsImV4cCI6MjA3Mjc0MTk4N30.m1jyJMdgg6o3MZZXanj0gNWQdmMVrhCy1y7scoLps_8";
  const supabase = supabase.createClient(supabaseUrl, supabaseKey);

  // --- NEW: Icon SVGs and state tracking variable ---
  let hasGeneratedOnce = false;

  const lightColors = ["#f1faee", "#a8dadc"];
  const darkColors = ["#e63946", "#457b9d", "#1d3557"];
  const lightTextColor = "#1d3557";
  const darkTextColor = "#f1faee";

  let backgroundColor, wordColor, textColor;

  sketch.setup = function () {
    let canvasWidth, canvasHeight;
    const aspectRatio = Math.sqrt(2);

    let viewportH = window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;
    let viewportW = window.visualViewport
      ? window.visualViewport.width
      : window.innerWidth;

    if (viewportW > viewportH) {
      canvasHeight = viewportH * 0.9;
      canvasWidth = canvasHeight / aspectRatio;
    } else {
      canvasWidth = viewportW * 0.9;
      canvasHeight = canvasWidth * aspectRatio;
    }

    let canvas = sketch.createCanvas(canvasWidth, canvasHeight);
    canvas.parent("grav-poster");
    engine = Engine.create();
    world = engine.world;
    Engine.run(engine);

    let ground = Bodies.rectangle(
      sketch.width / 2,
      sketch.height + 50,
      sketch.width,
      100,
      { isStatic: true }
    );
    let leftWall = Bodies.rectangle(
      -50,
      sketch.height / 2,
      100,
      sketch.height,
      { isStatic: true }
    );
    let rightWall = Bodies.rectangle(
      sketch.width + 50,
      sketch.height / 2,
      100,
      sketch.height,
      { isStatic: true }
    );
    World.add(world, [ground, leftWall, rightWall]);

    gravinputField = document.getElementById("grav-message");
    gravgenerateButton = document.getElementById("grav-generate-btn");
    gravrefreshButton = document.getElementById("grav-refresh-btn");
    gravdownloadButton = document.getElementById("grav-download-btn");
    gravcharCounter = document.getElementById("grav-char-counter");
    gravshareButton = document.getElementById("grav-share-btn");
    gravtoastMessage = document.getElementById("grav-toast-message");

    gravgenerateButton.addEventListener("click", generatePoster);
    gravrefreshButton.addEventListener("click", refreshPoster);
    gravdownloadButton.addEventListener("click", downloadPoster);
    gravshareButton.addEventListener("click", sharePoster);
    gravinputField.addEventListener("keypress", function (e) {
      if (e.key === "Enter") generatePoster();
    });

    // --- MODIFIED: Input listener ---
    gravinputField.addEventListener("input", function () {
      updateCharCount();
      updateButtonState();
      if (gravinputField.value.trim().length === 0) {
        hasGeneratedOnce = false; // Reset state
        gravshareButton.hidden = true;
      }
    });

    checkUrlAndLoadPoster();
    updateButtonState();

    function downloadPoster() {
      const filename = "katakata-gravity-poster";
      const fileExtension = "png";

      sketch.saveCanvas(filename, fileExtension);
    }
  };

  sketch.windowResized = function () {
    let canvasWidth, canvasHeight;
    const aspectRatio = Math.sqrt(2);

    let viewportH = window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;
    let viewportW = window.visualViewport
      ? window.visualViewport.width
      : window.innerWidth;

    if (viewportW > viewportH) {
      canvasHeight = viewportH * 0.9;
      canvasWidth = canvasHeight / aspectRatio;
    } else {
      canvasWidth = viewportW * 0.9;
      canvasHeight = canvasWidth * aspectRatio;
    }

    sketch.resizeCanvas(canvasWidth, canvasHeight);
    World.clear(world, false);
    let ground = Bodies.rectangle(
      sketch.width / 2,
      sketch.height + 50,
      sketch.width,
      100,
      { isStatic: true }
    );
    let leftWall = Bodies.rectangle(
      -50,
      sketch.height / 2,
      100,
      sketch.height,
      { isStatic: true }
    );
    let rightWall = Bodies.rectangle(
      sketch.width + 50,
      sketch.height / 2,
      100,
      sketch.height,
      { isStatic: true }
    );
    World.add(world, [ground, leftWall, rightWall]);
    if (lastMessage.length > 0) {
      createWords(lastMessage, lastColors);
    }
  };

  sketch.draw = function () {
    sketch.background(backgroundColor);

    if (started) {
      for (let w of words) {
        w.show(sketch);
      }
    }
  };

  function checkUrlAndLoadPoster() {
    if (!window.location.hash || window.location.hash.length <= 1) {
      loadDefaultPoster();
      return;
    }

    const rawHash = window.location.hash.substring(1);
    let posterData = null;

    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(rawHash);
      if (decompressed) {
        posterData = JSON.parse(decompressed);
      }
    } catch (e) {
      console.warn("LZString decompress failed, fallback:", e);
      try {
        const decoded = decodeURIComponent(escape(atob(rawHash)));
        if (decoded) posterData = JSON.parse(decoded);
      } catch (e) {
        try {
          const uriDecoded = decodeURIComponent(rawHash);
          posterData = JSON.parse(uriDecoded);
        } catch (e) {
          console.error("URL hash parsing failed:", e);
        }
      }
    }

    if (posterData && posterData.message && posterData.message.length > 0) {
      posterData.colors = posterData.colors || {};
      posterData.colors.backgroundColor =
        posterData.colors.backgroundColor || "#f1faee";
      posterData.colors.wordColor = posterData.colors.wordColor || "#1d3557";
      posterData.colors.textColor = posterData.colors.textColor || "#f1faee";

      lastMessage = posterData.message;
      lastColors = posterData.colors;

      // add shared message to the input field
      gravinputField.value = posterData.message;

      updateCharCount();
      updateButtonState();

      hasGeneratedOnce = true;

      createWords(lastMessage, lastColors);
      started = true;
      if (typeof gravinputPanel !== "undefined" && gravinputPanel)
        gravinputPanel.style.display = "none";
      if (typeof gravshareButton !== "undefined" && gravshareButton)
        gravshareButton.hidden = false;
    } else {
      console.warn(
        "No valid poster data found in URL; loading default poster."
      );
      loadDefaultPoster();
    }
  }

  function loadDefaultPoster() {
    lastMessage = "1% better, setiap hari";
    setHighContrastColors();
    createWords(lastMessage, lastColors);
    started = true;
  }

  function updateCharCount() {
    gravcharCounter.textContent = `${gravinputField.value.length}/140`;
  }

  function updateButtonState() {
    gravgenerateButton.hidden = gravinputField.value.trim().length === 0;
  }

  function deleteMessage() {
    gravinputField.value = "";
    updateCharCount();
    updateButtonState();
  }

  // --- MODIFIED: generatePoster function ---
  function generatePoster() {
    lastMessage = gravinputField.value.trim();
    if (lastMessage.length === 0) return;

    setHighContrastColors();
    createWords(lastMessage, lastColors);
    started = true;
    updateCharCount();
    updateButtonState();
    gravshareButton.hidden = false;

    // Change icon to refresh and set state
    if (!hasGeneratedOnce) {
      hasGeneratedOnce = true;
    }
  }

  function refreshPoster() {
    if (lastMessage.length > 0) {
      setHighContrastColors();
      createWords(lastMessage, lastColors);
      started = true;
    }
  }

  function downloadPoster() {
    // You can name the file whatever you want
    const filename = "katakata-poster";
    // Choose your desired file format (e.g., 'png', 'jpg')
    const fileExtension = "png";

    // The p5.js function that saves the canvas content
    sketch.saveCanvas(filename, fileExtension);
  }

  function sharePoster() {
    console.log("function -> sharePoster");

    if (!lastMessage || lastMessage.length === 0) {
      showToast("Oops, kena generate poster dulu then boleh share 👍");
      return;
    }

    const data = {
      message: lastMessage,
      colors: lastColors,
    };
    const jsonString = JSON.stringify(data);

    const encodedData = LZString.compressToEncodedURIComponent(jsonString);
    const shareUrl =
      window.location.origin + window.location.pathname + "#" + encodedData;

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        showSuccessOverlay();
        showToast("Link dah copy, boleh paste & share 🚀");

        // Now store the message in Supabase
        console.log("function -> sharePoster -> saveMessageToSupabase ");
        saveMessageToSupabase(data);
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
        showToast("Alamak… link tak berjaya dicopy 😅 Cuba lagi.");
      });
  }

  // Function to store the message in Supabase
  async function saveMessageToSupabase(data) {
    console.log("function -> saveMessageToSupabase");
    try {
      // Insert message data into Supabase
      const { error } = await supabase
        .from("poster_messages") // Make sure your table is named 'poster_messages'
        .insert([
          {
            message: data.message,
            // colors: data.colors || "", // Save colors if they exist
          },
        ]);

      if (error) {
        throw error;
      }

      console.log("Message successfully saved to Supabase!");
    } catch (error) {
      console.error("Error saving message to Supabase:", error);
      showToast("Alamak… something went wrong with saving your message 😅");
    }
  }
  function showSuccessOverlay() {
    const overlay = document.getElementById("grav-success-overlay");
    const anim = document.getElementById("grav-success-lottie");

    overlay.classList.remove("hide");
    overlay.classList.add("show");

    overlay.style.display = "flex";
    anim.seek(0);
    anim.play();
    setTimeout(() => {
      overlay.classList.remove("show");
      overlay.classList.add("hide");
    }, 4000);
  }

  function showToast(message) {
    gravtoastMessage.textContent = message;
    gravtoastMessage.classList.add("show");
    setTimeout(() => {
      gravtoastMessage.classList.remove("show");
    }, 4000);
  }

  function setHighContrastColors() {
    const pick = (arr) => arr[sketch.floor(sketch.random(arr.length))];

    const isLightTheme = sketch.random() > 0.5;
    if (isLightTheme) {
      backgroundColor = pick(lightColors);
      wordColor = pick(darkColors);
      textColor = darkTextColor;
    } else {
      backgroundColor = pick(darkColors);
      wordColor = pick(lightColors);
      textColor = lightTextColor;
    }
    lastColors = {
      backgroundColor: backgroundColor,
      wordColor: wordColor,
      textColor: textColor,
    };
  }

  function calculateFontSize(parts) {
    const diagonal = sketch.sqrt(
      sketch.width * sketch.width + sketch.height * sketch.height
    );
    let baseFontSize = diagonal * 0.1;

    const longestWord = parts.reduce(
      (a, b) => (a.length > b.length ? a : b),
      ""
    );
    sketch.textSize(baseFontSize);
    const longestWidth = sketch.textWidth(longestWord);

    let adjusted = baseFontSize;
    if (longestWidth > sketch.width * 0.9) {
      adjusted *= (sketch.width * 0.9) / longestWidth;
    }

    const numWords = parts.length;
    const maxWordsForScaling = 25;
    let scalingFactor = 1.0;

    if (numWords > 1) {
      const normalizedWordCount =
        sketch.min(numWords, maxWordsForScaling) / maxWordsForScaling;
      scalingFactor = sketch.pow(1 - normalizedWordCount, 0.4);
    }
    adjusted *= scalingFactor;

    const minSize = sketch.height * 0.05;
    adjusted = sketch.max(adjusted, minSize);

    return adjusted;
  }

  function createWords(msg, colors) {
    if (words.length > 0) {
      for (let i = 0; i < words.length; i++) {
        World.remove(world, words[i].body);
      }
    }
    words = [];

    backgroundColor = colors.backgroundColor;
    wordColor = colors.wordColor;
    textColor = colors.textColor;

    const processedMsg = msg.replace(/([.,!?;:])(?=\S)/g, "$1 ");
    let parts = processedMsg.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return;

    if (parts.length > 7) {
      let mergedParts = [];
      let i = 0;
      while (i < parts.length) {
        const shouldMerge = sketch.random() < 0.5;
        if (shouldMerge && i + 1 < parts.length) {
          const mergedText = parts[i] + " " + parts[i + 1];
          sketch.textSize(calculateFontSize(parts));
          if (sketch.textWidth(mergedText) < sketch.width * 0.6) {
            mergedParts.push(mergedText);
            i += 2;
          } else {
            mergedParts.push(parts[i]);
            i += 1;
          }
        } else {
          mergedParts.push(parts[i]);
          i += 1;
        }
      }
      parts = mergedParts;
    }

    parts = parts.map((word) => word.toUpperCase());

    let adjustedFontSize = calculateFontSize(parts);

    parts.reverse().forEach((w, i) => {
      let x = sketch.width / 2 + sketch.random(-50, 50);
      let y = -200 - i * (adjustedFontSize * 1.5);
      words.push(new Word(w, x, y, adjustedFontSize, wordColor, textColor));
    });
  }

  class Word {
    constructor(word, x, y, fontSize, color, textColor) {
      this.word = word;
      this.fontSize = fontSize;
      this.color = color;
      this.textColor = textColor;

      sketch.textSize(this.fontSize);
      this.textWidth = sketch.textWidth(word);

      const visualPaddingX = 30;
      const visualPaddingY = 10;
      const physicsPadding = 4;

      const blockWidth = this.textWidth + visualPaddingX + physicsPadding;
      const blockHeight = this.fontSize + visualPaddingY + physicsPadding;

      this.body = Bodies.rectangle(x, y, blockWidth, blockHeight, {
        restitution: 0.05,
        friction: 0.35,
        angle: sketch.random(-sketch.PI / 4, sketch.PI / 4),
      });
      World.add(world, this.body);
    }

    show() {
      let pos = this.body.position;
      this.body.angle = sketch.constrain(
        this.body.angle,
        -sketch.PI / 4,
        sketch.PI / 4
      );
      let angle = this.body.angle;

      sketch.push();
      sketch.translate(pos.x, pos.y);
      sketch.rotate(angle);

      sketch.rectMode(sketch.CENTER);
      sketch.noStroke();
      sketch.fill(this.color);

      const visualPaddingX = 30;
      const visualPaddingY = 10;
      sketch.rect(
        0,
        0,
        this.textWidth + visualPaddingX,
        this.fontSize + visualPaddingY
      );

      sketch.fill(this.textColor);

      // Set both horizontal and vertical alignment to CENTER
      sketch.textAlign(sketch.CENTER, sketch.CENTER);

      // Define different offsets for desktop and mobile
      let verticalOffset;
      if (window.innerWidth <= 768) {
        // Offset for mobile devices
        verticalOffset = 1; // Adjust this value to get perfect centering on mobile
      } else {
        // Offset for desktop devices
        verticalOffset = 7; // Adjust this value to get perfect centering on desktop
      }

      // Draw the text with the conditional vertical offset
      sketch.text(this.word, 0, verticalOffset);

      sketch.pop();
    }
  }
};

let myp5 = new p5(s);
