# Privacy Policy – WebSyncSpace

_Last updated: September 2025_

WebSyncSpace is a Chrome extension that enables real-time co-navigation through the sharing of browser tabs using WebRTC. Your privacy is very important to us. This Privacy Policy explains what information is collected, how it is used, and how it is protected when you use the WebSyncSpace extension.

---

## 1. Information We Collect

### 1.1. Session Codes

- WebSyncSpace generates a **session code** when the host starts a sharing session.
- This code is stored temporarily in **Firebase Realtime Database** for the purpose of connecting clients to the correct session.
- The session code does **not contain any personal information** or browsing history.

### 1.2. Local Storage

- The extension may use the Chrome **storage API** to remember small technical preferences such as:
  - Whether you are acting as a host or client.
  - The last session code you entered.
- This data remains **on your device** and is not transmitted to external servers.

### 1.3. WebRTC Media Streams

- When you share a tab, WebSyncSpace uses **WebRTC** to capture the audio/video of the selected tab.
- This media stream is sent **directly peer-to-peer** to the clients connected to your session.
- The media is **not stored** or transmitted through our servers.

---

## 2. How We Use Information

- Session codes are used **only** for session discovery and signaling.
- Local storage is used to **improve user experience** (e.g., avoid re-entering codes).
- Audio and video streams are used **exclusively** to allow co-navigation in real time.

---

## 3. Sharing of Information

- WebSyncSpace does **not sell, rent, or share** any user data with third parties.
- Firebase is used **only as a signaling service**. All data is kept minimal and temporary.
- Once a session ends, the corresponding session code is not considered.

---

## 4. Data Security

- All communications with Firebase are transmitted over **encrypted TLS connections**.
- Session codes are random and short-lived, minimizing the risk of misuse.
- Audio/video streams are handled entirely by **WebRTC**, which uses end-to-end encryption for transmission.

---

## 5. Data Retention

- Session codes are **temporary** and automatically removed once sessions end.
- No permanent logs of your activity are stored in Firebase.
- Local storage on your device can be cleared at any time by removing the extension or clearing Chrome site data.

---

## 6. User Control

- You always control when sharing starts and stops.
- You decide which tab to share.
- You can end a session at any time, which immediately stops the media stream.

---

## 7. Permissions Justification

- **tabCapture**: required to capture the content of the tab you select.
- **tabs**: required to identify and select the active tab for sharing.
- **scripting**: required to inject necessary scripts to initialize WebRTC.
- **storage**: required to store small technical preferences (session code, role).
- **host_permissions**: required so that the extension can operate on the tab chosen by the user.

---

## 8. Children’s Privacy

- WebSyncSpace is **not directed at children under 13**.
- We do not knowingly collect any information from children.

---

## 9. Changes to this Policy

We may update this Privacy Policy from time to time. Updates will be reflected with a new "Last updated" date at the top of this document.

---

## 10. Contact

If you have any questions about this Privacy Policy, please contact us:

**Email:** [kouakougeorgio04@gmail.com]
