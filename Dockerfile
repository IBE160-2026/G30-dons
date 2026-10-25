# MasterPlan delivery image (AD-17). Runs in test mode with the settings given at `docker run`,
# for example: docker run --rm --env-file .env.example -p 3000:3000 masterplan
# No settings or secrets are built in; .dockerignore keeps .env, data/ and the rest out.
FROM node:24.21.0-slim

ENV NODE_ENV=production
WORKDIR /app

# tsx is a runtime dependency, so there is no build step.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY public ./public
COPY seed ./seed
COPY tsconfig.json ./

# The SQLite file lives in /app/data (DATABASE_URL=file:./data/local.db), owned by the app user.
RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 3000

# Seeds on first start in test mode (no database file yet), then starts the server in the same process.
CMD ["node", "--import", "tsx", "seed/docker-start.ts"]
