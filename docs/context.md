# Context

In order for OpenTelemetry to work, it must store and propagate important telemetry data.
For example, when a request is received and a span is started it must be available to a component which creates its child span.
To solve this problem, OpenTelemetry stores the span in the Context.
This document describes the OpenTelemetry context API and how it is used.

_Context Specification: <https://github.com/open-telemetry/opentelemetry-specification/blob/v1.6.0/specification/context/context.md>_

_Context API reference: <https://open-telemetry.github.io/opentelemetry-js-api/classes/contextapi.html>_

- [Basic Operations](#basic-operations)
  - [Context Modification](#context-modification)
  - [Get Active Context](#get-active-context)
  - [Set Active Context](#set-active-context)

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
// ROOT_CONTEXT is the empty context
const ctx = api.ROOT_CONTEXT;

const boolKey = api.createContextKey("Key to store a boolean value");

// Creates a new context with boolKey set to true
const ctx2 = ctx.setValue(boolKey, true);

console.log(ctx.getValue(boolKey)) //? undefined
console.log(ctx2.getValue(boolKey)) //? true
```

### Get Active Context

**IMPORTANT**: This assumes you have configured a Context Manager.
Without one, `api.context.active()` will _ALWAYS_ return the `ROOT_CONTEXT`.

The active context is the context object which is returned when `api.context.active()` is called.
This is accomplished through the use of mechanisms like [async_hooks](https://nodejs.org/api/async_hooks.html) in node or [zone.js](https://github.com/angular/zone.js/) on the web.
JavaScript is single-threaded, but it can usually be thought of as similar to thread-local storage.

```typescript
// Returns the active context
// If no context is active, the ROOT_CONTEXT is returned
const ctx =  api.context.active(); 

// Does not modify or change the active context
const ctx2 = ctx.setValue(boolKey, true);

console.log(api.context.active() === ctx) //? true
console.log(api.context.active() === ctx2) //? false

console.log(api.context.active().getValue(boolKey)) //? undefined
console.log(ctx.getValue(boolKey)) //? undefined
console.log(ctx2.getValue(boolKey)) //? true
```

### Set Active Context

A context can be made active by use of the `api.context.with(ctx, callback)` method.
During execution of the `callback`, the context passed to `with` will be returned by `context.active` unless another context is made active.

```typescript
const ctx =  api.context.active(); // Returns the active context or the ROOT_CONTEXT if no context is active
const ctx2 = ctx.setValue(boolKey, true); // does not modify ctx

console.log(ctx.getValue(boolKey)) //? undefined
console.log(ctx2.getValue(boolKey)) //? true

const ret = api.context.with(ctx2, () => {
    const ctx3 = api.context.active().setValue(boolKey, false);

    console.log(api.context.active().getValue(boolKey)); //? true
    console.log(ctx.getValue(boolKey)) //? undefined
    console.log(ctx2.getValue(boolKey)) //? true
    console.log(ctx3.getValue(boolKey)) //? false

    api.context.with(ctx3, () => {
        console.log(api.context.active().getValue(boolKey)); //? false
    });
    console.log(api.context.active().getValue(boolKey)); //? true

    return "return value"
});

// The value returned by the callback is returned to the caller
console.log(ret); //? "return value"
```
