/** A generic constructor */
type Constructor<T = any> = abstract new (...args: any) => T

/** The _type_ for a binding, either a `Constructor` or a `string`. */
type Binding = Constructor | string

/** The _type_ of a binding in the context of an `Injector`. */
type InjectorBinding<
  Components extends Constructor,
  Provisions extends Record<string, any>,
> = Components | (keyof Provisions & string) | PromisedBinding<Components | (keyof Provisions & string)>

/** A tuple of `InjectorBinding`s (what's needed by `$inject`). */
type InjectTuple<
  Components extends Constructor,
  Provisions extends Record<string, any>,
> = readonly [ InjectorBinding<Components, Provisions>, ...(InjectorBinding<Components, Provisions>)[] ]


/* ========================================================================== */

/**
 * Check that an `Injector`'s static `$inject` member matches the `Injector`'s
 * own components and provisions
 */
type CheckInject<
  Inject, // the tuple from "$inject"
  Components extends Constructor, // the `Injector`'s components
  Provisions extends Record<string, any>, // the `Injector`'s provisions
> =
  // if "$inject" is an empty array, then we're fine
  Inject extends readonly [] ?
    readonly [] :

  // if "$inject" is a single-element tuple, check that that this element is
  // actually included in the list of components
  Inject extends readonly [ infer I1 ] ?
    I1 extends PromisedBinding<infer I2> ?
      I2 extends keyof Provisions ?
        readonly [ PromisedBinding<I2> ] :
      I2 extends Extract<Components, I2> ?
        readonly [ PromisedBinding<I2> ] :
      readonly [ PromisedBinding<never> ] :
    I1 extends keyof Provisions ?
      readonly [ I1 ] :
    I1 extends Extract<Components, I1> ?
      readonly [ I1 ] :
    readonly [ never ] :

  // if "$inject" is a multi-element tuple, recurse (twice) by cheking the first
  // element as a single-element tuple (see above), and the remaining members.
  Inject extends readonly [ infer I1, ...infer I2 ] ?
    readonly [
      ...CheckInject<[ I1 ], Components, Provisions>,
      ...CheckInject<I2, Components, Provisions>,
    ] :

  // "$inject" here is something else (likely, an array but not "as const")
  // so we want to fail by re-declaring it as a tuple
  readonly [ Components | keyof Provisions, ...(Components | keyof Provisions)[] ]

/* ========================================================================== */

/**
 * Map the contents of the static `$inject` member to their types, resolving
 * named provisions.
 */
type MapInject<
  Inject, // the tuple from "$inject"
  Provisions extends Record<string, any>, // the `Injector`'s provisions
> =
  // if "$inject" is an empty array, then we're fine
  Inject extends readonly [] ?
    readonly [] :

  // "$inject" is a single-element tuple
  Inject extends readonly [ infer I1 ] ?
    I1 extends PromisedBinding<infer I2> ?
      // promised bindings
      I2 extends keyof Provisions ?
        readonly [ Promise<Provisions[I2]> ] :
      I2 extends Constructor ?
        readonly [ Promise<InstanceType<I2>> ] :
      readonly [ never ] :
    // resolved (non promised) bindings
    I1 extends keyof Provisions ?
      readonly [ Provisions[I1] ] :
    I1 extends Constructor ?
      readonly [ InstanceType<I1> ] :
    readonly [ never ] :

  // "$inject" is a multi-element tuple (recurse)
  Inject extends readonly [ infer I1, ...infer I2 ] ?
    readonly [
      ...MapInject<[ I1 ], Provisions>,
      ...MapInject<I2, Provisions>,
    ] :

  // "$inject" is something else
  readonly [ never ]

/* ========================================================================== */

/**
 * Check that an `Injectable` is valid for a given `Injector`.
 */
type CheckInjectable<
  I extends Injectable<Components, Provisions>, // the `Injectable` to check
  Components extends Constructor, // the `Injector`'s components
  Provisions extends Record<string, any>, // the `Injector`'s provisions
> =
  // If the static "$inject" member is specified, check it and map its
  // types as constructor arguments for the `Injectable`
  I extends { $inject: infer Inject } ?
    {
      $inject: CheckInject<Inject, Components, Provisions>,
      new (...args: MapInject<Inject, Provisions>): any,
    } :

  // If "$inject" is not specified, the only valid injector is one with
  // an empty (zero arguments) constructor
  I extends new () => any ?
    I :

  // Anything else requires "$inject" to be present
  { $inject: InjectTuple<Components, Provisions> }

/* ========================================================================== */

/**
 * Return the unrolled type of a `Promise`
 */
type UnrollPromise<T> = T extends Promise<infer T> ? UnrollPromise<T> : T

/* ========================================================================== */

/**
 * Override the type for an `Injector`'s existing provision, or add a new one
 */
type ExtendProvisions<
  Provisions extends Record<string, any>, // the `Injector`'s provisions
  P extends string, // the new (string) key of the provision
  T, // the new type associated with the provision key
> = {
  [ key in P | keyof Provisions ]:
    key extends P ?
      UnrollPromise<T> :
      Provisions[key]
}

/* ========================================================================== *
 * EXPORTED TYPES                                                             *
 * ========================================================================== */

/** Utility to nicely print a binding name */
function bindingName(binding: Binding): string {
  return typeof binding === 'function' ? `[class ${binding.name}]` : `"${binding}"`
}

/** A constant symbol identifying a _promised binding_. */
const promisedBinding = Symbol.for('siringa.promisedBinding')

/** Declare a _binding_ to be _promised_ (inject its `Promise`). */
export function promise<B extends Binding>(binding: B): PromisedBinding<B> {
  return { [promisedBinding]: binding }
}

/* ========================================================================== */

export interface PromisedBinding<B extends Binding = Binding> {
  [promisedBinding]: B
}

/** An `Injectable` defines a constructor for an injectable class */
export interface Injectable<
  Components extends Constructor,
  Provisions extends Record<string, any>,
  T = any,
> {
  prototype: T
  new (...args: any): T
  $inject?: InjectTuple<Components, Provisions>
}

/**
 * The `Injections` interface abstracts the idea of getting bound and
 * provisioned instances from an `Injector`, injecting new `Injectable`
 * instances, and creating sub-`Injector`s.
 */
export interface Injections<
  Components extends Constructor,
  Provisions extends Record<string, any>,
> {
  /** Get a _bound_ instance from an `Injector`. */
  get<C extends Components>(component: C): Promise<InstanceType<C>>

  /** Get a _provisioned_ instance from an `Injector`. */
  get<P extends keyof Provisions>(provision: P): Promise<Provisions[P]>

  /**
   * Create a new instance of the specified `Injectable`, providing it with all
   * necessary injections.
   *
   * @param injectable The constructor of the instance to create.
   */
  inject<I extends Injectable<Components, Provisions>>(
    injectable: I & CheckInjectable<I, Components, Provisions>,
  ): Promise<InstanceType<I>>

  /** Create a sub-`Injector` child of the current one. */
  injector(): Injector<Components, Provisions>
}

/** A `Factory` is a _function_ creating instances of a given type. */
export type Factory<
  Components extends Constructor = Constructor,
  Provisions extends Record<string, any> = Record<string, any>,
  T = any,
> = (injections: Injections<Components, Provisions>) => T | Promise<T>

/**
 * The `Injector` class acts as a registry of components and provisions,
 * creating instances and injecting dependencies.
 */
export class Injector<
  Components extends Constructor = never,
  Provisions extends Record<string, any> = {},
> implements Injections<Components, Provisions> {
  readonly #factories: Map<Binding, (stack: Binding[]) => Promise<any>> = new Map()
  readonly #promises: Map<Binding, Promise<any>> = new Map()
  #parent?: Injector<Constructor, Record<string, any>>

  /* INTERNALS ============================================================== */

  async #get(binding: Binding, stack: Binding[]): Promise<any> {
    if (stack.includes(binding)) {
      if (this.#parent) return this.#parent.#get(binding, [])
      const message = `Recursion detected injecting ${bindingName(binding)}`
      return Promise.reject(new Error(message))
    }

    const promise = this.#promises.get(binding)
    if (promise) return promise

    const factory = this.#factories.get(binding)
    if (factory) {
      const promise = Promise.resolve().then(() => factory([ ...stack, binding ]))
      this.#promises.set(binding, promise)
      return promise
    }

    if (this.#parent) return this.#parent.#get(binding, [])

    const message = `Unable to resolve binding ${bindingName(binding)}`
    return Promise.reject(new Error(message))
  }

  async #inject(injectable: Injectable<Components, Provisions>, stack: Binding[]): Promise<any> {
    const promises = injectable.$inject?.map((binding: Binding | PromisedBinding) => {
      switch (typeof binding) {
        case 'string':
        case 'function':
          return this.#get(binding, stack)
        default:
          return binding
      }
    })

    const injections = promises ? (await Promise.all(promises)).map((i) => {
      return promisedBinding in i ? this.#get(i[promisedBinding], stack) : i
    }) : []

    // eslint-disable-next-line new-cap
    return new injectable(...injections)
  }

  /* BINDING ================================================================ */

  /** Bind an `Injectable` to this `Injector`. */
  bind<I extends Injectable<Components, Provisions>>(
    injectable: I & CheckInjectable<I, Components, Provisions>,
  ): Injector<Components | I, Provisions>

  /** Bind an `Injectable` to a `Constructor` in this `Injector`. */
  bind<C extends Constructor, I extends Injectable<Components, Provisions, InstanceType<C>>>(
    component: C,
    injectable: I & CheckInjectable<I, Components, Provisions>,
  ): Injector<Components | C, Provisions>

  /** Bind an `Injectable` to a name in this `Injector`. */
  bind<P extends string, I extends Injectable<Components, Provisions>>(
    provision: P,
    injectable: I & CheckInjectable<I, Components, Provisions>,
  ): Injector<Components, ExtendProvisions<Provisions, P, InstanceType<I>>>

  // Overloaded implementation
  bind(
    binding: Binding,
    maybeInjectable?: Injectable<Components, Provisions>,
  ): this {
    const injectable = maybeInjectable ? maybeInjectable :
        binding as Injectable<Components, Provisions>

    this.#factories.set(binding, async (stack) => this.#inject(injectable, stack))
    return this
  }

  /* FACTORIES ============================================================== */

  /** Use a `Factory` to create instances bound to the given `Constructor`. */
  create<C extends Constructor>(
    component: C,
    factory: Factory<Components, Provisions, InstanceType<C>>,
  ): Injector<Components | C, Provisions>

  /** Use a `Factory` to create instances bound to the given name. */
  create<P extends string, F extends Factory<Components, Provisions>>(
    provision: P,
    factory: F,
  ): Injector<Components, ExtendProvisions<Provisions, P, ReturnType<F>>>

  // Overloaded implementation
  create(
    binding: Binding,
    factory: Factory<Components, Provisions>,
  ): this {
    this.#factories.set(binding, async (stack) => factory({
      get: (component: any) => this.#get(component, stack),
      inject: async (injectable: any) => this.#inject(injectable, stack),
      injector: () => this.injector(),
    }))

    return this
  }

  /* INSTANCES ============================================================== */

  /** Use the given instance binding it to to the given `Constructor`. */
  use<C extends Constructor>(
    component: C,
    instance: InstanceType<C> | PromiseLike<InstanceType<C>>,
  ): Injector<Components | C, Provisions>

  /** Use the given instance binding it to to the given name. */
  use<P extends string, T>(
    provision: P,
    instance: T | PromiseLike<T>,
  ): Injector<Components, ExtendProvisions<Provisions, P, T>>

  // Overloaded implementation
  use(
    binding: Binding,
    instance: any,
  ): this {
    this.#promises.set(binding, Promise.resolve(instance))
    return this
  }

  /* INSTANCES ============================================================== */

  /** Get a _bound_ instance from an `Injector` */
  get<C extends Components>(component: C): Promise<InstanceType<C>>

  /** Get a _provisioned_ instance from an `Injector` */
  get<P extends keyof Provisions>(provision: P): Promise<Provisions[P]>

  // Overloaded implementation
  async get<B extends Binding>(
    binding: B,
  ): Promise<any> {
    return this.#get(binding, [])
  }

  /* INJECTIONS ============================================================= */

  /**
   * Create a new instance of the specified `Injectable`, providing all
   * necessary injections.
   *
   * @param injectable The constructor of the instance to create.
   */
  inject<I extends Injectable<Components, Provisions>>(
    injectable: I & CheckInjectable<I, Components, Provisions>,
  ): Promise<InstanceType<I>> {
    return this.#inject(injectable, [])
  }

  /**
   * Simple utility method to invoke the factory with the correct `Injections`
   * and return its result.
   *
   * This can be used to alleviate issues when top-level await is not available.
   */
  make<F extends Factory<Components, Provisions>>(
    factory: F,
  ): ReturnType<F> {
    return factory({
      get: (component: any) => this.#get(component, []),
      inject: async (injectable: any) => this.#inject(injectable, []),
      injector: () => this.injector(),
    })
  }

  /* CHILD INJECTORS ======================================================== */

  /** Create a sub-`Injector` child of this one. */
  injector(): Injector<Components, Provisions> {
    const injector = new Injector<Components, Provisions>()
    injector.#parent = this
    return injector
  }
}
