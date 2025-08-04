FROM node:24.4-alpine3.21

WORKDIR /app

RUN apk add runit

WORKDIR /app

RUN npm install -g pnpm

RUN mkdir -p /etc/service/app /runit
RUN chmod +x /etc/service/app/run /runit/dev.sh

FROM base AS prod

RUN pnpm install --frozen-lockfile

COPY ./ /app/
COPY ./docker/runit/client/prod.run /etc/service/app/run

CMD ["runsvdir", "/etc/service"]

FROM base AS dev

RUN pnpm install

COPY ./ /app/
COPY ./docker/runit/client/prod.run /etc/service/app/run

RUN pnpm run build

CMD ["runsvdir", "/etc/service"]
