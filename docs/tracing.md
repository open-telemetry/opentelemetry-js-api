# Tracing

This quick start is for end users of OpenTelemetry who wish to manually trace their applications. If you are a library author, please see the [Library Authors Guide](library-author.md). If you wish to automatically instrument your application, see the automatic instrumentation documentation for the SDK you wish to use.

_Trace API reference: <https://open-telemetry.github.io/opentelemetry-js/classes/traceapi.html>_

## Acquiring a Tracer

In OpenTelemetry, tracing operations are performed using methods on a _tracer_. You can get a tracer by calling [`getTracer`](https://open-telemetry.github.io/opentelemetry-js/classes/traceapi.html#gettracer) on the global tracer provider. `getTracer` takes the name and version of the application or library acquiring the tracer, and provides a tracer which can be used to trace operations.

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer("my-application", "0.1.0");
```

## Starting and Ending a Span

In OpenTelemetry, all _traces_ are composed of [`Spans`](https://open-telemetry.github.io/opentelemetry-js/interfaces/span.html). These spans are linked together by parent-child relationships to form a tree. The resultant tree is your trace, and the root of the tree is commonly called the _root span_.

You can create a span by calling [`Tracer#startSpan`](https://open-telemetry.github.io/opentelemetry-js/interfaces/tracer.html#startspan). The only required argument to `startSpan` is the _span name_, which should describe the operation being performed with low cardinality.

```typescript
const span = tracer.startSpan("my-span-name");

// do some work

// When a span is ended, it will be exported to a tracing backend
// via the currently registered SDK.
span.end();
```

Most of the time, spans will be used as part of a function which responds to some event like a web request. The following example shows what it might look like to manually trace a function which responds to a get request using an imaginary http server framework.

```typescript
async function onGet(request, response) {
  const span = tracer.startSpan("GET");
  try {
    // Do some work here

    response.send();

    // If we get here and nothing has thrown, the request completed successfully
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (err) {
    // When we catch an error, we want to show that an error occurred
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err.message,
    });
  } finally {
    // Every span must be ended or it will not be exported
    span.end();
  }
}

httpServer.on("GET", onGet)
```

## Span Attributes

While name, start time, end time, and status are the minimum information required to trace an operation, most of the time they will not be enough information on their own to effectively observe an application. In the example above we traced a `GET` request, but the same span name would be used for every route which would make it impossible to know what route was called by looking at the trace. To solve this, OpenTelemetry uses _Span Attributes_. Span attributes are an object with string keys and string, number, or boolean values which describe the span. For example, we can use the span attributes to add route and http response code information to the example above.

```typescript
async function onGet(request, response) {
  const span = tracer.startSpan("GET", {
    // attributes can be added when the span is started
    attributes: {
      "http.route": request.route,
    }
  });

  // attributes may also be added after the span is started
  span.setAttribute("http.status", 200);
  
  span.end();

  // Attributes MAY NOT be added after the span ends
  span.setAttribute("my.attribute", false); // this does nothing
}
```

### Semantic Conventions

One problem with span names and attributes is recognizing, categorizing, and analyzing them in your tracing backend. Between different applications, libraries, and tracing backends there might be different names and expected values for various attributes. For example, your application may use `http.status` to describe the HTTP status code, but a library you use may use `http.status_code`. In order to solve this problem, OpenTelemetry uses a library of semantic conventions which describe the name and attributes which should be used for specific types of spans.

_See the current trace semantic conventions in the OpenTelemetry Specification repository: <https://github.com/open-telemetry/opentelemetry-specification/tree/main/specification/trace/semantic_conventions>_

## Span Relationships

Now that we can start and end spans and effectively describe them, it is useful to be able to describe their relationships to each other. For instance, if one span describes an incoming request which makes a database call, it may be useful to trace the database call as a separate span which is a child of the original request span. In order to do this, when we create a span we can tell OpenTelemetry which span to use as its parent using a mechanism called _Context_.

Context is a very important part of the OpenTelemetry API which cannot be adequately explained in a single paragraph. To read more about context, see the [context documentation](context.md).

```typescript
import { context, setSpan } from '@opentelemetry/api';

async function onGet(request, response) {
  const span = tracer.startSpan("GET /user/:id", {
    "http.method": "GET",
    "http.url": request.url,
  });

  const userId = request.params.id;

  // Create a new context from the current context which has the span "active"
  const ctx = setSpan(context.active(), span);
  
  // Call getUser with the newly created context
  const user = await context.with(ctx, getUser, userId);

  response.send(user.toJson());
  span.end();
}

async function getUser(userId) {
  // when this span is created, it will automatically use the span from the context as its parent
  const span = tracer.startSpan("SELECT Users");
  const user = await db.select("Users", { id: userId });

  span.end();
  return user;
}

server.on("GET", "/user/:id")
```
