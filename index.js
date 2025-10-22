import express from "express";
import crypto from "crypto";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const stringsDB = new Map(); // temporary in-memory DB

// Helper: analyze a string
function analyzeString(value) {
  const cleaned = value.toLowerCase().replace(/\s+/g, "");
  const reversed = cleaned.split("").reverse().join("");
  const is_palindrome = cleaned === reversed;
  const unique_characters = new Set(value).size;
  const word_count = value.trim().split(/\s+/).length;
  const sha256_hash = crypto.createHash("sha256").update(value).digest("hex");

  const character_frequency_map = {};
  for (const char of value) {
    character_frequency_map[char] = (character_frequency_map[char] || 0) + 1;
  }

  return {
    length: value.length,
    is_palindrome,
    unique_characters,
    word_count,
    sha256_hash,
    character_frequency_map,
  };
}

// POST /strings → Create/Analyze
app.post("/strings", (req, res) => {
  const { value } = req.body;

  if (typeof value !== "string") {
    return res.status(422).json({ error: "Value must be a string" });
  }
  if (!value.trim()) {
    return res.status(400).json({ error: "Missing 'value' field" });
  }

  const properties = analyzeString(value);

  if (stringsDB.has(properties.sha256_hash)) {
    return res.status(409).json({ error: "String already exists" });
  }

  const data = {
    id: properties.sha256_hash,
    value,
    properties,
    created_at: new Date().toISOString(),
  };

  stringsDB.set(properties.sha256_hash, data);

  res.status(201).json(data);
});

// GET /strings/:value → Get Specific String
app.get("/strings/:value", (req, res) => {
  const { value } = req.params;
  const hash = crypto.createHash("sha256").update(value).digest("hex");

  if (!stringsDB.has(hash)) {
    return res.status(404).json({ error: "String not found" });
  }

  res.json(stringsDB.get(hash));
});

// GET /strings (filtering)
app.get("/strings", (req, res) => {
  let results = Array.from(stringsDB.values());

  const {
    is_palindrome,
    min_length,
    max_length,
    word_count,
    contains_character,
  } = req.query;

  try {
    if (is_palindrome !== undefined) {
      const boolVal =
        is_palindrome === "true"
          ? true
          : is_palindrome === "false"
          ? false
          : null;
      if (boolVal === null)
        return res.status(400).json({ error: "Invalid is_palindrome value" });
      results = results.filter(
        (item) => item.properties.is_palindrome === boolVal
      );
    }

    if (min_length !== undefined) {
      const min = parseInt(min_length);
      if (isNaN(min))
        return res.status(400).json({ error: "min_length must be integer" });
      results = results.filter((item) => item.properties.length >= min);
    }

    if (max_length !== undefined) {
      const max = parseInt(max_length);
      if (isNaN(max))
        return res.status(400).json({ error: "max_length must be integer" });
      results = results.filter((item) => item.properties.length <= max);
    }

    if (word_count !== undefined) {
      const wc = parseInt(word_count);
      if (isNaN(wc))
        return res.status(400).json({ error: "word_count must be integer" });
      results = results.filter((item) => item.properties.word_count === wc);
    }

    if (contains_character !== undefined) {
      const char = contains_character;
      if (char.length !== 1)
        return res
          .status(400)
          .json({ error: "contains_character must be a single character" });
      results = results.filter((item) => item.value.includes(char));
    }

    return res.status(200).json({
      data: results,
      count: results.length,
      filters_applied: {
        ...(is_palindrome !== undefined && { is_palindrome }),
        ...(min_length !== undefined && { min_length }),
        ...(max_length !== undefined && { max_length }),
        ...(word_count !== undefined && { word_count }),
        ...(contains_character !== undefined && { contains_character }),
      },
    });
  } catch (err) {
    res.status(400).json({ error: "Invalid query parameter(s)" });
  }
});

// GET /strings/filter-by-natural-language
app.get("/strings/filter-by-natural-language", (req, res) => {
  const { query } = req.query;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query is required" });
  }

  const lowerQuery = query.toLowerCase();
  let filters = {};

  // Simple natural language parsing
  try {
    if (lowerQuery.includes("palindromic")) {
      filters.is_palindrome = true;
    }
    if (lowerQuery.includes("longer than")) {
      const match = lowerQuery.match(/longer than (\d+)/);
      if (match) filters.min_length = parseInt(match[1]) + 1;
    }
    if (lowerQuery.includes("single word") || lowerQuery.includes("one word")) {
      filters.word_count = 1;
    }
    if (lowerQuery.includes("containing the letter")) {
      const match = lowerQuery.match(/containing the letter (\w)/);
      if (match) filters.contains_character = match[1];
    }
    if (lowerQuery.includes("containing the first vowel")) {
      filters.contains_character = "a"; // simple heuristic
    }

    // Apply filters manually using the previous logic
    let results = Array.from(stringsDB.values());

    if (filters.is_palindrome !== undefined) {
      results = results.filter(
        (item) => item.properties.is_palindrome === filters.is_palindrome
      );
    }
    if (filters.min_length !== undefined) {
      results = results.filter(
        (item) => item.properties.length >= filters.min_length
      );
    }
    if (filters.word_count !== undefined) {
      results = results.filter(
        (item) => item.properties.word_count === filters.word_count
      );
    }
    if (filters.contains_character !== undefined) {
      results = results.filter((item) =>
        item.value.includes(filters.contains_character)
      );
    }

    if (Object.keys(filters).length === 0) {
      return res
        .status(400)
        .json({ error: "Unable to parse natural language query" });
    }

    res.status(200).json({
      data: results,
      count: results.length,
      interpreted_query: {
        original: query,
        parsed_filters: filters,
      },
    });
  } catch (err) {
    res
      .status(422)
      .json({ error: "Query parsed but resulted in conflicting filters" });
  }
});


// DELETE /strings/:value → Delete
app.delete("/strings/:value", (req, res) => {
  const { value } = req.params;
  const hash = crypto.createHash("sha256").update(value).digest("hex");

  if (!stringsDB.has(hash)) {
    return res.status(404).json({ error: "String not found" });
  }

  stringsDB.delete(hash);
  res.status(204).send();
});

// Base route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to String Analyzer API" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
