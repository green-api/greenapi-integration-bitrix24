# [GREEN-API](https://green-api.com/en) Integration with [Bitrix24](https://www.bitrix24.com)

This integration enables WhatsApp communication within [Bitrix24](https://www.bitrix24.com) using
the [GREEN-API](https://green-api.com/en) platform. Built on
the [Universal Integration Platform](https://github.com/green-api/greenapi-integration)
by [GREEN-API](https://green-api.com/en), it provides a seamless WhatsApp connector for Bitrix24's Contact Center.

## Overview

This integration allows you to:

1. Receive WhatsApp messages directly in Bitrix24's Contact Center
2. Send WhatsApp messages from Bitrix24 to your customers
3. Handle multiple GREEN-API instances per Bitrix24 portal
4. Support multiple communication lines within the same portal

## Architecture

### Adapter Service

The NestJS application that:

- Handles message transformation between Bitrix24 and WhatsApp
- Manages Bitrix24 OAuth authentication and app lifecycle
- Provides webhook endpoints for both Bitrix24 and GREEN-API
- Creates and manages GREEN-API instances per Bitrix24 line
- Provides multilingual interface (Russian/English)
- Handles file attachments and media messages

## Prerequisites

- MySQL database (5.7 or higher)
- Node.js 20 or higher
- [GREEN-API](https://green-api.com/en) account and instance(s)
- Bitrix24 portal (cloud or self-hosted)
- A publicly accessible URL for the adapter service (for webhooks)
- Bitrix24 Developer Account for app creation

## Step 1: Setting Up the Bitrix24 Application

Before deploying the adapter service, you need to create and configure a Bitrix24 application:

1. **Register as a Bitrix24 Developer:**
    - Firstly, contact Bitrix24 support and ask them to give you a Technological Partner status
    - Then you will be able to create an app on https://vendors.bitrix24.com/

2. **Create a new application:**
    - Navigate to "My Applications" and click "Create Application"
    - Fill in your app's basic information

3. **Set up application endpoints:**
    - Set the Installation URL: `YOUR_APP_URL/oauth/install`
    - Set the Application URL: `YOUR_APP_URL`
    - Configure required permissions:
        - `Open Lines` - for messenger connector functionality
        - `Contact Center` - for Contact Center integration
        - `Chat and Notifications` - for messaging functionality
        - `CRM` - for contact and lead management

4. **Save your application credentials:**
    - Note down the Client ID and Client Secret, you'll need these for the adapter configuration

## Step 2: Setting Up the Adapter

1. **Clone the repository:**

   ```bash
   git clone https://github.com/green-api/greenapi-integration-bitrix24.git
   cd greenapi-integration-bitrix24
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env` file in the root of the project:

   ```env
   DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"
   APP_URL="https://your-adapter-domain.com"
   BITRIX24_CLIENT_ID="your_bitrix24_client_id"
   BITRIX24_CLIENT_SECRET="your_bitrix24_client_secret"
   ```

    - `DATABASE_URL`: Your MySQL connection string
    - `APP_URL`: The public URL where your adapter will be deployed
    - `BITRIX24_CLIENT_ID` and `BITRIX24_CLIENT_SECRET`: From your Bitrix24 app configuration

4. **Apply database migrations:**

   ```bash
   npx prisma migrate deploy
   ```

5. **Build and start the adapter:**

   ```bash
   # Build the application
   npm run build

   # Start in production mode
   npm run start:prod
   ```

## Step 3: Deployment

The adapter can be deployed using Docker Compose. Configuration files:

### Docker Compose Setup (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  adapter:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - APP_URL=${APP_URL}
      - BITRIX24_CLIENT_ID=${BITRIX24_CLIENT_ID}
      - BITRIX24_CLIENT_SECRET=${BITRIX24_CLIENT_SECRET}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=your_strong_root_password
      - MYSQL_USER=your_db_user
      - MYSQL_PASSWORD=your_db_password
      - MYSQL_DATABASE=bitrix24_adapter
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

### Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD npx prisma migrate deploy && npm run start:prod
```

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Step 4: Installing the Integration in Bitrix24

Once your adapter service is deployed and your Bitrix24 app is configured:

1. **Install the app in your Bitrix24 portal:**
    - From your Bitrix24 developer account, go to your created app and press "Test"
    - Then you will need to enter your test portal url and click "Install"
    - After being redirected to the app's marketplace page, install and open it

2. **Access the Contact Center:**
    - Navigate to Contact Center in your Bitrix24 menu
    - You should see "GREEN-API WhatsApp" in the list of available connectors

3. **Configure the GREEN-API connector:**
    - Click on the GREEN-API WhatsApp connector
    - Enter your GREEN-API credentials:
        - Instance ID (from console.green-api.com)
        - API Token (from console.green-api.com)
    - Click "Save Configuration"

4. **Verify the setup:**
    - The connector should show as active in Contact Center
    - Send a test message to your WhatsApp number to verify the connection

## How the Integration Works

### Incoming Messages (WhatsApp → Bitrix24)

1. **Message Reception:**
    - Customer sends a message to your WhatsApp number
    - GREEN-API receives the message and forwards it to your adapter
    - Adapter transforms the message for Bitrix24 format
    - Message appears in Bitrix24's Contact Center

2. **Supported incoming message types:**
    - Text messages and emojis
    - Media files (images, videos, documents, audio)
    - Location sharing
    - Contact cards
    - Voice messages
    - Quoted messages and replies
    - Poll messages and updates
    - Button/list interactive messages

3. **Contact Management:**
    - Contacts are automatically created in Bitrix24 CRM
    - WhatsApp phone numbers are linked to contact records

### Outgoing Messages (Bitrix24 → WhatsApp)

1. **Sending Messages:**
    - Use Bitrix24's Contact Center messaging interface
    - Type your message and press send
    - Message is routed through the adapter to GREEN-API
    - Delivered to customer via WhatsApp

2. **Supported outgoing message types:**
    - Text messages with formatting
    - File attachments (documents, images, videos)

### Multi-Line Support

- Configure multiple GREEN-API instances for different communication lines
- Each line can handle different types of conversations

## Additional features

### Multilingual Support

The integration supports both Russian and English interfaces:

- Automatic language detection based on Bitrix24 user preferences
- Localized configuration forms and error messages
- Language-specific documentation links

### Interactive Tutorial

- Built-in step-by-step setup guide
- Visual screenshots for each configuration step
- Clickable images with modal zoom functionality
- Responsive design for mobile and desktop

## License

[MIT](./LICENSE)