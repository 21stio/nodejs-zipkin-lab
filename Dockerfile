FROM alpine:latest

RUN apk add --no-cache nodejs

COPY . /opt/zipkin-lab

WORKDIR /opt/zipkin-lab

RUN npm install