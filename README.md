# hng13-stage1Task
Built a RESTful API service that analyzes strings and stores their computed properties
Stage 1 – String Analyzer API
A RESTful API that analyzes strings and provides computed properties like length, palindrome status, word count, and more — with advanced and natural language filtering.
Base URL - https://<your-app-domain>.railway.app // To be deployed and submitted
Endpoints
1. POST /strings
Analyze and store a string.
Body:
{ "value": "madam level civic" }
Response:
{
  "id": "hash_value",
  "value": "madam level civic",
  "properties": {
    "length": 17,
    "is_palindrome": false,
    "unique_characters": 10,
    "word_count": 3,
    "sha256_hash": "hash_value",
    "character_frequency_map": { "m":2, "a":2, "d":1, ... }
  },
  "created_at": "2025-10-20T09:00:00Z"
}

2. GET /strings/:value
Get details for a specific string.
Example:
/strings/madam

3. GET /strings
Get all strings with optional filters.
Example:
/strings?is_palindrome=true&min_length=3&contains_character=a

4. GET /strings/filter-by-natural-language
Filter strings using plain English.
Example:
/strings/filter-by-natural-language?query=all%20single%20word%20palindromic%20strings

5. DELETE /strings/:value
Delete a stored string.
Example:
/strings/madam

Run Locally
git clone https://github.com/<your-username>/backend-wizards-stage1.git
cd backend-wizards-stage1
npm install
npm start

Server runs on http://localhost:5000.

Tech Stack

Node.js
Express.js
Crypto (SHA-256)
JavaScript (ES6)
