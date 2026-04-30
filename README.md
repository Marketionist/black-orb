# Black Orb

Black Orb is a lightweight and anonymous stock price tracking dashboard.
It does not require any credentials or logging in - just add stock tickers and
start tracking them. It offers a beautifully designed interface with
glassmorphism and a premium dark mode aesthetic. Real-time stock data is
seamlessly fetched using the Yahoo Finance API via IPC to bypass browser CORS
constraints, providing accurate, reliable market data.

## Features

- **Anonymous**: stores your settings, target prices and ticker list locally in
localStorage on your machine without needing a database or sharing them with
third parties.
- **Real-time data**: fetches the latest quotes without limits using Yahoo
Finance.
- **Black aesthetics**: enjoy a beautifully designed, premium user interface
with interactive "gold on black" highlights.
- **Cross-platform**: readily packages for Mac, Windows and Linux using
electron-builder.

> Note: due to new Apple restrictions it will not let you run the app without
> allowlisting it in Security settings. **Please be assured that this app was
> not made to inject any malware that may harm your operating system or
> compromise your privacy**: all code is open source and can be seen by everyone
> on [GitHub](https://github.com/Marketionist/black-orb).
>
> To fix this on your Mac, choose Apple menu > System Settings, then click
> Privacy & Security in the sidebar and scroll down to Security section. Click
> Open Anyway. This button is available for about an hour after you try to open
> the app. Enter your login password, then click OK. The app will be saved as an
> exception to your security settings, and you can open it in the future by
> double-clicking it, just as you can for any authorized app.

## Development

### Customizing Default Stocks

You can customize the default list of stocks loaded on the first run (or when
resetting storage) by using an environment variable.

1. Create a `.env` file in the root of the project.
2. Add the `STOCKS` variable with a comma-separated list of ticker symbols:

```env
STOCKS=AAPL,GOOGL,NVDA,AMD,INTC
```

When you start (`npm run dev`) or build the app, it will read this variable and
use those tickers as your default dashboard!

### Requirements

- Node.js (24 or newer recommended)
- npm (Node Package Manager)

### Installation Instructions

1. **Clone the repository** (or download and extract the project):

    ```bash
    git clone git@github.com:Marketionist/black-orb.git
    cd black-orb
    ```

2. **Install dependencies** - to install all necessary packages run the
following command in the project root:

    ```bash
    npm install
    ```

3. **Start the development server** - to run the app locally with hot-module
replacement, execute:

    ```bash
    npm run dev
    ```
To run it as a web server on http://localhost:5173/, execute:

    ```bash
    npm run dev:web
    ```

### Building Instructions

The app is built using `electron-builder` which allows for generating highly
optimized executables for different operating systems. Below are the commands
you can use to package the app.

#### macOS Build

To package the application as a macOS `.dmg` installer:

```bash
npm run build:mac
```

The compiled disk image and raw binaries will be located under the `release/`
directory.

#### Windows Build

To package the application as a Windows `.exe` installer (using NSIS):

```bash
npm run build:win
```

The compiled installer will be located under the `release/` directory.

#### Linux Build

To package the application as a Linux `.AppImage` installer:

```bash
npm run build:linux
```

The compiled installer will be located under the `release/` directory.

#### General Build

If you want to run a complete build pipeline without a specific flag (defaults
to your current operating system host):

```bash
npm run build
```

### Technologies Used

- **Frameworks**: [Electron](https://www.electronjs.org/), [React](https://react.dev/), [Vite](https://vitejs.dev/)
- **Languages**: TypeScript
- **Styling**: Vanilla CSS (CSS Variables, Flexbox/Grid, Animations)
- **APIs**: Yahoo Finance API (direct fetch)
- **Icons**: [Heroicons](https://heroicons.com/)

## Thanks
If this app was helpful to you - please give this repository a **★ Star** on
[GitHub](https://github.com/Marketionist/black-orb).
