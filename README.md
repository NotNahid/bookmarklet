# ⚡ JavaScript Bookmarklet Collection

A collection of powerful, browser-based automation tools for **Facebook, Instagram, Slack, and GitHub**. These scripts allow you to automate repetitive tasks, download media, and manage your social accounts directly from your browser—no extensions required.

## 🚀 How to Install

1.  **Copy the code** from the `.js` file you want to use.
2.  **Create a new bookmark** in your browser (Chrome/Edge/Firefox).
3.  **Name it** (e.g., "Insta Downloader").
4.  **Paste the code** into the **URL** (or Address) field.
5.  **Save** and click the bookmark while on the target website to activate.

---

## 🛠️ The Tools

### 📸 Instagram: Universal Media Downloader
**File:** `Instagram/Download_Image_&_Video.js`

A smart downloader that bypasses Instagram's restrictions.
* **Images:** Adds a ⬇ button to all posts (automatically grabs the highest resolution).
* **Videos:** Adds a 🎥 button that "sniffs" your network traffic to find the direct MP4 link, bypassing encrypted blob streams.
* **Live Interceptor:** Can detect video streams in real-time as you play them.

### 📘 Facebook: Auto Friend Request Sender
**File:** `Facebook/Bookmarklet_auto_send_friend_request.js`

Automates the process of finding and adding friends.
* **Auto-Scroll:** Automatically scrolls down to find new "Add Friend" buttons.
* **Safety Limits:** Set to stop after 50 requests (configurable) to prevent account bans.
* **Human-Like Delays:** Random wait times between clicks to avoid bot detection.

### 💬 Slack: Hover Message Deleter
**File:** `Slack/Hover_Delete.js`

Clean up your message history with speed.
* **UI:** Adds a floating "Hover Delete" toggle button.
* **Action:** When ON, simply hover your mouse over a message for 1.2 seconds to delete it automatically.
* **Draggable:** The button can be moved anywhere on the screen and stays within window bounds.

### 🐙 GitHub: Star Repo Utility
**File:** `Github/Star_repo.js`

* Quickly automate starring/unstarring actions (or other GitHub specific utilities).

---

## ⚠️ Disclaimer & Safety

**Use these scripts at your own risk.**

* **Rate Limits:** Social media platforms (especially Facebook and Instagram) have strict limits on how many actions you can perform in a short time. Using these tools too aggressively may result in temporary account restrictions.
* **Privacy:** These scripts run locally in your browser. No data is sent to external servers.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
