FROM node:20.10.0-alpine3.18 AS builder

# Create the project directory inside the container.
WORKDIR /app

RUN apk add --no-cache -t build-dependencies git make gcc g++ python3 \
    libtool autoconf pkgconfig automake librdkafka-dev bash # wget tar xz


RUN cd $(npm root -g)/npm
#RUN npm config set unsafe-perm true
RUN npm install -g node-gyp

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY packages/domain-lib/package*.json ./packages/domain-lib/
COPY packages/implementations-lib/package*.json ./packages/implementations-lib/
COPY packages/quoting-svc/package*.json ./packages/quoting-svc/

# If you are building your code for production
#RUN npm ci --only=production
RUN BUILD_LIBRDKAFKA=0 npm install

########################################
# Copy code and build

# root tsconfig.json
COPY tsconfig.json ./

# copy required supporting modules/packages (especially private ones not published to npm)
COPY packages/domain-lib ./packages/domain-lib
COPY packages/implementations-lib ./packages/implementations-lib

# copy service code
COPY packages/quoting-svc ./packages/quoting-svc

# build
RUN npm run build


FROM node:20.10.0-alpine3.18
WORKDIR /app
RUN mkdir /app/data

RUN apk add librdkafka

COPY --from=builder /app .

EXPOSE 3033

CMD [ "npm", "run", "start:quoting-svc" ]
