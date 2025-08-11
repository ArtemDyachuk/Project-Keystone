# @keystone/database

Shared MongoDB database connection package for the Keystone monorepo.

## Features

- MongoDB connection using Mongoose
- Connection caching and reuse
- TypeScript support
- Environment variable configuration
- Enterprise-ready architecture

## Usage

### Basic Connection

```typescript
import { connectToDatabase } from "@keystone/database";

// Connect using environment variables
await connectToDatabase();
```

### Environment Variables

Set these environment variables in `.env` file at project root:

```bash
MONGODB_URI=mongodb://localhost:27017/keystone
```

### NestJS Integration

```typescript
import { Injectable, OnModuleInit } from "@nestjs/common";
import { connectToDatabase } from "@keystone/database";

@Injectable()
export class DatabaseService implements OnModuleInit {
  async onModuleInit() {
    await connectToDatabase();
  }
}
```

### Next.js Integration

```typescript
import { connectToDatabase } from "@keystone/database";

// In API routes or server components
export async function initializeDatabase() {
  await connectToDatabase();
}
```

## API Reference

### `connectToDatabase()`

Establishes a connection to MongoDB using environment variables.

**Returns:** Promise\<void\>

### `disconnectFromDatabase()`

Disconnects from MongoDB.

**Returns:** Promise\<void\>

### `isConnectedToDatabase()`

Checks if database is currently connected.

**Returns:** boolean

### `mongoose`

Re-exported mongoose instance for schema creation and models.

```typescript
import { mongoose } from "@keystone/database";

const UserSchema = new mongoose.Schema({
  name: String,
  email: String
});
```
