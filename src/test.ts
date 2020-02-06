import { Some, Identity, Maybe, Unit, Lift, some, none } from ".";

function test(condition: boolean) {
	if (!condition) {
		console.error("Error in test");
	} else {
		console.log("Test passed");
	}
}

function equals(a: any, b: any) {
	if (a != b) {
		console.error(`Expected ${a} == ${b}`)
	} else {
		console.log("Test passed");
	}
}

console.log("Started...");

async function main() {



	try {

		equals(2, new Some(1).map(x => x + 1).value());

		class Prefix extends Lift {
			constructor(private name: string) {
				super();
			}

			print() {
				return this.name;
			}
		}

		class Suffix extends Prefix {
			constructor(name: Prefix, suffix: string) {
				super(name.print() + suffix);
			}
		}

		equals("abc", some(new Prefix("a")).map(x => x.print() + "bc").value());
		equals("abc", new Some("a").flat(x => new Some(x + "b").map(y => y + "c")).value());
		equals("test", new Prefix("te").lift()
			.map(x => new Suffix(x, "st"))
			.map(x => x.print())
			.value());


		// async monad

		async function down(p: Prefix) {
			return new Suffix(p, "st");
		}

		const r = await some(new Prefix("te")).wait(async x => down(x)).map(x => x.print());

		const n = none<number>().ifNone(async () => 0).wait(x => x + 4);

		equals(n, 4);

		equals(r, "test")

	} finally {
		console.log("Finished");
	}
}

main();
