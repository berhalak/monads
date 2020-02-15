import { lift, some, wait, from } from "."

test("From constants", async () => {

	function decor<T>(arg: T) {
		return {
			value() {
				return arg;
			}
		}
	}

	// monads / decorators
	expect(lift(lift(5)).map(x => x + 6).value()).toBe(11);
	expect(lift(decor(5)).map(x => x + 6).value()).toBe(11);

	// constant map
	expect(lift(5).map(x => x + 6).value()).toBe(11);
	expect(some(5).map(x => x + 6).value()).toBe(11);
});

test("Async constants", async () => {

	function decor<T>(arg: T) {
		return {
			value() {
				return arg;
			}
		}
	}

	// monads / decorators
	expect(await wait(lift(5)).map(x => x + 6).value()).toBe(11);
	expect(await wait(decor(5)).map(x => x + 6).value()).toBe(11);

	// constant map
	expect(await wait(5).map(x => x + 6).value()).toBe(11);
	expect(await wait(5).map(x => x + 6).value()).toBe(11);

	// move from normal monad to async

	expect(await lift(Promise.resolve(5)).wait()).toBe(5);
});

test("iterators", async () => {

	const t = from([1, 2, 3])
		.map(x => x + 1)
		.where(x => x > 2)
		.toArray();

	expect(t).toStrictEqual([3, 4]);

	const t2 = from([[1, 2]])
		.many(x => x)
		.toArray();

	expect(t2).toStrictEqual([1, 2]);

	const t3 = from([1, 2, 3])
		.first()

	expect(t3).toStrictEqual(1);


});

test("iterables", async () => {

	const list = new Set([1, 2, 3]);


	expect(from(list).where(x => x > 2).first()).toBe(3);

});
