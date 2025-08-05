FROM node:24-alpine AS base

WORKDIR /app

RUN apk add runit
RUN mkdir -p /etc/service/app /runit

FROM base AS prod
COPY ./ /app/
COPY ./docker/runit/prod.run /etc/service/app/run
RUN chmod +x /etc/service/app/run
CMD ["runsvdir", "/etc/service"]

FROM base AS dev
COPY ./ /app/
COPY ./docker/runit/dev.run /etc/service/app/run
RUN chmod +x /etc/service/app/run
CMD ["runsvdir", "/etc/service"]
