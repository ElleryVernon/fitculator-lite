FROM node:18.13.0

# Install pnpm and ts-node globally
RUN npm install -g pnpm ts-node

WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy the rest of your project files
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# List contents of current directory
RUN echo "Current directory contents:" && ls -la

# Start the bot using ts-node
CMD ["pnpm", "start"]