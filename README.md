# Bookmarklet Studio

A polished, open-source collection of browser bookmarklets for automation, productivity, web research, and developer workflows.

[![Launch Bookmarklet Studio](https://img.shields.io/badge/Launch_Bookmarklet_Studio-0a84ff?style=for-the-badge&logo=googlechrome&logoColor=white)](https://notnahid.github.io/bookmarklet/)
[![License: MIT](https://img.shields.io/badge/License-MIT-111827?style=for-the-badge)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/NotNahid/bookmarklet?style=for-the-badge&color=f59e0b)](https://github.com/NotNahid/bookmarklet/stargazers)

![Bookmarklet Studio preview](https://github.com/user-attachments/assets/57ecf6e6-2c72-4a88-8206-248765245c0f)
![Bookmarklet Studio Demo](https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGlpamF1NmpqazBoOGljYWt6dHd4eW1iY3F6ZjhjaGQzcm85MjlwcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/dHcxGGEBYsqLzHtEQv/giphy.gif)
<img width="1920" height="958" alt="image" src="https://github.com/user-attachments/assets/57ecf6e6-2c72-4a88-8206-248765245c0f" />
## Overview

Bookmarklet Studio turns a folder of JavaScript files into a searchable browser-based library. Open the gallery, find a tool, and drag its blue action button to your bookmarks bar. The resulting bookmarklet runs on the page you are currently viewing.

The collection currently includes **33 bookmarklets** across categories such as:

- General browser automation
- Facebook, Instagram, Pinterest, Slack, and YouTube workflows
- OSINT and web research
- Webpage and DOM utilities
- GitHub and CRM productivity
- Daraz and commerce helpers
- Medium publishing tools

## Features

### Bookmarklet library

- Search across bookmarklet names and categories
- Filter by category
- Sort by featured order, alphabetically, recently used, or favorites
- Save favorites locally in the browser
- Inspect source code before using a tool
- Copy bookmarklet source to the clipboard

### Polished interface

- Light, dark, and system theme modes
- Responsive layout for desktop and mobile
- Minimize/restore window behavior
- Restore dock with tooltip and keyboard focus support
- Drag-state highlighting and a clear bookmarks-bar instruction
- First-visit onboarding message
- Reduced-motion support
- Keyboard shortcuts and accessible labels

### Discoverability and deployment

- Crawler-visible `<noscript>` content for the public bookmarklet list
- Canonical URL, Open Graph, Twitter Card, and JSON-LD metadata
- `robots.txt` and `sitemap.xml`
- Web app manifest
- Static hosting with no backend required

## Quick start

### Use the hosted gallery

1. Open the **[Bookmarklet Studio](https://notnahid.github.io/bookmarklet/)**.
2. Show your browser bookmarks bar if needed:
   - Windows/Linux: `Ctrl + Shift + B`
   - macOS: `Cmd + Shift + B`
3. Find a bookmarklet and drag its blue action button to the bookmarks bar.
4. Open a supported page and click the saved bookmarklet.

On mobile browsers, use the browser's bookmark workflow instead of drag-and-drop. The gallery displays a mobile-specific hint when opened on a small screen.

### Run locally

Clone the repository and start a static server:

```bash
git clone https://github.com/NotNahid/bookmarklet.git
cd bookmarklet
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

A static server is recommended because browser security policies can behave differently when opening `index.html` directly from `file://`.

## Add a bookmarklet

1. Add a JavaScript file to the appropriate category folder, for example:

   ```text
   Webpage/My New Tool.js
   ```

2. Keep the file as ordinary JavaScript. The generator wraps non-self-contained files in an IIFE and URL-encodes them as a bookmarklet.
3. Regenerate the gallery:

   ```bash
   python3 generate_gallery.py
   ```

4. Preview the result locally and test the bookmarklet on a safe test page.
5. Commit the source file and regenerated `index.html` together.

### Source file notes

The generator supports both:

- Plain JavaScript source files
- Existing `javascript:` bookmarklets, which are decoded once before being rebuilt

Tampermonkey userscripts containing `==UserScript==` are skipped because they are not directly usable as bookmarklets.

Large bookmarklets may exceed browser URL limits. The generator warns when a generated bookmarklet is larger than approximately 32 KB; Firefox and Safari may truncate very large bookmark URLs.

## Repository layout

```text
.
├── index.html                 # Generated static gallery and interactive UI
├── generate_gallery.py        # Reads category folders and generates index.html
├── robots.txt                 # Search crawler policy
├── sitemap.xml                # Public URL sitemap
├── site.webmanifest           # Web app metadata
├── LICENSE                    # MIT license
├── README.md
├── CRM/                       # CRM helpers
├── Daraz/                     # Commerce helpers
├── Facebook/                  # Facebook tools
├── Github/                    # GitHub tools
├── Instagram/                 # Instagram tools
├── Medium/                    # Medium tools
├── OSINT/                     # Research and OSINT tools
├── Pinterest/                 # Pinterest tools
├── Slack/                     # Slack tools
├── Web in General/            # General web utilities
├── Webpage/                   # Current-page utilities
└── YouTube/                   # YouTube tools
```

`index.html` is the distributable site. `generate_gallery.py` contains the gallery template and data-generation logic. If you change the generated UI itself, update the template in `generate_gallery.py` so future regenerations do not overwrite your changes.

## Safety and responsible use

Bookmarklets run with the permissions available to the page where they are launched. Depending on the tool, a bookmarklet may automate actions, read visible page content, or modify the current page.

- Review the source before installing or running a bookmarklet.
- Test unfamiliar tools on a non-production account or test page.
- Do not use automation to spam, evade platform limits, bypass access controls, or violate a website's Terms of Service.
- Respect privacy, consent, copyright, and applicable laws when collecting or processing data.
- Never paste secrets, passwords, API keys, or private tokens into a bookmarklet unless you fully understand the code.
- Treat copied bookmarklet URLs as executable code and only use sources you trust.

For sensitive categories, Bookmarklet Studio displays an additional confirmation before first use in a browser profile.

## SEO and public deployment

The public page is configured for the GitHub Pages URL:

```text
https://notnahid.github.io/bookmarklet/
```

If you deploy to another domain, update the following consistently:

- The canonical URL in `index.html`
- `og:url` and structured data in `index.html`
- The sitemap URL in `robots.txt`
- The `<loc>` value in `sitemap.xml`
- The `start_url` in `site.webmanifest`

The site is static and can be deployed to GitHub Pages, Netlify, Cloudflare Pages, Vercel static hosting, or any web server that serves HTML, CSS, JavaScript, and XML files.

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a focused branch:

   ```bash
   git checkout -b add-my-bookmarklet
   ```

3. Add or improve a source file in the correct category.
4. Regenerate and test the gallery.
5. Review the generated source and confirm the bookmarklet works as intended.
6. Commit your changes and open a pull request.

Please keep pull requests focused, explain what a tool does, and include any platform limitations or permissions it requires.

## License

This project is distributed under the [MIT License](LICENSE).

Copyright © 2026 Bookmarklet Studio.
