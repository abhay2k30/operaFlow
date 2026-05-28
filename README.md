# OperaFlow - Inventory & Procurement Management System

OperaFlow is a lightweight, MERN-stack based inventory and procurement management application designed for small to medium businesses. It handles the entire lifecycle of stock from purchase orders to receiving, storage, and issuance, along with basic financial tracking and quality control.

## Features

### Core Inventory
- **Product Management**: Create and manage product catalog with SKUs, categories, and reorder levels.
- **Multi-Location Stock**: Track stock across multiple locations (warehouses, stores).
- **Batch Tracking**: Manage stock by batches with expiry dates.
- **Stock Transactions**: Receive, Issue, and Transfer stock with atomic updates.

### Procurement
- **Purchase Orders**: Create POs, track status (Pending, Partial, Fulfilled).
- **Receiving**: Receive items against POs, automatically creating batches and updating stock.

### Quality & Finance
- **Quality Control**: Track rejected items and reasons (Damaged, Expired, etc.).
- **Basic Ledger**: Automated financial entries for stock movements (Debit/Credit).

### Dashboard & Reporting
- **Real-time Dashboard**: KPIs for Stock Value, Low Stock, Expiry Risk, and Recent Activity.
- **CSV Import/Export**: Bulk import products and export stock levels.

### Admin
- **User Management**: Role-based access control (Admin, Inventory Manager, Procurement, Finance, Quality Control).

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide React, Recharts.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose).
- **Authentication**: JWT with Role-Based Access Control.

## Setup Instructions

### Prerequisites
- Node.js (v14+)
- MongoDB (Local or Atlas URI)

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd operaflow
    ```

2.  **Backend Setup**
    ```bash
    cd server
    npm install
    ```
    Create a `.env` file in `server/`:
    ```env
    PORT=5000
    MONGODB_URI=mongodb://localhost:27017/operaflow
    JWT_SECRET=your_jwt_secret_key_here
    ```
    Start the server:
    ```bash
    npm start
    # Server runs on http://localhost:5000
    ```

3.  **Frontend Setup**
    ```bash
    cd client
    npm install
    ```
    Start the development server:
    ```bash
    npm run dev
    # Client runs on http://localhost:5173
    ```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Inventory
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/stock` - Get stock levels
- `POST /api/stock/transfer` - Transfer stock
- `POST /api/stock/issue` - Issue stock

### Procurement
- `GET /api/purchase-orders` - List POs
- `POST /api/purchase-orders` - Create PO
- `POST /api/purchase-orders/:id/receive` - Receive items

### Admin
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `DELETE /api/users/:id` - Delete user

## License
MIT
