var express = require('express');

var fetch = require('node-fetch');
const {trace, BatchRecorder, Tracer, ExplicitContext, ConsoleRecorder} = require('zipkin');
const zipkinMiddleware = require('zipkin-instrumentation-express').expressMiddleware;
const {HttpLogger} = require('zipkin-transport-http');
const CLSContext = require('zipkin-context-cls');

var ctxImpl = new ExplicitContext();

var recorder = new BatchRecorder({
    logger: new HttpLogger({
        endpoint: process.env.HTTP_LOGGER_ENDPOINT
    })
});

const tracer = new Tracer({
    recorder: recorder,
    ctxImpl: new CLSContext('zipkin')
});


//CALLER
const wrapFetch = require('zipkin-instrumentation-fetch');

const zipkinFetch = wrapFetch(fetch, {
    tracer,
    serviceName: process.env.NODE_NAME,
    port: process.env.APPLICATION_PORT
});

if (process.env.CALL_URL != undefined) {
    console.log('call ' + process.env.CALL_URL);

    setTimeout(function () {
        zipkinFetch(process.env.CALL_URL + '/api').then(function (res) {
            return res.text();
        }).then(function (body) {
            console.log('received ' + body);
        });

        fetch(process.env.CALL_URL + '/api2').then(function (res) {
            return res.text();
        }).then(function (body) {
            console.log('received ' + body);
        });
    }, 1000)
}


//RECEIVER
var app = express();

app.use(zipkinMiddleware({
    tracer,
    serviceName: process.env.NODE_NAME,
    port: process.env.APPLICATION_PORT
}));

app.use('/api', function (request, response, next) {
    console.log('forward ' + process.env.FORWARD_URL);

    if (process.env.FORWARD_URL != undefined) {
        zipkinFetch(process.env.FORWARD_URL).then(function (res) {
            return res.text();
        }).then(function (body) {
            response.send(body)
        });
    } else {
        response.send('Hi');
    }
});

app.use('/api2', function (request, response, next) {
    response.send('Ho');
});

app.listen(process.env.APPLICATION_PORT, function () {
    console.log('The PetStore sample is now running at http://localhost:' + process.env.APPLICATION_PORT);
});

setTimeout(function () {
    process.exit()
}, 5000);