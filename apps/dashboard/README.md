# EDLIE Dashboard Frontend

Modern, event-driven dashboard for the EDLIE (Enterprise Distributed Logistics Integration Engine) system.

## Features

- **Real-time Dashboard** - Live monitoring of order and logistics operations
- **Service Status** - Visual indicators for all microservices health
- **Integration Flow** - Event-driven visualization of the logistics pipeline
- **Responsive Design** - Tailwind CSS with dark theme
- **Component-based** - Modular React architecture with Vite

## Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + PostCSS
- **Icons**: lucide-react
- **Server**: Nginx (production)
- **Containerization**: Docker

## Project Structure

```
apps/dashboard/
├── src/
│   └── main.jsx          # React entry point
├── components/           # React components
│   ├── Dashboard.jsx     # Main dashboard page
│   ├── Header.jsx        # Top header bar
│   ├── Sidebar.jsx       # Navigation sidebar
│   ├── StatCard.jsx      # Stat card component
│   ├── ServiceStatus.jsx # Services status display
│   ├── IntegrationFlow.jsx # Event flow visualization
│   └── RecentOrdersTable.jsx # Orders table
├── App.jsx               # Root component
├── index.html            # HTML template
├── index.css             # Global styles
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind configuration
├── postcss.config.js     # PostCSS configuration
├── Dockerfile            # Docker build configuration
├── nginx.conf            # Nginx server configuration
└── package.json          # Dependencies and scripts
```

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd apps/dashboard
npm install
```

### Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

Output files are in the `dist/` directory.

## Docker

### Build Image

```bash
docker build -t edlie-dashboard:latest .
```

### Run Container

```bash
docker run -p 3000:3000 edlie-dashboard:latest
```

The dashboard will be available at `http://localhost:3000`

## API Integration

The dashboard integrates with the EDLIE API Gateway at `http://api-gateway:8080`

### Available Endpoints

- `GET /api/v1/orders` - List all orders
- `GET /api/v1/services/status` - Services health status
- `WS /ws` - WebSocket for real-time updates

## Configuration

Copy `.env.example` to `.env` and configure:

```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
```

## Team

- Zhavira Putri A.
- Achmad Iqbal
- Haffidz Aditya
- Mukhtar Aulia
- Faris Al Ghifari
