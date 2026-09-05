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
  - Regular visitors to your GitHub Pages site **only see your clean portfolio** with all edit controls hidden.
  - You can open Owner Mode anytime by pressing **`Ctrl + Alt + E`** (or visiting with `?edit=1`), or clicking the discrete **"🔒 Owner Access"** button in the footer.
  - Since GitHub Pages is static, changes made in a browser cannot alter your GitHub repository directly. You can update values in the browser, download `works.js`, or edit `data/works.js` directly in your code editor and commit it.
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
2. Replace [`data/works.js`](file:///c:/Users/Egor/.gemini/antigravity/scratch/portfolio_rend/data/works.js) with your downloaded file.
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
  file: "images/001_Mayekawa_Sauna_01.jpg",
  dcc: "3ds Max",              // e.g. Blender, 3ds Max, Maya, Houdini, Cinema 4D
  renderer: "Corona",          // e.g. Corona, Cycles, Arnold, V-Ray, Octane, Redshift
  category: "Archviz",         // e.g. Archviz, Product, Hard Surface, Concept Art
  year: "2024",
  description: "Architectural visualization of the Mayekawa luxury sauna suite..."
}
```

Simply change the strings to whatever you like.

---

## 🖼️ Adding New Images

1. Drop your new image file into the `images/` folder (e.g. `images/my_new_render.png`).
2. Add a new entry to `data/works.js` with its filename:
   ```javascript
   {
     id: "023",
     name: "My New Render",
     file: "images/my_new_render.png",
     dcc: "Blender",
     renderer: "Cycles",
     category: "Hard Surface",
     year: "2024",
     description: "Description of the new piece."
   }
   ```
   *(Or click **"Edit Metadata"** → **"+ Add New Image"** right in your browser!)*

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
│   └── works.js          # All 22 projects with Name, DCC, and Renderer metadata
└── images/               # 22 artwork files
```
