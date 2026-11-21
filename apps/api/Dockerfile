FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/case-study/package.json apps/case-study/
COPY apps/desktop/package.json apps/desktop/
COPY apps/mobile/package.json apps/mobile/
COPY apps/website/package.json apps/website/
RUN npm ci

COPY packages/shared packages/shared
COPY apps/api apps/api

ENV NODE_ENV=development
EXPOSE 4000

CMD ["npm", "run", "-w", "@apex/api", "start"]
