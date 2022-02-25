import { Injector } from '../src/index'
import chai, { expect } from 'chai'
import chap from 'chai-as-promised'

chai.use(chap)

let count = 0

class Foo {
  readonly count: number

  constructor() {
    this.count = ++ count
  }
}

describe('Injector', () => {
  beforeEach(() => count = 0)

  it('should bind some components', async () => {
    const injector = new Injector()
        .bind(Foo)
        .bind('foo', Foo)
        .bind('bar', class {
          static $inject = [ Foo, 'foo' ] as const
          constructor(public _c: Foo, public _s: Foo) {}
        })

    const c1 = await injector.get(Foo)
    expect(c1.count).to.equal(1)

    const s1 = await injector.get('foo')
    expect(s1.count).to.equal(2)

    const c2 = await injector.get(Foo)
    const s2 = await injector.get('foo')

    expect(c2.count).to.equal(1)
    expect(s2.count).to.equal(2)

    expect(c2).to.equal(c1)
    expect(s2).to.equal(s1)

    const bar = await injector.get('bar')
    expect(bar._c).to.equal(c1)
    expect(bar._s).to.equal(s1)
  })

  it('should use a factory to instantiate injectables', async () => {
    const injector = new Injector()
        .create(Foo, () => new Foo())
        .create('foo', () => new Foo())
        .create('bar', async (injections) => new class {
          static $inject = [ Foo, 'foo' ] as const
          constructor(public _c: Foo, public _s: Foo) {}
        }(await injections.get(Foo), await injections.get('foo')))

    const c1 = await injector.get(Foo)
    expect(c1.count).to.equal(1)

    const s1 = await injector.get('foo')
    expect(s1.count).to.equal(2)

    const c2 = await injector.get(Foo)
    const s2 = await injector.get('foo')

    expect(c2.count).to.equal(1)
    expect(s2.count).to.equal(2)

    expect(c2).to.equal(c1)
    expect(s2).to.equal(s1)

    const bar = await injector.get('bar')
    expect(bar._c).to.equal(c1)
    expect(bar._s).to.equal(s1)
  })

  it('should use pre-existing instances', async () => {
    const injector = new Injector()
        .use(Foo, new Foo())
        .use('foo', new Foo())
        .bind('bar', class {
          static $inject = [ Foo, 'foo' ] as const
          constructor(public _c: Foo, public _s: Foo) {}
        })

    const c1 = await injector.get(Foo)
    expect(c1.count).to.equal(1)

    const s1 = await injector.get('foo')
    expect(s1.count).to.equal(2)

    const c2 = await injector.get(Foo)
    const s2 = await injector.get('foo')

    expect(c2.count).to.equal(1)
    expect(s2.count).to.equal(2)

    expect(c2).to.equal(c1)
    expect(s2).to.equal(s1)

    const bar = await injector.get('bar')
    expect(bar._c).to.equal(c1)
    expect(bar._s).to.equal(s1)
  })

  it('should shield factories from injectors', async () => {
    const injector = new Injector()
        .use(Foo, new Foo())
        .use('foo', new Foo())
        .create('bar', async (injections) => {
          const c = await injections.get(Foo)
          const s = await injections.get('foo')
          const i = await injections.inject(Foo)

          expect(c.count).to.equal(1)
          expect(s.count).to.equal(2)
          expect(i.count).to.equal(3)

          expect((<any> injections).bind).to.be.undefined
          expect((<any> injections).create).to.be.undefined
          expect((<any> injections).use).to.be.undefined

          return { c, s, i }
        })

    const c = await injector.get(Foo)
    const s = await injector.get('foo')
    const x = await injector.get('bar')

    expect(c.count).to.equal(1)
    expect(s.count).to.equal(2)

    expect(x.c).to.equal(c)
    expect(x.s).to.equal(s)
    expect(x.i.count).to.equal(3)
  })

  it('should give us nice erros', async () => {
    const injector = new Injector<any, any>()

    await expect(injector.get(<any> Foo)).to.be.rejectedWith('Unable to resolve binding [class Foo]')
    await expect(injector.get(<any> 'foo')).to.be.rejectedWith('Unable to resolve binding "foo"')
  })
})
