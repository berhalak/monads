type Constructor<T> = new (...args: any) => T;
type PipeConstructor<T, A> = new (inner: A) => T;

type PromLike<T> = T | PromiseLike<T>;

export type Future<T> = Unit<PromiseLike<T>>

export class AsyncMonad<Self> {

	finally(selector: (arg: Self) => PromLike<any>): AsyncMonad<Self> {
		return AsyncMonad.fromValue<Self>(async () => {
			let self: Self = null;
			try {
				self = await this.value();
				return self;
			} finally {
				selector(self);
			}
		})
	}

	async then<T>(ok: (arg: Self) => PromLike<T>, fail: (reason: any) => PromLike<T>) {
		try {
			return await ok(await this.value());
		} catch (e) {
			await fail(e);
		}
	}

	catch(selector: (arg: any) => PromLike<any>): AsyncMonad<Self> {
		return AsyncMonad.fromValue<Self>(async () => {
			try {
				const self = await this.value();
				return self;
			} catch (e) {
				await selector(e);
			}
		});
	}

	private _value: () => PromiseLike<Self>;

	static fromValue<Self>(tran: () => PromiseLike<Self>): AsyncMonad<Self> {
		const m = new AsyncMonad<Self>();
		m._value = tran;
		return m;
	}


	wait<T>(selector: (arg: Self) => PromiseLike<T>): AsyncMonad<T> {
		return AsyncMonad.fromValue(async () => {
			return await selector(await this.value());
		})
	}

	pipe<T>(tran: new (arg: Accessor<Self>) => Monad<T>): AsyncMonad<T> {
		return AsyncMonad.fromValue(async () => {
			const self = await this.value();
			if (self != null) {
				return new tran(() => self).value();
			}
			return null;
		});
	}

	map<Mapped>(tran: (self: Self) => Mapped): AsyncMonad<Mapped> {
		return AsyncMonad.fromValue(async () => {
			const self = await this.value();
			if (self !== null) {
				return tran(self);
			}
			return null;
		});
	}


	flat<T>(tran: (self: Self) => PromLike<Unit<PromLike<T>>>): AsyncMonad<T> {
		return AsyncMonad.fromValue(async () => {
			const self = await this.value();
			if (self !== null) {
				return await (await tran(self)).value();
			}
			return null;
		});
	}

	value() {
		return this._value();
	}

	ifNone<T>(selector: () => T): AsyncMonad<T> {
		return AsyncMonad.fromValue(async () => {
			const self = await this.value();
			if (self === null) {
				return selector();
			}
			return null;
		});
	}

	ifSome<T>(selector: (arg: Self) => T): AsyncMonad<T> {
		return AsyncMonad.fromValue(async () => {
			const self = await this.value();
			if (self !== null) {
				return selector(self);
			}
			return null;
		});
	}

	do(selector: (arg: Self) => PromLike<any>): AsyncMonad<Self> {
		return AsyncMonad.fromValue(async () => {
			const self = await this.value();
			if (self !== null) {
				await selector(self)
				return self;
			}
			return null;
		});
	}
}

export interface Unit<T> {
	value(): T;
}

export interface Monad<From> extends Unit<From> {
	map<To>(tran: (self: From) => To): Monad<To>;
	flat<To>(tran: (self: From) => Unit<To>): Monad<To>;
	cache(): Monad<From>;
	value(): From;
	ifNone<T>(selector: () => T): Monad<T>;
	ifSome<T>(selector: (self: From) => T): Monad<T>;
	do(selector: (arg: From) => any): Monad<From>;
	finally(selector: (arg: From) => void): Monad<From>;
	catch(selector: (arg: any) => void): Monad<From>;
	wait<To>(tran: (self: From) => PromLike<To>): AsyncMonad<To>;
	wait(): AsyncMonad<From extends PromiseLike<infer R> ? R : never>;
}

export type Accessor<T> = () => T;

export class Maybe<From> implements Monad<From> {
	cache(): Monad<From> {
		let item: From = null;
		return new Maybe<From>(() => {
			return item ?? (item = this.value());
		});
	}

	finally(selector: (arg: From) => void): Monad<From> {
		return new Maybe<From>(() => {
			let self: From = null;
			try {
				self = this.value();
				return self;
			} finally {
				selector(self);
			}
		})
	}
	catch(selector: (arg: any) => void): Monad<From> {
		return new Maybe<From>(() => {
			try {
				const self = this.value();
				return self;
			} catch (e) {
				selector(e);
				return null;
			}
		})
	}

	wait<Mapped = From>(tran?: (self: From) => Mapped | PromiseLike<Mapped>): AsyncMonad<Mapped> {
		return AsyncMonad.fromValue<Mapped>(async () => {
			const value = this.value ? this.value() : null;
			if (value !== null) {
				return tran ? await tran(value) : await value as any as Mapped;
			}
			return null;
		});
	}


	pipe<T>(tran: new (arg: Accessor<From>) => Unit<T>): Monad<T> {
		return new Maybe<T>(() => new tran(this.value).value());
	}

	map<Mapped>(tran: (self: From) => Mapped): Monad<Mapped> {
		const value = () => {
			const self: From = this.value ? this.value() : null;
			if (self != null) {
				return tran(self);
			}
			return null as Mapped;
		};
		return new Maybe<Mapped>(value);
	}



	flat<T>(tran: (self: From) => Unit<T>): Monad<T> {
		const value = () => {
			const self: From = this.value ? this.value() : null;
			if (self != null) {
				return tran(self).value();
			}
			return null as T;
		};

		return new Maybe<T>(value);
	}

	value: () => From;

	ifNone<T>(selector: () => T): Monad<T> {
		const value = () => {
			const self = this.value();
			if (self === null)
				return selector();
			return null;
		};
		return new Maybe<T>(value);
	}

	ifSome<T>(selector: (arg: From) => T): Monad<T> {
		const value = () => {
			const self = this.value();
			if (self !== null)
				return selector(self);
			return null;
		};
		return new Maybe<T>(value);
	}

	do(selector: (arg: From) => any): Monad<From> {
		const value = () => {
			const self = this.value();
			if (self != null)
				selector(self);
			return self;
		};
		return new Maybe<From>(value);
	}

	constructor(value: From)
	constructor(value: () => From)
	constructor(value: any) {
		this.value = typeof value == 'function' ? value : () => value;
	}
}

export class Some<Self> extends Maybe<Self> {
	constructor(value: Self) {
		super(value);
	}
}

export class None<Self> extends Maybe<Self> {
	constructor() {
		super(() => null as Self);
	}

	ifNone<T>(selector: () => T): Monad<T> {
		return new Maybe<T>(selector);
	}

}

export class Lift {
	lift(): Monad<this> {
		return new Some(this);
	}
}


export function none<T>() {
	return new None<T>();
}

type Fun<T> = T extends ((...args: any[]) => any) ? T : never;
type FunParams<T> = T extends ((...args: any[]) => any) ? Parameters<T> : never;

export function build<T extends Function>(arg: T): (...params: FunParams<T>) => Monad<ReturnType<Fun<T>>> {
	return (...params: any[]) => new Maybe(arg(...params));
}

export function buildAsync<T extends Function>(arg: T): (...params: FunParams<T>) => AsyncMonad<ReturnType<Fun<T>>> {
	return (...params: any[]) => AsyncMonad.fromValue(arg(...params));
}


export class Identity {
	map<Mapped>(tran: (self: this) => Mapped): Monad<Mapped> {
		const value = () => {
			const self = this.value ? this.value() : null;
			if (self != null) {
				return tran(self);
			}
			return null as Mapped;
		};
		return new Maybe<Mapped>(value);
	}

	finally(selector: (arg: this) => void): Monad<this> {
		return new Maybe<this>(() => {
			let self: this = null;
			try {
				self = this.value();
				return self;
			} finally {
				selector(self);
			}
		})
	}

	pipe<T>(tran: new (args: this) => Monad<T>): Monad<T> {
		return new tran(this);
	}

	flat<T>(tran: (self: this) => Monad<T>): Monad<T> {
		const value = () => {
			const self = this.value ? this.value() : null;
			if (self != null) {
				return tran(self).value();
			}
			return null as T;
		};

		return new Maybe<T>(value);
	}

	value() {
		return this;
	}

	ifNone<T>(selector: () => T): Monad<T> {
		const value = () => {
			const self = this.value();
			if (self != null)
				return selector();
			return null;
		};
		return new Maybe<T>(value);
	}

	ifSome<T>(selector: (arg: this) => T): Monad<T> {
		const value = () => {
			const self = this.value();
			if (self != null)
				return selector(self);
			return null;
		};
		return new Maybe<T>(value);
	}

	do(selector: (arg: this) => void): Monad<this> {
		const value = () => {
			const self = this.value();
			if (self != null)
				selector(self);
			return self;
		};
		return new Maybe<this>(value);
	}
}




/// unified

type MonadFlat<T> = T extends () => infer R ? R
	: T extends { value(): infer R } ? R
	: T extends { value: infer R } ? R
	: T;


export function from<T>(arg: T): Monad<MonadFlat<T>> {
	type V = MonadFlat<T>;
	if (arg == null) return new None<V>();
	if (typeof arg == 'function') return new Maybe<V>(arg as Fun<V>);
	if (typeof arg == 'object' && (arg as any).value && typeof (arg as any).value == 'function') new Maybe<V>(() => (arg as any).value());
	if (typeof arg == 'object' && (arg as any).value && typeof (arg as any).value) new Maybe<V>(() => (arg as any).value);
	return new Maybe<V>(arg as V);
}

type MonadSome<T> = T extends () => infer R ? R
	: T;


export function some<T>(arg: T): Monad<MonadSome<T>> {
	type V = MonadSome<T>;
	if (arg == null) return new None<V>();
	if (typeof arg == 'function') return new Maybe<V>(arg as Fun<V>);
	return new Maybe<V>(arg as V);
}



/// waits

type PromiseType<T> = T extends PromLike<infer R> ? R : T;
type AsyncFlat<T> = PromiseType<MonadFlat<T>>;

export function wait<T>(arg: T): AsyncMonad<AsyncFlat<T>> {
	type V = AsyncFlat<T>;

	if (arg == null) return new AsyncMonad<V>();

	return AsyncMonad.fromValue<V>(async () => {
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
	});
}
