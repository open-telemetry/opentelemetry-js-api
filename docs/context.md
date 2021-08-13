# Context

In order for OpenTelemetry to work, it must store and propagate important telemetry data.
For example, when a request is received and a span is started it must be available to a component which creates its child span.
To solve this problem, OpenTelemetry stores the span in the Context.
This document describes the OpenTelemetry context API for JavaScript and how it is used.

_Context Specification: <https://github.com/open-telemetry/opentelemetry-specification/blob/v1.6.0/specification/context/context.md>_

_Context API reference: <https://open-telemetry.github.io/opentelemetry-js-api/classes/contextapi.html>_

- [Context Manager](#context-manager)
- [Basic Operations](#basic-operations)
  - [Context Modification](#context-modification)
  - [Get Active Context](#get-active-context)
  - [Set Active Context](#set-active-context)

## Context Manager

The context API depends on a context manager to work.
The examples in this document will assume you have already configured a context manager.
Typically the context manager is provided by your SDK, however it is possible to register one directly like this:

```typescript
import * as api from "@opentelemetry/api";
import { AsyncHooksContextManager } from "@opentelemetry/context-async-hooks";

const contextManager = new AsyncHooksContextManager();
context.Manager.enable();
api.context.setGlobalContextManager(contextManager);
```

## Basic Operations

The context is an immutable map from context keys to any value.

### Context Modification

The user may get, set, or delete context values by calling methods [documented here](https://open-telemetry.github.io/opentelemetry-js-api/interfaces/context.html).
Because context is immutable, modifying an entry does not modify the context.
Instead, it creates a new context which contains all of the entries of the previous context with the new entry added.

Keys are created by calling [`api.createContextKey(description)`](https://open-telemetry.github.io/opentelemetry-js-api/modules.html#createcontextkey).
Certain keys, such as the active span, are predefined to have specific meaning by the OpenTelemetry specification and the OpenTelemetry JS API.
These predefined context properties can only be accessed through use of APIs such as [`api.trace.getSpan()`](https://open-telemetry.github.io/opentelemetry-js-api/classes/traceapi.html#getspan).

```typescript
import * as api from "@opentelemetry/api";

// ROOT_CONTEXT is the empty context
const ctx = api.ROOT_CONTEXT;

const myKey = api.createContextKey("Key to store a value");

// Creates a new context with myKey set to "my value"
const ctx2 = ctx.setValue(myKey, "my value");

console.log(ctx.getValue(myKey)) //? undefined
console.log(ctx2.getValue(myKey)) //? "my value"
```

### Get Active Context

**IMPORTANT**: This assumes you have configured a Context Manager.
Without one, `api.context.active()` will _ALWAYS_ return the `ROOT_CONTEXT`.

The active context is the context object which is returned when `api.context.active()` is called.
This is accomplished through the use of mechanisms like [async_hooks](https://nodejs.org/api/async_hooks.html) in node or [zone.js](https://github.com/angular/zone.js/) on the web in order to propagate the context through a single execution.

```typescript
import * as api from "@opentelemetry/api";

// Returns the active context
// If no context is active, the ROOT_CONTEXT is returned
const ctx =  api.context.active(); 

const myKey = api.createContextKey("Key to store a value");

// Does not modify or change the active context
const ctx2 = ctx.setValue(myKey, "context 2");

console.log(api.context.active() === ctx) //? true
console.log(api.context.active() === ctx2) //? false

console.log(api.context.active().getValue(myKey)) //? undefined
console.log(ctx.getValue(myKey)) //? undefined
console.log(ctx2.getValue(myKey)) //? "context 2"
```

### Set Active Context

A context can be made active by use of the `api.context.with(ctx, callback)` method.
During execution of the `callback`, the context passed to `with` will be returned by `context.active` unless another context is made active.

```typescript
import * as api from "@opentelemetry/api";

const myKey = api.createContextKey("Key to store a value");

const ctx =  api.context.active(); // Returns the active context or the ROOT_CONTEXT if no context is active
const ctx2 = ctx.setValue(myKey, "context 2"); // does not modify ctx

console.log(ctx.getValue(myKey)) //? undefined
console.log(ctx2.getValue(myKey)) //? "context 2"

const ret = api.context.with(ctx2, () => {
    const ctx3 = api.context.active().setValue(myKey, "context 3");

    console.log(api.context.active().getValue(myKey)); //? "context 2"
    console.log(ctx.getValue(myKey)) //? undefined
    console.log(ctx2.getValue(myKey)) //? "context 2"
    console.log(ctx3.getValue(myKey)) //? "context 3"

    api.context.with(ctx3, () => {
        console.log(api.context.active().getValue(myKey)); //? "context 3"
    });
    console.log(api.context.active().getValue(myKey)); //? "context 2"

    return "return value"
});

// The value returned by the callback is returned to the caller
console.log(ret); //? "return value"
```
