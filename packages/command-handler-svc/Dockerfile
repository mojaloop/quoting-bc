########################################
FROM node:20.10.0-alpine3.18 as builder

# Create the project directory inside the container.
WORKDIR /app

RUN apk add --no-cache -t build-dependencies git make gcc g++ python3 \
    libtool autoconf pkgconfig automake librdkafka-dev bash # wget tar xz

RUN cd $(npm root -g)/npm
#RUN npm config set unsafe-perm true
RUN npm install -g node-gyp

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

COPY packages/public-types-lib/package.json ./packages/public-types-lib/
COPY packages/implementations-lib/package.json ./packages/implementations-lib/
COPY packages/domain-lib/package.json ./packages/domain-lib/
COPY packages/command-handler-svc/package.json ./packages/command-handler-svc/
COPY packages/quoting-config-lib/package.json ./packages/quoting-config-lib/

#RUN ls -la

# If you are building your code for production
#RUN npm ci --only=production
RUN BUILD_LIBRDKAFKA=0 npm install

# Note on BUILD_LIBRDKAFKA:
#   Use BUILD_LIBRDKAFKA=0 only if we have installed librdkafka-dev in
#   the builder image and librdkafka in the final image

########################################
# Copy code and build

# root tsconfig.json
COPY tsconfig.json ./

# copy required supporting modules/packages (only the private ones not published to npm)
COPY packages/public-types-lib ./packages/public-types-lib
COPY packages/implementations-lib ./packages/implementations-lib
COPY packages/domain-lib ./packages/domain-lib
COPY packages/quoting-config-lib ./packages/quoting-config-lib

# copy service code
COPY packages/command-handler-svc ./packages/command-handler-svc

# build
RUN npm run build

########################################
FROM node:20.10.0-alpine3.18
WORKDIR /app
RUN mkdir /app/data

RUN apk add librdkafka

COPY --from=builder /app .

ENV NODE_ENV=production
CMD [ "node", "packages/command-handler-svc/dist/index.js" ]
