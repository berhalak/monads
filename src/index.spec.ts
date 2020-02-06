import { from, some, wait } from "."

test("From constants", async () => {

	function decor<T>(arg: T) {
		return {
			value() {
				return arg;
			}
		}
	}

	// monads / decorators
	expect(from(from(5)).map(x => x + 6).value()).toBe(11);
	expect(from(decor(5)).map(x => x + 6).value()).toBe(11);

	// constant map
	expect(from(5).map(x => x + 6).value()).toBe(11);
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
	expect(await wait(from(5)).map(x => x + 6).value()).toBe(11);
	expect(await wait(decor(5)).map(x => x + 6).value()).toBe(11);

	// constant map
	expect(await wait(5).map(x => x + 6).value()).toBe(11);
	expect(await wait(5).map(x => x + 6).value()).toBe(11);

	// move from normal monad to async

	expect(await from(Promise.resolve(5)).wait()).toBe(5);
});