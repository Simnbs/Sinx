const queryInput = document.getElementById("query");
const limitInput = document.getElementById("limit");
const centerWord = document.getElementById("centerWord");
const status = document.getElementById("status");
const searchBtn = document.getElementById("searchBtn");
const spotlightSnippet = document.getElementById("spotlightSnippet");

const API_URL = "https://en.wikipedia.org/w/api.php";
let spotlightTimer;

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");

const buildSnippet = (extract, term) => {
  const lower = extract.toLowerCase();
  const index = lower.indexOf(term.toLowerCase());
  if (index === -1) return extract.slice(0, 220) + "...";

  const start = Math.max(index - 80, 0);
  const end = Math.min(index + 140, extract.length);
  return (start > 0 ? "..." : "") + extract.slice(start, end) + (end < extract.length ? "..." : "");
};

const setStatus = (message) => {
  status.textContent = message;
};

const setCenterWord = (term) => {
  centerWord.textContent = term || "Type a word";
};

const renderSpotlightLine = (snippet, term) => {
  const lowerSnippet = snippet.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const index = lowerSnippet.indexOf(lowerTerm);

  let leftText = "";
  let rightText = "";
  let word = term;

  if (index !== -1) {
    const leftRaw = snippet.slice(0, index).trim();
    const rightRaw = snippet.slice(index + term.length).trim();
    leftText = leftRaw.slice(Math.max(leftRaw.length - 50, 0));
    rightText = rightRaw.slice(0, 50);
    word = snippet.slice(index, index + term.length);
  }

  spotlightSnippet.innerHTML = `
    <div class="spotlight-line">
      <span class="spotlight-context spotlight-left">${escapeHtml(leftText)}</span>
      <span class="spotlight-word">${escapeHtml(word)}</span>
      <span class="spotlight-context spotlight-right">${escapeHtml(rightText)}</span>
    </div>
  `;
};

const startSpotlight = (items, term) => {
  if (spotlightTimer) {
    clearInterval(spotlightTimer);
  }

  if (!items.length) {
    spotlightSnippet.textContent = "Background clips will appear here once you scratch Wikipedia.";
    return;
  }

  let index = 0;
  const showClip = () => {
    const clip = items[index % items.length];
    renderSpotlightLine(clip.snippet, term);
    index += 1;
  };

  showClip();
  spotlightTimer = setInterval(showClip, 2600);
};

const fetchScratch = async (term, limit) => {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: term,
    srlimit: limit,
    format: "json",
    origin: "*",
  });

  const response = await fetch(`${API_URL}?${params.toString()}`);
  const data = await response.json();
  return data.query.search;
};

const fetchExtracts = async (titles) => {
  const params = new URLSearchParams({
    action: "query",
    prop: "extracts",
    exintro: "",
    explaintext: "",
    titles: titles.join("|"),
    format: "json",
    origin: "*",
  });

  const response = await fetch(`${API_URL}?${params.toString()}`);
  const data = await response.json();
  return Object.values(data.query.pages);
};

const handleSearch = async () => {
  const term = queryInput.value.trim();
  const limit = Math.min(Math.max(Number(limitInput.value) || 10, 3), 25);

  if (!term) {
    setStatus("Type a word to begin.");
    setCenterWord("");
    startSpotlight([], term);
    return;
  }

  setCenterWord(term);
  setStatus("Scratching Wikipedia...");

  try {
    const searchResults = await fetchScratch(term, limit);
    const titles = searchResults.map((result) => result.title);

    if (!titles.length) {
      setStatus("No results found.");
      return;
    }

    const pages = await fetchExtracts(titles);
    const items = pages
      .filter((page) => page.extract)
      .map((page) => {
        const snippet = buildSnippet(page.extract, term);
        return {
          snippet,
        };
      });

    startSpotlight(items, term);
    setStatus(`Scratched ${items.length} pages.`);
  } catch (error) {
    startSpotlight([], term);
    setStatus("Something went wrong while scratching.");
  }
};

searchBtn.addEventListener("click", handleSearch);
queryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleSearch();
  }
});
