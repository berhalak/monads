type Constructor<T> = new (...args: any) => T;
type PipeConstructor<T, A> = new (inner: A) => T;

export class AsyncMonad<Self> {

	async then<T>(ok: (arg: Self) => PromiseLike<T> | T, fail: (reason: any) => T | PromiseLike<T>) {
		try {
			return await ok(await this.value());
		} catch (e) {
			await fail(e);
		}
	}


	static fromValue<Self>(tran: () => PromiseLike<Self>): AsyncMonad<Self> {
		const m = new AsyncMonad<Self>();
		m.value = tran;
		return m;
	}


	wait<T>(selector: (arg: Self) => PromiseLike<T>): AsyncMonad<T> {
		return AsyncMonad.fromValue(async () => {
			return await selector(await this.value());
		})
	}

	pipe<T>(tran: new (arg: Unit<Self>) => Monad<T>): AsyncMonad<T> {
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


	flat<T>(tran: (self: Self) => Monad<T>): AsyncMonad<T> {
		return AsyncMonad.fromValue(async () => {
			const self = await this.value();
			if (self !== null) {
				return tran(self).value();
			}
			return null;
		});
	}

	value: () => PromiseLike<Self>;

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

	do(selector: (arg: Self) => PromiseLike<void> | void): AsyncMonad<Self> {
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

export interface Monad<Self> {
	map<Mapped>(tran: (self: Self) => Mapped): Monad<Mapped>;
	flat<T>(tran: (self: Self) => Monad<T>): Monad<T>;
	pipe<T>(tran: new (arg: () => Self) => Monad<T>): Monad<T>;
	value(): Self;
	ifNone<T>(selector: () => T): Monad<T>;
	ifSome<T>(selector: (self: Self) => T): Monad<T>;
	do(selector: (arg: Self) => void): Monad<Self>;
	wait<T>(tran?: (self: Self extends PromiseLike<infer R> ? R : never) => T): AsyncMonad<Self extends PromiseLike<infer R> ? R : never>;
}

export type Unit<T> = () => T;

export class Maybe<Self> implements Monad<Self> {

	wait<T>(tran?: (self: Self extends PromiseLike<infer R> ? R : never) => T): AsyncMonad<Self extends PromiseLike<infer R> ? R : never> {
		return AsyncMonad.fromValue(async () => {
			const self = await this.value() as any;
			if (self !== null && tran) return tran(self);
			return self;
		});
	}

	pipe<T>(tran: new (arg: Unit<Self>) => Monad<T>): Monad<T> {
		return new tran(this.value);
	}

	map<Mapped>(tran: (self: Self) => Mapped): Monad<Mapped> {
		const value = () => {
			const self: Self = this.value ? this.value() : null;
			if (self != null) {
				return tran(self);
			}
			return null as Mapped;
		};
		return new Maybe<Mapped>(value);
	}


	flat<T>(tran: (self: Self) => Monad<T>): Monad<T> {
		const value = () => {
			const self: Self = this.value ? this.value() : null;
			if (self != null) {
				return tran(self).value();
			}
			return null as T;
		};

		return new Maybe<T>(value);
	}

	value: () => Self;

	ifNone<T>(selector: () => T): Monad<T> {
		const value = () => {
			const self = this.value();
			if (self === null)
				return selector();
			return null;
		};
		return new Maybe<T>(value);
	}

	ifSome<T>(selector: (arg: Self) => T): Monad<T> {
		const value = () => {
			const self = this.value();
			if (self !== null)
				return selector(self);
			return null;
		};
		return new Maybe<T>(value);
	}

	do(selector: (arg: Self) => void): Monad<Self> {
		const value = () => {
			const self = this.value();
			if (self != null)
				selector(self);
			return self;
		};
		return new Maybe<Self>(value);
	}

	constructor(value: Self)
	constructor(value: () => Self)
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

export function some<T>(arg: T) {
	return new Some(arg);
}

export function none<T>() {
	return new None<T>();
}

export function from<T>(arg: () => T) {
	return new Maybe(arg);
}

export function wait<T>(prom: PromiseLike<T>) {
	return AsyncMonad.fromValue(() => prom);
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