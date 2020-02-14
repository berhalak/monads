type PromLike<T> = T | PromiseLike<T>;
type FromReturn<T> = T extends () => infer R ? R
	: T extends { value(): infer R } ? R
	: T extends { value: infer R } ? R
	: T;
type FlatMonad<T> = Monad<FromReturn<T>>;

export interface Unit<T> {
	value(): T;
}

export interface Future<T> extends Unit<PromiseLike<T>> {

}

export interface Monad<From> extends Unit<From> {
	map<To>(tran: (self: From) => To): Monad<To>;
	flat<To>(tran: (self: From) => To): FlatMonad<To>;
	cache(): Monad<From>;
	value(): From;
	ifNone<To>(selector: (...any: any[]) => To): FlatMonad<To>;
	ifSome<To>(selector: (self: From) => To): FlatMonad<To>;
	do(selector: (arg: From) => any): Monad<From>;
	finally(selector: (arg: From) => void): Monad<From>;
	catch(selector: (arg: any) => void): Monad<From>;
}



function toUnitFunction<T>(arg: T): () => FromReturn<T> {
	type V = FromReturn<T>;
	if (arg == null) {
		return () => null;
	}
	if (typeof arg == 'function') {
		return arg as any;
	}
	if (typeof arg == 'object' && (arg as any).value && typeof (arg as any).value == 'function') {
		return () => (arg as any).value();
	}
	if (typeof arg == 'object' && (arg as any).value && typeof (arg as any).value) {
		return () => (arg as any).value;
	}

	return () => arg as any;
}

function toUnit<T>(arg: T): FromReturn<T> {
	type V = FromReturn<T>;
	if (arg == null) {
		return null;
	}
	if (typeof arg == 'function') {
		return arg();
	}
	if (typeof arg == 'object' && (arg as any).value && typeof (arg as any).value == 'function') {
		return (arg as any).value();
	}
	if (typeof arg == 'object' && (arg as any).value && typeof (arg as any).value) {
		return (arg as any).value;
	}

	return arg as any;
}



function invoke<From, To>(from: () => From, to: (arg: From) => To): To {
	const result: From = from();
	if (result !== null) return to(result);
	return null as any;
}


/// unified
export class Maybe<From> implements Monad<From> {
	map<To>(tran: (self: From) => To): Monad<To> {
		return new Maybe<To>(() => {
			const self = this.value();
			if (self !== null) return tran(self);
			return null;
		});
	}
	flat<To>(tran: (self: From) => To): FlatMonad<To> {
		return new Maybe<FromReturn<To>>(() => {
			const self = this.value();
			if (self !== null) return toUnit(tran(self));
			return null;
		});
	}

	cache(): Monad<From> {
		let item: From = null;
		let init = false;
		return new Maybe<From>(() => {
			if (init) return item;
			init = true;
			item = this.value();
			return item;
		})
	}
	value(): From {
		return (this as any).$value();
	}
	ifNone<To>(selector: (...any: any[]) => To): Monad<FromReturn<To>> {
		return new Maybe<FromReturn<To>>(() => {
			const self = this.value();
			if (self === null) return toUnit(selector());
			return null;
		});
	}
	ifSome<To>(selector: (self: From) => To): Monad<FromReturn<To>> {
		return new Maybe<FromReturn<To>>(() => {
			const self = this.value();
			if (self !== null) return toUnit(selector(self));
			return null;
		});
	}
	do(selector: (arg: From) => any): Monad<From> {
		return new Maybe<From>(() => {
			const self = this.value();
			if (self !== null) {
				selector(self);
			}
			return self;
		});
	}
	finally(selector: (arg: From) => void): Monad<From> {
		return new Maybe<From>(() => {
			let self: From;
			try {
				self = this.value();
				return self;
			} finally {
				selector(self);
			}
		});
	}
	catch(selector: (arg: any) => void): Monad<From> {
		return new Maybe<From>(() => {
			let self: From;
			try {
				self = this.value();
				return self;
			} catch (e) {
				selector(e);
			}
		});
	}

	constructor(arg: From)
	constructor(arg: () => From)
	constructor(arg: { value: () => From })
	constructor(arg: any) {
		(this as any).$value = toUnitFunction(arg);
	}
}


export function lift<T>(arg: T): Monad<FromReturn<T>> {
	return new Maybe<FromReturn<T>>(toUnitFunction(arg));
}

type SomeReturn<T> = T extends () => infer R ? R
	: T;


export function some<T>(arg: T): Monad<SomeReturn<T>> {
	type V = SomeReturn<T>;
	if (arg == null) return new Maybe<V>(null);
	if (typeof arg == 'function') return new Maybe<V>(arg as any);
	return new Maybe<V>(arg as V);
}



// waits

export type PromUnit<T> =
	T extends PromiseLike<infer R> ? R :
	T extends { value: () => PromiseLike<infer R> } ? R :
	T extends { value: () => infer R } ? R :
	T;


type PromiseType<T> = T extends PromLike<infer R> ? R : T;
type AFromReturn<T> = PromiseType<FromReturn<T>>;
export type AFlatMonad<T> = AMonad<AFromReturn<T>>;

type Test = AFlatMonad<{ value: () => Promise<number> }>


export interface AMonad<From> extends Future<From> {
	map<To>(tran: (self: From) => To): AMonad<To>;
	flat<To>(tran: (self: From) => To): AMonad<PromUnit<To>>;
	cache(): AMonad<From>;
	value(): PromiseLike<From>;
	ifNone<To>(selector: (...any: any[]) => To): AMonad<PromUnit<To>>;
	ifSome<To>(selector: (self: From) => To): AMonad<PromUnit<To>>;
	do(selector: (arg: From) => PromLike<any>): AMonad<From>;
	finally(selector: (arg: From) => PromLike<any>): AMonad<From>;
	catch(selector: (arg: any) => PromLike<any>): AMonad<From>;
	then<To>(ok: (arg: From) => PromLike<To>, fail: (arg: any) => PromLike<any>): PromLike<To>;
}

export interface Monad<From> {
	wait(): AMonad<PromUnit<From>>;
}

export interface Maybe<From> {
	wait(): AsyncMonad<From extends PromiseLike<infer R> ? R : never>;
}

Maybe.prototype.wait = function <From>(this: Maybe<From>): AsyncMonad<From extends PromiseLike<infer R> ? R : never> {
	return new AsyncMonad<From extends PromiseLike<infer R> ? R : never>(async () => {
		return await this.value() as any;
	});
}


async function promToUnit(arg: any) {
	if (arg == null) return null;
	const typed = arg as any;
	if (typeof arg == 'function') return await typed();
	if (typeof arg == 'object' && (arg as any).value && typeof (arg as any).value == 'function') {
		return await (await typed).value();
	}
	if (typeof arg == 'object' && (arg as any).value && typeof (arg as any).value) {
		return await (await typed).value;
	}
	return await arg;
}

export class AsyncMonad<From> implements AMonad<From> {

	map<To>(tran: (self: From) => To): AMonad<To> {
		return new AsyncMonad<To>(async () => {
			const self = await this.value();
			if (self !== null) return tran(self);
			return null;
		});
	}
	flat<To>(tran: (self: From) => To): AMonad<PromUnit<To>> {
		return new AsyncMonad<PromUnit<To>>(async () => {
			const self = await this.value();
			if (self !== null) return await promToUnit(tran(self));
			return null;
		});
	}
	cache(): AMonad<From> {
		let item: From = null;
		let init = false;
		return new AsyncMonad<From>(async () => {
			if (init) return item;
			init = true;
			item = await this.value();
			return item;
		})
	}
	value(): PromiseLike<From> {
		return this.$value();
	}
	ifNone<To>(selector: (...any: any[]) => To): AMonad<PromUnit<To>> {
		return new AsyncMonad<PromUnit<To>>(async () => {
			const self = await this.value();
			if (self === null) return await promToUnit(selector());
			return null;
		});
	}
	ifSome<To>(selector: (self: From) => To): AMonad<PromUnit<To>> {
		return new AsyncMonad<PromUnit<To>>(async () => {
			const self = await this.value();
			if (self !== null) return await promToUnit(selector(self));
			return null;
		});
	}
	do(selector: (arg: From) => PromLike<any>): AMonad<From> {
		return new AsyncMonad<From>(async () => {
			const self = await this.value();
			if (self !== null) await selector(self);
			return self;
		});
	}
	finally(selector: (arg: From) => PromLike<any>): AMonad<From> {
		return new AsyncMonad<From>(async () => {
			let self: From;
			try {
				self = await this.value();
				return self;
			} finally {
				await selector(self);
			}
		});
	}
	catch(selector: (arg: any) => PromLike<any>): AMonad<From> {
		return new AsyncMonad<From>(async () => {
			let self: From;
			try {
				self = await this.value();
				return self;
			} catch (e) {
				await selector(e);
			}
		});
	}

	then<To>(ok: (arg: From) => PromLike<To>, fail: (arg: any) => PromLike<any>): PromLike<To> {
		return this.value().then(ok, fail);
	}

	constructor(private $value?: () => PromiseLike<From>) {
		if (!$value) {
			this.$value = () => null;
		}
	}
}


export function wait<T>(arg: T): AMonad<PromUnit<T>> {
	type From = PromUnit<T>;

	if (arg == null) return new AsyncMonad<From>();

	return new AsyncMonad<From>(async () => {
		return await promToUnit(arg);
	});
}

export { from } from "./iterable"