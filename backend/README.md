# ChatUp Backend

Backend service for ChatUp, built with NestJS and following Clean Architecture.

## 📚 Documentation

### 🚀 Deployment Guides

- **[Railway Setup Guide](./RAILWAY_SETUP.md)** - Complete guide to deploy on Railway
- **[Database Troubleshooting](./DATABASE_TROUBLESHOOTING.md)** - Fix database connection issues
- **[Security Fix](../SECURITY_FIX.md)** - CVE-2025-66478 vulnerability fix

### 🏗️ Architecture

```text
src/
├── core/                   # Domain Layer (Business Logic)
│   ├── entities/           # Domain entities (User, Message, Key, PreKey)
│   ├── interfaces/         # Repository and service interfaces
│   └── use-cases/          # Business logic use cases
│       ├── auth/           # Authentication use cases
│       ├── message/        # Message handling use cases
│       └── user/           # User management use cases
├── infra/                  # Infrastructure Layer (DB, External Services)
│   ├── database/           # TypeORM configuration and repositories
│   │   ├── entities/       # TypeORM entities
│   │   ├── migrations/     # Database migrations
│   │   └── mappers/        # Entity mappers
│   ├── security/           # Security implementations (JWT, Bcrypt)
│   └── websockets/         # WebSocket gateway for real-time chat
├── presentation/           # Presentation Layer (HTTP, WebSockets)
│   ├── controllers/        # REST API controllers
│   │   ├── auth.controller.ts
│   │   ├── chat.controller.ts
│   │   ├── users.controller.ts
│   │   ├── keys.controller.ts
│   │   ├── location.controller.ts
│   │   └── files.controller.ts
│   ├── guards/             # Authentication guards
│   └── modules/            # NestJS modules
└── main.ts                 # Application entry point
```

## 🚀 Quick Start

### Local Development

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Setup PostgreSQL** (via Docker):

   ```bash
   docker-compose up -d
   ```

3. **Run migrations**:

   ```bash
   npm run migration:run
   ```

4. **Start development server**:

   ```bash
   npm run start:dev
   ```

   The API will be available at `http://localhost:3000`

### Production Deployment

See **[Railway Setup Guide](./RAILWAY_SETUP.md)** for detailed instructions.

## 🛠️ Available Scripts

### Development

```bash
npm run start           # Start application
npm run start:dev       # Start in watch mode
npm run start:debug     # Start in debug mode
```

### Production

```bash
npm run build           # Build for production
npm run start:prod      # Start production server
```

### Database

```bash
npm run migration:generate  # Generate migration from entities
npm run migration:run       # Run pending migrations
npm run migration:revert    # Revert last migration
npm run db:reset            # Reset database (development only)
```

### Testing

```bash
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:cov        # Run tests with coverage
npm run test:e2e        # Run end-to-end tests
```

### Code Quality

```bash
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
npm run audit:check     # Check for security vulnerabilities
npm run audit:fix       # Fix security vulnerabilities
```

## 🔐 Environment Variables

### Required Variables

```bash
# Database (Railway auto-provides this)
DATABASE_URL=postgresql://user:password@host:port/database

# Application
NODE_ENV=production
PORT=3000

# Authentication
JWT_SECRET=your-super-secure-secret-here
JWT_EXPIRES_IN=7d
```

See **[Railway Setup Guide](./RAILWAY_SETUP.md)** for complete list.

## 📡 API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/profile` - Get current user profile (protected)

### Users

- `GET /users` - Search users
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user profile (protected)

### Chat

- `GET /chat/messages/:contactId` - Get chat messages (protected)
- `POST /chat/messages` - Send message (protected)

### Keys (End-to-End Encryption)

- `POST /keys/identity` - Upload identity key
- `GET /keys/identity/:userId` - Get user's identity key
- `POST /keys/prekeys` - Upload pre-keys
- `GET /keys/prekeys/:userId` - Get user's pre-keys

### Location

- `POST /location/share` - Share location (protected)
- `GET /location/:userId` - Get user's location (protected)

### Files

- `POST /files/upload` - Upload file (protected)
- `GET /files/:fileId` - Get file (protected)

### Health Check

- `GET /health` - Service health status

## 🔌 WebSocket Events

### Client → Server

- `sendMessage` - Send chat message
- `typing` - User is typing
- `read` - Mark message as read

### Server → Client

- `newMessage` - New message received
- `messageDelivered` - Message delivered confirmation
- `messageRead` - Message read confirmation
- `userTyping` - Other user is typing

## 🗄️ Database Schema

### Users Table

- `id` (UUID, PK)
- `email` (string, unique)
- `password` (string, hashed)
- `displayName` (string)
- `photoURL` (string, nullable)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### Messages Table

- `id` (UUID, PK)
- `senderId` (UUID, FK)
- `receiverId` (UUID, FK)
- `content` (text, encrypted)
- `type` (enum: text, image, file, location)
- `timestamp` (timestamp)
- `delivered` (boolean)
- `read` (boolean)

### Keys Table (E2E Encryption)

- `id` (UUID, PK)
- `userId` (UUID, FK)
- `keyType` (enum: identity, prekey)
- `keyData` (text)
- `createdAt` (timestamp)

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Bcrypt with salt rounds
- **End-to-End Encryption** - Signal Protocol implementation
- **CORS Protection** - Configurable CORS policy
- **SQL Injection Protection** - TypeORM parameterized queries
- **Rate Limiting** - (TODO: Implement)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## 📊 Monitoring

### Health Check

```bash
curl https://your-app.railway.app/health
```

### Logs

```bash
# Via Railway CLI
railway logs

# Follow logs in real-time
railway logs --follow
```

## 🐛 Troubleshooting

### Database Connection Issues

See **[Database Troubleshooting Guide](./DATABASE_TROUBLESHOOTING.md)**

### Security Vulnerabilities

See **[Security Fix Guide](../SECURITY_FIX.md)**

### Common Issues

**Port already in use**:

```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)
```

**TypeORM connection timeout**:

- Check if PostgreSQL is running
- Verify `DATABASE_URL` is correct
- Check network connectivity

**Migration errors**:

```bash
# Reset database (development only!)
npm run db:reset

# Run migrations again
npm run migration:run
```

## 🤝 Contributing

1. Follow Clean Architecture principles
2. Write tests for new features
3. Update documentation
4. Run linter before committing: `npm run lint`
5. Follow commit message conventions

## 📝 License

Private - All rights reserved

## 🔗 Related Projects

- **Frontend**: React Native app with Expo Router
- **Documentation**: See main README.md in project root

## 📞 Support

- **Issues**: Open an issue on GitHub
- **Railway Support**: [help.railway.app](https://help.railway.app)
- **NestJS Docs**: [docs.nestjs.com](https://docs.nestjs.com)

---

**Version**: 0.0.1  
**Node.js**: >=20.0.0  
**npm**: >=10.0.0  
**Last Updated**: Janeiro 2026
