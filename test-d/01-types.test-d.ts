import { expectError, expectType, printType } from 'tsd'

import { Injector, promise } from '../src'

import type { Injections } from '../src'

printType('__file_marker__')

/* ========================================================================== *
 * Some classes to test with:                                                 *
 * - Foo1: simple zero-constructor class                                      *
 * - Foo2: requires injection of Foo1                                         *
 * - Foo3: requires injection of Foo1 and Foo2                                *
 * - AFoo: abstract class                                                     *
 * ========================================================================== */


class Foo1 {
  constructor() {}
  foo1(): void {}
}

class Foo2 {
  static $inject = [ Foo1 ] as const
  constructor(_foo1: Foo1) {}
  foo2(): void {}
}

class Foo3 {
  static $inject = [ Foo1, Foo2 ] as const
  constructor(_foo1: Foo1, _foo2: Foo2) {}
  foo3(): void {}
}

class FooX extends Foo1 {
  foox(): void {}
}

abstract class AFoo {
  constructor() {}
  afoo(): void {}
}

/* ========================================================================== *
 * basic tests                                                                *
 * ========================================================================== */

// simple bindings, should work
expectType<Injector<typeof Foo1, {}>>(new Injector().bind(Foo1))
expectType<Injector<typeof Foo1 | typeof Foo2, {}>>(
    new Injector().bind(Foo1).bind(Foo2),
)
expectType<Injector<typeof Foo1 | typeof Foo2 | typeof Foo3, {}>>(
    new Injector().bind(Foo1).bind(Foo2).bind(Foo3),
)

// simple injection
expectType<Foo1>(await new Injector().inject(Foo1))
expectType<Foo2>(await new Injector().bind(Foo1).inject(Foo2))
expectType<Foo3>(await new Injector().bind(Foo1).bind(Foo2).inject(Foo3))

// implementation must extend constructor
expectType<Injector<typeof Foo1, {}>>(new Injector().bind(Foo1, class extends Foo1 {}))
expectType<Injector<typeof AFoo, {}>>(new Injector().bind(AFoo, class extends AFoo {}))
expectError(new Injector().bind(Foo1, class {}))
expectError(new Injector().bind(AFoo, class {}))

// can not bind/inject abstract classes
expectError(new Injector().bind(AFoo))
expectError(new Injector().inject(AFoo))

// missing bindings
expectError(new Injector().bind(Foo2))
expectError(new Injector().bind(Foo3))
expectError(new Injector().bind(Foo2, <any> null).bind(Foo3))

expectError(new Injector().inject(Foo2))
expectError(new Injector().inject(Foo3))
expectError(new Injector().bind(Foo2, <any> null).inject(Foo3))

/* ========================================================================== *
 * "$inject" must be a tuple                                                  *
 * ========================================================================== */

new Injector().bind(Foo1).bind(class {
  static $inject = [ Foo1 ] as const
  constructor(_foo1: Foo1) {}
}) // positive test

expectError(new Injector().bind(Foo1).bind(class {
  static $inject = [ Foo1 ] // as const
  constructor(_foo1: Foo1) {}
})) // no "as const"

expectError(new Injector().bind(Foo1).bind(class {
  static $inject = [ 123 ] as const
  constructor(_foo1: Foo1) {}
})) // invalid injection key (number)

expectError(new Injector().bind(Foo1).bind(class {
  static $inject = true
  constructor(_foo1: Foo1) {}
})) // invalid $inject (not an array)

expectError(new Injector().bind(Foo1).bind(class {
  // static $inject = [ Foo1 ]
  constructor(_foo1: Foo1) {}
})) // missing "$inject"

/* ========================================================================== *
 * "$inject" must match the exact binding types                           *
 * ========================================================================== */

new Injector().bind(Foo1).bind(class {
  static $inject = [ Foo1 ] as const
  constructor(_foo1: Foo1) {}
}) // positive test #1

new Injector().bind(FooX).bind(class {
  static $inject = [ FooX ] as const
  constructor(_fooX: FooX) {}
}) // positive test #2

// our class requires Foo1: even if FooX extends Foo1 this should not match
expectError(new Injector().bind(FooX).bind(class {
  static $inject = [ Foo1 ] as const
  constructor(_foo1: Foo1) {}
})) // negative test #1

// our class requires FooX: Foo1 is a superclass, therefore not assignable
expectError(new Injector().bind(Foo1).bind(class {
  static $inject = [ FooX ] as const
  constructor(_fooX: FooX) {}
})) // negative test #2

// again but with "inject()"

await new Injector().bind(Foo1).inject(class {
  static $inject = [ Foo1 ] as const
  constructor(_foo1: Foo1) {}
}) // positive test #1

await new Injector().bind(FooX).inject(class {
  static $inject = [ FooX ] as const
  constructor(_fooX: FooX) {}
}) // positive test #2

// our class requires Foo1: even if FooX extends Foo1 this should not match
expectError(new Injector().bind(FooX).inject(class {
  static $inject = [ Foo1 ] as const
  constructor(_foo1: Foo1) {}
})) // negative test #1

// our class requires FooX: Foo1 is a superclass, therefore not assignable
expectError(new Injector().bind(Foo1).inject(class {
  static $inject = [ FooX ] as const
  constructor(_fooX: FooX) {}
})) // negative test #2

// promised bindings

new Injector().bind(Foo1).bind(class {
  static $inject = [ promise(Foo1) ] as const
  constructor(_foo1: Promise<Foo1>) {}
}) // positive test #1

new Injector().bind(FooX).bind(class {
  static $inject = [ promise(FooX) ] as const
  constructor(_fooX: Promise<FooX>) {}
}) // positive test #2

// our class requires Foo1: even if FooX extends Foo1 this should not match
expectError(new Injector().bind(FooX).bind(class {
  static $inject = [ promise(Foo1) ] as const
  constructor(_foo1: Promise<Foo1>) {}
})) // negative test #1

// our class requires FooX: Foo1 is a superclass, therefore not assignable
expectError(new Injector().bind(Foo1).bind(class {
  static $inject = [ promise(FooX) ] as const
  constructor(_fooX: Promise<FooX>) {}
})) // negative test #2

// promised bindings with "inject()"

await new Injector().bind(Foo1).inject(class {
  static $inject = [ promise(Foo1) ] as const
  constructor(_foo1: Promise<Foo1>) {}
}) // positive test #1

await new Injector().bind(FooX).inject(class {
  static $inject = [ promise(FooX) ] as const
  constructor(_fooX: Promise<FooX>) {}
}) // positive test #2

// our class requires Foo1: even if FooX extends Foo1 this should not match
expectError(new Injector().bind(FooX).inject(class {
  static $inject = [ promise(Foo1) ] as const
  constructor(_foo1: Promise<Foo1>) {}
})) // negative test #1

// our class requires FooX: Foo1 is a superclass, therefore not assignable
expectError(new Injector().bind(Foo1).inject(class {
  static $inject = [ promise(FooX) ] as const
  constructor(_fooX: Promise<FooX>) {}
})) // negative test #2

/* ========================================================================== *
 * discrepancies between "$inject" and constructor parameters                 *
 * ========================================================================== */

// normal injection, all good (only using Foo1)
new Injector().bind(Foo1).bind(class {
  static $inject = [ Foo1 ] as const
  constructor(_foo1: Foo1) {}
}) // positive test #1

// constructor requires a superclass of what "$inject" specifies, all good
new Injector().bind(FooX).bind(class {
  static $inject = [ FooX ] as const
  constructor(_foo1: Foo1) {}
}) // positive test #2

// constructor requires a subclass of what "$inject" specifies, this should fail
expectError(new Injector().bind(Foo1).bind(class {
  static $inject = [ Foo1 ] as const
  constructor(_fooX: FooX) {}
}))

// again, with "inject(...)"

// normal injection, all good (only using Foo1)
await new Injector().bind(Foo1).inject(class {
  static $inject = [ Foo1 ] as const
  constructor(_foo1: Foo1) {}
}) // positive test #1

// constructor requires a superclass of what "$inject" specifies, all good
await new Injector().bind(FooX).inject(class {
  static $inject = [ FooX ] as const
  constructor(_foo1: Foo1) {}
}) // positive test #2

// constructor requires a subclass of what "$inject" specifies, this should fail
expectError(new Injector().bind(Foo1).inject(class {
  static $inject = [ Foo1 ] as const
  constructor(_fooX: FooX) {}
}))


/* ========================================================================== *
 * named bindings                                                             *
 * ========================================================================== */

// simple type checking
expectType<Injector<typeof Foo1, { test: Foo2 }>>(
    new Injector().bind(Foo1).bind('test', Foo2),
)

expectType<Injector<typeof Foo1 | typeof Foo2, { test: Foo3 }>>(
    new Injector()
        .bind(Foo1) // needed by Foo2 and Foo3
        .bind(Foo2) // needed by Foo3
        .bind('test', Foo2) // provide "test" as Foo2
        .bind('test', Foo3), // override "test" with Foo3
)

// correct "$inject" and constructor arguments
new Injector().bind(Foo1).bind('test', Foo2)
    .bind(class {
      static $inject = [ Foo1, 'test' ] as const
      constructor(_foo1: Foo1, _foo2: Foo2) {}
    })

// "$inject" specifies a string not bound
expectError(new Injector().bind(Foo1).bind('test', Foo2)
    .bind(class {
      static $inject = [ Foo1, 'foobar' ] as const
      constructor(_foo1: Foo1, _foo2: Foo2) {}
    }))

// constructor specifies wrong type from "$inject"
expectError(new Injector().bind(Foo1).bind('test', Foo2)
    .bind(class {
      static $inject = [ Foo1, 'test' ] as const
      constructor(_foo1: Foo1, _fooX: FooX) {}
    }))

// "$inject" types matches exactly constructor
new Injector().bind('test', FooX)
    .bind(class {
      static $inject = [ 'test' ] as const
      constructor(_fooX: FooX) {}
    })

// "$inject" provides subclass of constructor argument
new Injector().bind('test', FooX)
    .bind(class {
      static $inject = [ 'test' ] as const
      constructor(_foo1: Foo1) {}
    })

// "$inject" provides superclass of constructor argument
expectError(new Injector().bind('test', Foo1)
    .bind(class {
      static $inject = [ 'test' ] as const
      constructor(_foo1: FooX) {}
    }))

// "$inject" types matches exactly constructor with promised bindings
new Injector().bind('test', FooX)
    .bind(class {
      static $inject = [ promise('test') ] as const
      constructor(_fooX: Promise<FooX>) {}
    })

// "$inject" provides subclass of constructor argument with promised bindings
new Injector().bind('test', FooX)
    .bind(class {
      static $inject = [ promise('test') ] as const
      constructor(_foo1: Promise<Foo1>) {}
    })

// "$inject" provides superclass of constructor argument with promised bindings
expectError(new Injector().bind('test', Foo1)
    .bind(class {
      static $inject = [ promise('test') ] as const
      constructor(_foo1: Promise<FooX>) {}
    }))

/* ========================================================================== *
 * factories                                                                  *
 * ========================================================================== */

expectType<Injector<typeof Foo1 | typeof AFoo, { test: Foo2 }>>(new Injector()
    .bind(Foo1)
    .bind('test', Foo2)
    .create(AFoo, (registry) => {
      expectType<Injections<typeof Foo1, { 'test': Foo2 }>>(registry)
      return new class extends AFoo {}
    }))

expectType<Injector<typeof Foo1, { foo2: Foo2, foo3: Foo3 }>>(new Injector()
    .bind(Foo1)
    .bind('foo2', Foo2)
    .create('foo3', async (registry) => {
      expectType<Injections<typeof Foo1, { 'foo2': Foo2 }>>(registry)
      const _foo1 = await registry.get(Foo1)
      const _foo2 = await registry.get('foo2')
      return new Foo3(_foo1, _foo2)
    }))

// invalid class for component (subclass or disjoint class)
expectError(new Injector().create(FooX, () => new Foo1()))
expectError(new Injector().create(Foo1, () => new class extends AFoo {}))

/* ========================================================================== */

expectType<AFoo>(new Injector()
    .bind(Foo1)
    .bind('test', Foo2)
    .make((registry) => {
      expectType<Injections<typeof Foo1, { 'test': Foo2 }>>(registry)
      return new class extends AFoo {}
    }))

expectType<Promise<Foo3>>(new Injector()
    .bind(Foo1)
    .bind('foo2', Foo2)
    .make(async (registry) => {
      expectType<Injections<typeof Foo1, { 'foo2': Foo2 }>>(registry)
      const _foo1 = await registry.get(Foo1)
      const _foo2 = await registry.get('foo2')
      return new Foo3(_foo1, _foo2)
    }))

/* ========================================================================== *
 * instances                                                                  *
 * ========================================================================== */

expectType<Injector<typeof Foo1, {}>>(new Injector().use(Foo1, new Foo1()))
expectType<Injector<never, { 'test': Foo1 }>>(new Injector().use('test', new Foo1()))

// invalid class for component (subclass or disjoint class)
expectError(new Injector().use(FooX, new Foo1()))
expectError(new Injector().use(Foo1, new class extends AFoo {}))

/* ========================================================================== *
 * getting instances                                                          *
 * ========================================================================== */

const injector = new Injector().bind(Foo1).bind('test', Foo2)

expectType<Foo1>(await injector.get(Foo1))
expectType<Foo2>(await injector.get('test'))

expectError(injector.get(Foo2))
expectError(injector.get('foobar'))
