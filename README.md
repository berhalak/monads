# monads
Typescript monads

``` ts

// sample usage
expect(from(from(5)).map(x => x + 6).value()).toBe(11);

// from constants
expect(from(5).map(x => x + 6).value()).toBe(11);
expect(some(5).map(x => x + 6).value()).toBe(11);

// async support
expect(await wait(from(5)).map(x => x + 6).value()).toBe(11);

// constant map
expect(await wait(5).map(x => x + 6).value()).toBe(11);
expect(await wait(5).map(x => x + 6).value()).toBe(11);

// move from normal monad to async
expect(await from(4).map(async x => x + 5).wait().map(x=> x + 2)).toBe(11);

```

