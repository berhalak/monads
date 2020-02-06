type Constructor<T> = new (...args: any) => T;
type PipeConstructor<T, A> = new (inner: A) => T;

type VoidLike = void | PromiseLike<void>;
type PromLike<T> = T | PromiseLike<T>;

export class AsyncMonad<Self> {

	finally(selector: (arg: Self) => VoidLike): AsyncMonad<Self> {
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

	catch(selector: (arg: any) => void | PromiseLike<void>): AsyncMonad<Self> {
		return AsyncMonad.fromValue<Self>(async () => {
			try {
				const self = await this.value();
				return self;
			} catch (e) {
				await selector(e);
			}
		});
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
	finally(selector: (arg: Self) => void): Monad<Self>;
	catch(selector: (arg: any) => void): Monad<Self>;
	wait<Mapped>(tran: (self: Self) => PromiseLike<Mapped> | Mapped): AsyncMonad<Mapped>;

}

export type Unit<T> = () => T;

export class Maybe<Self> implements Monad<Self> {
	finally(selector: (arg: Self) => void): Monad<Self> {
		return new Maybe<Self>(() => {
			let self: Self = null;
			try {
				self = this.value();
				return self;
			} finally {
				selector(self);
			}
		})
	}
	catch(selector: (arg: any) => void): Monad<Self> {
		return new Maybe<Self>(() => {
			try {
				const self = this.value();
				return self;
			} catch (e) {
				selector(e);
				return null;
			}
		})
	}

	wait<Mapped>(tran: (self: Self) => Mapped | PromiseLike<Mapped>): AsyncMonad<Mapped> {
		return AsyncMonad.fromValue<Mapped>(async () => {
			const value = this.value ? this.value() : null;
			if (value !== null) {
				return await tran(value);
			}
			return null;
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

type Fun<T> = T extends ((...args: any[]) => any) ? T : never;
type FunParams<T> = T extends ((...args: any[]) => any) ? Parameters<T> : never;

export function from<T extends Function>(arg: T): (...params: FunParams<T>) => Monad<ReturnType<Fun<T>>> {
	return (...params: any[]) => new Maybe(arg(...params));
}

export function fromAsync<T extends Function>(arg: T): (...params: FunParams<T>) => AsyncMonad<ReturnType<Fun<T>>> {
	return (...params: any[]) => AsyncMonad.fromValue(arg(...params));
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