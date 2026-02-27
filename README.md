# Threejs Scrapbook
A web-based application where users can upload, view, and share their favorite photos in an interactive photo album. This project combines Three.js for 3D rendering, Supabase for cloud storage and data persistence and Vercel for deployment.

Live @[Threejs Scrapbook](https://threejs-scrapbook.vercel.app/)

## Core Features

### `Interactive 3D Experience`
- Realistic book and page-flipping animations
- Front cover, back cover, and individual page transitions
- Dynamic scaling for desktop and mobile orientations

### `Photo Upload & Optimization`
- Multi-image upload
- Client-side image compression before upload
- Automatic texture mapping onto 3D pages
- Smart cropping behavior

### `Persistent & Shareable Scrapbooks`
- Images stored in Supabase Storage
- Scrapbook metadata saved in database
- Unique shareable URL per scrapbook
- Clipboard copy functionality with visual feedback

### `Responsive Design`
- Adapts to portrait and landscape layouts
- Mobile-friendly control positioning
- Scales 3D book relative to screen size

## Tech Stack
- **Frontend:** Three.js, JavaScript, CSS3, HTML5
- **Backend & Storage:** Supabase (PostgreSQL + Storage)
- **Hosting Platform:** Vercel

## Quick Start
1. Clone and install dependencies:
```
git clone https://github.com/ivana-koceva/threejs-scrapbook.git
cd threejs-scrapbook
npm install
```
2. Add environment variables:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
```
3. Start development server:
```
npm run dev
```
