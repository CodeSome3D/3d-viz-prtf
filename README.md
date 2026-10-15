# 3D CGI & Visualization Portfolio

A modern, high-aesthetic portfolio web application tailored for 3D artists, lighting artists, and architectural visualizers. Designed to run directly on **GitHub Pages** (or any static web host) with zero build steps or npm installations.

---

## ✨ Features

- **Custom Metadata Per Image**:
  - **DCC Tools** (multi-select supported!): *3ds Max*, *Blender*, *Cinema 4D*, *Autodesk Fusion*, *ZBrush*.
  - **Render Engines**: *Corona*, *Cycles*, *Redshift*.
  - **Category**: *Archviz*, *Product*, *Hard Surface*, *Concept Art*, *Automotive*.
  - **Year & Description**.
- **Clean Thumbnails**: Metadata badges appear cleanly underneath each thumbnail (no floating toast overlays obstructing your renders).
- **GitHub Pages Ready**: Zero build dependencies, pure HTML5, modern Vanilla CSS, and modular JavaScript. Uses relative paths so it functions immediately on `https://<username>.github.io/<repo>/`.
- **Owner Mode & Privacy**:
  - You can open Owner Mode anytime by pressing **`Ctrl + Alt + E`** (or visiting with `?edit=1`), or clicking the discrete **"🔒 Owner Access"** button in the footer.
  - Upon unlocking, the **"Edit Gallery"** button appears prominently in the navigation bar and controls toolbar, giving 1-click access to add artworks and reorder the gallery.
  - Since GitHub Pages is static, changes made in a browser cannot alter your GitHub repository directly. You can update values in the browser, download `works.js`, or commit directly with a GitHub token.
- **Interactive Lightbox Modal**: Native HTML `<dialog>` with backdrop blur, full-resolution display, dynamic image resolution calculation, zoom & pan controls, and keyboard navigation (Left/Right arrows, Escape).
- **Instant Filtering & Search**:
  - Filter chips by DCC tool (color-coded badges).
  - Filter chips by Render engine.
  - Live full-text search across project names, tools, renderers, and categories.
  - Sort by default, name (A-Z / Z-A), and newest year.
  - Layout toggle between dynamic **Masonry** flow and structured **Grid**.


---

## 🚀 How to Publish to GitHub Pages

1. **Push this repository to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial 3D portfolio release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub.
   - Click **Settings** → **Pages** (in the left sidebar).
   - Under **Build and deployment** → **Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` and folder `/ (root)`.
   - Click **Save**.
   - Your portfolio will be live at `https://<your-username>.github.io/<your-repo-name>/` in 1–2 minutes!

---

## 📝 How to Save & Publish Your Metadata Changes

Because GitHub Pages is a static host without a backend database:

### 1. Instant Browser Persistence (`localStorage`)
- Any change you make in the on-page editor and click **"Save Changes"** is **automatically saved to your browser** (`localStorage`).
- **Refreshing the page or reopening the browser will NOT lose your edits.**

### 2. Making Changes Live on GitHub Pages (for everyone):
Choose either option:

#### Option A: One-Click Direct GitHub Sync (Recommended)
1. In the **Metadata Inspector** modal, expand **"Direct GitHub Sync"**.
2. Enter your repository (`username/portfolio_rend`) and a GitHub Personal Access Token (with `repo` write permission).
3. Click **"Commit & Push to GitHub"**.
4. The site commits `data/works.js` directly to your GitHub repository! GitHub Pages will build and update automatically in ~60 seconds.

#### Option B: Download & Git Push
1. In the on-page editor, click **"Download works.js"** (or **"Copy Code"**).
2. Replace `data/works.js` with your downloaded file.
3. Commit and push:
   ```bash
   git add data/works.js
   git commit -m "Update portfolio metadata"
   git push
   ```

```javascript
{
  id: "001",
  name: "Mayekawa Sauna — Interior 01",
  file: "images/product_mayekawa-compressor_01.jpg",
  dcc: "3ds Max",              // e.g. Blender, 3ds Max, Maya, Houdini, Cinema 4D
  renderer: "Corona",          // e.g. Corona, Cycles, Arnold, V-Ray, Octane, Redshift
  category: "Archviz",         // e.g. Archviz, Product, Hard Surface, Concept Art
  year: "2024",
  description: "Architectural visualization of the Mayekawa luxury sauna suite..."
}
```

Simply change the strings to whatever you like.

---

---

## 🖼️ Adding & Reordering Images Freely

### 1. Flexible Filenames (No Numbering Required!)
You **do NOT need to number your image filenames** (e.g. `001_`, `002_`). You can name your files whatever you like:
- `images/product_mayekawa-compressor_03.jpg`
- `images/Studio_Ring_Showcase.png`
- `images/Coastal_Pavilion.jpg`

The order images appear in the gallery is determined **solely by their position in the array** in `data/works.js`, which can be reordered at any time!

### 2. In-Browser Visual Reordering (Owner Mode)
1. Unlock Owner Mode (`Ctrl + Alt + E` or click **"🔒 Owner Access"** in the footer) and click **"Edit Gallery"** in the header or toolbar.
2. In the Gallery Organizer, you can:
   - **Drag & Drop** any image card into any position.
   - Click **▲ Up**, **▼ Down**, **⤒ Top**, or **⤓ Bottom**.
   - Type an exact position number (e.g. type `3` to jump directly to 3rd place).
4. Changes update the live gallery immediately and save to your browser!
5. Click **"Download works.js"** or **"Commit & Push to GitHub"** to publish the new order live to GitHub Pages.

### 3. Adding an Image at Any Position
1. Save your image into the `images/` folder.
2. In the browser editor, click **"+ Add New Artwork"**.
3. Under **"Placement in Gallery"**, choose:
   - **At the beginning (1st item)**
   - **At specific position...** (e.g. Position #3)
   - **At the end (last item)**
4. Click **"Add to Portfolio Gallery"**! All IDs are automatically normalized sequentially.

---

## 📁 Project Structure

```
portfolio_rend/
├── index.html            # Core HTML structure & semantic layout
├── .nojekyll             # Ensures GitHub Pages serves all assets
├── README.md             # Documentation & deployment guide
├── css/
│   └── style.css         # Dark studio design system, animations & responsive layout
├── js/
│   ├── app.js            # Gallery renderer, filter logic, lightbox controller
│   └── editor.js         # Interactive metadata editor & export utility
├── data/
│   └── works.js          # All 30 projects with Name, DCC, and Renderer metadata
└── images/               # 30 artwork files
```
