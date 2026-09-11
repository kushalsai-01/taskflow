# TaskPulse — Production-Hardened MERN Task Management Platform

TaskPulse is an enterprise-grade full-stack task management system engineered with the **MERN** stack (MongoDB, Express.js, React 18, Node.js). It features secure JWT authentication, strict authorization with Anti-IDOR user-level data isolation, ReDoS-protected search, debounced frontend filtering, structured logging, Prometheus-compatible metrics, comprehensive Supertest integration testing, Docker containerization, and k6 load-testing infrastructure.

---

## 🏗️ Architecture & Request Lifecycle

TaskPulse is designed as a **Modular Monolith** adhering to strict separation of concerns across layered boundaries:

```
┌─────────────────────────────────────────────────────────────┐
│                       React 18 SPA                          │
│         (Vite, React Router v6, 350ms Debounced Search)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON (Bearer JWT)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Nginx Reverse Proxy & Static Cache              │
│       (Security Headers, Gzip Compression, SPA Fallback)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP /api/v1 Proxy
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express.js REST API (/api/v1)               │
│  ├── Security: helmet(), cors(), express-rate-limit         │
│  ├── Observability: requestLogger, metricsMiddleware        │
│  ├── Authentication: authMiddleware (JWT verification)      │
│  ├── Validation: express-validator (query/body whitelists)  │
│  ├── Controllers: HTTP parameter unpacking & envelopes      │
│  ├── Services: Business logic, atomic user-scoped queries   │
│  └── Error Handler: Centralized Mongoose & JWT exception map│
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose ODM (Connection Pooling)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Document Store                   │
│        (Compound B-Tree Indexes: { user, completed, date }) │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, React Router v6, Lucide Icons, Vanilla CSS Glassmorphism Design System |
| **Backend** | Node.js 18, Express 4, Mongoose 8, JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`) |
| **Security** | `helmet`, `cors`, `express-rate-limit`, `express-validator`, ReDoS RegEx Escaping |
| **Observability**| Custom Structured JSON Logger, Correlation IDs (`X-Request-Id`), Prometheus Metrics Endpoint |
| **Database** | MongoDB 6 (Local, Docker container, or MongoDB Atlas) |
| **DevOps & Containers** | Docker (Multi-stage builds, non-root `node` user), Docker Compose, Nginx |
| **Testing** | Jest, Supertest (38 automated unit & integration tests) |
| **Benchmarking** | k6 Load Testing Suite (`smoke`, `load`, `stress`, `spike`, `soak`), Synthetic Data Seeder |
| **CI/CD** | GitHub Actions Automated Pipeline (`.github/workflows/ci.yml`) |

---

## 🔐 Security & Authorization Architecture

### 1. Zero Hardcoded Secrets & Fail-Fast Validation
The application uses a centralized environment configuration module ([env.js](file:///server/src/config/env.js)) that verifies all required environment variables at boot time. If `JWT_SECRET` is missing in production or development, the server immediately throws a descriptive fatal error and terminates, preventing silent insecure startups.

### 2. Anti-IDOR / Anti-BOLA Authorization Model
Every mutation and retrieval operation on tasks is strictly isolated to the authenticated user ID (`req.user._id`):
* **Atomic User-Scoped Mutations**: Rather than two-step `findById` + `update/delete` operations, TaskPulse utilizes single atomic database operations:
  ```javascript
  Todo.findOneAndUpdate({ _id: todoId, user: userId }, { $set: updateData }, { new: true });
  Todo.findOneAndDelete({ _id: todoId, user: userId });
  ```
* **Strict 403 Forbidden on Unauthorized Access**: If a user attempts to read, modify, or delete a task owned by another user, the application explicitly verifies existence and throws `403 Forbidden`.

### 3. ReDoS Protection (Regular Expression Denial of Service)
User search inputs are sanitized through an `escapeRegex()` utility that escapes all regex meta-characters (`.*+?^${}()|[]\`) and bounds the query length to 100 characters before building Mongoose `$regex` queries.

### 4. Active Dual-Tier Rate Limiting
* **Auth Limiter**: Configurable rate limiting (default: 20 requests per 15 minutes) applied to `/api/v1/auth/login` and `/api/v1/auth/register`.
* **API Limiter**: Configurable rate limiting (default: 300 requests per 15 minutes) applied across all `/api/v1/todos` endpoints.

---

## 📡 RESTful API Reference (`/api/v1`)

All endpoints return a standardized JSON envelope:
```json
{
  "success": true,
  "message": "Human readable status",
  "data": {},
  "meta": {}
}
```

### Authentication Endpoints (`/api/v1/auth`)

| Method | Endpoint | Auth | Purpose | Validation Rules |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register new user account | `name` (1–50 chars), `email` (valid, normalized), `password` (min 6 chars) |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user & issue JWT | `email` (valid), `password` (required) |
| `POST` | `/api/v1/auth/logout` | Public | Clear client-side session | None |
| `GET` | `/api/v1/auth/me` | Bearer JWT | Fetch logged-in user profile | Valid JWT in `Authorization` header |

### Task Management Endpoints (`/api/v1/todos`)

| Method | Endpoint | Auth | Purpose | Validation Rules |
|---|---|---|---|---|
| `GET` | `/api/v1/todos` | Bearer JWT | List tasks with filters | `page` (min 1), `limit` (1–100), `completed` (boolean), `priority` (`low`/`medium`/`high`), `sortBy` (`createdAt`/`dueDate`/`title`/`priority`), `order` (`asc`/`desc`), `search` (max 100 chars) |
| `POST` | `/api/v1/todos` | Bearer JWT | Create new task | `title` (required, 1–120 chars), `description` (max 1000 chars), `priority` (enum), `category` (max 50 chars), `dueDate` (ISO date) |
| `GET` | `/api/v1/todos/:id` | Bearer JWT | Fetch task by ID | `id` must be valid Mongo ObjectId; ownership enforced |
| `PATCH`| `/api/v1/todos/:id` | Bearer JWT | Partial task update | Whitelisted fields (`title`, `description`, `completed`, `priority`, `category`, `dueDate`) |
| `PUT`  | `/api/v1/todos/:id` | Bearer JWT | Full/partial task update | Backward-compatible alias to PATCH |
| `DELETE`| `/api/v1/todos/:id` | Bearer JWT | Delete task | `id` must be valid Mongo ObjectId; ownership enforced |

### System & Observability Endpoints (`/api/v1/`)

| Method | Endpoint | Auth | Purpose | Response |
|---|---|---|---|---|
| `GET` | `/api/v1/health` | Public | Process liveness probe | Process uptime, timestamp, heap memory |
| `GET` | `/api/v1/ready` | Public | Readiness probe | MongoDB connection state (200 OK or 503 Unavailable) |
| `GET` | `/api/v1/metrics` | Public | Operational metrics | Request counts, error rates, average latency, CPU/memory stats |

---

## 🗄️ Database Design & Indexing Strategy

TaskPulse uses MongoDB with optimized Mongoose schemas:

```javascript
// Compound indexes in server/src/models/Todo.js:
todoSchema.index({ user: 1, completed: 1, createdAt: -1 }); // Equality, Sort, Range query optimization
todoSchema.index({ user: 1, dueDate: 1 });                  // Due date sorting and range filtering
todoSchema.index({ user: 1, priority: 1 });                 // Priority filtering
```

* **Index Prefix Optimization**: Redundant single-field indexes on `user` were removed, as queries on `{ user: userId }` are already satisfied by the leading prefix of the compound index.
* **Lean Reads**: All listing and single-item queries use `.lean()` to bypass Mongoose hydration overhead and reduce memory allocations.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017/todoapp`) or MongoDB Atlas URI

### 1. Backend Setup
```bash
cd server
npm install

# Copy configuration template and configure secrets
cp .env.example .env
```

Ensure `server/.env` contains:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/todoapp
JWT_SECRET=your_secure_development_jwt_secret_min_32_characters
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

Start backend:
```bash
npm run dev   # Development mode with nodemon
npm start     # Production mode
```

### 2. Frontend Setup
```bash
cd ../client
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## 🐳 Running with Docker & Docker Compose

Launch the entire stack (MongoDB, Node Express Server, Nginx React Client) with a single command:

```bash
docker-compose up --build -d
```

* **Frontend Client (Nginx)**: `http://localhost:80`
* **Backend API (Node.js)**: `http://localhost:5000/api/v1`
* **System Health Check**: `http://localhost:5000/api/v1/health`
* **System Readiness Check**: `http://localhost:5000/api/v1/ready`

Stop containers:
```bash
docker-compose down -v
```

---

## 🧪 Automated Testing Suite

TaskPulse includes 38 automated unit, integration, and security tests using **Jest** and **Supertest**:

```bash
cd server

# Run complete test suite
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage Highlights:
* **Authentication Suite (`auth.test.js`)**: Registration validation, duplicate email conflict (409), password length enforcement, credential verification (401), JWT issuance, and protected `/me` endpoints.
* **Task CRUD Suite (`todo.test.js`)**: Complete lifecycle (Create, Read, Update via PATCH, Delete), query parameter bounds enforcement (max limit 100, page >= 1), title length constraints, and malformed ObjectId handling (400).
* **Anti-IDOR Security Suite (`authorization.test.js`)**: Proves User B cannot read, update, or delete User A's tasks (403 Forbidden), verifies user filter isolation, validates ReDoS regex escaping, and checks mass-assignment field stripping.

---

## 📊 Performance Benchmarking & Load Testing (k6)

A dedicated load testing suite using **k6** is prepared in `tests/load/`:

| Script | Purpose | Virtual Users (VUs) | Target Duration | Focus Area |
|---|---|---|---|---|
| `smoke.js` | Minimal sanity verification | 1 VU | 1 minute | API availability, CRUD flow |
| `load.js` | Realistic production traffic | 20 → 50 → 100 VUs | 7 minutes | Normal peak load, p95 latency |
| `stress.js`| System breaking point discovery | 50 → 150 → 300 → 500 VUs | 12 minutes | Maximum sustainable throughput |
| `spike.js` | Traffic burst recovery | 20 → 400 VUs instant | 3 minutes | Recovery time and error rate |
| `soak.js`  | Memory & connection leak check | 30 VUs | 2 hours | Long-duration stability |

### Generating Synthetic Test Data
Before executing load tests, generate a realistic synthetic dataset using the safe test seeder:

```bash
# Seed 1,000 tasks (default)
node scripts/seed-test-data.js --count=1000

# Seed 10,000 tasks for benchmark testing
node scripts/seed-test-data.js --count=10000 --email=bench@taskpulse.io

# Clear test data
node scripts/seed-test-data.js --clear --email=bench@taskpulse.io
```
*(Safety Note: The seeder strictly refuses to run if `NODE_ENV === 'production'` or if pointing to an external cluster).*

### Executing Load Tests (Post-Deployment Phase)
```bash
# Set your target deployment URL
export BASE_URL="http://localhost:5000/api/v1"
export AUTH_EMAIL="bench@taskpulse.io"
export AUTH_PASSWORD="BenchmarkPassword123!"

# Execute smoke test
k6 run tests/load/smoke.js

# Execute baseline load test
k6 run tests/load/load.js
```

### Benchmark Results Table (TBD — To Be Measured Post-Deployment)

> [!NOTE]
> The performance numbers below will be measured and documented following the upcoming deployment and controlled k6 test runs.

| Test Type | Virtual Users (VUs) | Requests / Sec (RPS) | p50 Latency | p95 Latency | p99 Latency | Error Rate | Status |
|---|---:|---:|---:|---:|---:|---:|:---:|
| **Smoke Test** | 1 | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | ⏳ Pending Deployment |
| **Baseline Load** | 100 | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | ⏳ Pending Deployment |
| **Stress Test** | 500 | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | ⏳ Pending Deployment |
| **Spike Test** | 400 | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | ⏳ Pending Deployment |
| **Soak Test** | 30 | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* | ⏳ Pending Deployment |

---

## 📈 Observability & Monitoring

TaskPulse provides native operational telemetry without external dependencies:
* **Structured JSON Logging**: Request metadata, HTTP method, route, status code, response time in ms, and correlation ID (`X-Request-Id`). Sensitive fields (passwords, tokens, authorization headers) are automatically redacted.
* **Health Endpoint (`/api/v1/health`)**: Liveness probe returning process uptime and V8 heap memory usage.
* **Readiness Endpoint (`/api/v1/ready`)**: Readiness probe checking active MongoDB socket connection (`200` when connected, `503` when disconnected).
* **Metrics Endpoint (`/api/v1/metrics`)**: Exposes active request counts, total requests, error counts, average response times, and Prometheus-compatible metrics.

---

## 🔄 CI/CD Pipeline (`.github/workflows/ci.yml`)

The repository includes a complete GitHub Actions CI pipeline running on every `push` and `pull_request` to `main`:
1. **Backend Test Gate**: Spins up a MongoDB 6 service container, installs dependencies, and runs Jest integration tests with code coverage enforcement.
2. **Frontend Build Gate**: Installs dependencies and verifies that the Vite React production bundle builds cleanly.
3. **Docker Verification Gate**: Verifies multi-stage Docker builds for both server and client containers.

---

## ✅ Deployment Readiness Checklist

### Security
* [x] All fallback and hardcoded secrets eliminated; `JWT_SECRET` strictly required via environment.
* [x] Anti-IDOR user-level data isolation verified across all CRUD endpoints.
* [x] ReDoS protection enabled via regex escaping and 100-character input caps.
* [x] Rate limiting active on authentication and general API routes.
* [x] CORS origin restricted to configured client domains.
* [x] Mass-assignment protection implemented on update routes.
* [x] Sensitive fields redacted from structured logs.

### Application & Reliability
* [x] Liveness probe (`/api/v1/health`) and readiness probe (`/api/v1/ready`) operational.
* [x] Graceful shutdown handling `SIGTERM` and `SIGINT`, closing HTTP server and Mongoose connection cleanly.
* [x] Unhandled promise rejection and uncaught exception safety handlers active.
* [x] 350ms debounced frontend search preventing request flooding.

### Database
* [x] Compound indexes `{ user: 1, completed: 1, createdAt: -1 }`, `{ user: 1, dueDate: 1 }`, and `{ user: 1, priority: 1 }` active.
* [x] Redundant single index on `user` removed.
* [x] Query reads optimized using `.lean()`.
* [x] Pagination bounded to maximum 100 items per query.

### Docker & Infrastructure
* [x] Multi-stage Dockerfiles for backend and frontend.
* [x] Server runs under non-root `USER node`.
* [x] Container healthcheck directives enabled in Dockerfiles and `docker-compose.yml`.
* [x] Nginx reverse proxy configured with security headers and gzip compression.

### Testing & Automation
* [x] 38 automated Jest & Supertest integration tests passing (100% pass rate).
* [x] GitHub Actions CI pipeline configured.
* [x] k6 load testing scripts and safe test data generator prepared.
