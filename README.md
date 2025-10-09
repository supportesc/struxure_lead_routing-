# Google Sheets Data Viewer

A Next.js application that displays data from Google Sheets in a beautiful, responsive table.

## Features

- 📊 Live data fetching from Google Sheets via Google Apps Script
- 🎨 Beautiful, modern UI with Tailwind CSS
- ♻️ Refresh button to reload data on demand
- 📱 Fully responsive design
- ⚡ Fast and efficient with TypeScript

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Development Server

```bash
npm run dev
```

### 3. Open Your Browser

Navigate to [http://localhost:3000](http://localhost:3000)

## How It Works

1. **Google Apps Script**: Your Google Sheet has a deployed web app that returns data as JSON
2. **Next.js API Route**: The `/api/sheet-data` endpoint fetches data from your Google Apps Script
3. **React Components**: The `DataTable` component displays the data in a beautiful table
4. **Live Updates**: Click "Refresh Data" to fetch the latest data from your sheet

## Project Structure

```
├── app/
│   ├── api/
│   │   └── sheet-data/
│   │       └── route.ts          # API endpoint to fetch Google Sheets data
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page component
├── components/
│   └── DataTable.tsx             # Reusable table component
└── .env.local                    # Environment variables (Google Script URL)
```

## Environment Variables

The Google Apps Script URL is stored in `.env.local`:

```
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

## Build for Production

```bash
npm run build
npm start
```

## Technologies Used

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Google Apps Script** - Data source


