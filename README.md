# monads
Typescript monads

``` ts

// sample usage
expect(lift(lift(5)).map(x => x + 6).value()).toBe(11);

// from constants
expect(lift(5).map(x => x + 6).value()).toBe(11);
expect(some(5).map(x => x + 6).value()).toBe(11);

// async support
expect(await wait(lift(5)).map(x => x + 6).value()).toBe(11);

// constant map
expect(await wait(5).map(x => x + 6).value()).toBe(11);
expect(await wait(5).map(x => x + 6).value()).toBe(11);

// move from normal monad to async
expect(await lift(4).map(async x => x + 5).wait().map(x=> x + 2).value()).toBe(11);

// fluent selector
expect(from([1,2]).map(x => x + 1).toArray()).toStrictEqual([2,3]);

```

