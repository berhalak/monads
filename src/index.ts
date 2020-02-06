type Constructor<T> = new (...args: any) => T;
type PipeConstructor<T, A> = new (inner: A) => T;

export interface Monad<Self> {
    map<Mapped>(tran: (self: Self) => Mapped): Monad<Mapped>;
    wait<Mapped>(tran: (self: Self) => Promise<Mapped>): AsyncMonad<Mapped>;
    pipe<T>(tran: PipeConstructor<T, Self>): Monad<T>;
    value(): Self;
    ifNone<T>(selector: () => T): Monad<T>;
    ifSome<T>(selector: () => T): Monad<T>;
    do(selector: (arg: Self) => void): this;
}

export class AsyncMonad<Self>  {
    map<Mapped>(tran: (self: Self) => Mapped): AsyncMonad<Mapped> {
        return new AsyncMonad(this.prom.then(x => tran(x)));
    }
    wait<Mapped>(tran: (self: Self) => Promise<Mapped>): AsyncMonad<Mapped> {
        return new AsyncMonad(this.prom.then(x => tran(x)));
    }
    pipe<T>(tran: PipeConstructor<T, Self>): AsyncMonad<T> {
        return new AsyncMonad(this.prom.then(x => new tran(x)));
    }
    value(): Promise<Self> {
        return this.prom;
    }
    ifNone<T>(selector: () => T): AsyncMonad<T> {
        return new AsyncMonad(this.prom.then(x => {
            if (x === null) {
                return selector();
            }
        }));
    }
    ifSome<T>(selector: () => T): AsyncMonad<T> {
        return new AsyncMonad(this.prom.then(x => {
            if (x !== null) {
                return selector();
            }
        }));
    }
    do(selector: (arg: Self) => void): AsyncMonad<Self> {
        return new AsyncMonad(this.prom.then(x => {
            selector(x);
            return x;
        }));
    }

    constructor(private prom: Promise<Self>) {

    }
}

export class Identity {
    map<Mapped>(tran: (self: this) => Mapped): Monad<Mapped> {
        const result = tran(this);
        if (result == null) return null;
        return new None<Mapped>();
    }

    wait<Mapped>(tran: (self: this) => Promise<Mapped>): AsyncMonad<Mapped> {
        const result = tran(this);
        return new AsyncMonad(result);
    }

    pipe<T>(tran: PipeConstructor<T, this>): Monad<T> {
        const result = new tran(this);
        if (result == null) return null;
        return new None<T>();
    }

    value() {
        return this;
    }

    ifNone<T>(selector: () => T): Monad<T> {
        return new None<T>();
    }

    ifSome<T>(selector: () => T): Monad<T> {
        return new Some(selector());
    }

    do(selector: (arg: this) => void): this {
        selector(this);
        return this;
    }
}

export class Some<Self> implements Monad<Self> {
    constructor(protected $value: Self = null) {
    }

    wait<Mapped>(tran: (self: Self) => Promise<Mapped>): AsyncMonad<Mapped> {
        const result = tran(this.value());
        return new AsyncMonad(result);
    }

    map<Mapped>(tran: (self: Self) => Mapped): Monad<Mapped> {
        const result = tran(this.$value);
        if (result == null) return null;
        return new None<Mapped>();
    }

    pipe<T>(tran: PipeConstructor<T, Self>): Monad<T> {
        const result = new tran(this.$value);
        if (result == null) return null;
        return new None<T>();
    }

    value() {
        return this.$value;
    }

    ifNone<T>(selector: () => T): Monad<T> {
        if (this.$value == null) return new Some(selector());
        return new None<T>();
    }

    ifSome<T>(selector: () => T): Monad<T> {
        return new Some(selector());
    }

    do(selector: (arg: Self) => void): this {
        selector(this.value());
        return this;
    }
}

export class None<Self> implements Monad<Self> {
    map<Mapped>(tran: (self: Self) => Mapped): Monad<Mapped> {
        return new None<Mapped>();
    }

    wait<Mapped>(tran: (self: Self) => Promise<Mapped>): AsyncMonad<Mapped> {
        return new AsyncMonad<Mapped>(null);
    }

    pipe<T>(tran: PipeConstructor<T, Self>): Monad<T> {
        return new None<T>();
    }

    value(): Self {
        return null;
    }

    ifNone<T>(selector: () => T): Monad<T> {
        return new Some(selector());
    }

    ifSome<T>(selector: () => T): Monad<T> {
        return new None<T>();
    }

    do(selector: (arg: Self) => void): this {
        selector(this.value());
        return this;
    }
}
