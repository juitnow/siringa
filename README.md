SIRINGA
=======

> _"**siringa**"_ (italian): _"syringe"_, a tool for administering injections.

SIRINGA is an extremely simple dependency injection framework focusing on type
correctness and asynchronous injections, without relying on decorators and/or
decorator metadata.

* [Quick Start](#quick-start)
* [One-Time Injection](#one-time-injection)
* [Name-based Injection](#name-based-injection)
* [Using Factories](#using-factories)
* [Using Instances](#using-instances)
* [Child Injectors](#child-injectors)
* [API Reference](#api-reference)
  * [`class Injector`](#class-injector)
  * [`interface Injections`](#interface-injections)
* [Copyright Notice](https://github.com/juitnow/siringa/blob/main/NOTICE.md)
* [License](https://github.com/juitnow/siringa/blob/main/LICENSE.md)

Quick Start
-----------

At its core, SIRINGA tries to make dependency injection as easy as possible.

Classes can be _injected_ their dependencies by specifying a static `$inject`
property (a _tuple_ of injection keys):

```ts
// A class with no dependencies, and an implicit zero-args constructor
class Foo {
  foo() { /* ... your code... */ }
}

// Here "Bar" needs an instance of "Foo" to be injected
class Bar {
  // The _tuple_ of required injections, this must be declared `as const`
  // and the resolved types must match the constructor's arguments
  static $inject = [ Foo ] as const

  // Called by the injector with the correct dependencies
  constructor(private _foo: Foo) {}

  // Your code
  bar() {
    this._foo.bar()
  }
}

// Create a new injector
const injector = new Injector()
  .bind(Foo) // Bind "Foo" (no dependencies required)
  .bind(Bar) // Bind "Bar" (requires "Foo")

// Get the singleton instance of "Bar"
const bar = await injector.get(Bar)
// Get the singleton instance of "Foo" (injection magically happens!)
const foo = await injector.get(Foo)
```

One-Time Injection
------------------

We can use an `Injector` also to perform one-time injections (the instance
injected won't be managed by the `Injector` itself).

Using the same `Foo` and `Bar` classes from above:

```ts
// Create a new injector and bind Foo
const injector = new Injector().bind(Foo)

// Create a new "Bar" instance injected with its required "Foo"
const bar = await injector.inject(Bar)

// Will return the same instance given to "Bar"'s constructor
const foo = await injector.get(Foo)

// The code below will miserably fail, as "Bar" is not managed by the injector
// const bar2 = await injector.get(Bar)
```


Name-based Injection
--------------------

Injection keys must not _necessarily_ be classes, they can also be `string`s:

```ts
class Foo {
  foo() { /* ... your code... */ }
}

class Bar {
  // The string `foo` is used to identify the binding
  static $inject = [ 'foo' ] as const

  // Called by the injector with the correct dependencies
  constructor(private _foo: Foo) {}

  // Your code
  bar() {
    this._foo.bar()
  }
}

// Create a new injector
const injector = new Injector()
  .bind('foo', Foo) // Bind "Foo" to the string 'foo'
  .bind('bar', Bar) // Bind "Bar" to the string 'bar'

// Get the singleton instance of "Bar"
const bar = await injector.get('bar')
// Get the singleton instance of "Foo"
const foo = await injector.get('foo')
```

Using Factories
---------------

The injector's `create(...)` method allows to use a _factory pattern_ to
create instances to be injected:

```ts
class Foo {
  constructor(public _value: number)
}

class Bar {
  // The string `foo` is used to identify the binding
  static $inject = [ Foo ] as const

  // Called by the injector with the correct dependencies
  constructor(private _foo: Foo) {}

  // Your code
  bar() {
    console.log(this._foo._value)
  }
}

// Create a new injector
const injector = new Injector()
  .bind(Foo, (injections) => {
    // The "injections" object can be used to resolve dependencies
    // in the injector itself using "get(...)" or "inject(...)"

    return new Foo(12345)
  })

// Inject "Bar" with "Foo"
const bar = await injector.inject(Bar)

// This will print "12345"
bar.bar()
```

As in the example above, factory methods will be given an `Injections` instance
which can be used to get instances, inject new objects, or create sub-injectors.

See the reference for [`Injections`](#interface-injections) below.

Using Instances
---------------

Similar to factories (above) the injector's `use(...)` method allows to use
pre-baked instances as dependencies for other objects:

```ts
class Foo {
  constructor(public _value: number)
}

class Bar {
  // The string `foo` is used to identify the binding
  static $inject = [ Foo ] as const

  // Called by the injector with the correct dependencies
  constructor(private _foo: Foo) {}

  // Your code
  bar() {
    console.log(this._foo._value)
  }
}

// Create a new injector
const injector = new Injector()
  .use(Foo, new Foo(12345))

// Inject "Bar" with "Foo"
const bar = await injector.inject(Bar)

// This will print "12345"
bar.bar()
```

Child Injectors
---------------

In some cases it is useful to create _child injectors_.

A _child injector_ inherits all the bindings from its parent, but any extra
binding declared in it won't affect its parent.

Also, a _child injector_ can _redeclare_ a binding without affecting its parent.

For example (using silly strings to simplify the inner workings!)

```ts
const parent = new Injector()
  .use('foo', 'parent foo')

const child = parent.injector()
  .create('parentFoo', async (injections) => {
    const s = await injections.get('foo') // this is the parent's value!!!
    return `${s} from a child`
  }
  .use('foo', 'child foo')

await parent.get('foo') // this will return "parent foo"
await child.get('foo') // this will return "child foo" (overrides parent)

await child.get('parentFoo') // this will return "parent foo from a child"
// await parent.get('parentFoo') // fails, as parent doesn't define "parentFoo"
```

API Reference
-------------

Quick-and-dirty reference for our types (for details, everything should be
annotated with _JSDoc_).

### `class Injector`

#### Binding

* `injector.bind(component: Constructor): Injector` \
  Bind the specified constructor (a _class_) to the injector

* `injector.bind(component: Constructor, implementation: Constructor): Injector` \
  Bind the specified component (a _class_) to the injector, and use the
  specified implementation (another _class_ extending the component) to
  create instances

* `injector.bind(name: string, implementation: Constructor): Injector` \
  Bind the specified name (a _string) to the injector, and use the
  specified implementation (a _class_ ) to create instances

#### Factories

* `injector.create(component: Constructor, factory: Factory): Injector` \
  Use the specified factory (a _function_) to create instances for the
  specified _component_ (a _class_)

* `injector.create(name: string, factory: Factory): Injector` \
  Use the specified factory (a _function_) to create instances for the
  specified name (a _string_)

#### Instances

* `injector.use(component: Constructor, instance: any): Injector` \
  Bind the specified instance  to a component (a _class_).

* `injector.create(name: string, instance: any): Injector` \
  Bind the specified instance  to a name (a _string_).

#### Injections

* `injections.get(component: Constructor): Instance` \
  Returns the instance bound to the specified constructor (a _class_)

* `injections.get(name: string): Instance` \
  Returns the instance bound to the specified name (a _string_)

* `injections.inject(injectable: Constructor): Instance` \
  Create a new instance of the given injectable (a _class_) injecting all its
  required dependencies

#### Sub Injectors

* `injections.injector(): Injector` \
  Create a sub-injector (child) of the current one

### `interface Injections`

* `injections.get(component: Constructor): Instance` \
  Returns the instance bound to the specified constructor (a _class_)

* `injections.get(name: string): Instance` \
  Returns the instance bound to the specified name (a _string_)

* `injections.inject(injectable: Constructor): Instance` \
  Create a new instance of the given injectable (a _class_) injecting all its
  required dependencies

* `injections.injector(): Injector` \
  Create a sub-injector (child) of the current one
