FROM node:latest
RUN mkdir -p /usr/src/cvs-tsk-edh-marshaller
WORKDIR /usr/src/cvs-tsk-edh-marshaller

# Copy source & tests
COPY src /usr/src/cvs-tsk-edh-marshaller/src
COPY tests/resources /usr/src/cvs-tsk-edh-marshaller/tests/resources

# Copy configuration & npm files
COPY tsconfig.json /usr/src/cvs-tsk-edh-marshaller
COPY .eslintrc /usr/src/cvs-tsk-edh-marshaller
COPY serverless.yml /usr/src/cvs-tsk-edh-marshaller
COPY src/config /usr/src/cvs-tsk-edh-marshaller/.build/src/config
COPY package.json /usr/src/cvs-tsk-edh-marshaller
COPY package-lock.json /usr/src/cvs-tsk-edh-marshaller

# Install dependencies
RUN npm install

## Script from the web to wait for SQS to start up
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.2.1/wait /wait
RUN chmod +x /wait

## Run the wait script until SQS is up
CMD /wait && npm start
