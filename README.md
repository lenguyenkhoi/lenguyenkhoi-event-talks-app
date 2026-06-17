# BigQuery Release Notes Tracker

A modern, responsive web dashboard built with **Python Flask** and **vanilla HTML, JavaScript, and CSS** to track, filter, and share Google Cloud BigQuery Release Notes.

## 🚀 Features

- **Live XML Feed Fetching**: Fetches and parses the live BigQuery release notes Atom feed directly from Google Cloud Platform.
- **Dynamic Category Filtering**: Tag-filtered views for quick navigation (Features, Announcements, Deprecations, and Others) alongside keyword search.
- **Glassmorphic UI**: Vibrant dark mode dashboard featuring smooth micro-animations, skeleton loaders, and responsive layouts.
- **Twitter / X Web Intent Composer**:
  - Automatically loads the chosen release note into a custom tweet preview panel.
  - **Punchy Tech Format**: Uses smart client-side heuristics to summarize release updates into compact tweets.
  - **SVG Circular Progress**: Visual circular progress bar dynamically warning you as you approach the 280-character limit.
  - **Hashtags Helper**: Pre-populate developer hashtags like `#BigQuery #GoogleCloud` with one click.
  - Integrated copy-to-clipboard and posting options.

## 📂 Project Structure

```text
├── app.py                  # Flask Application & XML Parser
├── static/
│   ├── css/
│   │   └── style.css       # Visual Design (Dark Theme, Cards, Badges)
│   └── js/
│       └── main.js         # API Fetching, Filters, Composer, and Progress Circle
├── templates/
│   └── index.html          # Semantic HTML5 Layout
└── README.md               # Documentation
```

## 🛠️ Getting Started

### Prerequisites
- Python 3.10+
- Flask & Werkzeug

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/lenguyenkhoi/lenguyenkhoi-event-talks-app.git
   cd lenguyenkhoi-event-talks-app
   ```

2. Install the required dependencies:
   ```bash
   pip install -U Flask Werkzeug
   ```

3. Run the development server:
   ```bash
   python app.py
   ```

4. Open your browser and navigate to:
   👉 **http://127.0.0.1:5000**
