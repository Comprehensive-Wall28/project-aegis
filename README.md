# Aegis

Aegis is a secure student CMS designed for the **Post-Quantum Era**. It provides a quantum-safe productivity suite that ensures your data never leaves your browser unencrypted.

## About Aegis

Aegis leverages a state-of-the-art hybrid cryptographic architecture to protect your data against both classical and future quantum threats.

### Key Features
- **Quantum-Safe Encryption**: Utilizes **ML-KEM (Kyber)** for key encapsulation, securing data against quantum computer attacks.
- **Stateless Architecture**: Operates entirely within your browser for maximum privacy.
- **Zero-Knowledge Privacy**: Your data is encrypted client-side before it ever touches our servers.
- **Hybrid Security**: Combines industry-standard **AES-256** for robust data confidentiality with post-quantum algorithms for key exchange.
- **GPA Tracking**: Track your GPA and course progress with ease by adding courses and grades. All encrypted of course with Post-Quantum algorithms.
- **Secure Storage**: Your data is stored securely in a MongoDB database encrypted with AES-256-GCM.

## Architecture

Aegis implements a defense-in-depth strategy:
1.  **Client-Side Encryption**: Data is encrypted locally using AES-256 GCM.
2.  **Quantum-Resistant Key Exchange**: ML-KEM-768 is used to securely establish shared secrets between the client and server.
3.  **Secure Storage**: Encrypted data is stored securely, with the server having zero visibility into the plaintext content.

## Local Development

Follow these instructions to set up Aegis locally for development.

### Prerequisites

-   **Node.js**: Version 24 or higher required given the package.json `engines` or `@types/node` versions.
-   **MongoDB**: A local or remote (Atlas) MongoDB instance.

### Setup Instructions

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/Comprehensive-Wall28/project-aegis
    cd aegis
    ```

2.  **Backend Setup**
    ```bash
    cd backend
    npm install
    # Create a .env file based on the reference below
    npm run dev
    ```
    The backend server will start on port **5000** by default.

3.  **Frontend Setup**
    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```
    The frontend development server will start (usually on port **5173**).

### Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/aegis

# Security & CORS
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=your_super_secure_jwt_secret_key
COOKIE_SECRET=your_cookie_signing_secret

# Other Services (if applicable)
# GRIDFS_BUCKET_NAME=uploads
```

Create a `.env` file in the `frontend` directory (optional if defaults work):

```env
VITE_API_URL=http://localhost:5000
VITE_APP_VERSION=0.7.9
```
